from dataclasses import dataclass

from voice_layer.base import LLMTurn, ToolCall, Utterance


def tc(*items):
    """items: (question_id, status, value, raw_text). One submit_answers call."""
    return ToolCall(
        "submit_answers",
        {
            "answers": [
                {"question_id": q, "status": s, "value": v, "raw_text": r}
                for q, s, v, r in items
            ]
        },
    )


def turn(text="", calls=(), latency=0.5):
    return LLMTurn(text=text, tool_calls=list(calls), latency_s=latency, usage={})


class FakeSTT:
    """Each script item is a transcript string ("" means silence) or an Exception to raise."""

    def __init__(self, script):
        self.script = list(script)

    async def listen(self, audio, language):
        if not self.script:
            raise AssertionError("STT script exhausted: the loop asked for more speech than the test planned")
        item = self.script.pop(0)
        if isinstance(item, Exception):
            raise item
        seg = [{"index": 0, "text": item, "audio_ms": 1000, "latency_ms": 300}]
        return Utterance(text=item, segments=seg, no_speech=not item)


class FakeTTS:
    def __init__(self):
        self.spoken: list[str] = []
        self.closed = False

    async def synthesize(self, text, language):
        self.spoken.append(text)
        yield b"\x00\x00" * 1600  # 0.1 s of audio

    async def close(self):
        self.closed = True


class FakeTransport:
    def __init__(self):
        self.events: list[dict] = []
        self.audio: list[bytes] = []
        self.orch = None

    async def send_audio(self, pcm):
        self.audio.append(pcm)

    async def send_event(self, event):
        self.events.append(event)
        if event["type"] == "tts_end" and self.orch:
            self.orch.on_playback_done()   # simulates the client finishing playback


class FakeRepo:
    def __init__(self):
        self.saved = {}
        self.status = None

    async def save(self, session_id, items):
        self.saved.update(items)

    async def set_status(self, session_id, status):
        self.status = status


class FakeDialogue:
    """Scripted stand-in for GeminiDialogue. Items are LLMTurn or an Exception to raise."""

    def __init__(self, script):
        self.script = list(script)
        self.history: list[LLMTurn] = []
        self.pending: list = []
        self.sent: list[tuple] = []   # ("user", text) or ("tool", results)

    def checkpoint(self):
        return len(self.history), list(self.pending)

    def rollback(self, cp):
        n, pending = cp
        del self.history[n:]
        self.pending = pending

    def defer_tool_results(self, results):
        self.pending += list(results)

    async def send_user_text(self, text):
        self.sent.append(("user", text))
        self.pending = []
        return self._next()

    async def send_tool_results(self, results):
        self.sent.append(("tool", results))
        return self._next()

    def _next(self):
        if not self.script:
            raise AssertionError("LLM script exhausted")
        item = self.script.pop(0)
        if isinstance(item, Exception):
            raise item
        self.history.append(item)
        return item


@dataclass
class Rig:
    orch: object
    queue: object
    llm: FakeDialogue
    stt: FakeSTT
    tts: FakeTTS
    transport: FakeTransport
    repo: FakeRepo