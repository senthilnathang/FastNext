"""Conversation models for user-to-user messaging

Provides direct messaging between users with support for:
- 1-on-1 conversations
- Group conversations
- Read tracking per participant
- Message threading within conversations
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship, Session
from sqlalchemy.sql import func

from app.db.base import Base


class Conversation(Base):
    """
    Represents a conversation between users.

    Can be 1-on-1 or group chat (3+ participants).
    Tracks last message for preview in conversation list.
    """
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)

    # Conversation metadata
    subject = Column(String(500), nullable=True)
    is_group = Column(Boolean, nullable=False, default=False)

    # Last message tracking for list preview
    last_message_at = Column(DateTime(timezone=True), nullable=True)
    last_message_preview = Column(String(500), nullable=True)
    last_message_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Creator tracking
    created_by = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        onupdate=func.now(),
        nullable=True,
    )

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

    creator = relationship(
        "User",
        foreign_keys=[created_by],
        lazy="select",
    )

    last_message_user = relationship(
        "User",
        foreign_keys=[last_message_user_id],
        lazy="select",
    )

    def get_participant_ids(self) -> List[int]:
        """Get list of active participant user IDs"""
        return [p.user_id for p in self.participants if p.is_active]

    def get_other_participants(self, user_id: int) -> List["ConversationParticipant"]:
        """Get all participants except the given user"""
        return [p for p in self.participants if p.user_id != user_id and p.is_active]

    def is_participant(self, user_id: int) -> bool:
        """Check if user is an active participant"""
        return user_id in self.get_participant_ids()

    def update_last_message(self, message: "ConversationMessage") -> None:
        """Update the conversation's last message info"""
        self.last_message_at = message.created_at
        self.last_message_preview = (message.body[:200] if message.body else "")
        self.last_message_user_id = message.user_id

    @classmethod
    def find_existing(
        cls,
        db: Session,
        participant_ids: List[int],
    ) -> Optional["Conversation"]:
        """Find existing conversation with exact participants"""
        # For 1-on-1, look for non-group conversation
        if len(participant_ids) == 2:
            # Find conversations where both users are participants
            conversations = db.query(cls).filter(
                cls.is_group == False,
            ).all()

            for conv in conversations:
                conv_participant_ids = set(conv.get_participant_ids())
                if conv_participant_ids == set(participant_ids):
                    return conv

        return None

    @classmethod
    def create(
        cls,
        db: Session,
        participant_ids: List[int],
        subject: Optional[str] = None,
        created_by: Optional[int] = None,
    ) -> "Conversation":
        """Create a new conversation with participants"""
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
            )
            db.add(participant)

        db.flush()
        return conversation

    @classmethod
    def get_or_create(
        cls,
        db: Session,
        participant_ids: List[int],
        subject: Optional[str] = None,
        created_by: Optional[int] = None,
    ) -> tuple["Conversation", bool]:
        """Find existing or create new conversation. Returns (conversation, created)."""
        existing = cls.find_existing(db, participant_ids)
        if existing:
            return existing, False

        return cls.create(db, participant_ids, subject, created_by), True

    def to_dict(self, current_user_id: Optional[int] = None) -> Dict[str, Any]:
        """Convert to dictionary for API response"""
        data = {
            "id": self.id,
            "subject": self.subject,
            "is_group": self.is_group,
            "last_message_at": self.last_message_at.isoformat() if self.last_message_at else None,
            "last_message_preview": self.last_message_preview,
            "last_message_user_id": self.last_message_user_id,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "participant_ids": self.get_participant_ids(),
        }

        # Include current user's participant info if provided
        if current_user_id:
            for p in self.participants:
                if p.user_id == current_user_id:
                    data["unread_count"] = p.unread_count
                    data["is_muted"] = p.is_muted
                    data["is_pinned"] = p.is_pinned
                    break

        return data


class ConversationParticipant(Base):
    """
    Tracks user participation in a conversation.

    Each user has their own read position, mute settings, etc.
    """
    __tablename__ = "conversation_participants"

    id = Column(Integer, primary_key=True, index=True)

    conversation_id = Column(
        Integer,
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Participation status
    is_active = Column(Boolean, nullable=False, default=True)
    is_muted = Column(Boolean, nullable=False, default=False)
    is_pinned = Column(Boolean, nullable=False, default=False)

    # Read tracking
    last_read_at = Column(DateTime(timezone=True), nullable=True)
    last_read_message_id = Column(Integer, nullable=True)
    unread_count = Column(Integer, nullable=False, default=0)

    # Timestamps
    joined_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    left_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    conversation = relationship(
        "Conversation",
        back_populates="participants",
    )

    user = relationship(
        "User",
        lazy="select",
    )

    # Constraints
    __table_args__ = (
        UniqueConstraint("conversation_id", "user_id", name="uq_conversation_participant"),
        Index("idx_participant_conversation", "conversation_id"),
        Index("idx_participant_user", "user_id"),
    )

    def mark_as_read(self, message_id: Optional[int] = None) -> None:
        """Mark conversation as read up to the given message"""
        self.last_read_at = datetime.utcnow()
        if message_id:
            self.last_read_message_id = message_id
        self.unread_count = 0

    def increment_unread(self) -> None:
        """Increment unread count"""
        self.unread_count = (self.unread_count or 0) + 1

    def mute(self) -> None:
        """Mute notifications for this conversation"""
        self.is_muted = True

    def unmute(self) -> None:
        """Unmute notifications"""
        self.is_muted = False

    def pin(self) -> None:
        """Pin this conversation"""
        self.is_pinned = True

    def unpin(self) -> None:
        """Unpin this conversation"""
        self.is_pinned = False

    def leave(self) -> None:
        """Leave the conversation"""
        self.is_active = False
        self.left_at = datetime.utcnow()

    def rejoin(self) -> None:
        """Rejoin a left conversation"""
        self.is_active = True
        self.left_at = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "id": self.id,
            "conversation_id": self.conversation_id,
            "user_id": self.user_id,
            "is_active": self.is_active,
            "is_muted": self.is_muted,
            "is_pinned": self.is_pinned,
            "last_read_at": self.last_read_at.isoformat() if self.last_read_at else None,
            "last_read_message_id": self.last_read_message_id,
            "unread_count": self.unread_count,
            "joined_at": self.joined_at.isoformat() if self.joined_at else None,
        }


class ConversationMessage(Base):
    """
    Message within a conversation.

    Supports threading via parent_id and soft deletion.
    """
    __tablename__ = "conversation_messages"

    id = Column(Integer, primary_key=True, index=True)

    conversation_id = Column(
        Integer,
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Threading support
    parent_id = Column(
        Integer,
        ForeignKey("conversation_messages.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Content
    body = Column(Text, nullable=True)
    body_html = Column(Text, nullable=True)

    # Attachments stored as JSON array
    attachments = Column(JSONB, nullable=False, default=list)

    # Edit tracking
    is_edited = Column(Boolean, nullable=False, default=False)
    edited_at = Column(DateTime(timezone=True), nullable=True)

    # Soft delete
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        onupdate=func.now(),
        nullable=True,
    )

    # Relationships
    conversation = relationship(
        "Conversation",
        back_populates="messages",
    )

    user = relationship(
        "User",
        lazy="select",
    )

    parent = relationship(
        "ConversationMessage",
        remote_side=[id],
        foreign_keys=[parent_id],
        backref="replies",
        lazy="select",
    )

    # Indexes
    __table_args__ = (
        Index("idx_conv_message_conversation", "conversation_id"),
        Index("idx_conv_message_user", "user_id"),
        Index("idx_conv_message_parent", "parent_id"),
        Index("idx_conv_message_created", "created_at"),
    )

    @classmethod
    def create(
        cls,
        db: Session,
        conversation_id: int,
        user_id: int,
        body: str,
        body_html: Optional[str] = None,
        parent_id: Optional[int] = None,
        attachments: Optional[List[Dict]] = None,
    ) -> "ConversationMessage":
        """Create a new message in a conversation"""
        message = cls(
            conversation_id=conversation_id,
            user_id=user_id,
            body=body,
            body_html=body_html,
            parent_id=parent_id,
            attachments=attachments or [],
        )
        db.add(message)
        db.flush()

        # Update conversation's last message
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id
        ).first()
        if conversation:
            conversation.update_last_message(message)

        return message

    def edit(self, body: str, body_html: Optional[str] = None) -> None:
        """Edit the message content"""
        self.body = body
        if body_html is not None:
            self.body_html = body_html
        self.is_edited = True
        self.edited_at = datetime.utcnow()

    def soft_delete(self) -> None:
        """Soft delete the message"""
        self.is_deleted = True
        self.deleted_at = datetime.utcnow()

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        data = {
            "id": self.id,
            "conversation_id": self.conversation_id,
            "user_id": self.user_id,
            "parent_id": self.parent_id,
            "body": self.body,
            "body_html": self.body_html,
            "attachments": self.attachments,
            "is_edited": self.is_edited,
            "edited_at": self.edited_at.isoformat() if self.edited_at else None,
            "is_deleted": self.is_deleted,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

        # Include user info if loaded
        if self.user:
            data["user"] = {
                "id": self.user.id,
                "username": getattr(self.user, "username", None),
                "full_name": getattr(self.user, "full_name", None),
            }

        return data
