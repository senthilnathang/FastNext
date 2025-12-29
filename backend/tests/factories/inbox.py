"""
Inbox and Label factories for testing.
"""

import factory
from factory import Sequence, LazyFunction

from app.models.inbox import InboxItem, InboxItemType, InboxPriority
from app.models.label import Label
from tests.factories.base import SQLAlchemyModelFactory


class InboxItemFactory(SQLAlchemyModelFactory):
    """Factory for creating InboxItem instances."""

    class Meta:
        model = InboxItem

    user_id = None  # Must be provided
    item_type = InboxItemType.NOTIFICATION
    reference_type = "notifications"
    reference_id = Sequence(lambda n: n + 1)
    source_model = None
    source_id = None

    title = factory.Faker("sentence", nb_words=6)
    preview = factory.Faker("text", max_nb_chars=200)

    is_read = False
    is_archived = False
    is_starred = False

    priority = InboxPriority.NORMAL
    actor_id = None

    class Params:
        """Traits for inbox item configurations."""

        read = factory.Trait(is_read=True)
        starred = factory.Trait(is_starred=True)
        archived = factory.Trait(is_archived=True)
        urgent = factory.Trait(priority=InboxPriority.URGENT)
        high_priority = factory.Trait(priority=InboxPriority.HIGH)

        message_type = factory.Trait(
            item_type=InboxItemType.MESSAGE,
            reference_type="messages",
        )
        mention_type = factory.Trait(
            item_type=InboxItemType.MENTION,
            reference_type="mentions",
            priority=InboxPriority.HIGH,
        )
        activity_type = factory.Trait(
            item_type=InboxItemType.ACTIVITY,
            reference_type="activity_logs",
        )


class LabelFactory(SQLAlchemyModelFactory):
    """Factory for creating Label instances."""

    class Meta:
        model = Label

    user_id = None  # Must be provided
    name = Sequence(lambda n: f"Label {n}")
    color = factory.Iterator(["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"])
