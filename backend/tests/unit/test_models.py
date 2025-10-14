"""
Unit tests for SQLAlchemy models.

Tests model creation, validation, relationships, and methods.
"""

from datetime import datetime

import pytest
from app.models.permission import Permission
from app.models.role import Role
from app.models.user import User
from app.models.workflow import WorkflowState, WorkflowTemplate, WorkflowType
from sqlalchemy.exc import IntegrityError


class TestUserModel:
    """Test User model."""

    def test_create_user(self, db):
        """Test creating a user."""
        user = User(
            email="test@example.com",
            username="testuser",
            full_name="Test User",
            hashed_password="hashedpassword",
            is_active=True,
        )
        db.add(user)
        db.commit()

        assert user.id is not None
        assert user.email == "test@example.com"
        assert user.username == "testuser"
        assert user.is_active is True
        assert user.is_verified is False
        assert user.is_superuser is False
        assert isinstance(user.created_at, datetime)

    def test_user_email_unique_constraint(self, db):
        """Test that user email must be unique."""
        user1 = User(
            email="test@example.com", username="user1", hashed_password="hash1"
        )
        user2 = User(
            email="test@example.com", username="user2", hashed_password="hash2"
        )

        db.add(user1)
        db.commit()

        db.add(user2)
        with pytest.raises(IntegrityError):
            db.commit()

    def test_user_username_unique_constraint(self, db):
        """Test that username must be unique."""
        user1 = User(
            email="test1@example.com", username="testuser", hashed_password="hash1"
        )
        user2 = User(
            email="test2@example.com", username="testuser", hashed_password="hash2"
        )

        db.add(user1)
        db.commit()

        db.add(user2)
        with pytest.raises(IntegrityError):
            db.commit()

    def test_user_repr(self, db):
        """Test user string representation."""
        user = User(
            email="test@example.com", username="testuser", hashed_password="hash"
        )
        db.add(user)
        db.commit()

        assert (
            str(user)
            == f"<User(id={user.id}, username='testuser', email='test@example.com')>"
        )


class TestRoleModel:
    """Test Role model."""

    def test_create_role(self, db):
        """Test creating a role."""
        role = Role(
            name="test_role",
            description="Test Role",
            is_active=True,
            is_system_role=False,
        )
        db.add(role)
        db.commit()

        assert role.id is not None
        assert role.name == "test_role"
        assert role.description == "Test Role"
        assert role.is_active is True
        assert role.is_system_role is False
        assert isinstance(role.created_at, datetime)

    def test_role_name_unique_constraint(self, db):
        """Test that role name must be unique."""
        role1 = Role(name="test_role", description="First role")
        role2 = Role(name="test_role", description="Second role")

        db.add(role1)
        db.commit()

        db.add(role2)
        with pytest.raises(IntegrityError):
            db.commit()

    def test_role_repr(self, db):
        """Test role string representation."""
        role = Role(name="test_role", description="Test Role")
        db.add(role)
        db.commit()

        assert str(role) == f"<Role(id={role.id}, name='test_role')>"


class TestPermissionModel:
    """Test Permission model."""

    def test_create_permission(self, db):
        """Test creating a permission."""
        permission = Permission(
            name="test_permission",
            description="Test Permission",
            action="read",
            resource="test_resource",
            category="test",
            is_system_permission=False,
        )
        db.add(permission)
        db.commit()

        assert permission.id is not None
        assert permission.name == "test_permission"
        assert permission.action == "read"
        assert permission.resource == "test_resource"
        assert permission.category == "test"
        assert permission.is_system_permission is False

    def test_permission_name_unique_constraint(self, db):
        """Test that permission name must be unique."""
        perm1 = Permission(
            name="test_perm", action="read", resource="res1", category="cat1"
        )
        perm2 = Permission(
            name="test_perm", action="write", resource="res2", category="cat2"
        )

        db.add(perm1)
        db.commit()

        db.add(perm2)
        with pytest.raises(IntegrityError):
            db.commit()


class TestWorkflowModels:
    """Test Workflow models."""

    def test_create_workflow_type(self, db, admin_user):
        """Test creating a workflow type."""
        workflow_type = WorkflowType(
            name="Test Workflow",
            description="Test workflow type",
            icon="TestIcon",
            color="#FF0000",
            is_active=True,
            created_by=admin_user.id,
        )
        db.add(workflow_type)
        db.commit()

        assert workflow_type.id is not None
        assert workflow_type.name == "Test Workflow"
        assert workflow_type.color == "#FF0000"
        assert workflow_type.is_active is True
        assert workflow_type.created_by == admin_user.id

    def test_create_workflow_state(self, db):
        """Test creating a workflow state."""
        state = WorkflowState(
            name="test_state",
            label="Test State",
            description="Test state",
            color="#00FF00",
            bg_color="#CCFFCC",
            icon="StateIcon",
            is_initial=True,
            is_final=False,
        )
        db.add(state)
        db.commit()

        assert state.id is not None
        assert state.name == "test_state"
        assert state.label == "Test State"
        assert state.is_initial is True
        assert state.is_final is False

    def test_workflow_template_with_type_relationship(
        self, db, admin_user, sample_workflow_type
    ):
        """Test workflow template with type relationship."""
        template = WorkflowTemplate(
            name="Test Template",
            description="Test template",
            workflow_type_id=sample_workflow_type.id,
            is_active=True,
            nodes=[],
            edges=[],
            settings={},
            created_by=admin_user.id,
        )
        db.add(template)
        db.commit()

        assert template.id is not None
        assert template.workflow_type_id == sample_workflow_type.id
        assert template.workflow_type.name == "Test Workflow"
        assert template.created_by == admin_user.id
