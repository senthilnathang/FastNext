"""
Department API Routes

CRUD operations for departments.
"""

from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User

from ..services.department_service import DepartmentService
from ..schemas.department import (
    DepartmentCreate,
    DepartmentUpdate,
    DepartmentResponse,
    DepartmentList,
    DepartmentTree,
)

router = APIRouter(prefix="/departments", tags=["Departments"])


def get_service(db: Session = Depends(get_db)) -> DepartmentService:
    return DepartmentService(db)


@router.get("/", response_model=DepartmentList)
@router.get("/list", response_model=DepartmentList)
def list_departments(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    parent_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    service: DepartmentService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """List departments with filtering and pagination."""
    departments, total = service.list(
        company_id=current_user.current_company_id,
        skip=skip,
        limit=limit,
        search=search,
        parent_id=parent_id,
        is_active=is_active,
    )
    return DepartmentList(items=departments, total=total, page=skip // limit + 1, page_size=limit)


@router.get("/tree", response_model=List[DepartmentTree])
def get_department_tree(
    parent_id: Optional[int] = None,
    service: DepartmentService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Get departments as a tree structure."""
    def build_tree(departments: list) -> List[DepartmentTree]:
        result = []
        for dept in departments:
            children = service.get_tree(current_user.current_company_id, dept.id)
            tree_item = DepartmentTree(
                id=dept.id,
                name=dept.name,
                code=dept.code,
                parent_id=dept.parent_id,
                manager_id=dept.manager_id,
                color=dept.color,
                is_active=dept.is_active,
                children=build_tree(children)
            )
            result.append(tree_item)
        return result

    root_departments = service.get_tree(current_user.current_company_id, parent_id)
    return build_tree(root_departments)


@router.get("/{department_id}", response_model=DepartmentResponse)
def get_department(
    department_id: int,
    service: DepartmentService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Get a department by ID."""
    department = service.get(department_id, current_user.current_company_id)
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    return department


@router.post("/", response_model=DepartmentResponse, status_code=201)
def create_department(
    data: DepartmentCreate,
    service: DepartmentService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Create a new department."""
    return service.create(data, current_user.current_company_id, current_user.id)


@router.put("/{department_id}", response_model=DepartmentResponse)
def update_department(
    department_id: int,
    data: DepartmentUpdate,
    service: DepartmentService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Update a department."""
    department = service.update(department_id, data, current_user.current_company_id, current_user.id)
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    return department


@router.delete("/{department_id}", status_code=204)
def delete_department(
    department_id: int,
    service: DepartmentService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Delete a department."""
    if not service.delete(department_id, current_user.current_company_id, current_user.id):
        raise HTTPException(status_code=404, detail="Department not found")
    return None
