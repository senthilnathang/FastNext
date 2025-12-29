"""
Tests demonstrating Factory Boy usage patterns.

Shows how to use factories for efficient test data creation.
"""

import pytest
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.role import Role
from app.models.project import Project
from app.models.message import Message, MessageType
from app.models.inbox import InboxItem, InboxItemType, InboxPriority
from tests.factories import (
    UserFactory,
    AdminUserFactory,
    RegularUserFactory,
    InactiveUserFactory,
    RoleFactory,
    SystemRoleFactory,
    ProjectFactory,
    MessageFactory,
    InboxItemFactory,
    LabelFactory,
    WorkflowStateFactory,
    WorkflowTypeFactory,
)


class TestUserFactories:
    """Tests demonstrating user factory usage."""

    @pytest.mark.unit
    def test_basic_user_creation(self, db: Session):
        """Create a basic user with defaults."""
        user = UserFactory()
        assert user.id is not None
        assert "@" in user.email
        assert user.is_active is True
        assert user.is_superuser is False

    @pytest.mark.unit
    def test_admin_user_creation(self, db: Session):
        """Create an admin user."""
        admin = AdminUserFactory()
        assert admin.is_superuser is True
        assert admin.is_verified is True

    @pytest.mark.unit
    def test_custom_attributes(self, db: Session):
        """Create user with custom attributes."""
        user = UserFactory(
            email="custom@example.com",
            username="customuser",
            full_name="Custom User",
        )
        assert user.email == "custom@example.com"
        assert user.username == "customuser"
        assert user.full_name == "Custom User"

    @pytest.mark.unit
    def test_batch_creation(self, db: Session):
        """Create multiple users efficiently."""
        users = UserFactory.create_batch(10)
        assert len(users) == 10
        # All have unique emails
        emails = [u.email for u in users]
        assert len(set(emails)) == 10

    @pytest.mark.unit
    def test_trait_locked_user(self, db: Session):
        """Create locked user using trait."""
        locked = UserFactory(locked=True)
        assert locked.failed_login_attempts == 5
        assert locked.locked_until is not None

    @pytest.mark.unit
    def test_build_vs_create(self, db: Session):
        """Demonstrate build vs create."""
        # Build: creates instance without saving
        unsaved_user = UserFactory.build()
        assert unsaved_user.id is None

        # Create: saves to database
        saved_user = UserFactory()
        assert saved_user.id is not None


class TestRoleFactories:
    """Tests demonstrating role factory usage."""

    @pytest.mark.unit
    def test_regular_role(self, db: Session):
        """Create a regular role."""
        role = RoleFactory()
        assert role.is_system_role is False
        assert role.is_active is True

    @pytest.mark.unit
    def test_system_role(self, db: Session):
        """Create a system role."""
        role = SystemRoleFactory()
        assert role.is_system_role is True


class TestProjectFactories:
    """Tests demonstrating project factory usage."""

    @pytest.mark.unit
    def test_project_with_owner(self, db: Session):
        """Create project with owner relationship."""
        user = UserFactory()
        project = ProjectFactory(user_id=user.id)
        assert project.user_id == user.id

    @pytest.mark.unit
    def test_public_project_trait(self, db: Session):
        """Create public project using trait."""
        user = UserFactory()
        project = ProjectFactory(user_id=user.id, public=True)
        assert project.is_public is True

    @pytest.mark.unit
    def test_project_with_settings(self, db: Session):
        """Create project with default settings."""
        user = UserFactory()
        project = ProjectFactory(user_id=user.id, with_settings=True)
        assert "theme" in project.settings


class TestMessageFactories:
    """Tests demonstrating message factory usage."""

    @pytest.mark.unit
    def test_basic_message(self, db: Session):
        """Create a basic message."""
        user = UserFactory()
        message = MessageFactory(user_id=user.id)
        assert message.message_type == MessageType.COMMENT
        assert message.is_deleted is False

    @pytest.mark.unit
    def test_internal_message(self, db: Session):
        """Create internal message using trait."""
        user = UserFactory()
        message = MessageFactory(user_id=user.id, internal=True)
        assert message.is_internal is True

    @pytest.mark.unit
    def test_message_with_attachment(self, db: Session):
        """Create message with attachment using trait."""
        user = UserFactory()
        message = MessageFactory(user_id=user.id, with_attachment=True)
        assert len(message.attachments) > 0
        assert "name" in message.attachments[0]

    @pytest.mark.unit
    def test_system_message(self, db: Session):
        """Create system message using trait."""
        user = UserFactory()
        message = MessageFactory(user_id=user.id, system=True)
        assert message.message_type == MessageType.SYSTEM
        assert message.is_internal is True


class TestInboxFactories:
    """Tests demonstrating inbox factory usage."""

    @pytest.mark.unit
    def test_basic_inbox_item(self, db: Session):
        """Create a basic inbox item."""
        user = UserFactory()
        item = InboxItemFactory(user_id=user.id)
        assert item.is_read is False
        assert item.item_type == InboxItemType.NOTIFICATION

    @pytest.mark.unit
    def test_urgent_item(self, db: Session):
        """Create urgent inbox item using trait."""
        user = UserFactory()
        item = InboxItemFactory(user_id=user.id, urgent=True)
        assert item.priority == InboxPriority.URGENT

    @pytest.mark.unit
    def test_message_inbox_item(self, db: Session):
        """Create message-type inbox item using trait."""
        user = UserFactory()
        item = InboxItemFactory(user_id=user.id, message_type=True)
        assert item.item_type == InboxItemType.MESSAGE
        assert item.reference_type == "messages"

    @pytest.mark.unit
    def test_starred_archived_item(self, db: Session):
        """Create starred and archived item using traits."""
        user = UserFactory()
        item = InboxItemFactory(user_id=user.id, starred=True, archived=True)
        assert item.is_starred is True
        assert item.is_archived is True


class TestLabelFactories:
    """Tests demonstrating label factory usage."""

    @pytest.mark.unit
    def test_basic_label(self, db: Session):
        """Create a basic label."""
        user = UserFactory()
        label = LabelFactory(user_id=user.id)
        assert label.name is not None
        assert label.color is not None
        assert label.color.startswith("#")


class TestWorkflowFactories:
    """Tests demonstrating workflow factory usage."""

    @pytest.mark.unit
    def test_workflow_state(self, db: Session):
        """Create a workflow state."""
        state = WorkflowStateFactory()
        assert state.name is not None
        assert state.label is not None
        assert state.color is not None

    @pytest.mark.unit
    def test_workflow_type(self, db: Session):
        """Create a workflow type."""
        user = UserFactory()
        wf_type = WorkflowTypeFactory(created_by=user.id)
        assert wf_type.is_active is True
        assert wf_type.created_by == user.id

    @pytest.mark.unit
    def test_inactive_workflow_type(self, db: Session):
        """Create inactive workflow type using trait."""
        user = UserFactory()
        wf_type = WorkflowTypeFactory(created_by=user.id, inactive=True)
        assert wf_type.is_active is False
