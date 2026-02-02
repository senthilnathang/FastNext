"""
HRMS Approval Workflow Models

Multi-level approval workflows with delegation support.
"""

from datetime import date, datetime
from typing import Optional, List
import enum

from sqlalchemy import Column, Integer, String, Boolean, Text, Date, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.base import TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin


class ApproverType(str, enum.Enum):
    """Types of approvers"""
    MANAGER = "manager"           # Direct manager
    DEPARTMENT_HEAD = "department_head"
    HR = "hr"
    SPECIFIC_USER = "specific_user"
    ROLE = "role"                 # Any user with a specific role
    GROUP = "group"               # Any user in a specific group


class ApprovalStatus(str, enum.Enum):
    """Approval request status"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"   # Some levels approved
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class ApprovalActionType(str, enum.Enum):
    """Types of approval actions"""
    APPROVE = "approve"
    REJECT = "reject"
    DELEGATE = "delegate"
    COMMENT = "comment"
    REQUEST_INFO = "request_info"


class ApprovalWorkflow(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """
    Approval Workflow model.

    Defines approval workflows for different types of requests.
    """
    __tablename__ = "hrms_approval_workflows"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    # Basic Information
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)

    # Workflow Configuration
    model_name = Column(String(100), nullable=False, index=True)  # e.g., 'leave_request', 'expense_claim'
    is_default = Column(Boolean, default=False)  # Default workflow for the model

    # Workflow Settings
    require_all_levels = Column(Boolean, default=True)  # All levels must approve vs any level
    allow_self_approval = Column(Boolean, default=False)
    auto_approve_after_days = Column(Integer, nullable=True)  # Auto-approve if no action after X days

    # Notifications
    notify_on_submit = Column(Boolean, default=True)
    notify_on_approve = Column(Boolean, default=True)
    notify_on_reject = Column(Boolean, default=True)

    # Sequence
    sequence = Column(Integer, default=10)

    # Relationships
    levels = relationship("ApprovalLevel", back_populates="workflow", cascade="all, delete-orphan", order_by="ApprovalLevel.sequence")
    rules = relationship("ApprovalRule", back_populates="workflow", cascade="all, delete-orphan")
    requests = relationship("ApprovalRequest", back_populates="workflow")

    def __repr__(self) -> str:
        return f"<ApprovalWorkflow(id={self.id}, name='{self.name}', model='{self.model_name}')>"


class ApprovalLevel(Base, TimestampMixin, AuditMixin, CompanyScopedMixin):
    """
    Approval Level model.

    Defines a level in the approval hierarchy.
    """
    __tablename__ = "hrms_approval_levels"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    workflow_id = Column(Integer, ForeignKey("hrms_approval_workflows.id"), nullable=False, index=True)

    # Level Configuration
    name = Column(String(100), nullable=False)
    sequence = Column(Integer, nullable=False, index=True)  # Order in the workflow

    # Approver Configuration
    approver_type = Column(SQLEnum(ApproverType), nullable=False)
    approver_id = Column(Integer, nullable=True)  # User ID if specific_user, Role ID if role, Group ID if group

    # Settings
    required = Column(Boolean, default=True)  # Is this level required?
    can_skip = Column(Boolean, default=False)  # Can this level be skipped?
    min_approvers = Column(Integer, default=1)  # Minimum approvers needed at this level

    # Relationships
    workflow = relationship("ApprovalWorkflow", back_populates="levels")

    def __repr__(self) -> str:
        return f"<ApprovalLevel(id={self.id}, sequence={self.sequence}, type={self.approver_type})>"


class ApprovalRule(Base, TimestampMixin, AuditMixin, CompanyScopedMixin, ActiveMixin):
    """
    Approval Rule model.

    Defines conditions that trigger or modify approval workflows.
    """
    __tablename__ = "hrms_approval_rules"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    workflow_id = Column(Integer, ForeignKey("hrms_approval_workflows.id"), nullable=False, index=True)

    # Rule Configuration
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)

    # Condition (JSON: {"field": "amount", "operator": ">", "value": 1000})
    condition = Column(JSONB, nullable=True)

    # Action on Match
    action_type = Column(String(50), default="add_level")  # add_level, skip_level, auto_approve, auto_reject
    action_config = Column(JSONB, nullable=True)  # Additional config for action

    # Priority (lower = higher priority)
    priority = Column(Integer, default=10)

    # Relationships
    workflow = relationship("ApprovalWorkflow", back_populates="rules")

    def __repr__(self) -> str:
        return f"<ApprovalRule(id={self.id}, name='{self.name}')>"

    def evaluate(self, record: dict) -> bool:
        """Evaluate if the rule condition matches the record"""
        if not self.condition:
            return True

        field = self.condition.get("field")
        operator = self.condition.get("operator")
        value = self.condition.get("value")

        if not field or not operator:
            return True

        record_value = record.get(field)
        if record_value is None:
            return False

        if operator == "==" or operator == "=":
            return record_value == value
        elif operator == "!=" or operator == "<>":
            return record_value != value
        elif operator == ">":
            return record_value > value
        elif operator == ">=":
            return record_value >= value
        elif operator == "<":
            return record_value < value
        elif operator == "<=":
            return record_value <= value
        elif operator == "in":
            return record_value in value
        elif operator == "not_in":
            return record_value not in value
        elif operator == "contains":
            return value in str(record_value)

        return False


class ApprovalDelegation(Base, TimestampMixin, AuditMixin, CompanyScopedMixin):
    """
    Approval Delegation model.

    Temporary delegation of approval authority.
    """
    __tablename__ = "hrms_approval_delegations"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    # Delegation
    delegator_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    delegate_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Scope
    workflow_id = Column(Integer, ForeignKey("hrms_approval_workflows.id"), nullable=True)  # NULL = all workflows
    model_name = Column(String(100), nullable=True)  # NULL = all models

    # Date Range
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=False, index=True)

    # Status
    is_active = Column(Boolean, default=True, index=True)
    reason = Column(Text, nullable=True)

    # Relationships
    delegator = relationship("User", foreign_keys=[delegator_id])
    delegate = relationship("User", foreign_keys=[delegate_id])
    workflow = relationship("ApprovalWorkflow", foreign_keys=[workflow_id])

    def __repr__(self) -> str:
        return f"<ApprovalDelegation(id={self.id}, delegator={self.delegator_id}, delegate={self.delegate_id})>"

    def is_valid_on_date(self, check_date: date) -> bool:
        """Check if delegation is valid on a specific date"""
        return self.is_active and self.start_date <= check_date <= self.end_date


class ApprovalRequest(Base, TimestampMixin, AuditMixin, CompanyScopedMixin):
    """
    Approval Request model.

    Tracks approval requests through the workflow.
    """
    __tablename__ = "hrms_approval_requests"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    # Workflow
    workflow_id = Column(Integer, ForeignKey("hrms_approval_workflows.id"), nullable=False, index=True)

    # Record Being Approved
    model_name = Column(String(100), nullable=False, index=True)
    record_id = Column(Integer, nullable=False, index=True)
    record_name = Column(String(255), nullable=True)  # Cached display name

    # Requestor
    requestor_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Status
    status = Column(SQLEnum(ApprovalStatus), default=ApprovalStatus.PENDING, index=True)
    current_level = Column(Integer, default=1)

    # Dates
    submitted_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    # Final Decision
    final_approver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    final_decision_note = Column(Text, nullable=True)

    # Relationships
    workflow = relationship("ApprovalWorkflow", back_populates="requests")
    requestor = relationship("User", foreign_keys=[requestor_id])
    final_approver = relationship("User", foreign_keys=[final_approver_id])
    actions = relationship("ApprovalAction", back_populates="request", cascade="all, delete-orphan", order_by="ApprovalAction.created_at")

    def __repr__(self) -> str:
        return f"<ApprovalRequest(id={self.id}, model={self.model_name}, record={self.record_id}, status={self.status})>"

    def approve(self, approver_id: int, note: Optional[str] = None) -> None:
        """Mark as approved"""
        self.status = ApprovalStatus.APPROVED
        self.completed_at = datetime.utcnow()
        self.final_approver_id = approver_id
        self.final_decision_note = note

    def reject(self, approver_id: int, note: Optional[str] = None) -> None:
        """Mark as rejected"""
        self.status = ApprovalStatus.REJECTED
        self.completed_at = datetime.utcnow()
        self.final_approver_id = approver_id
        self.final_decision_note = note

    def cancel(self) -> None:
        """Cancel the request"""
        self.status = ApprovalStatus.CANCELLED
        self.completed_at = datetime.utcnow()

    def is_pending(self) -> bool:
        """Check if request is still pending"""
        return self.status in [ApprovalStatus.PENDING, ApprovalStatus.IN_PROGRESS]


class ApprovalAction(Base, TimestampMixin, CompanyScopedMixin):
    """
    Approval Action model.

    Records individual approval actions taken on a request.
    """
    __tablename__ = "hrms_approval_actions"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    request_id = Column(Integer, ForeignKey("hrms_approval_requests.id"), nullable=False, index=True)

    # Action Details
    action_type = Column(SQLEnum(ApprovalActionType), nullable=False)
    level = Column(Integer, nullable=False)  # Which level this action is for

    # Actor
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    on_behalf_of_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # If delegated

    # Notes
    comment = Column(Text, nullable=True)

    # Relationships
    request = relationship("ApprovalRequest", back_populates="actions")
    user = relationship("User", foreign_keys=[user_id])
    on_behalf_of = relationship("User", foreign_keys=[on_behalf_of_id])

    def __repr__(self) -> str:
        return f"<ApprovalAction(id={self.id}, type={self.action_type}, user={self.user_id})>"
