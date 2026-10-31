import time

from voice_layer.core.session_store import SessionStore


def test_token_is_single_use():
    s = SessionStore()
    sess = s.create("a", "u", "crop", "hi-IN", [])
    assert s.claim("a", "wrong") is None
    assert s.claim("a", sess.ws_token) is sess
    assert s.claim("a", sess.ws_token) is None


def test_expired_token_rejected():
    s = SessionStore(token_ttl_s=-1)
    sess = s.create("a", "u", "crop", "hi-IN", [])
    assert s.claim("a", sess.ws_token) is None


def test_capacity_limit():
    s = SessionStore(max_sessions=1)
    s.create("a", "u", "crop", "hi-IN", [])
    try:
        s.create("b", "u", "crop", "hi-IN", [])
        assert False
    except RuntimeError:
        pass