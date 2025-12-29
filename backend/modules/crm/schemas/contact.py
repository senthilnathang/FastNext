"""
Contact Schemas

Pydantic schemas for CRM contact validation and serialization.
"""

from datetime import datetime, date
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, EmailStr


class ContactBase(BaseModel):
    """Base schema for contacts."""

    first_name: str = Field(..., min_length=1, max_length=100, description="First name")
    last_name: Optional[str] = Field(None, max_length=100, description="Last name")
    middle_name: Optional[str] = Field(None, max_length=100, description="Middle name")
    title: Optional[str] = Field(None, max_length=20, description="Title (Mr., Mrs., etc.)")
    email: Optional[EmailStr] = Field(None, description="Email address")
    phone: Optional[str] = Field(None, max_length=50, description="Phone number")
    mobile: Optional[str] = Field(None, max_length=50, description="Mobile number")
    fax: Optional[str] = Field(None, max_length=50, description="Fax number")
    job_title: Optional[str] = Field(None, max_length=100, description="Job title")
    department: Optional[str] = Field(None, max_length=100, description="Department")
    assistant_name: Optional[str] = Field(None, max_length=100)
    assistant_phone: Optional[str] = Field(None, max_length=50)
    street: Optional[str] = Field(None, max_length=255)
    street2: Optional[str] = Field(None, max_length=255)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    zip_code: Optional[str] = Field(None, max_length=20)
    country: Optional[str] = Field(None, max_length=100)
    other_street: Optional[str] = Field(None, max_length=255)
    other_city: Optional[str] = Field(None, max_length=100)
    other_state: Optional[str] = Field(None, max_length=100)
    other_zip: Optional[str] = Field(None, max_length=20)
    other_country: Optional[str] = Field(None, max_length=100)
    linkedin: Optional[str] = Field(None, max_length=255)
    twitter: Optional[str] = Field(None, max_length=255)
    facebook: Optional[str] = Field(None, max_length=255)
    birthdate: Optional[date] = Field(None, description="Birth date")
    description: Optional[str] = Field(None, description="Description")
    is_active: bool = Field(True, description="Active status")
    is_primary: bool = Field(False, description="Primary contact for account")
    do_not_call: bool = Field(False, description="Do not call flag")
    email_opt_out: bool = Field(False, description="Email opt out flag")
    lead_source: Optional[str] = Field(None, max_length=100, description="Lead source")
    custom_fields: Dict[str, Any] = Field(default_factory=dict, description="Custom fields")


class ContactCreate(ContactBase):
    """Schema for creating a contact."""

    account_id: Optional[int] = Field(None, description="Related account ID")
    user_id: Optional[int] = Field(None, description="Assigned user ID")
    tag_ids: List[int] = Field(default_factory=list, description="Tag IDs")


class ContactUpdate(BaseModel):
    """Schema for updating a contact."""

    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    middle_name: Optional[str] = Field(None, max_length=100)
    title: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    mobile: Optional[str] = Field(None, max_length=50)
    fax: Optional[str] = Field(None, max_length=50)
    job_title: Optional[str] = Field(None, max_length=100)
    department: Optional[str] = Field(None, max_length=100)
    assistant_name: Optional[str] = Field(None, max_length=100)
    assistant_phone: Optional[str] = Field(None, max_length=50)
    account_id: Optional[int] = None
    user_id: Optional[int] = None
    street: Optional[str] = Field(None, max_length=255)
    street2: Optional[str] = Field(None, max_length=255)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    zip_code: Optional[str] = Field(None, max_length=20)
    country: Optional[str] = Field(None, max_length=100)
    other_street: Optional[str] = Field(None, max_length=255)
    other_city: Optional[str] = Field(None, max_length=100)
    other_state: Optional[str] = Field(None, max_length=100)
    other_zip: Optional[str] = Field(None, max_length=20)
    other_country: Optional[str] = Field(None, max_length=100)
    linkedin: Optional[str] = Field(None, max_length=255)
    twitter: Optional[str] = Field(None, max_length=255)
    facebook: Optional[str] = Field(None, max_length=255)
    birthdate: Optional[date] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    is_primary: Optional[bool] = None
    do_not_call: Optional[bool] = None
    email_opt_out: Optional[bool] = None
    lead_source: Optional[str] = Field(None, max_length=100)
    custom_fields: Optional[Dict[str, Any]] = None
    tag_ids: Optional[List[int]] = None


class TagInfo(BaseModel):
    """Tag info within contact response."""

    id: int
    name: str
    color: Optional[str] = None

    class Config:
        from_attributes = True


class AccountInfo(BaseModel):
    """Account info within contact response."""

    id: int
    name: str

    class Config:
        from_attributes = True


class UserInfo(BaseModel):
    """User info within contact response."""

    id: int
    username: str
    full_name: Optional[str] = None

    class Config:
        from_attributes = True


class ContactResponse(ContactBase):
    """Schema for contact response."""

    id: int
    company_id: Optional[int] = None
    account_id: Optional[int] = None
    user_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    full_name: str = ""
    display_name: str = ""
    account: Optional[AccountInfo] = None
    user: Optional[UserInfo] = None
    tags: List[TagInfo] = []

    class Config:
        from_attributes = True


class ContactList(BaseModel):
    """Schema for list of contacts."""

    items: List[ContactResponse]
    total: int
    page: int = 1
    page_size: int = 20
