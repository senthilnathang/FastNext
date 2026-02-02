"""
Bonus Point Schemas
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class BonusPointBase(BaseModel):
    """Base schema for bonus point."""
    employee_id: int
    points: int = Field(default=0)
    encashment_condition: Optional[str] = Field(None, max_length=5)  # ==, >, <, >=, <=
    redeeming_points: Optional[int] = None
    reason: Optional[str] = None


class BonusPointCreate(BonusPointBase):
    """Schema for creating a bonus point."""
    pass


class BonusPointUpdate(BaseModel):
    """Schema for updating a bonus point."""
    points: Optional[int] = None
    encashment_condition: Optional[str] = Field(None, max_length=5)
    redeeming_points: Optional[int] = None
    reason: Optional[str] = None


class BonusPointResponse(BonusPointBase):
    """Schema for bonus point response."""
    id: int
    company_id: int
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # Additional fields for frontend compatibility
    employee_first_name: Optional[str] = None
    employee_last_name: Optional[str] = None
    badge_id: Optional[str] = None
    employee_profile_url: Optional[str] = None

    class Config:
        from_attributes = True


class BonusPointListResponse(BaseModel):
    """Schema for paginated bonus point list."""
    results: List[BonusPointResponse]
    count: int
