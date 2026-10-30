import asyncio
import json
import os
import sys
import time
import wave
from pathlib import Path

import httpx
import websockets

BASE = os.environ.get("BASE", "http://127.0.0.1:8000")
HEADERS = {"Authorization": f"Bearer {os.environ.get('VOICE_TEST_TOKEN', '')}"}
FRAME = 1024
SILENCE = b"\x00" * FRAME

VOICE_TEST_TOKEN = os.environ.get("VOICE_TEST_TOKEN")
if not VOICE_TEST_TOKEN:
    raise RuntimeError(
        "VOICE_TEST_TOKEN is required; set it to a valid Supabase access token"
    )
HEADERS = {"Authorization": f"Bearer {VOICE_TEST_TOKEN}"}


def save_wav(path, pcm):
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(16000); w.writeframes(pcm)


async def mic(ws, clip: bytes, state: dict):
    await asyncio.sleep(0.3)               # a real farmer does not talk in the first millisecond
    t0 = time.monotonic()
    for n, i in enumerate(range(0, len(clip), FRAME)):
        await ws.send(clip[i:i + FRAME].ljust(FRAME, b"\x00"))
        d = t0 + (n + 1) * 0.032 - time.monotonic()
        if d > 0:
            await asyncio.sleep(d)
    state["clip_end"] = time.monotonic()
    while True:                            # a live mic keeps sending room silence
        await ws.send(SILENCE)
        await asyncio.sleep(0.032)


async def main(category: str, clip_paths: list[str]):
    clips = [Path(p).read_bytes() for p in clip_paths]   # raw 16 kHz mono s16le
    async with httpx.AsyncClient() as h:
        r = await h.post(f"{BASE}/voice/sessions",
                         json={"category": category, "language": "hi-IN"}, headers=HEADERS)
        r.raise_for_status()
    info = r.json()
    print("session", info["session_id"], "questions", info["total_questions"])
    url = BASE.replace("http", "ws", 1) + f"{info['ws_path']}?token={info['ws_token']}"

    state, turn, buf, mic_task = {}, 0, bytearray(), None
    async with websockets.connect(url, max_size=None) as ws:
        async for msg in ws:
            if isinstance(msg, bytes):
                if mic_task:
                    mic_task.cancel(); mic_task = None
                    if "clip_end" in state:
                        print(f"  DEAD AIR: {time.monotonic() - state.pop('clip_end'):.2f}s from end of your clip to first agent audio")
                buf += msg
                continue
            ev = json.loads(msg)
            print(json.dumps(ev, ensure_ascii=False)[:200])
            if ev["type"] == "tts_end":
                save_wav(f"e2e_agent_{turn}.wav", bytes(buf)); buf.clear()
                await ws.send(json.dumps({"type": "playback_done"}))
                clip = clips[turn] if turn < len(clips) else b""
                turn += 1
                mic_task = asyncio.create_task(mic(ws, clip, state))
            elif ev["type"] in ("done", "error"):
                if ev["type"] == "done":
                    break
    if mic_task:
        mic_task.cancel()


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1], sys.argv[2:]))