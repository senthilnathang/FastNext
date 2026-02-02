"""
Settings, Stage, and Announcement Schemas

Pydantic schemas for configuration and settings.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from ..models.settings import AnnouncementType, AnnouncementTarget


# Stage Definition Schemas
class StageDefinitionBase(BaseModel):
    """Base schema for stage definitions."""

    name: str = Field(..., min_length=1, max_length=100, description="Stage name")
    code: Optional[str] = Field(None, max_length=50, description="Stage code")
    description: Optional[str] = Field(None, description="Stage description")
    model_name: str = Field(..., min_length=1, max_length=100, description="Model name")
    sequence: int = Field(10, ge=0, description="Display order")
    is_initial: bool = Field(False, description="Is initial stage")
    is_final: bool = Field(False, description="Is final stage")
    is_success: bool = Field(False, description="Is success outcome")
    is_failure: bool = Field(False, description="Is failure outcome")
    color: Optional[str] = Field(None, max_length=20, description="Display color")
    icon: Optional[str] = Field(None, max_length=50, description="Icon name")
    auto_actions: List[Dict[str, Any]] = Field(default_factory=list, description="Auto actions on entry")
    is_active: bool = Field(True, description="Is stage active")


class StageDefinitionCreate(StageDefinitionBase):
    """Schema for creating a stage definition."""
    pass


class StageDefinitionUpdate(BaseModel):
    """Schema for updating a stage definition."""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    code: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    sequence: Optional[int] = Field(None, ge=0)
    is_initial: Optional[bool] = None
    is_final: Optional[bool] = None
    is_success: Optional[bool] = None
    is_failure: Optional[bool] = None
    color: Optional[str] = Field(None, max_length=20)
    icon: Optional[str] = Field(None, max_length=50)
    auto_actions: Optional[List[Dict[str, Any]]] = None
    is_active: Optional[bool] = None


class StageDefinitionResponse(StageDefinitionBase):
    """Schema for stage definition response."""

    id: int
    company_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Status Definition Schemas
class StatusDefinitionBase(BaseModel):
    """Base schema for status definitions."""

    name: str = Field(..., min_length=1, max_length=100, description="Status name")
    code: Optional[str] = Field(None, max_length=50, description="Status code")
    description: Optional[str] = Field(None, description="Status description")
    model_name: str = Field(..., min_length=1, max_length=100, description="Model name")
    is_default: bool = Field(False, description="Is default status")
    is_terminal: bool = Field(False, description="Is terminal status (no further transitions)")
    sequence: int = Field(10, ge=0, description="Display order")
    color: Optional[str] = Field(None, max_length=20, description="Display color")
    icon: Optional[str] = Field(None, max_length=50, description="Icon name")
    is_active: bool = Field(True, description="Is status active")


class StatusDefinitionCreate(StatusDefinitionBase):
    """Schema for creating a status definition."""
    pass


class StatusDefinitionUpdate(BaseModel):
    """Schema for updating a status definition."""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    code: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    is_default: Optional[bool] = None
    is_terminal: Optional[bool] = None
    sequence: Optional[int] = Field(None, ge=0)
    color: Optional[str] = Field(None, max_length=20)
    icon: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None


class StatusDefinitionResponse(StatusDefinitionBase):
    """Schema for status definition response."""

    id: int
    company_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Status Transition Schemas
class StatusTransitionBase(BaseModel):
    """Base schema for status transitions."""

    from_status_id: int = Field(..., description="From status ID")
    to_status_id: int = Field(..., description="To status ID")
    name: Optional[str] = Field(None, max_length=100, description="Transition name")
    allowed_groups: List[int] = Field(default_factory=list, description="Allowed group IDs")
    allowed_roles: List[str] = Field(default_factory=list, description="Allowed role codes")
    condition: Optional[Dict[str, Any]] = Field(None, description="Condition expression")
    actions: List[Dict[str, Any]] = Field(default_factory=list, description="Actions on transition")
    is_active: bool = Field(True, description="Is transition active")


class StatusTransitionCreate(StatusTransitionBase):
    """Schema for creating a status transition."""
    pass


class StatusInfo(BaseModel):
    """Status info within transition response."""

    id: int
    name: str
    code: Optional[str] = None

    class Config:
        from_attributes = True


class StatusTransitionResponse(StatusTransitionBase):
    """Schema for status transition response."""

    id: int
    company_id: Optional[int] = None
    from_status: Optional[StatusInfo] = None
    to_status: Optional[StatusInfo] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# HRMS Settings Schemas
class HRMSSettingsBase(BaseModel):
    """Base schema for HRMS settings."""

    key: str = Field(..., min_length=1, max_length=100, description="Setting key")
    value: Optional[str] = Field(None, description="Setting value (string)")
    value_json: Optional[Dict[str, Any]] = Field(None, description="Setting value (JSON)")
    module: str = Field("hrms_base", max_length=50, description="Module name")
    category: Optional[str] = Field(None, max_length=50, description="Category")
    description: Optional[str] = Field(None, description="Setting description")
    data_type: str = Field("string", max_length=20, description="Data type")
    is_system: bool = Field(False, description="Is system setting")
    is_secret: bool = Field(False, description="Is secret value")


class HRMSSettingsCreate(HRMSSettingsBase):
    """Schema for creating an HRMS setting."""
    pass


class HRMSSettingsUpdate(BaseModel):
    """Schema for updating an HRMS setting."""

    value: Optional[str] = None
    value_json: Optional[Dict[str, Any]] = None
    category: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None


class HRMSSettingsResponse(HRMSSettingsBase):
    """Schema for HRMS setting response."""

    id: int
    company_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Announcement Schemas
class AnnouncementBase(BaseModel):
    """Base schema for announcements."""

    title: str = Field(..., min_length=1, max_length=255, description="Announcement title")
    content: str = Field(..., min_length=1, description="Announcement content")
    summary: Optional[str] = Field(None, max_length=500, description="Short summary")
    announcement_type: AnnouncementType = Field(AnnouncementType.INFO, description="Announcement type")
    is_pinned: bool = Field(False, description="Pin at top")
    target: AnnouncementTarget = Field(AnnouncementTarget.ALL, description="Target audience")
    target_ids: List[int] = Field(default_factory=list, description="Target IDs")
    publish_date: Optional[datetime] = Field(None, description="Publish date")
    expire_date: Optional[datetime] = Field(None, description="Expiry date")
    requires_acknowledgment: bool = Field(False, description="Requires acknowledgment")
    is_active: bool = Field(True, description="Is active")


class AnnouncementCreate(AnnouncementBase):
    """Schema for creating an announcement."""
    pass


class AnnouncementUpdate(BaseModel):
    """Schema for updating an announcement."""

    title: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[str] = Field(None, min_length=1)
    summary: Optional[str] = Field(None, max_length=500)
    announcement_type: Optional[AnnouncementType] = None
    is_pinned: Optional[bool] = None
    target: Optional[AnnouncementTarget] = None
    target_ids: Optional[List[int]] = None
    publish_date: Optional[datetime] = None
    expire_date: Optional[datetime] = None
    requires_acknowledgment: Optional[bool] = None
    is_active: Optional[bool] = None


class AuthorInfo(BaseModel):
    """Author info within announcement response."""

    id: int
    username: str
    full_name: Optional[str] = None

    class Config:
        from_attributes = True


class AnnouncementResponse(AnnouncementBase):
    """Schema for announcement response."""

    id: int
    company_id: Optional[int] = None
    author_id: int
    author: Optional[AuthorInfo] = None
    is_published: Optional[bool] = None
    view_count: Optional[int] = None
    acknowledgment_count: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AnnouncementList(BaseModel):
    """Schema for list of announcements."""

    items: List[AnnouncementResponse]
    total: int
    page: int = 1
    page_size: int = 20


# Mail Template Schemas
class MailTemplateBase(BaseModel):
    """Base schema for mail templates."""

    name: str = Field(..., min_length=1, max_length=100)
    code: str = Field(..., min_length=1, max_length=50)
    subject: str = Field(..., min_length=1, max_length=255)
    body_html: Optional[str] = None
    body_text: Optional[str] = None
    model_name: Optional[str] = Field(None, max_length=100)
    trigger_event: Optional[str] = Field(None, max_length=50)
    recipients_config: Optional[Dict[str, Any]] = Field(default_factory=dict)
    available_variables: Optional[List[str]] = Field(default_factory=list)
    is_active: bool = True


class MailTemplateCreate(MailTemplateBase):
    """Schema for creating a mail template."""
    pass


class MailTemplateUpdate(BaseModel):
    """Schema for updating a mail template."""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    subject: Optional[str] = Field(None, min_length=1, max_length=255)
    body_html: Optional[str] = None
    body_text: Optional[str] = None
    model_name: Optional[str] = None
    trigger_event: Optional[str] = None
    recipients_config: Optional[Dict[str, Any]] = None
    available_variables: Optional[List[str]] = None
    is_active: Optional[bool] = None


class MailTemplateResponse(MailTemplateBase):
    """Schema for mail template response."""

    id: int
    company_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
