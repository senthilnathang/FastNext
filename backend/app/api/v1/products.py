from typing import List, Optional

from app.api.base_crud import BaseCRUDController, create_crud_routes
from app.auth.deps import get_current_active_user
from app.auth.permissions import require_permission
from app.db.session import get_db
from app.models.product import Product
from app.models.user import User
from app.schemas.product import (
    ProductCreate,
    ProductListResponse,
    ProductResponse,
    ProductUpdate,
)
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

# Create CRUD controller
controller = BaseCRUDController[Product, ProductCreate, ProductUpdate](
    model=Product, resource_name="product", owner_field="owner_id", project_field=None
)

# Create router
router = APIRouter()


# List products
@router.get("/", response_model=ProductListResponse)
@require_permission("read", "product")
async def list_products(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(25, ge=1, le=100, description="Number of items to return"),
    search: Optional[str] = Query(None, description="Search term"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get list of products with pagination and search"""
    filters = {}
    if search:
        filters["search"] = search

    products = controller.get_list(
        db, current_user, skip=skip, limit=limit, filters=filters
    )

    # Get total count for pagination
    total_query = db.query(controller.model)
    if filters:
        for field, value in filters.items():
            if hasattr(controller.model, field) and value is not None:
                total_query = total_query.filter(
                    getattr(controller.model, field) == value
                )

    # Filter by owner if needed (same logic as get_list)
    if not controller._check_permission(db, current_user, "manage"):
        if hasattr(controller.model, controller.owner_field):
            total_query = total_query.filter(
                getattr(controller.model, controller.owner_field) == current_user.id
            )

    total = total_query.count()

    return ProductListResponse(items=products, total=total, skip=skip, limit=limit)


# Get single product
@router.get("/{id}", response_model=ProductResponse)
@require_permission("read", "product")
async def get_product(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific product by ID"""
    return controller.get_by_id(db, current_user, id)


# Create new product
@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
@require_permission("create", "product")
async def create_product(
    product_in: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new product"""
    return controller.create(db, current_user, product_in)


# Update product
@router.put("/{id}", response_model=ProductResponse)
@require_permission("update", "product")
async def update_product(
    id: int,
    product_in: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update an existing product"""
    return controller.update(db, current_user, id, product_in)


# Delete product
@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
@require_permission("delete", "product")
async def delete_product(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a product"""
    controller.delete(db, current_user, id)


# Toggle product deletion status
@router.patch("/{id}/toggle-delete", response_model=ProductResponse)
@require_permission("update", "product")
async def toggle_product_delete(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Toggle soft delete status of a product"""
    product = controller.get_by_id(db, current_user, id)
    product.is_deleted = not product.is_deleted
    db.commit()
    db.refresh(product)
    return product


# Search products
@router.get("/search", response_model=ProductListResponse)
@require_permission("read", "product")
async def search_products(
    q: str = Query(..., description="Search query"),
    skip: int = Query(0, ge=0),
    limit: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Advanced search for products"""
    # TODO: Implement advanced search logic
    filters = {"search": q} if q else {}

    products = controller.get_list(
        db, current_user, skip=skip, limit=limit, filters=filters
    )

    # Get total count for pagination
    total_query = db.query(controller.model)
    if filters:
        for field, value in filters.items():
            if hasattr(controller.model, field) and value is not None:
                total_query = total_query.filter(
                    getattr(controller.model, field) == value
                )

    # Filter by owner if needed (same logic as get_list)
    if not controller._check_permission(db, current_user, "manage"):
        if hasattr(controller.model, controller.owner_field):
            total_query = total_query.filter(
                getattr(controller.model, controller.owner_field) == current_user.id
            )

    total = total_query.count()

    return ProductListResponse(items=products, total=total, skip=skip, limit=limit)