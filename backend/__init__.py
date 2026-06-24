from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from backend.auth.auth_routes import router
from backend.farmer.endpoints import farmer, expert
from backend.ai_pipeline.api_endpoint import ai_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def serve_frontend():
    return FileResponse("frontend.html")


app.include_router(router)
app.include_router(farmer)
app.include_router(expert)
app.include_router(ai_router)