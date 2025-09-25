from pydantic import BaseModel, Field, EmailStr, HttpUrl, validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date

from app.schemas.base import BaseResponseModel

class SalesBase(BaseModel):
    """Base schema for Sales"""
    name: str

class SalesCreate(SalesBase):
    """Schema for creating Sales"""
    name: str

class SalesUpdate(BaseModel):
    """Schema for updating Sales"""
    name: Optional[str] = None

class SalesResponse(SalesBase, BaseResponseModel):
    """Schema for Sales responses"""
    id: int
    name: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = {"from_attributes": True}

class SalesListResponse(BaseModel):
    """Schema for Sales list responses"""
    items: List[SalesResponse]
    total: int
    skip: int
    limit: int
