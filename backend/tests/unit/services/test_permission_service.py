"""
Unit tests for PermissionService.
Tests the optimized permission retrieval that fixes N+1 queries.
"""

import pytest
from sqlalchemy.orm import Session

from app.models import User, Company
from app.models.role import Role
from app.models.permission import Permission
from app.models.user_company_role import UserCompanyRole, RolePermission
from app.models.group import Group, UserGroup, GroupPermission
from app.services.permission_service import PermissionService


class TestPermissionServiceRolePermissions:
    """Tests for role-based permission retrieval"""

    def test_get_user_permissions_from_role(self, db_session: Session, test_user, test_company):
        """Test getting permissions from user's role"""
        # Create a role
        role = Role(
            name="Test Role",
            codename="test_role",
            company_id=test_company.id,
            is_active=True,
        )
        db_session.add(role)
        db_session.flush()

        # Create a permission
        permission = Permission(
            name="Read Users",
            codename="user.read",
            is_active=True,
        )
        db_session.add(permission)
        db_session.flush()

        # Assign permission to role
        role_perm = RolePermission(
            role_id=role.id,
            permission_id=permission.id,
        )
        db_session.add(role_perm)

        # Assign user to company with role
        ucr = UserCompanyRole(
            user_id=test_user.id,
            company_id=test_company.id,
            role_id=role.id,
            is_active=True,
        )
        db_session.add(ucr)
        db_session.commit()

        # Test permission retrieval (disable cache for test isolation)
        service = PermissionService(db_session)
        permissions = service.get_user_permissions(test_user.id, test_company.id, use_cache=False)

        assert "user.read" in permissions

    def test_has_permission_returns_true(self, db_session: Session, test_user, test_company):
        """Test has_permission returns True when user has permission"""
        # Setup role, permission, and assignment
        role = Role(name="Admin", codename="admin", company_id=test_company.id, is_active=True)
        db_session.add(role)
        db_session.flush()

        permission = Permission(name="Manage Users", codename="user.manage", is_active=True)
        db_session.add(permission)
        db_session.flush()

        db_session.add(RolePermission(role_id=role.id, permission_id=permission.id))
        db_session.add(UserCompanyRole(
            user_id=test_user.id,
            company_id=test_company.id,
            role_id=role.id,
            is_active=True,
        ))
        db_session.commit()

        service = PermissionService(db_session)
        assert service.has_permission(test_user.id, "user.manage", test_company.id) is True

    def test_has_permission_returns_false(self, db_session: Session, test_user, test_company):
        """Test has_permission returns False when user lacks permission"""
        service = PermissionService(db_session)
        assert service.has_permission(test_user.id, "nonexistent.permission", test_company.id) is False

    def test_superuser_always_has_permission(self, db_session: Session, admin_user):
        """Test that superuser flag bypasses permission check"""
        service = PermissionService(db_session)
        # Superuser should have any permission
        assert service.has_permission(admin_user.id, "any.permission", None, is_superuser=True) is True


class TestPermissionServiceGroupPermissions:
    """Tests for group-based permission retrieval"""

    def test_get_user_permissions_from_group(self, db_session: Session, test_user, test_company):
        """Test getting permissions from user's group"""
        # Create a group
        group = Group(
            name="Test Group",
            codename="test_group",
            company_id=test_company.id,
            is_active=True,
        )
        db_session.add(group)
        db_session.flush()

        # Create a permission
        permission = Permission(
            name="Create User",
            codename="user.create",
            is_active=True,
        )
        db_session.add(permission)
        db_session.flush()

        # Assign permission to group
        group_perm = GroupPermission(
            group_id=group.id,
            permission_id=permission.id,
        )
        db_session.add(group_perm)

        # Add user to group
        user_group = UserGroup(
            user_id=test_user.id,
            group_id=group.id,
            is_active=True,
        )
        db_session.add(user_group)
        db_session.commit()

        # Test permission retrieval (disable cache for test isolation)
        service = PermissionService(db_session)
        permissions = service.get_user_permissions(test_user.id, test_company.id, use_cache=False)

        assert "user.create" in permissions


class TestPermissionServiceCombined:
    """Tests for combined role and group permissions"""

    def test_combined_permissions(self, db_session: Session, test_user, test_company):
        """Test that permissions from both roles and groups are combined"""
        # Create role with permission
        role = Role(name="Editor", codename="editor", company_id=test_company.id, is_active=True)
        db_session.add(role)
        db_session.flush()

        perm1 = Permission(name="Edit", codename="content.edit", is_active=True)
        db_session.add(perm1)
        db_session.flush()

        db_session.add(RolePermission(role_id=role.id, permission_id=perm1.id))
        db_session.add(UserCompanyRole(
            user_id=test_user.id,
            company_id=test_company.id,
            role_id=role.id,
            is_active=True,
        ))

        # Create group with different permission
        group = Group(name="Publishers", codename="publishers", company_id=test_company.id, is_active=True)
        db_session.add(group)
        db_session.flush()

        perm2 = Permission(name="Publish", codename="content.publish", is_active=True)
        db_session.add(perm2)
        db_session.flush()

        db_session.add(GroupPermission(group_id=group.id, permission_id=perm2.id))
        db_session.add(UserGroup(user_id=test_user.id, group_id=group.id, is_active=True))
        db_session.commit()

        # Test combined permissions (disable cache for test isolation)
        service = PermissionService(db_session)
        permissions = service.get_user_permissions(test_user.id, test_company.id, use_cache=False)

        assert "content.edit" in permissions
        assert "content.publish" in permissions

    def test_inactive_permissions_excluded(self, db_session: Session, test_user, test_company):
        """Test that inactive permissions are not returned"""
        role = Role(name="Tester", codename="tester", company_id=test_company.id, is_active=True)
        db_session.add(role)
        db_session.flush()

        active_perm = Permission(name="Active", codename="active.perm", is_active=True)
        inactive_perm = Permission(name="Inactive", codename="inactive.perm", is_active=False)
        db_session.add_all([active_perm, inactive_perm])
        db_session.flush()

        db_session.add(RolePermission(role_id=role.id, permission_id=active_perm.id))
        db_session.add(RolePermission(role_id=role.id, permission_id=inactive_perm.id))
        db_session.add(UserCompanyRole(
            user_id=test_user.id,
            company_id=test_company.id,
            role_id=role.id,
            is_active=True,
        ))
        db_session.commit()

        service = PermissionService(db_session)
        permissions = service.get_user_permissions(test_user.id, test_company.id, use_cache=False)

        assert "active.perm" in permissions
        assert "inactive.perm" not in permissions


class TestPermissionServiceHelpers:
    """Tests for helper methods"""

    def test_get_role_permissions(self, db_session: Session):
        """Test getting permissions for a specific role"""
        role = Role(name="Helper Role", codename="helper", is_active=True)
        db_session.add(role)
        db_session.flush()

        perm1 = Permission(name="Perm 1", codename="helper.perm1", is_active=True)
        perm2 = Permission(name="Perm 2", codename="helper.perm2", is_active=True)
        db_session.add_all([perm1, perm2])
        db_session.flush()

        db_session.add(RolePermission(role_id=role.id, permission_id=perm1.id))
        db_session.add(RolePermission(role_id=role.id, permission_id=perm2.id))
        db_session.commit()

        service = PermissionService(db_session)
        permissions = service.get_role_permissions(role.id)

        assert len(permissions) == 2
        assert "helper.perm1" in permissions
        assert "helper.perm2" in permissions

    def test_get_group_permissions(self, db_session: Session, test_company):
        """Test getting permissions for a specific group"""
        group = Group(name="Helper Group", codename="helper_group", company_id=test_company.id, is_active=True)
        db_session.add(group)
        db_session.flush()

        perm = Permission(name="Group Perm", codename="group.perm", is_active=True)
        db_session.add(perm)
        db_session.flush()

        db_session.add(GroupPermission(group_id=group.id, permission_id=perm.id))
        db_session.commit()

        service = PermissionService(db_session)
        permissions = service.get_group_permissions(group.id)

        assert len(permissions) == 1
        assert "group.perm" in permissions
