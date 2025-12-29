"""Group schemas"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class GroupBase(BaseModel):
    """Base group schema"""
    name: str = Field(..., min_length=1, max_length=100)
    codename: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None


class GroupCreate(GroupBase):
    """Schema for creating a group"""
    company_id: Optional[int] = None
    is_active: bool = True
    permission_ids: List[int] = []
    user_ids: List[int] = []


class GroupUpdate(BaseModel):
    """Schema for updating a group"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    is_active: Optional[bool] = None
    permission_ids: Optional[List[int]] = None
    user_ids: Optional[List[int]] = None


class GroupResponse(GroupBase):
    """Group response schema"""
    id: int
    company_id: Optional[int] = None
    is_system_group: bool
    is_active: bool
    member_count: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class UserInfo(BaseModel):
    """User info for group membership"""
    id: int
    username: str
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

    model_config = {"from_attributes": True}


class PermissionInfo(BaseModel):
    """Permission info for group"""
    id: int
    name: str
    codename: str

    model_config = {"from_attributes": True}


class GroupWithMembers(GroupResponse):
    """Group response with members and permissions"""
    members: List[UserInfo] = []
    permissions: List[PermissionInfo] = []

    model_config = {"from_attributes": True}


class GroupList(BaseModel):
    """Paginated group list response"""
    total: int
    items: List[GroupResponse]
    page: int
    page_size: int
