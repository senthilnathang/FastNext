from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base


class SocialAccount(Base):
    __tablename__ = "social_accounts"

    id = Column(Integer, primary_key=True, index=True)

    # User this social account belongs to
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # OAuth provider details
    provider = Column(String(50), nullable=False, index=True)  # 'google', 'github', 'microsoft'
    provider_id = Column(String(255), nullable=False, index=True)  # Unique ID from provider
    provider_email = Column(String(255), nullable=True)  # Email from provider

    # OAuth tokens
    access_token = Column(Text, nullable=True)  # Encrypted access token
    refresh_token = Column(Text, nullable=True)  # Encrypted refresh token
    token_expires_at = Column(DateTime(timezone=True), nullable=True)

    # Account metadata
    account_data = Column(Text, nullable=True)  # JSON data from provider (encrypted)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", foreign_keys=[user_id])

    def __repr__(self):
        return f"<SocialAccount(user_id={self.user_id}, provider={self.provider}, provider_id={self.provider_id})>"