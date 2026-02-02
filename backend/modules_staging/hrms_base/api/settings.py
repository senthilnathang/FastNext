"""
Settings API Routes

CRUD operations for HRMS settings, stages, and statuses.
"""

from typing import Optional, Any, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User

from ..services.settings_service import SettingsService
from ..schemas.settings import (
    HRMSSettingsCreate,
    HRMSSettingsUpdate,
    HRMSSettingsResponse,
    StageDefinitionCreate,
    StageDefinitionUpdate,
    StageDefinitionResponse,
    StatusDefinitionCreate,
    StatusDefinitionUpdate,
    StatusDefinitionResponse,
    StatusTransitionCreate,
    StatusTransitionResponse,
)

router = APIRouter(prefix="/settings", tags=["Settings"])


def get_service(db: Session = Depends(get_db)) -> SettingsService:
    return SettingsService(db)


# HRMS Settings Routes
@router.get("/", response_model=List[HRMSSettingsResponse])
def list_settings(
    module: Optional[str] = None,
    category: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    service: SettingsService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """List HRMS settings."""
    settings, _ = service.list_settings(
        company_id=current_user.current_company_id,
        module=module,
        category=category,
        skip=skip,
        limit=limit,
    )
    return settings


@router.get("/{key}", response_model=HRMSSettingsResponse)
def get_setting(
    key: str,
    module: str = "hrms_base",
    service: SettingsService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Get a setting by key."""
    setting = service.get_setting(key, current_user.current_company_id, module)
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    return setting


@router.post("/", response_model=HRMSSettingsResponse, status_code=201)
def set_setting(
    data: HRMSSettingsCreate,
    service: SettingsService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Create or update a setting."""
    return service.set_setting(data, current_user.current_company_id, current_user.id)


@router.delete("/{key}", status_code=204)
def delete_setting(
    key: str,
    module: str = "hrms_base",
    service: SettingsService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Delete a setting."""
    if not service.delete_setting(key, current_user.current_company_id, module):
        raise HTTPException(status_code=404, detail="Setting not found or is a system setting")
    return None


# Stage Definition Routes
@router.get("/stages/{model_name}", response_model=List[StageDefinitionResponse])
def list_stages(
    model_name: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    service: SettingsService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """List stage definitions for a model."""
    stages, _ = service.list_stages(
        company_id=current_user.current_company_id,
        model_name=model_name,
        skip=skip,
        limit=limit,
    )
    return stages


@router.post("/stages/", response_model=StageDefinitionResponse, status_code=201)
def create_stage(
    data: StageDefinitionCreate,
    service: SettingsService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Create a stage definition."""
    return service.create_stage(data, current_user.current_company_id, current_user.id)


@router.put("/stages/{stage_id}", response_model=StageDefinitionResponse)
def update_stage(
    stage_id: int,
    data: StageDefinitionUpdate,
    service: SettingsService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Update a stage definition."""
    stage = service.update_stage(stage_id, data, current_user.current_company_id, current_user.id)
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")
    return stage


# Status Definition Routes
@router.get("/statuses/{model_name}", response_model=List[StatusDefinitionResponse])
def list_statuses(
    model_name: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    service: SettingsService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """List status definitions for a model."""
    statuses, _ = service.list_statuses(
        company_id=current_user.current_company_id,
        model_name=model_name,
        skip=skip,
        limit=limit,
    )
    return statuses


@router.post("/statuses/", response_model=StatusDefinitionResponse, status_code=201)
def create_status(
    data: StatusDefinitionCreate,
    service: SettingsService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Create a status definition."""
    return service.create_status(data, current_user.current_company_id, current_user.id)


# Status Transition Routes
@router.get("/transitions/", response_model=List[StatusTransitionResponse])
def list_transitions(
    from_status_id: Optional[int] = None,
    service: SettingsService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """List available status transitions."""
    return service.list_transitions(
        company_id=current_user.current_company_id,
        from_status_id=from_status_id,
    )


@router.post("/transitions/", response_model=StatusTransitionResponse, status_code=201)
def create_transition(
    data: StatusTransitionCreate,
    service: SettingsService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Create a status transition."""
    return service.create_transition(data, current_user.current_company_id, current_user.id)
