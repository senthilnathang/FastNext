"""
Onboarding Process Models

Models for managing active onboarding processes for candidates.
"""

import enum
from datetime import date, datetime
from typing import Optional

from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Date, DateTime,
    ForeignKey, JSON
)
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.base import (
    TimestampMixin, AuditMixin, SoftDeleteMixin,
    CompanyScopedMixin, ActiveMixin
)


class OnboardingProcessStatus(str, enum.Enum):
    """Onboarding process status."""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    CONVERTED = "converted"


class OnboardingProcessStageStatus(str, enum.Enum):
    """Stage status in a process."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    AWAITING_APPROVAL = "awaiting_approval"
    COMPLETED = "completed"
    SKIPPED = "skipped"


class OnboardingProcessTaskStatus(str, enum.Enum):
    """Task status in a process."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    AWAITING_REVIEW = "awaiting_review"
    COMPLETED = "completed"
    BLOCKED = "blocked"
    CANCELLED = "cancelled"


class OnboardingProcessTaskPriority(str, enum.Enum):
    """Task priority levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class OnboardingProcessTaskType(str, enum.Enum):
    """Task type in a process."""
    DOCUMENT = "document"
    FORM = "form"
    TRAINING = "training"
    MEETING = "meeting"
    VERIFICATION = "verification"
    APPROVAL = "approval"
    CUSTOM = "custom"


class OnboardingProcess(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """
    The actual onboarding process instance for a candidate.
    """
    __tablename__ = "onboarding_process"

    id = Column(Integer, primary_key=True, index=True)

    # Candidate link (one-to-one)
    candidate_id = Column(Integer, ForeignKey("recruitment_candidate.id"), nullable=False, unique=True)

    # Template used
    template_id = Column(Integer, ForeignKey("onboarding_template.id"), nullable=True)

    # Status
    status = Column(String(20), default="not_started", nullable=False)

    # Dates
    start_date = Column(Date, nullable=True)
    expected_end_date = Column(Date, nullable=True)
    actual_end_date = Column(Date, nullable=True)
    joining_date = Column(Date, nullable=True)

    # Current stage (use_alter=True to handle circular FK with OnboardingProcessStage)
    current_stage_id = Column(
        Integer,
        ForeignKey("onboarding_process_stage.id", use_alter=True, name="fk_onboarding_process_current_stage"),
        nullable=True
    )

    # Assignment
    mentor_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=True)
    hr_manager_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=True)
    hiring_manager_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=True)

    # Progress tracking
    overall_progress = Column(Integer, default=0)
    documents_progress = Column(Integer, default=0)
    tasks_progress = Column(Integer, default=0)

    # Conversion tracking
    converted_employee_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=True, unique=True)
    converted_at = Column(DateTime, nullable=True)
    converted_by_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=True)

    # Notes
    notes = Column(Text, nullable=True)

    # Relationships
    candidate = relationship("Candidate", foreign_keys=[candidate_id])
    template = relationship("OnboardingTemplate", foreign_keys=[template_id])
    current_stage = relationship(
        "OnboardingProcessStage",
        foreign_keys=[current_stage_id],
        post_update=True
    )
    mentor = relationship("Employee", foreign_keys=[mentor_id])
    hr_manager = relationship("Employee", foreign_keys=[hr_manager_id])
    hiring_manager = relationship("Employee", foreign_keys=[hiring_manager_id])
    converted_employee = relationship("Employee", foreign_keys=[converted_employee_id])
    converted_by = relationship("Employee", foreign_keys=[converted_by_id])

    # One-to-many relationships
    process_stages = relationship(
        "OnboardingProcessStage",
        back_populates="process",
        foreign_keys="OnboardingProcessStage.process_id",
        cascade="all, delete-orphan"
    )


class OnboardingProcessStage(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin):
    """
    Stage instance in an onboarding process.
    """
    __tablename__ = "onboarding_process_stage"

    id = Column(Integer, primary_key=True, index=True)

    # Process reference
    process_id = Column(Integer, ForeignKey("onboarding_process.id"), nullable=False)

    # Template stage reference
    template_stage_id = Column(Integer, ForeignKey("onboarding_template_stage.id"), nullable=True)

    # Stage definition reference
    stage_definition_id = Column(Integer, ForeignKey("hrms_stage_definitions.id"), nullable=True)

    # Stage details (copied from template)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    stage_type = Column(String(20), default="custom", nullable=False)
    sequence = Column(Integer, default=0, nullable=False)

    # Status
    status = Column(String(20), default="pending", nullable=False)

    # Dates
    start_date = Column(Date, nullable=True)
    due_date = Column(Date, nullable=True)
    completed_date = Column(Date, nullable=True)

    # Approval
    approved_by_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)

    # Progress
    progress = Column(Integer, default=0)

    # Notes
    notes = Column(Text, nullable=True)

    # Relationships
    process = relationship(
        "OnboardingProcess",
        back_populates="process_stages",
        foreign_keys=[process_id]
    )
    template_stage = relationship("OnboardingTemplateStage", foreign_keys=[template_stage_id])
    stage_definition = relationship("StageDefinition", foreign_keys=[stage_definition_id])
    approved_by = relationship("Employee", foreign_keys=[approved_by_id])

    # One-to-many relationships
    process_tasks = relationship(
        "OnboardingProcessTask",
        back_populates="stage",
        cascade="all, delete-orphan"
    )


class OnboardingProcessTask(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin):
    """
    Task instance in an onboarding process stage.
    """
    __tablename__ = "onboarding_process_task"

    id = Column(Integer, primary_key=True, index=True)

    # Stage reference
    stage_id = Column(Integer, ForeignKey("onboarding_process_stage.id"), nullable=False)

    # Template task reference
    template_task_id = Column(Integer, ForeignKey("onboarding_template_task.id"), nullable=True)

    # Task details (copied from template)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    task_type = Column(String(20), default="custom", nullable=False)
    priority = Column(String(10), default="medium", nullable=False)
    sequence = Column(Integer, default=0, nullable=False)

    # Status
    status = Column(String(20), default="pending", nullable=False)
    is_mandatory = Column(Boolean, default=True)

    # Assignment
    assigned_to_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=True)
    assigned_to_candidate = Column(Boolean, default=False)

    # Dates
    due_date = Column(Date, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    # Document link
    document_id = Column(Integer, ForeignKey("onboarding_document.id"), nullable=True)

    # Completion
    completed_by_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=True)
    completion_notes = Column(Text, nullable=True)

    # Relationships
    stage = relationship("OnboardingProcessStage", back_populates="process_tasks")
    template_task = relationship("OnboardingTemplateTask", foreign_keys=[template_task_id])
    assigned_to = relationship("Employee", foreign_keys=[assigned_to_id])
    document = relationship("OnboardingDocument", foreign_keys=[document_id])
    completed_by = relationship("Employee", foreign_keys=[completed_by_id])


class OnboardingPortal(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """
    OnboardingPortal model for candidate portal access.
    """
    __tablename__ = "onboarding_portal"

    id = Column(Integer, primary_key=True, index=True)

    # Candidate reference
    candidate_id = Column(Integer, ForeignKey("recruitment_candidate.id"), nullable=False)

    # Token for portal access
    token = Column(String(200), nullable=False)

    # Usage tracking
    used = Column(Boolean, default=False)
    count = Column(Integer, default=0)

    # Profile image
    profile = Column(String(500), nullable=True)

    # Relationships
    candidate = relationship("Candidate", foreign_keys=[candidate_id])
