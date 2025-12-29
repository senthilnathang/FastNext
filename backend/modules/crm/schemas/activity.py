"""
Activity Schemas

Pydantic schemas for CRM activity validation and serialization.
"""

from datetime import datetime, date
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from ..models.activity import ActivityType, ActivityStatus, ActivityPriority


class ActivityBase(BaseModel):
    """Base schema for activities."""

    activity_type: ActivityType = Field(ActivityType.TASK, description="Activity type")
    subject: str = Field(..., min_length=1, max_length=255, description="Activity subject")
    description: Optional[str] = Field(None, description="Description")
    date_start: Optional[datetime] = Field(None, description="Start date/time")
    date_end: Optional[datetime] = Field(None, description="End date/time")
    duration: int = Field(0, ge=0, description="Duration in minutes")
    is_all_day: bool = Field(False, description="All day event")
    date_due: Optional[date] = Field(None, description="Due date (for tasks)")
    status: ActivityStatus = Field(ActivityStatus.PLANNED, description="Status")
    priority: ActivityPriority = Field(ActivityPriority.NORMAL, description="Priority")
    call_direction: Optional[str] = Field(None, max_length=20, description="inbound/outbound")
    call_duration: Optional[int] = Field(None, ge=0, description="Call duration in seconds")
    call_result: Optional[str] = Field(None, max_length=100, description="Call result")
    location: Optional[str] = Field(None, max_length=255, description="Meeting location")
    meeting_url: Optional[str] = Field(None, max_length=500, description="Video call URL")
    email_from: Optional[str] = Field(None, max_length=255)
    email_to: Optional[str] = Field(None, description="Email recipients")
    email_cc: Optional[str] = Field(None, description="Email CC")
    reminder_minutes: int = Field(0, ge=0, description="Reminder minutes before")
    is_recurring: bool = Field(False, description="Recurring activity")
    recurrence_rule: Optional[str] = Field(None, max_length=255, description="RRULE format")
    outcome: Optional[str] = Field(None, description="Activity outcome")
    custom_fields: Dict[str, Any] = Field(default_factory=dict, description="Custom fields")


class ActivityCreate(ActivityBase):
    """Schema for creating an activity."""

    res_model: str = Field(..., max_length=50, description="Related model (lead, opportunity, contact, account)")
    res_id: int = Field(..., description="Related record ID")
    user_id: Optional[int] = Field(None, description="Creator user ID")
    assigned_to_id: Optional[int] = Field(None, description="Assigned user ID")
    parent_activity_id: Optional[int] = Field(None, description="Parent activity ID for recurring")


class ActivityUpdate(BaseModel):
    """Schema for updating an activity."""

    activity_type: Optional[ActivityType] = None
    subject: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    date_start: Optional[datetime] = None
    date_end: Optional[datetime] = None
    duration: Optional[int] = Field(None, ge=0)
    is_all_day: Optional[bool] = None
    date_due: Optional[date] = None
    status: Optional[ActivityStatus] = None
    priority: Optional[ActivityPriority] = None
    assigned_to_id: Optional[int] = None
    call_direction: Optional[str] = Field(None, max_length=20)
    call_duration: Optional[int] = Field(None, ge=0)
    call_result: Optional[str] = Field(None, max_length=100)
    location: Optional[str] = Field(None, max_length=255)
    meeting_url: Optional[str] = Field(None, max_length=500)
    email_from: Optional[str] = Field(None, max_length=255)
    email_to: Optional[str] = None
    email_cc: Optional[str] = None
    reminder_minutes: Optional[int] = Field(None, ge=0)
    is_recurring: Optional[bool] = None
    recurrence_rule: Optional[str] = Field(None, max_length=255)
    outcome: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None


class UserInfo(BaseModel):
    """User info within activity response."""

    id: int
    username: str
    full_name: Optional[str] = None

    class Config:
        from_attributes = True


class ActivityResponse(ActivityBase):
    """Schema for activity response."""

    id: int
    company_id: Optional[int] = None
    res_model: str
    res_id: int
    user_id: Optional[int] = None
    assigned_to_id: Optional[int] = None
    completed_by_id: Optional[int] = None
    parent_activity_id: Optional[int] = None
    reminder_sent: bool = False
    date_completed: Optional[datetime] = None
    is_overdue: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    user: Optional[UserInfo] = None
    assigned_to: Optional[UserInfo] = None
    completed_by: Optional[UserInfo] = None

    class Config:
        from_attributes = True


class ActivityList(BaseModel):
    """Schema for list of activities."""

    items: List[ActivityResponse]
    total: int
    page: int = 1
    page_size: int = 20


class ActivityComplete(BaseModel):
    """Schema for completing an activity."""

    outcome: Optional[str] = Field(None, description="Activity outcome/notes")


class ActivitySchedule(BaseModel):
    """Schema for scheduling a follow-up activity."""

    activity_type: ActivityType = Field(..., description="Activity type")
    subject: str = Field(..., min_length=1, max_length=255, description="Subject")
    date_start: Optional[datetime] = Field(None, description="Start date/time")
    date_due: Optional[date] = Field(None, description="Due date")
    assigned_to_id: Optional[int] = Field(None, description="Assign to user ID")
    description: Optional[str] = Field(None, description="Description")
