"""Authentication dependencies"""

from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.api.deps.database import get_db
from app.core.security import decode_token
from app.models import User
from app.services.permission_service import PermissionService

# Bearer token security scheme
security_scheme = HTTPBearer(
    scheme_name="Bearer Token",
    description="Enter your JWT access token",
)

# Optional bearer token (for public endpoints with optional auth)
security_scheme_optional = HTTPBearer(
    scheme_name="Bearer Token (Optional)",
    description="Enter your JWT access token (optional)",
    auto_error=False,
)


def get_current_user(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
) -> User:
    """
    Get current authenticated user from JWT token.

    Raises:
        HTTPException: If token is invalid or user not found
    """
    token = credentials.credentials
    payload = decode_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Get current active user.

    Raises:
        HTTPException: If user is inactive or locked
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    if current_user.is_locked():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is locked",
        )

    return current_user


def get_current_superuser(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """
    Get current superuser.

    Raises:
        HTTPException: If user is not a superuser
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superuser access required",
        )

    return current_user


def get_optional_user(
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        security_scheme_optional
    ),
) -> Optional[User]:
    """
    Get current user if authenticated, otherwise return None.
    Useful for endpoints that work for both authenticated and anonymous users.
    """
    if not credentials:
        return None

    token = credentials.credentials
    payload = decode_token(token)

    if not payload or payload.get("type") != "access":
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    user = db.query(User).filter(User.id == int(user_id)).first()
    return user if user and user.is_active else None


class PermissionChecker:
    """
    Dependency for checking user permissions.

    Uses PermissionService with optimized JOINs to avoid N+1 queries.

    Usage:
        @router.get("/users")
        def get_users(
            user: User = Depends(PermissionChecker("user.read"))
        ):
            ...
    """

    def __init__(self, required_permission: str):
        self.required_permission = required_permission

    def __call__(
        self,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_active_user),
    ) -> User:
        if current_user.is_superuser:
            return current_user

        # Use PermissionService for optimized permission check (no N+1 queries)
        permission_service = PermissionService(db)
        has_perm = permission_service.has_permission(
            user_id=current_user.id,
            codename=self.required_permission,
            company_id=current_user.current_company_id,
            is_superuser=current_user.is_superuser,
        )

        if not has_perm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{self.required_permission}' required",
            )

        return current_user


def require_permission(permission: str):
    """Decorator-style permission checker"""
    return Depends(PermissionChecker(permission))
