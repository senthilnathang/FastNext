"""Notification schemas"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from app.models.notification import NotificationLevel


class ActorInfo(BaseModel):
    """Actor (sender) info for notification"""
    id: int
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

    model_config = {"from_attributes": True}


class NotificationBase(BaseModel):
    """Base notification schema"""
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    level: NotificationLevel = NotificationLevel.INFO
    link: Optional[str] = None
    data: Dict[str, Any] = Field(default_factory=dict)


class NotificationCreate(NotificationBase):
    """Schema for creating a notification"""
    user_id: int


class NotificationUpdate(BaseModel):
    """Schema for updating a notification"""
    is_read: Optional[bool] = None


class NotificationResponse(NotificationBase):
    """Notification response schema"""
    id: int
    user_id: int
    is_read: bool
    actor_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    actor: Optional[ActorInfo] = None

    model_config = {"from_attributes": True}


class NotificationList(BaseModel):
    """Paginated notification list response"""
    total: int
    items: List[NotificationResponse]
    page: int
    page_size: int
    unread_count: int = 0


class BulkReadRequest(BaseModel):
    """Request to mark multiple notifications as read"""
    notification_ids: List[int] = Field(default_factory=list)


class BulkReadResponse(BaseModel):
    """Response for bulk read operation"""
    message: str
    updated_count: int


class BulkDeleteRequest(BaseModel):
    """Request to delete multiple notifications"""
    notification_ids: List[int]


class BulkDeleteResponse(BaseModel):
    """Response for bulk delete operation"""
    message: str
    deleted_count: int


class SendNotificationRequest(BaseModel):
    """Request to send notifications to users"""
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    level: NotificationLevel = NotificationLevel.INFO
    user_ids: List[int] = Field(..., min_length=1)
    link: Optional[str] = None
    data: Dict[str, Any] = Field(default_factory=dict)


class SendNotificationResponse(BaseModel):
    """Response for send notification operation"""
    message: str
    recipient_count: int


class NotificationStats(BaseModel):
    """Notification statistics"""
    all_count: int
    unread_count: int
    read_count: int
