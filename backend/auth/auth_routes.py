from fastapi import APIRouter , Depends , UploadFile , File , HTTPException
from backend.auth.services import sign_in , sign_up , get_current_user , SignUpRequest , LoginRequest
from pydantic import BaseModel, EmailStr
import uuid
from backend.db import get_auth_client, supabase
router = APIRouter(prefix="/auth", tags=["Auth"])








@router.post("/signup")
def signup(data: SignUpRequest,auth_client = Depends(get_auth_client)):
    return sign_up(data,auth_client)


@router.post("/login")
def login(data: LoginRequest, auth_client = Depends(get_auth_client)):
    return sign_in(data, auth_client)
    


@router.get("/me")
def get_me(current_user=Depends(get_current_user), auth_client=Depends(get_auth_client)):
    result = auth_client.table("users").select("name, role").eq("id", current_user.id).single().execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="User profile not found")

    return {
        "user_id": current_user.id,
        "email": current_user.email,
        "role": result.data["role"],
        "name": result.data["name"],
    }


