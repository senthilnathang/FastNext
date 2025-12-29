"""
Factory Boy factories for FastNext models.

Usage:
    from tests.factories import UserFactory, RoleFactory

    # Create single instance
    user = UserFactory()

    # Create batch
    users = UserFactory.create_batch(5)

    # Build without saving
    user = UserFactory.build()

    # Override attributes
    user = UserFactory(email="custom@test.com", is_superuser=True)
"""

from tests.factories.user import (
    UserFactory,
    AdminUserFactory,
    RegularUserFactory,
    InactiveUserFactory,
)
from tests.factories.role import RoleFactory, SystemRoleFactory
from tests.factories.permission import PermissionFactory, RolePermissionFactory
from tests.factories.project import ProjectFactory, ProjectMemberFactory
from tests.factories.message import (
    MessageFactory,
    ConversationFactory,
    ConversationParticipantFactory,
    MentionFactory,
    MessageReactionFactory,
)
from tests.factories.inbox import InboxItemFactory, LabelFactory
from tests.factories.workflow import (
    WorkflowStateFactory,
    WorkflowTypeFactory,
    WorkflowTemplateFactory,
)

__all__ = [
    # User factories
    "UserFactory",
    "AdminUserFactory",
    "RegularUserFactory",
    "InactiveUserFactory",
    # Role factories
    "RoleFactory",
    "SystemRoleFactory",
    # Permission factories
    "PermissionFactory",
    "RolePermissionFactory",
    # Project factories
    "ProjectFactory",
    "ProjectMemberFactory",
    # Message factories
    "MessageFactory",
    "ConversationFactory",
    "ConversationParticipantFactory",
    "MentionFactory",
    "MessageReactionFactory",
    # Inbox factories
    "InboxItemFactory",
    "LabelFactory",
    # Workflow factories
    "WorkflowStateFactory",
    "WorkflowTypeFactory",
    "WorkflowTemplateFactory",
]
