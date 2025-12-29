"""Inbox schemas for unified inbox functionality"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from app.models.inbox import InboxItemType, InboxPriority
from app.schemas.label import LabelSummary


class ActorInfo(BaseModel):
    """Actor (sender) info for inbox item"""
    id: int
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

    model_config = {"from_attributes": True}


class InboxItemBase(BaseModel):
    """Base inbox item schema"""
    item_type: InboxItemType
    reference_type: str
    reference_id: int
    source_model: Optional[str] = None
    source_id: Optional[int] = None
    title: Optional[str] = None
    preview: Optional[str] = None
    priority: InboxPriority = InboxPriority.NORMAL


class InboxItemCreate(InboxItemBase):
    """Schema for creating an inbox item"""
    user_id: int
    actor_id: Optional[int] = None


class InboxItemUpdate(BaseModel):
    """Schema for updating an inbox item"""
    is_read: Optional[bool] = None
    is_archived: Optional[bool] = None
    is_starred: Optional[bool] = None
    priority: Optional[InboxPriority] = None


class MessagePreview(BaseModel):
    """Preview of a message for inbox"""
    id: int
    body: str
    message_type: str
    is_pinned: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationPreview(BaseModel):
    """Preview of a notification for inbox"""
    id: int
    title: str
    description: Optional[str] = None
    level: str
    link: Optional[str] = None

    model_config = {"from_attributes": True}


class ActivityPreview(BaseModel):
    """Preview of an activity log for inbox"""
    id: int
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    description: Optional[str] = None

    model_config = {"from_attributes": True}


class InboxItemResponse(InboxItemBase):
    """Inbox item response schema"""
    id: int
    user_id: int
    is_read: bool
    is_archived: bool
    is_starred: bool
    actor_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    actor: Optional[ActorInfo] = None

    # Labels attached to this inbox item
    labels: List[LabelSummary] = Field(default_factory=list)

    # Optional nested data (populated when fetching full details)
    message: Optional[MessagePreview] = None
    notification: Optional[NotificationPreview] = None
    activity: Optional[ActivityPreview] = None

    model_config = {"from_attributes": True}


class InboxCountByType(BaseModel):
    """Unread count per item type"""
    message: int = 0
    notification: int = 0
    activity: int = 0
    mention: int = 0


class InboxListResponse(BaseModel):
    """Paginated inbox list response"""
    total: int
    items: List[InboxItemResponse]
    page: int
    page_size: int
    unread_count: int = 0
    unread_by_type: InboxCountByType = Field(default_factory=InboxCountByType)


class InboxStats(BaseModel):
    """Inbox statistics"""
    total_count: int
    unread_count: int
    read_count: int
    archived_count: int
    starred_count: int
    unread_by_type: InboxCountByType


class BulkReadRequest(BaseModel):
    """Request to mark multiple inbox items as read"""
    item_ids: List[int] = Field(default_factory=list)
    item_type: Optional[InboxItemType] = None  # If provided, mark all of this type


class BulkArchiveRequest(BaseModel):
    """Request to archive multiple inbox items"""
    item_ids: List[int] = Field(default_factory=list)
    item_type: Optional[InboxItemType] = None  # If provided, archive all of this type


class BulkActionResponse(BaseModel):
    """Response for bulk operations"""
    message: str
    updated_count: int


class InboxFilters(BaseModel):
    """Filters for inbox queries"""
    item_type: Optional[InboxItemType] = None
    is_read: Optional[bool] = None
    is_archived: Optional[bool] = None
    is_starred: Optional[bool] = None
    priority: Optional[InboxPriority] = None
    source_model: Optional[str] = None
    source_id: Optional[int] = None
    label_ids: Optional[List[int]] = None
