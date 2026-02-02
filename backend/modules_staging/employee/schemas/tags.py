"""
Employee Tag Schemas
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class EmployeeTagBase(BaseModel):
    """Base schema for employee tag."""
    title: str = Field(..., min_length=1, max_length=100)
    color: str = Field(default="#1890ff", max_length=20)


class EmployeeTagCreate(EmployeeTagBase):
    """Schema for creating an employee tag."""
    pass


class EmployeeTagUpdate(BaseModel):
    """Schema for updating an employee tag."""
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    color: Optional[str] = Field(None, max_length=20)


class EmployeeTagResponse(EmployeeTagBase):
    """Schema for employee tag response."""
    id: int
    company_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
