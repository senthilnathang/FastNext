"""
Offboarding API Routes

REST API endpoints for offboarding management.
"""

from datetime import date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User

from ..models import (
    OffboardingStatus, ExitType, TaskStatus, FnFStatus,
    OffboardingEmployee, ResignationLetter,
)
from ..schemas.offboarding import (
    ExitReasonCreate, ExitReasonUpdate, ExitReasonResponse,
    OffboardingTemplateCreate, OffboardingTemplateUpdate, OffboardingTemplateResponse,
    OffboardingStageCreate, OffboardingStageUpdate, OffboardingStageResponse,
    TaskTemplateCreate, TaskTemplateUpdate, TaskTemplateResponse,
    OffboardingEmployeeCreate, OffboardingEmployeeUpdate,
    OffboardingEmployeeResponse, OffboardingEmployeeDetail,
    OffboardingTaskCreate, OffboardingTaskUpdate, OffboardingTaskResponse,
    AssetReturnCreate, AssetReturnUpdate, AssetReturnResponse,
    ExitInterviewUpdate, ExitInterviewResponse,
    FnFSettlementUpdate, FnFSettlementResponse,
    FnFComponentCreate, FnFComponentResponse,
    OffboardingDashboard,
    ResignationLetterCreate, ResignationLetterUpdate,
    OffboardingNoteCreate, OffboardingSettingUpdate,
)
from ..services.offboarding_service import OffboardingService

router = APIRouter()


def get_service(db: Session = Depends(get_db)) -> OffboardingService:
    return OffboardingService(db)


# ============== Exit Reason Endpoints ==============

@router.post("/exit-reasons", response_model=ExitReasonResponse, status_code=status.HTTP_201_CREATED)
def create_exit_reason(
    data: ExitReasonCreate,
    service: OffboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Create a new exit reason."""
    return service.create_exit_reason(data, current_user.current_company_id, current_user.id)


@router.get("/exit-reasons", response_model=List[ExitReasonResponse])
def list_exit_reasons(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    exit_type: Optional[ExitType] = None,
    service: OffboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """List exit reasons."""
    reasons, _ = service.list_exit_reasons(
        current_user.current_company_id,
        exit_type=exit_type,
        skip=skip,
        limit=limit
    )
    return reasons


# ============== Template Endpoints ==============

@router.post("/templates", response_model=OffboardingTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_template(
    data: OffboardingTemplateCreate,
    service: OffboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Create a new offboarding template."""
    return service.create_template(data, current_user.current_company_id, current_user.id)


@router.get("/templates", response_model=List[OffboardingTemplateResponse])
def list_templates(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    exit_type: Optional[ExitType] = None,
    service: OffboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """List offboarding templates."""
    templates, _ = service.list_templates(
        current_user.current_company_id,
        skip=skip,
        limit=limit,
        exit_type=exit_type
    )
    return templates


@router.get("/templates/{template_id}", response_model=OffboardingTemplateResponse)
def get_template(
    template_id: int,
    service: OffboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Get a template by ID."""
    template = service.get_template(template_id, current_user.current_company_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


# ============== Stage Endpoints ==============

@router.post("/stages", response_model=OffboardingStageResponse, status_code=status.HTTP_201_CREATED)
def create_stage(
    data: OffboardingStageCreate,
    service: OffboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Create a new stage."""
    return service.create_stage(data, current_user.current_company_id, current_user.id)


@router.get("/stages", response_model=List[OffboardingStageResponse])
def list_stages(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    service: OffboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """List offboarding stages."""
    stages, _ = service.list_stages(current_user.current_company_id, skip=skip, limit=limit)
    return stages


# ============== Offboarding Employee Endpoints ==============

@router.post("/employees", response_model=OffboardingEmployeeResponse, status_code=status.HTTP_201_CREATED)
def create_offboarding_employee(
    data: OffboardingEmployeeCreate,
    service: OffboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Create a new offboarding request."""
    return service.create_offboarding_employee(data, current_user.current_company_id, current_user.id)


@router.get("/", response_model=List[OffboardingEmployeeResponse])
@router.get("/list", response_model=List[OffboardingEmployeeResponse])
@router.get("/employees", response_model=List[OffboardingEmployeeResponse])
def list_offboarding_employees(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[OffboardingStatus] = None,
    exit_type: Optional[ExitType] = None,
    stage_id: Optional[int] = None,
    service: OffboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """List offboarding employees."""
    employees, _ = service.list_offboarding_employees(
        current_user.current_company_id,
        skip=skip,
        limit=limit,
        status=status,
        exit_type=exit_type,
        stage_id=stage_id
    )
    return employees


@router.get("/employees/{offboarding_id}", response_model=OffboardingEmployeeDetail)
def get_offboarding_employee(
    offboarding_id: int,
    service: OffboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Get an offboarding employee by ID with full details."""
    employee = service.get_offboarding_employee(offboarding_id, current_user.current_company_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Offboarding record not found")
    return employee


@router.put("/employees/{offboarding_id}", response_model=OffboardingEmployeeResponse)
def update_offboarding_employee(
    offboarding_id: int,
    data: OffboardingEmployeeUpdate,
    service: OffboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Update an offboarding employee."""
    employee = service.update_offboarding_employee(
        offboarding_id, data, current_user.current_company_id, current_user.id
    )
    if not employee:
        raise HTTPException(status_code=404, detail="Offboarding record not found")
    return employee


@router.post("/employees/{offboarding_id}/approve", response_model=OffboardingEmployeeResponse)
def approve_offboarding(
    offboarding_id: int,
    service: OffboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Approve an offboarding request."""
    employee = service.approve_offboarding(
        offboarding_id, current_user.current_company_id, current_user.id
    )
    if not employee:
        raise HTTPException(status_code=404, detail="Offboarding record not found or already processed")
    return employee


@router.post("/employees/{offboarding_id}/start", response_model=OffboardingEmployeeResponse)
def start_offboarding(
    offboarding_id: int,
    service: OffboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Start the offboarding process."""
    employee = service.start_offboarding(
        offboarding_id, current_user.current_company_id, current_user.id
    )
    if not employee:
        raise HTTPException(status_code=404, detail="Offboarding record not found or not approved")
    return employee


@router.post("/employees/{offboarding_id}/move-stage/{stage_id}", response_model=OffboardingEmployeeResponse)
def move_to_stage(
    offboarding_id: int,
    stage_id: int,
    service: OffboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Move an employee to a different stage."""
    employee = service.move_to_stage(
        offboarding_id, stage_id, current_user.current_company_id, current_user.id
    )
    if not employee:
        raise HTTPException(status_code=404, detail="Offboarding record or stage not found")
    return employee


# ============== Task Endpoints ==============

@router.post("/tasks", response_model=OffboardingTaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    data: OffboardingTaskCreate,
    service: OffboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Create a new task."""
    return service.create_task(data, current_user.current_company_id, current_user.id)


@router.get("/tasks", response_model=List[OffboardingTaskResponse])
def list_tasks(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    offboarding_employee_id: Optional[int] = None,
    assigned_to_id: Optional[int] = None,
    status: Optional[TaskStatus] = None,
    category: Optional[str] = None,
    service: OffboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """List tasks."""
    tasks, _ = service.list_tasks(
        current_user.current_company_id,
        offboarding_employee_id=offboarding_employee_id,
        assigned_to_id=assigned_to_id,
        status=status,
        category=category,
        skip=skip,
        limit=limit
    )
    return tasks


@router.get("/my-tasks", response_model=List[OffboardingTaskResponse])
def list_my_tasks(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[TaskStatus] = None,
    service: OffboardingService = Depends(get_service),
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


@router.get("/tasks/{task_id}", response_model=OffboardingTaskResponse)
def get_task(
    task_id: int,
    service: OffboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Get a task by ID."""
    task = service.get_task(task_id, current_user.current_company_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.post("/tasks/{task_id}/complete", response_model=OffboardingTaskResponse)
def complete_task(
    task_id: int,
    completion_notes: Optional[str] = None,
    service: OffboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Mark a task as completed."""
    task = service.complete_task(task_id, current_user.current_company_id, current_user.id, completion_notes)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


# ============== Asset Return Endpoints ==============

@router.post("/asset-returns", response_model=AssetReturnResponse, status_code=status.HTTP_201_CREATED)
def create_asset_return(
    data: AssetReturnCreate,
    service: OffboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Create a new asset return record."""
    return service.create_asset_return(data, current_user.current_company_id, current_user.id)


@router.get("/asset-returns", response_model=List[AssetReturnResponse])
def list_asset_returns(
    offboarding_employee_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    service: OffboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """List asset returns for an employee."""
    returns, _ = service.list_asset_returns(
        current_user.current_company_id,
        offboarding_employee_id=offboarding_employee_id,
        skip=skip,
        limit=limit
    )
    return returns


@router.post("/asset-returns/{asset_return_id}/mark-returned", response_model=AssetReturnResponse)
def mark_asset_returned(
    asset_return_id: int,
    condition: str = "good",
    condition_notes: Optional[str] = None,
    service: OffboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Mark an asset as returned."""
    asset_return = service.mark_asset_returned(
        asset_return_id, current_user.current_company_id, current_user.id, condition, condition_notes
    )
    if not asset_return:
        raise HTTPException(status_code=404, detail="Asset return not found")
    return asset_return


# ============== Exit Interview Endpoints ==============

@router.get("/exit-interviews/{offboarding_employee_id}", response_model=ExitInterviewResponse)
def get_exit_interview(
    offboarding_employee_id: int,
    service: OffboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Get exit interview for an employee."""
    interview = service.get_exit_interview(offboarding_employee_id, current_user.current_company_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Exit interview not found")
    return interview


@router.put("/exit-interviews/{interview_id}", response_model=ExitInterviewResponse)
def update_exit_interview(
    interview_id: int,
    data: ExitInterviewUpdate,
    service: OffboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Update exit interview."""
    interview = service.update_exit_interview(
        interview_id, data, current_user.current_company_id, current_user.id
    )
    if not interview:
        raise HTTPException(status_code=404, detail="Exit interview not found")
    return interview


# ============== FnF Settlement Endpoints ==============

@router.get("/fnf-settlements/{offboarding_employee_id}", response_model=FnFSettlementResponse)
def get_fnf_settlement(
    offboarding_employee_id: int,
    service: OffboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Get FnF settlement for an employee."""
    settlement = service.get_fnf_settlement(offboarding_employee_id, current_user.current_company_id)
    if not settlement:
        raise HTTPException(status_code=404, detail="FnF settlement not found")
    return settlement


@router.put("/fnf-settlements/{settlement_id}", response_model=FnFSettlementResponse)
def update_fnf_settlement(
    settlement_id: int,
    data: FnFSettlementUpdate,
    service: OffboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Update FnF settlement."""
    settlement = service.update_fnf_settlement(
        settlement_id, data, current_user.current_company_id, current_user.id
    )
    if not settlement:
        raise HTTPException(status_code=404, detail="FnF settlement not found")
    return settlement


@router.post("/fnf-settlements/{settlement_id}/approve-hr", response_model=FnFSettlementResponse)
def approve_fnf_hr(
    settlement_id: int,
    service: OffboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """HR approval for FnF settlement."""
    settlement = service.approve_fnf_hr(settlement_id, current_user.current_company_id, current_user.id)
    if not settlement:
        raise HTTPException(status_code=404, detail="FnF settlement not found")
    return settlement


@router.post("/fnf-settlements/{settlement_id}/approve-finance", response_model=FnFSettlementResponse)
def approve_fnf_finance(
    settlement_id: int,
    service: OffboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Finance approval for FnF settlement."""
    settlement = service.approve_fnf_finance(settlement_id, current_user.current_company_id, current_user.id)
    if not settlement:
        raise HTTPException(status_code=404, detail="FnF settlement not found")
    return settlement


@router.post("/fnf-settlements/{settlement_id}/mark-paid", response_model=FnFSettlementResponse)
def mark_fnf_paid(
    settlement_id: int,
    payment_date: date,
    payment_reference: str,
    service: OffboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Mark FnF settlement as paid."""
    settlement = service.mark_fnf_paid(
        settlement_id, current_user.current_company_id, current_user.id, payment_date, payment_reference
    )
    if not settlement:
        raise HTTPException(status_code=404, detail="FnF settlement not found")
    return settlement


# ============== Dashboard Endpoint ==============

@router.get("/dashboard", response_model=OffboardingDashboard)
def get_dashboard(
    service: OffboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Get offboarding dashboard data."""
    return service.get_dashboard(current_user.current_company_id)


# =========================================================================
# Resignation Letter Endpoints
# =========================================================================

@router.post("/resignations", response_model=None, status_code=201)
@router.post("/resignations/", response_model=None, status_code=201, include_in_schema=False)
def create_resignation(
    data: ResignationLetterCreate,
    service: OffboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    result = service.create_resignation(
        company_id=current_user.current_company_id,
        data=data.model_dump(),
        created_by_id=current_user.id,
    )
    return result


@router.get("/resignations", response_model=None)
@router.get("/resignations/", response_model=None, include_in_schema=False)
def list_resignations(
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    service: OffboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    skip = (page - 1) * page_size
    items, total = service.list_resignations(
        company_id=current_user.current_company_id,
        status=status,
        search=search,
        skip=skip,
        limit=page_size,
    )
    results = []
    for r in items:
        item = {
            "id": r.id,
            "employee_id": r.employee_id,
            "employee_name": f"{r.employee.first_name} {r.employee.last_name}" if r.employee else None,
            "department": r.employee.department.name if r.employee and r.employee.department else None,
            "position": r.employee.job_position.name if r.employee and r.employee.job_position else None,
            "title": r.title,
            "description": r.description,
            "planned_to_leave_on": str(r.planned_to_leave_on) if r.planned_to_leave_on else None,
            "status": r.status,
            "offboarding_employee_id": r.offboarding_employee_id,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        results.append(item)
    return {"items": results, "total": total, "page": page, "page_size": page_size}


@router.get("/resignations/{resignation_id}", response_model=None)
def get_resignation(
    resignation_id: int,
    service: OffboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    result = service.get_resignation(resignation_id, current_user.current_company_id)
    if not result:
        raise HTTPException(status_code=404, detail="Resignation not found")
    return result


@router.put("/resignations/{resignation_id}", response_model=None)
def update_resignation(
    resignation_id: int,
    data: ResignationLetterUpdate,
    service: OffboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    result = service.update_resignation(
        resignation_id, current_user.current_company_id, data.model_dump(exclude_unset=True)
    )
    if not result:
        raise HTTPException(status_code=404, detail="Resignation not found")
    return result


@router.delete("/resignations/{resignation_id}", status_code=204)
def delete_resignation(
    resignation_id: int,
    service: OffboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    if not service.delete_resignation(resignation_id, current_user.current_company_id):
        raise HTTPException(status_code=404, detail="Resignation not found")


@router.post("/resignations/{resignation_id}/approve", response_model=None)
def approve_resignation(
    resignation_id: int,
    offboarding_data: Optional[dict] = None,
    service: OffboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    # Find the employee record for the current user
    from modules.employee.models import Employee
    employee = service.db.query(Employee).filter(Employee.user_id == current_user.id).first()
    approved_by_id = employee.id if employee else None

    result = service.approve_resignation(
        resignation_id, current_user.current_company_id, approved_by_id, offboarding_data
    )
    if not result:
        raise HTTPException(status_code=404, detail="Resignation not found")
    return result


@router.post("/resignations/{resignation_id}/reject", response_model=None)
def reject_resignation(
    resignation_id: int,
    reason: Optional[str] = None,
    service: OffboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    result = service.reject_resignation(resignation_id, current_user.current_company_id, reason)
    if not result:
        raise HTTPException(status_code=404, detail="Resignation not found")
    return result


# =========================================================================
# Note Endpoints
# =========================================================================

@router.post("/notes", response_model=None, status_code=201)
@router.post("/notes/", response_model=None, status_code=201, include_in_schema=False)
def create_note(
    data: OffboardingNoteCreate,
    service: OffboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    from modules.employee.models import Employee
    employee = service.db.query(Employee).filter(Employee.user_id == current_user.id).first()
    note_by_id = employee.id if employee else None

    result = service.create_note(
        company_id=current_user.current_company_id,
        data=data.model_dump(),
        note_by_id=note_by_id,
    )
    return {
        "id": result.id,
        "offboarding_employee_id": result.offboarding_employee_id,
        "description": result.description,
        "note_by_id": result.note_by_id,
        "note_by_name": f"{result.note_by.first_name} {result.note_by.last_name}" if result.note_by else None,
        "created_at": result.created_at.isoformat() if result.created_at else None,
    }


@router.get("/notes", response_model=None)
@router.get("/notes/", response_model=None, include_in_schema=False)
def list_notes(
    offboarding_employee_id: int = Query(...),
    service: OffboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    notes = service.list_notes(offboarding_employee_id, current_user.current_company_id)
    return [
        {
            "id": n.id,
            "offboarding_employee_id": n.offboarding_employee_id,
            "description": n.description,
            "note_by_id": n.note_by_id,
            "note_by_name": f"{n.note_by.first_name} {n.note_by.last_name}" if n.note_by else None,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in notes
    ]


@router.delete("/notes/{note_id}", status_code=204)
def delete_note(
    note_id: int,
    service: OffboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    if not service.delete_note(note_id, current_user.current_company_id):
        raise HTTPException(status_code=404, detail="Note not found")


# =========================================================================
# Settings Endpoints
# =========================================================================

@router.get("/settings", response_model=None)
@router.get("/settings/", response_model=None, include_in_schema=False)
def get_settings(
    service: OffboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    setting = service.get_settings(current_user.current_company_id)
    return {"id": setting.id, "resignation_request_enabled": setting.resignation_request_enabled}


@router.post("/settings", response_model=None)
@router.post("/settings/", response_model=None, include_in_schema=False)
def update_settings(
    data: OffboardingSettingUpdate,
    service: OffboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    setting = service.update_settings(current_user.current_company_id, data.model_dump(exclude_unset=True))
    return {"id": setting.id, "resignation_request_enabled": setting.resignation_request_enabled}


# =========================================================================
# Stage Types Endpoint
# =========================================================================

@router.get("/stage-types", response_model=None)
def get_stage_types():
    return [
        {"value": "notice_period", "label": "Notice Period", "color": "#1890ff"},
        {"value": "interview", "label": "Exit Interview", "color": "#722ed1"},
        {"value": "handover", "label": "Work Handover", "color": "#faad14"},
        {"value": "fnf", "label": "FnF Settlement", "color": "#52c41a"},
        {"value": "other", "label": "Other", "color": "#13c2c2"},
        {"value": "archived", "label": "Archived", "color": "#8c8c8c"},
    ]


# =========================================================================
# Stats Endpoint
# =========================================================================

@router.get("/stats", response_model=None)
@router.get("/stats/", response_model=None, include_in_schema=False)
def get_stats(
    service: OffboardingService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    company_id = current_user.current_company_id
    db = service.db

    base = db.query(OffboardingEmployee).filter(
        OffboardingEmployee.company_id == company_id,
        OffboardingEmployee.deleted_at.is_(None),
    )

    from datetime import date, timedelta
    today = date.today()
    soon = today + timedelta(days=7)

    active_count = base.filter(OffboardingEmployee.status.in_(["approved", "in_progress"])).count()
    total_employees = base.count()

    # Count by stage type
    notice_count = 0
    interview_count = 0
    handover_count = 0
    fnf_count = 0
    archived_count = 0

    active_employees = base.filter(OffboardingEmployee.status.in_(["approved", "in_progress"])).all()
    for emp in active_employees:
        if emp.current_stage:
            # Check stage name pattern
            stage_name = (emp.current_stage.name or "").lower()
            if "notice" in stage_name:
                notice_count += 1
            elif "interview" in stage_name:
                interview_count += 1
            elif "handover" in stage_name or "transfer" in stage_name:
                handover_count += 1
            elif "fnf" in stage_name or "settlement" in stage_name:
                fnf_count += 1

    archived_count = base.filter(OffboardingEmployee.status == "completed").count()

    ending_soon = base.filter(
        OffboardingEmployee.last_working_day.isnot(None),
        OffboardingEmployee.last_working_day <= soon,
        OffboardingEmployee.last_working_day >= today,
        OffboardingEmployee.status.in_(["approved", "in_progress"]),
    ).count()

    pending_resignations = db.query(ResignationLetter).filter(
        ResignationLetter.company_id == company_id,
        ResignationLetter.deleted_at.is_(None),
        ResignationLetter.status == "requested",
    ).count()

    return {
        "active_processes": active_count,
        "total_employees": total_employees,
        "in_notice_period": notice_count,
        "in_interview": interview_count,
        "in_handover": handover_count,
        "in_fnf": fnf_count,
        "archived": archived_count,
        "pending_resignations": pending_resignations,
        "ending_soon": ending_soon,
    }
