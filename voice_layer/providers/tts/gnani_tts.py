import base64
import json
import logging
import time
from typing import AsyncIterator

import httpx

from ...base import (
    PCM_CHANNELS,
    PCM_SAMPLE_RATE,
    PCM_SAMPLE_WIDTH,
    TTSError,
)
from ...settings import ProviderSettings

log = logging.getLogger("voice.tts")


class GnaniTTS:
    """
    SSE over HTTP POST, one request per sentence. Yields raw PCM
    (16 kHz, mono, s16le, headerless). One pooled client per session
    keeps the TLS connection warm, which your cold/warm test measures.
    """

    def __init__(self, settings: ProviderSettings):
        self._s = settings
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(
                settings.gnani_tts_timeout_s, connect=settings.gnani_connect_timeout_s
            )
        )

    def _body(self, text: str, language: str) -> dict:
        return {
            "text": text,
            "audio_config": {
                "sample_rate": PCM_SAMPLE_RATE,
                "num_channels": PCM_CHANNELS,
                "sample_width": PCM_SAMPLE_WIDTH,
                "encoding": "linear_pcm",
                "container": "raw",
            },
            "model": self._s.gnani_tts_model,
            "voice": self._s.gnani_tts_voice,
            "language": language,          # e.g. "hi-IN"
            "speed": self._s.gnani_tts_speed,
        }

    async def synthesize(self, text: str, language: str) -> AsyncIterator[bytes]:
        if not text.strip():
            return

        headers = {
            "X-API-Key-ID": self._s.gnani_api_key,
            "Content-Type": "application/json",
        }
        t0 = time.perf_counter()
        first_at: float | None = None
        got_complete = False
        event: str | None = None

        try:
            async with self._client.stream(
                "POST", self._s.gnani_tts_url, json=self._body(text, language), headers=headers
            ) as resp:
                if resp.status_code != 200:
                    detail = (await resp.aread()).decode("utf-8", "replace")[:200]
                    raise TTSError(f"tts http {resp.status_code}: {detail}")

                async for line in resp.aiter_lines():
                    if line.startswith("event:"):
                        event = line[6:].strip()
                    elif line.startswith("data:"):
                        try:
                            data = json.loads(line[5:].strip())
                        except json.JSONDecodeError:
                            raise TTSError("tts sent invalid json in stream")
                        if event == "chunk":
                            audio = data.get("audio")
                            if audio:
                                if first_at is None:
                                    first_at = time.perf_counter() - t0
                                yield base64.b64decode(audio)
                        elif event == "complete":
                            got_complete = True
                            break
                        elif event == "error":
                            raise TTSError(f"tts sse error: {str(data)[:200]}")
        except httpx.TimeoutException:
            raise TTSError("tts timeout")
        except httpx.HTTPError as e:
            raise TTSError(f"tts http error: {type(e).__name__}")

        if first_at is None:
            raise TTSError("tts returned no audio")
        if not got_complete:
            raise TTSError("tts stream ended without a complete event")

        log.info(
            "tts ok first_byte=%.2fs total=%.2fs chars=%d",
            first_at, time.perf_counter() - t0, len(text),
        )

    async def close(self) -> None:
        await self._client.aclose()