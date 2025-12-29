"""Label model for organizing inbox items"""

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, UniqueConstraint, Index
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class Label(BaseModel):
    """
    User-defined labels for organizing inbox items.

    Labels are per-user and can be applied to multiple inbox items.
    System labels (is_system=True) cannot be deleted by users.

    Attributes:
        user_id: Owner of this label
        name: Label display name
        color: Hex color code (e.g., '#6366f1')
        icon: Optional icon name
        is_system: Whether this is a system-managed label
        sort_order: Order for display
    """

    __tablename__ = "labels"

    # Owner of this label
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Label properties
    name = Column(String(100), nullable=False)
    color = Column(String(7), default="#6366f1", nullable=False)  # Hex color
    icon = Column(String(50), nullable=True)  # Optional icon name

    # Flags
    is_system = Column(Boolean, default=False, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)

    # Relationships
    user = relationship("User", lazy="select")
    inbox_items = relationship(
        "InboxItem",
        secondary="inbox_item_labels",
        back_populates="labels",
        lazy="select",
    )

    # Constraints
    __table_args__ = (
        UniqueConstraint("user_id", "name", name="uq_label_user_name"),
        Index("ix_label_user_order", "user_id", "sort_order"),
    )

    def __repr__(self):
        return f"<Label(id={self.id}, name='{self.name}', user_id={self.user_id})>"

    @classmethod
    def get_user_labels(cls, db, user_id: int, include_system: bool = True):
        """Get all labels for a user, ordered by sort_order"""
        query = db.query(cls).filter(cls.user_id == user_id)
        if not include_system:
            query = query.filter(cls.is_system == False)
        return query.order_by(cls.sort_order, cls.name).all()

    @classmethod
    def create_default_labels(cls, db, user_id: int) -> list:
        """Create default system labels for a new user"""
        default_labels = [
            {"name": "Important", "color": "#ef4444", "icon": "star", "is_system": True, "sort_order": 0},
            {"name": "Work", "color": "#3b82f6", "icon": "briefcase", "is_system": False, "sort_order": 1},
            {"name": "Personal", "color": "#22c55e", "icon": "user", "is_system": False, "sort_order": 2},
            {"name": "Follow-up", "color": "#f59e0b", "icon": "clock", "is_system": False, "sort_order": 3},
        ]

        created_labels = []
        for label_data in default_labels:
            label = cls(user_id=user_id, **label_data)
            db.add(label)
            created_labels.append(label)

        db.flush()
        return created_labels


class InboxItemLabel(BaseModel):
    """
    Association table for inbox items and labels (many-to-many).
    """

    __tablename__ = "inbox_item_labels"

    # Composite primary key
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

    # Override BaseModel's id column since we use composite key
    id = None

    # Indexes for efficient lookups
    __table_args__ = (
        Index("ix_inbox_item_label_item", "inbox_item_id"),
        Index("ix_inbox_item_label_label", "label_id"),
    )

    def __repr__(self):
        return f"<InboxItemLabel(inbox_item_id={self.inbox_item_id}, label_id={self.label_id})>"
