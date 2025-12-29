"""Group management endpoints"""

from typing import Dict, List

from fastapi import APIRouter, Body, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_pagination, PaginationParams
from app.api.deps.auth import PermissionChecker
from app.models import User, Group, Permission, UserGroup, GroupPermission
from app.schemas.group import (
    GroupCreate,
    GroupUpdate,
    GroupResponse,
    GroupWithMembers,
    GroupList,
    UserInfo,
    PermissionInfo,
)

router = APIRouter()

# In-memory storage for group menu permissions (in production, use database)
_group_menu_permissions: Dict[int, List[str]] = {}


class GroupMenuPermissionsResponse(BaseModel):
    """Response for group menu permissions"""
    menu_codes: List[str]


@router.get("/", response_model=GroupList)
def list_groups(
    pagination: PaginationParams = Depends(get_pagination),
    company_id: int = None,
    is_active: bool = None,
    current_user: User = Depends(PermissionChecker("group.read")),
    db: Session = Depends(get_db),
):
    """List all groups"""
    query = db.query(Group)

    if company_id is not None:
        query = query.filter(Group.company_id == company_id)
    if is_active is not None:
        query = query.filter(Group.is_active == is_active)

    total = query.count()
    groups = query.offset(pagination.skip).limit(pagination.page_size).all()

    items = []
    for g in groups:
        resp = GroupResponse.model_validate(g)
        resp.member_count = len([ug for ug in g.users if ug.is_active])
        items.append(resp)

    return GroupList(
        total=total,
        items=items,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.get("/{group_id}", response_model=GroupWithMembers)
def get_group(
    group_id: int,
    current_user: User = Depends(PermissionChecker("group.read")),
    db: Session = Depends(get_db),
):
    """Get group by ID with members and permissions"""
    group = db.query(Group).filter(Group.id == group_id).first()

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found",
        )

    members = [
        UserInfo(
            id=ug.user.id,
            username=ug.user.username,
            email=ug.user.email,
            full_name=ug.user.full_name,
            avatar_url=ug.user.avatar_url,
        )
        for ug in group.users
        if ug.is_active and ug.user.is_active
    ]

    permissions = [
        PermissionInfo(
            id=gp.permission.id,
            name=gp.permission.name,
            codename=gp.permission.codename,
        )
        for gp in group.permissions
        if gp.permission.is_active
    ]

    return GroupWithMembers(
        id=group.id,
        name=group.name,
        codename=group.codename,
        description=group.description,
        company_id=group.company_id,
        is_system_group=group.is_system_group,
        is_active=group.is_active,
        member_count=len(members),
        created_at=group.created_at,
        updated_at=group.updated_at,
        members=members,
        permissions=permissions,
    )


@router.get("/{group_id}/users", response_model=List[UserInfo])
def get_group_users(
    group_id: int,
    current_user: User = Depends(PermissionChecker("group.read")),
    db: Session = Depends(get_db),
):
    """Get users in a group"""
    group = db.query(Group).filter(Group.id == group_id).first()

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found",
        )

    members = [
        UserInfo(
            id=ug.user.id,
            username=ug.user.username,
            email=ug.user.email,
            full_name=ug.user.full_name,
            avatar_url=ug.user.avatar_url,
        )
        for ug in group.users
        if ug.is_active and ug.user.is_active
    ]

    return members


@router.post("/", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
def create_group(
    group_in: GroupCreate,
    current_user: User = Depends(PermissionChecker("group.create")),
    db: Session = Depends(get_db),
):
    """Create a new group"""
    # Check if codename exists for this company
    existing = db.query(Group).filter(
        Group.codename == group_in.codename,
        Group.company_id == group_in.company_id,
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Group with this codename already exists",
        )

    # Create group
    group = Group(
        name=group_in.name,
        codename=group_in.codename,
        description=group_in.description,
        company_id=group_in.company_id,
        is_active=group_in.is_active,
        created_by=current_user.id,
    )
    db.add(group)
    db.flush()

    # Add users
    if group_in.user_ids:
        users = db.query(User).filter(User.id.in_(group_in.user_ids)).all()
        for user in users:
            ug = UserGroup(user_id=user.id, group_id=group.id)
            db.add(ug)

    # Add permissions
    if group_in.permission_ids:
        permissions = db.query(Permission).filter(
            Permission.id.in_(group_in.permission_ids)
        ).all()
        for perm in permissions:
            gp = GroupPermission(group_id=group.id, permission_id=perm.id)
            db.add(gp)

    db.commit()

    resp = GroupResponse.model_validate(group)
    resp.member_count = len(group_in.user_ids)
    return resp


@router.put("/{group_id}", response_model=GroupResponse)
def update_group(
    group_id: int,
    group_in: GroupUpdate,
    current_user: User = Depends(PermissionChecker("group.update")),
    db: Session = Depends(get_db),
):
    """Update a group"""
    group = db.query(Group).filter(Group.id == group_id).first()

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found",
        )

    if group.is_system_group:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify system group",
        )

    # Update basic fields
    update_data = group_in.model_dump(
        exclude_unset=True,
        exclude={"permission_ids", "user_ids"},
    )
    for field, value in update_data.items():
        setattr(group, field, value)

    group.updated_by = current_user.id

    # Update users if provided
    if group_in.user_ids is not None:
        db.query(UserGroup).filter(UserGroup.group_id == group_id).delete()
        for user_id in group_in.user_ids:
            ug = UserGroup(user_id=user_id, group_id=group_id)
            db.add(ug)

    # Update permissions if provided
    if group_in.permission_ids is not None:
        db.query(GroupPermission).filter(
            GroupPermission.group_id == group_id
        ).delete()
        for perm_id in group_in.permission_ids:
            gp = GroupPermission(group_id=group_id, permission_id=perm_id)
            db.add(gp)

    db.commit()

    resp = GroupResponse.model_validate(group)
    resp.member_count = len([ug for ug in group.users if ug.is_active])
    return resp


@router.delete("/{group_id}")
def delete_group(
    group_id: int,
    current_user: User = Depends(PermissionChecker("group.delete")),
    db: Session = Depends(get_db),
):
    """Delete a group"""
    group = db.query(Group).filter(Group.id == group_id).first()

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found",
        )

    if group.is_system_group:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete system group",
        )

    db.delete(group)
    db.commit()

    return {"message": "Group deleted successfully"}


@router.post("/{group_id}/users/{user_id}")
def add_user_to_group(
    group_id: int,
    user_id: int,
    current_user: User = Depends(PermissionChecker("group.manage")),
    db: Session = Depends(get_db),
):
    """Add a user to a group"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Check if already in group
    existing = db.query(UserGroup).filter(
        UserGroup.user_id == user_id,
        UserGroup.group_id == group_id,
    ).first()

    if existing:
        if existing.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is already in this group",
            )
        existing.is_active = True
    else:
        ug = UserGroup(user_id=user_id, group_id=group_id)
        db.add(ug)

    db.commit()
    return {"message": "User added to group"}


@router.delete("/{group_id}/users/{user_id}")
def remove_user_from_group(
    group_id: int,
    user_id: int,
    current_user: User = Depends(PermissionChecker("group.manage")),
    db: Session = Depends(get_db),
):
    """Remove a user from a group"""
    ug = db.query(UserGroup).filter(
        UserGroup.user_id == user_id,
        UserGroup.group_id == group_id,
    ).first()

    if not ug:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User is not in this group",
        )

    db.delete(ug)
    db.commit()

    return {"message": "User removed from group"}


# =============================================================================
# GROUP MENU PERMISSIONS
# =============================================================================

@router.get("/{group_id}/menu-permissions", response_model=GroupMenuPermissionsResponse)
def get_group_menu_permissions(
    group_id: int,
    current_user: User = Depends(PermissionChecker("group.read")),
    db: Session = Depends(get_db),
):
    """Get menu permissions for a specific group"""
    group = db.query(Group).filter(Group.id == group_id).first()

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found",
        )

    codes = _group_menu_permissions.get(group_id, [])
    return GroupMenuPermissionsResponse(menu_codes=codes)


@router.put("/{group_id}/menu-permissions")
def set_group_menu_permissions(
    group_id: int,
    menu_codes: List[str] = Body(..., embed=False),
    current_user: User = Depends(PermissionChecker("group.manage")),
    db: Session = Depends(get_db),
):
    """Set menu permissions for a group"""
    group = db.query(Group).filter(Group.id == group_id).first()

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found",
        )

    _group_menu_permissions[group_id] = menu_codes
    return {"success": True}
