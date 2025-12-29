"""
Push subscription model for Web Push notifications.

Stores browser push notification subscriptions for each user.
Uses the Web Push protocol with VAPID authentication.
"""

from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    Index,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class PushSubscription(Base):
    """
    Stores Web Push subscriptions for browser notifications.

    Each subscription represents a unique browser/device that has
    granted notification permission. Users can have multiple
    subscriptions (different browsers/devices).
    """

    __tablename__ = "push_subscriptions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # User who owns this subscription
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Web Push subscription data
    endpoint = Column(String(500), nullable=False, unique=True)
    p256dh_key = Column(String(500), nullable=False)  # Public key for encryption
    auth_key = Column(String(500), nullable=False)  # Auth secret

    # Device/browser metadata
    user_agent = Column(String(500), nullable=True)
    device_name = Column(String(100), nullable=True)  # User-friendly name

    # Subscription status
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    error_count = Column(Integer, default=0, nullable=False)
    last_error = Column(Text, nullable=True)

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

    __table_args__ = (
        Index("ix_push_subscriptions_user_active", "user_id", "is_active"),
    )

    def __repr__(self):
        return f"<PushSubscription(id={self.id}, user_id={self.user_id}, active={self.is_active})>"

    @classmethod
    def create_subscription(
        cls,
        db,
        user_id: int,
        endpoint: str,
        p256dh_key: str,
        auth_key: str,
        user_agent: Optional[str] = None,
        device_name: Optional[str] = None,
    ) -> "PushSubscription":
        """
        Create a new push subscription.

        If the endpoint already exists, update it instead.
        """
        # Check for existing subscription with same endpoint
        existing = db.query(cls).filter(cls.endpoint == endpoint).first()

        if existing:
            # Update existing subscription
            existing.user_id = user_id
            existing.p256dh_key = p256dh_key
            existing.auth_key = auth_key
            existing.user_agent = user_agent
            existing.device_name = device_name
            existing.is_active = True
            existing.error_count = 0
            existing.last_error = None
            db.flush()
            return existing

        # Create new subscription
        subscription = cls(
            user_id=user_id,
            endpoint=endpoint,
            p256dh_key=p256dh_key,
            auth_key=auth_key,
            user_agent=user_agent,
            device_name=device_name,
        )
        db.add(subscription)
        db.flush()
        return subscription

    @classmethod
    def get_active_subscriptions(cls, db, user_id: int) -> List["PushSubscription"]:
        """Get all active subscriptions for a user"""
        return db.query(cls).filter(
            cls.user_id == user_id,
            cls.is_active == True,
        ).all()

    @classmethod
    def get_all_active_subscriptions(cls, db) -> List["PushSubscription"]:
        """Get all active subscriptions"""
        return db.query(cls).filter(cls.is_active == True).all()

    @classmethod
    def deactivate_by_endpoint(cls, db, endpoint: str) -> bool:
        """Deactivate a subscription by endpoint"""
        subscription = db.query(cls).filter(cls.endpoint == endpoint).first()
        if subscription:
            subscription.is_active = False
            db.flush()
            return True
        return False

    @classmethod
    def delete_by_endpoint(cls, db, endpoint: str) -> bool:
        """Delete a subscription by endpoint"""
        result = db.query(cls).filter(cls.endpoint == endpoint).delete()
        db.flush()
        return result > 0

    def mark_used(self) -> None:
        """Mark subscription as recently used"""
        self.last_used_at = datetime.utcnow()

    def record_error(self, error_message: str) -> None:
        """Record a push error"""
        self.error_count += 1
        self.last_error = error_message

        # Deactivate after too many errors
        if self.error_count >= 5:
            self.is_active = False

    def to_push_info(self) -> dict:
        """Convert to Web Push subscription info format"""
        return {
            "endpoint": self.endpoint,
            "keys": {
                "p256dh": self.p256dh_key,
                "auth": self.auth_key,
            },
        }
