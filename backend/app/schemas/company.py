"""Company schemas"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


class CompanyBase(BaseModel):
    """Base company schema"""
    name: str = Field(..., min_length=1, max_length=255)
    code: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None


class CompanyCreate(CompanyBase):
    """Schema for creating a company"""
    parent_company_id: Optional[int] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    zip_code: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    website: Optional[str] = None
    tax_id: Optional[str] = None
    registration_number: Optional[str] = None
    date_format: str = "YYYY-MM-DD"
    time_format: str = "HH:mm:ss"
    timezone: str = "UTC"
    currency: str = "USD"
    is_headquarters: bool = False
    is_active: bool = True


class CompanyUpdate(BaseModel):
    """Schema for updating a company"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    parent_company_id: Optional[int] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    zip_code: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    website: Optional[str] = None
    tax_id: Optional[str] = None
    registration_number: Optional[str] = None
    date_format: Optional[str] = None
    time_format: Optional[str] = None
    timezone: Optional[str] = None
    currency: Optional[str] = None
    logo_url: Optional[str] = None
    is_headquarters: Optional[bool] = None
    is_active: Optional[bool] = None


class CompanyResponse(CompanyBase):
    """Company response schema"""
    id: int
    parent_company_id: Optional[int] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    zip_code: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    tax_id: Optional[str] = None
    registration_number: Optional[str] = None
    date_format: str
    time_format: str
    timezone: str
    currency: str
    logo_url: Optional[str] = None
    is_headquarters: bool
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class CompanyWithBranches(CompanyResponse):
    """Company response with branches"""
    branches: List["CompanyResponse"] = []

    model_config = {"from_attributes": True}


class CompanyList(BaseModel):
    """Paginated company list response"""
    total: int
    items: List[CompanyResponse]
    page: int
    page_size: int
