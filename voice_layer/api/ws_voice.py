import asyncio
import contextlib
import json
import logging

from fastapi import APIRouter, WebSocket

from ..core.factory import build_orchestrator

wss_router = APIRouter()
log = logging.getLogger("voice.ws")


class WsTransport:
    def __init__(self, ws: WebSocket):
        self.ws = ws

    async def send_audio(self, pcm: bytes) -> None:
        await self.ws.send_bytes(pcm)

    async def send_event(self, event: dict) -> None:
        await self.ws.send_json(event)


async def _reader(ws: WebSocket, orch) -> None:
    while True:
        msg = await ws.receive()
        if msg["type"] == "websocket.disconnect":
            return
        if msg.get("bytes") is not None:
            orch.feed_audio(msg["bytes"])
        elif msg.get("text"):
            try:
                evt = json.loads(msg["text"])
            except json.JSONDecodeError:
                continue
            if evt.get("type") == "playback_done":
                orch.on_playback_done()
            elif evt.get("type") == "end":
                orch.on_client_end()


@wss_router.websocket("/voice/sessions/{session_id}/ws")
async def voice_ws(ws: WebSocket, session_id: str, token: str):
    rt = ws.app.state.voice
    session = rt.store.claim(session_id, token)
    if session is None:
        await ws.close(code=4401)
        return
    await ws.accept()

    orch = build_orchestrator(rt, session, WsTransport(ws))
    run_task = asyncio.create_task(orch.run())
    read_task = asyncio.create_task(_reader(ws, orch))
    try:
        done, _ = await asyncio.wait({run_task, read_task}, return_when=asyncio.FIRST_COMPLETED)
        if run_task not in done:
            orch.on_client_end()               # socket dropped or  quit client
        with contextlib.suppress(Exception, asyncio.CancelledError):
            status = await run_task
            log.info("session %s ended: %s", session_id, status)
    finally:
        read_task.cancel()
        with contextlib.suppress(asyncio.CancelledError, Exception):
            await read_task
        with contextlib.suppress(Exception):
            await ws.close()
        rt.store.remove(session_id)