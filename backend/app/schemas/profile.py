from typing import Optional
from pydantic import BaseModel, EmailStr, Field, validator
from datetime import datetime
import re


class ProfileUpdate(BaseModel):
    """Schema for updating user profile information"""
    full_name: Optional[str] = Field(None, max_length=255, description="Full name")
    bio: Optional[str] = Field(None, max_length=1000, description="User biography")
    location: Optional[str] = Field(None, max_length=255, description="Location")
    website: Optional[str] = Field(None, max_length=500, description="Website URL")
    avatar_url: Optional[str] = Field(None, max_length=500, description="Avatar URL")
    
    @validator('website')
    def validate_website_url(cls, v):
        if v and not re.match(r'^https?:\/\/.*', v):
            raise ValueError('Website must be a valid URL starting with http:// or https://')
        return v


class EmailUpdate(BaseModel):
    """Schema for updating user email"""
    email: EmailStr = Field(..., description="New email address")
    password: str = Field(..., description="Current password for verification")


class PasswordChange(BaseModel):
    """Schema for changing user password"""
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=8, max_length=128, description="New password")
    confirm_password: str = Field(..., description="Confirm new password")
    
    @validator('new_password')
    def validate_password_strength(cls, v):
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character')
        return v
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v


class UsernameUpdate(BaseModel):
    """Schema for updating username"""
    username: str = Field(..., min_length=3, max_length=50, description="New username")
    password: str = Field(..., description="Current password for verification")
    
    @validator('username')
    def validate_username(cls, v):
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError('Username can only contain letters, numbers, underscores, and hyphens')
        return v


class AccountDeactivation(BaseModel):
    """Schema for account deactivation"""
    password: str = Field(..., description="Current password for verification")
    reason: Optional[str] = Field(None, max_length=500, description="Reason for deactivation")
    feedback: Optional[str] = Field(None, max_length=1000, description="Additional feedback")


class ProfileResponse(BaseModel):
    """Response schema for user profile"""
    id: int
    email: str
    username: str
    full_name: Optional[str]
    bio: Optional[str]
    location: Optional[str]
    website: Optional[str]
    avatar_url: Optional[str]
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: Optional[datetime]
    last_login_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class ProfileStats(BaseModel):
    """User profile statistics"""
    projects_count: int
    components_created: int
    pages_created: int
    last_activity: Optional[datetime]
    member_since: datetime
    account_age_days: int


class QuickAction(BaseModel):
    """Schema for quick action items"""
    id: str
    title: str
    description: str
    icon: str
    action_type: str
    endpoint: str
    method: str = "GET"
    requires_confirmation: bool = False
    category: str = "general"