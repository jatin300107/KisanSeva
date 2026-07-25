from supabase import AuthApiError


from fastapi import HTTPException , Depends , status
from backend.db import get_auth_client
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
def sign_up(data: SignUpRequest,
            auth_client = Depends(get_auth_client)):
    if data.role not in ["farmer","vet","agrologist"]:
            raise HTTPException(status_code=400, detail="Invalid role must be either 'farmer', 'vet', or 'agrologist'")
    res = auth_client.auth.sign_up({
        "email": data.email,
        "password": data.password
    })
    
    if res.user is None:
        raise HTTPException(status_code=400, detail="Signup failed")

    
    auth_client.table("users").insert({
        "id": res.user.id,  
        "name": data.name,
        "phone": data.phone,
        "role": data.role
    }).execute()

    return {
        "message": "User created",
        "user_id": res.user.id
    }


def sign_in(data: LoginRequest, auth_client ):
    try:
        res = auth_client.auth.sign_in_with_password({
            "email": data.email,
            "password": data.password
        })
        role = auth_client.table("users").select("role").eq("id", res.user.id).single().execute().data["role"]
        
    except AuthApiError as e:
        raise HTTPException(status_code=400, detail=str(e.message))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"{e}")
        
    

    return {
        "message": "Login successful",
        "access_token": res.session.access_token,
        "user_id": res.user.id,
        "role" : role,
    }


    
security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    
):
    token = credentials.credentials
    auth_client = get_auth_client()
    try:
        res = auth_client.auth.get_user(token)

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

