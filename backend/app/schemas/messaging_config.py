"""Messaging Configuration Schemas"""

from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field

from app.models.messaging_config import MessagingScope


class MessagingConfigBase(BaseModel):
    """Base messaging config schema"""
    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    source_type: MessagingScope = MessagingScope.ALL
    source_id: Optional[int] = None
    target_type: MessagingScope = MessagingScope.SAME_COMPANY
    target_id: Optional[int] = None
    can_message: bool = True
    can_see_online: bool = True
    can_see_typing: bool = True
    priority: int = 0
    is_active: bool = True


class MessagingConfigCreate(MessagingConfigBase):
    """Create messaging config schema"""
    company_id: Optional[int] = None


class MessagingConfigUpdate(BaseModel):
    """Update messaging config schema"""
    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    source_type: Optional[MessagingScope] = None
    source_id: Optional[int] = None
    target_type: Optional[MessagingScope] = None
    target_id: Optional[int] = None
    can_message: Optional[bool] = None
    can_see_online: Optional[bool] = None
    can_see_typing: Optional[bool] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None


class MessagingConfigResponse(MessagingConfigBase):
    """Messaging config response schema"""
    id: int
    company_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class MessagingConfigList(BaseModel):
    """Paginated messaging config list"""
    total: int
    items: List[MessagingConfigResponse]
    page: int
    page_size: int


class MessageableUserInfo(BaseModel):
    """Minimal user info for messaging recipient selection"""
    id: int
    username: str
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    is_online: bool = False

    model_config = {"from_attributes": True}


class MessageableUsersResponse(BaseModel):
    """Response for messageable users endpoint"""
    total: int
    items: List[MessageableUserInfo]
    page: int
    page_size: int


class MessageableGroupInfo(BaseModel):
    """Group info for messaging"""
    id: int
    name: str
    description: Optional[str] = None
    member_count: int = 0


class MessageableGroupsResponse(BaseModel):
    """Response for messageable groups"""
    total: int
    items: List[MessageableGroupInfo]
