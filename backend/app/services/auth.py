"""Authentication service"""

from datetime import timedelta
from typing import Optional, Tuple

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    verify_password,
    verify_totp,
    setup_2fa,
    decode_token,
)
from app.models import User, AuditLog
from app.models.audit import AuditAction
from app.services.user import UserService


class AuthService:
    """Authentication service"""

    def __init__(self, db: Session):
        self.db = db
        self.user_service = UserService(db)

    def authenticate(
        self,
        username_or_email: str,
        password: str,
        ip_address: Optional[str] = None,
    ) -> Tuple[Optional[User], str]:
        """
        Authenticate user with username/email and password.

        Returns:
            Tuple of (user, error_message)
            - If successful: (user, "")
            - If failed: (None, error_message)
        """
        user = self.user_service.get_by_email_or_username(username_or_email)

        if not user:
            return None, "Invalid credentials"

        # Check if account is locked
        if user.is_locked():
            return None, "Account is temporarily locked due to too many failed attempts"

        # Check if account is active
        if not user.is_active:
            return None, "Account is inactive"

        # Verify password
        if not verify_password(password, user.hashed_password):
            user.increment_failed_attempts()
            self.db.flush()

            # Log failed attempt
            AuditLog.log(
                db=self.db,
                action=AuditAction.LOGIN_FAILED,
                entity_type="user",
                entity_id=user.id,
                user_id=user.id,
                description="Failed login attempt",
                ip_address=ip_address,
            )

            return None, "Invalid credentials"

        return user, ""

    def login(
        self,
        user: User,
        two_factor_code: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> Tuple[Optional[dict], str]:
        """
        Complete login process (after password verification).

        Returns:
            Tuple of (token_data, error_message)
        """
        # Check 2FA if enabled
        if user.two_factor_enabled:
            if not two_factor_code:
                return None, "2FA code required"

            if not self.verify_2fa(user, two_factor_code):
                return None, "Invalid 2FA code"

        # Record successful login
        user.record_login(ip_address)
        self.db.flush()

        # Log successful login
        AuditLog.log(
            db=self.db,
            action=AuditAction.LOGIN,
            entity_type="user",
            entity_id=user.id,
            user_id=user.id,
            company_id=user.current_company_id,
            description="Successful login",
            ip_address=ip_address,
        )

        # Generate tokens
        access_token = create_access_token(
            user_id=user.id,
            company_id=user.current_company_id,
        )
        refresh_token = create_refresh_token(user_id=user.id)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        }, ""

    def refresh_access_token(
        self,
        refresh_token: str,
    ) -> Tuple[Optional[str], str]:
        """
        Refresh access token using refresh token.

        Returns:
            Tuple of (new_access_token, error_message)
        """
        payload = decode_token(refresh_token)

        if not payload:
            return None, "Invalid refresh token"

        if payload.get("type") != "refresh":
            return None, "Invalid token type"

        user_id = payload.get("sub")
        if not user_id:
            return None, "Invalid token payload"

        user = self.user_service.get(int(user_id))
        if not user:
            return None, "User not found"

        if not user.is_active:
            return None, "User is inactive"

        # Generate new access token
        access_token = create_access_token(
            user_id=user.id,
            company_id=user.current_company_id,
        )

        return access_token, ""

    def setup_two_factor(self, user: User) -> dict:
        """
        Set up 2FA for a user.

        Returns:
            Dict with secret, qr_code, and backup_codes
        """
        secret, qr_code, backup_codes = setup_2fa(user.email)

        # Store secret (will be activated after verification)
        user.two_factor_secret = secret
        user.backup_codes = backup_codes
        self.db.flush()

        return {
            "secret": secret,
            "qr_code": qr_code,
            "backup_codes": backup_codes,
        }

    def verify_and_enable_2fa(self, user: User, code: str) -> bool:
        """
        Verify 2FA code and enable 2FA for user.
        """
        if not user.two_factor_secret:
            return False

        if not verify_totp(user.two_factor_secret, code):
            return False

        user.enable_2fa(user.two_factor_secret)
        self.db.flush()

        # Log 2FA enable
        AuditLog.log(
            db=self.db,
            action=AuditAction.TWO_FACTOR_ENABLE,
            entity_type="user",
            entity_id=user.id,
            user_id=user.id,
            description="Two-factor authentication enabled",
        )

        return True

    def disable_2fa(self, user: User) -> bool:
        """Disable 2FA for user"""
        if not user.two_factor_enabled:
            return False

        user.disable_2fa()
        self.db.flush()

        # Log 2FA disable
        AuditLog.log(
            db=self.db,
            action=AuditAction.TWO_FACTOR_DISABLE,
            entity_type="user",
            entity_id=user.id,
            user_id=user.id,
            description="Two-factor authentication disabled",
        )

        return True

    def verify_2fa(self, user: User, code: str) -> bool:
        """
        Verify 2FA code (TOTP or backup code).
        """
        if not user.two_factor_enabled or not user.two_factor_secret:
            return False

        # Try TOTP code first
        if verify_totp(user.two_factor_secret, code):
            return True

        # Try backup code
        if user.use_backup_code(code):
            self.db.flush()
            return True

        return False

    def logout(
        self,
        user: User,
        ip_address: Optional[str] = None,
    ):
        """Log user logout"""
        AuditLog.log(
            db=self.db,
            action=AuditAction.LOGOUT,
            entity_type="user",
            entity_id=user.id,
            user_id=user.id,
            company_id=user.current_company_id,
            description="User logged out",
            ip_address=ip_address,
        )
        self.db.flush()
