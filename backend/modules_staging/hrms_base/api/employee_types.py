"""
Employee Type API Routes

CRUD operations for employee types.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User

from ..services.employee_type_service import EmployeeTypeService
from ..schemas.employee_type import (
    EmployeeTypeCreate,
    EmployeeTypeUpdate,
    EmployeeTypeResponse,
    EmployeeTypeList,
)

router = APIRouter(prefix="/employee-types", tags=["Employee Types"])


def get_service(db: Session = Depends(get_db)) -> EmployeeTypeService:
    return EmployeeTypeService(db)


@router.get("/", response_model=EmployeeTypeList)
def list_employee_types(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    service: EmployeeTypeService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """List employee types with filtering and pagination."""
    types, total = service.list(
        company_id=current_user.current_company_id,
        skip=skip,
        limit=limit,
        search=search,
        is_active=is_active,
    )
    return EmployeeTypeList(items=types, total=total, page=skip // limit + 1, page_size=limit)


@router.get("/{type_id}", response_model=EmployeeTypeResponse)
def get_employee_type(
    type_id: int,
    service: EmployeeTypeService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Get an employee type by ID."""
    emp_type = service.get(type_id, current_user.current_company_id)
    if not emp_type:
        raise HTTPException(status_code=404, detail="Employee type not found")
    return emp_type


@router.post("/", response_model=EmployeeTypeResponse, status_code=201)
def create_employee_type(
    data: EmployeeTypeCreate,
    service: EmployeeTypeService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Create a new employee type."""
    return service.create(data, current_user.current_company_id, current_user.id)


@router.put("/{type_id}", response_model=EmployeeTypeResponse)
def update_employee_type(
    type_id: int,
    data: EmployeeTypeUpdate,
    service: EmployeeTypeService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Update an employee type."""
    emp_type = service.update(type_id, data, current_user.current_company_id, current_user.id)
    if not emp_type:
        raise HTTPException(status_code=404, detail="Employee type not found")
    return emp_type


@router.delete("/{type_id}", status_code=204)
def delete_employee_type(
    type_id: int,
    service: EmployeeTypeService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Delete an employee type."""
    if not service.delete(type_id, current_user.current_company_id, current_user.id):
        raise HTTPException(status_code=404, detail="Employee type not found")
    return None
