"""
Offboarding Models

Models for managing employee offboarding processes.
"""

import enum
from datetime import date, datetime
from typing import Optional, List

from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Date, DateTime,
    ForeignKey, Numeric, Enum as SQLEnum, JSON, Table
)
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.base import (
    TimestampMixin, AuditMixin, SoftDeleteMixin,
    CompanyScopedMixin, ActiveMixin
)


class OffboardingStatus(str, enum.Enum):
    """Offboarding process status."""
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    ON_HOLD = "on_hold"


class ExitType(str, enum.Enum):
    """Type of employee exit."""
    RESIGNATION = "resignation"
    TERMINATION = "termination"
    RETIREMENT = "retirement"
    CONTRACT_END = "contract_end"
    LAYOFF = "layoff"
    MUTUAL_SEPARATION = "mutual_separation"
    DEATH = "death"
    ABSCONDING = "absconding"


class OffboardingTaskStatus(str, enum.Enum):
    """Task completion status."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    BLOCKED = "blocked"
    NOT_APPLICABLE = "not_applicable"


class OffboardingTaskPriority(str, enum.Enum):
    """Task priority levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class FnFStatus(str, enum.Enum):
    """Full and Final settlement status."""
    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    PROCESSING = "processing"
    PAID = "paid"
    ON_HOLD = "on_hold"


# Association table for template stages
template_stages = Table(
    "offboarding_template_stages",
    Base.metadata,
    Column("template_id", Integer, ForeignKey("offboarding_template.id"), primary_key=True),
    Column("stage_id", Integer, ForeignKey("offboarding_stage.id"), primary_key=True),
)

# Association table for stage tasks
stage_tasks = Table(
    "offboarding_stage_tasks",
    Base.metadata,
    Column("stage_id", Integer, ForeignKey("offboarding_stage.id"), primary_key=True),
    Column("task_template_id", Integer, ForeignKey("offboarding_task_template.id"), primary_key=True),
)


class ExitReason(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """Predefined exit reasons for categorization."""
    __tablename__ = "offboarding_exit_reason"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    exit_type = Column(SQLEnum(ExitType), nullable=False)
    is_rehirable = Column(Boolean, default=True)

    # Relationships
    employees = relationship("OffboardingEmployee", back_populates="exit_reason")


class OffboardingTemplate(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """Offboarding template defining the process structure."""
    __tablename__ = "offboarding_template"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)

    # Target criteria
    exit_type = Column(SQLEnum(ExitType), nullable=True)
    department_id = Column(Integer, ForeignKey("hrms_departments.id"), nullable=True)

    # Settings
    default_notice_period_days = Column(Integer, default=30)
    is_default = Column(Boolean, default=False)
    require_exit_interview = Column(Boolean, default=True)
    require_knowledge_transfer = Column(Boolean, default=True)

    # Relationships
    stages = relationship(
        "OffboardingStage",
        secondary=template_stages,
        back_populates="templates",
        order_by="OffboardingStage.sequence"
    )
    employees = relationship("OffboardingEmployee", back_populates="template")

    department = relationship("Department", foreign_keys=[department_id])


class OffboardingStage(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """Stage in the offboarding process."""
    __tablename__ = "offboarding_stage"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    sequence = Column(Integer, default=0)

    # Stage settings
    is_mandatory = Column(Boolean, default=True)
    requires_approval = Column(Boolean, default=False)
    approver_role = Column(String(100), nullable=True)

    # Color for kanban view
    color = Column(String(20), default="#e74c3c")

    # Relationships
    templates = relationship(
        "OffboardingTemplate",
        secondary=template_stages,
        back_populates="stages"
    )
    task_templates = relationship(
        "OffboardingTaskTemplate",
        secondary=stage_tasks,
        back_populates="stages"
    )
    employee_stages = relationship("OffboardingEmployee", back_populates="current_stage")


class OffboardingTaskTemplate(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """Template for offboarding tasks."""
    __tablename__ = "offboarding_task_template"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=True)  # IT, HR, Finance, Manager, etc.

    # Task settings
    priority = Column(SQLEnum(OffboardingTaskPriority), default=OffboardingTaskPriority.MEDIUM)
    days_before_exit = Column(Integer, nullable=True)  # When to start task relative to exit date

    # Assignment
    assign_to_manager = Column(Boolean, default=False)
    assign_to_hr = Column(Boolean, default=False)
    assign_to_employee = Column(Boolean, default=False)
    assigned_role = Column(String(100), nullable=True)
    assigned_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Requirements
    is_mandatory = Column(Boolean, default=True)
    requires_approval = Column(Boolean, default=False)
    blocking = Column(Boolean, default=False)  # Blocks proceeding if not complete

    # Instructions
    instructions = Column(Text, nullable=True)
    checklist_items = Column(JSON, nullable=True)

    # Relationships
    stages = relationship(
        "OffboardingStage",
        secondary=stage_tasks,
        back_populates="task_templates"
    )
    assigned_user = relationship("User", foreign_keys=[assigned_user_id])
    tasks = relationship("OffboardingTask", back_populates="template")


class OffboardingEmployee(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """Employee going through offboarding."""
    __tablename__ = "offboarding_employee"

    id = Column(Integer, primary_key=True, index=True)

    # Employee reference
    employee_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=False)

    # Exit details
    exit_type = Column(SQLEnum(ExitType), nullable=False)
    exit_reason_id = Column(Integer, ForeignKey("offboarding_exit_reason.id"), nullable=True)
    exit_reason_detail = Column(Text, nullable=True)

    # Dates
    resignation_date = Column(Date, nullable=True)
    notice_start_date = Column(Date, nullable=True)
    last_working_day = Column(Date, nullable=False)
    actual_exit_date = Column(Date, nullable=True)

    # Notice period
    notice_period_days = Column(Integer, default=30)
    notice_served_days = Column(Integer, default=0)
    notice_buyout = Column(Boolean, default=False)
    notice_buyout_amount = Column(Numeric(14, 2), nullable=True)

    # Process details
    template_id = Column(Integer, ForeignKey("offboarding_template.id"), nullable=True)
    current_stage_id = Column(Integer, ForeignKey("offboarding_stage.id"), nullable=True)

    # Status and progress
    status = Column(SQLEnum(OffboardingStatus), default=OffboardingStatus.PENDING_APPROVAL)
    progress_percentage = Column(Integer, default=0)

    # Approvals
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_date = Column(DateTime, nullable=True)

    # Eligibility
    is_rehirable = Column(Boolean, default=True)
    rehire_eligibility_notes = Column(Text, nullable=True)

    # Notes
    notes = Column(Text, nullable=True)
    hr_notes = Column(Text, nullable=True)

    # Relationships
    employee = relationship("Employee", foreign_keys=[employee_id])
    exit_reason = relationship("ExitReason", back_populates="employees")
    template = relationship("OffboardingTemplate", back_populates="employees")
    current_stage = relationship("OffboardingStage", back_populates="employee_stages")
    approved_by = relationship("User", foreign_keys=[approved_by_id])

    tasks = relationship("OffboardingTask", back_populates="offboarding_employee", cascade="all, delete-orphan")
    asset_returns = relationship("AssetReturn", back_populates="offboarding_employee", cascade="all, delete-orphan")
    exit_interview = relationship("ExitInterview", back_populates="offboarding_employee", uselist=False)
    fnf_settlement = relationship("FnFSettlement", back_populates="offboarding_employee", uselist=False)


class OffboardingTask(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin):
    """Specific task for an employee's offboarding."""
    __tablename__ = "offboarding_task"

    id = Column(Integer, primary_key=True, index=True)

    # References
    offboarding_employee_id = Column(Integer, ForeignKey("offboarding_employee.id"), nullable=False)
    template_id = Column(Integer, ForeignKey("offboarding_task_template.id"), nullable=True)
    stage_id = Column(Integer, ForeignKey("offboarding_stage.id"), nullable=True)

    # Task details
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=True)
    instructions = Column(Text, nullable=True)

    # Assignment
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Timing
    due_date = Column(Date, nullable=True)
    completed_date = Column(DateTime, nullable=True)

    # Status
    status = Column(SQLEnum(OffboardingTaskStatus), default=OffboardingTaskStatus.PENDING)
    priority = Column(SQLEnum(OffboardingTaskPriority), default=OffboardingTaskPriority.MEDIUM)
    is_mandatory = Column(Boolean, default=True)
    is_blocking = Column(Boolean, default=False)

    # Approval
    requires_approval = Column(Boolean, default=False)
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_date = Column(DateTime, nullable=True)

    # Notes
    notes = Column(Text, nullable=True)
    completion_notes = Column(Text, nullable=True)

    # Relationships
    offboarding_employee = relationship("OffboardingEmployee", back_populates="tasks")
    template = relationship("OffboardingTaskTemplate", back_populates="tasks")
    stage = relationship("OffboardingStage")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])


class AssetReturn(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin):
    """Asset return tracking for offboarding."""
    __tablename__ = "offboarding_asset_return"

    id = Column(Integer, primary_key=True, index=True)

    # References
    offboarding_employee_id = Column(Integer, ForeignKey("offboarding_employee.id"), nullable=False)
    asset_id = Column(Integer, nullable=True)  # Optional FK to asset module if installed

    # Asset details (for manual entries or when asset module not installed)
    asset_name = Column(String(200), nullable=False)
    asset_type = Column(String(100), nullable=True)
    asset_serial = Column(String(100), nullable=True)

    # Return status
    is_returned = Column(Boolean, default=False)
    return_date = Column(Date, nullable=True)
    received_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Condition
    condition = Column(String(50), nullable=True)  # good, damaged, missing
    condition_notes = Column(Text, nullable=True)

    # Deduction
    deduction_amount = Column(Numeric(14, 2), default=0)
    deduction_reason = Column(Text, nullable=True)

    # Relationships
    offboarding_employee = relationship("OffboardingEmployee", back_populates="asset_returns")
    received_by = relationship("User", foreign_keys=[received_by_id])


class ExitInterview(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin):
    """Exit interview for departing employees."""
    __tablename__ = "offboarding_exit_interview"

    id = Column(Integer, primary_key=True, index=True)

    # Reference
    offboarding_employee_id = Column(Integer, ForeignKey("offboarding_employee.id"), nullable=False)

    # Interview details
    scheduled_date = Column(DateTime, nullable=True)
    conducted_date = Column(DateTime, nullable=True)
    conducted_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Status
    is_completed = Column(Boolean, default=False)
    declined = Column(Boolean, default=False)
    decline_reason = Column(Text, nullable=True)

    # Feedback categories
    overall_satisfaction = Column(Integer, nullable=True)  # 1-5 scale
    management_rating = Column(Integer, nullable=True)
    work_environment_rating = Column(Integer, nullable=True)
    compensation_rating = Column(Integer, nullable=True)
    growth_opportunities_rating = Column(Integer, nullable=True)
    work_life_balance_rating = Column(Integer, nullable=True)

    # Open feedback
    reason_for_leaving = Column(Text, nullable=True)
    what_could_be_improved = Column(Text, nullable=True)
    what_was_good = Column(Text, nullable=True)
    would_recommend_company = Column(Boolean, nullable=True)
    additional_comments = Column(Text, nullable=True)

    # Internal notes
    hr_notes = Column(Text, nullable=True)
    follow_up_actions = Column(Text, nullable=True)

    # Relationships
    offboarding_employee = relationship("OffboardingEmployee", back_populates="exit_interview")
    conducted_by = relationship("User", foreign_keys=[conducted_by_id])


class FnFSettlement(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin):
    """Full and Final (FnF) settlement for departing employees."""
    __tablename__ = "offboarding_fnf_settlement"

    id = Column(Integer, primary_key=True, index=True)

    # Reference
    offboarding_employee_id = Column(Integer, ForeignKey("offboarding_employee.id"), nullable=False)

    # Settlement details
    settlement_date = Column(Date, nullable=True)
    currency = Column(String(3), default="USD")

    # Earnings
    pending_salary = Column(Numeric(14, 2), default=0)
    leave_encashment = Column(Numeric(14, 2), default=0)
    bonus_pending = Column(Numeric(14, 2), default=0)
    gratuity = Column(Numeric(14, 2), default=0)
    notice_pay = Column(Numeric(14, 2), default=0)
    reimbursements = Column(Numeric(14, 2), default=0)
    other_earnings = Column(Numeric(14, 2), default=0)

    # Deductions
    notice_recovery = Column(Numeric(14, 2), default=0)
    loan_recovery = Column(Numeric(14, 2), default=0)
    advance_recovery = Column(Numeric(14, 2), default=0)
    asset_deductions = Column(Numeric(14, 2), default=0)
    tax_deductions = Column(Numeric(14, 2), default=0)
    other_deductions = Column(Numeric(14, 2), default=0)

    # Totals
    total_earnings = Column(Numeric(14, 2), default=0)
    total_deductions = Column(Numeric(14, 2), default=0)
    net_payable = Column(Numeric(14, 2), default=0)

    # Status and approvals
    status = Column(SQLEnum(FnFStatus), default=FnFStatus.DRAFT)
    hr_approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    hr_approved_date = Column(DateTime, nullable=True)
    finance_approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    finance_approved_date = Column(DateTime, nullable=True)

    # Payment
    payment_date = Column(Date, nullable=True)
    payment_reference = Column(String(100), nullable=True)

    # Notes
    notes = Column(Text, nullable=True)
    employee_acknowledgment = Column(Boolean, default=False)
    acknowledgment_date = Column(DateTime, nullable=True)

    # Relationships
    offboarding_employee = relationship("OffboardingEmployee", back_populates="fnf_settlement")
    hr_approved_by = relationship("User", foreign_keys=[hr_approved_by_id])
    finance_approved_by = relationship("User", foreign_keys=[finance_approved_by_id])
    components = relationship("FnFComponent", back_populates="settlement", cascade="all, delete-orphan")


class FnFComponent(Base, TimestampMixin, CompanyScopedMixin):
    """Additional FnF settlement components."""
    __tablename__ = "offboarding_fnf_component"

    id = Column(Integer, primary_key=True, index=True)

    # Reference
    settlement_id = Column(Integer, ForeignKey("offboarding_fnf_settlement.id"), nullable=False)

    # Component details
    name = Column(String(200), nullable=False)
    component_type = Column(String(20), nullable=False)  # earning, deduction
    amount = Column(Numeric(14, 2), default=0)
    description = Column(Text, nullable=True)

    # Relationships
    settlement = relationship("FnFSettlement", back_populates="components")


class ResignationLetter(CompanyScopedMixin, TimestampMixin, AuditMixin, SoftDeleteMixin, ActiveMixin, Base):
    __tablename__ = "offboarding_resignation_letter"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=False)
    title = Column(String(200), nullable=True)
    description = Column(Text, nullable=True)
    planned_to_leave_on = Column(Date, nullable=False)
    status = Column(String(20), nullable=False, default="requested")  # requested, approved, rejected
    offboarding_employee_id = Column(Integer, ForeignKey("offboarding_employee.id"), nullable=True)
    approved_by_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=True)
    approved_date = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)

    employee = relationship("Employee", foreign_keys=[employee_id])
    offboarding_employee = relationship("OffboardingEmployee", foreign_keys=[offboarding_employee_id])
    approved_by = relationship("Employee", foreign_keys=[approved_by_id])


class OffboardingNote(CompanyScopedMixin, TimestampMixin, AuditMixin, SoftDeleteMixin, Base):
    __tablename__ = "offboarding_note"

    id = Column(Integer, primary_key=True, index=True)
    offboarding_employee_id = Column(Integer, ForeignKey("offboarding_employee.id"), nullable=False)
    description = Column(Text, nullable=True)
    note_by_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=True)

    offboarding_employee = relationship("OffboardingEmployee", foreign_keys=[offboarding_employee_id])
    note_by = relationship("Employee", foreign_keys=[note_by_id])


class OffboardingGeneralSetting(CompanyScopedMixin, TimestampMixin, AuditMixin, Base):
    __tablename__ = "offboarding_general_setting"

    id = Column(Integer, primary_key=True, index=True)
    resignation_request_enabled = Column(Boolean, nullable=False, default=False)
