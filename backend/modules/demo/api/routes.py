"""
Demo Module API Routes

API endpoints for demo item management.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.models.user import User

from ..schemas.demo_item import (
    DemoItemCreate,
    DemoItemUpdate,
    DemoItemResponse,
    DemoItemList,
)
from ..services.demo_service import DemoService

router = APIRouter(prefix="/demo-items", tags=["Demo Items"])


def get_demo_service(db: Session = Depends(get_db)) -> DemoService:
    """Get demo service instance."""
    return DemoService(db)


@router.get("/", response_model=DemoItemList)
def list_items(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(20, ge=1, le=100, description="Max items to return"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    service: DemoService = Depends(get_demo_service),
    current_user: User = Depends(get_current_active_user),
) -> DemoItemList:
    """
    List all demo items with pagination.

    Supports filtering by active status.
    """
    items, total = service.get_all(
        skip=skip,
        limit=limit,
        is_active=is_active,
        company_id=current_user.current_company_id,
    )

    return DemoItemList(
        items=[DemoItemResponse.model_validate(item) for item in items],
        total=total,
        page=(skip // limit) + 1,
        page_size=limit,
    )


@router.get("/{item_id}", response_model=DemoItemResponse)
def get_item(
    item_id: int,
    service: DemoService = Depends(get_demo_service),
    current_user: User = Depends(get_current_active_user),
) -> DemoItemResponse:
    """Get a demo item by ID."""
    item = service.get_by_id(item_id)

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Demo item with id {item_id} not found",
        )

    return DemoItemResponse.model_validate(item)


@router.get("/code/{code}", response_model=DemoItemResponse)
def get_item_by_code(
    code: str,
    service: DemoService = Depends(get_demo_service),
    current_user: User = Depends(get_current_active_user),
) -> DemoItemResponse:
    """Get a demo item by code."""
    item = service.get_by_code(code)

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Demo item with code '{code}' not found",
        )

    return DemoItemResponse.model_validate(item)


@router.post("/", response_model=DemoItemResponse, status_code=status.HTTP_201_CREATED)
def create_item(
    data: DemoItemCreate,
    service: DemoService = Depends(get_demo_service),
    current_user: User = Depends(get_current_active_user),
) -> DemoItemResponse:
    """Create a new demo item."""
    try:
        item = service.create(
            data=data,
            company_id=current_user.current_company_id,
            user_id=current_user.id,
        )
        return DemoItemResponse.model_validate(item)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.put("/{item_id}", response_model=DemoItemResponse)
def update_item(
    item_id: int,
    data: DemoItemUpdate,
    service: DemoService = Depends(get_demo_service),
    current_user: User = Depends(get_current_active_user),
) -> DemoItemResponse:
    """Update a demo item."""
    item = service.update(item_id, data)

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Demo item with id {item_id} not found",
        )

    return DemoItemResponse.model_validate(item)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(
    item_id: int,
    service: DemoService = Depends(get_demo_service),
    current_user: User = Depends(get_current_active_user),
) -> None:
    """Delete a demo item."""
    deleted = service.delete(item_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Demo item with id {item_id} not found",
        )


@router.post("/{item_id}/toggle-active", response_model=DemoItemResponse)
def toggle_item_active(
    item_id: int,
    service: DemoService = Depends(get_demo_service),
    current_user: User = Depends(get_current_active_user),
) -> DemoItemResponse:
    """Toggle the active status of a demo item."""
    item = service.toggle_active(item_id)

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Demo item with id {item_id} not found",
        )

    return DemoItemResponse.model_validate(item)
