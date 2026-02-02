"""
Onboarding Models

Models for managing employee onboarding processes.
"""

import enum
from datetime import date, datetime
from typing import Optional, List

from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Date, DateTime,
    ForeignKey, Numeric, Enum as SQLEnum, JSON, Table
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.base import (
    TimestampMixin, AuditMixin, SoftDeleteMixin,
    CompanyScopedMixin, ActiveMixin
)


class OnboardingStatus(str, enum.Enum):
    """Onboarding process status."""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    ON_HOLD = "on_hold"


class OnboardingTaskStatus(str, enum.Enum):
    """Task completion status."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    BLOCKED = "blocked"


class OnboardingTaskPriority(str, enum.Enum):
    """Task priority levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class DocumentStatus(str, enum.Enum):
    """Document submission status."""
    PENDING = "pending"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"


# Association table for template stages
template_stages = Table(
    "onboarding_template_stages",
    Base.metadata,
    Column("template_id", Integer, ForeignKey("onboarding_template.id"), primary_key=True),
    Column("stage_id", Integer, ForeignKey("onboarding_stage.id"), primary_key=True),
)

# Association table for stage tasks
stage_tasks = Table(
    "onboarding_stage_tasks",
    Base.metadata,
    Column("stage_id", Integer, ForeignKey("onboarding_stage.id"), primary_key=True),
    Column("task_template_id", Integer, ForeignKey("onboarding_task_template.id"), primary_key=True),
)

# Association table for template documents
template_documents = Table(
    "onboarding_template_documents",
    Base.metadata,
    Column("template_id", Integer, ForeignKey("onboarding_template.id"), primary_key=True),
    Column("document_type_id", Integer, ForeignKey("onboarding_document_type.id"), primary_key=True),
)


class OnboardingTemplate(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """Onboarding template defining the process structure."""
    __tablename__ = "onboarding_template"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)

    # Target criteria
    department_id = Column(Integer, ForeignKey("hrms_departments.id"), nullable=True)
    job_position_id = Column(Integer, ForeignKey("hrms_job_positions.id"), nullable=True)
    employment_type = Column(String(50), nullable=True)  # full_time, part_time, contract

    # Duration settings
    duration_days = Column(Integer, default=30)

    # Flags
    is_default = Column(Boolean, default=False)
    send_welcome_email = Column(Boolean, default=True)
    create_portal_account = Column(Boolean, default=True)
    auto_create_employee = Column(Boolean, default=True)

    # Welcome message
    welcome_message = Column(Text, nullable=True)

    # Relationships
    stages = relationship(
        "OnboardingStage",
        secondary=template_stages,
        back_populates="templates",
        order_by="OnboardingStage.sequence"
    )
    document_types = relationship(
        "DocumentType",
        secondary=template_documents,
        back_populates="templates"
    )
    employees = relationship("OnboardingEmployee", back_populates="template")

    department = relationship("Department", foreign_keys=[department_id])
    job_position = relationship("JobPosition", foreign_keys=[job_position_id])


class OnboardingStage(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """Stage in the onboarding process."""
    __tablename__ = "onboarding_stage"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    sequence = Column(Integer, default=0)

    # Stage settings
    duration_days = Column(Integer, nullable=True)
    is_mandatory = Column(Boolean, default=True)

    # Color for kanban view
    color = Column(String(20), default="#3498db")

    # Relationships
    templates = relationship(
        "OnboardingTemplate",
        secondary=template_stages,
        back_populates="stages"
    )
    task_templates = relationship(
        "OnboardingTaskTemplate",
        secondary=stage_tasks,
        back_populates="stages"
    )
    employee_stages = relationship("OnboardingEmployee", back_populates="current_stage")


class OnboardingTaskTemplate(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """Template for onboarding tasks."""
    __tablename__ = "onboarding_task_template"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)

    # Task settings
    priority = Column(SQLEnum(OnboardingTaskPriority), default=OnboardingTaskPriority.MEDIUM)
    duration_days = Column(Integer, nullable=True)

    # Assignment
    assign_to_manager = Column(Boolean, default=False)
    assign_to_hr = Column(Boolean, default=False)
    assign_to_employee = Column(Boolean, default=False)
    assigned_role = Column(String(100), nullable=True)  # Specific role
    assigned_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Requirements
    is_mandatory = Column(Boolean, default=True)
    requires_approval = Column(Boolean, default=False)
    requires_document = Column(Boolean, default=False)
    document_type_id = Column(Integer, ForeignKey("onboarding_document_type.id"), nullable=True)

    # Instructions
    instructions = Column(Text, nullable=True)
    checklist_items = Column(JSON, nullable=True)  # List of checklist items

    # Relationships
    stages = relationship(
        "OnboardingStage",
        secondary=stage_tasks,
        back_populates="task_templates"
    )
    document_type = relationship("DocumentType", foreign_keys=[document_type_id])
    assigned_user = relationship("User", foreign_keys=[assigned_user_id])
    tasks = relationship("OnboardingTask", back_populates="template")


class DocumentType(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """Type of document required during onboarding."""
    __tablename__ = "onboarding_document_type"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)

    # Requirements
    is_mandatory = Column(Boolean, default=True)
    requires_expiry = Column(Boolean, default=False)

    # Validation
    allowed_formats = Column(JSON, nullable=True)  # ["pdf", "jpg", "png"]
    max_file_size_mb = Column(Integer, default=10)

    # Relationships
    templates = relationship(
        "OnboardingTemplate",
        secondary=template_documents,
        back_populates="document_types"
    )
    documents = relationship("OnboardingDocument", back_populates="document_type")


class OnboardingEmployee(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """Employee going through onboarding."""
    __tablename__ = "onboarding_employee"

    id = Column(Integer, primary_key=True, index=True)

    # Source - either from recruitment or direct creation
    candidate_id = Column(Integer, ForeignKey("recruitment_candidate.id"), nullable=True)
    employee_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=True)

    # Personal info (for new hires without employee record yet)
    name = Column(String(200), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)

    # Job details
    department_id = Column(Integer, ForeignKey("hrms_departments.id"), nullable=True)
    job_position_id = Column(Integer, ForeignKey("hrms_job_positions.id"), nullable=True)
    manager_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=True)

    # Onboarding details
    template_id = Column(Integer, ForeignKey("onboarding_template.id"), nullable=True)
    current_stage_id = Column(Integer, ForeignKey("onboarding_stage.id"), nullable=True)

    # Dates
    start_date = Column(Date, nullable=True)
    target_completion_date = Column(Date, nullable=True)
    actual_completion_date = Column(Date, nullable=True)

    # Status and progress
    status = Column(SQLEnum(OnboardingStatus), default=OnboardingStatus.NOT_STARTED)
    progress_percentage = Column(Integer, default=0)

    # Portal access
    portal_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    portal_activated = Column(Boolean, default=False)
    welcome_email_sent = Column(Boolean, default=False)

    # Notes
    notes = Column(Text, nullable=True)

    # Relationships
    candidate = relationship("Candidate", foreign_keys=[candidate_id])
    employee = relationship("Employee", foreign_keys=[employee_id])
    department = relationship("Department", foreign_keys=[department_id])
    job_position = relationship("JobPosition", foreign_keys=[job_position_id])
    manager = relationship("Employee", foreign_keys=[manager_id])
    template = relationship("OnboardingTemplate", back_populates="employees")
    current_stage = relationship("OnboardingStage", back_populates="employee_stages")
    portal_user = relationship("User", foreign_keys=[portal_user_id])

    tasks = relationship("OnboardingTask", back_populates="onboarding_employee", cascade="all, delete-orphan")
    documents = relationship("OnboardingDocument", back_populates="onboarding_employee", cascade="all, delete-orphan")
    checklists = relationship("OnboardingChecklist", back_populates="onboarding_employee", cascade="all, delete-orphan")


class OnboardingTask(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin):
    """Specific task for an employee's onboarding."""
    __tablename__ = "onboarding_task"

    id = Column(Integer, primary_key=True, index=True)

    # References
    onboarding_employee_id = Column(Integer, ForeignKey("onboarding_employee.id"), nullable=False)
    template_id = Column(Integer, ForeignKey("onboarding_task_template.id"), nullable=True)
    stage_id = Column(Integer, ForeignKey("onboarding_stage.id"), nullable=True)

    # Task details
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    instructions = Column(Text, nullable=True)

    # Assignment
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Timing
    due_date = Column(Date, nullable=True)
    completed_date = Column(DateTime, nullable=True)

    # Status
    status = Column(SQLEnum(OnboardingTaskStatus), default=OnboardingTaskStatus.PENDING)
    priority = Column(SQLEnum(OnboardingTaskPriority), default=OnboardingTaskPriority.MEDIUM)
    is_mandatory = Column(Boolean, default=True)

    # Approval
    requires_approval = Column(Boolean, default=False)
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_date = Column(DateTime, nullable=True)

    # Document requirement
    requires_document = Column(Boolean, default=False)
    document_id = Column(Integer, ForeignKey("onboarding_document.id"), nullable=True)

    # Notes
    notes = Column(Text, nullable=True)
    completion_notes = Column(Text, nullable=True)

    # Relationships
    onboarding_employee = relationship("OnboardingEmployee", back_populates="tasks")
    template = relationship("OnboardingTaskTemplate", back_populates="tasks")
    stage = relationship("OnboardingStage")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])
    document = relationship("OnboardingDocument", foreign_keys=[document_id])


class OnboardingDocument(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin):
    """Document submitted during onboarding."""
    __tablename__ = "onboarding_document"

    id = Column(Integer, primary_key=True, index=True)

    # References
    onboarding_employee_id = Column(Integer, ForeignKey("onboarding_employee.id"), nullable=False)
    document_type_id = Column(Integer, ForeignKey("onboarding_document_type.id"), nullable=False)

    # File info
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=True)  # bytes
    mime_type = Column(String(100), nullable=True)

    # Status
    status = Column(SQLEnum(DocumentStatus), default=DocumentStatus.PENDING)

    # Expiry
    expiry_date = Column(Date, nullable=True)

    # Review
    reviewed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_date = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)

    # Notes
    notes = Column(Text, nullable=True)

    # Relationships
    onboarding_employee = relationship("OnboardingEmployee", back_populates="documents")
    document_type = relationship("DocumentType", back_populates="documents")
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_id])


class OnboardingChecklist(Base, TimestampMixin, CompanyScopedMixin):
    """Checklist item for onboarding tasks."""
    __tablename__ = "onboarding_checklist"

    id = Column(Integer, primary_key=True, index=True)

    # References
    onboarding_employee_id = Column(Integer, ForeignKey("onboarding_employee.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("onboarding_task.id"), nullable=True)

    # Item details
    item = Column(String(500), nullable=False)
    sequence = Column(Integer, default=0)

    # Status
    is_completed = Column(Boolean, default=False)
    completed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    completed_date = Column(DateTime, nullable=True)

    # Relationships
    onboarding_employee = relationship("OnboardingEmployee", back_populates="checklists")
    task = relationship("OnboardingTask")
    completed_by = relationship("User", foreign_keys=[completed_by_id])


class OnboardingTemplateStageType(str, enum.Enum):
    """Template stage types."""
    ORIENTATION = "orientation"
    DOCUMENTATION = "documentation"
    TRAINING = "training"
    IT_SETUP = "it_setup"
    TEAM_INTRODUCTION = "team_introduction"
    PROBATION = "probation"
    EVALUATION = "evaluation"
    COMPLETION = "completion"
    CUSTOM = "custom"


class OnboardingTemplateTaskType(str, enum.Enum):
    """Template task types."""
    DOCUMENT = "document"
    FORM = "form"
    TRAINING = "training"
    MEETING = "meeting"
    VERIFICATION = "verification"
    APPROVAL = "approval"
    CUSTOM = "custom"


class OnboardingTemplateChecklistCategory(str, enum.Enum):
    """Template checklist item categories."""
    PRE_ARRIVAL = "pre_arrival"
    DAY_ONE = "day_one"
    FIRST_WEEK = "first_week"
    FIRST_MONTH = "first_month"
    DOCUMENTS = "documents"
    TRAINING = "training"
    IT_SETUP = "it_setup"
    HR_TASKS = "hr_tasks"
    TEAM_INTRO = "team_intro"
    COMPLIANCE = "compliance"
    OTHER = "other"


# Association table for template stage approvers
template_stage_approvers = Table(
    "onboarding_template_stage_approvers",
    Base.metadata,
    Column("template_stage_id", Integer, ForeignKey("onboarding_template_stage.id"), primary_key=True),
    Column("employee_id", Integer, ForeignKey("employee_employees.id"), primary_key=True),
)

# Association table for template task default assignees
template_task_default_assignees = Table(
    "onboarding_template_task_default_assignees",
    Base.metadata,
    Column("template_task_id", Integer, ForeignKey("onboarding_template_task.id"), primary_key=True),
    Column("employee_id", Integer, ForeignKey("employee_employees.id"), primary_key=True),
)


class OnboardingTemplateStage(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """
    Stages within an onboarding template.
    """
    __tablename__ = "onboarding_template_stage"

    id = Column(Integer, primary_key=True, index=True)

    # Template reference
    template_id = Column(Integer, ForeignKey("onboarding_template.id"), nullable=False)

    # Stage details
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    stage_type = Column(String(20), default="custom", nullable=False)
    sequence = Column(Integer, default=0, nullable=False)
    duration_days = Column(Integer, default=7)
    is_mandatory = Column(Boolean, default=True)
    is_final_stage = Column(Boolean, default=False)

    # Link to centralized stage definition
    stage_definition_id = Column(Integer, ForeignKey("hrms_stage_definitions.id"), nullable=True)

    # Stage requirements
    require_approval = Column(Boolean, default=False)

    # Notifications
    notify_on_start = Column(Boolean, default=True)
    notify_on_complete = Column(Boolean, default=True)
    notify_before_due_days = Column(Integer, default=2)

    # Relationships
    template = relationship("OnboardingTemplate", foreign_keys=[template_id])
    stage_definition = relationship("StageDefinition", foreign_keys=[stage_definition_id])

    # Many-to-many relationship with approvers
    approvers = relationship(
        "Employee",
        secondary=template_stage_approvers,
        backref="template_stage_approvals"
    )

    # One-to-many relationship with tasks
    template_tasks = relationship(
        "OnboardingTemplateTask",
        back_populates="stage",
        cascade="all, delete-orphan"
    )


class OnboardingTemplateTask(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """
    Tasks within a template stage.
    """
    __tablename__ = "onboarding_template_task"

    id = Column(Integer, primary_key=True, index=True)

    # Stage reference
    stage_id = Column(Integer, ForeignKey("onboarding_template_stage.id"), nullable=False)

    # Task details
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    task_type = Column(String(20), default="custom", nullable=False)
    priority = Column(String(10), default="medium", nullable=False)
    sequence = Column(Integer, default=0, nullable=False)
    is_mandatory = Column(Boolean, default=True)
    estimated_hours = Column(Numeric(5, 2), default=1.0)

    # Assignment flags
    assign_to_candidate = Column(Boolean, default=False)
    assign_to_manager = Column(Boolean, default=False)

    # Document requirement
    document_type_id = Column(Integer, ForeignKey("onboarding_document_type.id"), nullable=True)

    # Instructions
    instructions = Column(Text, nullable=True)
    resource_links = Column(JSON, default=list, nullable=True)

    # Relationships
    stage = relationship("OnboardingTemplateStage", back_populates="template_tasks")
    document_type = relationship("DocumentType", foreign_keys=[document_type_id])

    # Many-to-many relationship with default assignees
    default_assignees = relationship(
        "Employee",
        secondary=template_task_default_assignees,
        backref="default_template_tasks"
    )


class OnboardingTemplateChecklist(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """
    Checklist items in a template that get copied when onboarding starts.
    """
    __tablename__ = "onboarding_template_checklist"

    id = Column(Integer, primary_key=True, index=True)

    # Template reference
    template_id = Column(Integer, ForeignKey("onboarding_template.id"), nullable=False)

    # Checklist item details
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(20), default="other", nullable=False)
    sequence = Column(Integer, default=0, nullable=False)
    is_mandatory = Column(Boolean, default=True)
    due_days_from_start = Column(Integer, default=0)

    # Default assignee
    default_assignee_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=True)

    # Relationships
    template = relationship("OnboardingTemplate", foreign_keys=[template_id])
    default_assignee = relationship("Employee", foreign_keys=[default_assignee_id])
