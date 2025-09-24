from pydantic import BaseModel, Field, EmailStr, HttpUrl, validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date

from app.schemas.base import BaseResponseModel

class CategoryBase(BaseModel):
    """Base schema for Category"""
    name: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    is_active: Optional[bool] = True

class CategoryCreate(CategoryBase):
    """Schema for creating Category"""
    name: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    is_active: Optional[bool] = True

class CategoryUpdate(BaseModel):
    """Schema for updating Category"""
    name: Optional[str] = Field(None, min_length=2, max_length=200)
    description: Optional[str] = None
    is_active: Optional[bool] = None

class CategoryResponse(CategoryBase, BaseResponseModel):
    """Schema for Category responses"""
    id: int
    name: str = Field(..., min_length=2, max_length=200)
    description: str = None
    is_active: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = {"from_attributes": True}

class CategoryListResponse(BaseModel):
    """Schema for Category list responses"""
    items: List[CategoryResponse]
    total: int
    skip: int
    limit: int
