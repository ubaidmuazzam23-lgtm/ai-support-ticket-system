# File: backend/app/services/auth_service.py

from sqlalchemy.orm import Session
from fastapi import HTTPException
from datetime import datetime
import secrets
import string
import threading

from app.models.user import User, UserRole
from app.models.engineer import Engineer, AvailabilityStatus
from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token
)
from app.schemas.auth import (
    UserRegisterRequest, LoginRequest, LoginResponse,
    RefreshResponse, ForgotPasswordRequest
)
from app.services.email_service import send_temp_password_email, send_welcome_email


def _generate_temp_password(length: int = 10) -> str:
    chars = string.ascii_uppercase + string.ascii_lowercase + string.digits + '#@!$'
    pwd = [
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.digits),
        secrets.choice('#@!$'),
    ]
    pwd += [secrets.choice(chars) for _ in range(length - 4)]
    secrets.SystemRandom().shuffle(pwd)
    return ''.join(pwd)


def register_user(db: Session, data: UserRegisterRequest) -> User:
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        role=UserRole.USER,
        city=data.city, country=data.country,
        timezone=data.timezone or "UTC",
        is_active=True, is_verified=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    threading.Thread(target=send_welcome_email, args=(user.email, user.full_name), daemon=True).start()
    return user


def login_user(db: Session, data: LoginRequest) -> LoginResponse:
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated. Contact your administrator.")
    if user.role == UserRole.ENGINEER:
        engineer = db.query(Engineer).filter(Engineer.user_id == user.id).first()
        if engineer and not engineer.is_activated:
            raise HTTPException(status_code=403, detail="PENDING_ACTIVATION")

    user.last_login = datetime.utcnow()
    db.commit()

    token_data = {"sub": str(user.id), "role": user.role.value}
    return LoginResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        role=user.role,
        full_name=user.full_name,
        email=user.email,
    )


def refresh_access_token(db: Session, refresh_token: str) -> RefreshResponse:
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    user = db.query(User).filter(User.id == payload.get("sub")).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return RefreshResponse(
        access_token=create_access_token({"sub": str(user.id), "role": user.role.value})
    )


def forgot_password(db: Session, data: ForgotPasswordRequest) -> dict:
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email address")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="This account has been deactivated")
    temp_password = _generate_temp_password()
    user.hashed_password = hash_password(temp_password)
    db.commit()
    threading.Thread(target=send_temp_password_email, args=(user.email, user.full_name, temp_password), daemon=True).start()
    return {"message": f"A temporary password has been sent to {data.email}"}


def activate_engineer_with_credentials(db: Session, email: str, temp_password: str, new_password: str) -> dict:
    """Engineer activates using email + temp password, sets new permanent password"""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email")

    if user.role != UserRole.ENGINEER:
        raise HTTPException(status_code=400, detail="This account is not an engineer account")

    engineer = db.query(Engineer).filter(Engineer.user_id == user.id).first()
    if not engineer:
        raise HTTPException(status_code=404, detail="Engineer profile not found")

    if engineer.is_activated:
        raise HTTPException(status_code=400, detail="Account is already activated. Please sign in normally.")

    # Verify temp password
    if not verify_password(temp_password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials. Check your email for the correct temp password.")

    # Set new permanent password
    user.hashed_password = hash_password(new_password)
    user.is_verified = True
    engineer.is_activated = True
    engineer.availability_status = AvailabilityStatus.AVAILABLE
    engineer.temp_password_hash = None
    db.commit()

    return {"message": "Account activated successfully. You can now sign in."}