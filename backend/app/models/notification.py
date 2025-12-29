"""Notification model"""

from enum import Enum
from sqlalchemy import Boolean, Column, Enum as SQLEnum, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class NotificationLevel(str, Enum):
    """Notification severity levels"""
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"


class Notification(BaseModel):
    """
    Notification model for user notifications.

    Attributes:
        user_id: The recipient user
        title: Notification title/verb
        description: Detailed message
        level: Severity level (info, success, warning, error)
        is_read: Whether the notification has been read
        data: Additional JSON data for the notification
        link: Optional URL to redirect when clicked
    """

    __tablename__ = "notifications"

    # Required fields
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)

    # Optional fields
    description = Column(Text, nullable=True)
    level = Column(SQLEnum(NotificationLevel), default=NotificationLevel.INFO, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    data = Column(JSON, default=dict, nullable=False)
    link = Column(String(500), nullable=True)

    # Actor (who triggered the notification)
    actor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    user = relationship(
        "User",
        foreign_keys=[user_id],
        back_populates="notifications",
        lazy="select",
    )
    actor = relationship(
        "User",
        foreign_keys=[actor_id],
        lazy="select",
    )

    def __repr__(self):
        return f"<Notification(id={self.id}, user_id={self.user_id}, title='{self.title}')>"

    def mark_as_read(self):
        """Mark this notification as read"""
        self.is_read = True

    def mark_as_unread(self):
        """Mark this notification as unread"""
        self.is_read = False

    @classmethod
    def create(
        cls,
        db,
        user_id: int,
        title: str,
        description: str = None,
        level: "NotificationLevel" = None,
        link: str = None,
        data: dict = None,
        actor_id: int = None,
    ):
        """Create a new notification"""
        notification = cls(
            user_id=user_id,
            title=title,
            description=description,
            level=level or NotificationLevel.INFO,
            link=link,
            data=data or {},
            actor_id=actor_id,
        )
        db.add(notification)
        db.flush()
        return notification

    @classmethod
    def get_unread_count(cls, db, user_id: int) -> int:
        """Get count of unread notifications for a user"""
        return db.query(cls).filter(
            cls.user_id == user_id,
            cls.is_read == False,
        ).count()

    @classmethod
    def mark_all_read(cls, db, user_id: int) -> int:
        """Mark all notifications as read for a user"""
        return db.query(cls).filter(
            cls.user_id == user_id,
            cls.is_read == False,
        ).update({"is_read": True})
