"""
RBAC Services for menu permissions, access rules, and content types.
Provides database-backed operations replacing in-memory storage.
"""

from typing import List, Optional, Dict, Any, Set
from sqlalchemy.orm import Session, joinedload

from app.models.rbac import ContentType, MenuItem, UserMenuPermission, GroupMenuPermission, AccessRule
from app.models.group import UserGroup
from app.services.base import BaseService


class ContentTypeService(BaseService[ContentType]):
    """Service for ContentType operations"""

    def __init__(self, db: Session):
        super().__init__(db, ContentType)

    def get_by_model(self, app_label: str, model: str) -> Optional[ContentType]:
        """Get content type by app_label and model"""
        return self.db.query(ContentType).filter(
            ContentType.app_label == app_label,
            ContentType.model == model
        ).first()

    def get_or_create(self, app_label: str, model: str, name: str) -> ContentType:
        """Get or create a content type"""
        existing = self.get_by_model(app_label, model)
        if existing:
            return existing

        content_type = ContentType(
            app_label=app_label,
            model=model,
            name=name
        )
        self.db.add(content_type)
        self.db.flush()
        return content_type


class MenuItemService(BaseService[MenuItem]):
    """Service for MenuItem operations"""

    def __init__(self, db: Session):
        super().__init__(db, MenuItem)

    def get_by_code(self, code: str) -> Optional[MenuItem]:
        """Get menu item by code"""
        return self.db.query(MenuItem).filter(MenuItem.code == code).first()

    def get_tree(self, include_inactive: bool = False) -> List[MenuItem]:
        """Get menu items as tree structure (only root items with children loaded)"""
        query = self.db.query(MenuItem).filter(MenuItem.parent_id == None)
        if not include_inactive:
            query = query.filter(MenuItem.is_active == True)
        return query.options(
            joinedload(MenuItem.children)
        ).order_by(MenuItem.order).all()

    def get_flat(self, include_inactive: bool = False) -> List[MenuItem]:
        """Get all menu items as flat list"""
        query = self.db.query(MenuItem)
        if not include_inactive:
            query = query.filter(MenuItem.is_active == True)
        return query.order_by(MenuItem.parent_id, MenuItem.order).all()


class UserMenuPermissionService(BaseService[UserMenuPermission]):
    """Service for UserMenuPermission operations"""

    def __init__(self, db: Session):
        super().__init__(db, UserMenuPermission)

    def get_user_permissions(
        self,
        user_id: int,
        company_id: Optional[int] = None
    ) -> List[UserMenuPermission]:
        """Get all menu permissions for a user"""
        query = self.db.query(UserMenuPermission).filter(
            UserMenuPermission.user_id == user_id,
            UserMenuPermission.is_active == True
        )
        if company_id:
            query = query.filter(
                (UserMenuPermission.company_id == company_id) |
                (UserMenuPermission.company_id == None)
            )
        return query.options(
            joinedload(UserMenuPermission.menu_item)
        ).all()

    def get_accessible_menu_codes(
        self,
        user_id: int,
        company_id: Optional[int] = None
    ) -> Set[str]:
        """Get set of menu codes the user can access"""
        permissions = self.get_user_permissions(user_id, company_id)
        return {p.menu_item.code for p in permissions if p.can_view}

    def set_user_permission(
        self,
        user_id: int,
        menu_item_id: int,
        company_id: Optional[int] = None,
        can_view: bool = True,
        can_edit: bool = False,
        can_delete: bool = False,
        can_create: bool = False,
        created_by: Optional[int] = None,
    ) -> UserMenuPermission:
        """Set or update a user's menu permission"""
        # Try to find existing
        existing = self.db.query(UserMenuPermission).filter(
            UserMenuPermission.user_id == user_id,
            UserMenuPermission.menu_item_id == menu_item_id,
            UserMenuPermission.company_id == company_id
        ).first()

        if existing:
            existing.can_view = can_view
            existing.can_edit = can_edit
            existing.can_delete = can_delete
            existing.can_create = can_create
            existing.is_active = True
            self.db.flush()
            return existing

        # Create new
        permission = UserMenuPermission(
            user_id=user_id,
            menu_item_id=menu_item_id,
            company_id=company_id,
            can_view=can_view,
            can_edit=can_edit,
            can_delete=can_delete,
            can_create=can_create,
            created_by=created_by,
        )
        self.db.add(permission)
        self.db.flush()
        return permission

    def bulk_set_permissions(
        self,
        user_id: int,
        menu_permissions: List[Dict[str, Any]],
        company_id: Optional[int] = None,
        created_by: Optional[int] = None,
    ) -> List[UserMenuPermission]:
        """Bulk set permissions for a user"""
        results = []
        for perm in menu_permissions:
            result = self.set_user_permission(
                user_id=user_id,
                menu_item_id=perm["menu_item_id"],
                company_id=company_id,
                can_view=perm.get("can_view", True),
                can_edit=perm.get("can_edit", False),
                can_delete=perm.get("can_delete", False),
                can_create=perm.get("can_create", False),
                created_by=created_by,
            )
            results.append(result)
        return results

    def remove_permission(
        self,
        user_id: int,
        menu_item_id: int,
        company_id: Optional[int] = None
    ) -> bool:
        """Remove a user's menu permission"""
        deleted = self.db.query(UserMenuPermission).filter(
            UserMenuPermission.user_id == user_id,
            UserMenuPermission.menu_item_id == menu_item_id,
            UserMenuPermission.company_id == company_id
        ).delete()
        return deleted > 0


class GroupMenuPermissionService(BaseService[GroupMenuPermission]):
    """Service for GroupMenuPermission operations"""

    def __init__(self, db: Session):
        super().__init__(db, GroupMenuPermission)

    def get_group_permissions(
        self,
        group_id: int,
        company_id: Optional[int] = None
    ) -> List[GroupMenuPermission]:
        """Get all menu permissions for a group"""
        query = self.db.query(GroupMenuPermission).filter(
            GroupMenuPermission.group_id == group_id,
            GroupMenuPermission.is_active == True
        )
        if company_id:
            query = query.filter(
                (GroupMenuPermission.company_id == company_id) |
                (GroupMenuPermission.company_id == None)
            )
        return query.options(
            joinedload(GroupMenuPermission.menu_item)
        ).all()

    def get_accessible_menu_codes(
        self,
        group_id: int,
        company_id: Optional[int] = None
    ) -> Set[str]:
        """Get set of menu codes the group can access"""
        permissions = self.get_group_permissions(group_id, company_id)
        return {p.menu_item.code for p in permissions if p.can_view}

    def set_group_permission(
        self,
        group_id: int,
        menu_item_id: int,
        company_id: Optional[int] = None,
        can_view: bool = True,
        can_edit: bool = False,
        can_delete: bool = False,
        can_create: bool = False,
        created_by: Optional[int] = None,
    ) -> GroupMenuPermission:
        """Set or update a group's menu permission"""
        existing = self.db.query(GroupMenuPermission).filter(
            GroupMenuPermission.group_id == group_id,
            GroupMenuPermission.menu_item_id == menu_item_id,
            GroupMenuPermission.company_id == company_id
        ).first()

        if existing:
            existing.can_view = can_view
            existing.can_edit = can_edit
            existing.can_delete = can_delete
            existing.can_create = can_create
            existing.is_active = True
            self.db.flush()
            return existing

        permission = GroupMenuPermission(
            group_id=group_id,
            menu_item_id=menu_item_id,
            company_id=company_id,
            can_view=can_view,
            can_edit=can_edit,
            can_delete=can_delete,
            can_create=can_create,
            created_by=created_by,
        )
        self.db.add(permission)
        self.db.flush()
        return permission

    def remove_permission(
        self,
        group_id: int,
        menu_item_id: int,
        company_id: Optional[int] = None
    ) -> bool:
        """Remove a group's menu permission"""
        deleted = self.db.query(GroupMenuPermission).filter(
            GroupMenuPermission.group_id == group_id,
            GroupMenuPermission.menu_item_id == menu_item_id,
            GroupMenuPermission.company_id == company_id
        ).delete()
        return deleted > 0


class MenuAccessService:
    """
    Service to check menu access combining user and group permissions.
    Used by frontend to get accessible menus for current user.
    """

    def __init__(self, db: Session):
        self.db = db
        self.user_perm_service = UserMenuPermissionService(db)
        self.group_perm_service = GroupMenuPermissionService(db)

    def get_user_accessible_menus(
        self,
        user_id: int,
        company_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Get all accessible menu items for a user.
        Combines direct user permissions and group-based permissions.
        Returns list of menu items with their permission flags.
        """
        # Get user's direct permissions
        user_permissions = self.user_perm_service.get_user_permissions(user_id, company_id)

        # Get user's groups
        user_groups = self.db.query(UserGroup.group_id).filter(
            UserGroup.user_id == user_id
        ).all()
        group_ids = [g.group_id for g in user_groups]

        # Get group permissions
        group_permissions = []
        for group_id in group_ids:
            group_perms = self.group_perm_service.get_group_permissions(group_id, company_id)
            group_permissions.extend(group_perms)

        # Merge permissions (user permissions override group permissions)
        menu_access = {}

        # First, add group permissions
        for perm in group_permissions:
            code = perm.menu_item.code
            if code not in menu_access:
                menu_access[code] = {
                    "code": code,
                    "menu_item_id": perm.menu_item_id,
                    "name": perm.menu_item.name,
                    "path": perm.menu_item.path,
                    "icon": perm.menu_item.icon,
                    "can_view": perm.can_view,
                    "can_edit": perm.can_edit,
                    "can_delete": perm.can_delete,
                    "can_create": perm.can_create,
                    "source": "group",
                }
            else:
                # Merge permissions (grant if any source grants)
                menu_access[code]["can_view"] = menu_access[code]["can_view"] or perm.can_view
                menu_access[code]["can_edit"] = menu_access[code]["can_edit"] or perm.can_edit
                menu_access[code]["can_delete"] = menu_access[code]["can_delete"] or perm.can_delete
                menu_access[code]["can_create"] = menu_access[code]["can_create"] or perm.can_create

        # Override with user-specific permissions
        for perm in user_permissions:
            code = perm.menu_item.code
            menu_access[code] = {
                "code": code,
                "menu_item_id": perm.menu_item_id,
                "name": perm.menu_item.name,
                "path": perm.menu_item.path,
                "icon": perm.menu_item.icon,
                "can_view": perm.can_view,
                "can_edit": perm.can_edit,
                "can_delete": perm.can_delete,
                "can_create": perm.can_create,
                "source": "user",
            }

        # Filter to only viewable menus
        return [m for m in menu_access.values() if m["can_view"]]

    def get_accessible_menu_codes(
        self,
        user_id: int,
        company_id: Optional[int] = None
    ) -> Set[str]:
        """Get set of menu codes the user can access (from user + group permissions)"""
        menus = self.get_user_accessible_menus(user_id, company_id)
        return {m["code"] for m in menus}

    def can_access_menu(
        self,
        user_id: int,
        menu_code: str,
        company_id: Optional[int] = None
    ) -> bool:
        """Check if user can access a specific menu"""
        accessible = self.get_accessible_menu_codes(user_id, company_id)
        return menu_code in accessible


class AccessRuleService(BaseService[AccessRule]):
    """Service for AccessRule operations"""

    def __init__(self, db: Session):
        super().__init__(db, AccessRule)

    def get_rules_for_user(
        self,
        user_id: int,
        content_type_id: int,
        company_id: Optional[int] = None
    ) -> List[AccessRule]:
        """Get all access rules applicable to a user for a content type"""
        return AccessRule.get_rules_for_user(
            self.db, user_id, content_type_id, company_id
        )

    def get_rules_by_content_type(
        self,
        content_type_id: int,
        include_inactive: bool = False
    ) -> List[AccessRule]:
        """Get all access rules for a content type"""
        query = self.db.query(AccessRule).filter(
            AccessRule.content_type_id == content_type_id
        )
        if not include_inactive:
            query = query.filter(AccessRule.is_active == True)
        return query.order_by(AccessRule.priority.desc()).all()

    def create_rule(
        self,
        name: str,
        content_type_id: int,
        user_id: Optional[int] = None,
        group_id: Optional[int] = None,
        company_id: Optional[int] = None,
        can_read: bool = True,
        can_write: bool = False,
        can_create: bool = False,
        can_delete: bool = False,
        domain_filter: Optional[str] = None,
        priority: int = 10,
        description: Optional[str] = None,
        created_by: Optional[int] = None,
    ) -> AccessRule:
        """Create a new access rule"""
        rule = AccessRule(
            name=name,
            content_type_id=content_type_id,
            user_id=user_id,
            group_id=group_id,
            company_id=company_id,
            can_read=can_read,
            can_write=can_write,
            can_create=can_create,
            can_delete=can_delete,
            domain_filter=domain_filter,
            priority=priority,
            description=description,
            created_by=created_by,
        )
        self.db.add(rule)
        self.db.flush()
        return rule

    def check_access(
        self,
        user_id: int,
        content_type_id: int,
        action: str,  # 'read', 'write', 'create', 'delete'
        company_id: Optional[int] = None
    ) -> bool:
        """Check if a user has access to perform an action on a content type"""
        rules = self.get_rules_for_user(user_id, content_type_id, company_id)

        if not rules:
            # No rules means no access (or allow depending on policy)
            return False

        # Check highest priority rule
        for rule in rules:
            if action == 'read' and rule.can_read:
                return True
            elif action == 'write' and rule.can_write:
                return True
            elif action == 'create' and rule.can_create:
                return True
            elif action == 'delete' and rule.can_delete:
                return True

        return False
