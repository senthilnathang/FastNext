"""
Demo Item Schemas

Pydantic schemas for demo item validation and serialization.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


class DemoItemBase(BaseModel):
    """Base schema for demo items."""

    name: str = Field(..., min_length=1, max_length=200, description="Item name")
    code: str = Field(..., min_length=1, max_length=50, pattern=r'^[A-Z0-9_]+$', description="Unique code")
    description: Optional[str] = Field(None, description="Item description")
    is_active: bool = Field(True, description="Active status")
    priority: int = Field(0, ge=0, le=100, description="Priority (0-100)")
    tags: List[str] = Field(default_factory=list, description="Tags for categorization")
    extra_data: Dict[str, Any] = Field(default_factory=dict, description="Extra metadata")


class DemoItemCreate(DemoItemBase):
    """Schema for creating a demo item."""

    @field_validator('code')
    @classmethod
    def uppercase_code(cls, v: str) -> str:
        return v.upper()


class DemoItemUpdate(BaseModel):
    """Schema for updating a demo item."""

    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    is_active: Optional[bool] = None
    priority: Optional[int] = Field(None, ge=0, le=100)
    tags: Optional[List[str]] = None
    extra_data: Optional[Dict[str, Any]] = None


class DemoItemResponse(DemoItemBase):
    """Schema for demo item response."""

    id: int
    company_id: Optional[int] = None
    created_by_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DemoItemList(BaseModel):
    """Schema for list of demo items."""

    items: List[DemoItemResponse]
    total: int
    page: int = 1
    page_size: int = 20
