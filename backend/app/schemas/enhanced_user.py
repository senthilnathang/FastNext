"""
Enhanced user schemas that mirror the TypeScript Zod schemas.
Provides type-safe validation and seamless frontend-backend integration.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from app.services.validation_service import (
    EmailField,
    EnhancedValidationMixin,
    PasswordField,
    UsernameField,
    ValidationService,
)
from pydantic import BaseModel, EmailStr, Field, root_validator, validator


class UserStatus(str, Enum):
    """User status enumeration"""

    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING = "pending"


class UserCreateRequest(BaseModel):
    """User creation request schema that mirrors Zod UserCreateSchema"""

    email: EmailStr = EmailField(description="User email address")
    username: str = UsernameField(description="Unique username")
    full_name: str = Field(..., min_length=1, max_length=100, description="Full name")
    password: str = PasswordField(description="User password")
    confirm_password: str = Field(..., description="Password confirmation")
    is_active: Optional[bool] = Field(True, description="User active status")
    timezone: Optional[str] = Field("UTC", description="User timezone")
    locale: Optional[str] = Field("en-US", description="User locale")

    @validator("email")
    def validate_email_field(cls, v):
        result = ValidationService.validate_email(v)
        if not result["is_valid"]:
            raise ValueError(result["error"])
        return result["normalized_email"]

    @validator("username")
    def validate_username_field(cls, v):
        result = ValidationService.validate_username(v)
        if not result["is_valid"]:
            raise ValueError("; ".join(result["errors"]))
        return result["normalized"]

    @validator("password")
    def validate_password_field(cls, v):
        result = ValidationService.validate_password(v)
        if not result["is_valid"]:
            raise ValueError("; ".join(result["errors"]))
        return v

    @validator("timezone")
    def validate_timezone_field(cls, v):
        if v:
            result = ValidationService.validate_timezone(v)
            if not result["is_valid"]:
                raise ValueError(result["error"])
        return v

    @root_validator
    def validate_password_confirmation(cls, values):
        password = values.get("password")
        confirm_password = values.get("confirm_password")

        if password != confirm_password:
            raise ValueError("Passwords don't match")

        return values

    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "username": "johndoe",
                "full_name": "John Doe",
                "password": "SecurePass123!",
                "confirm_password": "SecurePass123!",
                "is_active": True,
                "timezone": "UTC",
                "locale": "en-US",
            }
        }


class UserUpdateRequest(BaseModel):
    """User update request schema that mirrors Zod UserUpdateSchema"""

    email: Optional[EmailStr] = None
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    full_name: Optional[str] = Field(None, min_length=1, max_length=100)
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None
    profile_image_url: Optional[str] = Field(None, max_length=500)
    timezone: Optional[str] = None
    locale: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = Field(default_factory=dict)

    @validator("email")
    def validate_email_field(cls, v):
        if v:
            result = ValidationService.validate_email(v)
            if not result["is_valid"]:
                raise ValueError(result["error"])
            return result["normalized_email"]
        return v

    @validator("username")
    def validate_username_field(cls, v):
        if v:
            result = ValidationService.validate_username(v)
            if not result["is_valid"]:
                raise ValueError("; ".join(result["errors"]))
            return result["normalized"]
        return v

    @validator("profile_image_url")
    def validate_profile_image_url(cls, v):
        if v:
            result = ValidationService.validate_url(v)
            if not result["is_valid"]:
                raise ValueError(result["error"])
        return v

    @validator("timezone")
    def validate_timezone_field(cls, v):
        if v:
            result = ValidationService.validate_timezone(v)
            if not result["is_valid"]:
                raise ValueError(result["error"])
        return v


class PasswordChangeRequest(BaseModel):
    """Password change request schema that mirrors Zod PasswordChangeSchema"""

    current_password: str = Field(..., description="Current password")
    new_password: str = PasswordField(description="New password")
    confirm_new_password: str = Field(..., description="New password confirmation")

    @validator("new_password")
    def validate_new_password(cls, v):
        result = ValidationService.validate_password(v)
        if not result["is_valid"]:
            raise ValueError("; ".join(result["errors"]))
        return v

    @root_validator
    def validate_passwords(cls, values):
        current_password = values.get("current_password")
        new_password = values.get("new_password")
        confirm_new_password = values.get("confirm_new_password")

        # Check that new password is different from current
        if current_password == new_password:
            raise ValueError("New password must be different from current password")

        # Check that new passwords match
        if new_password != confirm_new_password:
            raise ValueError("New passwords don't match")

        return values


class LoginRequest(BaseModel):
    """Login request schema that mirrors Zod LoginSchema"""

    username: str = Field(..., min_length=1, description="Username or email")
    password: str = Field(..., min_length=1, description="Password")
    remember_me: Optional[bool] = Field(False, description="Remember login session")

    class Config:
        json_schema_extra = {
            "example": {
                "username": "johndoe",
                "password": "SecurePass123!",
                "remember_me": False,
            }
        }


class ForgotPasswordRequest(BaseModel):
    """Forgot password request schema that mirrors Zod ForgotPasswordSchema"""

    email: EmailStr = EmailField(description="Email address for password reset")

    @validator("email")
    def validate_email_field(cls, v):
        result = ValidationService.validate_email(v)
        if not result["is_valid"]:
            raise ValueError(result["error"])
        return result["normalized_email"]


class ResetPasswordRequest(BaseModel):
    """Reset password request schema that mirrors Zod ResetPasswordSchema"""

    token: str = Field(..., min_length=1, description="Password reset token")
    password: str = PasswordField(description="New password")
    confirm_password: str = Field(..., description="Password confirmation")

    @validator("password")
    def validate_password_field(cls, v):
        result = ValidationService.validate_password(v)
        if not result["is_valid"]:
            raise ValueError("; ".join(result["errors"]))
        return v

    @root_validator
    def validate_password_confirmation(cls, values):
        password = values.get("password")
        confirm_password = values.get("confirm_password")

        if password != confirm_password:
            raise ValueError("Passwords don't match")

        return values


class EmailVerificationRequest(BaseModel):
    """Email verification request schema that mirrors Zod EmailVerificationSchema"""

    token: str = Field(..., min_length=1, description="Email verification token")


class UserProfileUpdateRequest(BaseModel):
    """User profile update schema for self-service updates"""

    full_name: Optional[str] = Field(None, min_length=1, max_length=100)
    profile_image_url: Optional[str] = Field(None, max_length=500)
    timezone: Optional[str] = None
    locale: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = Field(default_factory=dict)

    @validator("profile_image_url")
    def validate_profile_image_url(cls, v):
        if v:
            result = ValidationService.validate_url(v)
            if not result["is_valid"]:
                raise ValueError(result["error"])
        return v

    @validator("timezone")
    def validate_timezone_field(cls, v):
        if v:
            result = ValidationService.validate_timezone(v)
            if not result["is_valid"]:
                raise ValueError(result["error"])
        return v


class UserSearchRequest(BaseModel):
    """User search and filtering schema that mirrors Zod UserSearchSchema"""

    query: Optional[str] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None
    page: int = Field(1, ge=1, description="Page number")
    limit: int = Field(10, ge=1, le=100, description="Items per page")
    sort_by: Optional[str] = Field(
        "created_at",
        pattern=r"^(created_at|updated_at|last_login|email|username|full_name)$",
    )
    sort_order: Optional[str] = Field("desc", pattern=r"^(asc|desc)$")

    @root_validator
    def validate_date_range(cls, values):
        created_after = values.get("created_after")
        created_before = values.get("created_before")

        if created_after and created_before:
            if created_after >= created_before:
                raise ValueError("created_after must be before created_before")

        return values


class UserBulkUpdateRequest(BaseModel):
    """Bulk user operations schema that mirrors Zod UserBulkUpdateSchema"""

    user_ids: List[int] = Field(..., min_items=1, description="List of user IDs")
    updates: Dict[str, Any] = Field(..., description="Updates to apply")

    @validator("updates")
    def validate_updates(cls, v):
        allowed_fields = {"is_active", "is_verified"}
        if not any(field in v for field in allowed_fields):
            raise ValueError("At least one field must be updated")

        for field in v:
            if field not in allowed_fields:
                raise ValueError(f"Field '{field}' is not allowed for bulk updates")

        return v


class UserResponse(BaseModel):
    """User response schema that mirrors the frontend User type"""

    id: int
    email: str
    username: str
    full_name: str
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    profile_image_url: Optional[str] = None
    timezone: str = "UTC"
    locale: str = "en-US"
    preferences: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "email": "user@example.com",
                "username": "johndoe",
                "full_name": "John Doe",
                "is_active": True,
                "is_verified": True,
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z",
                "last_login": "2024-01-01T00:00:00Z",
                "profile_image_url": "https://example.com/avatar.jpg",
                "timezone": "UTC",
                "locale": "en-US",
                "preferences": {},
            }
        }


class AuthTokenResponse(BaseModel):
    """Authentication token response schema"""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse

    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "expires_in": 900,
                "user": {
                    "id": 1,
                    "email": "user@example.com",
                    "username": "johndoe",
                    "full_name": "John Doe",
                    "is_active": True,
                    "is_verified": True,
                },
            }
        }


class RefreshTokenRequest(BaseModel):
    """Refresh token request schema"""

    refresh_token: str = Field(..., min_length=1, description="Refresh token")


# Validation helpers for API endpoints
class UserValidationHelpers:
    """Helper methods for user validation in API endpoints"""

    @staticmethod
    def validate_user_create_data(data: Dict[str, Any]) -> UserCreateRequest:
        """Validate user creation data"""
        return UserCreateRequest(**data)

    @staticmethod
    def validate_user_update_data(data: Dict[str, Any]) -> UserUpdateRequest:
        """Validate user update data"""
        return UserUpdateRequest(**data)

    @staticmethod
    def validate_login_data(data: Dict[str, Any]) -> LoginRequest:
        """Validate login data"""
        return LoginRequest(**data)

    @staticmethod
    def validate_password_change_data(data: Dict[str, Any]) -> PasswordChangeRequest:
        """Validate password change data"""
        return PasswordChangeRequest(**data)

    @staticmethod
    def validate_user_search_params(params: Dict[str, Any]) -> UserSearchRequest:
        """Validate user search parameters"""
        return UserSearchRequest(**params)


# Export all schemas
__all__ = [
    "UserStatus",
    "UserCreateRequest",
    "UserUpdateRequest",
    "PasswordChangeRequest",
    "LoginRequest",
    "ForgotPasswordRequest",
    "ResetPasswordRequest",
    "EmailVerificationRequest",
    "UserProfileUpdateRequest",
    "UserSearchRequest",
    "UserBulkUpdateRequest",
    "UserResponse",
    "AuthTokenResponse",
    "RefreshTokenRequest",
    "UserValidationHelpers",
]
