"""
Account Schemas

Pydantic schemas for CRM account validation and serialization.
"""

from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from ..models.account import AccountType, AccountRating, Industry


class AccountBase(BaseModel):
    """Base schema for accounts."""

    name: str = Field(..., min_length=1, max_length=200, description="Company name")
    website: Optional[str] = Field(None, max_length=255, description="Website URL")
    phone: Optional[str] = Field(None, max_length=50, description="Phone number")
    fax: Optional[str] = Field(None, max_length=50, description="Fax number")
    account_type: AccountType = Field(AccountType.PROSPECT, description="Account type")
    industry: Optional[Industry] = Field(None, description="Industry")
    rating: AccountRating = Field(AccountRating.WARM, description="Account rating")
    employees: Optional[int] = Field(None, ge=0, description="Number of employees")
    annual_revenue: Optional[Decimal] = Field(None, ge=0, description="Annual revenue")
    billing_street: Optional[str] = Field(None, max_length=255)
    billing_street2: Optional[str] = Field(None, max_length=255)
    billing_city: Optional[str] = Field(None, max_length=100)
    billing_state: Optional[str] = Field(None, max_length=100)
    billing_zip: Optional[str] = Field(None, max_length=20)
    billing_country: Optional[str] = Field(None, max_length=100)
    shipping_street: Optional[str] = Field(None, max_length=255)
    shipping_street2: Optional[str] = Field(None, max_length=255)
    shipping_city: Optional[str] = Field(None, max_length=100)
    shipping_state: Optional[str] = Field(None, max_length=100)
    shipping_zip: Optional[str] = Field(None, max_length=20)
    shipping_country: Optional[str] = Field(None, max_length=100)
    linkedin: Optional[str] = Field(None, max_length=255)
    twitter: Optional[str] = Field(None, max_length=255)
    facebook: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = Field(None, description="Description")
    is_active: bool = Field(True, description="Active status")
    sla_level: Optional[str] = Field(None, max_length=50)
    tier: Optional[str] = Field(None, max_length=50)
    ownership: Optional[str] = Field(None, max_length=100, description="Public, Private, Subsidiary")
    custom_fields: Dict[str, Any] = Field(default_factory=dict, description="Custom fields")


class AccountCreate(AccountBase):
    """Schema for creating an account."""

    user_id: Optional[int] = Field(None, description="Assigned user ID")
    parent_id: Optional[int] = Field(None, description="Parent account ID")
    tag_ids: List[int] = Field(default_factory=list, description="Tag IDs")


class AccountUpdate(BaseModel):
    """Schema for updating an account."""

    name: Optional[str] = Field(None, min_length=1, max_length=200)
    website: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    fax: Optional[str] = Field(None, max_length=50)
    account_type: Optional[AccountType] = None
    industry: Optional[Industry] = None
    rating: Optional[AccountRating] = None
    employees: Optional[int] = Field(None, ge=0)
    annual_revenue: Optional[Decimal] = Field(None, ge=0)
    user_id: Optional[int] = None
    parent_id: Optional[int] = None
    billing_street: Optional[str] = Field(None, max_length=255)
    billing_street2: Optional[str] = Field(None, max_length=255)
    billing_city: Optional[str] = Field(None, max_length=100)
    billing_state: Optional[str] = Field(None, max_length=100)
    billing_zip: Optional[str] = Field(None, max_length=20)
    billing_country: Optional[str] = Field(None, max_length=100)
    shipping_street: Optional[str] = Field(None, max_length=255)
    shipping_street2: Optional[str] = Field(None, max_length=255)
    shipping_city: Optional[str] = Field(None, max_length=100)
    shipping_state: Optional[str] = Field(None, max_length=100)
    shipping_zip: Optional[str] = Field(None, max_length=20)
    shipping_country: Optional[str] = Field(None, max_length=100)
    linkedin: Optional[str] = Field(None, max_length=255)
    twitter: Optional[str] = Field(None, max_length=255)
    facebook: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    is_active: Optional[bool] = None
    sla_level: Optional[str] = Field(None, max_length=50)
    tier: Optional[str] = Field(None, max_length=50)
    ownership: Optional[str] = Field(None, max_length=100)
    custom_fields: Optional[Dict[str, Any]] = None
    tag_ids: Optional[List[int]] = None


class TagInfo(BaseModel):
    """Tag info within account response."""

    id: int
    name: str
    color: Optional[str] = None

    class Config:
        from_attributes = True


class UserInfo(BaseModel):
    """User info within account response."""

    id: int
    username: str
    full_name: Optional[str] = None

    class Config:
        from_attributes = True


class ParentAccountInfo(BaseModel):
    """Parent account info."""

    id: int
    name: str

    class Config:
        from_attributes = True


class AccountResponse(AccountBase):
    """Schema for account response."""

    id: int
    company_id: Optional[int] = None
    user_id: Optional[int] = None
    parent_id: Optional[int] = None
    team_id: Optional[int] = None
    contact_count: int = 0
    opportunity_count: int = 0
    total_opportunity_value: Decimal = Decimal(0)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    user: Optional[UserInfo] = None
    parent: Optional[ParentAccountInfo] = None
    tags: List[TagInfo] = []

    class Config:
        from_attributes = True


class AccountList(BaseModel):
    """Schema for list of accounts."""

    items: List[AccountResponse]
    total: int
    page: int = 1
    page_size: int = 20
