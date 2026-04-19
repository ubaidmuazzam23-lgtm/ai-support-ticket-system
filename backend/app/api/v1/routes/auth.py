# File: backend/app/api/v1/routes/auth.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import (
    UserRegisterRequest, LoginRequest, LoginResponse,
    RefreshRequest, RefreshResponse, ActivateEngineerRequest,
    UserResponse, ForgotPasswordRequest,
)
from app.services.auth_service import (
    register_user, login_user, refresh_access_token,
    forgot_password, activate_engineer_with_credentials,
)

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserResponse, status_code=201)
def register(data: UserRegisterRequest, db: Session = Depends(get_db)):
    return register_user(db, data)


@router.post("/login", response_model=LoginResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    return login_user(db, data)


@router.post("/refresh", response_model=RefreshResponse)
def refresh(data: RefreshRequest, db: Session = Depends(get_db)):
    return refresh_access_token(db, data.refresh_token)


@router.post("/forgot-password")
def forgot_pwd(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    return forgot_password(db, data)


@router.post("/activate-engineer")
def activate(data: ActivateEngineerRequest, db: Session = Depends(get_db)):
    return activate_engineer_with_credentials(db, data.email, data.temp_password, data.new_password)


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/logout")
def logout():
    return {"message": "Logged out successfully"}