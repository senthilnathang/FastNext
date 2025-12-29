"""Bookmark schemas"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class BookmarkCreate(BaseModel):
    """Schema for creating a bookmark"""
    bookmark_type: str = Field(..., description="Type: message, notification, activity, inbox_item")
    reference_id: int
    note: Optional[str] = None


class BookmarkUpdate(BaseModel):
    """Schema for updating a bookmark"""
    note: Optional[str] = None


class BookmarkResponse(BaseModel):
    """Single bookmark response"""
    id: int
    user_id: int
    bookmark_type: str
    reference_id: int
    note: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class BookmarkToggleRequest(BaseModel):
    """Request to toggle a bookmark"""
    bookmark_type: str
    reference_id: int
    note: Optional[str] = None


class BookmarkToggleResponse(BaseModel):
    """Response for toggle bookmark"""
    action: str  # 'added' or 'removed'
    bookmark_type: str
    reference_id: int
    bookmark: Optional[BookmarkResponse] = None


class BookmarkListResponse(BaseModel):
    """List of bookmarks"""
    items: List[BookmarkResponse]
    total: int


class BookmarkCheckRequest(BaseModel):
    """Request to check if items are bookmarked"""
    bookmark_type: str
    reference_ids: List[int]


class BookmarkCheckResponse(BaseModel):
    """Response for bookmark check"""
    bookmarked: dict  # {reference_id: bool}
