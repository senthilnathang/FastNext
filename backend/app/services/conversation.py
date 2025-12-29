"""
Conversation service for managing threaded messaging between users.
"""

import json
from datetime import datetime
from typing import List, Optional, Dict, Any

from sqlalchemy import desc, or_, and_
from sqlalchemy.orm import Session, joinedload

from app.models.conversation import Conversation, ConversationParticipant, ConversationMessage
from app.models.inbox import InboxItem, InboxItemType, InboxPriority
from app.services.base import BaseService


class ConversationService(BaseService[Conversation]):
    """Service for managing conversations"""

    def __init__(self, db: Session):
        super().__init__(db, Conversation)

    def get_user_conversations(
        self,
        user_id: int,
        include_muted: bool = True,
        include_archived: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Conversation]:
        """
        Get all conversations for a user, sorted by last message time.
        """
        query = self.db.query(Conversation).join(
            ConversationParticipant
        ).filter(
            ConversationParticipant.user_id == user_id,
            ConversationParticipant.is_active == True,
        )

        if not include_muted:
            query = query.filter(ConversationParticipant.is_muted == False)

        query = query.options(
            joinedload(Conversation.participants).joinedload(ConversationParticipant.user),
            joinedload(Conversation.last_message_user),
        ).order_by(
            desc(Conversation.last_message_at.isnot(None)),
            desc(Conversation.last_message_at),
            desc(Conversation.created_at),
        )

        return query.offset(offset).limit(limit).all()

    def get_conversation_with_messages(
        self,
        conversation_id: int,
        user_id: int,
        message_limit: int = 100,
        before_message_id: int = None,
    ) -> Optional[Conversation]:
        """
        Get a conversation with its messages.
        Validates that the user is a participant.
        """
        conversation = self.db.query(Conversation).options(
            joinedload(Conversation.participants).joinedload(ConversationParticipant.user),
        ).filter(Conversation.id == conversation_id).first()

        if not conversation:
            return None

        # Verify user is a participant
        if not conversation.is_participant(user_id):
            return None

        # Load messages
        message_query = self.db.query(ConversationMessage).filter(
            ConversationMessage.conversation_id == conversation_id,
            ConversationMessage.is_deleted == False,
        ).options(
            joinedload(ConversationMessage.user),
        ).order_by(desc(ConversationMessage.created_at))

        if before_message_id:
            message_query = message_query.filter(
                ConversationMessage.id < before_message_id
            )

        messages = message_query.limit(message_limit).all()
        # Reverse to get chronological order
        conversation.messages = list(reversed(messages))

        return conversation

    def find_or_create_conversation(
        self,
        participant_ids: List[int],
        subject: str = None,
        created_by: int = None,
    ) -> tuple[Conversation, bool]:
        """
        Find existing conversation between participants or create new one.
        Returns (conversation, created) tuple.
        """
        return Conversation.get_or_create(
            self.db,
            participant_ids=participant_ids,
            subject=subject,
            created_by=created_by,
        )

    def send_message(
        self,
        conversation_id: int,
        user_id: int,
        body: str,
        body_html: str = None,
        parent_id: int = None,
        attachments: List[Dict] = None,
    ) -> Optional[ConversationMessage]:
        """
        Send a message in a conversation.
        Creates inbox items for other participants.
        """
        # Get conversation and verify participation
        conversation = self.db.query(Conversation).options(
            joinedload(Conversation.participants)
        ).filter(Conversation.id == conversation_id).first()

        if not conversation:
            return None

        if not conversation.is_participant(user_id):
            return None

        # Create the message
        message = ConversationMessage(
            conversation_id=conversation_id,
            user_id=user_id,
            body=body,
            body_html=body_html,
            parent_id=parent_id,
            attachments=json.dumps(attachments) if attachments else None,
        )
        self.db.add(message)
        self.db.flush()

        # Update conversation's last message info
        conversation.update_last_message(message)

        # Update unread counts for other participants and create inbox items
        for participant in conversation.participants:
            if participant.user_id != user_id and participant.is_active:
                participant.increment_unread()

                # Create inbox item for the recipient
                self._create_inbox_item(
                    recipient_id=participant.user_id,
                    conversation=conversation,
                    message=message,
                    sender_id=user_id,
                )

        self.db.flush()
        return message

    def _create_inbox_item(
        self,
        recipient_id: int,
        conversation: Conversation,
        message: ConversationMessage,
        sender_id: int,
    ):
        """Create an inbox item for a new message"""
        # Get sender info for the title
        from app.models.user import User
        sender = self.db.query(User).filter(User.id == sender_id).first()
        sender_name = sender.full_name if sender else "Someone"

        # Determine title
        if conversation.is_group:
            title = f"New message in group: {conversation.subject or 'Group Chat'}"
        else:
            title = f"Message from {sender_name}"

        # Check if there's already an unread inbox item for this conversation
        existing_item = self.db.query(InboxItem).filter(
            InboxItem.user_id == recipient_id,
            InboxItem.reference_type == "conversations",
            InboxItem.reference_id == conversation.id,
            InboxItem.is_read == False,
            InboxItem.is_archived == False,
        ).first()

        if existing_item:
            # Update existing item
            existing_item.title = title
            existing_item.preview = message.body[:500] if message.body else None
            existing_item.created_at = datetime.utcnow()
        else:
            # Create new inbox item
            InboxItem.create(
                db=self.db,
                user_id=recipient_id,
                item_type=InboxItemType.MESSAGE,
                reference_type="conversations",
                reference_id=conversation.id,
                title=title,
                preview=message.body[:200] if message.body else None,
                source_model="conversation_messages",
                source_id=message.id,
                priority=InboxPriority.NORMAL,
                actor_id=sender_id,
            )

    def start_conversation(
        self,
        sender_id: int,
        recipient_ids: List[int],
        body: str,
        subject: str = None,
        body_html: str = None,
        attachments: List[Dict] = None,
    ) -> tuple[Conversation, ConversationMessage]:
        """
        Start a new conversation or continue existing one.
        Convenience method that combines find/create conversation + send message.
        """
        # Include sender in participants
        all_participants = list(set([sender_id] + recipient_ids))

        # Find or create conversation
        conversation, created = self.find_or_create_conversation(
            participant_ids=all_participants,
            subject=subject,
            created_by=sender_id,
        )

        # Send the message
        message = self.send_message(
            conversation_id=conversation.id,
            user_id=sender_id,
            body=body,
            body_html=body_html,
            attachments=attachments,
        )

        return conversation, message

    def mark_as_read(
        self,
        conversation_id: int,
        user_id: int,
        message_id: int = None,
    ) -> bool:
        """Mark conversation as read for a user"""
        participant = self.db.query(ConversationParticipant).filter(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == user_id,
        ).first()

        if not participant:
            return False

        # Get the latest message ID if not provided
        if not message_id:
            latest = self.db.query(ConversationMessage).filter(
                ConversationMessage.conversation_id == conversation_id
            ).order_by(desc(ConversationMessage.id)).first()
            message_id = latest.id if latest else None

        participant.mark_as_read(message_id)

        # Also mark inbox items as read
        self.db.query(InboxItem).filter(
            InboxItem.user_id == user_id,
            InboxItem.reference_type == "conversations",
            InboxItem.reference_id == conversation_id,
            InboxItem.is_read == False,
        ).update({"is_read": True})

        self.db.flush()
        return True

    def get_unread_count(self, user_id: int) -> int:
        """Get total unread conversation count for a user"""
        result = self.db.query(ConversationParticipant).filter(
            ConversationParticipant.user_id == user_id,
            ConversationParticipant.is_active == True,
            ConversationParticipant.unread_count > 0,
        ).count()
        return result

    def mute_conversation(self, conversation_id: int, user_id: int) -> bool:
        """Mute a conversation for a user"""
        participant = self.db.query(ConversationParticipant).filter(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == user_id,
        ).first()

        if not participant:
            return False

        participant.is_muted = True
        self.db.flush()
        return True

    def unmute_conversation(self, conversation_id: int, user_id: int) -> bool:
        """Unmute a conversation for a user"""
        participant = self.db.query(ConversationParticipant).filter(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == user_id,
        ).first()

        if not participant:
            return False

        participant.is_muted = False
        self.db.flush()
        return True

    def pin_conversation(self, conversation_id: int, user_id: int) -> bool:
        """Pin a conversation for a user"""
        participant = self.db.query(ConversationParticipant).filter(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == user_id,
        ).first()

        if not participant:
            return False

        participant.is_pinned = True
        self.db.flush()
        return True

    def unpin_conversation(self, conversation_id: int, user_id: int) -> bool:
        """Unpin a conversation for a user"""
        participant = self.db.query(ConversationParticipant).filter(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == user_id,
        ).first()

        if not participant:
            return False

        participant.is_pinned = False
        self.db.flush()
        return True

    def leave_conversation(self, conversation_id: int, user_id: int) -> bool:
        """
        Leave a group conversation.
        For 1-on-1 conversations, this archives it instead.
        """
        conversation = self.db.query(Conversation).options(
            joinedload(Conversation.participants)
        ).filter(Conversation.id == conversation_id).first()

        if not conversation:
            return False

        participant = next(
            (p for p in conversation.participants if p.user_id == user_id),
            None
        )

        if not participant:
            return False

        if conversation.is_group:
            # For group chats, mark as inactive (left)
            participant.is_active = False
        else:
            # For 1-on-1, just archive
            # We don't actually remove the participant
            pass

        self.db.flush()
        return True

    def delete_message(
        self,
        message_id: int,
        user_id: int,
    ) -> bool:
        """
        Soft delete a message.
        Only the message author can delete it.
        """
        message = self.db.query(ConversationMessage).filter(
            ConversationMessage.id == message_id,
            ConversationMessage.user_id == user_id,
        ).first()

        if not message:
            return False

        message.soft_delete()
        self.db.flush()
        return True

    def edit_message(
        self,
        message_id: int,
        user_id: int,
        new_body: str,
        new_body_html: str = None,
    ) -> Optional[ConversationMessage]:
        """
        Edit a message.
        Only the message author can edit it.
        """
        message = self.db.query(ConversationMessage).filter(
            ConversationMessage.id == message_id,
            ConversationMessage.user_id == user_id,
            ConversationMessage.is_deleted == False,
        ).first()

        if not message:
            return None

        message.edit(new_body, new_body_html)
        self.db.flush()
        return message

    def get_participant_info(
        self,
        conversation_id: int,
        user_id: int,
    ) -> Optional[ConversationParticipant]:
        """Get participant info for a user in a conversation"""
        return self.db.query(ConversationParticipant).filter(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == user_id,
        ).first()
