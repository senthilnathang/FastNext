"""
Product management API endpoints.

Provides CRUD operations for product management with proper authentication,
authorization, input validation, and error handling.
"""

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

# Error messages for consistency
ERROR_PRODUCT_NOT_FOUND = "Product not found"
ERROR_INVALID_PARAMETERS = "Invalid parameters provided"
ERROR_DATABASE_OPERATION = "Database operation failed"
ERROR_PERMISSION_DENIED = "Permission denied"


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
    """
    Retrieve paginated list of products with optional search filtering.

    Supports pagination and text search across product fields.
    Results are filtered based on user permissions.

    Args:
        skip: Number of records to skip (pagination offset)
        limit: Maximum number of records to return (1-100)
        search: Optional search term for filtering products
        current_user: Authenticated user making the request

    Returns:
        Paginated list of product responses

    Raises:
        HTTPException: If parameters are invalid or database operation fails
    """
    try:
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

    except Exception as e:
        # Log the error but don't expose internal details
        print(f"Error listing products: {type(e).__name__}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ERROR_DATABASE_OPERATION
        )


# Get single product
@router.get("/{id}", response_model=ProductResponse)
@require_permission("read", "product")
async def get_product(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Retrieve a specific product by its unique identifier.

    Args:
        id: The unique identifier of the product to retrieve
        current_user: Authenticated user making the request

    Returns:
        Product response data

    Raises:
        HTTPException: If product not found or access denied
    """
    try:
        return controller.get_by_id(db, current_user, id)
    except Exception as e:
        # Log the error but don't expose internal details
        print(f"Error retrieving product {id}: {type(e).__name__}")
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=ERROR_PRODUCT_NOT_FOUND
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ERROR_DATABASE_OPERATION
        )


# Create new product
@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
@require_permission("create", "product")
async def create_product(
    product_in: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Create a new product with the provided data.

    Args:
        product_in: Product creation data
        current_user: Authenticated user creating the product

    Returns:
        Created product response data

    Raises:
        HTTPException: If creation fails or validation errors occur
    """
    try:
        return controller.create(db, current_user, product_in)
    except Exception as e:
        # Log the error but don't expose internal details
        print(f"Error creating product: {type(e).__name__}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ERROR_DATABASE_OPERATION
        )


# Update product
@router.put("/{id}", response_model=ProductResponse)
@require_permission("update", "product")
async def update_product(
    id: int,
    product_in: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Update an existing product with new data.

    Args:
        id: The unique identifier of the product to update
        product_in: Updated product data (only provided fields will be updated)
        current_user: Authenticated user performing the update

    Returns:
        Updated product response data

    Raises:
        HTTPException: If product not found or update fails
    """
    try:
        return controller.update(db, current_user, id, product_in)
    except Exception as e:
        # Log the error but don't expose internal details
        print(f"Error updating product {id}: {type(e).__name__}")
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=ERROR_PRODUCT_NOT_FOUND
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ERROR_DATABASE_OPERATION
        )


# Delete product
@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
@require_permission("delete", "product")
async def delete_product(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Delete a product permanently.

    Args:
        id: The unique identifier of the product to delete
        current_user: Authenticated user performing the deletion

    Raises:
        HTTPException: If product not found or deletion fails
    """
    try:
        controller.delete(db, current_user, id)
    except Exception as e:
        # Log the error but don't expose internal details
        print(f"Error deleting product {id}: {type(e).__name__}")
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=ERROR_PRODUCT_NOT_FOUND
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ERROR_DATABASE_OPERATION
        )


# Toggle product deletion status
@router.patch("/{id}/toggle-delete", response_model=ProductResponse)
@require_permission("update", "product")
async def toggle_product_delete(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Toggle the soft delete status of a product.

    Switches the product's is_deleted flag between true and false.

    Args:
        id: The unique identifier of the product to toggle
        current_user: Authenticated user performing the operation

    Returns:
        Updated product data with new deletion status

    Raises:
        HTTPException: If product not found or operation fails
    """
    try:
        product = controller.get_by_id(db, current_user, id)
        product.is_deleted = not product.is_deleted
        db.commit()
        db.refresh(product)
        return product
    except Exception as e:
        # Log the error but don't expose internal details
        print(f"Error toggling product delete status {id}: {type(e).__name__}")
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=ERROR_PRODUCT_NOT_FOUND
            )
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ERROR_DATABASE_OPERATION
        )


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
    """
    Perform advanced search for products with pagination.

    Searches across product fields using the provided query string.

    Args:
        q: Search query string (required)
        skip: Number of records to skip (pagination offset)
        limit: Maximum number of records to return (1-100)
        current_user: Authenticated user performing the search

    Returns:
        Paginated list of matching product responses

    Raises:
        HTTPException: If search fails or parameters are invalid
    """
    try:
        # Advanced search logic implemented via controller
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

    except Exception as e:
        # Log the error but don't expose internal details
        print(f"Error searching products: {type(e).__name__}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ERROR_DATABASE_OPERATION
        )