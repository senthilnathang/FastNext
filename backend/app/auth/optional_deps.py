"""
Optional authentication dependencies for development and testing
"""

from typing import Optional

from app.core import security
from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.schemas.token import TokenPayload
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt
from pydantic import ValidationError
from sqlalchemy.orm import Session

# Use HTTPBearer for authentication
security_scheme = HTTPBearer(
    scheme_name="Bearer Token (Optional)",
    description="Enter your JWT access token (optional for development)",
    auto_error=False,  # Don't raise error if no token provided
)


def get_current_user_optional(
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
) -> Optional[User]:
    """
    Get current authenticated user from JWT token (optional)

    Returns None if no valid authentication is provided.
    This allows endpoints to work in development mode without authentication.

    Args:
        db: Database session
        credentials: Optional HTTPAuthorizationCredentials with Bearer token

    Returns:
        User or None: Current authenticated user or None if not authenticated
    """
    if not credentials:
        return None

    token = credentials.credentials
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
        user = db.query(User).filter(User.id == token_data.sub).first()
        if user is None:
            return None
        return user
    except (jwt.JWTError, ValidationError):
        return None


def get_current_user_dev_friendly(
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
) -> User:
    """
    Get current authenticated user with development-friendly fallback

    In development, if no authentication is provided, returns a default admin user.
    In production, requires valid authentication.

    Args:
        db: Database session
        credentials: Optional HTTPAuthorizationCredentials with Bearer token

    Returns:
        User: Current authenticated user or default user in development

    Raises:
        HTTPException: If authentication is required but not provided/invalid
    """
    # Try to get authenticated user
    user = get_current_user_optional(db, credentials)

    if user:
        return user

    # In development mode, provide a fallback default user
    # This should only be used for development/testing purposes
    import os

    if os.getenv("ENVIRONMENT", "development").lower() in [
        "development",
        "dev",
        "local",
    ]:
        # Return the admin user as a fallback for development
        default_user = db.query(User).filter(User.username == "admin").first()
        if default_user:
            return default_user

        # If no admin user, return the first active user
        fallback_user = db.query(User).filter(User.is_active == True).first()
        if fallback_user:
            return fallback_user

    # No authentication provided and not in development mode
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Authentication required",
        headers={"WWW-Authenticate": "Bearer"},
    )
