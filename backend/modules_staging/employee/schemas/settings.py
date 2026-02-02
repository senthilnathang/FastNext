"""
Employee General Settings Schemas
"""

from pydantic import BaseModel, Field
from typing import Optional


class EmployeeGeneralSettingBase(BaseModel):
    """Base schema for employee general settings."""
    badge_id_prefix: str = Field(default="EMP-", max_length=20)


class EmployeeGeneralSettingCreate(EmployeeGeneralSettingBase):
    """Schema for creating employee general settings."""
    pass


class EmployeeGeneralSettingUpdate(BaseModel):
    """Schema for updating employee general settings."""
    badge_id_prefix: Optional[str] = Field(None, max_length=20)


class EmployeeGeneralSettingResponse(EmployeeGeneralSettingBase):
    """Schema for employee general settings response."""
    id: int
    company_id: int

    class Config:
        from_attributes = True
