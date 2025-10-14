"""
Authentication Dependencies
FastAPI dependencies for authentication and authorization
"""

from typing import List, Optional

from app.api.deps.database import get_db
from app.auth.deps import get_current_user as _get_current_user
from app.models.user import User
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

security = HTTPBearer()


async def get_current_user(
    db: AsyncSession = Depends(get_db), token: str = Depends(security)
) -> User:
    """
    Get current authenticated user

    Args:
        db: Database session
        token: JWT token

    Returns:
        User: Current user

    Raises:
        HTTPException: If user not authenticated
    """
    return await _get_current_user(db, token.credentials)


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Get current active user

    Args:
        current_user: Current user

    Returns:
        User: Active user

    Raises:
        HTTPException: If user is inactive
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user"
        )
    return current_user


def require_permissions(required_permissions: List[str]):
    """
    Dependency factory for permission-based access control

    Args:
        required_permissions: List of required permissions

    Returns:
        Dependency function
    """

    async def permission_dependency(
        current_user: User = Depends(get_current_active_user),
    ) -> User:
        # Check if user has required permissions
        user_permissions = [perm.name for perm in current_user.permissions]

        for permission in required_permissions:
            if permission not in user_permissions:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission denied. Required: {permission}",
                )

        return current_user

    return permission_dependency


def require_admin():
    """
    Dependency for admin-only access

    Returns:
        Dependency function
    """
    return require_permissions(["admin.access"])


def require_role(required_roles: List[str]):
    """
    Dependency factory for role-based access control

    Args:
        required_roles: List of required roles

    Returns:
        Dependency function
    """

    async def role_dependency(
        current_user: User = Depends(get_current_active_user),
    ) -> User:
        user_roles = [role.name for role in current_user.roles]

        if not any(role in user_roles for role in required_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {required_roles}",
            )

        return current_user

    return role_dependency
