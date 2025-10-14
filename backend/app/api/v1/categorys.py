from typing import List, Optional

from app.api.base_crud import BaseCRUDController, create_crud_routes
from app.auth.deps import get_current_active_user
from app.auth.permissions import require_permission
from app.db.session import get_db
from app.models.category import Category
from app.models.user import User
from app.schemas.category import (
    CategoryCreate,
    CategoryListResponse,
    CategoryResponse,
    CategoryUpdate,
)
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

# Create CRUD controller
controller = BaseCRUDController[Category, CategoryCreate, CategoryUpdate](
    model=Category,
    resource_name="category",
    owner_field="user_id" if True else None,
    project_field="project_id" if False else None,
)

# Create router
router = APIRouter()


# List categorys
@router.get("/", response_model=CategoryListResponse)
@require_permission("read", "category")
async def list_categorys(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(25, ge=1, le=1000, description="Number of items to return"),
    search: Optional[str] = Query(None, description="Search term"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get list of categorys with pagination and search"""
    return await controller.get_list(
        db, current_user, skip=skip, limit=limit, search=search
    )


# Get single category
@router.get("/{id}", response_model=CategoryResponse)
@require_permission("read", "category")
async def get_category(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific category by ID"""
    return await controller.get_by_id(db, current_user, id)


# Create new category
@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
@require_permission("create", "category")
async def create_category(
    category_in: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new category"""
    return await controller.create(db, current_user, category_in)


# Update category
@router.put("/{id}", response_model=CategoryResponse)
@require_permission("update", "category")
async def update_category(
    id: int,
    category_in: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update an existing category"""
    return await controller.update(db, current_user, id, category_in)


# Delete category
@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
@require_permission("delete", "category")
async def delete_category(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a category"""
    await controller.delete(db, current_user, id)


# Search categorys
@router.get("/search", response_model=CategoryListResponse)
@require_permission("read", "category")
async def search_categorys(
    q: str = Query(..., description="Search query"),
    skip: int = Query(0, ge=0),
    limit: int = Query(25, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Advanced search for categorys"""
    # TODO: Implement advanced search logic
    return await controller.get_list(db, current_user, skip=skip, limit=limit, search=q)