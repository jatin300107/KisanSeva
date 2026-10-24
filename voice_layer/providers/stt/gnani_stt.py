import asyncio
import contextlib
import json
import logging
import time
from array import array
from typing import AsyncIterator

import websockets
from websockets.exceptions import ConnectionClosed, WebSocketException

from ...base import PCM_SAMPLE_RATE, STTError, Utterance
from ...settings import ProviderSettings

log = logging.getLogger("voice.stt")

FRAME_BYTES = 1024            # exactly 512 samples, required by the API
FRAME_S = 0.032               # 32 ms per frame at 16 kHz
SILENCE = b"\x00" * FRAME_BYTES


class Reframer:
    """Turns arbitrary-size mic chunks into exact 1024-byte frames."""

    def __init__(self):
        self._buf = bytearray()

    def feed(self, chunk: bytes) -> list[bytes]:
        self._buf += chunk
        out = []
        while len(self._buf) >= FRAME_BYTES:
            out.append(bytes(self._buf[:FRAME_BYTES]))
            del self._buf[:FRAME_BYTES]
        return out

    def flush(self) -> bytes | None:
        if not self._buf:
            return None
        frame = bytes(self._buf).ljust(FRAME_BYTES, b"\x00")
        self._buf.clear()
        return frame


def _level(frame: bytes) -> float:
    samples = array("h", frame)  # s16le on little-endian hosts
    return sum(abs(x) for x in samples) / len(samples)


class GnaniSTT:
    """
    One WSS connection per answer. The server splits speech into segments
    at pauses, so one farmer answer can come back as several segments.
    listen() decides when the answer is complete.
    """

    def __init__(self, settings: ProviderSettings):
        self._s = settings

    def _headers(self, language: str) -> dict:
        s = self._s
        h = {
            "x-api-key-id": s.gnani_api_key,
            "lang_code": language,                 # e.g. "hi-IN"
            "x-sample-rate": str(PCM_SAMPLE_RATE),
            "x-format": s.gnani_stt_format,
            "x-vad-threshold": str(s.gnani_stt_vad_threshold),
            "x-min-silence-ms": str(s.gnani_stt_min_silence_ms),
            "x-min-speech-ms": str(s.gnani_stt_min_speech_ms),
        }
        if s.gnani_stt_bias_words:
            h["x-bias-list"] = json.dumps(s.gnani_stt_bias_words)
            h["x-bias-score"] = "1.0"
        return h

    async def listen(self, audio: AsyncIterator[bytes], language: str) -> Utterance:
        s = self._s
        segments: list[dict] = []
        st = {
            "processing": 0,
            "last_event": time.monotonic(),
            "last_voice": time.monotonic(),
            "error": None,
            "closed": False,
        }

        try:
            ws = await websockets.connect(
                s.gnani_stt_url,
                additional_headers=self._headers(language),
                open_timeout=s.gnani_connect_timeout_s,
            )
        except (OSError, asyncio.TimeoutError, WebSocketException) as e:
            raise STTError(f"stt connect failed: {type(e).__name__}: {e}") from e

        async def receiver():
            try:
                async for raw in ws:
                    if isinstance(raw, bytes):
                        continue
                    msg = json.loads(raw)
                    st["last_event"] = time.monotonic()
                    kind = msg.get("type")
                    if kind == "processing":
                        st["processing"] += 1
                    elif kind == "transcript":
                        segments.append(msg)
                    elif kind == "error":
                        st["error"] = str(msg.get("message"))
            except ConnectionClosed:
                pass
            finally:
                st["closed"] = True

        async def sender():
            framer = Reframer()
            async for chunk in audio:
                for frame in framer.feed(chunk):
                    if _level(frame) > s.stt_energy_threshold:
                        st["last_voice"] = time.monotonic()
                    await ws.send(frame)
            tail = framer.flush()
            if tail:
                await ws.send(tail)
            # Mic stream ended: push paced silence so the server's VAD
            # closes the last segment.
            pad = int((s.gnani_stt_min_silence_ms + 1500) / 1000 / FRAME_S)
            for _ in range(pad):
                await ws.send(SILENCE)
                await asyncio.sleep(FRAME_S)

        recv_task = asyncio.create_task(receiver())
        send_task = asyncio.create_task(sender())
        start = time.monotonic()

        try:
            while True:
                await asyncio.sleep(0.05)
                now = time.monotonic()

                if send_task.done() and not send_task.cancelled():
                    exc = send_task.exception()
                    if exc and not isinstance(exc, ConnectionClosed):
                        raise STTError(f"stt audio send failed: {exc}") from exc

                if st["error"] and not segments:
                    raise STTError(f"stt server error: {st['error']}")
                if st["closed"]:
                    if st["processing"] > len(segments) and not segments:
                        raise STTError("stt connection closed before any transcript")
                    break
                if now - start > s.stt_max_utterance_s:
                    log.warning("stt hit max utterance length")
                    break

                if st["processing"] == 0:
                    if now - start > s.stt_no_speech_timeout_s:
                        break
                    continue

                # Answer is complete when every closed segment has come back
                # AND neither the server nor the mic has shown activity for a while.
                all_back = len(segments) >= st["processing"]
                quiet_for = now - max(st["last_event"], st["last_voice"])
                if all_back and quiet_for > s.stt_answer_gap_s:
                    break
        finally:
            for t in (send_task, recv_task):
                t.cancel()
                with contextlib.suppress(asyncio.CancelledError, Exception):
                    await t
            with contextlib.suppress(Exception):
                await ws.close()

        ordered = sorted(segments, key=lambda m: m.get("segment_index", 0))
        parts = [
            {
                "index": m.get("segment_index"),
                "text": m.get("text", ""),
                "audio_ms": m.get("audio_duration_ms"),
                "latency_ms": m.get("latency"),
            }
            for m in ordered
        ]
        text = " ".join(p["text"] for p in parts if p["text"]).strip()
        log.info(
            "stt done segments=%d latencies_ms=%s chars=%d",
            len(parts), [p["latency_ms"] for p in parts], len(text),
        )
        return Utterance(text=text, segments=parts, no_speech=not text)