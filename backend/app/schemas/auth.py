"""Authentication schemas"""

from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    """Login request schema"""
    username: str = Field(..., description="Username or email")
    password: str = Field(..., min_length=1)
    two_factor_code: Optional[str] = Field(None, min_length=6, max_length=6)


class CompanyInfo(BaseModel):
    """Company info for login response"""
    id: int
    name: str
    code: str
    is_default: bool

    model_config = {"from_attributes": True}


class UserInfo(BaseModel):
    """User info for login response"""
    id: int
    email: str
    username: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    is_superuser: bool
    two_factor_enabled: bool
    current_company_id: Optional[int] = None

    model_config = {"from_attributes": True}


class LoginResponse(BaseModel):
    """Login response schema"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserInfo
    companies: List[CompanyInfo] = []
    permissions: List[str] = []
    requires_2fa: bool = False


class RefreshTokenRequest(BaseModel):
    """Refresh token request"""
    refresh_token: str


class TwoFactorSetup(BaseModel):
    """Two-factor authentication setup response"""
    secret: str
    qr_code: str  # Base64 encoded QR code image
    backup_codes: List[str]


class TwoFactorVerify(BaseModel):
    """Two-factor verification request"""
    code: str = Field(..., min_length=6, max_length=6)


class TwoFactorBackupCode(BaseModel):
    """Two-factor backup code request"""
    backup_code: str


class PasswordReset(BaseModel):
    """Password reset request"""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Password reset confirmation"""
    token: str
    new_password: str = Field(..., min_length=8)


class PasswordChange(BaseModel):
    """Password change request"""
    current_password: str
    new_password: str = Field(..., min_length=8)


class OAuthCallback(BaseModel):
    """OAuth callback data"""
    code: str
    state: Optional[str] = None


class SwitchCompanyRequest(BaseModel):
    """Switch company request"""
    company_id: int
