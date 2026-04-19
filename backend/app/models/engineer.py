# File: backend/app/models/engineer.py

from sqlalchemy import Column, String, Boolean, DateTime, Enum, Integer, ARRAY, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.core.database import Base


class AvailabilityStatus(str, enum.Enum):
    AVAILABLE = "available"
    BUSY = "busy"
    AWAY = "away"


class SeniorityLevel(str, enum.Enum):
    JUNIOR = "junior"
    MID = "mid"
    SENIOR = "senior"
    LEAD = "lead"


class Engineer(Base):
    __tablename__ = "engineers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)

    # Engineer specific
    engineer_id = Column(String, unique=True, nullable=False)  # ENG-XXXX
    domain_expertise = Column(ARRAY(String), nullable=False, default=[])
    region = Column(String, nullable=False)
    timezone = Column(String, nullable=False, default="UTC")
    seniority_level = Column(Enum(SeniorityLevel), default=SeniorityLevel.MID)
    max_ticket_capacity = Column(Integer, default=10)

    # Availability
    availability_status = Column(Enum(AvailabilityStatus), default=AvailabilityStatus.AVAILABLE)
    active_ticket_count = Column(Integer, default=0)

    # Activation
    is_activated = Column(Boolean, default=False)
    activation_token = Column(String, nullable=True)
    activation_token_expires = Column(DateTime, nullable=True)
    temp_password_hash = Column(String, nullable=True)

    # Performance
    total_resolved = Column(Integer, default=0)
    avg_resolution_time = Column(Integer, default=0)  # in minutes
    sla_compliance_rate = Column(Integer, default=100)  # percentage

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])

    def __repr__(self):
        return f"<Engineer {self.engineer_id}>"