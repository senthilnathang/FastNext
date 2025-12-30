"""
Unit tests for RBAC services.
"""

import pytest
from sqlalchemy.orm import Session

from app.models.rbac import ContentType, MenuItem, UserMenuPermission, AccessRule
from app.services.rbac import (
    ContentTypeService,
    MenuItemService,
    UserMenuPermissionService,
    AccessRuleService,
)


class TestContentTypeService:
    """Tests for ContentTypeService"""

    def test_get_or_create_new(self, db_session: Session):
        """Test get_or_create with new content type"""
        service = ContentTypeService(db_session)
        ct = service.get_or_create("core", "user", "User")
        db_session.commit()

        assert ct.id is not None
        assert ct.app_label == "core"
        assert ct.model == "user"
        assert ct.name == "User"

    def test_get_by_model(self, db_session: Session):
        """Test getting content type by app_label and model"""
        service = ContentTypeService(db_session)
        service.get_or_create("core", "company", "Company")
        db_session.commit()

        result = service.get_by_model("core", "company")
        assert result is not None
        assert result.name == "Company"

    def test_get_by_model_not_found(self, db_session: Session):
        """Test getting non-existent content type"""
        service = ContentTypeService(db_session)
        result = service.get_by_model("nonexistent", "model")
        assert result is None

    def test_get_or_create_existing(self, db_session: Session):
        """Test get_or_create with existing content type returns same record"""
        service = ContentTypeService(db_session)
        ct1 = service.get_or_create("core", "role", "Role")
        db_session.commit()

        ct2 = service.get_or_create("core", "role", "Role")
        assert ct2.id == ct1.id  # Same record


class TestMenuItemService:
    """Tests for MenuItemService"""

    def test_create_menu_item_directly(self, db_session: Session):
        """Test creating a menu item directly via model"""
        menu = MenuItem(
            code="dashboard",
            name="Dashboard",
            path="/dashboard",
            icon="lucide:home",
            order=1,
            is_active=True,
        )
        db_session.add(menu)
        db_session.commit()

        assert menu.id is not None
        assert menu.code == "dashboard"
        assert menu.is_active is True

    def test_get_by_code(self, db_session: Session):
        """Test getting menu item by code"""
        menu = MenuItem(code="profile", name="Profile", path="/profile")
        db_session.add(menu)
        db_session.commit()

        service = MenuItemService(db_session)
        result = service.get_by_code("profile")
        assert result is not None
        assert result.name == "Profile"

    def test_get_by_code_not_found(self, db_session: Session):
        """Test getting non-existent menu item"""
        service = MenuItemService(db_session)
        result = service.get_by_code("nonexistent")
        assert result is None

    def test_get_tree(self, db_session: Session):
        """Test getting menu tree structure"""
        parent = MenuItem(code="settings", name="Settings", path="/settings", order=1)
        db_session.add(parent)
        db_session.flush()

        child = MenuItem(
            code="settings.users",
            name="Users",
            path="/settings/users",
            parent_id=parent.id,
            order=1,
        )
        db_session.add(child)
        db_session.commit()

        service = MenuItemService(db_session)
        tree = service.get_tree()
        assert len(tree) == 1
        assert tree[0].code == "settings"

    def test_get_flat(self, db_session: Session):
        """Test getting flat list of menu items"""
        db_session.add(MenuItem(code="m1", name="Menu 1", path="/m1", order=1))
        db_session.add(MenuItem(code="m2", name="Menu 2", path="/m2", order=2))
        db_session.commit()

        service = MenuItemService(db_session)
        flat = service.get_flat()
        assert len(flat) == 2


class TestUserMenuPermissionService:
    """Tests for UserMenuPermissionService"""

    def test_set_user_permission(self, db_session: Session, test_user, test_company):
        """Test setting user menu permission"""
        menu = MenuItem(code="test_menu", name="Test Menu", path="/test")
        db_session.add(menu)
        db_session.flush()

        perm_service = UserMenuPermissionService(db_session)
        perm = perm_service.set_user_permission(
            user_id=test_user.id,
            menu_item_id=menu.id,
            company_id=test_company.id,
            can_view=True,
            can_edit=True,
            can_delete=False,
            can_create=False,
            created_by=test_user.id,
        )
        db_session.commit()

        assert perm.id is not None
        assert perm.can_view is True
        assert perm.can_edit is True
        assert perm.can_delete is False

    def test_get_user_permissions(self, db_session: Session, test_user, test_company):
        """Test getting user permissions"""
        menu1 = MenuItem(code="pm1", name="Menu 1", path="/pm1")
        menu2 = MenuItem(code="pm2", name="Menu 2", path="/pm2")
        db_session.add_all([menu1, menu2])
        db_session.flush()

        perm_service = UserMenuPermissionService(db_session)
        perm_service.set_user_permission(
            user_id=test_user.id,
            menu_item_id=menu1.id,
            company_id=test_company.id,
            can_view=True,
            created_by=test_user.id,
        )
        perm_service.set_user_permission(
            user_id=test_user.id,
            menu_item_id=menu2.id,
            company_id=test_company.id,
            can_view=True,
            can_edit=True,
            created_by=test_user.id,
        )
        db_session.commit()

        permissions = perm_service.get_user_permissions(test_user.id, test_company.id)
        assert len(permissions) == 2

    def test_update_existing_permission(self, db_session: Session, test_user, test_company):
        """Test updating an existing permission"""
        menu = MenuItem(code="upd_menu", name="Update Menu", path="/upd")
        db_session.add(menu)
        db_session.flush()

        perm_service = UserMenuPermissionService(db_session)
        perm1 = perm_service.set_user_permission(
            user_id=test_user.id,
            menu_item_id=menu.id,
            company_id=test_company.id,
            can_view=True,
            can_edit=False,
            created_by=test_user.id,
        )
        db_session.flush()

        # Update the same permission
        perm2 = perm_service.set_user_permission(
            user_id=test_user.id,
            menu_item_id=menu.id,
            company_id=test_company.id,
            can_view=True,
            can_edit=True,  # Changed
            created_by=test_user.id,
        )
        db_session.commit()

        assert perm1.id == perm2.id  # Same record updated
        assert perm2.can_edit is True

    def test_get_accessible_menu_codes(self, db_session: Session, test_user, test_company):
        """Test getting accessible menu codes"""
        menu1 = MenuItem(code="accessible", name="Accessible", path="/a")
        menu2 = MenuItem(code="not_accessible", name="Not Accessible", path="/n")
        db_session.add_all([menu1, menu2])
        db_session.flush()

        perm_service = UserMenuPermissionService(db_session)
        perm_service.set_user_permission(
            user_id=test_user.id,
            menu_item_id=menu1.id,
            company_id=test_company.id,
            can_view=True,
            created_by=test_user.id,
        )
        perm_service.set_user_permission(
            user_id=test_user.id,
            menu_item_id=menu2.id,
            company_id=test_company.id,
            can_view=False,  # Not viewable
            created_by=test_user.id,
        )
        db_session.commit()

        codes = perm_service.get_accessible_menu_codes(test_user.id, test_company.id)
        assert "accessible" in codes
        assert "not_accessible" not in codes


class TestAccessRuleService:
    """Tests for AccessRuleService"""

    def test_create_rule(self, db_session: Session, test_user):
        """Test creating an access rule"""
        ct_service = ContentTypeService(db_session)
        ct = ct_service.get_or_create("core", "document", "Document")
        db_session.flush()

        rule_service = AccessRuleService(db_session)
        rule = rule_service.create_rule(
            name="User Document Access",
            content_type_id=ct.id,
            user_id=test_user.id,
            can_read=True,
            can_write=True,
            can_create=True,
            can_delete=False,
            created_by=test_user.id,
        )
        db_session.commit()

        assert rule.id is not None
        assert rule.name == "User Document Access"
        assert rule.can_read is True
        assert rule.can_delete is False

    def test_get_rules_by_content_type(self, db_session: Session, test_user):
        """Test getting rules for a content type"""
        ct_service = ContentTypeService(db_session)
        ct = ct_service.get_or_create("core", "invoice", "Invoice")
        db_session.flush()

        rule_service = AccessRuleService(db_session)
        rule_service.create_rule(
            name="Invoice Rule 1",
            content_type_id=ct.id,
            can_read=True,
            created_by=test_user.id,
        )
        rule_service.create_rule(
            name="Invoice Rule 2",
            content_type_id=ct.id,
            can_read=True,
            can_write=True,
            created_by=test_user.id,
        )
        db_session.commit()

        rules = rule_service.get_rules_by_content_type(ct.id)
        assert len(rules) == 2

    def test_rule_with_domain_filter(self, db_session: Session, test_user):
        """Test creating a rule with domain filter"""
        ct_service = ContentTypeService(db_session)
        ct = ct_service.get_or_create("core", "order", "Order")
        db_session.flush()

        rule_service = AccessRuleService(db_session)
        rule = rule_service.create_rule(
            name="Own Orders Only",
            content_type_id=ct.id,
            user_id=test_user.id,
            can_read=True,
            domain_filter='{"created_by": "user.id"}',
            priority=10,
            created_by=test_user.id,
        )
        db_session.commit()

        assert rule.domain_filter == '{"created_by": "user.id"}'
        assert rule.priority == 10

    def test_check_access(self, db_session: Session, test_user):
        """Test checking access permissions"""
        ct_service = ContentTypeService(db_session)
        ct = ct_service.get_or_create("core", "report", "Report")
        db_session.flush()

        rule_service = AccessRuleService(db_session)
        rule_service.create_rule(
            name="User Report Access",
            content_type_id=ct.id,
            user_id=test_user.id,
            can_read=True,
            can_write=False,
            can_delete=False,
            created_by=test_user.id,
        )
        db_session.commit()

        # User should have read access but not write/delete
        assert rule_service.check_access(test_user.id, ct.id, 'read') is True
        assert rule_service.check_access(test_user.id, ct.id, 'write') is False
        assert rule_service.check_access(test_user.id, ct.id, 'delete') is False
