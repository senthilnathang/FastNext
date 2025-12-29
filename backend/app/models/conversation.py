"""
Conversation model for threaded messaging between users.
Groups messages into conversations for chat/mail thread functionality.
"""

from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    Index,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.models.base import BaseModel


class Conversation(BaseModel):
    """
    Conversation/Thread model for grouping messages between users.

    A conversation represents a message thread between two or more participants.
    All messages in a conversation are grouped together for easy viewing.

    Attributes:
        subject: Optional subject/title for the conversation
        is_group: Whether this is a group conversation (3+ participants)
        last_message_at: Timestamp of the last message (for sorting)
        last_message_preview: Preview of the last message
        created_by: User who started the conversation
    """

    __tablename__ = "conversations"

    # Conversation metadata
    subject = Column(String(255), nullable=True)
    is_group = Column(Boolean, default=False, nullable=False)

    # For quick sorting and preview
    last_message_at = Column(DateTime(timezone=True), nullable=True, index=True)
    last_message_preview = Column(String(500), nullable=True)
    last_message_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Creator
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    participants = relationship(
        "ConversationParticipant",
        back_populates="conversation",
        cascade="all, delete-orphan",
        lazy="select",
    )
    messages = relationship(
        "ConversationMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="ConversationMessage.created_at",
        lazy="select",
    )
    creator = relationship("User", foreign_keys=[created_by], lazy="select")
    last_message_user = relationship("User", foreign_keys=[last_message_user_id], lazy="select")

    def __repr__(self):
        return f"<Conversation(id={self.id}, subject='{self.subject}')>"

    def get_participant_ids(self) -> List[int]:
        """Get list of participant user IDs"""
        return [p.user_id for p in self.participants if p.is_active]

    def get_other_participants(self, user_id: int) -> List["ConversationParticipant"]:
        """Get all participants except the given user"""
        return [p for p in self.participants if p.user_id != user_id and p.is_active]

    def is_participant(self, user_id: int) -> bool:
        """Check if a user is a participant in this conversation"""
        return any(p.user_id == user_id and p.is_active for p in self.participants)

    def update_last_message(self, message: "ConversationMessage"):
        """Update the last message info for sorting/preview"""
        self.last_message_at = message.created_at
        self.last_message_preview = message.body[:500] if message.body else None
        self.last_message_user_id = message.user_id

    @classmethod
    def find_existing(cls, db, participant_ids: List[int]) -> Optional["Conversation"]:
        """
        Find an existing conversation with exactly these participants.
        Used to avoid creating duplicate conversations.
        """
        from sqlalchemy import func as sqlfunc

        # Sort IDs for consistent matching
        sorted_ids = sorted(participant_ids)

        # Find conversations where all participants match
        # This uses a subquery to count matching participants
        from app.models.conversation import ConversationParticipant

        # Get conversations that have ALL the specified participants
        subquery = db.query(
            ConversationParticipant.conversation_id,
            sqlfunc.count(ConversationParticipant.user_id).label('count')
        ).filter(
            ConversationParticipant.user_id.in_(sorted_ids),
            ConversationParticipant.is_active == True,
        ).group_by(
            ConversationParticipant.conversation_id
        ).having(
            sqlfunc.count(ConversationParticipant.user_id) == len(sorted_ids)
        ).subquery()

        # Also check that conversation has ONLY these participants (not more)
        conversation = db.query(cls).join(
            subquery, cls.id == subquery.c.conversation_id
        ).filter(
            cls.is_group == (len(sorted_ids) > 2)
        ).first()

        if conversation:
            # Verify exact participant count
            active_count = sum(1 for p in conversation.participants if p.is_active)
            if active_count == len(sorted_ids):
                return conversation

        return None

    @classmethod
    def create(
        cls,
        db,
        participant_ids: List[int],
        subject: str = None,
        created_by: int = None,
    ) -> "Conversation":
        """Create a new conversation with the given participants"""
        is_group = len(participant_ids) > 2

        conversation = cls(
            subject=subject,
            is_group=is_group,
            created_by=created_by,
        )
        db.add(conversation)
        db.flush()

        # Add participants
        for user_id in participant_ids:
            participant = ConversationParticipant(
                conversation_id=conversation.id,
                user_id=user_id,
                is_active=True,
            )
            db.add(participant)

        db.flush()
        return conversation

    @classmethod
    def get_or_create(
        cls,
        db,
        participant_ids: List[int],
        subject: str = None,
        created_by: int = None,
    ) -> tuple["Conversation", bool]:
        """
        Get existing conversation or create new one.
        Returns (conversation, created) tuple.
        """
        # Try to find existing conversation
        existing = cls.find_existing(db, participant_ids)
        if existing:
            return existing, False

        # Create new conversation
        conversation = cls.create(db, participant_ids, subject, created_by)
        return conversation, True


class ConversationParticipant(BaseModel):
    """
    Participant in a conversation.
    Tracks per-user settings like mute, last read, etc.
    """

    __tablename__ = "conversation_participants"

    conversation_id = Column(
        Integer,
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Participant status
    is_active = Column(Boolean, default=True, nullable=False)  # For leaving conversations
    is_muted = Column(Boolean, default=False, nullable=False)
    is_pinned = Column(Boolean, default=False, nullable=False)

    # Read tracking
    last_read_at = Column(DateTime(timezone=True), nullable=True)
    last_read_message_id = Column(Integer, ForeignKey("conversation_messages.id", ondelete="SET NULL"), nullable=True)
    unread_count = Column(Integer, default=0, nullable=False)

    # Relationships
    conversation = relationship("Conversation", back_populates="participants")
    user = relationship("User", lazy="select")

    __table_args__ = (
        UniqueConstraint("conversation_id", "user_id", name="uq_conversation_participant"),
        Index("ix_conversation_participant_user", "user_id", "is_active"),
    )

    def __repr__(self):
        return f"<ConversationParticipant(conversation={self.conversation_id}, user={self.user_id})>"

    def mark_as_read(self, message_id: int = None):
        """Mark conversation as read up to the given message"""
        self.last_read_at = datetime.utcnow()
        if message_id:
            self.last_read_message_id = message_id
        self.unread_count = 0

    def increment_unread(self):
        """Increment unread count (called when new message received)"""
        self.unread_count = (self.unread_count or 0) + 1


class ConversationMessage(BaseModel):
    """
    Message within a conversation.
    Similar to Message model but specifically for user-to-user conversations.
    """

    __tablename__ = "conversation_messages"

    conversation_id = Column(
        Integer,
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Reply to another message in the conversation
    parent_id = Column(
        Integer,
        ForeignKey("conversation_messages.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Message content
    body = Column(Text, nullable=False)
    body_html = Column(Text, nullable=True)

    # Attachments (JSON array)
    attachments = Column(Text, nullable=True)

    # Status
    is_edited = Column(Boolean, default=False, nullable=False)
    edited_at = Column(DateTime(timezone=True), nullable=True)
    is_deleted = Column(Boolean, default=False, nullable=False)  # Soft delete

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
    user = relationship("User", lazy="select")
    parent = relationship("ConversationMessage", remote_side="ConversationMessage.id", lazy="select")
    reactions = relationship(
        "MessageReaction",
        primaryjoin="and_(ConversationMessage.id==foreign(MessageReaction.message_id), "
                    "MessageReaction.message_id.isnot(None))",
        lazy="select",
        viewonly=True,
    )

    __table_args__ = (
        Index("ix_conversation_message_thread", "conversation_id", "created_at"),
    )

    def __repr__(self):
        return f"<ConversationMessage(id={self.id}, conversation={self.conversation_id})>"

    @property
    def is_reply(self) -> bool:
        """Check if this message is a reply to another"""
        return self.parent_id is not None

    def edit(self, new_body: str, new_body_html: str = None):
        """Edit the message content"""
        self.body = new_body
        self.body_html = new_body_html
        self.is_edited = True
        self.edited_at = datetime.utcnow()

    def soft_delete(self):
        """Soft delete the message"""
        self.is_deleted = True
        self.body = "[Message deleted]"
        self.body_html = None
        self.attachments = None
