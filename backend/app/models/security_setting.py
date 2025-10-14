from datetime import datetime

from app.db.base import Base
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func


class SecuritySetting(Base):
    __tablename__ = "security_settings"

    id = Column(Integer, primary_key=True, index=True)

    # User these settings belong to
    user_id = Column(
        Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True
    )

    # Two-Factor Authentication
    two_factor_enabled = Column(Boolean, default=False, nullable=False)
    two_factor_secret = Column(String(255), nullable=True)  # TOTP secret (encrypted)
    backup_codes = Column(Text, nullable=True)  # JSON array of backup codes (encrypted)

    # Login Security
    require_password_change = Column(Boolean, default=False, nullable=False)
    password_expiry_days = Column(Integer, default=90, nullable=True)
    max_login_attempts = Column(Integer, default=5, nullable=False)
    lockout_duration_minutes = Column(Integer, default=30, nullable=False)

    # Password Policies
    min_password_length = Column(Integer, default=8, nullable=False)
    require_uppercase = Column(Boolean, default=True, nullable=False)
    require_lowercase = Column(Boolean, default=True, nullable=False)
    require_numbers = Column(Boolean, default=True, nullable=False)
    require_special_chars = Column(Boolean, default=False, nullable=False)
    password_history_count = Column(
        Integer, default=5, nullable=False
    )  # Number of previous passwords to remember

    # Session Security
    max_session_duration_hours = Column(Integer, default=24, nullable=False)
    allow_concurrent_sessions = Column(Boolean, default=True, nullable=False)
    max_concurrent_sessions = Column(Integer, default=5, nullable=False)

    # Notification Preferences
    email_on_login = Column(Boolean, default=True, nullable=False)
    email_on_password_change = Column(Boolean, default=True, nullable=False)
    email_on_security_change = Column(Boolean, default=True, nullable=False)
    email_on_suspicious_activity = Column(Boolean, default=True, nullable=False)

    # Privacy Settings
    activity_logging_enabled = Column(Boolean, default=True, nullable=False)
    data_retention_days = Column(Integer, default=90, nullable=True)  # 0 = indefinite

    # API Access
    api_access_enabled = Column(Boolean, default=True, nullable=False)
    api_rate_limit = Column(Integer, default=100, nullable=False)  # requests per hour

    # Audit fields
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", foreign_keys=[user_id])

    def to_dict(self):
        """Convert security settings to dictionary (excluding sensitive data)"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "two_factor_enabled": self.two_factor_enabled,
            "require_password_change": self.require_password_change,
            "password_expiry_days": self.password_expiry_days,
            "max_login_attempts": self.max_login_attempts,
            "lockout_duration_minutes": self.lockout_duration_minutes,
            "max_session_duration_hours": self.max_session_duration_hours,
            "allow_concurrent_sessions": self.allow_concurrent_sessions,
            "max_concurrent_sessions": self.max_concurrent_sessions,
            "email_on_login": self.email_on_login,
            "email_on_password_change": self.email_on_password_change,
            "email_on_security_change": self.email_on_security_change,
            "email_on_suspicious_activity": self.email_on_suspicious_activity,
            "activity_logging_enabled": self.activity_logging_enabled,
            "data_retention_days": self.data_retention_days,
            "api_access_enabled": self.api_access_enabled,
            "api_rate_limit": self.api_rate_limit,
            "min_password_length": self.min_password_length,
            "require_uppercase": self.require_uppercase,
            "require_lowercase": self.require_lowercase,
            "require_numbers": self.require_numbers,
            "require_special_chars": self.require_special_chars,
            "password_history_count": self.password_history_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
