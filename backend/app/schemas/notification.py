import json
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.models.notification import NotificationType
from pydantic import BaseModel, Field, field_validator


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

    @field_validator("channels", mode="before")
    @classmethod
    def parse_channels(cls, v):
        if isinstance(v, str):
            return json.loads(v)
        return v

    @field_validator("data", mode="before")
    @classmethod
    def parse_data(cls, v):
        if isinstance(v, str):
            return json.loads(v) if v else None
        return v


class NotificationList(BaseModel):
    notifications: List[NotificationResponse]
    total: int
