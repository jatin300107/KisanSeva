from supabase import AuthApiError

from backend.db import supabase
from fastapi import HTTPException , Depends , status

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel , EmailStr
class SignUpRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: str
    role: str = "farmer"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
def sign_up(data: SignUpRequest):
    
    res = supabase.auth.sign_up({
        "email": data.email,
        "password": data.password
    })

    if res.user is None:
        raise HTTPException(status_code=400, detail="Signup failed")

    
    supabase.table("users").insert({
        "id": res.user.id,  
        "name": data.name,
        "phone": data.phone,
        "role": data.role
    }).execute()

    return {
        "message": "User created",
        "user_id": res.user.id
    }


def sign_in(data: LoginRequest):
    try:
        res = supabase.auth.sign_in_with_password({
            "email": data.email,
            "password": data.password
        })
    except AuthApiError as e:
        raise HTTPException(status_code=400, detail=str(e.message))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Something went wrong")
    

    return {
        "message": "Login successful",
        "access_token": res.session.access_token,
        "user_id": res.user.id
    }


    
security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials

    try:
        res = supabase.auth.get_user(token)

        if res.user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
    

        return res.user

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )

