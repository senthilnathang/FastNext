"""Social account model for OAuth providers"""

import enum

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class OAuthProvider(str, enum.Enum):
    """Supported OAuth providers"""
    GOOGLE = "google"
    GITHUB = "github"
    MICROSOFT = "microsoft"


class SocialAccount(BaseModel):
    """
    Social account model for OAuth authentication.
    Links users to their social provider accounts.
    """

    __tablename__ = "social_accounts"

    # User association
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Provider info
    provider = Column(
        Enum(OAuthProvider),
        nullable=False,
        index=True,
    )
    provider_user_id = Column(String(255), nullable=False, index=True)
    provider_email = Column(String(255), nullable=True)
    provider_username = Column(String(255), nullable=True)
    provider_name = Column(String(255), nullable=True)
    provider_avatar = Column(String(500), nullable=True)

    # Tokens (encrypted in production)
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    token_expires_at = Column(DateTime(timezone=True), nullable=True)

    # Additional data from provider
    raw_data = Column(Text, nullable=True)  # JSON string of full provider response

    # Relationships
    user = relationship("User", back_populates="social_accounts")

    # Unique constraint: one account per provider per user
    __table_args__ = (
        # Unique constraint would be added via migration
        {"sqlite_autoincrement": True},
    )

    def __repr__(self):
        return f"<SocialAccount(user_id={self.user_id}, provider='{self.provider}')>"

    @property
    def is_token_expired(self) -> bool:
        """Check if the access token is expired"""
        if not self.token_expires_at:
            return True
        from datetime import datetime, timezone
        return datetime.now(timezone.utc) > self.token_expires_at
