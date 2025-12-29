"""
RBAC API endpoints for menus, content types, and access rules
These are advanced RBAC features for fine-grained access control
"""

import json
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_active_user
from app.api.deps.database import get_db
from app.models import User
from app.models.rbac import (
    ContentType as ContentTypeModel,
    MenuItem as MenuItemModel,
    AccessRule as AccessRuleModel,
)
from app.services.rbac import (
    ContentTypeService,
    MenuItemService,
    AccessRuleService,
    MenuAccessService,
)

router = APIRouter()


# =============================================================================
# SCHEMAS
# =============================================================================

class MenuItem(BaseModel):
    """Menu item for navigation"""
    id: int
    name: str
    code: str
    path: str
    icon: Optional[str] = None
    parent_id: Optional[int] = None
    order: int = 0
    is_active: bool = True
    children: List["MenuItem"] = []

    class Config:
        from_attributes = True


class ContentType(BaseModel):
    """Content type for access rules (similar to Django's ContentType)"""
    id: int
    app_label: str
    model: str
    name: str

    class Config:
        from_attributes = True


class AccessRuleScope(str):
    OWN = "own"
    DEPARTMENT = "department"
    COMPANY = "company"
    ALL = "all"
    CUSTOM = "custom"


class AccessRuleBase(BaseModel):
    """Base access rule schema"""
    name: str
    description: Optional[str] = None
    content_type: int
    scope: str = "own"
    filters: Dict[str, Any] = Field(default_factory=dict)
    can_view: bool = True
    can_add: bool = False
    can_change: bool = False
    can_delete: bool = False
    priority: int = 0
    is_active: bool = True


class AccessRuleCreate(AccessRuleBase):
    """Create access rule"""
    user: Optional[int] = None
    group: Optional[int] = None


class AccessRuleUpdate(BaseModel):
    """Update access rule"""
    name: Optional[str] = None
    description: Optional[str] = None
    scope: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None
    can_view: Optional[bool] = None
    can_add: Optional[bool] = None
    can_change: Optional[bool] = None
    can_delete: Optional[bool] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None


class AccessRule(AccessRuleBase):
    """Access rule response"""
    id: int
    user: Optional[int] = None
    group: Optional[int] = None
    content_type_name: str = ""

    class Config:
        from_attributes = True


class AccessRuleList(BaseModel):
    """Access rule list response"""
    total: int
    items: List[AccessRule]
    page: int = 1
    page_size: int = 20


class MenuPermission(BaseModel):
    """Menu permission assignment"""
    code: str
    can_view: bool = True
    can_edit: bool = False


class MenuPermissionsResponse(BaseModel):
    """Response for menu permissions"""
    menu_permissions: List[MenuPermission]


# =============================================================================
# STATIC DATA (In production, these would come from the database)
# =============================================================================

# Define menu items based on the Vue router structure
MENU_ITEMS: List[Dict[str, Any]] = [
    {
        "id": 1,
        "name": "Dashboard",
        "code": "dashboard",
        "path": "/dashboard",
        "icon": "lucide:layout-dashboard",
        "parent_id": None,
        "order": 1,
        "is_active": True,
        "children": [],
    },
    {
        "id": 2,
        "name": "Settings",
        "code": "settings",
        "path": "/settings",
        "icon": "lucide:settings",
        "parent_id": None,
        "order": 100,
        "is_active": True,
        "children": [
            {
                "id": 21,
                "name": "Users",
                "code": "settings.users",
                "path": "/settings/users",
                "icon": "lucide:users",
                "parent_id": 2,
                "order": 1,
                "is_active": True,
                "children": [],
            },
            {
                "id": 22,
                "name": "Groups",
                "code": "settings.groups",
                "path": "/settings/groups",
                "icon": "lucide:users-round",
                "parent_id": 2,
                "order": 2,
                "is_active": True,
                "children": [],
            },
            {
                "id": 23,
                "name": "Companies",
                "code": "settings.companies",
                "path": "/settings/companies",
                "icon": "lucide:building-2",
                "parent_id": 2,
                "order": 3,
                "is_active": True,
                "children": [],
            },
            {
                "id": 24,
                "name": "Permissions",
                "code": "settings.permissions",
                "path": "/settings/permissions",
                "icon": "lucide:shield",
                "parent_id": 2,
                "order": 4,
                "is_active": True,
                "children": [],
            },
            {
                "id": 25,
                "name": "Audit Logs",
                "code": "settings.audit",
                "path": "/settings/audit-logs",
                "icon": "lucide:file-text",
                "parent_id": 2,
                "order": 5,
                "is_active": True,
                "children": [],
            },
        ],
    },
    {
        "id": 3,
        "name": "Profile",
        "code": "profile",
        "path": "/profile",
        "icon": "lucide:user",
        "parent_id": None,
        "order": 90,
        "is_active": True,
        "children": [],
    },
]

# Content types based on the models we have
CONTENT_TYPES: List[Dict[str, Any]] = [
    {"id": 1, "app_label": "core", "model": "user", "name": "User"},
    {"id": 2, "app_label": "core", "model": "company", "name": "Company"},
    {"id": 3, "app_label": "core", "model": "role", "name": "Role"},
    {"id": 4, "app_label": "core", "model": "permission", "name": "Permission"},
    {"id": 5, "app_label": "core", "model": "group", "name": "Group"},
    {"id": 6, "app_label": "core", "model": "auditlog", "name": "Audit Log"},
    {"id": 7, "app_label": "core", "model": "notification", "name": "Notification"},
]

# Content types are now database-backed via ContentTypeModel
# Access rules are now database-backed via AccessRuleModel


# =============================================================================
# MENU ENDPOINTS
# =============================================================================

@router.get("/menus/tree", response_model=List[MenuItem])
async def get_menu_tree(
    current_user: User = Depends(get_current_active_user),
) -> List[MenuItem]:
    """
    Get menu items as tree structure.
    In production, filter based on user's permissions.
    """
    # For now, return all menus. In production, filter based on user permissions.
    return [MenuItem(**item) for item in MENU_ITEMS]


@router.get("/menus/flat", response_model=List[MenuItem])
async def get_menu_flat(
    current_user: User = Depends(get_current_active_user),
) -> List[MenuItem]:
    """Get menu items as flat list (no children nested)."""
    flat_items = []

    def flatten(items: List[Dict[str, Any]]):
        for item in items:
            flat_item = {**item, "children": []}
            flat_items.append(MenuItem(**flat_item))
            if item.get("children"):
                flatten(item["children"])

    flatten(MENU_ITEMS)
    return flat_items


class AccessibleMenuResponse(BaseModel):
    """Response for accessible menus"""
    code: str
    menu_item_id: int
    name: str
    path: Optional[str] = None
    icon: Optional[str] = None
    can_view: bool = True
    can_edit: bool = False
    can_delete: bool = False
    can_create: bool = False
    source: str = "user"  # "user" or "group"


@router.get("/menus/accessible", response_model=List[AccessibleMenuResponse])
async def get_accessible_menus(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> List[AccessibleMenuResponse]:
    """
    Get menus accessible to the current user.
    Combines user-specific and group-based permissions.
    """
    service = MenuAccessService(db)
    menus = service.get_user_accessible_menus(
        user_id=current_user.id,
        company_id=current_user.current_company_id
    )
    return [AccessibleMenuResponse(**m) for m in menus]


@router.get("/menus/accessible/codes")
async def get_accessible_menu_codes(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> List[str]:
    """
    Get list of menu codes accessible to the current user.
    Useful for frontend to filter menu visibility.
    """
    service = MenuAccessService(db)
    codes = service.get_accessible_menu_codes(
        user_id=current_user.id,
        company_id=current_user.current_company_id
    )
    return list(codes)


# =============================================================================
# CONTENT TYPE ENDPOINTS
# =============================================================================

@router.get("/content-types", response_model=List[ContentType])
async def get_content_types(
    current_user: User = Depends(get_current_active_user),
) -> List[ContentType]:
    """
    Get all available content types.
    Similar to Django's ContentType model.
    """
    return [ContentType(**ct) for ct in CONTENT_TYPES]


@router.get("/content-types/{content_type_id}", response_model=ContentType)
async def get_content_type(
    content_type_id: int,
    current_user: User = Depends(get_current_active_user),
) -> ContentType:
    """Get a specific content type by ID."""
    for ct in CONTENT_TYPES:
        if ct["id"] == content_type_id:
            return ContentType(**ct)
    raise HTTPException(status_code=404, detail="Content type not found")


# =============================================================================
# ACCESS RULES ENDPOINTS
# =============================================================================

@router.get("/access-rules", response_model=AccessRuleList)
async def get_access_rules(
    user: Optional[int] = None,
    group: Optional[int] = None,
    content_type: Optional[int] = None,
    is_active: Optional[bool] = None,
    page: int = 1,
    page_size: int = 20,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> AccessRuleList:
    """Get access rules with optional filtering (database-backed)."""
    query = db.query(AccessRuleModel)

    if user is not None:
        query = query.filter(AccessRuleModel.user_id == user)
    if group is not None:
        query = query.filter(AccessRuleModel.group_id == group)
    if content_type is not None:
        query = query.filter(AccessRuleModel.content_type_id == content_type)
    if is_active is not None:
        query = query.filter(AccessRuleModel.is_active == is_active)

    total = query.count()
    offset = (page - 1) * page_size
    rules = query.order_by(AccessRuleModel.priority.desc()).offset(offset).limit(page_size).all()

    items = []
    for rule in rules:
        ct_name = ""
        if rule.content_type:
            ct_name = f"{rule.content_type.app_label}.{rule.content_type.model}"
        items.append(AccessRule(
            id=rule.id,
            name=rule.name,
            description=rule.description,
            content_type=rule.content_type_id,
            content_type_name=ct_name,
            scope="own",  # Default scope
            filters=json.loads(rule.domain_filter) if rule.domain_filter else {},
            can_view=rule.can_read,
            can_add=rule.can_create,
            can_change=rule.can_write,
            can_delete=rule.can_delete,
            priority=rule.priority,
            is_active=rule.is_active,
            user=rule.user_id,
            group=rule.group_id,
        ))

    return AccessRuleList(
        total=total,
        items=items,
        page=page,
        page_size=page_size,
    )


@router.post("/access-rules", response_model=AccessRule, status_code=status.HTTP_201_CREATED)
async def create_access_rule(
    data: AccessRuleCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> AccessRule:
    """Create a new access rule (database-backed)."""
    # Verify content type exists
    ct = db.query(ContentTypeModel).filter(ContentTypeModel.id == data.content_type).first()
    if not ct:
        raise HTTPException(status_code=400, detail="Content type not found")

    service = AccessRuleService(db)
    rule = service.create_rule(
        name=data.name,
        content_type_id=data.content_type,
        user_id=data.user,
        group_id=data.group,
        can_read=data.can_view,
        can_write=data.can_change,
        can_create=data.can_add,
        can_delete=data.can_delete,
        domain_filter=json.dumps(data.filters) if data.filters else None,
        priority=data.priority,
        description=data.description,
        created_by=current_user.id,
    )
    rule.is_active = data.is_active
    db.commit()

    ct_name = f"{ct.app_label}.{ct.model}"
    return AccessRule(
        id=rule.id,
        name=rule.name,
        description=rule.description,
        content_type=rule.content_type_id,
        content_type_name=ct_name,
        scope=data.scope,
        filters=data.filters,
        can_view=rule.can_read,
        can_add=rule.can_create,
        can_change=rule.can_write,
        can_delete=rule.can_delete,
        priority=rule.priority,
        is_active=rule.is_active,
        user=rule.user_id,
        group=rule.group_id,
    )


@router.get("/access-rules/{rule_id}", response_model=AccessRule)
async def get_access_rule(
    rule_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> AccessRule:
    """Get a specific access rule (database-backed)."""
    rule = db.query(AccessRuleModel).filter(AccessRuleModel.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Access rule not found")

    ct_name = ""
    if rule.content_type:
        ct_name = f"{rule.content_type.app_label}.{rule.content_type.model}"

    return AccessRule(
        id=rule.id,
        name=rule.name,
        description=rule.description,
        content_type=rule.content_type_id,
        content_type_name=ct_name,
        scope="own",
        filters=json.loads(rule.domain_filter) if rule.domain_filter else {},
        can_view=rule.can_read,
        can_add=rule.can_create,
        can_change=rule.can_write,
        can_delete=rule.can_delete,
        priority=rule.priority,
        is_active=rule.is_active,
        user=rule.user_id,
        group=rule.group_id,
    )


@router.put("/access-rules/{rule_id}", response_model=AccessRule)
async def update_access_rule(
    rule_id: int,
    data: AccessRuleUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> AccessRule:
    """Update an access rule (database-backed)."""
    rule = db.query(AccessRuleModel).filter(AccessRuleModel.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Access rule not found")

    # Update fields
    if data.name is not None:
        rule.name = data.name
    if data.description is not None:
        rule.description = data.description
    if data.filters is not None:
        rule.domain_filter = json.dumps(data.filters)
    if data.can_view is not None:
        rule.can_read = data.can_view
    if data.can_add is not None:
        rule.can_create = data.can_add
    if data.can_change is not None:
        rule.can_write = data.can_change
    if data.can_delete is not None:
        rule.can_delete = data.can_delete
    if data.priority is not None:
        rule.priority = data.priority
    if data.is_active is not None:
        rule.is_active = data.is_active

    db.commit()

    ct_name = ""
    if rule.content_type:
        ct_name = f"{rule.content_type.app_label}.{rule.content_type.model}"

    return AccessRule(
        id=rule.id,
        name=rule.name,
        description=rule.description,
        content_type=rule.content_type_id,
        content_type_name=ct_name,
        scope=data.scope or "own",
        filters=json.loads(rule.domain_filter) if rule.domain_filter else {},
        can_view=rule.can_read,
        can_add=rule.can_create,
        can_change=rule.can_write,
        can_delete=rule.can_delete,
        priority=rule.priority,
        is_active=rule.is_active,
        user=rule.user_id,
        group=rule.group_id,
    )


@router.delete("/access-rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_access_rule(
    rule_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Delete an access rule (database-backed)."""
    rule = db.query(AccessRuleModel).filter(AccessRuleModel.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Access rule not found")

    db.delete(rule)
    db.commit()
    return None


# Note: User menu permissions are in users.py (/users/{user_id}/menu-permissions)
# Note: Group menu permissions are in groups.py (/groups/{group_id}/menu-permissions)
