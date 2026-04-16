from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

from auth.auth_routes import router
app.include_router(router)
from farmer.endpoints import farmer , expert
app.include_router(farmer)
app.include_router(expert)
from ai_pipeline.api_endpoint import ai_router
app.include_router(ai_router)