# File: backend/app/api/v1/routes/engineer.py

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from app.core.database import get_db
from app.core.dependencies import require_role
from app.models.user import User, UserRole
from app.schemas.engineer import (
    EngineerProfileResponse, UpdateAvailabilityRequest,
    TicketResponse, UpdateTicketRequest, AddMessageRequest,
    TicketMessageResponse, EngineerStatsResponse,
)
from app.services.engineer_service import (
    get_engineer_profile, update_availability,
    get_engineer_tickets, get_ticket,
    update_ticket, add_message, get_engineer_stats,
)

router = APIRouter(prefix="/engineer", tags=["Engineer"])


def get_engineer_user(current_user: User = Depends(require_role(UserRole.ENGINEER))) -> User:
    return current_user


@router.get("/profile", response_model=EngineerProfileResponse)
def profile(db: Session = Depends(get_db), user: User = Depends(get_engineer_user)):
    return get_engineer_profile(db, user)


@router.patch("/availability")
def availability(data: UpdateAvailabilityRequest, db: Session = Depends(get_db), user: User = Depends(get_engineer_user)):
    return update_availability(db, user, data)


@router.get("/tickets", response_model=List[TicketResponse])
def tickets(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_engineer_user)
):
    return get_engineer_tickets(db, user, status)


@router.get("/tickets/{ticket_id}", response_model=TicketResponse)
def ticket(ticket_id: str, db: Session = Depends(get_db), user: User = Depends(get_engineer_user)):
    return get_ticket(db, user, ticket_id)


@router.patch("/tickets/{ticket_id}", response_model=TicketResponse)
def update(ticket_id: str, data: UpdateTicketRequest, db: Session = Depends(get_db), user: User = Depends(get_engineer_user)):
    return update_ticket(db, user, ticket_id, data)


@router.post("/tickets/{ticket_id}/messages", response_model=TicketMessageResponse)
def message(ticket_id: str, data: AddMessageRequest, db: Session = Depends(get_db), user: User = Depends(get_engineer_user)):
    return add_message(db, user, ticket_id, data.message)


@router.get("/stats", response_model=EngineerStatsResponse)
def stats(db: Session = Depends(get_db), user: User = Depends(get_engineer_user)):
    return get_engineer_stats(db, user)