"""Role schemas"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class RoleBase(BaseModel):
    """Base role schema"""
    name: str = Field(..., min_length=1, max_length=100)
    codename: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None


class RoleCreate(RoleBase):
    """Schema for creating a role"""
    company_id: Optional[int] = None
    is_active: bool = True
    permission_ids: List[int] = []


class RoleUpdate(BaseModel):
    """Schema for updating a role"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    is_active: Optional[bool] = None
    permission_ids: Optional[List[int]] = None


class RoleResponse(RoleBase):
    """Role response schema"""
    id: int
    company_id: Optional[int] = None
    is_system_role: bool
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class PermissionInfo(BaseModel):
    """Permission info for role"""
    id: int
    name: str
    codename: str
    category: str
    action: str

    model_config = {"from_attributes": True}


class RoleWithPermissions(RoleResponse):
    """Role response with permissions"""
    permissions: List[PermissionInfo] = []

    model_config = {"from_attributes": True}


class RoleList(BaseModel):
    """Paginated role list response"""
    total: int
    items: List[RoleResponse]
    page: int
    page_size: int
