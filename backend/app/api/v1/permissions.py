"""Permission management endpoints"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_pagination, PaginationParams
from app.api.deps.auth import PermissionChecker
from app.models import User, Permission
from app.models.permission import PermissionCategory, PermissionAction
from app.schemas.permission import (
    PermissionCreate,
    PermissionResponse,
    PermissionList,
    PermissionGrouped,
)

router = APIRouter()


@router.get("/", response_model=PermissionList)
def list_permissions(
    pagination: PaginationParams = Depends(get_pagination),
    category: PermissionCategory = None,
    is_active: bool = None,
    current_user: User = Depends(PermissionChecker("permission.read")),
    db: Session = Depends(get_db),
):
    """List all permissions"""
    query = db.query(Permission)

    if category is not None:
        query = query.filter(Permission.category == category)
    if is_active is not None:
        query = query.filter(Permission.is_active == is_active)

    total = query.count()
    permissions = query.offset(pagination.skip).limit(pagination.page_size).all()

    return PermissionList(
        total=total,
        items=[PermissionResponse.model_validate(p) for p in permissions],
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.get("/grouped", response_model=List[PermissionGrouped])
def list_permissions_grouped(
    current_user: User = Depends(PermissionChecker("permission.read")),
    db: Session = Depends(get_db),
):
    """List all permissions grouped by category"""
    permissions = db.query(Permission).filter(Permission.is_active == True).all()

    # Group by category
    grouped = {}
    for perm in permissions:
        category = perm.category.value
        if category not in grouped:
            grouped[category] = []
        grouped[category].append(PermissionResponse.model_validate(perm))

    return [
        PermissionGrouped(category=cat, permissions=perms)
        for cat, perms in sorted(grouped.items())
    ]


@router.get("/{permission_id}", response_model=PermissionResponse)
def get_permission(
    permission_id: int,
    current_user: User = Depends(PermissionChecker("permission.read")),
    db: Session = Depends(get_db),
):
    """Get permission by ID"""
    permission = db.query(Permission).filter(Permission.id == permission_id).first()

    if not permission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Permission not found",
        )

    return PermissionResponse.model_validate(permission)


@router.post("/", response_model=PermissionResponse, status_code=status.HTTP_201_CREATED)
def create_permission(
    permission_in: PermissionCreate,
    current_user: User = Depends(PermissionChecker("permission.manage")),
    db: Session = Depends(get_db),
):
    """Create a new permission"""
    # Check if codename exists
    existing = db.query(Permission).filter(
        Permission.codename == permission_in.codename
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Permission with this codename already exists",
        )

    permission = Permission(
        name=permission_in.name,
        codename=permission_in.codename,
        description=permission_in.description,
        category=permission_in.category,
        action=permission_in.action,
        resource=permission_in.resource,
        is_active=permission_in.is_active,
        is_system_permission=False,
    )
    db.add(permission)
    db.commit()

    return PermissionResponse.model_validate(permission)


@router.delete("/{permission_id}")
def delete_permission(
    permission_id: int,
    current_user: User = Depends(PermissionChecker("permission.manage")),
    db: Session = Depends(get_db),
):
    """Delete a permission"""
    permission = db.query(Permission).filter(Permission.id == permission_id).first()

    if not permission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Permission not found",
        )

    if permission.is_system_permission:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete system permission",
        )

    # Check if permission is assigned to any role
    if permission.role_permissions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete permission that is assigned to roles",
        )

    db.delete(permission)
    db.commit()

    return {"message": "Permission deleted successfully"}
