from fastapi import FastAPI

app = FastAPI()
from auth.auth_routes import router
app.include_router(router)
from farmer.endpoints import farmer , expert
app.include_router(farmer)
app.include_router(expert)
from ai_pipeline.api_endpoint import ai_router
app.include_router(ai_router)