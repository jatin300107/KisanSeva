from dataclasses import dataclass, field
from typing import AsyncIterator, Protocol

# Audio contract for everything Gnani TTS returns and Gnani STT accepts.
PCM_SAMPLE_RATE = 16000
PCM_CHANNELS = 1
PCM_SAMPLE_WIDTH = 2  # bytes, signed 16-bit little-endian, headerless


class ProviderError(Exception):
    pass


class LLMError(ProviderError):
    pass


class TTSError(ProviderError):
    pass


class STTError(ProviderError):
    pass


@dataclass(frozen=True)
class TextDelta:
    text: str


@dataclass(frozen=True)
class ToolCall:
    name: str
    args: dict = field(default_factory=dict)


LLMEvent = TextDelta | ToolCall


@dataclass(frozen=True)
class Utterance:
    text: str                      # all segments joined, in order
    segments: list[dict]           # raw per-segment info (index, text, audio_ms, latency_ms)
    no_speech: bool                # True if nothing was transcribed





@dataclass(frozen=True)
class LLMTurn:
    text: str                      # what to speak, may be empty on a pure tool-call step
    tool_calls: list[ToolCall]
    latency_s: float
    usage: dict


class LLMProvider(Protocol):
    def checkpoint(self) -> int: ...
    def rollback(self, checkpoint: int) -> None: ...
    async def send_user_text(self, text: str) -> LLMTurn: ...
    async def send_tool_results(
        self, results: list[tuple[str, dict]], text_only: bool = True
    ) -> LLMTurn: ...

class TTSProvider(Protocol):
    def synthesize(self, text: str, language: str) -> AsyncIterator[bytes]: ...
    async def close(self) -> None: ...


class STTProvider(Protocol):
    async def listen(self, audio: AsyncIterator[bytes], language: str) -> Utterance: ...