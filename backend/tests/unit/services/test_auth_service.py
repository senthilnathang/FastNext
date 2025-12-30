"""
Auth Service Unit Tests

Tests for AuthService functionality including:
- Authentication (password verification)
- Login (token generation)
- Token refresh
- Two-factor authentication
"""

import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock

from app.core.security import (
    get_password_hash,
    create_refresh_token,
    verify_password,
)
from app.services.auth import AuthService
from app.models import User


@pytest.mark.unit
@pytest.mark.security
class TestAuthenticate:
    """Tests for AuthService.authenticate()"""

    def test_authenticate_valid_credentials(
        self,
        db_session,
        test_user_with_password,
        test_password: str,
    ):
        """Valid credentials return user and no error"""
        service = AuthService(db_session)

        user, error = service.authenticate(
            test_user_with_password.email,
            test_password,
            "127.0.0.1",
        )

        assert user is not None
        assert user.id == test_user_with_password.id
        assert error == ""

    def test_authenticate_with_username(
        self,
        db_session,
        test_user_with_password,
        test_password: str,
    ):
        """Can authenticate with username instead of email"""
        service = AuthService(db_session)

        user, error = service.authenticate(
            test_user_with_password.username,
            test_password,
            "127.0.0.1",
        )

        assert user is not None
        assert error == ""

    def test_authenticate_invalid_password(
        self,
        db_session,
        test_user_with_password,
    ):
        """Invalid password returns None and error"""
        service = AuthService(db_session)

        user, error = service.authenticate(
            test_user_with_password.email,
            "WrongPassword123!",
            "127.0.0.1",
        )

        assert user is None
        assert "invalid" in error.lower()

    def test_authenticate_nonexistent_user(
        self,
        db_session,
    ):
        """Nonexistent user returns None and error"""
        service = AuthService(db_session)

        user, error = service.authenticate(
            "nonexistent@example.com",
            "SomePassword123!",
            "127.0.0.1",
        )

        assert user is None
        assert "invalid" in error.lower()

    def test_authenticate_inactive_user(
        self,
        db_session,
        inactive_user,
        test_password: str,
    ):
        """Inactive user returns None and error"""
        service = AuthService(db_session)

        user, error = service.authenticate(
            inactive_user.email,
            test_password,
            "127.0.0.1",
        )

        assert user is None
        assert "inactive" in error.lower()

    def test_authenticate_locked_user(
        self,
        db_session,
        locked_user,
        test_password: str,
    ):
        """Locked user returns None and error"""
        service = AuthService(db_session)

        user, error = service.authenticate(
            locked_user.email,
            test_password,
            "127.0.0.1",
        )

        assert user is None
        assert "locked" in error.lower()

    def test_authenticate_increments_failed_attempts(
        self,
        db_session,
        test_user_with_password,
    ):
        """Failed auth increments failed_login_attempts"""
        service = AuthService(db_session)
        initial_attempts = test_user_with_password.failed_login_attempts or 0

        service.authenticate(
            test_user_with_password.email,
            "WrongPassword123!",
            "127.0.0.1",
        )

        db_session.refresh(test_user_with_password)
        assert test_user_with_password.failed_login_attempts == initial_attempts + 1


@pytest.mark.unit
@pytest.mark.security
class TestLogin:
    """Tests for AuthService.login()"""

    def test_login_returns_tokens(
        self,
        db_session,
        test_user_with_password,
    ):
        """Successful login returns access and refresh tokens"""
        service = AuthService(db_session)

        token_data, error = service.login(
            test_user_with_password,
            two_factor_code=None,
            ip_address="127.0.0.1",
        )

        assert token_data is not None
        assert "access_token" in token_data
        assert "refresh_token" in token_data
        assert token_data["token_type"] == "bearer"
        assert error == ""

    def test_login_records_last_login(
        self,
        db_session,
        test_user_with_password,
    ):
        """Login updates last_login_at timestamp"""
        service = AuthService(db_session)
        before = test_user_with_password.last_login_at

        service.login(
            test_user_with_password,
            two_factor_code=None,
            ip_address="127.0.0.1",
        )

        db_session.refresh(test_user_with_password)
        assert test_user_with_password.last_login_at is not None
        if before:
            assert test_user_with_password.last_login_at > before


@pytest.mark.unit
@pytest.mark.security
class TestRefreshAccessToken:
    """Tests for AuthService.refresh_access_token()"""

    def test_refresh_valid_token(
        self,
        db_session,
        test_user_with_password,
    ):
        """Valid refresh token returns new access token"""
        service = AuthService(db_session)
        refresh_token = create_refresh_token(user_id=test_user_with_password.id)

        access_token, error = service.refresh_access_token(refresh_token)

        assert access_token is not None
        assert error == ""

    def test_refresh_invalid_token(
        self,
        db_session,
    ):
        """Invalid token returns None and error"""
        service = AuthService(db_session)

        access_token, error = service.refresh_access_token("invalid.token.here")

        assert access_token is None
        assert "invalid" in error.lower()

    def test_refresh_with_access_token(
        self,
        db_session,
        test_user_with_password,
    ):
        """Using access token for refresh returns error"""
        from app.core.security import create_access_token

        service = AuthService(db_session)
        access_token = create_access_token(user_id=test_user_with_password.id)

        result, error = service.refresh_access_token(access_token)

        assert result is None
        assert "invalid" in error.lower() or "type" in error.lower()

    def test_refresh_inactive_user(
        self,
        db_session,
        inactive_user,
    ):
        """Refresh for inactive user returns error"""
        service = AuthService(db_session)
        refresh_token = create_refresh_token(user_id=inactive_user.id)

        access_token, error = service.refresh_access_token(refresh_token)

        assert access_token is None
        assert "inactive" in error.lower()


@pytest.mark.unit
@pytest.mark.security
class TestTwoFactor:
    """Tests for 2FA functionality"""

    def test_setup_2fa_returns_secret_and_codes(
        self,
        db_session,
        test_user_with_password,
    ):
        """setup_two_factor returns secret, qr_code, and backup_codes"""
        service = AuthService(db_session)

        result = service.setup_two_factor(test_user_with_password)

        assert "secret" in result
        assert "qr_code" in result
        assert "backup_codes" in result
        assert len(result["backup_codes"]) == 10

    def test_setup_2fa_stores_secret(
        self,
        db_session,
        test_user_with_password,
    ):
        """setup_two_factor stores secret on user"""
        service = AuthService(db_session)

        result = service.setup_two_factor(test_user_with_password)

        db_session.refresh(test_user_with_password)
        assert test_user_with_password.two_factor_secret == result["secret"]

    def test_verify_and_enable_2fa_with_valid_code(
        self,
        db_session,
        test_user_with_password,
    ):
        """Valid TOTP code enables 2FA"""
        import pyotp

        service = AuthService(db_session)

        # Setup 2FA first
        result = service.setup_two_factor(test_user_with_password)
        secret = result["secret"]

        # Generate valid TOTP code
        totp = pyotp.TOTP(secret)
        valid_code = totp.now()

        # Verify and enable
        success = service.verify_and_enable_2fa(test_user_with_password, valid_code)

        assert success is True
        db_session.refresh(test_user_with_password)
        assert test_user_with_password.two_factor_enabled is True

    def test_verify_2fa_with_invalid_code(
        self,
        db_session,
        test_user_with_password,
    ):
        """Invalid code doesn't enable 2FA"""
        service = AuthService(db_session)

        # Setup 2FA first
        service.setup_two_factor(test_user_with_password)

        # Try invalid code
        success = service.verify_and_enable_2fa(test_user_with_password, "000000")

        assert success is False
        db_session.refresh(test_user_with_password)
        assert test_user_with_password.two_factor_enabled is False

    def test_disable_2fa(
        self,
        db_session,
        test_user_with_password,
    ):
        """Can disable 2FA on user"""
        import pyotp

        service = AuthService(db_session)

        # Setup and enable 2FA
        result = service.setup_two_factor(test_user_with_password)
        totp = pyotp.TOTP(result["secret"])
        service.verify_and_enable_2fa(test_user_with_password, totp.now())

        # Disable
        success = service.disable_2fa(test_user_with_password)

        assert success is True
        db_session.refresh(test_user_with_password)
        assert test_user_with_password.two_factor_enabled is False


@pytest.mark.unit
@pytest.mark.security
class TestPasswordVerification:
    """Tests for password hashing and verification"""

    def test_password_hash_is_different(self):
        """Hashing same password twice produces different hashes"""
        password = "TestPassword123!"
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)

        assert hash1 != hash2  # bcrypt uses random salt

    def test_password_verify_correct(self):
        """Correct password verifies successfully"""
        password = "TestPassword123!"
        hashed = get_password_hash(password)

        assert verify_password(password, hashed) is True

    def test_password_verify_incorrect(self):
        """Incorrect password fails verification"""
        password = "TestPassword123!"
        hashed = get_password_hash(password)

        assert verify_password("WrongPassword!", hashed) is False
