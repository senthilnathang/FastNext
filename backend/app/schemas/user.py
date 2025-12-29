"""User schemas"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


class UserBase(BaseModel):
    """Base user schema with common fields"""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    full_name: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    timezone: str = "UTC"
    language: str = "en"


class UserCreate(UserBase):
    """Schema for creating a user"""
    password: str = Field(..., min_length=8, max_length=100)
    is_active: bool = True
    is_verified: bool = False

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class UserUpdate(BaseModel):
    """Schema for updating a user"""
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(None, min_length=3, max_length=100)
    full_name: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    is_active: Optional[bool] = None


class CompanyRoleInfo(BaseModel):
    """Company and role info for a user"""
    company_id: int
    company_name: str
    company_code: str
    role_id: int
    role_name: str
    role_codename: str
    is_default: bool

    model_config = {"from_attributes": True}


class UserResponse(UserBase):
    """User response schema"""
    id: int
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    is_active: bool
    is_verified: bool
    is_superuser: bool
    two_factor_enabled: bool
    current_company_id: Optional[int] = None
    last_login_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class UserWithRoles(UserResponse):
    """User response with company roles"""
    company_roles: List[CompanyRoleInfo] = []
    permissions: List[str] = []

    model_config = {"from_attributes": True}


class UserInDB(UserResponse):
    """User in database (includes hashed password)"""
    hashed_password: str

    model_config = {"from_attributes": True}


class UserList(BaseModel):
    """Paginated user list response"""
    total: int
    items: List[UserResponse]
    page: int
    page_size: int
