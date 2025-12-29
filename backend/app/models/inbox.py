"""Inbox model for unified inbox functionality (Huly-inspired)"""

from enum import Enum
from sqlalchemy import Boolean, Column, Enum as SQLEnum, ForeignKey, Integer, String, Index
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class InboxItemType(str, Enum):
    """Types of inbox items"""
    MESSAGE = "message"
    NOTIFICATION = "notification"
    ACTIVITY = "activity"
    MENTION = "mention"


class InboxPriority(str, Enum):
    """Priority levels for inbox items"""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class InboxItem(BaseModel):
    """
    Unified inbox item model (Huly-inspired).

    Aggregates messages, notifications, and activities into a single inbox.
    Each inbox item references the original record via reference_type and reference_id.

    Attributes:
        user_id: The inbox owner
        item_type: Type of item (message, notification, activity, mention)
        reference_type: Table name of the referenced record
        reference_id: ID of the referenced record
        source_model: Model name where the item originated (e.g., 'users', 'leave_requests')
        source_id: ID of the source record
        title: Brief title/subject for the inbox item
        preview: Short preview text (first 200 chars)
        is_read: Whether the item has been read
        is_archived: Whether the item is archived
        is_starred: Whether the item is starred/bookmarked
        priority: Priority level
        actor_id: User who triggered this inbox item
    """

    __tablename__ = "inbox_items"

    # Owner of this inbox item
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Item type and reference
    item_type = Column(SQLEnum(InboxItemType), nullable=False, index=True)
    reference_type = Column(String(100), nullable=False)  # 'messages', 'notifications', 'activity_logs'
    reference_id = Column(Integer, nullable=False)

    # Source context (optional - for navigation)
    source_model = Column(String(100), nullable=True)  # e.g., 'users', 'leave_requests'
    source_id = Column(Integer, nullable=True)

    # Display fields
    title = Column(String(255), nullable=True)
    preview = Column(String(500), nullable=True)

    # Status flags
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    is_archived = Column(Boolean, default=False, nullable=False, index=True)
    is_starred = Column(Boolean, default=False, nullable=False, index=True)

    # Priority
    priority = Column(SQLEnum(InboxPriority), default=InboxPriority.NORMAL, nullable=False)

    # Actor (who triggered this inbox item)
    actor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

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
    labels = relationship(
        "Label",
        secondary="inbox_item_labels",
        back_populates="inbox_items",
        lazy="select",
    )

    # Composite indexes for efficient queries
    __table_args__ = (
        Index("ix_inbox_user_unread", "user_id", "is_read"),
        Index("ix_inbox_user_archived", "user_id", "is_archived"),
        Index("ix_inbox_user_type", "user_id", "item_type"),
        Index("ix_inbox_reference", "reference_type", "reference_id"),
    )

    def __repr__(self):
        return f"<InboxItem(id={self.id}, user_id={self.user_id}, type={self.item_type}, read={self.is_read})>"

    def mark_as_read(self):
        """Mark this inbox item as read"""
        self.is_read = True

    def mark_as_unread(self):
        """Mark this inbox item as unread"""
        self.is_read = False

    def archive(self):
        """Archive this inbox item"""
        self.is_archived = True

    def unarchive(self):
        """Unarchive this inbox item"""
        self.is_archived = False

    def star(self):
        """Star/bookmark this inbox item"""
        self.is_starred = True

    def unstar(self):
        """Remove star from this inbox item"""
        self.is_starred = False

    @classmethod
    def create(
        cls,
        db,
        user_id: int,
        item_type: InboxItemType,
        reference_type: str,
        reference_id: int,
        title: str = None,
        preview: str = None,
        source_model: str = None,
        source_id: int = None,
        priority: InboxPriority = None,
        actor_id: int = None,
    ) -> "InboxItem":
        """Create a new inbox item"""
        item = cls(
            user_id=user_id,
            item_type=item_type,
            reference_type=reference_type,
            reference_id=reference_id,
            title=title,
            preview=preview[:500] if preview else None,
            source_model=source_model,
            source_id=source_id,
            priority=priority or InboxPriority.NORMAL,
            actor_id=actor_id,
        )
        db.add(item)
        db.flush()
        return item

    @classmethod
    def create_from_message(
        cls,
        db,
        user_id: int,
        message,
        actor_id: int = None,
    ) -> "InboxItem":
        """Create an inbox item from a Message"""
        return cls.create(
            db=db,
            user_id=user_id,
            item_type=InboxItemType.MESSAGE,
            reference_type="messages",
            reference_id=message.id,
            title=message.subject or "New message",
            preview=message.body[:200] if message.body else None,
            source_model=message.model_name,
            source_id=message.record_id,
            actor_id=actor_id or message.user_id,
        )

    @classmethod
    def create_from_notification(
        cls,
        db,
        notification,
    ) -> "InboxItem":
        """Create an inbox item from a Notification"""
        # Map notification level to priority
        priority_map = {
            "info": InboxPriority.NORMAL,
            "success": InboxPriority.NORMAL,
            "warning": InboxPriority.HIGH,
            "error": InboxPriority.URGENT,
        }
        priority = priority_map.get(notification.level.value if hasattr(notification.level, 'value') else notification.level, InboxPriority.NORMAL)

        return cls.create(
            db=db,
            user_id=notification.user_id,
            item_type=InboxItemType.NOTIFICATION,
            reference_type="notifications",
            reference_id=notification.id,
            title=notification.title,
            preview=notification.description[:200] if notification.description else None,
            priority=priority,
            actor_id=notification.actor_id,
        )

    @classmethod
    def create_from_mention(
        cls,
        db,
        user_id: int,
        message,
        actor_id: int,
    ) -> "InboxItem":
        """Create an inbox item for a mention"""
        return cls.create(
            db=db,
            user_id=user_id,
            item_type=InboxItemType.MENTION,
            reference_type="messages",
            reference_id=message.id,
            title=f"You were mentioned",
            preview=message.body[:200] if message.body else None,
            source_model=message.model_name,
            source_id=message.record_id,
            priority=InboxPriority.HIGH,
            actor_id=actor_id,
        )

    @classmethod
    def get_unread_count(cls, db, user_id: int, item_type: InboxItemType = None) -> int:
        """Get count of unread inbox items for a user"""
        query = db.query(cls).filter(
            cls.user_id == user_id,
            cls.is_read == False,
            cls.is_archived == False,
        )
        if item_type:
            query = query.filter(cls.item_type == item_type)
        return query.count()

    @classmethod
    def get_counts_by_type(cls, db, user_id: int) -> dict:
        """Get unread counts grouped by item type"""
        from sqlalchemy import func
        results = db.query(
            cls.item_type,
            func.count(cls.id)
        ).filter(
            cls.user_id == user_id,
            cls.is_read == False,
            cls.is_archived == False,
        ).group_by(cls.item_type).all()

        return {item_type.value: count for item_type, count in results}

    @classmethod
    def mark_all_read(cls, db, user_id: int, item_type: InboxItemType = None) -> int:
        """Mark all inbox items as read for a user"""
        query = db.query(cls).filter(
            cls.user_id == user_id,
            cls.is_read == False,
        )
        if item_type:
            query = query.filter(cls.item_type == item_type)
        return query.update({"is_read": True})

    @classmethod
    def archive_all(cls, db, user_id: int, item_type: InboxItemType = None) -> int:
        """Archive all inbox items for a user"""
        query = db.query(cls).filter(
            cls.user_id == user_id,
            cls.is_archived == False,
        )
        if item_type:
            query = query.filter(cls.item_type == item_type)
        return query.update({"is_archived": True})
