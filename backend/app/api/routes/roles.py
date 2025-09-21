from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_active_user
from app.auth.permissions import require_admin
from app.db.session import get_db
from app.models.user import User
from app.models.role import Role
from app.models.permission import Permission
from app.models.user_role import RolePermission
from app.schemas.role import Role as RoleSchema, RoleCreate, RoleUpdate, RoleWithPermissions
from app.schemas.permission import Permission as PermissionSchema, RolePermissionCreate
from app.services.permission_service import PermissionService

router = APIRouter()


@router.get("", response_model=List[RoleSchema])
@router.get("/", response_model=List[RoleSchema])
def read_roles(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_admin),
) -> Any:
    """Get all roles (admin only)"""
    roles = db.query(Role).filter(Role.is_active == True).offset(skip).limit(limit).all()
    return roles


@router.post("", response_model=RoleSchema)
@router.post("/", response_model=RoleSchema)
def create_role(
    *,
    db: Session = Depends(get_db),
    role_in: RoleCreate,
    current_user: User = Depends(require_admin),
) -> Any:
    """Create new role (admin only)"""
    # Check if role already exists
    existing_role = db.query(Role).filter(Role.name == role_in.name).first()
    if existing_role:
        raise HTTPException(
            status_code=400,
            detail="Role with this name already exists"
        )
    
    role = Role(**role_in.dict())
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


@router.get("/{role_id}", response_model=RoleWithPermissions)
def read_role(
    *,
    db: Session = Depends(get_db),
    role_id: int,
    current_user: User = Depends(require_admin),
) -> Any:
    """Get role with permissions (admin only)"""
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    # Get role permissions
    role_permissions = db.query(RolePermission).filter(
        RolePermission.role_id == role_id
    ).all()
    
    permissions = [rp.permission for rp in role_permissions]
    role_dict = role.__dict__.copy()
    role_dict['permissions'] = permissions
    
    return role_dict


@router.put("/{role_id}", response_model=RoleSchema)
def update_role(
    *,
    db: Session = Depends(get_db),
    role_id: int,
    role_in: RoleUpdate,
    current_user: User = Depends(require_admin),
) -> Any:
    """Update role (admin only)"""
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    if role.is_system_role:
        raise HTTPException(
            status_code=400,
            detail="Cannot modify system roles"
        )
    
    role_data = role_in.dict(exclude_unset=True)
    for field, value in role_data.items():
        setattr(role, field, value)
    
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


@router.delete("/{role_id}")
def delete_role(
    *,
    db: Session = Depends(get_db),
    role_id: int,
    current_user: User = Depends(require_admin),
) -> Any:
    """Delete role (admin only)"""
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    if role.is_system_role:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete system roles"
        )
    
    role.is_active = False
    db.add(role)
    db.commit()
    return {"message": "Role deleted successfully"}


@router.post("/{role_id}/permissions")
def assign_permission_to_role(
    *,
    db: Session = Depends(get_db),
    role_id: int,
    permission_assignment: RolePermissionCreate,
    current_user: User = Depends(require_admin),
) -> Any:
    """Assign permission to role (admin only)"""
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    permission = db.query(Permission).filter(
        Permission.id == permission_assignment.permission_id
    ).first()
    if not permission:
        raise HTTPException(status_code=404, detail="Permission not found")
    
    # Check if assignment already exists
    existing = db.query(RolePermission).filter(
        RolePermission.role_id == role_id,
        RolePermission.permission_id == permission_assignment.permission_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Permission already assigned to role"
        )
    
    role_permission = RolePermission(
        role_id=role_id,
        permission_id=permission_assignment.permission_id
    )
    db.add(role_permission)
    db.commit()
    
    return {"message": "Permission assigned to role successfully"}


@router.delete("/{role_id}/permissions/{permission_id}")
def remove_permission_from_role(
    *,
    db: Session = Depends(get_db),
    role_id: int,
    permission_id: int,
    current_user: User = Depends(require_admin),
) -> Any:
    """Remove permission from role (admin only)"""
    role_permission = db.query(RolePermission).filter(
        RolePermission.role_id == role_id,
        RolePermission.permission_id == permission_id
    ).first()
    
    if not role_permission:
        raise HTTPException(status_code=404, detail="Permission assignment not found")
    
    db.delete(role_permission)
    db.commit()
    
    return {"message": "Permission removed from role successfully"}