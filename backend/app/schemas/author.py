from pydantic import BaseModel, Field, EmailStr, HttpUrl, validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date

from app.schemas.base import BaseResponseModel

class AuthorBase(BaseModel):
    """Base schema for Author"""
    name: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    is_active: Optional[bool] = True

class AuthorCreate(AuthorBase):
    """Schema for creating Author"""
    name: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    is_active: Optional[bool] = True

class AuthorUpdate(BaseModel):
    """Schema for updating Author"""
    name: Optional[str] = Field(None, min_length=2, max_length=200)
    description: Optional[str] = None
    is_active: Optional[bool] = None

class AuthorResponse(AuthorBase, BaseResponseModel):
    """Schema for Author responses"""
    id: int
    name: str = Field(..., min_length=2, max_length=200)
    description: str = None
    is_active: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = {"from_attributes": True}

class AuthorListResponse(BaseModel):
    """Schema for Author list responses"""
    items: List[AuthorResponse]
    total: int
    skip: int
    limit: int
