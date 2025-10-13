from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from app.models.notification import NotificationType


class NotificationBase(BaseModel):
    title: str = Field(..., max_length=255)
    message: str
    type: NotificationType = NotificationType.INFO
    channels: List[str] = Field(default_factory=lambda: ["in_app"])
    action_url: Optional[str] = None
    data: Optional[Dict[str, Any]] = None


class NotificationCreate(NotificationBase):
    user_id: int


class NotificationUpdate(BaseModel):
    is_read: Optional[bool] = None


class NotificationResponse(NotificationBase):
    id: int
    user_id: int
    is_read: bool
    is_sent: bool
    sent_at: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class NotificationList(BaseModel):
    notifications: List[NotificationResponse]
    total: int