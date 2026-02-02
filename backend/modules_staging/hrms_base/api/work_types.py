"""
Work Type API Routes

CRUD operations for work types.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User

from ..services.work_type_service import WorkTypeService
from ..schemas.work_type import (
    WorkTypeCreate,
    WorkTypeUpdate,
    WorkTypeResponse,
    WorkTypeList,
)

router = APIRouter(prefix="/work-types", tags=["Work Types"])


def get_service(db: Session = Depends(get_db)) -> WorkTypeService:
    return WorkTypeService(db)


@router.get("/", response_model=WorkTypeList)
def list_work_types(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    service: WorkTypeService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """List work types with filtering and pagination."""
    types, total = service.list_work_types(
        company_id=current_user.current_company_id,
        skip=skip,
        limit=limit,
        search=search,
        is_active=is_active,
    )
    return WorkTypeList(items=types, total=total, page=skip // limit + 1, page_size=limit)


@router.get("/{type_id}", response_model=WorkTypeResponse)
def get_work_type(
    type_id: int,
    service: WorkTypeService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Get a work type by ID."""
    work_type = service.get_work_type(type_id, current_user.current_company_id)
    if not work_type:
        raise HTTPException(status_code=404, detail="Work type not found")
    return work_type


@router.post("/", response_model=WorkTypeResponse, status_code=201)
def create_work_type(
    data: WorkTypeCreate,
    service: WorkTypeService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Create a new work type."""
    return service.create_work_type(data, current_user.current_company_id, current_user.id)


@router.put("/{type_id}", response_model=WorkTypeResponse)
def update_work_type(
    type_id: int,
    data: WorkTypeUpdate,
    service: WorkTypeService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Update a work type."""
    work_type = service.update_work_type(type_id, data, current_user.current_company_id, current_user.id)
    if not work_type:
        raise HTTPException(status_code=404, detail="Work type not found")
    return work_type


@router.delete("/{type_id}", status_code=204)
def delete_work_type(
    type_id: int,
    service: WorkTypeService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Delete a work type."""
    if not service.delete_work_type(type_id, current_user.current_company_id, current_user.id):
        raise HTTPException(status_code=404, detail="Work type not found")
    return None
