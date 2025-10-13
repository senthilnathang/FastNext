"""
Password Service - FastNext
Business logic for password validation, policies, and security
"""

import re
import hashlib
import logging
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timedelta

from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.user import User
from app.models.security_setting import SecuritySetting
from app.models.password_history import PasswordHistory
from app.core.security import get_password_hash, verify_password
from app.core.logging import get_logger

logger = get_logger(__name__)


class PasswordValidationError(Exception):
    """Raised when password validation fails"""
    pass


class PasswordService:
    """
    Service for password validation, policies, and security operations.

    Handles password complexity requirements, history checking,
    and breach detection.
    """

    def __init__(self, db: Session):
        """Initialize password service with database session."""
        self.db = db

    def validate_password_policy(
        self,
        password: str,
        user: User,
        security_settings: Optional[SecuritySetting] = None
    ) -> None:
        """
        Validate password against security policies.

        Args:
            password: Plain text password to validate
            user: User object
            security_settings: User's security settings (fetched if not provided)

        Raises:
            PasswordValidationError: If password doesn't meet requirements
        """
        if not security_settings:
            security_settings = self.db.query(SecuritySetting).filter(
                SecuritySetting.user_id == user.id
            ).first()

        if not security_settings:
            # Use default policies if no settings exist
            security_settings = SecuritySetting(
                user_id=user.id,
                min_password_length=8,
                require_uppercase=True,
                require_lowercase=True,
                require_numbers=True,
                require_special_chars=False
            )

        errors = []

        # Length check
        if len(password) < security_settings.min_password_length:
            errors.append(f"Password must be at least {security_settings.min_password_length} characters long")

        # Character requirements
        if security_settings.require_uppercase and not re.search(r'[A-Z]', password):
            errors.append("Password must contain at least one uppercase letter")

        if security_settings.require_lowercase and not re.search(r'[a-z]', password):
            errors.append("Password must contain at least one lowercase letter")

        if security_settings.require_numbers and not re.search(r'[0-9]', password):
            errors.append("Password must contain at least one number")

        if security_settings.require_special_chars and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            errors.append("Password must contain at least one special character")

        # Check against password history
        if security_settings.password_history_count > 0:
            if self._is_password_in_history(password, user.id, security_settings.password_history_count):
                errors.append(f"Password cannot be one of your last {security_settings.password_history_count} passwords")

        # Check for breached passwords
        if self._is_password_breached(password):
            errors.append("This password has been found in known data breaches. Please choose a different password.")

        if errors:
            raise PasswordValidationError("; ".join(errors))

    def _is_password_in_history(self, password: str, user_id: int, history_count: int) -> bool:
        """
        Check if password exists in user's password history.

        Args:
            password: Plain text password
            user_id: User ID
            history_count: Number of previous passwords to check

        Returns:
            True if password is in history
        """
        # Get recent password history
        history_entries = self.db.query(PasswordHistory).filter(
            PasswordHistory.user_id == user_id
        ).order_by(desc(PasswordHistory.created_at)).limit(history_count).all()

        # Check against each historical password
        for entry in history_entries:
            if verify_password(password, entry.hashed_password):
                return True

        return False

    def _is_password_breached(self, password: str) -> bool:
        """
        Check if password has been breached using HaveIBeenPwned API.

        Uses k-anonymity to protect password privacy.

        Args:
            password: Plain text password

        Returns:
            True if password is breached
        """
        try:
            # Create SHA-1 hash of password
            sha1_hash = hashlib.sha1(password.encode('utf-8')).hexdigest().upper()

            # Use first 5 characters for k-anonymity
            prefix = sha1_hash[:5]
            suffix = sha1_hash[5:]

            # Query HaveIBeenPwned API
            import httpx
            response = httpx.get(f"https://api.pwnedpasswords.com/range/{prefix}", timeout=5.0)

            if response.status_code == 200:
                # Check if our suffix appears in the response
                lines = response.text.split('\n')
                for line in lines:
                    if line.startswith(suffix):
                        # Password has been breached
                        return True

            return False

        except Exception as e:
            # If API call fails, log warning but don't block password
            logger.warning(f"Failed to check password breach status: {e}")
            return False

    def update_password_history(self, user_id: int, new_password_hash: str) -> None:
        """
        Add new password to history and clean up old entries.

        Args:
            user_id: User ID
            new_password_hash: Hashed new password
        """
        # Get user's security settings
        security_settings = self.db.query(SecuritySetting).filter(
            SecuritySetting.user_id == user_id
        ).first()

        history_count = security_settings.password_history_count if security_settings else 5

        # Add new password to history
        history_entry = PasswordHistory(
            user_id=user_id,
            hashed_password=new_password_hash
        )
        self.db.add(history_entry)

        # Clean up old entries beyond history count
        if history_count > 0:
            # Get all history entries for user, ordered by creation date
            all_entries = self.db.query(PasswordHistory).filter(
                PasswordHistory.user_id == user_id
            ).order_by(desc(PasswordHistory.created_at)).all()

            # Delete entries beyond the history count
            if len(all_entries) > history_count:
                entries_to_delete = all_entries[history_count:]
                for entry in entries_to_delete:
                    self.db.delete(entry)

        self.db.commit()

    def check_password_expiry(self, user: User) -> Tuple[bool, Optional[int]]:
        """
        Check if user's password has expired.

        Args:
            user: User object

        Returns:
            Tuple of (is_expired, days_until_expiry)
        """
        security_settings = self.db.query(SecuritySetting).filter(
            SecuritySetting.user_id == user.id
        ).first()

        if not security_settings or not security_settings.password_expiry_days:
            return False, None

        if not user.password_changed_at:
            # Password never changed, consider it expired if expiry is set
            return True, 0

        expiry_date = user.password_changed_at + timedelta(days=security_settings.password_expiry_days)
        now = datetime.utcnow()

        if now > expiry_date:
            return True, 0

        days_until_expiry = (expiry_date - now).days
        return False, days_until_expiry

    def require_password_change(self, user_id: int, reason: str) -> None:
        """
        Mark user as requiring a password change.

        Args:
            user_id: User ID
            reason: Reason for requiring password change
        """
        security_settings = self.db.query(SecuritySetting).filter(
            SecuritySetting.user_id == user_id
        ).first()

        if security_settings:
            security_settings.require_password_change = True
            self.db.commit()

        logger.info(f"Password change required for user {user_id}: {reason}")

    def clear_password_change_requirement(self, user_id: int) -> None:
        """
        Clear password change requirement after successful change.

        Args:
            user_id: User ID
        """
        security_settings = self.db.query(SecuritySetting).filter(
            SecuritySetting.user_id == user_id
        ).first()

        if security_settings:
            security_settings.require_password_change = False
            self.db.commit()