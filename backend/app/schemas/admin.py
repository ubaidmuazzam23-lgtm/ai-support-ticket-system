# File: backend/app/schemas/admin.py

from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime
import uuid

from app.models.engineer import AvailabilityStatus, SeniorityLevel
from app.models.ticket import TicketStatus, TicketPriority, TicketDomain, TicketComplexity

VALID_DOMAINS = [
    "networking", "hardware", "software", "security",
    "email_communication", "identity_access", "database",
    "cloud", "infrastructure", "devops", "erp_business_apps",
    "endpoint_management",
]


class CreateEngineerRequest(BaseModel):
    full_name: str
    email: EmailStr
    domain_expertise: List[str]
    region: str
    timezone: str
    seniority_level: SeniorityLevel = SeniorityLevel.MID
    max_ticket_capacity: int = 10

    @field_validator('full_name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        if len(v.strip()) < 2:
            raise ValueError('Full name must be at least 2 characters')
        return v.strip()

    @field_validator('domain_expertise')
    @classmethod
    def validate_domains(cls, v: List[str]) -> List[str]:
        if not v:
            raise ValueError('At least one domain expertise is required')
        return v

    @field_validator('max_ticket_capacity')
    @classmethod
    def validate_capacity(cls, v: int) -> int:
        if v < 1 or v > 50:
            raise ValueError('Capacity must be between 1 and 50')
        return v


class UpdateEngineerRequest(BaseModel):
    full_name: Optional[str] = None
    domain_expertise: Optional[List[str]] = None
    region: Optional[str] = None
    timezone: Optional[str] = None
    seniority_level: Optional[SeniorityLevel] = None
    max_ticket_capacity: Optional[int] = None
    is_active: Optional[bool] = None


class EngineerResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
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
    is_activated: bool
    is_active: bool
    total_resolved: int
    avg_resolution_time: int
    sla_compliance_rate: int
    created_at: datetime

    class Config:
        from_attributes = True


class PlatformOverviewResponse(BaseModel):
    total_users: int
    total_engineers: int
    total_tickets: int
    open_tickets: int
    resolved_today: int
    ai_resolved_today: int
    ai_resolution_rate: float
    engineers_available: int
    engineers_busy: int
    engineers_away: int
    sla_compliance_rate: float
    active_regions: List[str]


# ── Admin Ticket View ─────────────────────────────────────────────────────────

class AdminTicketResponse(BaseModel):
    id: uuid.UUID
    ticket_number: str
    title: str
    description: str
    domain: TicketDomain
    priority: TicketPriority
    status: TicketStatus
    complexity: Optional[TicketComplexity]
    ai_diagnosis: Optional[str]
    steps_tried: Optional[str]
    resolution_notes: Optional[str]
    sla_deadline: Optional[datetime]
    sla_breached: bool

    # User info
    user_name: str
    user_email: str
    user_city: Optional[str]
    user_country: Optional[str]
    user_timezone: Optional[str]

    # Engineer info
    engineer_name: Optional[str]
    engineer_id: Optional[str]
    engineer_email: Optional[str]
    engineer_region: Optional[str]
    engineer_timezone: Optional[str]
    engineer_seniority: Optional[str]

    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime]

    class Config:
        from_attributes = True


class SLAConfigRequest(BaseModel):
    critical_minutes: int = 30
    high_minutes: int = 120
    medium_minutes: int = 480
    low_minutes: int = 1440
    ai_retry_limit: int = 2
    max_ticket_capacity_default: int = 10