import re

# Latin and Devanagari sentence enders. Requires trailing whitespace so that
# "3.5" split across deltas is not cut in the middle.
_END = re.compile(r"[.!?\u0964]+\s")


class SentenceChunker:
    """Turns streamed text deltas into complete sentences for TTS."""

    def __init__(self, min_chars: int = 12):
        self._buf = ""
        self._min_chars = min_chars

    def feed(self, delta: str) -> list[str]:
        self._buf += delta
        out: list[str] = []
        start = 0
        while True:
            m = _END.search(self._buf, start)
            if not m:
                break
            sentence = self._buf[: m.end()].strip()
            if len(sentence) < self._min_chars:
                start = m.end()
                continue
            out.append(sentence)
            self._buf = self._buf[m.end():]
            start = 0
        return out

    def flush(self) -> str | None:
        rest = self._buf.strip()
        self._buf = ""
        return rest or None