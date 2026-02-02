"""
Job Position API Routes

CRUD operations for job positions.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User

from ..services.job_position_service import JobPositionService
from ..schemas.job_position import (
    JobPositionCreate,
    JobPositionUpdate,
    JobPositionResponse,
    JobPositionList,
)

router = APIRouter(prefix="/job-positions", tags=["Job Positions"])


def get_service(db: Session = Depends(get_db)) -> JobPositionService:
    return JobPositionService(db)


@router.get("/", response_model=JobPositionList)
def list_job_positions(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    department_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    service: JobPositionService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """List job positions with filtering and pagination."""
    positions, total = service.list(
        company_id=current_user.current_company_id,
        skip=skip,
        limit=limit,
        search=search,
        department_id=department_id,
        is_active=is_active,
    )
    return JobPositionList(items=positions, total=total, page=skip // limit + 1, page_size=limit)


@router.get("/{position_id}", response_model=JobPositionResponse)
def get_job_position(
    position_id: int,
    service: JobPositionService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Get a job position by ID."""
    position = service.get(position_id, current_user.current_company_id)
    if not position:
        raise HTTPException(status_code=404, detail="Job position not found")
    return position


@router.post("/", response_model=JobPositionResponse, status_code=201)
def create_job_position(
    data: JobPositionCreate,
    service: JobPositionService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Create a new job position."""
    return service.create(data, current_user.current_company_id, current_user.id)


@router.put("/{position_id}", response_model=JobPositionResponse)
def update_job_position(
    position_id: int,
    data: JobPositionUpdate,
    service: JobPositionService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Update a job position."""
    position = service.update(position_id, data, current_user.current_company_id, current_user.id)
    if not position:
        raise HTTPException(status_code=404, detail="Job position not found")
    return position


@router.delete("/{position_id}", status_code=204)
def delete_job_position(
    position_id: int,
    service: JobPositionService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Delete a job position."""
    if not service.delete(position_id, current_user.current_company_id, current_user.id):
        raise HTTPException(status_code=404, detail="Job position not found")
    return None
