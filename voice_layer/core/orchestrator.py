import asyncio
import contextlib
import json
import logging
import time
from dataclasses import dataclass
from typing import AsyncIterator, Protocol

from pydantic import ValidationError

from voice_layer.base import (
    PCM_CHANNELS,
    PCM_SAMPLE_RATE,
    PCM_SAMPLE_WIDTH,
    LLMError,
    LLMTurn,
    STTError,
    STTProvider,
    TTSError,
    TTSProvider,
    Utterance,
)
from ..providers.llm.gemini_dialogue import GeminiDialogue
from ..providers.llm.tools import SubmitAnswers, parse_submit_answers
from .answer_validator import AnswerValidator, Outcome, make_context
from .question_queue import QuestionQueue, Resolution
from .questions import Question
from .retry_policy import fallback_line
from .turn_message import build_turn_message

log = logging.getLogger("voice.orchestrator")

REMINDER = (
    "\n[APP REMINDER] You must call submit_answers in every reply, "
    "together with the sentence to speak."
)


class Transport(Protocol):
    async def send_audio(self, pcm: bytes) -> None: ...
    async def send_event(self, event: dict) -> None: ...


class AnswersRepo(Protocol):
    async def save(self, session_id: str, items: dict[str, Resolution]) -> None: ...
    async def set_status(self, session_id: str, status: str) -> None: ...


@dataclass
class OrchestratorConfig:
    language: str                         # e.g. "hi-IN", used for STT and TTS
    closing_line: str                     # spoken when everything is done, in the farmer's language
    max_silence_reprompts: int = 2        # silent turns in a row before the session is abandoned
    max_fail_streak: int = 3              # provider failures in a row before the session fails
    max_session_s: float = 1200.0
    playback_grace_s: float = 5.0         # extra wait for playback_done beyond audio length
    mic_queue_frames: int = 300           # about 9.6 s of 32 ms frames


@dataclass
class SpeakResult:
    ok: bool
    started_at: float
    first_byte_s: float | None


class SessionFailed(Exception):
    pass


class VoiceOrchestrator:
    def __init__(
        self,
        *,
        session_id: str,
        config: OrchestratorConfig,
        queue: QuestionQueue,
        validator: AnswerValidator,
        dialogue: GeminiDialogue,
        stt: STTProvider,
        tts: TTSProvider,
        transport: Transport,
        repo: AnswersRepo,
    ):
        self.session_id = session_id
        self.cfg = config
        self.queue = queue
        self.validator = validator
        self.dialogue = dialogue
        self.stt = stt
        self.tts = tts
        self.transport = transport
        self.repo = repo

        self._mic_q: asyncio.Queue[bytes] = asyncio.Queue(maxsize=config.mic_queue_frames)
        self._accepting_mic = False
        self._playback_done = asyncio.Event()
        self._client_ended = False
        self._loop_task: asyncio.Task | None = None
        self._save_tasks: set[asyncio.Task] = set()
        self._fail_streak = 0
        self._silence_streak = 0
        self._turn_no = 0

    # ------------------------------------------------------------------
    # Called by the websocket handler
    # ------------------------------------------------------------------

    def feed_audio(self, frame: bytes) -> None:
        """Mic PCM from the client. Dropped unless we are listening."""
        if not self._accepting_mic:
            return
        try:
            self._mic_q.put_nowait(frame)
        except asyncio.QueueFull:
            log.warning("mic queue full, dropping frame")

    def on_playback_done(self) -> None:
        self._playback_done.set()

    def on_client_end(self) -> None:
        self._client_ended = True
        if self._loop_task:
            self._loop_task.cancel()

    # ------------------------------------------------------------------
    # Entry point
    # ------------------------------------------------------------------

    async def run(self) -> str:
        """Runs the whole session. Returns the final status."""
        self._loop_task = asyncio.current_task()
        status = "failed"
        try:
            status = await asyncio.wait_for(self._loop(), self.cfg.max_session_s)
        except asyncio.TimeoutError:
            status = "timeout"
        except asyncio.CancelledError:
            status = "client_ended" if self._client_ended else "disconnected"
        except SessionFailed as e:
            log.error("session failed: %s", e)
            await self._emit({"type": "error", "code": "provider_failure"})
            status = "failed"
        except Exception:
            log.exception("orchestrator crashed")
            await self._emit({"type": "error", "code": "internal"})
            status = "failed"
        finally:
            self._accepting_mic = False
            if status not in ("client_ended", "disconnected"):
                await self._emit({
                    "type": "done",
                    "status": status,
                    "answers": {
                        qid: {"status": r.status, "value": r.value}
                        for qid, r in self.queue.snapshot().items()
                    },
                })
            await self._flush_saves()
            with contextlib.suppress(Exception):
                await self.tts.close()
            with contextlib.suppress(Exception):
                await self.repo.set_status(self.session_id, status)
        return status

    # ------------------------------------------------------------------
    # Main loop
    # ------------------------------------------------------------------

    async def _loop(self) -> str:
        q = self.queue
        if q.done:
            return "completed"

        first = q.current
        await self._emit(self._question_event(first))
        res = await self._speak(first.text)
        if not res.ok:
            self._bump_fail("tts")

        while True:
            if q.done:
                return "completed"

            try:
                utt = await self._listen()
            except STTError as e:
                log.warning("stt failed: %s", e)
                self._bump_fail("stt")
                await self._speak(fallback_line(q.current, q.attempt(q.current.id)))
                continue
            t_listen_end = time.perf_counter()

            await self._emit({"type": "transcript", "text": utt.text, "final": True})

            if utt.no_speech:
                self._silence_streak += 1
                if self._silence_streak > self.cfg.max_silence_reprompts:
                    return "abandoned"
                await self._speak(fallback_line(q.current, q.attempt(q.current.id)))
                continue
            self._silence_streak = 0

            self._turn_no += 1
            finished = await self._handle_answer(utt, t_listen_end)
            if finished:
                return "completed"

    async def _listen(self) -> Utterance:
        while not self._mic_q.empty():          # drop anything left over from before
            self._mic_q.get_nowait()
        self._accepting_mic = True
        try:
            return await self.stt.listen(self._mic_stream(), self.cfg.language)
        finally:
            self._accepting_mic = False

    async def _mic_stream(self) -> AsyncIterator[bytes]:
        while True:
            yield await self._mic_q.get()

    # ------------------------------------------------------------------
    # One farmer turn
    # ------------------------------------------------------------------

    async def _handle_answer(self, utt: Utterance, t_listen_end: float) -> bool:
        q = self.queue
        ctx = make_context(q)                       # snapshot BEFORE anything changes
        message = build_turn_message(
            utt.text,
            q.current,
            q.next,
            q.attempt(q.current.id),
            q.policy.max_attempts,
        )
        cp = self.dialogue.checkpoint()

        m: dict = {
            "turn": self._turn_no,
            "farmer_chars": len(utt.text),
            "stt_latency_ms": [s.get("latency_ms") for s in utt.segments],
            "gemini_s": [],
            "path": "",
        }
        outcome: Outcome | None = None
        spoken = ""
        llm_failed = False

        try:
            turn = await self.dialogue.send_user_text(message)
            m["gemini_s"].append(round(turn.latency_s, 2))
            calls = self._submit_calls(turn)

            if not calls:
                # Gemini answered in text only. Drop that turn and ask once more.
                self.dialogue.rollback(cp)
                turn = await self.dialogue.send_user_text(message + REMINDER)
                m["gemini_s"].append(round(turn.latency_s, 2))
                calls = self._submit_calls(turn)
                if not calls:
                    raise LLMError("gemini did not call submit_answers")

            parsed, say, parse_err = self._merge_calls(calls)
            outcome = self.validator.apply(parsed, ctx)    # state is committed here
            log.info("validator args=%s say=%r matched=%s resolved=%s results=%s",
                     json.dumps([c.args for c in calls], ensure_ascii=False), say,
                     outcome.matches_gemini_intent, outcome.resolved_ids,
                     [(r.question_id, r.accepted, r.reason) for r in outcome.result.results])
            responses = self._responses(turn, outcome, parse_err)

            if outcome.matches_gemini_intent and (say or turn.text) and not parse_err:
                self.dialogue.defer_tool_results(responses)
                spoken = say or turn.text
                m["path"] = "single_call"
            else:
                turn2 = await self.dialogue.send_tool_results(responses)
                m["gemini_s"].append(round(turn2.latency_s, 2))
                if turn2.tool_calls:
                    # A function call in history needs a response before the next model call.
                    self.dialogue.defer_tool_results(
                        [(c.name, {"note": "no action needed"}) for c in turn2.tool_calls]
                    )
                spoken = turn2.text
                m["path"] = "two_call"

        except LLMError as e:
            log.warning("gemini failed on turn %d: %s", self._turn_no, e)
            self.dialogue.rollback(cp)      # Gemini history only. The queue keeps any committed state.
            llm_failed = True
            m["path"] = "fallback"

        if outcome is not None:
            await self._announce_saved(outcome.resolved_ids)
            self._save(outcome.resolved_ids)

        finished = q.done
        if not spoken:
            spoken = (
                self.cfg.closing_line
                if finished
                else fallback_line(q.current, q.attempt(q.current.id))
            )
        if q.current is not None:
            await self._emit(self._question_event(q.current))

        res = await self._speak(spoken)

        if llm_failed or not res.ok:
            self._bump_fail("llm" if llm_failed else "tts")
        else:
            self._fail_streak = 0

        m["matched"] = bool(outcome and outcome.matches_gemini_intent)
        m["tts_first_byte_s"] = round(res.first_byte_s, 2) if res.first_byte_s is not None else None
        # Time from "STT returned" to "first audio byte sent". The farmer also waits for
        # stt_answer_gap_s inside listen() and for client playback buffering.
        m["listen_end_to_first_audio_s"] = (
            round(res.started_at + res.first_byte_s - t_listen_end, 2)
            if res.first_byte_s is not None else None
        )
        log.info("turn_metrics %s", json.dumps(m, ensure_ascii=False))
        return finished

    # ------------------------------------------------------------------
    # Tool call helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _submit_calls(turn: LLMTurn):
        return [c for c in turn.tool_calls if c.name == "submit_answers"]

    @staticmethod
    def _merge_calls(calls) -> tuple[SubmitAnswers | None, str, str | None]:
        answers, say, err = [], "", None
        for c in calls:
            try:
                parsed = parse_submit_answers(c.args)
                answers += parsed.answers
                if parsed.say.strip():
                    say = parsed.say.strip()
            except ValidationError as e:
                err = str(e)[:300]
        parsed = SubmitAnswers(answers=answers, say=say) if answers else None
        return parsed, say, err

    @staticmethod
    def _responses(turn: LLMTurn, outcome: Outcome, parse_err: str | None):
        """One function response per function call in the turn, in order."""
        result = outcome.result.model_dump(mode="json")
        if parse_err:
            result["error"] = f"invalid arguments: {parse_err}"
        out, used = [], False
        for c in turn.tool_calls:
            if c.name == "submit_answers" and not used:
                out.append((c.name, result))
                used = True
            elif c.name == "submit_answers":
                out.append((c.name, {"note": "merged into the first submit_answers call"}))
            else:
                out.append((c.name, {"error": "unknown function"}))
        return out

    # ------------------------------------------------------------------
    # Speaking
    # ------------------------------------------------------------------

    async def _speak(self, text: str) -> SpeakResult:
        self._accepting_mic = False
        self._playback_done.clear()
        t0 = time.perf_counter()
        first: float | None = None
        nbytes = 0
        try:
            async for pcm in self.tts.synthesize(text, self.cfg.language):
                if first is None:
                    first = time.perf_counter() - t0
                nbytes += len(pcm)
                await self.transport.send_audio(pcm)
        except TTSError as e:
            log.warning("tts failed: %s", e)
            await self._emit({"type": "tts_failed", "text": text})
            if nbytes == 0:
                return SpeakResult(False, t0, None)

        await self._emit({"type": "tts_end"})
        seconds = nbytes / (PCM_SAMPLE_RATE * PCM_SAMPLE_WIDTH * PCM_CHANNELS)
        try:
            await asyncio.wait_for(
                self._playback_done.wait(), seconds + self.cfg.playback_grace_s
            )
        except asyncio.TimeoutError:
            log.warning("no playback_done within %.1fs of audio", seconds)
        return SpeakResult(True, t0, first)

    # ------------------------------------------------------------------
    # Events, persistence, failure accounting
    # ------------------------------------------------------------------

    def _question_event(self, q: Question) -> dict:
        snap = self.queue.snapshot()
        return {
            "type": "question",
            "id": q.id,
            "text": q.text,
            "index": len(snap) + 1,
            "total": len(snap) + len(self.queue.pending()),
        }

    async def _announce_saved(self, ids: list[str]) -> None:
        snap = self.queue.snapshot()
        for qid in ids:
            await self._emit(
                {"type": "answer_saved", "question_id": qid, "status": snap[qid].status}
            )

    async def _emit(self, event: dict) -> None:
        try:
            await self.transport.send_event(event)
        except Exception as e:
            log.debug("send_event failed: %s", e)

    def _save(self, ids: list[str]) -> None:
        if not ids:
            return
        snap = self.queue.snapshot()
        items = {i: snap[i] for i in ids}
        t = asyncio.create_task(self._save_safe(items))
        self._save_tasks.add(t)
        t.add_done_callback(self._save_tasks.discard)

    async def _save_safe(self, items: dict[str, Resolution]) -> None:
        try:
            await self.repo.save(self.session_id, items)
        except Exception:
            # Logged with the payload so a failed save can be replayed by hand.
            log.exception("answer save failed session=%s items=%s", self.session_id, items)

    async def _flush_saves(self) -> None:
        if self._save_tasks:
            await asyncio.gather(*self._save_tasks, return_exceptions=True)

    def _bump_fail(self, what: str) -> None:
        self._fail_streak += 1
        log.warning("provider failure (%s), streak=%d", what, self._fail_streak)
        if self._fail_streak >= self.cfg.max_fail_streak:
            raise SessionFailed(f"{self._fail_streak} provider failures in a row, last: {what}")