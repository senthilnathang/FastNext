"""Message model for mail thread functionality

Enables threaded messaging on any model using MailThreadMixin.
Supports threaded replies, reactions, mentions, and read receipts.
"""

import enum
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship, Session
from sqlalchemy.sql import func

from app.db.base import Base


class MessageType(str, enum.Enum):
    """Type of message"""
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
    """Priority/importance level of message"""
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"
    DEBUG = "debug"


class Message(Base):
    """
    Message model for threaded discussions on any record.

    Similar to mail.message in Odoo/ERPNext but simplified.
    Links to parent model via model_name and record_id.
    """
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)

    # Link to parent model (polymorphic)
    model_name = Column(String(128), nullable=False, index=True)
    record_id = Column(Integer, nullable=False, index=True)

    # Author
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Threading - parent message for replies
    parent_id = Column(Integer, ForeignKey("messages.id", ondelete="SET NULL"), nullable=True)

    # Content
    subject = Column(String(500), nullable=True)
    body = Column(Text, nullable=True)
    body_html = Column(Text, nullable=True)

    # Message metadata
    message_type = Column(
        Enum(MessageType),
        nullable=False,
        default=MessageType.COMMENT,
    )
    level = Column(
        Enum(MessageLevel),
        nullable=False,
        default=MessageLevel.INFO,
    )

    # Attachments stored as JSON array
    attachments = Column(JSONB, nullable=False, default=list)

    # Flags
    is_internal = Column(Boolean, nullable=False, default=False)
    is_pinned = Column(Boolean, nullable=False, default=False)
    is_archived = Column(Boolean, nullable=False, default=False)
    is_edited = Column(Boolean, nullable=False, default=False)
    is_deleted = Column(Boolean, nullable=False, default=False)

    # Edit tracking
    edited_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Extra metadata
    extra_data = Column(JSONB, nullable=True)

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
    user = relationship(
        "User",
        foreign_keys=[user_id],
        backref="messages",
        lazy="select",
    )

    parent = relationship(
        "Message",
        remote_side=[id],
        foreign_keys=[parent_id],
        backref="replies",
        lazy="select",
    )

    # Composite indexes for efficient queries
    __table_args__ = (
        Index("idx_messages_model_record", "model_name", "record_id"),
        Index("idx_messages_model_record_parent", "model_name", "record_id", "parent_id"),
        Index("idx_messages_user_id", "user_id"),
        Index("idx_messages_parent_id", "parent_id"),
        Index("idx_messages_created_at", "created_at"),
    )

    @property
    def is_thread_root(self) -> bool:
        """Check if this message is a thread root (no parent)"""
        return self.parent_id is None

    @property
    def reply_count(self) -> int:
        """Get count of direct replies"""
        return len(self.replies) if self.replies else 0

    def get_all_replies_count(self, db: Session) -> int:
        """Get count of all nested replies"""
        count = db.query(Message).filter(
            Message.parent_id == self.id,
            Message.is_deleted == False,
        ).count()

        # Recursively count nested replies
        for reply in self.replies:
            if not reply.is_deleted:
                count += reply.get_all_replies_count(db)

        return count

    def get_thread_participants(self, db: Session) -> List[int]:
        """Get all unique participant user IDs in this thread"""
        participants = set()

        # Get root message
        root = self.get_thread_root(db)
        if root.user_id:
            participants.add(root.user_id)

        # Get all replies recursively
        def collect_participants(msg):
            if msg.user_id:
                participants.add(msg.user_id)
            for reply in msg.replies:
                if not reply.is_deleted:
                    collect_participants(reply)

        collect_participants(root)
        return list(participants)

    def get_thread_root(self, db: Session) -> "Message":
        """Get the root message of this thread"""
        if self.parent_id is None:
            return self

        parent = db.query(Message).filter(Message.id == self.parent_id).first()
        if parent:
            return parent.get_thread_root(db)
        return self

    @classmethod
    def create(
        cls,
        db: Session,
        model_name: str,
        record_id: int,
        user_id: Optional[int] = None,
        subject: Optional[str] = None,
        body: Optional[str] = None,
        body_html: Optional[str] = None,
        message_type: MessageType = MessageType.COMMENT,
        level: MessageLevel = MessageLevel.INFO,
        parent_id: Optional[int] = None,
        attachments: Optional[List[Dict]] = None,
        is_internal: bool = False,
        extra_data: Optional[Dict] = None,
        auto_flush: bool = True,
    ) -> "Message":
        """Create a new message"""
        message = cls(
            model_name=model_name,
            record_id=record_id,
            user_id=user_id,
            subject=subject,
            body=body,
            body_html=body_html,
            message_type=message_type,
            level=level,
            parent_id=parent_id,
            attachments=attachments or [],
            is_internal=is_internal,
            extra_data=extra_data,
        )
        db.add(message)
        if auto_flush:
            db.flush()
        return message

    @classmethod
    def get_thread(
        cls,
        db: Session,
        model_name: str,
        record_id: int,
        include_internal: bool = True,
        limit: int = 50,
        offset: int = 0,
    ) -> List["Message"]:
        """Get all messages for a record"""
        query = db.query(cls).filter(
            cls.model_name == model_name,
            cls.record_id == record_id,
            cls.is_deleted == False,
        )

        if not include_internal:
            query = query.filter(cls.is_internal == False)

        return query.order_by(cls.created_at.asc()).offset(offset).limit(limit).all()

    @classmethod
    def get_root_messages(
        cls,
        db: Session,
        model_name: str,
        record_id: int,
        include_internal: bool = True,
        limit: int = 50,
        offset: int = 0,
    ) -> List["Message"]:
        """Get only root messages (no parent) for a record"""
        query = db.query(cls).filter(
            cls.model_name == model_name,
            cls.record_id == record_id,
            cls.parent_id == None,
            cls.is_deleted == False,
        )

        if not include_internal:
            query = query.filter(cls.is_internal == False)

        return query.order_by(cls.created_at.desc()).offset(offset).limit(limit).all()

    def get_replies(self, db: Session, limit: int = 50) -> List["Message"]:
        """Get direct replies to this message"""
        return db.query(Message).filter(
            Message.parent_id == self.id,
            Message.is_deleted == False,
        ).order_by(Message.created_at.asc()).limit(limit).all()

    @classmethod
    def get_pinned(
        cls,
        db: Session,
        model_name: str,
        record_id: int,
    ) -> List["Message"]:
        """Get pinned messages for a record"""
        return db.query(cls).filter(
            cls.model_name == model_name,
            cls.record_id == record_id,
            cls.is_pinned == True,
            cls.is_deleted == False,
        ).order_by(cls.created_at.desc()).all()

    def add_attachment(self, attachment: Dict[str, Any]) -> None:
        """Add an attachment to the message"""
        if self.attachments is None:
            self.attachments = []
        self.attachments.append(attachment)

    def pin(self) -> None:
        """Pin this message"""
        self.is_pinned = True

    def unpin(self) -> None:
        """Unpin this message"""
        self.is_pinned = False

    def archive(self) -> None:
        """Archive this message"""
        self.is_archived = True

    def unarchive(self) -> None:
        """Unarchive this message"""
        self.is_archived = False

    def soft_delete(self) -> None:
        """Soft delete this message"""
        self.is_deleted = True
        self.deleted_at = datetime.utcnow()

    def edit(self, body: Optional[str] = None, body_html: Optional[str] = None) -> None:
        """Edit the message content"""
        if body is not None:
            self.body = body
        if body_html is not None:
            self.body_html = body_html
        self.is_edited = True
        self.edited_at = datetime.utcnow()

    def to_dict(self, include_replies: bool = False, db: Optional[Session] = None) -> Dict[str, Any]:
        """Convert message to dictionary"""
        data = {
            "id": self.id,
            "model_name": self.model_name,
            "record_id": self.record_id,
            "user_id": self.user_id,
            "parent_id": self.parent_id,
            "subject": self.subject,
            "body": self.body,
            "body_html": self.body_html,
            "message_type": self.message_type.value if self.message_type else None,
            "level": self.level.value if self.level else None,
            "attachments": self.attachments,
            "is_internal": self.is_internal,
            "is_pinned": self.is_pinned,
            "is_archived": self.is_archived,
            "is_edited": self.is_edited,
            "is_deleted": self.is_deleted,
            "edited_at": self.edited_at.isoformat() if self.edited_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "reply_count": self.reply_count,
            "extra_data": self.extra_data,
        }

        # Include user info if loaded
        if self.user:
            data["user"] = {
                "id": self.user.id,
                "username": getattr(self.user, "username", None),
                "full_name": getattr(self.user, "full_name", None),
                "email": getattr(self.user, "email", None),
            }

        # Include replies if requested
        if include_replies and db:
            replies = self.get_replies(db)
            data["replies"] = [
                r.to_dict(include_replies=True, db=db) for r in replies
            ]

        return data
