from typing import List, Optional

from app.api.base_crud import BaseCRUDController, create_crud_routes
from app.auth.deps import get_current_active_user
from app.auth.permissions import require_permission
from app.db.session import get_db
from app.models.sales import Sales
from app.models.user import User
from app.schemas.sales import SalesCreate, SalesListResponse, SalesResponse, SalesUpdate
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

# Create CRUD controller
controller = BaseCRUDController[Sales, SalesCreate, SalesUpdate](
    model=Sales,
    resource_name="sales",
    owner_field="user_id" if True else None,
    project_field="project_id" if False else None,
)

# Create router
router = APIRouter()


# List saless
@router.get("/", response_model=SalesListResponse)
@require_permission("read", "sales")
async def list_saless(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(25, ge=1, le=1000, description="Number of items to return"),
    search: Optional[str] = Query(None, description="Search term"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get list of saless with pagination and search"""
    return await controller.get_list(
        db, current_user, skip=skip, limit=limit, search=search
    )


# Get single sales
@router.get("/{id}", response_model=SalesResponse)
@require_permission("read", "sales")
async def get_sales(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific sales by ID"""
    return await controller.get_by_id(db, current_user, id)


# Create new sales
@router.post("/", response_model=SalesResponse, status_code=status.HTTP_201_CREATED)
@require_permission("create", "sales")
async def create_sales(
    sales_in: SalesCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new sales"""
    return await controller.create(db, current_user, sales_in)


# Update sales
@router.put("/{id}", response_model=SalesResponse)
@require_permission("update", "sales")
async def update_sales(
    id: int,
    sales_in: SalesUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update an existing sales"""
    return await controller.update(db, current_user, id, sales_in)


# Delete sales
@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
@require_permission("delete", "sales")
async def delete_sales(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a sales"""
    await controller.delete(db, current_user, id)


# Search saless
@router.get("/search", response_model=SalesListResponse)
@require_permission("read", "sales")
async def search_saless(
    q: str = Query(..., description="Search query"),
    skip: int = Query(0, ge=0),
    limit: int = Query(25, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Advanced search for saless"""
    # TODO: Implement advanced search logic
    return await controller.get_list(db, current_user, skip=skip, limit=limit, search=q)
