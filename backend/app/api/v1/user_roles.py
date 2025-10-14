from typing import Any, List

from app.auth.deps import get_current_active_user
from app.auth.permissions import require_admin
from app.db.session import get_db
from app.models.user import User
from app.models.user_role import UserRole
from app.schemas.user_role import UserRole as UserRoleSchema
from app.schemas.user_role import UserRoleCreate, UserRoleUpdate, UserWithRoles
from app.services.permission_service import PermissionService
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

router = APIRouter()


@router.get("/user/{user_id}/roles", response_model=List[UserRoleSchema])
def read_user_roles(
    *,
    db: Session = Depends(get_db),
    user_id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Get roles for a specific user"""
    # Users can view their own roles, admins can view any user's roles
    if user_id != current_user.id:
        if not PermissionService.check_resource_permission(
            db, current_user.id, "read", "user"
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to read user roles",
            )

    user_roles = (
        db.query(UserRole)
        .filter(UserRole.user_id == user_id, UserRole.is_active == True)
        .all()
    )
    return user_roles


@router.post("", response_model=UserRoleSchema)
@router.post("/", response_model=UserRoleSchema)
def assign_role_to_user(
    *,
    db: Session = Depends(get_db),
    user_role_in: UserRoleCreate,
    current_user: User = Depends(require_admin),
) -> Any:
    """Assign role to user (admin only)"""
    if not PermissionService.check_resource_permission(
        db, current_user.id, "create", "user"
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to assign roles",
        )

    # Check if user exists
    user = db.query(User).filter(User.id == user_role_in.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Use permission service to assign role
    user_role = PermissionService.assign_role(
        db=db,
        user_id=user_role_in.user_id,
        role_id=user_role_in.role_id,
        assigned_by=current_user.id,
    )

    return user_role


@router.get("/{user_role_id}", response_model=UserRoleSchema)
def read_user_role(
    *,
    db: Session = Depends(get_db),
    user_role_id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Get specific user role assignment"""
    user_role = db.query(UserRole).filter(UserRole.id == user_role_id).first()
    if not user_role:
        raise HTTPException(status_code=404, detail="User role not found")

    # Users can view their own role assignments, admins can view any
    if user_role.user_id != current_user.id:
        if not PermissionService.check_resource_permission(
            db, current_user.id, "read", "user"
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="User role access denied"
            )

    return user_role


@router.put("/{user_role_id}", response_model=UserRoleSchema)
def update_user_role(
    *,
    db: Session = Depends(get_db),
    user_role_id: int,
    user_role_in: UserRoleUpdate,
    current_user: User = Depends(require_admin),
) -> Any:
    """Update user role assignment (admin only)"""
    if not PermissionService.check_resource_permission(
        db, current_user.id, "update", "user"
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to update user roles",
        )

    user_role = db.query(UserRole).filter(UserRole.id == user_role_id).first()
    if not user_role:
        raise HTTPException(status_code=404, detail="User role not found")

    user_role_data = user_role_in.dict(exclude_unset=True)
    for field, value in user_role_data.items():
        setattr(user_role, field, value)

    db.add(user_role)
    db.commit()
    db.refresh(user_role)
    return user_role


@router.delete("/{user_role_id}")
def remove_role_from_user(
    *,
    db: Session = Depends(get_db),
    user_role_id: int,
    current_user: User = Depends(require_admin),
) -> Any:
    """Remove role from user (admin only)"""
    if not PermissionService.check_resource_permission(
        db, current_user.id, "delete", "user"
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to remove user roles",
        )

    user_role = db.query(UserRole).filter(UserRole.id == user_role_id).first()
    if not user_role:
        raise HTTPException(status_code=404, detail="User role not found")

    # Soft delete - deactivate instead of hard delete
    user_role.is_active = False
    db.add(user_role)
    db.commit()
    return {"message": "Role removed from user successfully"}


@router.get("", response_model=List[UserRoleSchema])
@router.get("/", response_model=List[UserRoleSchema])
def read_all_user_roles(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True,
    current_user: User = Depends(require_admin),
) -> Any:
    """Get all user role assignments (admin only)"""
    if not PermissionService.check_resource_permission(
        db, current_user.id, "read", "user"
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to read user roles",
        )

    query = db.query(UserRole)

    if active_only:
        query = query.filter(UserRole.is_active == True)

    user_roles = query.offset(skip).limit(limit).all()
    return user_roles
