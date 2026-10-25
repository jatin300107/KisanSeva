import asyncio
import json
import os
import shutil
import subprocess
import sys
import time
import wave
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(name)s: %(message)s")

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from voice_layer.core.answer_validator import AnswerValidator, make_context
from voice_layer.core.question_queue import QuestionQueue
from voice_layer.core.questions import Question
from voice_layer.core.retry_policy import RetryPolicy
from voice_layer.core.turn_message import build_turn_message
from voice_layer.prompts.prompts import build_system_prompt
from voice_layer.base import PCM_SAMPLE_RATE
from voice_layer.providers.llm.gemini_dialogue import GeminiDialogue
from voice_layer.providers.llm.tools import parse_submit_answers, submit_answers_declaration
from voice_layer.settings import ProviderSettings
from voice_layer.providers.stt.gnani_stt import GnaniSTT
from voice_layer.providers.tts.gnani_tts import GnaniTTS

LANG = "hi-IN"
CATEGORY = "livestock"
TURN2_TEXT = "दो दिन से ऐसा है"   # typed, tests the merged function-response path

QUESTIONS = [
    Question(id="q1", text="What type of animal is affected?"),
    Question(id="q2", text="How old is the animal?"),
    Question(id="q3", text="What symptoms is the animal showing?"),
    Question(id="q4", text="When did the symptoms first appear?"),
]


def to_pcm(path: Path) -> bytes:
    if path.suffix.lower() == ".pcm":
        return path.read_bytes()
    ffmpeg = (
        os.environ.get("FFMPEG_PATH")
        or shutil.which("ffmpeg")
        or shutil.which("ffmpeg.exe")
    )
    if not ffmpeg:
        sys.exit("ffmpeg not found, set FFMPEG_PATH")
    cmd = [ffmpeg, "-v", "error", "-i", str(path), "-ar", "16000", "-ac", "1", "-f", "s16le", "-"]
    return subprocess.run(cmd, capture_output=True, check=True).stdout


async def fake_mic(pcm: bytes):
    """Streams the file at real-time pace, like a live mic would."""
    start = time.monotonic()
    for n, i in enumerate(range(0, len(pcm), 1024)):
        yield pcm[i:i + 1024].ljust(1024, b"\x00")
        delay = start + (n + 1) * 0.032 - time.monotonic()
        if delay > 0:
            await asyncio.sleep(delay)


def save_wav(path: str, pcm: bytes):
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(PCM_SAMPLE_RATE)
        w.writeframes(pcm)


async def speak(tts, text: str, out: str) -> float | None:
    t0 = time.perf_counter()
    first, buf = None, bytearray()
    async for chunk in tts.synthesize(text, LANG):
        if first is None:
            first = time.perf_counter() - t0
        buf += chunk
    save_wav(out, bytes(buf))
    return first


async def run_turn(label, text, queue, validator, dialogue, tts):
    print(f"\n=== {label}: farmer said: {text!r}")
    ctx = make_context(queue)
    message = build_turn_message(
        text,
        queue.current,
        queue.next,
        queue.attempt(queue.current.id),
        queue.policy.max_attempts,
    )
    t0 = time.perf_counter()
    turn = await dialogue.send_user_text(message)
    print(f"gemini call 1: {turn.latency_s:.2f}s usage={turn.usage}")
    print(f"  text: {turn.text!r}")
    print(f"  tool_calls: {json.dumps([c.args for c in turn.tool_calls], ensure_ascii=False)}")

    call = next((c for c in turn.tool_calls if c.name == "submit_answers"), None)
    if call is None:
        print("  RESULT: no submit_answers call, orchestrator would retry with reminder")
        return
    parsed = parse_submit_answers(call.args)
    outcome = validator.apply(parsed, ctx)
    say = parsed.say.strip()
    print(f"  matches_gemini_intent={outcome.matches_gemini_intent} resolved={outcome.resolved_ids}")
    print(f"  validator action={outcome.result.action} current_now={queue.current.id if queue.current else None}")

    responses = [("submit_answers", outcome.result.model_dump(mode="json"))]
    if outcome.matches_gemini_intent and (say or turn.text):
        path, spoken = "single_call", say or turn.text
        dialogue.defer_tool_results(responses)
    else:
        path = "two_call"
        t2 = await dialogue.send_tool_results(responses)
        print(
            f"gemini call 2: {t2.latency_s:.2f}s text={t2.text!r} "
            f"calls={[c.name for c in t2.tool_calls]}"
        )
        spoken = t2.text
        if t2.tool_calls:
            dialogue.defer_tool_results([(c.name, {"note": "no action needed"}) for c in t2.tool_calls])

    if not spoken.strip():
        print("  EMPTY SPOKEN TEXT, skipping TTS")
        return
    fb = await speak(tts, spoken, f"smoke_{label}.wav")
    print(f"  path={path} tts_first_byte={fb:.2f}s" if fb else f"  path={path} TTS FAILED")
    print(f"  gemini+tts total: {time.perf_counter() - t0:.2f}s")


async def main():
    if len(sys.argv) < 2:
        sys.exit("usage: python -m scripts.smoke_voice <audio file>")
    s = ProviderSettings()
    stt, tts = GnaniSTT(s), GnaniTTS(s)
    queue = QuestionQueue(QUESTIONS, RetryPolicy(max_attempts=3))
    validator = AnswerValidator(queue)
    dialogue = GeminiDialogue(
        s, build_system_prompt(CATEGORY, LANG), [submit_answers_declaration()]
    )
    try:
        pcm = to_pcm(Path(sys.argv[1]))
        print(f"audio: {len(pcm) / (PCM_SAMPLE_RATE * 2):.1f}s")
        t0 = time.perf_counter()
        utt = await stt.listen(fake_mic(pcm), LANG)
        print(f"stt: {time.perf_counter() - t0:.2f}s wall, segments={len(utt.segments)}")
        print(f"stt text: {utt.text!r}")
        if utt.no_speech:
            sys.exit("STT heard nothing, check the file and stt_energy_threshold")

        await run_turn("turn1", utt.text, queue, validator, dialogue, tts)
        if not queue.done:
            await run_turn("turn2", TURN2_TEXT, queue, validator, dialogue, tts)
        print("\nsaved:", {k: (v.status, v.value) for k, v in queue.snapshot().items()})
    finally:
        await tts.close()


if __name__ == "__main__":
    asyncio.run(main())