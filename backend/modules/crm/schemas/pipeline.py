"""
Pipeline Schemas

Pydantic schemas for CRM pipeline validation and serialization.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class PipelineBase(BaseModel):
    """Base schema for pipelines."""

    name: str = Field(..., min_length=1, max_length=100, description="Pipeline name")
    description: Optional[str] = Field(None, description="Pipeline description")
    is_default: bool = Field(False, description="Default pipeline for new items")
    is_active: bool = Field(True, description="Active status")


class PipelineCreate(PipelineBase):
    """Schema for creating a pipeline."""
    pass


class PipelineUpdate(BaseModel):
    """Schema for updating a pipeline."""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None


class StageInPipeline(BaseModel):
    """Stage info within pipeline response."""

    id: int
    name: str
    sequence: int
    probability: int
    color: Optional[str] = None
    is_won: bool = False
    is_lost: bool = False

    class Config:
        from_attributes = True


class PipelineResponse(PipelineBase):
    """Schema for pipeline response."""

    id: int
    company_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    stages: List[StageInPipeline] = []

    class Config:
        from_attributes = True


class PipelineList(BaseModel):
    """Schema for list of pipelines."""

    items: List[PipelineResponse]
    total: int
    page: int = 1
    page_size: int = 20
