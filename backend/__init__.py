from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from auth.auth_routes import router
from farmer.endpoints import farmer, expert
from ai_pipeline.api_endpoint import ai_router

app = FastAPI()

# CORS (optional for now)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve frontend
@app.get("/")
def serve_frontend():
    return FileResponse("frontend.html")

# Routes
app.include_router(router)
app.include_router(farmer)
app.include_router(expert)
app.include_router(ai_router)