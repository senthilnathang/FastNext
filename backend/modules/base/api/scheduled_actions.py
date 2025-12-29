"""
Scheduled Action API Routes

Endpoints for managing scheduled actions (cron jobs).
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_current_superuser, get_db
from app.models.user import User

from ..models.scheduled_action import ScheduledAction, ScheduledActionLog
from ..services.scheduled_action_service import ScheduledActionService

router = APIRouter(prefix="/scheduled-actions", tags=["Scheduled Actions"])


# -------------------------------------------------------------------------
# Response Models
# -------------------------------------------------------------------------


class ScheduledActionResponse(BaseModel):
    """Scheduled action information."""

    id: int
    name: str
    code: str
    module_name: Optional[str] = None
    model_name: Optional[str] = None
    method_name: str
    interval_number: int
    interval_type: str
    cron_expression: Optional[str] = None
    next_run: Optional[datetime] = None
    last_run: Optional[datetime] = None
    last_run_status: Optional[str] = None
    last_run_duration: Optional[int] = None
    priority: int
    is_active: bool

    class Config:
        from_attributes = True


class ScheduledActionCreate(BaseModel):
    """Create scheduled action request."""

    code: str
    name: str
    method_name: str
    model_name: Optional[str] = None
    module_name: Optional[str] = None
    interval_number: int = 1
    interval_type: str = "days"
    cron_expression: Optional[str] = None
    python_code: Optional[str] = None
    method_args: List[Any] = []
    method_kwargs: Dict[str, Any] = {}
    priority: int = 10
    max_retries: int = 3


class ScheduledActionUpdate(BaseModel):
    """Update scheduled action request."""

    name: Optional[str] = None
    method_name: Optional[str] = None
    interval_number: Optional[int] = None
    interval_type: Optional[str] = None
    cron_expression: Optional[str] = None
    python_code: Optional[str] = None
    priority: Optional[int] = None
    max_retries: Optional[int] = None
    is_active: Optional[bool] = None


class ExecutionLogResponse(BaseModel):
    """Execution log entry."""

    id: int
    action_code: str
    started_at: datetime
    finished_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    status: str
    error_message: Optional[str] = None
    records_processed: int = 0

    class Config:
        from_attributes = True


class RunResult(BaseModel):
    """Result of running an action."""

    action_code: str
    status: str
    result: Optional[Any] = None
    error: Optional[str] = None


# -------------------------------------------------------------------------
# Endpoints
# -------------------------------------------------------------------------


@router.get("/", response_model=List[ScheduledActionResponse])
def list_scheduled_actions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    active_only: bool = Query(True),
) -> List[ScheduledActionResponse]:
    """List all scheduled actions."""
    query = db.query(ScheduledAction)

    if active_only:
        query = query.filter(ScheduledAction.is_active == True)

    actions = query.order_by(ScheduledAction.priority, ScheduledAction.next_run).all()
    return [ScheduledActionResponse.model_validate(a) for a in actions]


@router.get("/due", response_model=List[ScheduledActionResponse])
def list_due_actions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
    limit: int = Query(100, ge=1, le=1000),
) -> List[ScheduledActionResponse]:
    """List actions that are due for execution."""
    service = ScheduledActionService(db)
    actions = service.get_due_actions(limit)
    return [ScheduledActionResponse.model_validate(a) for a in actions]


@router.get("/{code}", response_model=ScheduledActionResponse)
def get_scheduled_action(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ScheduledActionResponse:
    """Get a scheduled action by code."""
    service = ScheduledActionService(db)
    action = service.get_action(code)

    if not action:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scheduled action '{code}' not found",
        )

    return ScheduledActionResponse.model_validate(action)


@router.post("/", response_model=ScheduledActionResponse)
def create_scheduled_action(
    data: ScheduledActionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> ScheduledActionResponse:
    """Create a new scheduled action."""
    service = ScheduledActionService(db)

    # Check for existing
    existing = service.get_action(data.code)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Scheduled action with code '{data.code}' already exists",
        )

    action = service.create_action(
        code=data.code,
        name=data.name,
        method_name=data.method_name,
        model_name=data.model_name,
        module_name=data.module_name,
        interval_number=data.interval_number,
        interval_type=data.interval_type,
        cron_expression=data.cron_expression,
        priority=data.priority,
        max_retries=data.max_retries,
    )

    return ScheduledActionResponse.model_validate(action)


@router.put("/{code}", response_model=ScheduledActionResponse)
def update_scheduled_action(
    code: str,
    data: ScheduledActionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> ScheduledActionResponse:
    """Update a scheduled action."""
    service = ScheduledActionService(db)
    action = service.get_action(code)

    if not action:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scheduled action '{code}' not found",
        )

    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(action, key, value)

    db.commit()
    db.refresh(action)

    return ScheduledActionResponse.model_validate(action)


@router.delete("/{code}")
def delete_scheduled_action(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> dict:
    """Delete a scheduled action."""
    service = ScheduledActionService(db)
    action = service.get_action(code)

    if not action:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scheduled action '{code}' not found",
        )

    db.delete(action)
    db.commit()

    return {"status": "success", "message": f"Scheduled action '{code}' deleted"}


@router.post("/{code}/run", response_model=RunResult)
def run_scheduled_action(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> RunResult:
    """Manually run a scheduled action."""
    service = ScheduledActionService(db)
    result = service.run_by_code(code)

    return RunResult(
        action_code=code,
        status=result.get("status", "unknown"),
        result=result.get("result"),
        error=result.get("error"),
    )


@router.post("/run-due", response_model=List[RunResult])
def run_due_actions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> List[RunResult]:
    """Run all due scheduled actions."""
    service = ScheduledActionService(db)
    results = service.run_due_actions()

    return [
        RunResult(
            action_code=r.get("action_code", "unknown"),
            status=r.get("status", "unknown"),
            result=r.get("result"),
            error=r.get("error"),
        )
        for r in results
    ]


@router.get("/{code}/history", response_model=List[ExecutionLogResponse])
def get_execution_history(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    limit: int = Query(50, ge=1, le=500),
) -> List[ExecutionLogResponse]:
    """Get execution history for a scheduled action."""
    service = ScheduledActionService(db)
    logs = service.get_execution_history(code, limit)
    return [ExecutionLogResponse.model_validate(log) for log in logs]


@router.post("/cleanup-logs")
def cleanup_old_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
    days: int = Query(30, ge=1, le=365),
) -> dict:
    """Delete old execution logs."""
    service = ScheduledActionService(db)
    deleted = service.cleanup_old_logs(days)
    return {"status": "success", "deleted_count": deleted}
