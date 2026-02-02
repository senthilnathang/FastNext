"""
Approval Workflow Schemas

Pydantic schemas for approval workflow validation and serialization.
"""

from datetime import datetime, date
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from ..models.approval import ApproverType, ApprovalStatus, ApprovalActionType


class ApprovalWorkflowBase(BaseModel):
    """Base schema for approval workflows."""

    name: str = Field(..., min_length=1, max_length=200, description="Workflow name")
    description: Optional[str] = Field(None, description="Workflow description")
    model_name: str = Field(..., min_length=1, max_length=100, description="Model name (e.g., leave_request)")
    is_default: bool = Field(False, description="Is default workflow for the model")
    require_all_levels: bool = Field(True, description="Require all levels to approve")
    allow_self_approval: bool = Field(False, description="Allow self-approval")
    auto_approve_after_days: Optional[int] = Field(None, ge=1, description="Auto-approve after X days")
    notify_on_submit: bool = Field(True, description="Send notification on submit")
    notify_on_approve: bool = Field(True, description="Send notification on approve")
    notify_on_reject: bool = Field(True, description="Send notification on reject")
    sequence: int = Field(10, ge=0, description="Display order")
    is_active: bool = Field(True, description="Is workflow active")


class ApprovalWorkflowCreate(ApprovalWorkflowBase):
    """Schema for creating an approval workflow."""
    pass


class ApprovalWorkflowUpdate(BaseModel):
    """Schema for updating an approval workflow."""

    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    model_name: Optional[str] = Field(None, min_length=1, max_length=100)
    is_default: Optional[bool] = None
    require_all_levels: Optional[bool] = None
    allow_self_approval: Optional[bool] = None
    auto_approve_after_days: Optional[int] = Field(None, ge=1)
    notify_on_submit: Optional[bool] = None
    notify_on_approve: Optional[bool] = None
    notify_on_reject: Optional[bool] = None
    sequence: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None


class ApprovalLevelBase(BaseModel):
    """Base schema for approval levels."""

    name: str = Field(..., min_length=1, max_length=100, description="Level name")
    sequence: int = Field(..., ge=1, description="Level sequence")
    approver_type: ApproverType = Field(..., description="Type of approver")
    approver_id: Optional[int] = Field(None, description="Approver ID (for specific user/role/group)")
    required: bool = Field(True, description="Is level required")
    can_skip: bool = Field(False, description="Can this level be skipped")
    min_approvers: int = Field(1, ge=1, description="Minimum approvers needed")


class ApprovalLevelCreate(ApprovalLevelBase):
    """Schema for creating an approval level."""

    workflow_id: int = Field(..., description="Workflow ID")


class ApprovalLevelResponse(ApprovalLevelBase):
    """Schema for approval level response."""

    id: int
    workflow_id: int
    company_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ApprovalWorkflowResponse(ApprovalWorkflowBase):
    """Schema for approval workflow response."""

    id: int
    company_id: Optional[int] = None
    levels: List[ApprovalLevelResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ApprovalWorkflowList(BaseModel):
    """Schema for list of approval workflows."""

    items: List[ApprovalWorkflowResponse]
    total: int
    page: int = 1
    page_size: int = 20


# Approval Rule Schemas
class RuleCondition(BaseModel):
    """Condition for approval rule."""

    field: str = Field(..., description="Field name to check")
    operator: str = Field(..., description="Operator (==, !=, >, <, >=, <=, in, not_in, contains)")
    value: Any = Field(..., description="Value to compare")


class ApprovalRuleBase(BaseModel):
    """Base schema for approval rules."""

    name: str = Field(..., min_length=1, max_length=100, description="Rule name")
    description: Optional[str] = Field(None, description="Rule description")
    condition: Optional[RuleCondition] = Field(None, description="Rule condition")
    action_type: str = Field("add_level", description="Action type")
    action_config: Optional[Dict[str, Any]] = Field(None, description="Action configuration")
    priority: int = Field(10, ge=0, description="Priority (lower = higher)")
    is_active: bool = Field(True, description="Is rule active")


class ApprovalRuleCreate(ApprovalRuleBase):
    """Schema for creating an approval rule."""

    workflow_id: int = Field(..., description="Workflow ID")


class ApprovalRuleResponse(ApprovalRuleBase):
    """Schema for approval rule response."""

    id: int
    workflow_id: int
    company_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Approval Delegation Schemas
class ApprovalDelegationBase(BaseModel):
    """Base schema for approval delegations."""

    delegate_id: int = Field(..., description="Delegate user ID")
    workflow_id: Optional[int] = Field(None, description="Specific workflow ID (None = all)")
    model_name: Optional[str] = Field(None, max_length=100, description="Specific model (None = all)")
    start_date: date = Field(..., description="Delegation start date")
    end_date: date = Field(..., description="Delegation end date")
    reason: Optional[str] = Field(None, description="Delegation reason")


class ApprovalDelegationCreate(ApprovalDelegationBase):
    """Schema for creating an approval delegation."""
    pass


class UserInfo(BaseModel):
    """User info within delegation response."""

    id: int
    username: str
    full_name: Optional[str] = None

    class Config:
        from_attributes = True


class ApprovalDelegationResponse(ApprovalDelegationBase):
    """Schema for approval delegation response."""

    id: int
    delegator_id: int
    company_id: Optional[int] = None
    is_active: bool
    delegator: Optional[UserInfo] = None
    delegate: Optional[UserInfo] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Approval Request Schemas
class ApprovalRequestBase(BaseModel):
    """Base schema for approval requests."""

    workflow_id: int = Field(..., description="Workflow ID")
    model_name: str = Field(..., min_length=1, max_length=100, description="Model being approved")
    record_id: int = Field(..., description="Record ID being approved")
    record_name: Optional[str] = Field(None, max_length=255, description="Record display name")


class ApprovalRequestCreate(ApprovalRequestBase):
    """Schema for creating an approval request."""
    pass


class ApprovalRequestResponse(ApprovalRequestBase):
    """Schema for approval request response."""

    id: int
    company_id: Optional[int] = None
    requestor_id: int
    status: ApprovalStatus
    current_level: int
    submitted_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    final_approver_id: Optional[int] = None
    final_decision_note: Optional[str] = None
    requestor: Optional[UserInfo] = None
    final_approver: Optional[UserInfo] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Approval Action Schemas
class ApprovalActionCreate(BaseModel):
    """Schema for creating an approval action."""

    action_type: ApprovalActionType = Field(..., description="Action type")
    comment: Optional[str] = Field(None, description="Action comment")


class ApprovalActionResponse(BaseModel):
    """Schema for approval action response."""

    id: int
    request_id: int
    action_type: ApprovalActionType
    level: int
    user_id: int
    on_behalf_of_id: Optional[int] = None
    comment: Optional[str] = None
    user: Optional[UserInfo] = None
    on_behalf_of: Optional[UserInfo] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
