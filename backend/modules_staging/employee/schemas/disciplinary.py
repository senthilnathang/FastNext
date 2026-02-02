"""
Disciplinary Action Schemas
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date


class ActionTypeBase(BaseModel):
    """Base schema for action type."""
    title: str = Field(..., max_length=100)
    action_type: str = Field(..., max_length=20)  # warning, suspension, dismissal
    block_option: bool = False


class ActionTypeCreate(ActionTypeBase):
    """Schema for creating an action type."""
    pass


class ActionTypeUpdate(BaseModel):
    """Schema for updating an action type."""
    title: Optional[str] = Field(None, max_length=100)
    action_type: Optional[str] = Field(None, max_length=20)
    block_option: Optional[bool] = None


class ActionTypeResponse(ActionTypeBase):
    """Schema for action type response."""
    id: int
    company_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DisciplinaryEmployeeInfo(BaseModel):
    """Employee info for disciplinary action."""
    id: int
    employee_first_name: Optional[str] = None
    employee_last_name: Optional[str] = None
    badge_id: Optional[str] = None


class DisciplinaryActionBase(BaseModel):
    """Base schema for disciplinary action."""
    action_id: int
    description: Optional[str] = None
    unit_in: Optional[str] = Field(None, max_length=10)  # days or hours
    days: Optional[int] = None
    hours: Optional[int] = None
    start_date: Optional[date] = None
    attachment: Optional[str] = Field(None, max_length=500)


class DisciplinaryActionCreate(DisciplinaryActionBase):
    """Schema for creating a disciplinary action."""
    employee_ids: List[int] = []  # List of employee IDs to apply action to


class DisciplinaryActionUpdate(BaseModel):
    """Schema for updating a disciplinary action."""
    action_id: Optional[int] = None
    description: Optional[str] = None
    unit_in: Optional[str] = Field(None, max_length=10)
    days: Optional[int] = None
    hours: Optional[int] = None
    start_date: Optional[date] = None
    attachment: Optional[str] = Field(None, max_length=500)
    employee_ids: Optional[List[int]] = None


class DisciplinaryActionResponse(DisciplinaryActionBase):
    """Schema for disciplinary action response."""
    id: int
    company_id: int
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # Related data
    action_title: Optional[str] = None
    employees: List[DisciplinaryEmployeeInfo] = []

    class Config:
        from_attributes = True


class DisciplinaryActionListResponse(BaseModel):
    """Schema for paginated disciplinary action list."""
    results: List[DisciplinaryActionResponse]
    count: int
