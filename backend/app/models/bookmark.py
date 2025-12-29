"""Bookmark model for saving/starring messages and notifications"""

import enum
from typing import List, Optional, TYPE_CHECKING

from sqlalchemy import Column, Integer, String, Text, ForeignKey, Enum as SQLEnum, Index
from sqlalchemy.orm import relationship, Session

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.user import User


class BookmarkType(str, enum.Enum):
    """Types of items that can be bookmarked"""
    MESSAGE = "message"
    NOTIFICATION = "notification"
    ACTIVITY = "activity"
    INBOX_ITEM = "inbox_item"


class Bookmark(BaseModel):
    """
    Bookmark model for saving/starring items.

    Allows users to save messages, notifications, and other items
    for quick access later.
    """

    __tablename__ = "bookmarks"

    # Owner
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # What's being bookmarked
    bookmark_type = Column(
        SQLEnum(BookmarkType),
        nullable=False,
        index=True,
    )
    reference_id = Column(
        Integer,
        nullable=False,
        index=True,
        comment="ID of the bookmarked item",
    )

    # Optional note
    note = Column(Text, nullable=True)

    # Relationships
    user = relationship(
        "User",
        foreign_keys=[user_id],
        viewonly=True,
        lazy="select",
    )

    # Constraints and indexes
    __table_args__ = (
        Index("ix_bookmarks_user_type", "user_id", "bookmark_type"),
        Index(
            "ix_bookmarks_unique",
            "user_id", "bookmark_type", "reference_id",
            unique=True,
        ),
    )

    @classmethod
    def create(
        cls,
        db: Session,
        user_id: int,
        bookmark_type: BookmarkType,
        reference_id: int,
        note: Optional[str] = None,
    ) -> "Bookmark":
        """Create a new bookmark"""
        bookmark = cls(
            user_id=user_id,
            bookmark_type=bookmark_type,
            reference_id=reference_id,
            note=note,
        )
        db.add(bookmark)
        return bookmark

    @classmethod
    def find(
        cls,
        db: Session,
        user_id: int,
        bookmark_type: BookmarkType,
        reference_id: int,
    ) -> Optional["Bookmark"]:
        """Find a specific bookmark"""
        return (
            db.query(cls)
            .filter(
                cls.user_id == user_id,
                cls.bookmark_type == bookmark_type,
                cls.reference_id == reference_id,
            )
            .first()
        )

    @classmethod
    def toggle(
        cls,
        db: Session,
        user_id: int,
        bookmark_type: BookmarkType,
        reference_id: int,
        note: Optional[str] = None,
    ) -> tuple:
        """
        Toggle a bookmark (add if not exists, remove if exists).

        Returns:
            Tuple of (bookmark or None, action: 'added' | 'removed')
        """
        existing = cls.find(db, user_id, bookmark_type, reference_id)

        if existing:
            db.delete(existing)
            return None, "removed"
        else:
            bookmark = cls.create(db, user_id, bookmark_type, reference_id, note)
            return bookmark, "added"

    @classmethod
    def get_by_user(
        cls,
        db: Session,
        user_id: int,
        bookmark_type: Optional[BookmarkType] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List["Bookmark"]:
        """Get bookmarks for a user"""
        query = (
            db.query(cls)
            .filter(cls.user_id == user_id)
        )

        if bookmark_type:
            query = query.filter(cls.bookmark_type == bookmark_type)

        return (
            query
            .order_by(cls.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

    @classmethod
    def count_by_user(
        cls,
        db: Session,
        user_id: int,
        bookmark_type: Optional[BookmarkType] = None,
    ) -> int:
        """Count bookmarks for a user"""
        query = db.query(cls).filter(cls.user_id == user_id)

        if bookmark_type:
            query = query.filter(cls.bookmark_type == bookmark_type)

        return query.count()

    @classmethod
    def is_bookmarked(
        cls,
        db: Session,
        user_id: int,
        bookmark_type: BookmarkType,
        reference_id: int,
    ) -> bool:
        """Check if an item is bookmarked by a user"""
        return cls.find(db, user_id, bookmark_type, reference_id) is not None

    def __repr__(self) -> str:
        return f"<Bookmark(id={self.id}, user_id={self.user_id}, type={self.bookmark_type}, ref_id={self.reference_id})>"
