import secrets
import time
from dataclasses import dataclass, field


@dataclass
class VoiceSession:
    id: str
    user_id: str
    category: str          # "crop" or "livestock"
    language: str
    questions: list
    ws_token: str
    token_expires: float
    claimed: bool = False
    created_at: float = field(default_factory=time.time)


class SessionStore:
    def __init__(self, max_sessions: int = 50, token_ttl_s: float = 60.0, session_ttl_s: float = 3600.0):
        self._s: dict[str, VoiceSession] = {}
        self.max_sessions = max_sessions
        self.token_ttl_s = token_ttl_s
        self.session_ttl_s = session_ttl_s

    def _purge(self) -> None:
        now = time.time()
        for sid in [k for k, v in self._s.items() if now - v.created_at > self.session_ttl_s]:
            del self._s[sid]

    def create(self, session_id, user_id, category, language, questions) -> VoiceSession:
        self._purge()
        if len(self._s) >= self.max_sessions:
            raise RuntimeError("too many active voice sessions")
        sess = VoiceSession(
            id=session_id, user_id=user_id, category=category, language=language,
            questions=questions, ws_token=secrets.token_urlsafe(32),
            token_expires=time.time() + self.token_ttl_s,
        )
        self._s[session_id] = sess
        return sess

    def claim(self, session_id: str, token: str) -> VoiceSession | None:
        """Single use: the token works once, then the session is claimed."""
        sess = self._s.get(session_id)
        if sess is None or sess.claimed:
            return None
        if time.time() > sess.token_expires:
            return None
        if not secrets.compare_digest(sess.ws_token, token):
            return None
        sess.claimed = True
        return sess

    def remove(self, session_id: str) -> None:
        self._s.pop(session_id, None)