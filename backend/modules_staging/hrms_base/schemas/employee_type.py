"""
Employee Type Schemas

Pydantic schemas for employee type validation and serialization.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class EmployeeTypeBase(BaseModel):
    """Base schema for employee types."""

    name: str = Field(..., min_length=1, max_length=100, description="Type name")
    code: str = Field(..., min_length=1, max_length=20, description="Type code (e.g., FT, PT)")
    description: Optional[str] = Field(None, description="Type description")
    is_permanent: bool = Field(True, description="Is permanent employment")
    is_billable: bool = Field(True, description="Can be billed to clients")
    has_benefits: bool = Field(True, description="Eligible for benefits")
    probation_days: int = Field(90, ge=0, description="Probation period in days")
    notice_period_days: int = Field(30, ge=0, description="Notice period in days")
    color: Optional[str] = Field(None, max_length=20, description="Display color")
    sequence: int = Field(10, ge=0, description="Display order")
    is_active: bool = Field(True, description="Is type active")


class EmployeeTypeCreate(EmployeeTypeBase):
    """Schema for creating an employee type."""
    pass


class EmployeeTypeUpdate(BaseModel):
    """Schema for updating an employee type."""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    code: Optional[str] = Field(None, min_length=1, max_length=20)
    description: Optional[str] = None
    is_permanent: Optional[bool] = None
    is_billable: Optional[bool] = None
    has_benefits: Optional[bool] = None
    probation_days: Optional[int] = Field(None, ge=0)
    notice_period_days: Optional[int] = Field(None, ge=0)
    color: Optional[str] = Field(None, max_length=20)
    sequence: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None


class EmployeeTypeResponse(EmployeeTypeBase):
    """Schema for employee type response."""

    id: int
    company_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class EmployeeTypeList(BaseModel):
    """Schema for list of employee types."""

    items: List[EmployeeTypeResponse]
    total: int
    page: int = 1
    page_size: int = 20
