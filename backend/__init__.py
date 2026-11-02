from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from backend.auth.auth_routes import router
from backend.farmer.endpoints import farmer, expert
from backend.ai_pipeline.api_endpoint import ai_router
from backend.voice_layer.api.router_sesion import voice_router
from backend.voice_layer.api.ws_voice import wss_router
from backend.voice_layer.core.factory import VoiceRuntime
from backend.voice_layer.core.session_store import SessionStore
from backend.voice_layer.db.voice_repo import VoiceRepo
from backend.voice_layer.narration import NarrationService
from backend.voice_layer.settings import ProviderSettings
from backend.db import supabase
from dotenv import load_dotenv
import logging
import os

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s: %(message)s")

app = FastAPI()
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
FRONTEND_ORIGINS = list(
    dict.fromkeys(
        origin.strip()
        for origin in (
            FRONTEND_URL + ",https://kisan-seva-gilt.vercel.app"
        ).split(",")
        if origin.strip()
    )
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def initialize_voice_runtime():
    settings = ProviderSettings()
    app.state.voice = VoiceRuntime(
        settings=settings,
        store=SessionStore(),
        repo=VoiceRepo(supabase),
    )
    app.state.narration = NarrationService(supabase, settings)


@app.get("/")
def serve_frontend():
    return FileResponse("frontend.html")


app.include_router(router)
app.include_router(farmer)
app.include_router(expert)
app.include_router(ai_router)
app.include_router(voice_router)
app.include_router(wss_router)
