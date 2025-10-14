from typing import Any, List

from app.auth.deps import get_current_active_user
from app.auth.permissions import require_admin
from app.db.session import get_db
from app.models.permission import Permission
from app.models.user import User
from app.schemas.common import ListResponse
from app.schemas.permission import Permission as PermissionSchema
from app.schemas.permission import PermissionCreate, PermissionUpdate
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

router = APIRouter()


@router.get("", response_model=ListResponse[PermissionSchema])
@router.get("/", response_model=ListResponse[PermissionSchema])
def read_permissions(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    category: str = None,
    search: str = None,
    current_user: User = Depends(require_admin),
) -> Any:
    """Get all permissions with pagination (admin only)"""
    query = db.query(Permission)

    # Apply filters
    if category:
        query = query.filter(Permission.category == category)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Permission.name.ilike(search_term))
            | (Permission.description.ilike(search_term))
            | (Permission.action.ilike(search_term))
        )

    # Get total count
    total = query.count()

    # Get paginated results
    permissions = query.offset(skip).limit(limit).all()

    return ListResponse.paginate(items=permissions, total=total, skip=skip, limit=limit)


@router.post("", response_model=PermissionSchema)
@router.post("/", response_model=PermissionSchema)
def create_permission(
    *,
    db: Session = Depends(get_db),
    permission_in: PermissionCreate,
    current_user: User = Depends(require_admin),
) -> Any:
    """Create new permission (admin only)"""
    # Check if permission already exists
    existing_permission = (
        db.query(Permission).filter(Permission.name == permission_in.name).first()
    )
    if existing_permission:
        raise HTTPException(
            status_code=400, detail="Permission with this name already exists"
        )

    permission = Permission(**permission_in.dict())
    db.add(permission)
    db.commit()
    db.refresh(permission)
    return permission


@router.get("/{permission_id}", response_model=PermissionSchema)
def read_permission(
    *,
    db: Session = Depends(get_db),
    permission_id: int,
    current_user: User = Depends(require_admin),
) -> Any:
    """Get permission (admin only)"""
    permission = db.query(Permission).filter(Permission.id == permission_id).first()
    if not permission:
        raise HTTPException(status_code=404, detail="Permission not found")
    return permission


@router.put("/{permission_id}", response_model=PermissionSchema)
def update_permission(
    *,
    db: Session = Depends(get_db),
    permission_id: int,
    permission_in: PermissionUpdate,
    current_user: User = Depends(require_admin),
) -> Any:
    """Update permission (admin only)"""
    permission = db.query(Permission).filter(Permission.id == permission_id).first()
    if not permission:
        raise HTTPException(status_code=404, detail="Permission not found")

    if permission.is_system_permission:
        raise HTTPException(status_code=400, detail="Cannot modify system permissions")

    permission_data = permission_in.dict(exclude_unset=True)
    for field, value in permission_data.items():
        setattr(permission, field, value)

    db.add(permission)
    db.commit()
    db.refresh(permission)
    return permission


@router.delete("/{permission_id}")
def delete_permission(
    *,
    db: Session = Depends(get_db),
    permission_id: int,
    current_user: User = Depends(require_admin),
) -> Any:
    """Delete permission (admin only)"""
    permission = db.query(Permission).filter(Permission.id == permission_id).first()
    if not permission:
        raise HTTPException(status_code=404, detail="Permission not found")

    if permission.is_system_permission:
        raise HTTPException(status_code=400, detail="Cannot delete system permissions")

    db.delete(permission)
    db.commit()
    return {"message": "Permission deleted successfully"}
