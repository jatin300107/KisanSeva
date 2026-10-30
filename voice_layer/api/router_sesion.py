import uuid
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from backend.auth.services import get_current_user

from ..prompts import LANGUAGE_NAMES

voice_router = APIRouter(prefix="/voice")

DB_TYPE = {"animal": "livestock", "livestock": "livestock", "crop": "crop"}





class StartRequest(BaseModel):
    category: Literal["animal", "livestock", "crop"]
    language: str = "hi-IN"


@voice_router.post("/sessions")
async def start_session(body: StartRequest, request: Request, user=Depends(get_current_user)):
    user_id = str(user.id)
    rt = request.app.state.voice
    if body.language not in LANGUAGE_NAMES:
        raise HTTPException(400, f"unsupported language: {body.language}")
    db_type = DB_TYPE[body.category]

    questions = await rt.repo.load_questions(db_type, body.language)
    if not questions:
        raise HTTPException(404, "no questions found for this category")

    sid = str(uuid.uuid4())
    try:
        sess = rt.store.create(sid, user_id, db_type, body.language, questions)
    except RuntimeError:
        raise HTTPException(503, "server busy, try again shortly")
    await rt.repo.create_session(sid, user_id, db_type, body.language)

    return {
        "session_id": sid,
        "ws_path": f"/voice/sessions/{sid}/ws",   # client adds origin, ws:// or wss://
        "ws_token": sess.ws_token,
        "audio": {"sample_rate": 16000, "channels": 1, "format": "s16le"},
        "total_questions": len(questions),
    }