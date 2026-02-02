"""
Shift Schemas

Pydantic schemas for shift validation and serialization.
"""

from datetime import datetime, time, date
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class EmployeeShiftBase(BaseModel):
    """Base schema for employee shifts."""

    name: str = Field(..., min_length=1, max_length=100, description="Shift name")
    code: Optional[str] = Field(None, max_length=20, description="Shift code")
    description: Optional[str] = Field(None, description="Shift description")
    start_time: time = Field(..., description="Shift start time")
    end_time: time = Field(..., description="Shift end time")
    break_start_time: Optional[time] = Field(None, description="Break start time")
    break_end_time: Optional[time] = Field(None, description="Break end time")
    break_duration_minutes: int = Field(60, ge=0, description="Break duration in minutes")
    late_grace_minutes: int = Field(15, ge=0, description="Late arrival grace period")
    early_out_grace_minutes: int = Field(10, ge=0, description="Early departure grace period")
    minimum_work_hours: int = Field(8, ge=0, description="Minimum work hours")
    full_day_hours: int = Field(8, ge=0, description="Hours for full day")
    half_day_hours: int = Field(4, ge=0, description="Hours for half day")
    is_night_shift: bool = Field(False, description="Is night shift")
    is_flexible: bool = Field(False, description="Is flexible timing")
    color: Optional[str] = Field(None, max_length=20, description="Display color")
    sequence: int = Field(10, ge=0, description="Display order")
    is_active: bool = Field(True, description="Is shift active")


class EmployeeShiftCreate(EmployeeShiftBase):
    """Schema for creating an employee shift."""
    pass


class EmployeeShiftUpdate(BaseModel):
    """Schema for updating an employee shift."""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    code: Optional[str] = Field(None, max_length=20)
    description: Optional[str] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    break_start_time: Optional[time] = None
    break_end_time: Optional[time] = None
    break_duration_minutes: Optional[int] = Field(None, ge=0)
    late_grace_minutes: Optional[int] = Field(None, ge=0)
    early_out_grace_minutes: Optional[int] = Field(None, ge=0)
    minimum_work_hours: Optional[int] = Field(None, ge=0)
    full_day_hours: Optional[int] = Field(None, ge=0)
    half_day_hours: Optional[int] = Field(None, ge=0)
    is_night_shift: Optional[bool] = None
    is_flexible: Optional[bool] = None
    color: Optional[str] = Field(None, max_length=20)
    sequence: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None


class EmployeeShiftResponse(EmployeeShiftBase):
    """Schema for employee shift response."""

    id: int
    company_id: Optional[int] = None
    duration_hours: Optional[float] = None
    formatted_time: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class EmployeeShiftList(BaseModel):
    """Schema for list of employee shifts."""

    items: List[EmployeeShiftResponse]
    total: int
    page: int = 1
    page_size: int = 20


# Shift Schedule Schemas
class ShiftScheduleBase(BaseModel):
    """Base schema for shift schedules."""

    employee_id: int = Field(..., description="Employee user ID")
    shift_id: int = Field(..., description="Shift ID")
    start_date: date = Field(..., description="Schedule start date")
    end_date: Optional[date] = Field(None, description="Schedule end date (None = ongoing)")
    days_of_week: List[int] = Field(default_factory=lambda: [0, 1, 2, 3, 4], description="Days (0=Mon, 6=Sun)")
    is_current: bool = Field(True, description="Is current schedule")


class ShiftScheduleCreate(ShiftScheduleBase):
    """Schema for creating a shift schedule."""
    pass


class ShiftScheduleUpdate(BaseModel):
    """Schema for updating a shift schedule."""

    shift_id: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    days_of_week: Optional[List[int]] = None
    is_current: Optional[bool] = None


class ShiftInfo(BaseModel):
    """Shift info within schedule response."""

    id: int
    name: str
    start_time: time
    end_time: time

    class Config:
        from_attributes = True


class EmployeeInfo(BaseModel):
    """Employee info within schedule response."""

    id: int
    username: str
    full_name: Optional[str] = None

    class Config:
        from_attributes = True


class ShiftScheduleResponse(ShiftScheduleBase):
    """Schema for shift schedule response."""

    id: int
    company_id: Optional[int] = None
    shift: Optional[ShiftInfo] = None
    employee: Optional[EmployeeInfo] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Rotating Shift Schemas
class RotationPattern(BaseModel):
    """Single rotation pattern entry."""

    shift_id: int
    days: int = Field(..., ge=1, description="Number of days for this shift")


class RotatingShiftBase(BaseModel):
    """Base schema for rotating shifts."""

    name: str = Field(..., min_length=1, max_length=100, description="Rotating shift name")
    description: Optional[str] = Field(None, description="Description")
    rotation_pattern: List[RotationPattern] = Field(default_factory=list, description="Rotation pattern")
    rotation_start_date: Optional[date] = Field(None, description="Rotation cycle start date")
    rotation_period_days: int = Field(14, ge=1, description="Total days in rotation cycle")
    is_active: bool = Field(True, description="Is active")


class RotatingShiftCreate(RotatingShiftBase):
    """Schema for creating a rotating shift."""
    pass


class RotatingShiftUpdate(BaseModel):
    """Schema for updating a rotating shift."""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    rotation_pattern: Optional[List[RotationPattern]] = None
    rotation_start_date: Optional[date] = None
    rotation_period_days: Optional[int] = Field(None, ge=1)
    is_active: Optional[bool] = None


class RotatingShiftResponse(RotatingShiftBase):
    """Schema for rotating shift response."""

    id: int
    company_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
