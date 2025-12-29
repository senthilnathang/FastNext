"""
Read receipt model for tracking when messages are read.
"""

from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    PrimaryKeyConstraint,
    Index,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class MessageReadReceipt(Base):
    """
    Tracks when a message has been read by a user.

    Each record represents a single read event - a user reading a specific message.
    The primary key is (message_id, user_id) to ensure one receipt per user per message.
    """

    __tablename__ = "message_read_receipts"

    # Composite primary key
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

    # Relationships
    message = relationship("Message", viewonly=True)
    user = relationship("User", viewonly=True)

    __table_args__ = (
        PrimaryKeyConstraint("message_id", "user_id"),
        Index("ix_read_receipts_message", "message_id"),
        Index("ix_read_receipts_user", "user_id"),
        Index("ix_read_receipts_read_at", "read_at"),
    )

    def __repr__(self):
        return f"<MessageReadReceipt(message_id={self.message_id}, user_id={self.user_id})>"

    @classmethod
    def mark_as_read(cls, db, message_id: int, user_id: int) -> "MessageReadReceipt":
        """
        Mark a message as read by a user.

        If already read, returns the existing receipt without updating.
        """
        # Check if already read
        existing = db.query(cls).filter(
            cls.message_id == message_id,
            cls.user_id == user_id,
        ).first()

        if existing:
            return existing

        # Create new receipt
        receipt = cls(
            message_id=message_id,
            user_id=user_id,
        )
        db.add(receipt)
        db.flush()
        return receipt

    @classmethod
    def get_readers(cls, db, message_id: int) -> List["MessageReadReceipt"]:
        """Get all read receipts for a message"""
        return db.query(cls).filter(
            cls.message_id == message_id
        ).order_by(cls.read_at.asc()).all()

    @classmethod
    def get_reader_ids(cls, db, message_id: int) -> List[int]:
        """Get list of user IDs who have read a message"""
        receipts = db.query(cls.user_id).filter(
            cls.message_id == message_id
        ).all()
        return [r[0] for r in receipts]

    @classmethod
    def has_read(cls, db, message_id: int, user_id: int) -> bool:
        """Check if a user has read a message"""
        return db.query(cls).filter(
            cls.message_id == message_id,
            cls.user_id == user_id,
        ).first() is not None

    @classmethod
    def get_read_count(cls, db, message_id: int) -> int:
        """Get the number of users who have read a message"""
        return db.query(func.count(cls.user_id)).filter(
            cls.message_id == message_id
        ).scalar() or 0

    @classmethod
    def bulk_mark_as_read(
        cls,
        db,
        message_ids: List[int],
        user_id: int
    ) -> List["MessageReadReceipt"]:
        """Mark multiple messages as read by a user"""
        receipts = []
        for message_id in message_ids:
            receipt = cls.mark_as_read(db, message_id, user_id)
            receipts.append(receipt)
        return receipts

    @classmethod
    def get_unread_message_ids(
        cls,
        db,
        user_id: int,
        message_ids: List[int]
    ) -> List[int]:
        """Get which messages from a list have not been read by a user"""
        read_ids = db.query(cls.message_id).filter(
            cls.user_id == user_id,
            cls.message_id.in_(message_ids),
        ).all()
        read_set = {r[0] for r in read_ids}
        return [mid for mid in message_ids if mid not in read_set]
