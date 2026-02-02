"""
Onboarding Schemas

Pydantic schemas for onboarding data validation.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List, Any

from pydantic import BaseModel, EmailStr, Field

from ..models import (
    OnboardingStatus, TaskStatus, TaskPriority, DocumentStatus
)


# ============== Onboarding Stage Schemas ==============

class OnboardingStageBase(BaseModel):
    """Base schema for onboarding stages."""
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    sequence: int = 0
    duration_days: Optional[int] = None
    is_mandatory: bool = True
    color: str = "#3498db"


class OnboardingStageCreate(OnboardingStageBase):
    """Schema for creating onboarding stages."""
    pass


class OnboardingStageUpdate(BaseModel):
    """Schema for updating onboarding stages."""
    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    sequence: Optional[int] = None
    duration_days: Optional[int] = None
    is_mandatory: Optional[bool] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None


class OnboardingStageResponse(OnboardingStageBase):
    """Schema for onboarding stage responses."""
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============== Document Type Schemas ==============

class DocumentTypeBase(BaseModel):
    """Base schema for document types."""
    name: str = Field(..., max_length=200)
    description: Optional[str] = None
    is_mandatory: bool = True
    requires_expiry: bool = False
    allowed_formats: Optional[List[str]] = None
    max_file_size_mb: int = 10


class DocumentTypeCreate(DocumentTypeBase):
    """Schema for creating document types."""
    pass


class DocumentTypeUpdate(BaseModel):
    """Schema for updating document types."""
    name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    is_mandatory: Optional[bool] = None
    requires_expiry: Optional[bool] = None
    allowed_formats: Optional[List[str]] = None
    max_file_size_mb: Optional[int] = None
    is_active: Optional[bool] = None


class DocumentTypeResponse(DocumentTypeBase):
    """Schema for document type responses."""
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
    priority: TaskPriority = TaskPriority.MEDIUM
    duration_days: Optional[int] = None
    assign_to_manager: bool = False
    assign_to_hr: bool = False
    assign_to_employee: bool = False
    assigned_role: Optional[str] = None
    assigned_user_id: Optional[int] = None
    is_mandatory: bool = True
    requires_approval: bool = False
    requires_document: bool = False
    document_type_id: Optional[int] = None
    instructions: Optional[str] = None
    checklist_items: Optional[List[str]] = None


class TaskTemplateCreate(TaskTemplateBase):
    """Schema for creating task templates."""
    stage_ids: Optional[List[int]] = None


class TaskTemplateUpdate(BaseModel):
    """Schema for updating task templates."""
    name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    priority: Optional[TaskPriority] = None
    duration_days: Optional[int] = None
    assign_to_manager: Optional[bool] = None
    assign_to_hr: Optional[bool] = None
    assign_to_employee: Optional[bool] = None
    assigned_role: Optional[str] = None
    assigned_user_id: Optional[int] = None
    is_mandatory: Optional[bool] = None
    requires_approval: Optional[bool] = None
    requires_document: Optional[bool] = None
    document_type_id: Optional[int] = None
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
    document_type: Optional[DocumentTypeResponse] = None

    class Config:
        from_attributes = True


# ============== Onboarding Template Schemas ==============

class OnboardingTemplateBase(BaseModel):
    """Base schema for onboarding templates."""
    name: str = Field(..., max_length=200)
    description: Optional[str] = None
    department_id: Optional[int] = None
    job_position_id: Optional[int] = None
    employment_type: Optional[str] = None
    duration_days: int = 30
    is_default: bool = False
    send_welcome_email: bool = True
    create_portal_account: bool = True
    auto_create_employee: bool = True
    welcome_message: Optional[str] = None


class OnboardingTemplateCreate(OnboardingTemplateBase):
    """Schema for creating onboarding templates."""
    stage_ids: Optional[List[int]] = None
    document_type_ids: Optional[List[int]] = None


class OnboardingTemplateUpdate(BaseModel):
    """Schema for updating onboarding templates."""
    name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    department_id: Optional[int] = None
    job_position_id: Optional[int] = None
    employment_type: Optional[str] = None
    duration_days: Optional[int] = None
    is_default: Optional[bool] = None
    send_welcome_email: Optional[bool] = None
    create_portal_account: Optional[bool] = None
    auto_create_employee: Optional[bool] = None
    welcome_message: Optional[str] = None
    stage_ids: Optional[List[int]] = None
    document_type_ids: Optional[List[int]] = None
    is_active: Optional[bool] = None


class OnboardingTemplateResponse(OnboardingTemplateBase):
    """Schema for onboarding template responses."""
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    stages: List[OnboardingStageResponse] = []
    document_types: List[DocumentTypeResponse] = []

    class Config:
        from_attributes = True


# ============== Onboarding Document Schemas ==============

class OnboardingDocumentBase(BaseModel):
    """Base schema for onboarding documents."""
    document_type_id: int
    file_name: str = Field(..., max_length=255)
    file_path: str = Field(..., max_length=500)
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    expiry_date: Optional[date] = None
    notes: Optional[str] = None


class OnboardingDocumentCreate(OnboardingDocumentBase):
    """Schema for creating onboarding documents."""
    onboarding_employee_id: int


class OnboardingDocumentUpdate(BaseModel):
    """Schema for updating onboarding documents."""
    file_name: Optional[str] = Field(None, max_length=255)
    file_path: Optional[str] = Field(None, max_length=500)
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    expiry_date: Optional[date] = None
    status: Optional[DocumentStatus] = None
    rejection_reason: Optional[str] = None
    notes: Optional[str] = None


class OnboardingDocumentResponse(OnboardingDocumentBase):
    """Schema for onboarding document responses."""
    id: int
    onboarding_employee_id: int
    status: DocumentStatus
    reviewed_by_id: Optional[int] = None
    reviewed_date: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    document_type: Optional[DocumentTypeResponse] = None

    class Config:
        from_attributes = True


# ============== Onboarding Task Schemas ==============

class OnboardingTaskBase(BaseModel):
    """Base schema for onboarding tasks."""
    name: str = Field(..., max_length=200)
    description: Optional[str] = None
    instructions: Optional[str] = None
    assigned_to_id: Optional[int] = None
    due_date: Optional[date] = None
    priority: TaskPriority = TaskPriority.MEDIUM
    is_mandatory: bool = True
    requires_approval: bool = False
    requires_document: bool = False


class OnboardingTaskCreate(OnboardingTaskBase):
    """Schema for creating onboarding tasks."""
    onboarding_employee_id: int
    template_id: Optional[int] = None
    stage_id: Optional[int] = None


class OnboardingTaskUpdate(BaseModel):
    """Schema for updating onboarding tasks."""
    name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    instructions: Optional[str] = None
    assigned_to_id: Optional[int] = None
    due_date: Optional[date] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    is_mandatory: Optional[bool] = None
    requires_approval: Optional[bool] = None
    notes: Optional[str] = None
    completion_notes: Optional[str] = None


class OnboardingTaskResponse(OnboardingTaskBase):
    """Schema for onboarding task responses."""
    id: int
    onboarding_employee_id: int
    template_id: Optional[int] = None
    stage_id: Optional[int] = None
    status: TaskStatus
    completed_date: Optional[datetime] = None
    approved_by_id: Optional[int] = None
    approved_date: Optional[datetime] = None
    document_id: Optional[int] = None
    notes: Optional[str] = None
    completion_notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============== Onboarding Checklist Schemas ==============

class OnboardingChecklistBase(BaseModel):
    """Base schema for onboarding checklists."""
    item: str = Field(..., max_length=500)
    sequence: int = 0


class OnboardingChecklistCreate(OnboardingChecklistBase):
    """Schema for creating onboarding checklists."""
    onboarding_employee_id: int
    task_id: Optional[int] = None


class OnboardingChecklistUpdate(BaseModel):
    """Schema for updating onboarding checklists."""
    item: Optional[str] = Field(None, max_length=500)
    sequence: Optional[int] = None
    is_completed: Optional[bool] = None


class OnboardingChecklistResponse(OnboardingChecklistBase):
    """Schema for onboarding checklist responses."""
    id: int
    onboarding_employee_id: int
    task_id: Optional[int] = None
    is_completed: bool
    completed_by_id: Optional[int] = None
    completed_date: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============== Onboarding Employee Schemas ==============

class OnboardingEmployeeBase(BaseModel):
    """Base schema for onboarding employees."""
    name: str = Field(..., max_length=200)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=50)
    department_id: Optional[int] = None
    job_position_id: Optional[int] = None
    manager_id: Optional[int] = None
    start_date: Optional[date] = None
    notes: Optional[str] = None


class OnboardingEmployeeCreate(OnboardingEmployeeBase):
    """Schema for creating onboarding employees."""
    candidate_id: Optional[int] = None
    template_id: Optional[int] = None


class OnboardingEmployeeUpdate(BaseModel):
    """Schema for updating onboarding employees."""
    name: Optional[str] = Field(None, max_length=200)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    department_id: Optional[int] = None
    job_position_id: Optional[int] = None
    manager_id: Optional[int] = None
    template_id: Optional[int] = None
    current_stage_id: Optional[int] = None
    start_date: Optional[date] = None
    target_completion_date: Optional[date] = None
    status: Optional[OnboardingStatus] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class OnboardingEmployeeResponse(OnboardingEmployeeBase):
    """Schema for onboarding employee responses."""
    id: int
    candidate_id: Optional[int] = None
    employee_id: Optional[int] = None
    template_id: Optional[int] = None
    current_stage_id: Optional[int] = None
    target_completion_date: Optional[date] = None
    actual_completion_date: Optional[date] = None
    status: OnboardingStatus
    progress_percentage: int
    portal_activated: bool
    welcome_email_sent: bool
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class OnboardingEmployeeDetail(OnboardingEmployeeResponse):
    """Detailed schema for onboarding employee with related data."""
    template: Optional[OnboardingTemplateResponse] = None
    current_stage: Optional[OnboardingStageResponse] = None
    tasks: List[OnboardingTaskResponse] = []
    documents: List[OnboardingDocumentResponse] = []

    class Config:
        from_attributes = True


# ============== Dashboard Schemas ==============

class OnboardingProgress(BaseModel):
    """Progress summary for an onboarding employee."""
    employee_id: int
    employee_name: str
    status: OnboardingStatus
    progress_percentage: int
    current_stage: Optional[str] = None
    start_date: Optional[date] = None
    target_completion_date: Optional[date] = None
    total_tasks: int
    completed_tasks: int
    pending_tasks: int
    overdue_tasks: int


class OnboardingDashboard(BaseModel):
    """Dashboard summary for onboarding."""
    total_in_progress: int
    total_completed: int
    total_on_hold: int
    new_this_month: int
    completed_this_month: int
    average_completion_days: Optional[float] = None
    by_department: List[dict] = []
    by_stage: List[dict] = []
    recent_employees: List[OnboardingProgress] = []
    upcoming_completions: List[OnboardingProgress] = []
    overdue_tasks: List[OnboardingTaskResponse] = []


# ============== Process Schemas ==============

class ProcessCreateFromTemplate(BaseModel):
    """Create an onboarding process from a template."""
    candidate_id: int
    template_id: int
    start_date: Optional[date] = None
    expected_end_date: Optional[date] = None
    joining_date: Optional[date] = None
    mentor_id: Optional[int] = None
    hr_manager_id: Optional[int] = None
    hiring_manager_id: Optional[int] = None
    notes: Optional[str] = None


class ProcessUpdate(BaseModel):
    """Update an onboarding process."""
    status: Optional[str] = None
    start_date: Optional[date] = None
    expected_end_date: Optional[date] = None
    joining_date: Optional[date] = None
    mentor_id: Optional[int] = None
    hr_manager_id: Optional[int] = None
    hiring_manager_id: Optional[int] = None
    notes: Optional[str] = None


class ProcessStageResponse(BaseModel):
    """Response for a process stage."""
    id: int
    process_id: int
    name: str
    description: Optional[str] = None
    stage_type: Optional[str] = None
    sequence: int = 0
    status: str
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    completed_date: Optional[date] = None
    approved_by_id: Optional[int] = None
    approved_at: Optional[datetime] = None
    progress: int = 0
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ProcessTaskResponse(BaseModel):
    """Response for a process task."""
    id: int
    stage_id: int
    title: str
    description: Optional[str] = None
    task_type: Optional[str] = None
    priority: Optional[str] = None
    sequence: int = 0
    status: str
    is_mandatory: bool = True
    assigned_to_id: Optional[int] = None
    assigned_to_candidate: bool = False
    due_date: Optional[date] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    completed_by_id: Optional[int] = None
    completion_notes: Optional[str] = None
    document_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ProcessResponse(BaseModel):
    """Response for an onboarding process."""
    id: int
    candidate_id: int
    template_id: Optional[int] = None
    status: str
    start_date: Optional[date] = None
    expected_end_date: Optional[date] = None
    actual_end_date: Optional[date] = None
    joining_date: Optional[date] = None
    current_stage_id: Optional[int] = None
    overall_progress: int = 0
    documents_progress: int = 0
    tasks_progress: int = 0
    mentor_id: Optional[int] = None
    hr_manager_id: Optional[int] = None
    hiring_manager_id: Optional[int] = None
    converted_employee_id: Optional[int] = None
    converted_at: Optional[datetime] = None
    notes: Optional[str] = None
    is_active: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ProcessDetailResponse(ProcessResponse):
    """Detailed process response with nested stages and tasks."""
    stages: List[ProcessStageResponse] = []

    class Config:
        from_attributes = True


# ============== Verification Schemas ==============

class VerificationRequirementBase(BaseModel):
    """Base schema for verification requirements."""
    name: str = Field(..., max_length=200)
    description: Optional[str] = None
    verification_type: Optional[str] = None
    recruitment_id: Optional[int] = None
    department_id: Optional[int] = None
    job_position_id: Optional[int] = None
    is_mandatory: bool = True
    block_conversion: bool = False
    auto_assign_to_id: Optional[int] = None
    sequence: int = 0


class VerificationRequirementCreate(VerificationRequirementBase):
    """Create a verification requirement."""
    document_type_ids: Optional[List[int]] = None


class VerificationRequirementUpdate(BaseModel):
    """Update a verification requirement."""
    name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    verification_type: Optional[str] = None
    is_mandatory: Optional[bool] = None
    block_conversion: Optional[bool] = None
    auto_assign_to_id: Optional[int] = None
    sequence: Optional[int] = None
    is_active: Optional[bool] = None
    document_type_ids: Optional[List[int]] = None


class VerificationRequirementResponse(VerificationRequirementBase):
    """Response for a verification requirement."""
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CandidateVerificationResponse(BaseModel):
    """Response for a candidate verification."""
    id: int
    candidate_id: int
    requirement_id: int
    status: str
    verified_by_id: Optional[int] = None
    verified_at: Optional[datetime] = None
    notes: Optional[str] = None
    external_reference: Optional[str] = None
    external_report_url: Optional[str] = None
    is_active: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None
    requirement: Optional[VerificationRequirementResponse] = None

    class Config:
        from_attributes = True


class VerificationActionRequest(BaseModel):
    """Request to pass/fail a verification."""
    notes: Optional[str] = None
    external_reference: Optional[str] = None
    external_report_url: Optional[str] = None


# ============== Conversion Schemas ==============

class ConversionResponse(BaseModel):
    """Response for a candidate-to-employee conversion."""
    id: int
    candidate_id: int
    employee_id: Optional[int] = None
    status: str
    all_documents_verified: bool = False
    all_tasks_completed: bool = False
    all_verifications_passed: bool = False
    offer_accepted: bool = False
    employee_id_number: Optional[str] = None
    department_id: Optional[int] = None
    job_position_id: Optional[int] = None
    reporting_manager_id: Optional[int] = None
    joining_date: Optional[date] = None
    salary: Optional[float] = None
    initiated_by_id: Optional[int] = None
    initiated_at: Optional[datetime] = None
    completed_by_id: Optional[int] = None
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None
    failure_reason: Optional[str] = None
    is_active: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ConversionInitiateRequest(BaseModel):
    """Request to initiate a conversion."""
    candidate_id: int
    department_id: Optional[int] = None
    job_position_id: Optional[int] = None
    reporting_manager_id: Optional[int] = None
    joining_date: Optional[date] = None
    employee_id_number: Optional[str] = None
    salary: Optional[float] = None
    notes: Optional[str] = None


class ConversionCompleteRequest(BaseModel):
    """Request to complete a conversion."""
    notes: Optional[str] = None


class ConversionLogResponse(BaseModel):
    """Response for a conversion log entry."""
    id: int
    conversion_id: int
    action: str
    performed_by_id: Optional[int] = None
    notes: Optional[str] = None
    extra_data: Optional[dict] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ============== Portal Schemas ==============

class PortalTokenRequest(BaseModel):
    """Request to generate a portal token."""
    candidate_id: int


class PortalTokenResponse(BaseModel):
    """Response with portal token."""
    id: int
    candidate_id: int
    token: str
    used: bool = False
    count: int = 0
    profile: Optional[dict] = None
    is_active: bool = True
    created_at: datetime

    class Config:
        from_attributes = True


# ============== Enhanced Dashboard ==============

class DashboardStatsResponse(BaseModel):
    """Enhanced dashboard stats response."""
    processes: dict = {}
    conversions: dict = {}
    pending_items: dict = {}
    by_stage: List[dict] = []
    by_department: List[dict] = []
    recent_processes: List[ProcessResponse] = []
