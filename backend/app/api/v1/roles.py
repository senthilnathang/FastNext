"""Role management endpoints"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user, get_pagination, PaginationParams
from app.api.deps.auth import PermissionChecker
from app.models import User, Role, Permission, RolePermission
from app.schemas.role import (
    RoleCreate,
    RoleUpdate,
    RoleResponse,
    RoleWithPermissions,
    RoleList,
    PermissionInfo,
)
from app.services.base import BaseService

router = APIRouter()


@router.get("/", response_model=RoleList)
def list_roles(
    pagination: PaginationParams = Depends(get_pagination),
    company_id: int = None,
    is_active: bool = None,
    current_user: User = Depends(PermissionChecker("role.read")),
    db: Session = Depends(get_db),
):
    """List all roles"""
    query = db.query(Role)

    if company_id is not None:
        query = query.filter(
            (Role.company_id == company_id) | (Role.company_id.is_(None))
        )
    if is_active is not None:
        query = query.filter(Role.is_active == is_active)

    total = query.count()
    roles = query.offset(pagination.skip).limit(pagination.page_size).all()

    return RoleList(
        total=total,
        items=[RoleResponse.model_validate(r) for r in roles],
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.get("/{role_id}", response_model=RoleWithPermissions)
def get_role(
    role_id: int,
    current_user: User = Depends(PermissionChecker("role.read")),
    db: Session = Depends(get_db),
):
    """Get role by ID with permissions"""
    role = db.query(Role).filter(Role.id == role_id).first()

    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found",
        )

    permissions = [
        PermissionInfo(
            id=rp.permission.id,
            name=rp.permission.name,
            codename=rp.permission.codename,
            category=rp.permission.category.value,
            action=rp.permission.action.value,
        )
        for rp in role.permissions
        if rp.permission.is_active
    ]

    return RoleWithPermissions(
        **RoleResponse.model_validate(role).model_dump(),
        permissions=permissions,
    )


@router.post("/", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
def create_role(
    role_in: RoleCreate,
    current_user: User = Depends(PermissionChecker("role.create")),
    db: Session = Depends(get_db),
):
    """Create a new role"""
    # Check if codename exists for this company
    existing = db.query(Role).filter(
        Role.codename == role_in.codename,
        Role.company_id == role_in.company_id,
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role with this codename already exists",
        )

    # Create role
    role = Role(
        name=role_in.name,
        codename=role_in.codename,
        description=role_in.description,
        company_id=role_in.company_id,
        is_active=role_in.is_active,
        created_by=current_user.id,
    )
    db.add(role)
    db.flush()

    # Assign permissions
    if role_in.permission_ids:
        permissions = db.query(Permission).filter(
            Permission.id.in_(role_in.permission_ids)
        ).all()
        for perm in permissions:
            rp = RolePermission(role_id=role.id, permission_id=perm.id)
            db.add(rp)

    db.commit()
    return RoleResponse.model_validate(role)


@router.put("/{role_id}", response_model=RoleResponse)
def update_role(
    role_id: int,
    role_in: RoleUpdate,
    current_user: User = Depends(PermissionChecker("role.update")),
    db: Session = Depends(get_db),
):
    """Update a role"""
    role = db.query(Role).filter(Role.id == role_id).first()

    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found",
        )

    if role.is_system_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify system role",
        )

    # Update basic fields
    update_data = role_in.model_dump(exclude_unset=True, exclude={"permission_ids"})
    for field, value in update_data.items():
        setattr(role, field, value)

    role.updated_by = current_user.id

    # Update permissions if provided
    if role_in.permission_ids is not None:
        # Remove existing permissions
        db.query(RolePermission).filter(RolePermission.role_id == role_id).delete()

        # Add new permissions
        permissions = db.query(Permission).filter(
            Permission.id.in_(role_in.permission_ids)
        ).all()
        for perm in permissions:
            rp = RolePermission(role_id=role.id, permission_id=perm.id)
            db.add(rp)

    db.commit()
    return RoleResponse.model_validate(role)


@router.delete("/{role_id}")
def delete_role(
    role_id: int,
    current_user: User = Depends(PermissionChecker("role.delete")),
    db: Session = Depends(get_db),
):
    """Delete a role"""
    role = db.query(Role).filter(Role.id == role_id).first()

    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found",
        )

    if role.is_system_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete system role",
        )

    # Check if role is in use
    if role.user_company_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete role that is assigned to users",
        )

    db.delete(role)
    db.commit()

    return {"message": "Role deleted successfully"}


@router.post("/{role_id}/permissions/{permission_id}")
def add_permission_to_role(
    role_id: int,
    permission_id: int,
    current_user: User = Depends(PermissionChecker("role.manage")),
    db: Session = Depends(get_db),
):
    """Add a permission to a role"""
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found",
        )

    if role.is_system_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify system role",
        )

    permission = db.query(Permission).filter(Permission.id == permission_id).first()
    if not permission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Permission not found",
        )

    # Check if already assigned
    existing = db.query(RolePermission).filter(
        RolePermission.role_id == role_id,
        RolePermission.permission_id == permission_id,
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Permission already assigned to role",
        )

    rp = RolePermission(role_id=role_id, permission_id=permission_id)
    db.add(rp)
    db.commit()

    return {"message": "Permission added to role"}


@router.delete("/{role_id}/permissions/{permission_id}")
def remove_permission_from_role(
    role_id: int,
    permission_id: int,
    current_user: User = Depends(PermissionChecker("role.manage")),
    db: Session = Depends(get_db),
):
    """Remove a permission from a role"""
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found",
        )

    if role.is_system_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify system role",
        )

    rp = db.query(RolePermission).filter(
        RolePermission.role_id == role_id,
        RolePermission.permission_id == permission_id,
    ).first()

    if not rp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Permission not assigned to role",
        )

    db.delete(rp)
    db.commit()

    return {"message": "Permission removed from role"}
