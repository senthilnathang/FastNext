"""
Message model for mail thread functionality.
Enables threaded messaging on any model that uses MailThreadMixin.
"""

import enum
import json
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    Index,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class MessageType(str, enum.Enum):
    """Types of messages"""
    COMMENT = "comment"
    NOTE = "note"
    SYSTEM = "system"
    NOTIFICATION = "notification"
    EMAIL = "email"
    LOG = "log"
    APPROVAL = "approval"
    REJECTION = "rejection"
    ASSIGNMENT = "assignment"


class MessageLevel(str, enum.Enum):
    """Message importance levels"""
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"
    DEBUG = "debug"


class Message(Base):
    """
    Message model for threaded communication.
    Can be attached to any model using MailThreadMixin.
    """

    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Link to the parent model
    model_name = Column(String(100), nullable=False, index=True)
    record_id = Column(Integer, nullable=False, index=True)

    # Message author
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Parent message for threading
    parent_id = Column(
        Integer,
        ForeignKey("messages.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # Message content
    subject = Column(String(255), nullable=True)
    body = Column(Text, nullable=False)
    body_html = Column(Text, nullable=True)  # HTML version if available

    # Message metadata
    message_type = Column(
        Enum(MessageType),
        default=MessageType.COMMENT,
        nullable=False,
        index=True,
    )
    level = Column(
        Enum(MessageLevel),
        default=MessageLevel.INFO,
        nullable=False,
    )

    # Attachments (JSON array of attachment info)
    attachments = Column(Text, nullable=True)

    # Read tracking
    is_internal = Column(Boolean, default=False, nullable=False)  # Internal note vs public
    is_pinned = Column(Boolean, default=False, nullable=False)

    # Archive tracking
    is_archived = Column(Boolean, default=False, nullable=False, index=True)
    archived_at = Column(DateTime(timezone=True), nullable=True)
    archived_by = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Extra metadata
    extra_data = Column(Text, nullable=True)  # JSON

    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
    updated_at = Column(
        DateTime(timezone=True),
        onupdate=func.now(),
        nullable=True,
    )

    # Relationships
    user = relationship("User", foreign_keys=[user_id], viewonly=True)
    parent = relationship("Message", remote_side=[id], backref="replies")
    reactions = relationship(
        "MessageReaction",
        back_populates="message",
        cascade="all, delete-orphan",
        lazy="select",
    )
    mentions = relationship(
        "Mention",
        back_populates="message",
        cascade="all, delete-orphan",
        lazy="select",
    )
    read_receipts = relationship(
        "MessageReadReceipt",
        cascade="all, delete-orphan",
        lazy="select",
    )

    # Composite indexes
    __table_args__ = (
        Index("ix_messages_model_record", "model_name", "record_id"),
        Index("ix_messages_thread", "model_name", "record_id", "parent_id"),
    )

    def __repr__(self):
        return f"<Message(id={self.id}, model='{self.model_name}', type='{self.message_type}')>"

    @property
    def is_thread_root(self) -> bool:
        """Check if this message is the root of a thread (has no parent)"""
        return self.parent_id is None

    @property
    def reply_count(self) -> int:
        """Get the number of direct replies to this message"""
        return len(self.replies) if self.replies else 0

    def get_all_replies_count(self, db) -> int:
        """Get total count of all replies (including nested) to this message"""
        from sqlalchemy import func
        # Use a recursive CTE for accurate count of all nested replies
        count = db.query(func.count(Message.id)).filter(
            Message.parent_id == self.id
        ).scalar()
        return count or 0

    def get_thread_participants(self, db) -> List[int]:
        """Get all unique user IDs who participated in this thread"""
        if not self.is_thread_root:
            # Find the root message first
            root = self.get_thread_root(db)
            if root:
                return root.get_thread_participants(db)
            return [self.user_id] if self.user_id else []

        # Get all user IDs from this thread
        from sqlalchemy import distinct
        user_ids = db.query(distinct(Message.user_id)).filter(
            Message.model_name == self.model_name,
            Message.record_id == self.record_id,
            Message.user_id.isnot(None),
        ).all()
        return [uid[0] for uid in user_ids]

    def get_thread_root(self, db) -> Optional["Message"]:
        """Get the root message of this thread"""
        if self.is_thread_root:
            return self
        if self.parent_id:
            parent = db.query(Message).filter(Message.id == self.parent_id).first()
            if parent:
                return parent.get_thread_root(db)
        return None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses"""
        return {
            "id": self.id,
            "model_name": self.model_name,
            "record_id": self.record_id,
            "user_id": self.user_id,
            "parent_id": self.parent_id,
            "subject": self.subject,
            "body": self.body,
            "message_type": self.message_type.value if self.message_type else None,
            "level": self.level.value if self.level else None,
            "is_internal": self.is_internal,
            "is_pinned": self.is_pinned,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "attachments": json.loads(self.attachments) if self.attachments else [],
            "extra_data": json.loads(self.extra_data) if self.extra_data else {},
        }

    @classmethod
    def create(
        cls,
        db,
        model_name: str,
        record_id: int,
        user_id: int,
        body: str,
        subject: str = None,
        body_html: str = None,
        message_type: str = "comment",
        level: str = "info",
        parent_id: int = None,
        is_internal: bool = False,
        attachments: List[Dict] = None,
        extra_data: Dict = None,
        auto_flush: bool = True,
    ):
        """Create a new message

        Args:
            auto_flush: Whether to flush after adding. Set to False when called from event handlers.
        """
        # Convert string to enum if needed
        msg_type = MessageType(message_type) if isinstance(message_type, str) else message_type
        msg_level = MessageLevel(level) if isinstance(level, str) else level

        message = cls(
            model_name=model_name,
            record_id=record_id,
            user_id=user_id,
            parent_id=parent_id,
            subject=subject,
            body=body,
            body_html=body_html,
            message_type=msg_type,
            level=msg_level,
            is_internal=is_internal,
            attachments=json.dumps(attachments) if attachments else None,
            extra_data=json.dumps(extra_data, default=str) if extra_data else None,
        )
        db.add(message)
        if auto_flush:
            db.flush()
        return message

    @classmethod
    def get_thread(
        cls,
        db,
        model_name: str,
        record_id: int,
        include_internal: bool = True,
        limit: int = 100,
    ):
        """Get all messages for a model record"""
        query = db.query(cls).filter(
            cls.model_name == model_name,
            cls.record_id == record_id,
        )
        if not include_internal:
            query = query.filter(cls.is_internal == False)
        return query.order_by(cls.created_at.asc()).limit(limit).all()

    @classmethod
    def get_replies(cls, db, message_id: int, limit: int = 50):
        """Get replies to a message"""
        return (
            db.query(cls)
            .filter(cls.parent_id == message_id)
            .order_by(cls.created_at.asc())
            .limit(limit)
            .all()
        )

    @classmethod
    def get_pinned(cls, db, model_name: str, record_id: int):
        """Get pinned messages for a record"""
        return (
            db.query(cls)
            .filter(
                cls.model_name == model_name,
                cls.record_id == record_id,
                cls.is_pinned == True,
            )
            .order_by(cls.created_at.desc())
            .all()
        )

    def add_attachment(self, attachment_info: Dict) -> None:
        """Add an attachment to the message"""
        attachments = json.loads(self.attachments) if self.attachments else []
        attachments.append(attachment_info)
        self.attachments = json.dumps(attachments)

    def pin(self) -> None:
        """Pin the message"""
        self.is_pinned = True

    def unpin(self) -> None:
        """Unpin the message"""
        self.is_pinned = False

    def archive(self, user_id: Optional[int] = None) -> None:
        """Archive the message"""
        from datetime import datetime
        self.is_archived = True
        self.archived_at = datetime.utcnow()
        if user_id:
            self.archived_by = user_id

    def unarchive(self) -> None:
        """Unarchive the message"""
        self.is_archived = False
        self.archived_at = None
        self.archived_by = None
