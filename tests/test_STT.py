import asyncio
import json
import os
import subprocess
import sys
import time
from pathlib import Path

import websockets
from dotenv import load_dotenv

load_dotenv()

WS_URL = "wss://api.vachana.ai/stt/v3/stream"
API_KEY = os.environ["GNANI_API_KEY"]

SAMPLE_RATE = 16000
FRAME_BYTES = 1024        # exactly 512 samples of 16-bit mono, required by the API
FRAME_SECONDS = 0.032     # 32 ms per frame at 16 kHz
MIN_SILENCE_MS = 800      # farmers pause mid-answer, so this is above the 500 default

SETTINGS = {
    "lang_code": "hi-IN",
    "x-sample-rate": str(SAMPLE_RATE),
    "x-format": "verbatim",       # try "transcribe" to get numbers like "3 din"
    "x-vad-threshold": "0.6",
    "x-min-silence-ms": str(MIN_SILENCE_MS),
    "x-min-speech-ms": "200",
}

# Optional word boosting: single words, letters only (Devanagari is fine).
BIAS_WORDS = []

HEADERS = {"x-api-key-id": API_KEY, **SETTINGS}
if BIAS_WORDS:
    HEADERS["x-bias-list"] = json.dumps(BIAS_WORDS)  # escapes non-ASCII safely
    HEADERS["x-bias-score"] = "1.0"

AUDIO_EXTS = {
    ".wav", ".mp3", ".ogg", ".opus", ".m4a", ".aac", ".flac",
    ".amr", ".webm", ".mp4", ".3gp", ".pcm",
}


def to_pcm(path: Path) -> bytes:
    """Convert any audio file to raw 16 kHz mono signed 16-bit little-endian PCM."""
    if path.suffix.lower() == ".pcm":
        return path.read_bytes()  # assumed to already be 16 kHz mono s16le
    cmd = [
        "ffmpeg", "-v", "error", "-i", str(path),
        "-ar", str(SAMPLE_RATE), "-ac", "1", "-f", "s16le", "-",
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, check=True)
    except FileNotFoundError:
        sys.exit("ffmpeg is not installed or not on PATH.")
    except subprocess.CalledProcessError as e:
        raise RuntimeError(e.stderr.decode(errors="ignore"))
    return result.stdout


async def transcribe(pcm: bytes) -> list[dict]:
    segments: list[dict] = []
    state = {"processing": 0, "last_event": time.monotonic()}

    async with websockets.connect(WS_URL, additional_headers=HEADERS) as ws:

        async def receiver():
            try:
                async for raw in ws:
                    if isinstance(raw, bytes):
                        continue
                    msg = json.loads(raw)
                    state["last_event"] = time.monotonic()
                    kind = msg.get("type")
                    if kind == "connected":
                        print(f"  connected, config: {msg.get('config')}")
                    elif kind == "processing":
                        state["processing"] += 1
                    elif kind == "transcript":
                        segments.append(msg)
                    elif kind == "error":
                        print(f"  SERVER ERROR: {msg.get('message')}")
            except websockets.exceptions.ConnectionClosed:
                pass

        recv_task = asyncio.create_task(receiver())

        # Split into exact 1024-byte frames, then add trailing silence so the
        # last segment is closed by the server's VAD.
        frames = [
            pcm[i:i + FRAME_BYTES].ljust(FRAME_BYTES, b"\x00")
            for i in range(0, len(pcm), FRAME_BYTES)
        ]
        pad_frames = int((MIN_SILENCE_MS + 1500) / 1000 / FRAME_SECONDS)
        frames += [b"\x00" * FRAME_BYTES] * pad_frames

        # Send at real-time cadence, correcting for drift.
        start = time.monotonic()
        for n, frame in enumerate(frames):
            await ws.send(frame)
            delay = start + (n + 1) * FRAME_SECONDS - time.monotonic()
            if delay > 0:
                await asyncio.sleep(delay)

        # Wait for every captured segment to come back (max 15 s).
        deadline = time.monotonic() + 15
        while time.monotonic() < deadline:
            quiet = time.monotonic() - state["last_event"] > 1.5
            if len(segments) >= state["processing"] and quiet:
                break
            await asyncio.sleep(0.2)

        recv_task.cancel()

    return segments


def find_files() -> list[Path]:
    if len(sys.argv) > 1:
        return [Path(a) for a in sys.argv[1:]]
    here = Path(__file__).resolve().parent
    return sorted(p for p in here.iterdir() if p.suffix.lower() in AUDIO_EXTS)


async def main():
    files = find_files()
    if not files:
        sys.exit("No audio files found next to the script.")

    all_results = []
    for path in files:
        print(f"\n=== {path.name} ===")
        try:
            pcm = to_pcm(path)
            seconds = len(pcm) / (SAMPLE_RATE * 2)
            print(f"  audio length: {seconds:.1f}s (streaming takes about this long)")
            segments = await transcribe(pcm)
        except Exception as e:
            print(f"  FAILED: {type(e).__name__}: {e}")
            all_results.append({"file": path.name, "error": str(e)})
            continue

        if not segments:
            print("  no transcript segments returned")
        for seg in segments:
            print(
                f"  [{seg.get('segment_index')}] {seg.get('text')}"
                f"   ({seg.get('audio_duration_ms')} ms audio, {seg.get('latency')} ms latency)"
            )

        full_text = " ".join(s.get("text", "") for s in segments)
        print(f"  JOINED: {full_text}")
        all_results.append({
            "file": path.name,
            "settings": SETTINGS,
            "segments": [
                {
                    "index": s.get("segment_index"),
                    "text": s.get("text"),
                    "audio_ms": s.get("audio_duration_ms"),
                    "latency_ms": s.get("latency"),
                }
                for s in segments
            ],
            "joined": full_text,
        })

    out = Path(__file__).resolve().parent / "stt_results.json"
    out.write_text(json.dumps(all_results, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nSaved to {out}")


if __name__ == "__main__":
    asyncio.run(main())