from typing import Optional

from pydantic import BaseModel, Field, validator


class SecuritySettingBase(BaseModel):
    # Two-Factor Authentication
    two_factor_enabled: Optional[bool] = Field(
        default=False, description="Enable two-factor authentication"
    )

    # Login Security
    require_password_change: Optional[bool] = Field(
        default=False, description="Require password change on next login"
    )
    password_expiry_days: Optional[int] = Field(
        default=90,
        ge=0,
        le=365,
        description="Password expiry in days (0 for no expiry)",
    )
    max_login_attempts: Optional[int] = Field(
        default=5, ge=1, le=20, description="Maximum failed login attempts"
    )
    lockout_duration_minutes: Optional[int] = Field(
        default=30, ge=1, le=1440, description="Account lockout duration in minutes"
    )

    # Session Security
    max_session_duration_hours: Optional[int] = Field(
        default=24, ge=1, le=168, description="Maximum session duration in hours"
    )
    allow_concurrent_sessions: Optional[bool] = Field(
        default=True, description="Allow multiple concurrent sessions"
    )
    max_concurrent_sessions: Optional[int] = Field(
        default=5, ge=1, le=20, description="Maximum concurrent sessions"
    )

    # Notification Preferences
    email_on_login: Optional[bool] = Field(
        default=True, description="Send email notification on login"
    )
    email_on_password_change: Optional[bool] = Field(
        default=True, description="Send email notification on password change"
    )
    email_on_security_change: Optional[bool] = Field(
        default=True, description="Send email notification on security changes"
    )
    email_on_suspicious_activity: Optional[bool] = Field(
        default=True, description="Send email notification on suspicious activity"
    )

    # Privacy Settings
    activity_logging_enabled: Optional[bool] = Field(
        default=True, description="Enable activity logging"
    )
    data_retention_days: Optional[int] = Field(
        default=90,
        ge=0,
        le=3650,
        description="Data retention in days (0 for indefinite)",
    )

    # API Access
    api_access_enabled: Optional[bool] = Field(
        default=True, description="Enable API access"
    )
    api_rate_limit: Optional[int] = Field(
        default=100, ge=10, le=10000, description="API rate limit (requests per hour)"
    )

    @validator("max_concurrent_sessions")
    def validate_concurrent_sessions(cls, v, values):
        if not values.get("allow_concurrent_sessions", True) and v > 1:
            return 1  # If concurrent sessions not allowed, max should be 1
        return v


class SecuritySettingCreate(SecuritySettingBase):
    user_id: int = Field(..., description="User ID for these security settings")


class SecuritySettingUpdate(SecuritySettingBase):
    pass


class SecuritySettingResponse(SecuritySettingBase):
    id: int
    user_id: int
    created_at: Optional[str]
    updated_at: Optional[str]

    class Config:
        from_attributes = True


class TwoFactorSetup(BaseModel):
    """Schema for setting up two-factor authentication"""

    secret: str = Field(..., description="TOTP secret key")
    qr_code_url: str = Field(..., description="QR code URL for authenticator apps")
    backup_codes: list[str] = Field(
        ..., description="Backup codes for account recovery"
    )


class TwoFactorVerify(BaseModel):
    """Schema for verifying two-factor authentication setup"""

    token: str = Field(..., min_length=6, max_length=6, description="6-digit TOTP code")


class TwoFactorDisable(BaseModel):
    """Schema for disabling two-factor authentication"""

    password: str = Field(..., description="Current password for verification")
    token: Optional[str] = Field(None, description="Current TOTP token or backup code")


class SecuritySettingsOverview(BaseModel):
    """Overview of user's security settings"""

    user_id: int
    two_factor_enabled: bool
    password_strength_score: int  # 1-5 scale
    last_password_change: Optional[str]
    active_sessions_count: int
    recent_login_attempts: int
    security_score: int  # Overall security score 1-100
    recommendations: list[str]  # List of security recommendations
