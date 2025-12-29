"""Label model for organizing inbox items

Provides user-defined labels for categorizing inbox items.
"""

from typing import Any, Dict, List, Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship, Session
from sqlalchemy.sql import func

from app.db.base import Base


class Label(Base):
    """
    User-defined label for organizing inbox items.

    Each user can create their own labels.
    System labels (is_system=True) cannot be deleted.
    """
    __tablename__ = "labels"

    id = Column(Integer, primary_key=True, index=True)

    # Owner of the label
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Label display
    name = Column(String(100), nullable=False)
    color = Column(String(20), nullable=False, default="#6366f1")  # Hex color
    icon = Column(String(50), nullable=True)

    # System labels cannot be deleted
    is_system = Column(Boolean, nullable=False, default=False)

    # Display order
    sort_order = Column(Integer, nullable=False, default=0)

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
        lazy="select",
    )

    inbox_items = relationship(
        "InboxItem",
        secondary="inbox_item_labels",
        back_populates="labels",
        lazy="select",
    )

    # Unique constraint per user
    __table_args__ = (
        UniqueConstraint("user_id", "name", name="uq_label_user_name"),
        Index("idx_label_user", "user_id"),
    )

    @classmethod
    def get_user_labels(
        cls,
        db: Session,
        user_id: int,
    ) -> List["Label"]:
        """Get all labels for a user ordered by sort_order"""
        return db.query(cls).filter(
            cls.user_id == user_id
        ).order_by(cls.sort_order.asc()).all()

    @classmethod
    def create_default_labels(
        cls,
        db: Session,
        user_id: int,
    ) -> List["Label"]:
        """Create default system labels for a new user"""
        default_labels = [
            {"name": "Important", "color": "#ef4444", "icon": "star", "sort_order": 1},
            {"name": "Work", "color": "#3b82f6", "icon": "briefcase", "sort_order": 2},
            {"name": "Personal", "color": "#22c55e", "icon": "user", "sort_order": 3},
            {"name": "Follow-up", "color": "#f59e0b", "icon": "clock", "sort_order": 4},
        ]

        labels = []
        for label_data in default_labels:
            label = cls(
                user_id=user_id,
                is_system=True,
                **label_data,
            )
            db.add(label)
            labels.append(label)

        db.flush()
        return labels

    @classmethod
    def find_by_name(
        cls,
        db: Session,
        user_id: int,
        name: str,
    ) -> Optional["Label"]:
        """Find a label by name for a user"""
        return db.query(cls).filter(
            cls.user_id == user_id,
            cls.name == name,
        ).first()

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "color": self.color,
            "icon": self.icon,
            "is_system": self.is_system,
            "sort_order": self.sort_order,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class InboxItemLabel(Base):
    """
    Many-to-many junction table for inbox items and labels.
    """
    __tablename__ = "inbox_item_labels"

    inbox_item_id = Column(
        Integer,
        ForeignKey("inbox_items.id", ondelete="CASCADE"),
        primary_key=True,
    )
    label_id = Column(
        Integer,
        ForeignKey("labels.id", ondelete="CASCADE"),
        primary_key=True,
    )

    # Timestamp for when label was applied
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Indexes
    __table_args__ = (
        Index("idx_inbox_item_label_item", "inbox_item_id"),
        Index("idx_inbox_item_label_label", "label_id"),
    )

    @classmethod
    def add_label(
        cls,
        db: Session,
        inbox_item_id: int,
        label_id: int,
    ) -> Optional["InboxItemLabel"]:
        """Add a label to an inbox item"""
        # Check if already exists
        existing = db.query(cls).filter(
            cls.inbox_item_id == inbox_item_id,
            cls.label_id == label_id,
        ).first()

        if existing:
            return existing

        item_label = cls(
            inbox_item_id=inbox_item_id,
            label_id=label_id,
        )
        db.add(item_label)
        db.flush()
        return item_label

    @classmethod
    def remove_label(
        cls,
        db: Session,
        inbox_item_id: int,
        label_id: int,
    ) -> bool:
        """Remove a label from an inbox item"""
        result = db.query(cls).filter(
            cls.inbox_item_id == inbox_item_id,
            cls.label_id == label_id,
        ).delete(synchronize_session=False)

        db.flush()
        return result > 0

    @classmethod
    def get_labels_for_item(
        cls,
        db: Session,
        inbox_item_id: int,
    ) -> List[int]:
        """Get label IDs for an inbox item"""
        results = db.query(cls.label_id).filter(
            cls.inbox_item_id == inbox_item_id
        ).all()
        return [r.label_id for r in results]
