"""
Job Role API Routes

CRUD operations for job roles.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User

from ..services.job_role_service import JobRoleService
from ..schemas.job_role import (
    JobRoleCreate,
    JobRoleUpdate,
    JobRoleResponse,
    JobRoleList,
)

router = APIRouter(prefix="/job-roles", tags=["Job Roles"])


def get_service(db: Session = Depends(get_db)) -> JobRoleService:
    return JobRoleService(db)


@router.get("/", response_model=JobRoleList)
def list_job_roles(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    level: Optional[int] = None,
    is_active: Optional[bool] = None,
    service: JobRoleService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """List job roles with filtering and pagination."""
    roles, total = service.list(
        company_id=current_user.current_company_id,
        skip=skip,
        limit=limit,
        search=search,
        level=level,
        is_active=is_active,
    )
    return JobRoleList(items=roles, total=total, page=skip // limit + 1, page_size=limit)


@router.get("/{role_id}", response_model=JobRoleResponse)
def get_job_role(
    role_id: int,
    service: JobRoleService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Get a job role by ID."""
    role = service.get(role_id, current_user.current_company_id)
    if not role:
        raise HTTPException(status_code=404, detail="Job role not found")
    return role


@router.post("/", response_model=JobRoleResponse, status_code=201)
def create_job_role(
    data: JobRoleCreate,
    service: JobRoleService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Create a new job role."""
    return service.create(data, current_user.current_company_id, current_user.id)


@router.put("/{role_id}", response_model=JobRoleResponse)
def update_job_role(
    role_id: int,
    data: JobRoleUpdate,
    service: JobRoleService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Update a job role."""
    role = service.update(role_id, data, current_user.current_company_id, current_user.id)
    if not role:
        raise HTTPException(status_code=404, detail="Job role not found")
    return role


@router.delete("/{role_id}", status_code=204)
def delete_job_role(
    role_id: int,
    service: JobRoleService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Delete a job role."""
    if not service.delete(role_id, current_user.current_company_id, current_user.id):
        raise HTTPException(status_code=404, detail="Job role not found")
    return None
