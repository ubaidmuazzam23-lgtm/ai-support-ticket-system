# File: backend/app/schemas/engineer.py

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid

from app.models.engineer import AvailabilityStatus, SeniorityLevel
from app.models.ticket import TicketStatus, TicketPriority, TicketDomain, TicketComplexity


# ── Profile ───────────────────────────────────────────────────────────────────

class EngineerProfileResponse(BaseModel):
    engineer_id: str
    full_name: str
    email: str
    domain_expertise: List[str]
    region: str
    timezone: str
    seniority_level: SeniorityLevel
    max_ticket_capacity: int
    availability_status: AvailabilityStatus
    active_ticket_count: int
    total_resolved: int
    avg_resolution_time: int
    sla_compliance_rate: int

    class Config:
        from_attributes = True


# ── Availability ──────────────────────────────────────────────────────────────

class UpdateAvailabilityRequest(BaseModel):
    status: AvailabilityStatus


# ── Ticket ────────────────────────────────────────────────────────────────────

class TicketMessageResponse(BaseModel):
    id: uuid.UUID
    sender_id: uuid.UUID
    sender_name: str
    message: str
    created_at: datetime

    class Config:
        from_attributes = True


class TicketResponse(BaseModel):
    id: uuid.UUID
    ticket_number: str
    title: str
    description: str
    domain: TicketDomain
    priority: TicketPriority
    status: TicketStatus
    complexity: Optional[TicketComplexity]
    ai_diagnosis: Optional[str]
    ai_confidence: Optional[float]
    steps_tried: Optional[str]
    cnn_image_result: Optional[str]
    resolution_notes: Optional[str]
    user_name: str
    user_email: str
    user_city: Optional[str]
    user_country: Optional[str]
    user_timezone: Optional[str]
    sla_deadline: Optional[datetime]
    sla_breached: bool
    created_at: datetime
    updated_at: datetime
    messages: List[TicketMessageResponse] = []

    class Config:
        from_attributes = True


class UpdateTicketRequest(BaseModel):
    status: Optional[TicketStatus] = None
    resolution_notes: Optional[str] = None


class AddMessageRequest(BaseModel):
    message: str


# ── Stats ─────────────────────────────────────────────────────────────────────

class EngineerStatsResponse(BaseModel):
    total_resolved: int
    active_tickets: int
    avg_resolution_time: int
    sla_compliance_rate: int
    this_week_resolved: int