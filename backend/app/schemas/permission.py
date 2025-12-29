"""Permission schemas"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.models.permission import PermissionAction, PermissionCategory


class PermissionBase(BaseModel):
    """Base permission schema"""
    name: str = Field(..., min_length=1, max_length=100)
    codename: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    category: PermissionCategory
    action: PermissionAction
    resource: Optional[str] = None


class PermissionCreate(PermissionBase):
    """Schema for creating a permission"""
    is_active: bool = True


class PermissionResponse(PermissionBase):
    """Permission response schema"""
    id: int
    is_system_permission: bool
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class PermissionList(BaseModel):
    """Paginated permission list response"""
    total: int
    items: List[PermissionResponse]
    page: int
    page_size: int


class PermissionGrouped(BaseModel):
    """Permissions grouped by category"""
    category: str
    permissions: List[PermissionResponse]
