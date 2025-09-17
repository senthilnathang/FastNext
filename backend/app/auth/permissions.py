from functools import wraps
from typing import Optional
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.services.permission_service import PermissionService


def require_permission(action: str, category: str):
    """Decorator to require specific permission for route access"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract dependencies from kwargs
            current_user = kwargs.get('current_user')
            db = kwargs.get('db')
            
            if not current_user or not db:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Missing required dependencies"
                )
            
            if not PermissionService.check_permission(
                db, current_user.id, action, category
            ):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Insufficient permissions: {action}:{category}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def require_project_permission(action: str):
    """Decorator to require specific project permission"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get('current_user')
            db = kwargs.get('db')
            project_id = kwargs.get('project_id')
            
            if not current_user or not db or not project_id:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Missing required dependencies"
                )
            
            if not PermissionService.check_project_permission(
                db, current_user.id, project_id, action
            ):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Insufficient project permissions: {action}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


# Dependency functions for FastAPI
def require_admin(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Dependency to require admin role"""
    if not current_user.is_superuser:
        if not PermissionService.check_permission(db, current_user.id, "manage", "system"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
    return current_user


def check_project_access(project_id: int):
    """Dependency factory to check project access"""
    def _check_project_access(
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db)
    ):
        if not PermissionService.check_project_permission(
            db, current_user.id, project_id, "read"
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Project access denied"
            )
        return current_user
    
    return _check_project_access


def check_project_edit_access(project_id: int):
    """Dependency factory to check project edit access"""
    def _check_project_edit_access(
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db)
    ):
        if not PermissionService.check_project_permission(
            db, current_user.id, project_id, "update"
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Project edit access denied"
            )
        return current_user
    
    return _check_project_edit_access