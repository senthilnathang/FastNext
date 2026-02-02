"""
Job Role Schemas

Pydantic schemas for job role validation and serialization.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class JobRoleBase(BaseModel):
    """Base schema for job roles."""

    name: str = Field(..., min_length=1, max_length=200, description="Role name")
    code: Optional[str] = Field(None, max_length=50, description="Role code")
    description: Optional[str] = Field(None, description="Role description")
    responsibilities: Optional[str] = Field(None, description="Role responsibilities")
    permissions: List[str] = Field(default_factory=list, description="Permission codes")
    level: int = Field(1, ge=1, le=7, description="Role level (1-7)")
    color: Optional[str] = Field(None, max_length=20, description="Display color")
    sequence: int = Field(10, ge=0, description="Display order")
    is_active: bool = Field(True, description="Is role active")


class JobRoleCreate(JobRoleBase):
    """Schema for creating a job role."""
    pass


class JobRoleUpdate(BaseModel):
    """Schema for updating a job role."""

    name: Optional[str] = Field(None, min_length=1, max_length=200)
    code: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    responsibilities: Optional[str] = None
    permissions: Optional[List[str]] = None
    level: Optional[int] = Field(None, ge=1, le=7)
    color: Optional[str] = Field(None, max_length=20)
    sequence: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None


class JobRoleResponse(JobRoleBase):
    """Schema for job role response."""

    id: int
    company_id: Optional[int] = None
    level_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class JobRoleList(BaseModel):
    """Schema for list of job roles."""

    items: List[JobRoleResponse]
    total: int
    page: int = 1
    page_size: int = 20
