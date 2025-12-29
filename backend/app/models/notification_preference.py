"""
Notification preference model for per-user notification settings.

Allows users to customize how they receive notifications:
- In-app notifications
- Push notifications
- Email notifications
- Do Not Disturb settings
"""

import enum
import json
from datetime import datetime, time
from typing import Dict, List, Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    Time,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class DigestFrequency(str, enum.Enum):
    """Email digest frequency options"""
    NONE = "none"
    IMMEDIATE = "immediate"
    DAILY = "daily"
    WEEKLY = "weekly"


class NotificationPreference(Base):
    """
    Per-user notification preferences.

    Controls how the user receives different types of notifications
    across various channels (in-app, push, email).
    """

    __tablename__ = "notification_preferences"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # User (one preference record per user)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # =====================
    # In-App Notifications
    # =====================
    inbox_enabled = Column(Boolean, default=True, nullable=False)
    inbox_sound = Column(Boolean, default=True, nullable=False)
    inbox_desktop = Column(Boolean, default=True, nullable=False)

    # =====================
    # Push Notifications
    # =====================
    push_enabled = Column(Boolean, default=True, nullable=False)
    push_messages = Column(Boolean, default=True, nullable=False)
    push_mentions = Column(Boolean, default=True, nullable=False)
    push_replies = Column(Boolean, default=True, nullable=False)
    push_reactions = Column(Boolean, default=False, nullable=False)
    push_activity = Column(Boolean, default=False, nullable=False)

    # =====================
    # Email Notifications
    # =====================
    email_enabled = Column(Boolean, default=True, nullable=False)
    email_messages = Column(Boolean, default=True, nullable=False)
    email_mentions = Column(Boolean, default=True, nullable=False)
    email_digest = Column(
        Enum(DigestFrequency),
        default=DigestFrequency.DAILY,
        nullable=False,
    )

    # =====================
    # Do Not Disturb
    # =====================
    dnd_enabled = Column(Boolean, default=False, nullable=False)
    dnd_start_time = Column(Time, nullable=True)  # e.g., 22:00
    dnd_end_time = Column(Time, nullable=True)  # e.g., 08:00
    dnd_weekends = Column(Boolean, default=False, nullable=False)

    # =====================
    # Type-specific Overrides (JSON)
    # =====================
    # Allows fine-grained control per notification type
    # Format: {"message": {"push": true, "email": false}, ...}
    type_overrides = Column(Text, nullable=True)

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
    user = relationship("User", viewonly=True)

    def __repr__(self):
        return f"<NotificationPreference(id={self.id}, user_id={self.user_id})>"

    @classmethod
    def get_or_create(cls, db, user_id: int) -> "NotificationPreference":
        """Get user preferences or create with defaults"""
        prefs = db.query(cls).filter(cls.user_id == user_id).first()
        if not prefs:
            prefs = cls(user_id=user_id)
            db.add(prefs)
            db.flush()
        return prefs

    @classmethod
    def get_for_user(cls, db, user_id: int) -> Optional["NotificationPreference"]:
        """Get preferences for a user (may be None)"""
        return db.query(cls).filter(cls.user_id == user_id).first()

    def is_dnd_active(self, current_time: Optional[time] = None) -> bool:
        """Check if Do Not Disturb is currently active"""
        if not self.dnd_enabled:
            return False

        if current_time is None:
            current_time = datetime.now().time()

        # Check weekend DND
        if self.dnd_weekends:
            weekday = datetime.now().weekday()
            if weekday >= 5:  # Saturday = 5, Sunday = 6
                return True

        # Check time-based DND
        if self.dnd_start_time and self.dnd_end_time:
            # Handle overnight DND (e.g., 22:00 to 08:00)
            if self.dnd_start_time > self.dnd_end_time:
                # Overnight: active if after start OR before end
                return current_time >= self.dnd_start_time or current_time <= self.dnd_end_time
            else:
                # Same-day: active if between start and end
                return self.dnd_start_time <= current_time <= self.dnd_end_time

        return False

    def should_send_push(self, notification_type: str) -> bool:
        """Check if push notification should be sent for given type"""
        if not self.push_enabled:
            return False

        if self.is_dnd_active():
            return False

        # Check type-specific overrides
        overrides = self.get_type_overrides()
        if notification_type in overrides:
            type_prefs = overrides[notification_type]
            if "push" in type_prefs:
                return type_prefs["push"]

        # Fall back to category settings
        type_map = {
            "message": self.push_messages,
            "mention": self.push_mentions,
            "reply": self.push_replies,
            "reaction": self.push_reactions,
            "activity": self.push_activity,
        }
        return type_map.get(notification_type, True)

    def should_send_email(self, notification_type: str) -> bool:
        """Check if email notification should be sent for given type"""
        if not self.email_enabled:
            return False

        # Check type-specific overrides
        overrides = self.get_type_overrides()
        if notification_type in overrides:
            type_prefs = overrides[notification_type]
            if "email" in type_prefs:
                return type_prefs["email"]

        # Fall back to category settings
        type_map = {
            "message": self.email_messages,
            "mention": self.email_mentions,
        }
        return type_map.get(notification_type, False)

    def get_type_overrides(self) -> Dict:
        """Get type-specific overrides as dict"""
        if not self.type_overrides:
            return {}
        try:
            return json.loads(self.type_overrides)
        except json.JSONDecodeError:
            return {}

    def set_type_overrides(self, overrides: Dict) -> None:
        """Set type-specific overrides"""
        self.type_overrides = json.dumps(overrides)

    def to_dict(self) -> Dict:
        """Convert to dictionary for API response"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            # In-app
            "inbox_enabled": self.inbox_enabled,
            "inbox_sound": self.inbox_sound,
            "inbox_desktop": self.inbox_desktop,
            # Push
            "push_enabled": self.push_enabled,
            "push_messages": self.push_messages,
            "push_mentions": self.push_mentions,
            "push_replies": self.push_replies,
            "push_reactions": self.push_reactions,
            "push_activity": self.push_activity,
            # Email
            "email_enabled": self.email_enabled,
            "email_messages": self.email_messages,
            "email_mentions": self.email_mentions,
            "email_digest": self.email_digest.value if self.email_digest else "none",
            # DND
            "dnd_enabled": self.dnd_enabled,
            "dnd_start_time": self.dnd_start_time.isoformat() if self.dnd_start_time else None,
            "dnd_end_time": self.dnd_end_time.isoformat() if self.dnd_end_time else None,
            "dnd_weekends": self.dnd_weekends,
            # Overrides
            "type_overrides": self.get_type_overrides(),
        }
