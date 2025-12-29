"""Token schemas for JWT authentication"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class Token(BaseModel):
    """Token response schema"""
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: int  # seconds


class TokenPayload(BaseModel):
    """JWT token payload schema"""
    sub: int  # user_id
    exp: datetime
    iat: datetime
    type: str = "access"  # access or refresh
    company_id: Optional[int] = None


class TokenData(BaseModel):
    """Decoded token data"""
    user_id: int
    company_id: Optional[int] = None
    token_type: str = "access"
