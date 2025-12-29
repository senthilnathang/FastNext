"""Message read receipt model

Tracks when users read messages with composite primary key.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    PrimaryKeyConstraint,
)
from sqlalchemy.orm import relationship, Session
from sqlalchemy.sql import func

from app.db.base import Base


class MessageReadReceipt(Base):
    """
    Tracks when a user read a message.

    Uses composite primary key (message_id, user_id).
    """
    __tablename__ = "message_read_receipts"

    message_id = Column(
        Integer,
        ForeignKey("messages.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    # When the message was read
    read_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships (view-only)
    message = relationship(
        "Message",
        backref="read_receipts",
        viewonly=True,
        lazy="select",
    )

    user = relationship(
        "User",
        viewonly=True,
        lazy="select",
    )

    # Composite primary key and indexes
    __table_args__ = (
        PrimaryKeyConstraint("message_id", "user_id"),
        Index("idx_read_receipt_message", "message_id"),
        Index("idx_read_receipt_user", "user_id"),
        Index("idx_read_receipt_read_at", "read_at"),
    )

    @classmethod
    def mark_as_read(
        cls,
        db: Session,
        message_id: int,
        user_id: int,
    ) -> "MessageReadReceipt":
        """
        Mark a message as read by a user.

        Creates receipt if not exists, returns existing otherwise.
        """
        existing = db.query(cls).filter(
            cls.message_id == message_id,
            cls.user_id == user_id,
        ).first()

        if existing:
            return existing

        receipt = cls(
            message_id=message_id,
            user_id=user_id,
        )
        db.add(receipt)
        db.flush()
        return receipt

    @classmethod
    def get_readers(cls, db: Session, message_id: int) -> List["MessageReadReceipt"]:
        """Get all read receipts for a message, ordered by read time"""
        return db.query(cls).filter(
            cls.message_id == message_id
        ).order_by(cls.read_at.asc()).all()

    @classmethod
    def get_reader_ids(cls, db: Session, message_id: int) -> List[int]:
        """Get user IDs of those who read the message"""
        receipts = db.query(cls.user_id).filter(
            cls.message_id == message_id
        ).all()
        return [r.user_id for r in receipts]

    @classmethod
    def has_read(cls, db: Session, message_id: int, user_id: int) -> bool:
        """Check if user has read the message"""
        return db.query(cls).filter(
            cls.message_id == message_id,
            cls.user_id == user_id,
        ).first() is not None

    @classmethod
    def get_read_count(cls, db: Session, message_id: int) -> int:
        """Get count of users who read the message"""
        return db.query(cls).filter(
            cls.message_id == message_id
        ).count()

    @classmethod
    def bulk_mark_as_read(
        cls,
        db: Session,
        message_ids: List[int],
        user_id: int,
    ) -> List["MessageReadReceipt"]:
        """Mark multiple messages as read"""
        receipts = []

        for message_id in message_ids:
            receipt = cls.mark_as_read(db, message_id, user_id)
            receipts.append(receipt)

        return receipts

    @classmethod
    def get_unread_message_ids(
        cls,
        db: Session,
        message_ids: List[int],
        user_id: int,
    ) -> List[int]:
        """Get IDs of messages not yet read by user from given list"""
        read_ids = set(
            r.message_id for r in db.query(cls.message_id).filter(
                cls.message_id.in_(message_ids),
                cls.user_id == user_id,
            ).all()
        )
        return [mid for mid in message_ids if mid not in read_ids]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        data = {
            "message_id": self.message_id,
            "user_id": self.user_id,
            "read_at": self.read_at.isoformat() if self.read_at else None,
        }

        if self.user:
            data["user"] = {
                "id": self.user.id,
                "username": getattr(self.user, "username", None),
                "full_name": getattr(self.user, "full_name", None),
            }

        return data
