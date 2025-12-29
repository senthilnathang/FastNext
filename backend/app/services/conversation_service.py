"""Conversation service for managing user-to-user conversations

Provides business logic for conversations with inbox integration.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.models.conversation import (
    Conversation,
    ConversationMessage,
    ConversationParticipant,
)


class ConversationService:
    """Service for managing conversations between users."""

    def __init__(self, db: Session):
        self.db = db

    def get_user_conversations(
        self,
        user_id: int,
        include_muted: bool = True,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """
        Get conversations for a user.

        Returns conversations sorted by last message time.
        """
        query = self.db.query(ConversationParticipant).filter(
            ConversationParticipant.user_id == user_id,
            ConversationParticipant.is_active == True,
        )

        if not include_muted:
            query = query.filter(ConversationParticipant.is_muted == False)

        participants = query.all()

        # Get conversations with details
        conversations = []
        for participant in participants:
            conv = participant.conversation
            if conv:
                conv_dict = conv.to_dict(current_user_id=user_id)
                conv_dict["participant"] = participant.to_dict()
                conversations.append(conv_dict)

        # Sort by pinned first, then by last message time
        conversations.sort(
            key=lambda c: (
                not c.get("is_pinned", False),
                c.get("last_message_at") or "",
            ),
            reverse=True,
        )

        return conversations[offset:offset + limit]

    def get_conversation_with_messages(
        self,
        conversation_id: int,
        user_id: int,
        message_limit: int = 50,
        message_offset: int = 0,
    ) -> Optional[Dict[str, Any]]:
        """
        Get conversation with messages.

        Validates user is a participant.
        """
        conversation = self.db.query(Conversation).filter(
            Conversation.id == conversation_id
        ).first()

        if not conversation:
            return None

        # Check participation
        if not conversation.is_participant(user_id):
            return None

        conv_dict = conversation.to_dict(current_user_id=user_id)

        # Get messages
        messages = self.db.query(ConversationMessage).filter(
            ConversationMessage.conversation_id == conversation_id,
            ConversationMessage.is_deleted == False,
        ).order_by(
            ConversationMessage.created_at.desc()
        ).offset(message_offset).limit(message_limit).all()

        conv_dict["messages"] = [m.to_dict() for m in reversed(messages)]

        # Get participant info
        participants = []
        for p in conversation.participants:
            if p.is_active and p.user:
                participants.append({
                    "id": p.user.id,
                    "username": getattr(p.user, "username", None),
                    "full_name": getattr(p.user, "full_name", None),
                    "is_muted": p.is_muted,
                    "is_pinned": p.is_pinned,
                })
        conv_dict["participants_info"] = participants

        return conv_dict

    def find_or_create_conversation(
        self,
        user_id: int,
        participant_ids: List[int],
        subject: Optional[str] = None,
    ) -> Tuple[Conversation, bool]:
        """
        Find existing conversation or create new one.

        Returns (conversation, created).
        """
        # Ensure current user is in participants
        all_participants = list(set([user_id] + participant_ids))

        return Conversation.get_or_create(
            self.db,
            participant_ids=all_participants,
            subject=subject,
            created_by=user_id,
        )

    def send_message(
        self,
        conversation_id: int,
        user_id: int,
        body: str,
        body_html: Optional[str] = None,
        parent_id: Optional[int] = None,
        attachments: Optional[List[Dict]] = None,
    ) -> Optional[ConversationMessage]:
        """
        Send a message in a conversation.

        Updates unread counts for other participants.
        """
        conversation = self.db.query(Conversation).filter(
            Conversation.id == conversation_id
        ).first()

        if not conversation:
            return None

        # Verify participation
        if not conversation.is_participant(user_id):
            return None

        # Create message
        message = ConversationMessage.create(
            db=self.db,
            conversation_id=conversation_id,
            user_id=user_id,
            body=body,
            body_html=body_html,
            parent_id=parent_id,
            attachments=attachments,
        )

        # Update unread counts for other participants
        for participant in conversation.participants:
            if participant.user_id != user_id and participant.is_active:
                participant.increment_unread()

        self.db.commit()

        return message

    def start_conversation(
        self,
        user_id: int,
        recipient_ids: List[int],
        body: str,
        body_html: Optional[str] = None,
        subject: Optional[str] = None,
    ) -> Tuple[Conversation, ConversationMessage]:
        """
        Start a new conversation with an initial message.

        Returns (conversation, message).
        """
        conversation, _ = self.find_or_create_conversation(
            user_id=user_id,
            participant_ids=recipient_ids,
            subject=subject,
        )

        message = self.send_message(
            conversation_id=conversation.id,
            user_id=user_id,
            body=body,
            body_html=body_html,
        )

        return conversation, message

    def mark_as_read(
        self,
        conversation_id: int,
        user_id: int,
        message_id: Optional[int] = None,
    ) -> bool:
        """Mark conversation as read for user."""
        participant = self.db.query(ConversationParticipant).filter(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == user_id,
        ).first()

        if not participant:
            return False

        participant.mark_as_read(message_id)
        self.db.commit()
        return True

    def get_unread_count(self, user_id: int) -> int:
        """Get total unread message count for user."""
        result = self.db.query(ConversationParticipant).filter(
            ConversationParticipant.user_id == user_id,
            ConversationParticipant.is_active == True,
            ConversationParticipant.is_muted == False,
        ).all()

        return sum(p.unread_count for p in result)

    def mute_conversation(self, conversation_id: int, user_id: int) -> bool:
        """Mute notifications for a conversation."""
        participant = self.db.query(ConversationParticipant).filter(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == user_id,
        ).first()

        if not participant:
            return False

        participant.mute()
        self.db.commit()
        return True

    def unmute_conversation(self, conversation_id: int, user_id: int) -> bool:
        """Unmute notifications for a conversation."""
        participant = self.db.query(ConversationParticipant).filter(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == user_id,
        ).first()

        if not participant:
            return False

        participant.unmute()
        self.db.commit()
        return True

    def pin_conversation(self, conversation_id: int, user_id: int) -> bool:
        """Pin a conversation."""
        participant = self.db.query(ConversationParticipant).filter(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == user_id,
        ).first()

        if not participant:
            return False

        participant.pin()
        self.db.commit()
        return True

    def unpin_conversation(self, conversation_id: int, user_id: int) -> bool:
        """Unpin a conversation."""
        participant = self.db.query(ConversationParticipant).filter(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == user_id,
        ).first()

        if not participant:
            return False

        participant.unpin()
        self.db.commit()
        return True

    def leave_conversation(self, conversation_id: int, user_id: int) -> bool:
        """Leave a group conversation."""
        conversation = self.db.query(Conversation).filter(
            Conversation.id == conversation_id
        ).first()

        if not conversation or not conversation.is_group:
            return False

        participant = self.db.query(ConversationParticipant).filter(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == user_id,
        ).first()

        if not participant:
            return False

        participant.leave()
        self.db.commit()
        return True

    def delete_message(
        self,
        conversation_id: int,
        message_id: int,
        user_id: int,
    ) -> bool:
        """
        Soft delete a message.

        Only the author can delete their own messages.
        """
        message = self.db.query(ConversationMessage).filter(
            ConversationMessage.id == message_id,
            ConversationMessage.conversation_id == conversation_id,
            ConversationMessage.user_id == user_id,
        ).first()

        if not message:
            return False

        message.soft_delete()
        self.db.commit()
        return True

    def edit_message(
        self,
        conversation_id: int,
        message_id: int,
        user_id: int,
        body: str,
        body_html: Optional[str] = None,
    ) -> Optional[ConversationMessage]:
        """
        Edit a message.

        Only the author can edit their own messages.
        """
        message = self.db.query(ConversationMessage).filter(
            ConversationMessage.id == message_id,
            ConversationMessage.conversation_id == conversation_id,
            ConversationMessage.user_id == user_id,
        ).first()

        if not message:
            return None

        message.edit(body, body_html)
        self.db.commit()
        return message

    def get_participant_info(
        self,
        conversation_id: int,
        user_id: int,
    ) -> Optional[Dict[str, Any]]:
        """Get participant info for current user."""
        participant = self.db.query(ConversationParticipant).filter(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == user_id,
        ).first()

        if not participant:
            return None

        return participant.to_dict()


def get_conversation_service(db: Session) -> ConversationService:
    """Get a ConversationService instance."""
    return ConversationService(db)
