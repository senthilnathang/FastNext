"""
Department Schemas

Pydantic schemas for department validation and serialization.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class DepartmentBase(BaseModel):
    """Base schema for departments."""

    name: str = Field(..., min_length=1, max_length=200, description="Department name")
    code: Optional[str] = Field(None, max_length=50, description="Unique department code")
    description: Optional[str] = Field(None, description="Department description")
    parent_id: Optional[int] = Field(None, description="Parent department ID")
    manager_id: Optional[int] = Field(None, description="Department manager user ID")
    color: Optional[str] = Field(None, max_length=20, description="Display color")
    sequence: int = Field(10, ge=0, description="Display order")
    is_active: bool = Field(True, description="Is department active")


class DepartmentCreate(DepartmentBase):
    """Schema for creating a department."""
    pass


class DepartmentUpdate(BaseModel):
    """Schema for updating a department."""

    name: Optional[str] = Field(None, min_length=1, max_length=200)
    code: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    parent_id: Optional[int] = None
    manager_id: Optional[int] = None
    color: Optional[str] = Field(None, max_length=20)
    sequence: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None


class ManagerInfo(BaseModel):
    """Manager info within department response."""

    id: int
    username: str
    full_name: Optional[str] = None

    class Config:
        from_attributes = True


class DepartmentResponse(DepartmentBase):
    """Schema for department response."""

    id: int
    company_id: Optional[int] = None
    full_path: Optional[str] = None
    level: Optional[int] = None
    manager: Optional[ManagerInfo] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DepartmentTree(BaseModel):
    """Schema for department tree structure."""

    id: int
    name: str
    code: Optional[str] = None
    parent_id: Optional[int] = None
    manager_id: Optional[int] = None
    manager: Optional[ManagerInfo] = None
    color: Optional[str] = None
    is_active: bool = True
    children: List["DepartmentTree"] = []

    class Config:
        from_attributes = True


class DepartmentList(BaseModel):
    """Schema for list of departments."""

    items: List[DepartmentResponse]
    total: int
    page: int = 1
    page_size: int = 20


# Allow self-referencing
DepartmentTree.model_rebuild()
