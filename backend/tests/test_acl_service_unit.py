import pytest
from unittest.mock import Mock
from app.models.user import User
from app.models.workflow import AccessControlList, RecordPermission
from app.services.acl_service import ACLService, ACLEvaluationError


class TestACLService:
    """Unit tests for ACLService"""

    def test_evaluate_condition_valid(self):
        """Test evaluating valid conditions"""
        context = {
            'user_id': 1,
            'entity_data': {'amount': 1000},
            'user_roles': ['admin']
        }

        # Test simple condition
        result = ACLService.evaluate_condition("user_id == 1", context)
        assert result is True

        # Test complex condition
        result = ACLService.evaluate_condition("entity_data['amount'] > 500", context)
        assert result is True

        # Test role check
        result = ACLService.evaluate_condition("'admin' in user_roles", context)
        assert result is True

    def test_evaluate_condition_invalid(self):
        """Test evaluating invalid conditions"""
        context = {'user_id': 1}

        with pytest.raises(ACLEvaluationError):
            ACLService.evaluate_condition("invalid_syntax (", context)

    def test_evaluate_acl_allowed_roles(self):
        """Test ACL evaluation with allowed roles"""
        db = Mock()
        user = Mock()
        user.id = 1

        # Mock user roles
        from app.services.permission_service import PermissionService
        PermissionService.get_user_roles = Mock(return_value=[
            Mock(name='admin'),
            Mock(name='manager')
        ])

        acl = AccessControlList(
            name="test_acl",
            entity_type="orders",
            operation="read",
            allowed_roles=["admin", "manager"],
            is_active=True
        )

        result, reason = ACLService.evaluate_acl(db, acl, user)
        assert result is True
        assert "allowed" in reason.lower()

    def test_evaluate_acl_denied_roles(self):
        """Test ACL evaluation with denied roles"""
        db = Mock()
        user = Mock()
        user.id = 1

        # Mock user roles
        from app.services.permission_service import PermissionService
        PermissionService.get_user_roles = Mock(return_value=[
            Mock(name='user'),
            Mock(name='denied_role')
        ])

        acl = AccessControlList(
            name="test_acl",
            entity_type="orders",
            operation="read",
            denied_roles=["denied_role"],
            is_active=True
        )

        result, reason = ACLService.evaluate_acl(db, acl, user)
        assert result is False
        assert "denied" in reason.lower()

    def test_evaluate_acl_condition(self):
        """Test ACL evaluation with condition script"""
        db = Mock()
        user = Mock()
        user.id = 1

        # Mock user roles
        from app.services.permission_service import PermissionService
        PermissionService.get_user_roles = Mock(return_value=[Mock(name='admin')])

        acl = AccessControlList(
            name="test_acl",
            entity_type="orders",
            operation="read",
            condition_script="user_id == 1",
            allowed_roles=["admin"],
            is_active=True
        )

        entity_data = {'order_id': '123'}

        result, reason = ACLService.evaluate_acl(db, acl, user, entity_data)
        assert result is True

    def test_check_record_access_with_acl(self):
        """Test record access checking with ACLs"""
        db = Mock()

        # Mock ACL query
        mock_acl = Mock()
        mock_acl.name = "test_acl"
        mock_acl.entity_type = "orders"
        mock_acl.operation = "read"
        mock_acl.is_active = True
        mock_acl.condition_script = None
        mock_acl.allowed_roles = ["admin"]
        mock_acl.denied_roles = []
        mock_acl.allowed_users = []
        mock_acl.denied_users = []

        db.query.return_value.filter.return_value.order_by.return_value.all.return_value = [mock_acl]

        user = Mock()
        user.id = 1

        # Mock user roles
        from app.services.permission_service import PermissionService
        PermissionService.get_user_roles = Mock(return_value=[Mock(name='admin')])

        # Mock evaluate_acl
        ACLService.evaluate_acl = Mock(return_value=(True, "Access granted"))

        result, reason = ACLService.check_record_access(db, user, "orders", "123", "read")
        assert result is True

    def test_check_record_access_no_acls(self):
        """Test record access when no ACLs exist"""
        db = Mock()

        # Mock empty ACL query
        db.query.return_value.filter.return_value.order_by.return_value.all.return_value = []

        user = Mock()
        user.id = 1

        # Mock general permission check
        from app.services.permission_service import PermissionService
        PermissionService.check_permission = Mock(return_value=True)

        result, reason = ACLService.check_record_access(db, user, "orders", "123", "read")
        assert result is True
        assert "general permission" in reason.lower()

    def test_grant_record_permission(self):
        """Test granting record permission"""
        db = Mock()
        db.add = Mock()
        db.commit = Mock()
        db.refresh = Mock()

        permission = ACLService.grant_record_permission(
            db=db,
            entity_type="orders",
            entity_id="123",
            user_id=1,
            role_id=None,
            operation="read",
            granted_by=1
        )

        assert permission.entity_type == "orders"
        assert permission.entity_id == "123"
        assert permission.user_id == 1
        assert permission.operation == "read"
        assert permission.is_active is True

    def test_revoke_record_permission(self):
        """Test revoking record permission"""
        db = Mock()

        mock_permission = Mock()
        db.query.return_value.filter.return_value.first.return_value = mock_permission

        result = ACLService.revoke_record_permission(db, 1, 1)
        assert result is True
        assert mock_permission.is_active is False

    def test_revoke_nonexistent_permission(self):
        """Test revoking non-existent permission"""
        db = Mock()
        db.query.return_value.filter.return_value.first.return_value = None

        result = ACLService.revoke_record_permission(db, 999, 1)
        assert result is False</content>
</xai:function_call/>
<xai:function_call name="write">
<parameter name="filePath">backend/tests/test_workflow_approvals.py