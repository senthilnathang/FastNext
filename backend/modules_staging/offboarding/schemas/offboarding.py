"""
Offboarding Schemas

Pydantic schemas for offboarding data validation.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List, Any

from pydantic import BaseModel, ConfigDict, Field

from ..models import (
    OffboardingStatus, ExitType, TaskStatus, TaskPriority, FnFStatus
)


# ============== Exit Reason Schemas ==============

class ExitReasonBase(BaseModel):
    """Base schema for exit reasons."""
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    exit_type: ExitType
    is_rehirable: bool = True


class ExitReasonCreate(ExitReasonBase):
    """Schema for creating exit reasons."""
    pass


class ExitReasonUpdate(BaseModel):
    """Schema for updating exit reasons."""
    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    exit_type: Optional[ExitType] = None
    is_rehirable: Optional[bool] = None
    is_active: Optional[bool] = None


class ExitReasonResponse(ExitReasonBase):
    """Schema for exit reason responses."""
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============== Offboarding Stage Schemas ==============

class OffboardingStageBase(BaseModel):
    """Base schema for offboarding stages."""
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    sequence: int = 0
    is_mandatory: bool = True
    requires_approval: bool = False
    approver_role: Optional[str] = None
    color: str = "#e74c3c"


class OffboardingStageCreate(OffboardingStageBase):
    """Schema for creating offboarding stages."""
    pass


class OffboardingStageUpdate(BaseModel):
    """Schema for updating offboarding stages."""
    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    sequence: Optional[int] = None
    is_mandatory: Optional[bool] = None
    requires_approval: Optional[bool] = None
    approver_role: Optional[str] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None


class OffboardingStageResponse(OffboardingStageBase):
    """Schema for offboarding stage responses."""
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============== Task Template Schemas ==============

class TaskTemplateBase(BaseModel):
    """Base schema for task templates."""
    name: str = Field(..., max_length=200)
    description: Optional[str] = None
    category: Optional[str] = None
    priority: TaskPriority = TaskPriority.MEDIUM
    days_before_exit: Optional[int] = None
    assign_to_manager: bool = False
    assign_to_hr: bool = False
    assign_to_employee: bool = False
    assigned_role: Optional[str] = None
    assigned_user_id: Optional[int] = None
    is_mandatory: bool = True
    requires_approval: bool = False
    blocking: bool = False
    instructions: Optional[str] = None
    checklist_items: Optional[List[str]] = None


class TaskTemplateCreate(TaskTemplateBase):
    """Schema for creating task templates."""
    stage_ids: Optional[List[int]] = None


class TaskTemplateUpdate(BaseModel):
    """Schema for updating task templates."""
    name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[TaskPriority] = None
    days_before_exit: Optional[int] = None
    assign_to_manager: Optional[bool] = None
    assign_to_hr: Optional[bool] = None
    assign_to_employee: Optional[bool] = None
    assigned_role: Optional[str] = None
    assigned_user_id: Optional[int] = None
    is_mandatory: Optional[bool] = None
    requires_approval: Optional[bool] = None
    blocking: Optional[bool] = None
    instructions: Optional[str] = None
    checklist_items: Optional[List[str]] = None
    stage_ids: Optional[List[int]] = None
    is_active: Optional[bool] = None


class TaskTemplateResponse(TaskTemplateBase):
    """Schema for task template responses."""
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============== Offboarding Template Schemas ==============

class OffboardingTemplateBase(BaseModel):
    """Base schema for offboarding templates."""
    name: str = Field(..., max_length=200)
    description: Optional[str] = None
    exit_type: Optional[ExitType] = None
    department_id: Optional[int] = None
    default_notice_period_days: int = 30
    is_default: bool = False
    require_exit_interview: bool = True
    require_knowledge_transfer: bool = True


class OffboardingTemplateCreate(OffboardingTemplateBase):
    """Schema for creating offboarding templates."""
    stage_ids: Optional[List[int]] = None


class OffboardingTemplateUpdate(BaseModel):
    """Schema for updating offboarding templates."""
    name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    exit_type: Optional[ExitType] = None
    department_id: Optional[int] = None
    default_notice_period_days: Optional[int] = None
    is_default: Optional[bool] = None
    require_exit_interview: Optional[bool] = None
    require_knowledge_transfer: Optional[bool] = None
    stage_ids: Optional[List[int]] = None
    is_active: Optional[bool] = None


class OffboardingTemplateResponse(OffboardingTemplateBase):
    """Schema for offboarding template responses."""
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    stages: List[OffboardingStageResponse] = []

    class Config:
        from_attributes = True


# ============== Asset Return Schemas ==============

class AssetReturnBase(BaseModel):
    """Base schema for asset returns."""
    asset_name: str = Field(..., max_length=200)
    asset_type: Optional[str] = None
    asset_serial: Optional[str] = None


class AssetReturnCreate(AssetReturnBase):
    """Schema for creating asset returns."""
    offboarding_employee_id: int
    asset_id: Optional[int] = None


class AssetReturnUpdate(BaseModel):
    """Schema for updating asset returns."""
    is_returned: Optional[bool] = None
    return_date: Optional[date] = None
    condition: Optional[str] = None
    condition_notes: Optional[str] = None
    deduction_amount: Optional[Decimal] = None
    deduction_reason: Optional[str] = None


class AssetReturnResponse(AssetReturnBase):
    """Schema for asset return responses."""
    id: int
    offboarding_employee_id: int
    asset_id: Optional[int] = None
    is_returned: bool
    return_date: Optional[date] = None
    received_by_id: Optional[int] = None
    condition: Optional[str] = None
    condition_notes: Optional[str] = None
    deduction_amount: Decimal
    deduction_reason: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============== Offboarding Task Schemas ==============

class OffboardingTaskBase(BaseModel):
    """Base schema for offboarding tasks."""
    name: str = Field(..., max_length=200)
    description: Optional[str] = None
    category: Optional[str] = None
    instructions: Optional[str] = None
    assigned_to_id: Optional[int] = None
    due_date: Optional[date] = None
    priority: TaskPriority = TaskPriority.MEDIUM
    is_mandatory: bool = True
    is_blocking: bool = False
    requires_approval: bool = False


class OffboardingTaskCreate(OffboardingTaskBase):
    """Schema for creating offboarding tasks."""
    offboarding_employee_id: int
    template_id: Optional[int] = None
    stage_id: Optional[int] = None


class OffboardingTaskUpdate(BaseModel):
    """Schema for updating offboarding tasks."""
    name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    category: Optional[str] = None
    instructions: Optional[str] = None
    assigned_to_id: Optional[int] = None
    due_date: Optional[date] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    is_mandatory: Optional[bool] = None
    is_blocking: Optional[bool] = None
    notes: Optional[str] = None
    completion_notes: Optional[str] = None


class OffboardingTaskResponse(OffboardingTaskBase):
    """Schema for offboarding task responses."""
    id: int
    offboarding_employee_id: int
    template_id: Optional[int] = None
    stage_id: Optional[int] = None
    status: TaskStatus
    completed_date: Optional[datetime] = None
    approved_by_id: Optional[int] = None
    approved_date: Optional[datetime] = None
    notes: Optional[str] = None
    completion_notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============== Exit Interview Schemas ==============

class ExitInterviewBase(BaseModel):
    """Base schema for exit interviews."""
    scheduled_date: Optional[datetime] = None


class ExitInterviewCreate(ExitInterviewBase):
    """Schema for creating exit interviews."""
    offboarding_employee_id: int


class ExitInterviewUpdate(BaseModel):
    """Schema for updating exit interviews."""
    scheduled_date: Optional[datetime] = None
    conducted_date: Optional[datetime] = None
    is_completed: Optional[bool] = None
    declined: Optional[bool] = None
    decline_reason: Optional[str] = None
    overall_satisfaction: Optional[int] = Field(None, ge=1, le=5)
    management_rating: Optional[int] = Field(None, ge=1, le=5)
    work_environment_rating: Optional[int] = Field(None, ge=1, le=5)
    compensation_rating: Optional[int] = Field(None, ge=1, le=5)
    growth_opportunities_rating: Optional[int] = Field(None, ge=1, le=5)
    work_life_balance_rating: Optional[int] = Field(None, ge=1, le=5)
    reason_for_leaving: Optional[str] = None
    what_could_be_improved: Optional[str] = None
    what_was_good: Optional[str] = None
    would_recommend_company: Optional[bool] = None
    additional_comments: Optional[str] = None
    hr_notes: Optional[str] = None
    follow_up_actions: Optional[str] = None


class ExitInterviewResponse(ExitInterviewBase):
    """Schema for exit interview responses."""
    id: int
    offboarding_employee_id: int
    conducted_date: Optional[datetime] = None
    conducted_by_id: Optional[int] = None
    is_completed: bool
    declined: bool
    decline_reason: Optional[str] = None
    overall_satisfaction: Optional[int] = None
    management_rating: Optional[int] = None
    work_environment_rating: Optional[int] = None
    compensation_rating: Optional[int] = None
    growth_opportunities_rating: Optional[int] = None
    work_life_balance_rating: Optional[int] = None
    reason_for_leaving: Optional[str] = None
    what_could_be_improved: Optional[str] = None
    what_was_good: Optional[str] = None
    would_recommend_company: Optional[bool] = None
    additional_comments: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============== FnF Settlement Schemas ==============

class FnFComponentBase(BaseModel):
    """Base schema for FnF components."""
    name: str = Field(..., max_length=200)
    component_type: str  # earning, deduction
    amount: Decimal = 0
    description: Optional[str] = None


class FnFComponentCreate(FnFComponentBase):
    """Schema for creating FnF components."""
    settlement_id: int


class FnFComponentResponse(FnFComponentBase):
    """Schema for FnF component responses."""
    id: int
    settlement_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class FnFSettlementBase(BaseModel):
    """Base schema for FnF settlements."""
    currency: str = "USD"
    pending_salary: Decimal = 0
    leave_encashment: Decimal = 0
    bonus_pending: Decimal = 0
    gratuity: Decimal = 0
    notice_pay: Decimal = 0
    reimbursements: Decimal = 0
    other_earnings: Decimal = 0
    notice_recovery: Decimal = 0
    loan_recovery: Decimal = 0
    advance_recovery: Decimal = 0
    asset_deductions: Decimal = 0
    tax_deductions: Decimal = 0
    other_deductions: Decimal = 0


class FnFSettlementCreate(FnFSettlementBase):
    """Schema for creating FnF settlements."""
    offboarding_employee_id: int


class FnFSettlementUpdate(BaseModel):
    """Schema for updating FnF settlements."""
    settlement_date: Optional[date] = None
    currency: Optional[str] = None
    pending_salary: Optional[Decimal] = None
    leave_encashment: Optional[Decimal] = None
    bonus_pending: Optional[Decimal] = None
    gratuity: Optional[Decimal] = None
    notice_pay: Optional[Decimal] = None
    reimbursements: Optional[Decimal] = None
    other_earnings: Optional[Decimal] = None
    notice_recovery: Optional[Decimal] = None
    loan_recovery: Optional[Decimal] = None
    advance_recovery: Optional[Decimal] = None
    asset_deductions: Optional[Decimal] = None
    tax_deductions: Optional[Decimal] = None
    other_deductions: Optional[Decimal] = None
    status: Optional[FnFStatus] = None
    payment_date: Optional[date] = None
    payment_reference: Optional[str] = None
    notes: Optional[str] = None


class FnFSettlementResponse(FnFSettlementBase):
    """Schema for FnF settlement responses."""
    id: int
    offboarding_employee_id: int
    settlement_date: Optional[date] = None
    total_earnings: Decimal
    total_deductions: Decimal
    net_payable: Decimal
    status: FnFStatus
    hr_approved_by_id: Optional[int] = None
    hr_approved_date: Optional[datetime] = None
    finance_approved_by_id: Optional[int] = None
    finance_approved_date: Optional[datetime] = None
    payment_date: Optional[date] = None
    payment_reference: Optional[str] = None
    employee_acknowledgment: bool
    acknowledgment_date: Optional[datetime] = None
    notes: Optional[str] = None
    components: List[FnFComponentResponse] = []
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============== Offboarding Employee Schemas ==============

class OffboardingEmployeeBase(BaseModel):
    """Base schema for offboarding employees."""
    employee_id: int
    exit_type: ExitType
    exit_reason_id: Optional[int] = None
    exit_reason_detail: Optional[str] = None
    resignation_date: Optional[date] = None
    last_working_day: date
    notice_period_days: int = 30


class OffboardingEmployeeCreate(OffboardingEmployeeBase):
    """Schema for creating offboarding employees."""
    template_id: Optional[int] = None


class OffboardingEmployeeUpdate(BaseModel):
    """Schema for updating offboarding employees."""
    exit_type: Optional[ExitType] = None
    exit_reason_id: Optional[int] = None
    exit_reason_detail: Optional[str] = None
    resignation_date: Optional[date] = None
    notice_start_date: Optional[date] = None
    last_working_day: Optional[date] = None
    actual_exit_date: Optional[date] = None
    notice_period_days: Optional[int] = None
    notice_served_days: Optional[int] = None
    notice_buyout: Optional[bool] = None
    notice_buyout_amount: Optional[Decimal] = None
    template_id: Optional[int] = None
    current_stage_id: Optional[int] = None
    status: Optional[OffboardingStatus] = None
    is_rehirable: Optional[bool] = None
    rehire_eligibility_notes: Optional[str] = None
    notes: Optional[str] = None
    hr_notes: Optional[str] = None
    is_active: Optional[bool] = None


class OffboardingEmployeeResponse(OffboardingEmployeeBase):
    """Schema for offboarding employee responses."""
    id: int
    notice_start_date: Optional[date] = None
    actual_exit_date: Optional[date] = None
    notice_served_days: int
    notice_buyout: bool
    notice_buyout_amount: Optional[Decimal] = None
    template_id: Optional[int] = None
    current_stage_id: Optional[int] = None
    status: OffboardingStatus
    progress_percentage: int
    approved_by_id: Optional[int] = None
    approved_date: Optional[datetime] = None
    is_rehirable: bool
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class OffboardingEmployeeDetail(OffboardingEmployeeResponse):
    """Detailed schema for offboarding employee with related data."""
    template: Optional[OffboardingTemplateResponse] = None
    current_stage: Optional[OffboardingStageResponse] = None
    exit_reason: Optional[ExitReasonResponse] = None
    tasks: List[OffboardingTaskResponse] = []
    asset_returns: List[AssetReturnResponse] = []
    exit_interview: Optional[ExitInterviewResponse] = None
    fnf_settlement: Optional[FnFSettlementResponse] = None

    class Config:
        from_attributes = True


# ============== Dashboard Schemas ==============

class OffboardingProgress(BaseModel):
    """Progress summary for an offboarding employee."""
    employee_id: int
    employee_name: str
    exit_type: ExitType
    status: OffboardingStatus
    progress_percentage: int
    current_stage: Optional[str] = None
    last_working_day: date
    days_remaining: int
    total_tasks: int
    completed_tasks: int
    pending_tasks: int
    blocking_tasks: int


class OffboardingDashboard(BaseModel):
    """Dashboard summary for offboarding."""
    total_in_progress: int
    total_completed_this_month: int
    total_pending_approval: int
    upcoming_exits: int
    by_exit_type: List[dict] = []
    by_department: List[dict] = []
    by_stage: List[dict] = []
    recent_exits: List[OffboardingProgress] = []
    upcoming_last_days: List[OffboardingProgress] = []
    pending_fnf: List[dict] = []
    exit_interview_stats: dict = {}


# ============== Resignation Letter Schemas ==============

class ResignationLetterBase(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    planned_to_leave_on: date

class ResignationLetterCreate(ResignationLetterBase):
    employee_id: int

class ResignationLetterUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    planned_to_leave_on: Optional[date] = None
    status: Optional[str] = None
    rejection_reason: Optional[str] = None

class ResignationLetterResponse(ResignationLetterBase):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    status: str = "requested"
    offboarding_employee_id: Optional[int] = None
    approved_by_id: Optional[int] = None
    approved_date: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ============== Offboarding Note Schemas ==============

class OffboardingNoteCreate(BaseModel):
    offboarding_employee_id: int
    description: str

class OffboardingNoteResponse(BaseModel):
    id: int
    offboarding_employee_id: int
    description: Optional[str] = None
    note_by_id: Optional[int] = None
    note_by_name: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ============== General Setting Schemas ==============

class OffboardingSettingResponse(BaseModel):
    id: Optional[int] = None
    resignation_request_enabled: bool = False

    model_config = ConfigDict(from_attributes=True)

class OffboardingSettingUpdate(BaseModel):
    resignation_request_enabled: Optional[bool] = None
