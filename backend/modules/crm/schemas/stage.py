"""
Stage Schemas

Pydantic schemas for CRM stage validation and serialization.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class StageBase(BaseModel):
    """Base schema for stages."""

    name: str = Field(..., min_length=1, max_length=100, description="Stage name")
    pipeline_id: int = Field(..., description="Parent pipeline ID")
    sequence: int = Field(10, ge=0, description="Stage order in pipeline")
    description: Optional[str] = Field(None, description="Stage description")
    probability: int = Field(10, ge=0, le=100, description="Win probability 0-100%")
    color: Optional[str] = Field("#3498db", description="Stage color for Kanban")
    is_won: bool = Field(False, description="Marks as won stage")
    is_lost: bool = Field(False, description="Marks as lost stage")
    fold: bool = Field(False, description="Fold column in Kanban")


class StageCreate(StageBase):
    """Schema for creating a stage."""
    pass


class StageUpdate(BaseModel):
    """Schema for updating a stage."""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    sequence: Optional[int] = Field(None, ge=0)
    description: Optional[str] = None
    probability: Optional[int] = Field(None, ge=0, le=100)
    color: Optional[str] = None
    is_won: Optional[bool] = None
    is_lost: Optional[bool] = None
    fold: Optional[bool] = None


class StageResponse(StageBase):
    """Schema for stage response."""

    id: int
    company_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class StageList(BaseModel):
    """Schema for list of stages."""

    items: List[StageResponse]
    total: int
    page: int = 1
    page_size: int = 20


class StageReorder(BaseModel):
    """Schema for reordering stages."""

    stage_ids: List[int] = Field(..., description="Ordered list of stage IDs")
