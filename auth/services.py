from db import supabase
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
    # Step 1: Create auth user
    res = supabase.auth.sign_up({
        "email": data.email,
        "password": data.password
    })

    if res.user is None:
        raise HTTPException(status_code=400, detail="Signup failed")

    # Step 2: Insert into public users table
    supabase.table("users").insert({
        "id": res.user.id,  # 🔥 LINKING KEY
        "name": data.name,
        "phone": data.phone,
        "role": data.role
    }).execute()

    return {
        "message": "User created",
        "user_id": res.user.id
    }


def sign_in(data: LoginRequest):
    res = supabase.auth.sign_in_with_password({
        "email": data.email,
        "password": data.password
    })

    if res.user is None or res.session is None:
        raise HTTPException(status_code=400, detail="Invalid credentials")

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

