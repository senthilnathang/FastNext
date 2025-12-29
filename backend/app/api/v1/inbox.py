"""Inbox API endpoints

REST API for unified inbox operations with filtering and stats.
"""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.inbox import InboxItem, InboxItemType, InboxPriority
from app.services.inbox_service import get_inbox_service


router = APIRouter(prefix="/inbox", tags=["inbox"])


# =============================================================================
# SCHEMAS
# =============================================================================

class InboxItemUpdate(BaseModel):
    """Schema for updating an inbox item."""
    is_read: Optional[bool] = None
    is_archived: Optional[bool] = None
    is_starred: Optional[bool] = None
    priority: Optional[str] = None


class InboxItemResponse(BaseModel):
    """Schema for inbox item response."""
    id: int
    user_id: int
    item_type: str
    reference_type: str
    reference_id: int
    source_model: Optional[str]
    source_id: Optional[int]
    title: str
    preview: Optional[str]
    is_read: bool
    is_archived: bool
    is_starred: bool
    priority: str
    actor_id: Optional[int]
    created_at: Optional[str]
    read_at: Optional[str]
    archived_at: Optional[str]
    actor: Optional[dict] = None
    label_ids: Optional[List[int]] = None
    reference_data: Optional[dict] = None

    class Config:
        from_attributes = True


class InboxListResponse(BaseModel):
    """Schema for paginated inbox list."""
    items: List[InboxItemResponse]
    total: int
    page: int
    page_size: int
    unread_count: int


class InboxStatsResponse(BaseModel):
    """Schema for inbox statistics."""
    total_count: int
    unread_count: int
    read_count: int
    archived_count: int
    starred_count: int
    unread_by_type: dict


class BulkReadRequest(BaseModel):
    """Schema for bulk read request."""
    item_ids: Optional[List[int]] = None
    item_type: Optional[str] = None


class BulkArchiveRequest(BaseModel):
    """Schema for bulk archive request."""
    item_ids: Optional[List[int]] = None
    item_type: Optional[str] = None


class BulkActionResponse(BaseModel):
    """Schema for bulk action response."""
    message: str
    updated_count: int


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_current_user_id(db: Session) -> Optional[int]:
    """Get current user ID from request context."""
    return None


def require_auth(db: Session) -> int:
    """Require authentication and return user ID."""
    user_id = get_current_user_id(db)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    return user_id


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("/", response_model=InboxListResponse)
def list_inbox(
    item_type: Optional[str] = None,
    is_read: Optional[bool] = None,
    is_archived: bool = False,
    is_starred: Optional[bool] = None,
    priority: Optional[str] = None,
    source_model: Optional[str] = None,
    source_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Get unified inbox with filters.

    Supports filtering by type, read status, archived, starred, priority, and source.
    """
    user_id = require_auth(db)

    # Parse enums
    type_enum = None
    if item_type:
        try:
            type_enum = InboxItemType(item_type)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid item_type: {item_type}",
            )

    priority_enum = None
    if priority:
        try:
            priority_enum = InboxPriority(priority)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid priority: {priority}",
            )

    service = get_inbox_service(db)

    offset = (page - 1) * page_size
    items = service.get_unified_inbox(
        user_id=user_id,
        item_type=type_enum,
        is_read=is_read,
        is_archived=is_archived,
        is_starred=is_starred,
        priority=priority_enum,
        source_model=source_model,
        source_id=source_id,
        limit=page_size,
        offset=offset,
    )

    # Get total count (simplified - in production use a count query)
    total = len(items) + offset

    # Get unread count
    unread_count = InboxItem.get_unread_count(db, user_id)

    return InboxListResponse(
        items=[InboxItemResponse(**item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        unread_count=unread_count,
    )


@router.get("/search", response_model=InboxListResponse)
def search_inbox(
    q: str = Query(..., min_length=1),
    item_type: Optional[str] = None,
    is_read: Optional[bool] = None,
    is_archived: bool = False,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    label_ids: Optional[str] = None,  # Comma-separated
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Search inbox with full-text search on title and preview.
    """
    user_id = require_auth(db)

    # Parse enums
    type_enum = None
    if item_type:
        try:
            type_enum = InboxItemType(item_type)
        except ValueError:
            pass

    # Parse label IDs
    label_id_list = None
    if label_ids:
        try:
            label_id_list = [int(x) for x in label_ids.split(",")]
        except ValueError:
            pass

    service = get_inbox_service(db)

    offset = (page - 1) * page_size
    items = service.search_inbox(
        user_id=user_id,
        query=q,
        item_type=type_enum,
        is_read=is_read,
        is_archived=is_archived,
        date_from=date_from,
        date_to=date_to,
        label_ids=label_id_list,
        limit=page_size,
        offset=offset,
    )

    total = len(items) + offset
    unread_count = InboxItem.get_unread_count(db, user_id)

    return InboxListResponse(
        items=[InboxItemResponse(**item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        unread_count=unread_count,
    )


@router.get("/stats", response_model=InboxStatsResponse)
def get_stats(
    db: Session = Depends(get_db),
):
    """Get inbox statistics."""
    user_id = require_auth(db)

    service = get_inbox_service(db)
    stats = service.get_stats(user_id)

    return InboxStatsResponse(**stats)


@router.get("/{item_id}", response_model=InboxItemResponse)
def get_item(
    item_id: int,
    db: Session = Depends(get_db),
):
    """Get a single inbox item with full details."""
    user_id = require_auth(db)

    service = get_inbox_service(db)
    item = service.get_item(item_id, user_id)

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inbox item not found",
        )

    return InboxItemResponse(**item)


@router.patch("/{item_id}", response_model=InboxItemResponse)
def update_item(
    item_id: int,
    data: InboxItemUpdate,
    db: Session = Depends(get_db),
):
    """Update an inbox item status."""
    user_id = require_auth(db)

    item = db.query(InboxItem).filter(
        InboxItem.id == item_id,
        InboxItem.user_id == user_id,
    ).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inbox item not found",
        )

    # Update fields
    if data.is_read is not None:
        if data.is_read:
            item.mark_as_read()
        else:
            item.mark_as_unread()

    if data.is_archived is not None:
        if data.is_archived:
            item.archive()
        else:
            item.unarchive()

    if data.is_starred is not None:
        if data.is_starred:
            item.star()
        else:
            item.unstar()

    if data.priority:
        try:
            item.priority = InboxPriority(data.priority)
        except ValueError:
            pass

    db.commit()

    return InboxItemResponse(**item.to_dict())


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
):
    """Delete an inbox item."""
    user_id = require_auth(db)

    service = get_inbox_service(db)
    success = service.delete_item(item_id, user_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inbox item not found",
        )


@router.post("/bulk-read", response_model=BulkActionResponse)
def bulk_mark_read(
    data: BulkReadRequest,
    db: Session = Depends(get_db),
):
    """Mark multiple items as read."""
    user_id = require_auth(db)

    # Parse item type
    type_enum = None
    if data.item_type:
        try:
            type_enum = InboxItemType(data.item_type)
        except ValueError:
            pass

    service = get_inbox_service(db)
    count = service.bulk_mark_read(
        user_id=user_id,
        item_ids=data.item_ids,
        item_type=type_enum,
    )

    return BulkActionResponse(
        message="Items marked as read",
        updated_count=count,
    )


@router.post("/bulk-archive", response_model=BulkActionResponse)
def bulk_archive(
    data: BulkArchiveRequest,
    db: Session = Depends(get_db),
):
    """Archive multiple items."""
    user_id = require_auth(db)

    # Parse item type
    type_enum = None
    if data.item_type:
        try:
            type_enum = InboxItemType(data.item_type)
        except ValueError:
            pass

    service = get_inbox_service(db)
    count = service.bulk_archive(
        user_id=user_id,
        item_ids=data.item_ids,
        item_type=type_enum,
    )

    return BulkActionResponse(
        message="Items archived",
        updated_count=count,
    )


@router.post("/{item_id}/read", status_code=status.HTTP_204_NO_CONTENT)
def mark_item_read(
    item_id: int,
    db: Session = Depends(get_db),
):
    """Mark a specific item as read."""
    user_id = require_auth(db)

    service = get_inbox_service(db)
    success = service.mark_read(item_id, user_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inbox item not found",
        )


@router.post("/{item_id}/unread", status_code=status.HTTP_204_NO_CONTENT)
def mark_item_unread(
    item_id: int,
    db: Session = Depends(get_db),
):
    """Mark a specific item as unread."""
    user_id = require_auth(db)

    service = get_inbox_service(db)
    success = service.mark_unread(item_id, user_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inbox item not found",
        )


@router.post("/{item_id}/archive", status_code=status.HTTP_204_NO_CONTENT)
def archive_item(
    item_id: int,
    db: Session = Depends(get_db),
):
    """Archive an item."""
    user_id = require_auth(db)

    service = get_inbox_service(db)
    success = service.archive(item_id, user_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inbox item not found",
        )


@router.post("/{item_id}/unarchive", status_code=status.HTTP_204_NO_CONTENT)
def unarchive_item(
    item_id: int,
    db: Session = Depends(get_db),
):
    """Unarchive an item."""
    user_id = require_auth(db)

    service = get_inbox_service(db)
    success = service.unarchive(item_id, user_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inbox item not found",
        )


@router.post("/{item_id}/star", status_code=status.HTTP_204_NO_CONTENT)
def star_item(
    item_id: int,
    db: Session = Depends(get_db),
):
    """Star an item."""
    user_id = require_auth(db)

    service = get_inbox_service(db)
    success = service.star(item_id, user_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inbox item not found",
        )


@router.post("/{item_id}/unstar", status_code=status.HTTP_204_NO_CONTENT)
def unstar_item(
    item_id: int,
    db: Session = Depends(get_db),
):
    """Unstar an item."""
    user_id = require_auth(db)

    service = get_inbox_service(db)
    success = service.unstar(item_id, user_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inbox item not found",
        )
