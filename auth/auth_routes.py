from fastapi import APIRouter
from auth.services import sign_in , sign_up
router = APIRouter()


@router.post("/signup")
def signup(email: str, password: str):
    return sign_up(email, password)

@router.post("/login")
def login(email: str, password: str):
    return sign_in(email, password)