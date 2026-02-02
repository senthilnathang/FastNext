"""
Work Type Schemas

Pydantic schemas for work type validation and serialization.
"""

from datetime import datetime, date
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from ..models.work_type import RequestStatus


class WorkTypeBase(BaseModel):
    """Base schema for work types."""

    name: str = Field(..., min_length=1, max_length=100, description="Work type name")
    code: Optional[str] = Field(None, max_length=20, description="Work type code")
    description: Optional[str] = Field(None, description="Description")
    is_remote: bool = Field(False, description="Is remote work")
    requires_location: bool = Field(True, description="Requires location check-in")
    max_days_per_week: Optional[int] = Field(None, ge=1, le=7, description="Max days per week")
    max_days_per_month: Optional[int] = Field(None, ge=1, le=31, description="Max days per month")
    requires_approval: bool = Field(False, description="Requires approval")
    color: Optional[str] = Field(None, max_length=20, description="Display color")
    icon: Optional[str] = Field(None, max_length=50, description="Icon name")
    sequence: int = Field(10, ge=0, description="Display order")
    is_active: bool = Field(True, description="Is active")


class WorkTypeCreate(WorkTypeBase):
    """Schema for creating a work type."""
    pass


class WorkTypeUpdate(BaseModel):
    """Schema for updating a work type."""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    code: Optional[str] = Field(None, max_length=20)
    description: Optional[str] = None
    is_remote: Optional[bool] = None
    requires_location: Optional[bool] = None
    max_days_per_week: Optional[int] = Field(None, ge=1, le=7)
    max_days_per_month: Optional[int] = Field(None, ge=1, le=31)
    requires_approval: Optional[bool] = None
    color: Optional[str] = Field(None, max_length=20)
    icon: Optional[str] = Field(None, max_length=50)
    sequence: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None


class WorkTypeResponse(WorkTypeBase):
    """Schema for work type response."""

    id: int
    company_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WorkTypeList(BaseModel):
    """Schema for list of work types."""

    items: List[WorkTypeResponse]
    total: int
    page: int = 1
    page_size: int = 20


# Work Type Request Schemas
class WorkTypeRequestBase(BaseModel):
    """Base schema for work type requests."""

    work_type_id: int = Field(..., description="Requested work type ID")
    start_date: date = Field(..., description="Start date")
    end_date: Optional[date] = Field(None, description="End date (None for single day)")
    reason: Optional[str] = Field(None, description="Request reason")


class WorkTypeRequestCreate(WorkTypeRequestBase):
    """Schema for creating a work type request."""
    pass


class WorkTypeInfo(BaseModel):
    """Work type info within request response."""

    id: int
    name: str
    code: Optional[str] = None

    class Config:
        from_attributes = True


class UserInfo(BaseModel):
    """User info within request response."""

    id: int
    username: str
    full_name: Optional[str] = None

    class Config:
        from_attributes = True


class WorkTypeRequestResponse(WorkTypeRequestBase):
    """Schema for work type request response."""

    id: int
    company_id: Optional[int] = None
    employee_id: int
    previous_work_type_id: Optional[int] = None
    status: RequestStatus
    approved_by_id: Optional[int] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    work_type: Optional[WorkTypeInfo] = None
    previous_work_type: Optional[WorkTypeInfo] = None
    employee: Optional[UserInfo] = None
    approved_by: Optional[UserInfo] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Shift Request Schemas
class ShiftRequestBase(BaseModel):
    """Base schema for shift requests."""

    shift_id: int = Field(..., description="Requested shift ID")
    start_date: date = Field(..., description="Start date")
    end_date: Optional[date] = Field(None, description="End date")
    reason: Optional[str] = Field(None, description="Request reason")


class ShiftRequestCreate(ShiftRequestBase):
    """Schema for creating a shift request."""
    pass


class ShiftInfo(BaseModel):
    """Shift info within request response."""

    id: int
    name: str
    start_time: str
    end_time: str

    class Config:
        from_attributes = True


class ShiftRequestResponse(ShiftRequestBase):
    """Schema for shift request response."""

    id: int
    company_id: Optional[int] = None
    employee_id: int
    previous_shift_id: Optional[int] = None
    request_date: date
    status: RequestStatus
    approved_by_id: Optional[int] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    shift: Optional[ShiftInfo] = None
    previous_shift: Optional[ShiftInfo] = None
    employee: Optional[UserInfo] = None
    approved_by: Optional[UserInfo] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Request Approval Schema
class RequestApproval(BaseModel):
    """Schema for approving/rejecting a request."""

    action: str = Field(..., description="approve or reject")
    reason: Optional[str] = Field(None, description="Reason for rejection")
