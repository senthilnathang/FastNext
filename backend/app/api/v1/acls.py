"""
ACL (Access Control List) API endpoints for dynamic per-record permissions
"""

from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_active_user, get_db
from app.models.user import User
from app.models.workflow import AccessControlList, RecordPermission
from app.schemas.common import ListResponse
from app.services.acl_service import ACLService
from app.services.permission_service import PermissionService

router = APIRouter()


# Pydantic schemas for ACL API
from pydantic import BaseModel, Field
from datetime import datetime


class ACLBase(BaseModel):
    name: str
    description: Optional[str] = None
    entity_type: str
    operation: str
    field_name: Optional[str] = None
    condition_script: Optional[str] = None
    condition_context: Optional[dict] = Field(default_factory=dict)
    allowed_roles: Optional[List[str]] = Field(default_factory=list)
    denied_roles: Optional[List[str]] = Field(default_factory=list)
    allowed_users: Optional[List[int]] = Field(default_factory=list)
    denied_users: Optional[List[int]] = Field(default_factory=list)
    requires_approval: bool = False
    approval_workflow_id: Optional[int] = None
    priority: int = 100
    is_active: bool = True


class ACLCreate(ACLBase):
    pass


class ACLUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    condition_script: Optional[str] = None
    condition_context: Optional[dict] = None
    allowed_roles: Optional[List[str]] = None
    denied_roles: Optional[List[str]] = None
    allowed_users: Optional[List[int]] = None
    denied_users: Optional[List[int]] = None
    requires_approval: Optional[bool] = None
    approval_workflow_id: Optional[int] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None


class ACLResponse(ACLBase):
    id: int
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RecordPermissionBase(BaseModel):
    entity_type: str
    entity_id: str
    user_id: Optional[int] = None
    role_id: Optional[int] = None
    operation: str
    expires_at: Optional[datetime] = None
    conditions: Optional[dict] = Field(default_factory=dict)


class RecordPermissionCreate(RecordPermissionBase):
    pass


class RecordPermissionResponse(RecordPermissionBase):
    id: int
    granted_by: int
    granted_at: datetime
    is_active: bool
    revoked_by: Optional[int] = None
    revoked_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PermissionCheckRequest(BaseModel):
    entity_type: str
    entity_id: Optional[str] = None
    operation: str
    field_name: Optional[str] = None
    entity_data: Optional[dict] = None


class PermissionCheckResponse(BaseModel):
    has_access: bool
    reason: str
    applicable_acls: Optional[List[str]] = None


# =============================================================================
# STATIC PATH ENDPOINTS - Must come before dynamic /{acl_id} routes
# =============================================================================

# Record Permission endpoints
@router.get("/record-permissions", response_model=ListResponse[RecordPermissionResponse])
def read_record_permissions(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    user_id: Optional[int] = None,
    operation: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Get record permissions with optional filtering"""
    # Check if user has permission to view record permissions (superusers always have access)
    if not current_user.is_superuser:
        perm_service = PermissionService(db)
        if not perm_service.has_permission(current_user.id, "record_permission.read"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to view record permissions",
            )

    query = db.query(RecordPermission)

    if entity_type:
        query = query.filter(RecordPermission.entity_type == entity_type)
    if entity_id:
        query = query.filter(RecordPermission.entity_id == entity_id)
    if user_id:
        query = query.filter(RecordPermission.user_id == user_id)
    if operation:
        query = query.filter(RecordPermission.operation == operation)

    total = query.count()
    permissions = query.offset(skip).limit(limit).all()

    return {
        "items": permissions,
        "total": total,
        "page": (skip // limit) + 1 if limit > 0 else 1,
        "pages": (total + limit - 1) // limit if limit > 0 else 1,
        "size": len(permissions),
    }


@router.post("/record-permissions", response_model=RecordPermissionResponse)
def create_record_permission(
    *,
    db: Session = Depends(get_db),
    permission_in: RecordPermissionCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Create new record permission"""
    # Check if user has permission to create record permissions (superusers always have access)
    if not current_user.is_superuser:
        perm_service = PermissionService(db)
        if not perm_service.has_permission(current_user.id, "record_permission.create"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to create record permissions",
            )

    return ACLService.grant_record_permission(
        db=db,
        entity_type=permission_in.entity_type,
        entity_id=permission_in.entity_id,
        user_id=permission_in.user_id,
        role_id=permission_in.role_id,
        operation=permission_in.operation,
        granted_by=current_user.id,
        expires_at=permission_in.expires_at,
        conditions=permission_in.conditions,
    )


@router.delete("/record-permissions/{permission_id}")
def revoke_record_permission(
    *,
    db: Session = Depends(get_db),
    permission_id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Revoke record permission"""
    # Check if user has permission to revoke record permissions (superusers always have access)
    if not current_user.is_superuser:
        perm_service = PermissionService(db)
        if not perm_service.has_permission(current_user.id, "record_permission.delete"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to revoke record permissions",
            )

    success = ACLService.revoke_record_permission(db, permission_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Record permission not found",
        )

    return {"message": "Record permission revoked successfully"}


# Permission checking endpoints
@router.post("/check-permission", response_model=PermissionCheckResponse)
def check_permission(
    *,
    db: Session = Depends(get_db),
    request: PermissionCheckRequest,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Check if current user has permission for an operation"""
    try:
        if request.field_name:
            # Field-level permission check
            has_access, reason = ACLService.check_field_access(
                db=db,
                user=current_user,
                entity_type=request.entity_type,
                field_name=request.field_name,
                operation=request.operation,
                entity_data=request.entity_data,
            )
        else:
            # Record-level permission check
            has_access, reason = ACLService.check_record_access(
                db=db,
                user=current_user,
                entity_type=request.entity_type,
                entity_id=request.entity_id or "",
                operation=request.operation,
                entity_data=request.entity_data,
            )

        # Get applicable ACLs for debugging
        applicable_acls = []
        if not request.field_name:
            acls = ACLService.get_applicable_acls(db, request.entity_type, request.operation)
            applicable_acls = [acl.name for acl in acls]

        return PermissionCheckResponse(
            has_access=has_access,
            reason=reason,
            applicable_acls=applicable_acls,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Permission check failed: {str(e)}",
        )


@router.get("/user-permissions")
def get_user_permissions(
    db: Session = Depends(get_db),
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Get all permissions for the current user"""
    permissions = ACLService.get_user_record_permissions(
        db=db,
        user_id=current_user.id,
        entity_type=entity_type,
        entity_id=entity_id,
    )

    return {
        "user_id": current_user.id,
        "permissions": [
            {
                "id": p.id,
                "entity_type": p.entity_type,
                "entity_id": p.entity_id,
                "operation": p.operation,
                "granted_at": p.granted_at,
                "expires_at": p.expires_at,
                "conditions": p.conditions,
            }
            for p in permissions
        ],
    }


# =============================================================================
# ACL CRUD endpoints
# =============================================================================

@router.get("", response_model=ListResponse[ACLResponse])
@router.get("/", response_model=ListResponse[ACLResponse])
def read_acls(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    entity_type: Optional[str] = None,
    operation: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Get ACLs with optional filtering"""
    # Check if user has permission to view ACLs (superusers always have access)
    if not current_user.is_superuser:
        perm_service = PermissionService(db)
        if not perm_service.has_permission(current_user.id, "acl.read"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to view ACLs",
            )

    query = db.query(AccessControlList)

    if entity_type:
        query = query.filter(AccessControlList.entity_type == entity_type)
    if operation:
        query = query.filter(AccessControlList.operation == operation)
    if is_active is not None:
        query = query.filter(AccessControlList.is_active == is_active)

    total = query.count()
    acls = query.offset(skip).limit(limit).all()

    return {
        "items": acls,
        "total": total,
        "page": (skip // limit) + 1 if limit > 0 else 1,
        "pages": (total + limit - 1) // limit if limit > 0 else 1,
        "size": len(acls),
    }


@router.post("", response_model=ACLResponse)
@router.post("/", response_model=ACLResponse)
def create_acl(
    *,
    db: Session = Depends(get_db),
    acl_in: ACLCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Create new ACL"""
    # Check if user has permission to create ACLs (superusers always have access)
    if not current_user.is_superuser:
        perm_service = PermissionService(db)
        if not perm_service.has_permission(current_user.id, "acl.create"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to create ACLs",
            )

    # Check if ACL with this name already exists
    existing_acl = db.query(AccessControlList).filter(
        AccessControlList.name == acl_in.name
    ).first()
    if existing_acl:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ACL with this name already exists",
        )

    acl = AccessControlList(
        **acl_in.dict(),
        created_by=current_user.id,
    )
    db.add(acl)
    db.commit()
    db.refresh(acl)
    return acl


# =============================================================================
# DYNAMIC PATH ENDPOINTS - Must come after static paths
# =============================================================================

@router.get("/{acl_id}", response_model=ACLResponse)
def read_acl(
    *,
    db: Session = Depends(get_db),
    acl_id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Get ACL by ID"""
    # Check if user has permission to view ACLs (superusers always have access)
    if not current_user.is_superuser:
        perm_service = PermissionService(db)
        if not perm_service.has_permission(current_user.id, "acl.read"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to view ACLs",
            )

    acl = db.query(AccessControlList).filter(AccessControlList.id == acl_id).first()
    if not acl:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ACL not found",
        )
    return acl


@router.put("/{acl_id}", response_model=ACLResponse)
def update_acl(
    *,
    db: Session = Depends(get_db),
    acl_id: int,
    acl_in: ACLUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Update ACL"""
    # Check if user has permission to update ACLs (superusers always have access)
    if not current_user.is_superuser:
        perm_service = PermissionService(db)
        if not perm_service.has_permission(current_user.id, "acl.update"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to update ACLs",
            )

    acl = db.query(AccessControlList).filter(AccessControlList.id == acl_id).first()
    if not acl:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ACL not found",
        )

    # Check if updating to a name that already exists
    if acl_in.name and acl_in.name != acl.name:
        existing_acl = db.query(AccessControlList).filter(
            AccessControlList.name == acl_in.name,
            AccessControlList.id != acl_id
        ).first()
        if existing_acl:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ACL with this name already exists",
            )

    update_data = acl_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(acl, field, value)

    db.add(acl)
    db.commit()
    db.refresh(acl)
    return acl


@router.delete("/{acl_id}")
def delete_acl(
    *,
    db: Session = Depends(get_db),
    acl_id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Delete ACL"""
    # Check if user has permission to delete ACLs (superusers always have access)
    if not current_user.is_superuser:
        perm_service = PermissionService(db)
        if not perm_service.has_permission(current_user.id, "acl.delete"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to delete ACLs",
            )

    acl = db.query(AccessControlList).filter(AccessControlList.id == acl_id).first()
    if not acl:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ACL not found",
        )

    db.delete(acl)
    db.commit()
    return {"message": "ACL deleted successfully"}
