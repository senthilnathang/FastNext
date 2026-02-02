"""
Job Position Schemas

Pydantic schemas for job position validation and serialization.
"""

from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class JobPositionBase(BaseModel):
    """Base schema for job positions."""

    name: str = Field(..., min_length=1, max_length=200, description="Position name")
    code: Optional[str] = Field(None, max_length=50, description="Position code")
    description: Optional[str] = Field(None, description="Position description")
    department_id: Optional[int] = Field(None, description="Department ID")
    requirements: Optional[str] = Field(None, description="Position requirements")
    qualifications: Optional[str] = Field(None, description="Required qualifications")
    min_salary: Optional[Decimal] = Field(None, ge=0, description="Minimum salary")
    max_salary: Optional[Decimal] = Field(None, ge=0, description="Maximum salary")
    currency: str = Field("USD", max_length=3, description="Salary currency")
    expected_employees: int = Field(1, ge=1, description="Expected headcount")
    sequence: int = Field(10, ge=0, description="Display order")
    is_active: bool = Field(True, description="Is position active")


class JobPositionCreate(JobPositionBase):
    """Schema for creating a job position."""
    pass


class JobPositionUpdate(BaseModel):
    """Schema for updating a job position."""

    name: Optional[str] = Field(None, min_length=1, max_length=200)
    code: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    department_id: Optional[int] = None
    requirements: Optional[str] = None
    qualifications: Optional[str] = None
    min_salary: Optional[Decimal] = Field(None, ge=0)
    max_salary: Optional[Decimal] = Field(None, ge=0)
    currency: Optional[str] = Field(None, max_length=3)
    expected_employees: Optional[int] = Field(None, ge=1)
    sequence: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None


class DepartmentInfo(BaseModel):
    """Department info within position response."""

    id: int
    name: str
    code: Optional[str] = None

    class Config:
        from_attributes = True


class JobPositionResponse(JobPositionBase):
    """Schema for job position response."""

    id: int
    company_id: Optional[int] = None
    department: Optional[DepartmentInfo] = None
    salary_range: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class JobPositionList(BaseModel):
    """Schema for list of job positions."""

    items: List[JobPositionResponse]
    total: int
    page: int = 1
    page_size: int = 20
