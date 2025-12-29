"""Inbox model for unified inbox functionality

Provides a unified inbox aggregating messages, notifications, activities, and mentions.
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
from sqlalchemy.orm import relationship, Session
from sqlalchemy.sql import func

from app.db.base import Base


class InboxItemType(str, enum.Enum):
    """Type of inbox item"""
    MESSAGE = "message"
    NOTIFICATION = "notification"
    ACTIVITY = "activity"
    MENTION = "mention"


class InboxPriority(str, enum.Enum):
    """Priority level for inbox items"""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class InboxItem(Base):
    """
    Unified inbox item model.

    Aggregates messages, notifications, activities, and mentions
    into a single inbox view for each user.
    """
    __tablename__ = "inbox_items"

    id = Column(Integer, primary_key=True, index=True)

    # Owner of the inbox item
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Item classification
    item_type = Column(
        Enum(InboxItemType),
        nullable=False,
        default=InboxItemType.NOTIFICATION,
    )

    # Reference to the source record (polymorphic)
    reference_type = Column(String(64), nullable=False)  # 'messages', 'notifications', etc.
    reference_id = Column(Integer, nullable=False)

    # Context navigation
    source_model = Column(String(64), nullable=True)  # e.g., 'users', 'projects'
    source_id = Column(Integer, nullable=True)

    # Display content
    title = Column(String(500), nullable=False)
    preview = Column(Text, nullable=True)

    # Status flags
    is_read = Column(Boolean, nullable=False, default=False, index=True)
    is_archived = Column(Boolean, nullable=False, default=False, index=True)
    is_starred = Column(Boolean, nullable=False, default=False)

    # Priority
    priority = Column(
        Enum(InboxPriority),
        nullable=False,
        default=InboxPriority.NORMAL,
    )

    # Actor who triggered the item (e.g., message sender)
    actor_id = Column(
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
    read_at = Column(DateTime(timezone=True), nullable=True)
    archived_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship(
        "User",
        foreign_keys=[user_id],
        lazy="select",
    )

    actor = relationship(
        "User",
        foreign_keys=[actor_id],
        lazy="select",
    )

    # Labels relationship (via junction table)
    labels = relationship(
        "Label",
        secondary="inbox_item_labels",
        back_populates="inbox_items",
        lazy="select",
    )

    # Indexes for common queries
    __table_args__ = (
        Index("idx_inbox_user_read", "user_id", "is_read"),
        Index("idx_inbox_user_archived", "user_id", "is_archived"),
        Index("idx_inbox_user_type", "user_id", "item_type"),
        Index("idx_inbox_reference", "reference_type", "reference_id"),
        Index("idx_inbox_created", "created_at"),
    )

    def mark_as_read(self) -> None:
        """Mark item as read"""
        self.is_read = True
        self.read_at = datetime.utcnow()

    def mark_as_unread(self) -> None:
        """Mark item as unread"""
        self.is_read = False
        self.read_at = None

    def archive(self) -> None:
        """Archive the item"""
        self.is_archived = True
        self.archived_at = datetime.utcnow()

    def unarchive(self) -> None:
        """Unarchive the item"""
        self.is_archived = False
        self.archived_at = None

    def star(self) -> None:
        """Star the item"""
        self.is_starred = True

    def unstar(self) -> None:
        """Unstar the item"""
        self.is_starred = False

    @classmethod
    def create(
        cls,
        db: Session,
        user_id: int,
        item_type: InboxItemType,
        reference_type: str,
        reference_id: int,
        title: str,
        preview: Optional[str] = None,
        source_model: Optional[str] = None,
        source_id: Optional[int] = None,
        actor_id: Optional[int] = None,
        priority: InboxPriority = InboxPriority.NORMAL,
    ) -> "InboxItem":
        """Create a new inbox item"""
        item = cls(
            user_id=user_id,
            item_type=item_type,
            reference_type=reference_type,
            reference_id=reference_id,
            title=title,
            preview=preview[:200] if preview else None,
            source_model=source_model,
            source_id=source_id,
            actor_id=actor_id,
            priority=priority,
        )
        db.add(item)
        db.flush()
        return item

    @classmethod
    def create_from_message(
        cls,
        db: Session,
        user_id: int,
        message,
        actor_id: Optional[int] = None,
    ) -> "InboxItem":
        """Create inbox item from a Message"""
        return cls.create(
            db=db,
            user_id=user_id,
            item_type=InboxItemType.MESSAGE,
            reference_type="messages",
            reference_id=message.id,
            title=message.subject or "New message",
            preview=message.body,
            source_model=message.model_name,
            source_id=message.record_id,
            actor_id=actor_id or message.user_id,
            priority=InboxPriority.NORMAL,
        )

    @classmethod
    def create_from_notification(
        cls,
        db: Session,
        notification,
    ) -> "InboxItem":
        """Create inbox item from a Notification"""
        # Map notification type to priority
        priority = InboxPriority.NORMAL
        if hasattr(notification, "type"):
            type_str = str(notification.type).lower()
            if "error" in type_str or "urgent" in type_str:
                priority = InboxPriority.URGENT
            elif "warning" in type_str:
                priority = InboxPriority.HIGH

        return cls.create(
            db=db,
            user_id=notification.user_id,
            item_type=InboxItemType.NOTIFICATION,
            reference_type="notifications",
            reference_id=notification.id,
            title=notification.title,
            preview=notification.message,
            priority=priority,
        )

    @classmethod
    def create_from_mention(
        cls,
        db: Session,
        user_id: int,
        mention,
        message,
        actor_id: Optional[int] = None,
    ) -> "InboxItem":
        """Create inbox item from a Mention"""
        return cls.create(
            db=db,
            user_id=user_id,
            item_type=InboxItemType.MENTION,
            reference_type="mentions",
            reference_id=mention.id,
            title="You were mentioned",
            preview=message.body if message else None,
            source_model=message.model_name if message else None,
            source_id=message.record_id if message else None,
            actor_id=actor_id or (message.user_id if message else None),
            priority=InboxPriority.HIGH,
        )

    @classmethod
    def get_unread_count(cls, db: Session, user_id: int) -> int:
        """Get count of unread items for user"""
        return db.query(cls).filter(
            cls.user_id == user_id,
            cls.is_read == False,
            cls.is_archived == False,
        ).count()

    @classmethod
    def get_counts_by_type(cls, db: Session, user_id: int) -> Dict[str, int]:
        """Get unread counts grouped by item type"""
        from sqlalchemy import func as sa_func

        results = db.query(
            cls.item_type,
            sa_func.count(cls.id),
        ).filter(
            cls.user_id == user_id,
            cls.is_read == False,
            cls.is_archived == False,
        ).group_by(cls.item_type).all()

        counts = {t.value: 0 for t in InboxItemType}
        for item_type, count in results:
            counts[item_type.value] = count

        return counts

    @classmethod
    def mark_all_read(
        cls,
        db: Session,
        user_id: int,
        item_type: Optional[InboxItemType] = None,
    ) -> int:
        """Mark all items as read. Returns count of updated items."""
        query = db.query(cls).filter(
            cls.user_id == user_id,
            cls.is_read == False,
        )

        if item_type:
            query = query.filter(cls.item_type == item_type)

        count = query.update({
            cls.is_read: True,
            cls.read_at: datetime.utcnow(),
        }, synchronize_session=False)

        db.flush()
        return count

    @classmethod
    def archive_all(
        cls,
        db: Session,
        user_id: int,
        item_type: Optional[InboxItemType] = None,
    ) -> int:
        """Archive all items. Returns count of updated items."""
        query = db.query(cls).filter(
            cls.user_id == user_id,
            cls.is_archived == False,
        )

        if item_type:
            query = query.filter(cls.item_type == item_type)

        count = query.update({
            cls.is_archived: True,
            cls.archived_at: datetime.utcnow(),
        }, synchronize_session=False)

        db.flush()
        return count

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        data = {
            "id": self.id,
            "user_id": self.user_id,
            "item_type": self.item_type.value if self.item_type else None,
            "reference_type": self.reference_type,
            "reference_id": self.reference_id,
            "source_model": self.source_model,
            "source_id": self.source_id,
            "title": self.title,
            "preview": self.preview,
            "is_read": self.is_read,
            "is_archived": self.is_archived,
            "is_starred": self.is_starred,
            "priority": self.priority.value if self.priority else None,
            "actor_id": self.actor_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "read_at": self.read_at.isoformat() if self.read_at else None,
            "archived_at": self.archived_at.isoformat() if self.archived_at else None,
        }

        # Include actor info if loaded
        if self.actor:
            data["actor"] = {
                "id": self.actor.id,
                "username": getattr(self.actor, "username", None),
                "full_name": getattr(self.actor, "full_name", None),
            }

        # Include label IDs if loaded
        if self.labels:
            data["label_ids"] = [l.id for l in self.labels]

        return data
