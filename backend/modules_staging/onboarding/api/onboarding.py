"""
Onboarding API Routes

REST API endpoints for onboarding management.
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User

from ..models import OnboardingStatus, TaskStatus, DocumentStatus
from ..schemas.onboarding import (
    OnboardingTemplateCreate, OnboardingTemplateUpdate, OnboardingTemplateResponse,
    OnboardingStageCreate, OnboardingStageUpdate, OnboardingStageResponse,
    TaskTemplateCreate, TaskTemplateUpdate, TaskTemplateResponse,
    DocumentTypeCreate, DocumentTypeUpdate, DocumentTypeResponse,
    OnboardingEmployeeCreate, OnboardingEmployeeUpdate,
    OnboardingEmployeeResponse, OnboardingEmployeeDetail,
    OnboardingTaskCreate, OnboardingTaskUpdate, OnboardingTaskResponse,
    OnboardingDocumentCreate, OnboardingDocumentUpdate, OnboardingDocumentResponse,
    OnboardingDashboard,
    ProcessCreateFromTemplate, ProcessUpdate, ProcessResponse, ProcessDetailResponse,
    ProcessStageResponse, ProcessTaskResponse,
    VerificationRequirementCreate, VerificationRequirementUpdate, VerificationRequirementResponse,
    CandidateVerificationResponse, VerificationActionRequest,
    ConversionResponse, ConversionInitiateRequest, ConversionCompleteRequest, ConversionLogResponse,
    PortalTokenRequest, PortalTokenResponse,
    DashboardStatsResponse,
)
from ..services.onboarding_service import OnboardingService

router = APIRouter()


def get_service(db: Session = Depends(get_db)) -> OnboardingService:
    return OnboardingService(db)


# ============== Template Endpoints ==============

@router.post("/templates", response_model=OnboardingTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_template(
    data: OnboardingTemplateCreate,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Create a new onboarding template."""
    return service.create_template(data, current_user.current_company_id, current_user.id)


@router.get("/templates", response_model=List[OnboardingTemplateResponse])
def list_templates(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    is_active: Optional[bool] = None,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """List onboarding templates."""
    templates, _ = service.list_templates(
        current_user.current_company_id,
        skip=skip,
        limit=limit,
        is_active=is_active
    )
    return templates


@router.get("/templates/{template_id}", response_model=OnboardingTemplateResponse)
def get_template(
    template_id: int,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Get a template by ID."""
    template = service.get_template(template_id, current_user.current_company_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.put("/templates/{template_id}", response_model=OnboardingTemplateResponse)
def update_template(
    template_id: int,
    data: OnboardingTemplateUpdate,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Update a template."""
    template = service.update_template(template_id, data, current_user.current_company_id, current_user.id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(
    template_id: int,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Delete a template."""
    if not service.delete_template(template_id, current_user.current_company_id, current_user.id):
        raise HTTPException(status_code=404, detail="Template not found")


# ============== Stage Endpoints ==============

@router.post("/stages", response_model=OnboardingStageResponse, status_code=status.HTTP_201_CREATED)
def create_stage(
    data: OnboardingStageCreate,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Create a new stage."""
    return service.create_stage(data, current_user.current_company_id, current_user.id)


@router.get("/stages", response_model=List[OnboardingStageResponse])
def list_stages(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """List onboarding stages."""
    stages, _ = service.list_stages(current_user.current_company_id, skip=skip, limit=limit)
    return stages


@router.get("/stages/{stage_id}", response_model=OnboardingStageResponse)
def get_stage(
    stage_id: int,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Get a stage by ID."""
    stage = service.get_stage(stage_id, current_user.current_company_id)
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")
    return stage


@router.put("/stages/{stage_id}", response_model=OnboardingStageResponse)
def update_stage(
    stage_id: int,
    data: OnboardingStageUpdate,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Update a stage."""
    stage = service.update_stage(stage_id, data, current_user.current_company_id, current_user.id)
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")
    return stage


# ============== Task Template Endpoints ==============

@router.post("/task-templates", response_model=TaskTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_task_template(
    data: TaskTemplateCreate,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Create a new task template."""
    return service.create_task_template(data, current_user.current_company_id, current_user.id)


@router.get("/task-templates", response_model=List[TaskTemplateResponse])
def list_task_templates(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """List task templates."""
    templates, _ = service.list_task_templates(current_user.current_company_id, skip=skip, limit=limit)
    return templates


@router.get("/task-templates/{template_id}", response_model=TaskTemplateResponse)
def get_task_template(
    template_id: int,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Get a task template by ID."""
    template = service.get_task_template(template_id, current_user.current_company_id)
    if not template:
        raise HTTPException(status_code=404, detail="Task template not found")
    return template


# ============== Document Type Endpoints ==============

@router.post("/document-types", response_model=DocumentTypeResponse, status_code=status.HTTP_201_CREATED)
def create_document_type(
    data: DocumentTypeCreate,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Create a new document type."""
    return service.create_document_type(data, current_user.current_company_id, current_user.id)


@router.get("/document-types", response_model=List[DocumentTypeResponse])
def list_document_types(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """List document types."""
    doc_types, _ = service.list_document_types(current_user.current_company_id, skip=skip, limit=limit)
    return doc_types


@router.get("/document-types/{doc_type_id}", response_model=DocumentTypeResponse)
def get_document_type(
    doc_type_id: int,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Get a document type by ID."""
    doc_type = service.get_document_type(doc_type_id, current_user.current_company_id)
    if not doc_type:
        raise HTTPException(status_code=404, detail="Document type not found")
    return doc_type


# ============== Onboarding Employee Endpoints ==============

@router.post("/employees", response_model=OnboardingEmployeeResponse, status_code=status.HTTP_201_CREATED)
def create_onboarding_employee(
    data: OnboardingEmployeeCreate,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Create a new onboarding employee."""
    return service.create_onboarding_employee(data, current_user.current_company_id, current_user.id)


@router.get("/", response_model=List[OnboardingEmployeeResponse])
@router.get("/list", response_model=List[OnboardingEmployeeResponse])
@router.get("/employees", response_model=List[OnboardingEmployeeResponse])
def list_onboarding_employees(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[OnboardingStatus] = None,
    stage_id: Optional[int] = None,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """List onboarding employees."""
    employees, _ = service.list_onboarding_employees(
        current_user.current_company_id,
        skip=skip,
        limit=limit,
        status=status,
        stage_id=stage_id
    )
    return employees


@router.get("/employees/{employee_id}", response_model=OnboardingEmployeeDetail)
def get_onboarding_employee(
    employee_id: int,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Get an onboarding employee by ID with full details."""
    employee = service.get_onboarding_employee(employee_id, current_user.current_company_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Onboarding employee not found")
    return employee


@router.put("/employees/{employee_id}", response_model=OnboardingEmployeeResponse)
def update_onboarding_employee(
    employee_id: int,
    data: OnboardingEmployeeUpdate,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Update an onboarding employee."""
    employee = service.update_onboarding_employee(
        employee_id, data, current_user.current_company_id, current_user.id
    )
    if not employee:
        raise HTTPException(status_code=404, detail="Onboarding employee not found")
    return employee


@router.post("/employees/{employee_id}/move-stage/{stage_id}", response_model=OnboardingEmployeeResponse)
def move_employee_to_stage(
    employee_id: int,
    stage_id: int,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Move an employee to a different stage."""
    employee = service.move_to_stage(
        employee_id, stage_id, current_user.current_company_id, current_user.id
    )
    if not employee:
        raise HTTPException(status_code=404, detail="Employee or stage not found")
    return employee


# ============== Task Endpoints ==============

@router.post("/tasks", response_model=OnboardingTaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    data: OnboardingTaskCreate,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Create a new task."""
    return service.create_task(data, current_user.current_company_id, current_user.id)


@router.get("/tasks", response_model=List[OnboardingTaskResponse])
def list_tasks(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    onboarding_employee_id: Optional[int] = None,
    assigned_to_id: Optional[int] = None,
    status: Optional[TaskStatus] = None,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """List tasks."""
    tasks, _ = service.list_tasks(
        current_user.current_company_id,
        onboarding_employee_id=onboarding_employee_id,
        assigned_to_id=assigned_to_id,
        status=status,
        skip=skip,
        limit=limit
    )
    return tasks


@router.get("/my-tasks", response_model=List[OnboardingTaskResponse])
def list_my_tasks(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[TaskStatus] = None,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """List tasks assigned to the current user."""
    tasks, _ = service.list_tasks(
        current_user.current_company_id,
        assigned_to_id=current_user.id,
        status=status,
        skip=skip,
        limit=limit
    )
    return tasks


@router.get("/tasks/{task_id}", response_model=OnboardingTaskResponse)
def get_task(
    task_id: int,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Get a task by ID."""
    task = service.get_task(task_id, current_user.current_company_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.put("/tasks/{task_id}", response_model=OnboardingTaskResponse)
def update_task(
    task_id: int,
    data: OnboardingTaskUpdate,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Update a task."""
    task = service.update_task(task_id, data, current_user.current_company_id, current_user.id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.post("/tasks/{task_id}/complete", response_model=OnboardingTaskResponse)
def complete_task(
    task_id: int,
    completion_notes: Optional[str] = None,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Mark a task as completed."""
    task = service.complete_task(task_id, current_user.current_company_id, current_user.id, completion_notes)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.post("/tasks/{task_id}/approve", response_model=OnboardingTaskResponse)
def approve_task(
    task_id: int,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Approve a completed task."""
    task = service.approve_task(task_id, current_user.current_company_id, current_user.id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found or doesn't require approval")
    return task


# ============== Document Endpoints ==============

@router.post("/documents", response_model=OnboardingDocumentResponse, status_code=status.HTTP_201_CREATED)
def create_document(
    data: OnboardingDocumentCreate,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Create a new document."""
    return service.create_document(data, current_user.current_company_id, current_user.id)


@router.get("/documents", response_model=List[OnboardingDocumentResponse])
def list_documents(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    onboarding_employee_id: Optional[int] = None,
    status: Optional[DocumentStatus] = None,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """List documents."""
    documents, _ = service.list_documents(
        current_user.current_company_id,
        onboarding_employee_id=onboarding_employee_id,
        status=status,
        skip=skip,
        limit=limit
    )
    return documents


@router.get("/documents/{document_id}", response_model=OnboardingDocumentResponse)
def get_document(
    document_id: int,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Get a document by ID."""
    document = service.get_document(document_id, current_user.current_company_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


@router.post("/documents/{document_id}/approve", response_model=OnboardingDocumentResponse)
def approve_document(
    document_id: int,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Approve a document."""
    document = service.review_document(
        document_id, DocumentStatus.APPROVED, current_user.current_company_id, current_user.id
    )
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


@router.post("/documents/{document_id}/reject", response_model=OnboardingDocumentResponse)
def reject_document(
    document_id: int,
    rejection_reason: str,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Reject a document."""
    document = service.review_document(
        document_id, DocumentStatus.REJECTED, current_user.current_company_id, current_user.id, rejection_reason
    )
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


# ============== Dashboard Endpoint ==============

@router.get("/dashboard", response_model=OnboardingDashboard)
def get_dashboard(
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Get onboarding dashboard data."""
    return service.get_dashboard(current_user.current_company_id)


# ============== Checklist Endpoints ==============

@router.post("/checklists/{checklist_id}/toggle")
def toggle_checklist_item(
    checklist_id: int,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Toggle a checklist item completion status."""
    checklist = service.toggle_checklist_item(checklist_id, current_user.current_company_id, current_user.id)
    if not checklist:
        raise HTTPException(status_code=404, detail="Checklist item not found")
    return {"id": checklist.id, "is_completed": checklist.is_completed}


# ============== Process Endpoints ==============

@router.get("/processes", response_model=None)
@router.get("/processes/", response_model=None, include_in_schema=False)
def list_processes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[str] = None,
    candidate_id: Optional[int] = None,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """List onboarding processes."""
    processes, total = service.list_processes(
        current_user.current_company_id,
        skip=skip, limit=limit, status=status, candidate_id=candidate_id,
    )
    return {"items": processes, "total": total}


@router.get("/processes/{process_id}", response_model=None)
def get_process(
    process_id: int,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Get a process with stages and tasks."""
    process = service.get_process_detail(process_id, current_user.current_company_id)
    if not process:
        raise HTTPException(status_code=404, detail="Process not found")
    return process


@router.post("/processes", response_model=None, status_code=status.HTTP_201_CREATED)
@router.post("/processes/", response_model=None, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_process(
    data: ProcessCreateFromTemplate,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Create a new onboarding process from a template."""
    process = service.create_process_from_template(
        candidate_id=data.candidate_id,
        template_id=data.template_id,
        company_id=current_user.current_company_id,
        user_id=current_user.id,
        start_date=data.start_date,
        expected_end_date=data.expected_end_date,
        joining_date=data.joining_date,
        mentor_id=data.mentor_id,
        hr_manager_id=data.hr_manager_id,
        hiring_manager_id=data.hiring_manager_id,
        notes=data.notes,
    )
    if not process:
        raise HTTPException(status_code=400, detail="Template not found or invalid")
    return process


@router.put("/processes/{process_id}", response_model=None)
def update_process(
    process_id: int,
    data: ProcessUpdate,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Update a process."""
    process = service.update_process(
        process_id, data.model_dump(exclude_unset=True),
        current_user.current_company_id, current_user.id,
    )
    if not process:
        raise HTTPException(status_code=404, detail="Process not found")
    return process


@router.post("/processes/{process_id}/calculate-progress", response_model=None)
def calculate_progress(
    process_id: int,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Recalculate process progress."""
    process = service.get_process(process_id, current_user.current_company_id)
    if not process:
        raise HTTPException(status_code=404, detail="Process not found")
    process = service.calculate_process_progress(process)
    service.db.commit()
    return {"overall_progress": process.overall_progress, "tasks_progress": process.tasks_progress, "documents_progress": process.documents_progress}


@router.post("/processes/{process_id}/stages/{stage_id}/move", response_model=None)
def move_to_stage(
    process_id: int,
    stage_id: int,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Move process to a different stage."""
    process = service.move_process_to_stage(
        process_id, stage_id, current_user.current_company_id, current_user.id,
    )
    if not process:
        raise HTTPException(status_code=404, detail="Process or stage not found")
    return process


# ============== Process Stage/Task Endpoints ==============

@router.patch("/process-stages/{stage_id}", response_model=None)
def update_process_stage(
    stage_id: int,
    data: dict,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Update a process stage."""
    stage = service.update_process_stage(
        stage_id, data, current_user.current_company_id, current_user.id,
    )
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")
    return stage


@router.patch("/process-tasks/{task_id}", response_model=None)
def update_process_task(
    task_id: int,
    data: dict,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Update a process task."""
    task = service.update_process_task(
        task_id, data, current_user.current_company_id, current_user.id,
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


# ============== Verification Endpoints ==============

@router.get("/verification-requirements", response_model=None)
@router.get("/verification-requirements/", response_model=None, include_in_schema=False)
def list_verification_requirements(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """List verification requirements."""
    items, total = service.list_verification_requirements(
        current_user.current_company_id, skip=skip, limit=limit,
    )
    return {"items": items, "total": total}


@router.post("/verification-requirements", response_model=None, status_code=status.HTTP_201_CREATED)
def create_verification_requirement(
    data: VerificationRequirementCreate,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Create a verification requirement."""
    return service.create_verification_requirement(
        data.model_dump(), current_user.current_company_id, current_user.id,
    )


@router.put("/verification-requirements/{req_id}", response_model=None)
def update_verification_requirement(
    req_id: int,
    data: VerificationRequirementUpdate,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Update a verification requirement."""
    req = service.update_verification_requirement(
        req_id, data.model_dump(exclude_unset=True),
        current_user.current_company_id, current_user.id,
    )
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")
    return req


@router.get("/verifications", response_model=None)
@router.get("/verifications/", response_model=None, include_in_schema=False)
def list_verifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    candidate_id: Optional[int] = None,
    status: Optional[str] = None,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """List candidate verifications."""
    items, total = service.list_candidate_verifications(
        current_user.current_company_id,
        candidate_id=candidate_id, status=status, skip=skip, limit=limit,
    )
    return {"items": items, "total": total}


@router.post("/verifications/{verification_id}/pass", response_model=None)
def pass_verification(
    verification_id: int,
    data: VerificationActionRequest,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Mark a verification as passed."""
    result = service.pass_verification(
        verification_id, current_user.current_company_id, current_user.id,
        notes=data.notes, external_reference=data.external_reference,
        external_report_url=data.external_report_url,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Verification not found")
    return result


@router.post("/verifications/{verification_id}/fail", response_model=None)
def fail_verification(
    verification_id: int,
    data: VerificationActionRequest,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Mark a verification as failed."""
    result = service.fail_verification(
        verification_id, current_user.current_company_id, current_user.id,
        notes=data.notes,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Verification not found")
    return result


# ============== Conversion Endpoints ==============

@router.get("/conversions", response_model=None)
@router.get("/conversions/", response_model=None, include_in_schema=False)
def list_conversions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[str] = None,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """List conversions."""
    items, total = service.list_conversions(
        current_user.current_company_id, status=status, skip=skip, limit=limit,
    )
    return {"items": items, "total": total}


@router.get("/conversions/{conversion_id}", response_model=None)
def get_conversion(
    conversion_id: int,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Get a conversion by ID."""
    conversion = service.get_conversion(conversion_id, current_user.current_company_id)
    if not conversion:
        raise HTTPException(status_code=404, detail="Conversion not found")
    return conversion


@router.post("/conversions/{conversion_id}/check-readiness", response_model=None)
def check_readiness(
    conversion_id: int,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Check conversion readiness."""
    conversion = service.check_conversion_readiness(
        conversion_id, current_user.current_company_id,
    )
    if not conversion:
        raise HTTPException(status_code=404, detail="Conversion not found")
    return conversion


@router.post("/conversions/initiate", response_model=None, status_code=status.HTTP_201_CREATED)
@router.post("/conversions/initiate/", response_model=None, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def initiate_conversion(
    data: ConversionInitiateRequest,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Initiate a candidate-to-employee conversion."""
    return service.initiate_conversion(
        data.model_dump(), current_user.current_company_id, current_user.id,
    )


@router.post("/conversions/{conversion_id}/complete", response_model=None)
def complete_conversion(
    conversion_id: int,
    data: ConversionCompleteRequest,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Complete a conversion."""
    conversion = service.complete_conversion(
        conversion_id, current_user.current_company_id, current_user.id,
        notes=data.notes,
    )
    if not conversion:
        raise HTTPException(status_code=404, detail="Conversion not found")
    return conversion


@router.get("/conversions/{conversion_id}/logs", response_model=None)
def get_conversion_logs(
    conversion_id: int,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Get conversion logs."""
    logs = service.get_conversion_logs(
        conversion_id, current_user.current_company_id,
    )
    return logs


# ============== Portal Endpoints ==============

@router.post("/portal/generate-token", response_model=None, status_code=status.HTTP_201_CREATED)
@router.post("/portal/generate-token/", response_model=None, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def generate_portal_token(
    data: PortalTokenRequest,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Generate a portal access token."""
    return service.generate_portal_token(
        data.candidate_id, current_user.current_company_id, current_user.id,
    )


# ============== Template Clone ==============

@router.post("/templates/{template_id}/clone", response_model=None, status_code=status.HTTP_201_CREATED)
def clone_template(
    template_id: int,
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Clone a template."""
    clone = service.clone_template(
        template_id, current_user.current_company_id, current_user.id,
    )
    if not clone:
        raise HTTPException(status_code=404, detail="Template not found")
    return clone


# ============== Enhanced Dashboard ==============

@router.get("/dashboard/stats", response_model=None)
@router.get("/dashboard/stats/", response_model=None, include_in_schema=False)
def get_dashboard_stats(
    service: OnboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Get enhanced dashboard statistics."""
    return service.get_dashboard_stats(current_user.current_company_id)


@router.get("/stage-types", response_model=None)
@router.get("/stage-types/", response_model=None, include_in_schema=False)
def get_stage_types(
    current_user: User = Depends(get_current_user),
):
    """Get available stage type options."""
    return [
        {"value": "documentation", "label": "Documentation"},
        {"value": "training", "label": "Training"},
        {"value": "orientation", "label": "Orientation"},
        {"value": "it_setup", "label": "IT Setup"},
        {"value": "hr_formalities", "label": "HR Formalities"},
        {"value": "team_introduction", "label": "Team Introduction"},
        {"value": "compliance", "label": "Compliance"},
        {"value": "custom", "label": "Custom"},
    ]
