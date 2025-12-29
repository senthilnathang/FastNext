"""User management endpoints"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user, get_pagination, PaginationParams
from app.api.deps.auth import PermissionChecker
from app.models import User
from app.schemas.user import (
    UserCreate,
    UserUpdate,
    UserResponse,
    UserWithRoles,
    UserList,
    CompanyRoleInfo,
)
from app.services.user import UserService
from app.services.rbac import UserMenuPermissionService, MenuItemService

router = APIRouter()


class MenuPermission(BaseModel):
    """Menu permission for a user"""
    code: str
    can_view: bool = True
    can_edit: bool = False
    can_delete: bool = False
    can_create: bool = False


class MenuPermissionsResponse(BaseModel):
    """Response for user menu permissions"""
    menu_permissions: List[MenuPermission]


class MenuPermissionInput(BaseModel):
    """Input for setting menu permission"""
    code: str
    can_view: bool = True
    can_edit: bool = False
    can_delete: bool = False
    can_create: bool = False


class UserMentionSuggestion(BaseModel):
    """User suggestion for @mention autocomplete"""
    id: int
    username: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


@router.get("/search/mentions")
def search_users_for_mentions(
    q: str = "",
    limit: int = 10,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> List[UserMentionSuggestion]:
    """
    Search users for @mention autocomplete.

    Returns users matching the search query (username, full name, or email).
    """
    from app.services.mention import MentionService

    mention_service = MentionService(db)
    users = mention_service.search_users_for_mention(
        query=q,
        company_id=current_user.current_company_id,
        exclude_user_id=current_user.id,
        limit=min(limit, 20),  # Cap at 20 results
    )

    return [
        UserMentionSuggestion(
            id=user.id,
            username=user.username,
            full_name=user.full_name,
            avatar_url=user.avatar_url,
        )
        for user in users
    ]


@router.get("/messageable")
def get_messageable_users(
    search: str = "",
    pagination: PaginationParams = Depends(get_pagination),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Get users that the current user can message.

    This endpoint is available to all authenticated users and returns
    users based on messaging configuration rules.

    - By default, returns users in the same company
    - Respects messaging config rules for more complex setups
    - Excludes the current user from results
    """
    from app.services.messaging_config import get_messaging_config_service
    from app.schemas.messaging_config import MessageableUsersResponse

    service = get_messaging_config_service(db)

    # Ensure default rule exists for company
    if current_user.current_company_id:
        service.ensure_default_rule(current_user.current_company_id)

    users, total = service.get_messageable_users(
        user=current_user,
        search=search if search else None,
        skip=pagination.skip,
        limit=pagination.page_size,
    )

    return MessageableUsersResponse(
        total=total,
        items=users,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.get("/", response_model=UserList)
def list_users(
    pagination: PaginationParams = Depends(get_pagination),
    is_active: bool = None,
    current_user: User = Depends(PermissionChecker("user.read")),
    db: Session = Depends(get_db),
):
    """List all users (requires user.read permission)"""
    user_service = UserService(db)

    filters = {}
    if is_active is not None:
        filters["is_active"] = is_active

    users = user_service.get_multi(
        skip=pagination.skip,
        limit=pagination.page_size,
        filters=filters,
    )
    total = user_service.count(filters=filters)

    return UserList(
        total=total,
        items=[UserResponse.model_validate(u) for u in users],
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.get("/{user_id}", response_model=UserWithRoles)
def get_user(
    user_id: int,
    current_user: User = Depends(PermissionChecker("user.read")),
    db: Session = Depends(get_db),
):
    """Get user by ID with roles"""
    user_service = UserService(db)
    user = user_service.get(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Build company roles info
    company_roles = [
        CompanyRoleInfo(
            company_id=ucr.company_id,
            company_name=ucr.company.name,
            company_code=ucr.company.code,
            role_id=ucr.role_id,
            role_name=ucr.role.name,
            role_codename=ucr.role.codename,
            is_default=ucr.is_default,
        )
        for ucr in user.company_roles
        if ucr.is_active
    ]

    permissions = list(user.get_permissions_for_company())

    return UserWithRoles(
        **UserResponse.model_validate(user).model_dump(),
        company_roles=company_roles,
        permissions=permissions,
    )


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: UserCreate,
    current_user: User = Depends(PermissionChecker("user.create")),
    db: Session = Depends(get_db),
):
    """Create a new user"""
    user_service = UserService(db)

    # Check if email already exists
    if user_service.get_by_email(user_in.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Check if username already exists
    if user_service.get_by_username(user_in.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken",
        )

    user = user_service.create_user(user_in, created_by=current_user.id)
    db.commit()

    return UserResponse.model_validate(user)


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_in: UserUpdate,
    current_user: User = Depends(PermissionChecker("user.update")),
    db: Session = Depends(get_db),
):
    """Update a user"""
    user_service = UserService(db)
    user = user_service.get(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Check email uniqueness if changing
    if user_in.email and user_in.email != user.email:
        if user_service.get_by_email(user_in.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

    # Check username uniqueness if changing
    if user_in.username and user_in.username != user.username:
        if user_service.get_by_username(user_in.username):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken",
            )

    user = user_service.update_user(user, user_in, updated_by=current_user.id)
    db.commit()

    return UserResponse.model_validate(user)


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    current_user: User = Depends(PermissionChecker("user.delete")),
    db: Session = Depends(get_db),
):
    """Delete a user (soft delete)"""
    user_service = UserService(db)

    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account",
        )

    if not user_service.delete(user_id, user_id=current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    db.commit()
    return {"message": "User deleted successfully"}


@router.post("/{user_id}/assign-company")
def assign_user_to_company(
    user_id: int,
    company_id: int,
    role_id: int,
    is_default: bool = False,
    current_user: User = Depends(PermissionChecker("user.manage")),
    db: Session = Depends(get_db),
):
    """Assign user to a company with a role"""
    from app.models import Company, Role

    user_service = UserService(db)
    user = user_service.get(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )

    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found",
        )

    user_service.assign_to_company(
        user, company, role, is_default, assigned_by=current_user.id
    )
    db.commit()

    return {"message": "User assigned to company successfully"}


@router.delete("/{user_id}/remove-company/{company_id}")
def remove_user_from_company(
    user_id: int,
    company_id: int,
    current_user: User = Depends(PermissionChecker("user.manage")),
    db: Session = Depends(get_db),
):
    """Remove user from a company"""
    from app.models import Company

    user_service = UserService(db)
    user = user_service.get(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )

    if not user_service.remove_from_company(user, company):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not assigned to this company",
        )

    db.commit()
    return {"message": "User removed from company successfully"}


# =============================================================================
# USER MENU PERMISSIONS
# =============================================================================

@router.get("/{user_id}/menu-permissions", response_model=MenuPermissionsResponse)
def get_user_menu_permissions(
    user_id: int,
    company_id: Optional[int] = None,
    current_user: User = Depends(PermissionChecker("user.read")),
    db: Session = Depends(get_db),
):
    """Get menu permissions for a specific user (database-backed)"""
    user_service = UserService(db)
    user = user_service.get(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Use company_id from user if not provided
    effective_company_id = company_id or user.current_company_id

    permission_service = UserMenuPermissionService(db)
    db_permissions = permission_service.get_user_permissions(user_id, effective_company_id)

    permissions = [
        MenuPermission(
            code=p.menu_item.code,
            can_view=p.can_view,
            can_edit=p.can_edit,
            can_delete=p.can_delete,
            can_create=p.can_create,
        )
        for p in db_permissions
    ]
    return MenuPermissionsResponse(menu_permissions=permissions)


@router.put("/{user_id}/menu-permissions")
def set_user_menu_permissions(
    user_id: int,
    permissions: List[MenuPermissionInput] = Body(...),
    company_id: Optional[int] = None,
    current_user: User = Depends(PermissionChecker("user.manage")),
    db: Session = Depends(get_db),
):
    """Set menu permissions for a user (database-backed)"""
    user_service = UserService(db)
    user = user_service.get(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Use company_id from user if not provided
    effective_company_id = company_id or user.current_company_id

    menu_service = MenuItemService(db)
    permission_service = UserMenuPermissionService(db)

    # First, deactivate all existing permissions for this user/company
    existing = permission_service.get_user_permissions(user_id, effective_company_id)
    for perm in existing:
        perm.is_active = False

    # Set new permissions
    for perm_input in permissions:
        menu_item = menu_service.get_by_code(perm_input.code)
        if menu_item:
            permission_service.set_user_permission(
                user_id=user_id,
                menu_item_id=menu_item.id,
                company_id=effective_company_id,
                can_view=perm_input.can_view,
                can_edit=perm_input.can_edit,
                can_delete=perm_input.can_delete,
                can_create=perm_input.can_create,
                created_by=current_user.id,
            )

    db.commit()
    return {"success": True, "message": "Menu permissions updated"}
