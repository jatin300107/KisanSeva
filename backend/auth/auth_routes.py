from fastapi import APIRouter , Depends , UploadFile , File , HTTPException
from auth.services import sign_in , sign_up , get_current_user , SignUpRequest , LoginRequest
from pydantic import BaseModel, EmailStr
import uuid
from db import supabase
router = APIRouter(prefix="/auth", tags=["Auth"])








@router.post("/signup")
def signup(data: SignUpRequest):
    return sign_up(data)


@router.post("/login")
def login(data: LoginRequest):
    return sign_in(data)


@router.get("/me")
def get_me(current_user=Depends(get_current_user)):
    return {
        "user_id": current_user.id,
        "email": current_user.email
    }


