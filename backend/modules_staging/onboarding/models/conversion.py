"""
Onboarding Conversion Models

Models for managing candidate to employee conversion tracking.
"""

import enum
from datetime import date, datetime
from typing import Optional

from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Date, DateTime,
    ForeignKey, Numeric, JSON
)
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.base import (
    TimestampMixin, AuditMixin, SoftDeleteMixin,
    CompanyScopedMixin, ActiveMixin
)


class ConversionStatus(str, enum.Enum):
    """Candidate to employee conversion status."""
    PENDING = "pending"
    READY = "ready"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ConversionLogAction(str, enum.Enum):
    """Conversion log action types."""
    INITIATED = "initiated"
    DOCUMENT_VERIFIED = "document_verified"
    VERIFICATION_PASSED = "verification_passed"
    VERIFICATION_FAILED = "verification_failed"
    OFFER_SENT = "offer_sent"
    OFFER_ACCEPTED = "offer_accepted"
    OFFER_REJECTED = "offer_rejected"
    EMPLOYEE_CREATED = "employee_created"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    NOTE_ADDED = "note_added"


class DocumentVerificationLogAction(str, enum.Enum):
    """Document verification log action types."""
    SUBMITTED = "submitted"
    REVIEWED = "reviewed"
    VERIFIED = "verified"
    REJECTED = "rejected"
    RESUBMIT_REQUESTED = "resubmit_requested"
    RESUBMITTED = "resubmitted"
    EXPIRED = "expired"
    NOTE_ADDED = "note_added"


class CandidateToEmployeeConversion(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """
    Tracks the conversion of a candidate to an employee.
    """
    __tablename__ = "onboarding_candidate_to_employee_conversion"

    id = Column(Integer, primary_key=True, index=True)

    # Candidate link (one-to-one)
    candidate_id = Column(Integer, ForeignKey("recruitment_candidate.id"), nullable=False, unique=True)

    # Created employee link (one-to-one)
    employee_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=True, unique=True)

    # Status
    status = Column(String(20), default="pending", nullable=False)

    # Pre-conversion checklist
    all_documents_verified = Column(Boolean, default=False)
    all_tasks_completed = Column(Boolean, default=False)
    all_verifications_passed = Column(Boolean, default=False)
    offer_accepted = Column(Boolean, default=False)

    # Employee details for conversion
    employee_id_number = Column(String(50), nullable=True)
    department_id = Column(Integer, ForeignKey("hrms_departments.id"), nullable=True)
    job_position_id = Column(Integer, ForeignKey("hrms_job_positions.id"), nullable=True)
    reporting_manager_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=True)
    joining_date = Column(Date, nullable=True)

    # Salary
    salary = Column(Numeric(12, 2), nullable=True)

    # Conversion tracking
    initiated_by_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=True)
    initiated_at = Column(DateTime, nullable=True)
    completed_by_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=True)
    completed_at = Column(DateTime, nullable=True)

    # Notes
    notes = Column(Text, nullable=True)
    failure_reason = Column(Text, nullable=True)

    # Relationships
    candidate = relationship("Candidate", foreign_keys=[candidate_id])
    employee = relationship("Employee", foreign_keys=[employee_id])
    department = relationship("Department", foreign_keys=[department_id])
    job_position = relationship("JobPosition", foreign_keys=[job_position_id])
    reporting_manager = relationship("Employee", foreign_keys=[reporting_manager_id])
    initiated_by = relationship("Employee", foreign_keys=[initiated_by_id])
    completed_by = relationship("Employee", foreign_keys=[completed_by_id])

    # One-to-many relationship with conversion logs
    logs = relationship(
        "ConversionLog",
        back_populates="conversion",
        cascade="all, delete-orphan"
    )


class ConversionLog(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin):
    """
    Audit log for conversion process.
    """
    __tablename__ = "onboarding_conversion_log"

    id = Column(Integer, primary_key=True, index=True)

    # Conversion reference
    conversion_id = Column(Integer, ForeignKey("onboarding_candidate_to_employee_conversion.id"), nullable=False)

    # Action
    action = Column(String(30), nullable=False)

    # Performer
    performed_by_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=True)

    # Details
    notes = Column(Text, nullable=True)
    extra_data = Column(JSON, default=dict, nullable=True)

    # Relationships
    conversion = relationship(
        "CandidateToEmployeeConversion",
        back_populates="logs"
    )
    performed_by = relationship("Employee", foreign_keys=[performed_by_id])


class OnboardingDocumentVerificationLog(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin):
    """
    Audit log for document verification actions.
    """
    __tablename__ = "onboarding_document_verification_log"

    id = Column(Integer, primary_key=True, index=True)

    # Document reference
    document_id = Column(Integer, ForeignKey("onboarding_document.id"), nullable=False)

    # Action
    action = Column(String(20), nullable=False)

    # Performer
    performed_by_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=True)

    # Details
    notes = Column(Text, nullable=True)
    previous_status = Column(String(20), nullable=True)
    new_status = Column(String(20), nullable=True)

    # Relationships
    document = relationship("OnboardingDocument", foreign_keys=[document_id])
    performed_by = relationship("Employee", foreign_keys=[performed_by_id])
