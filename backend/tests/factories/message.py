"""
Message, Conversation, Mention, and Reaction factories for testing.
"""

import factory
from factory import Sequence, LazyFunction

from app.models.message import Message, MessageType, MessageLevel
from app.models.conversation import Conversation, ConversationParticipant
from app.models.mention import Mention
from app.models.reaction import MessageReaction
from tests.factories.base import SQLAlchemyModelFactory


class MessageFactory(SQLAlchemyModelFactory):
    """Factory for creating Message instances."""

    class Meta:
        model = Message

    model_name = "test_model"
    record_id = Sequence(lambda n: n + 1)
    user_id = None  # Must be provided

    subject = factory.Faker("sentence", nb_words=5)
    body = factory.Faker("paragraph")
    body_html = None  # Auto-generate if needed

    message_type = MessageType.COMMENT
    level = MessageLevel.INFO

    attachments = LazyFunction(list)
    is_internal = False
    is_pinned = False
    is_archived = False
    is_edited = False
    is_deleted = False
    extra_data = None

    class Params:
        """Traits for message configurations."""

        internal = factory.Trait(is_internal=True)
        pinned = factory.Trait(is_pinned=True)
        system = factory.Trait(
            message_type=MessageType.SYSTEM,
            is_internal=True,
        )
        with_attachment = factory.Trait(
            attachments=LazyFunction(
                lambda: [
                    {
                        "name": "test.pdf",
                        "type": "application/pdf",
                        "size": 12345,
                        "url": "/uploads/test.pdf",
                    }
                ]
            )
        )


class ConversationFactory(SQLAlchemyModelFactory):
    """Factory for creating Conversation instances."""

    class Meta:
        model = Conversation

    title = factory.Faker("sentence", nb_words=4)
    is_group = False
    is_archived = False
    created_by = None  # Must be provided


class ConversationParticipantFactory(SQLAlchemyModelFactory):
    """Factory for creating ConversationParticipant instances."""

    class Meta:
        model = ConversationParticipant

    conversation_id = None  # Must be provided
    user_id = None  # Must be provided
    is_admin = False


class MentionFactory(SQLAlchemyModelFactory):
    """Factory for creating Mention instances."""

    class Meta:
        model = Mention

    message_id = None  # Must be provided
    user_id = None  # Must be provided


class MessageReactionFactory(SQLAlchemyModelFactory):
    """Factory for creating MessageReaction instances."""

    class Meta:
        model = MessageReaction

    message_id = None  # Must be provided
    user_id = None  # Must be provided
    emoji = factory.Iterator(["👍", "❤️", "😊", "🎉", "👀", "🔥"])
