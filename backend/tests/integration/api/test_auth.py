"""
Authentication API Integration Tests

Tests for /api/v1/auth/* endpoints using httpx.AsyncClient.
Tests real HTTP behavior, not just function calls.
"""

import pytest
from httpx import AsyncClient

from app.core.security import create_access_token, create_refresh_token


@pytest.mark.api
@pytest.mark.auth
class TestLoginEndpoint:
    """Tests for POST /api/v1/auth/login"""

    async def test_login_success(
        self,
        async_client: AsyncClient,
        test_user_with_password,
        test_password: str,
    ):
        """Successful login returns access and refresh tokens"""
        response = await async_client.post(
            "/api/v1/auth/login",
            json={
                "username": test_user_with_password.email,
                "password": test_password,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert data["expires_in"] > 0
        assert "user" in data
        assert data["user"]["email"] == test_user_with_password.email

    async def test_login_with_username(
        self,
        async_client: AsyncClient,
        test_user_with_password,
        test_password: str,
    ):
        """Login works with username as well as email"""
        response = await async_client.post(
            "/api/v1/auth/login",
            json={
                "username": test_user_with_password.username,
                "password": test_password,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data

    async def test_login_invalid_password(
        self,
        async_client: AsyncClient,
        test_user_with_password,
    ):
        """Invalid password returns 401"""
        response = await async_client.post(
            "/api/v1/auth/login",
            json={
                "username": test_user_with_password.email,
                "password": "WrongPassword123!",
            },
        )

        assert response.status_code == 401
        assert "detail" in response.json()

    async def test_login_nonexistent_user(
        self,
        async_client: AsyncClient,
    ):
        """Login with non-existent user returns 401"""
        response = await async_client.post(
            "/api/v1/auth/login",
            json={
                "username": "nonexistent@example.com",
                "password": "SomePassword123!",
            },
        )

        assert response.status_code == 401

    async def test_login_inactive_user(
        self,
        async_client: AsyncClient,
        inactive_user,
        test_password: str,
    ):
        """Login with inactive user returns 401"""
        response = await async_client.post(
            "/api/v1/auth/login",
            json={
                "username": inactive_user.email,
                "password": test_password,
            },
        )

        assert response.status_code == 401

    async def test_login_locked_user(
        self,
        async_client: AsyncClient,
        locked_user,
        test_password: str,
    ):
        """Login with locked user returns 401"""
        response = await async_client.post(
            "/api/v1/auth/login",
            json={
                "username": locked_user.email,
                "password": test_password,
            },
        )

        assert response.status_code == 401
        assert "locked" in response.json()["detail"].lower()

    async def test_login_missing_fields(
        self,
        async_client: AsyncClient,
    ):
        """Login without required fields returns 422"""
        response = await async_client.post(
            "/api/v1/auth/login",
            json={
                "username": "test@example.com",
                # missing password
            },
        )

        assert response.status_code == 422


@pytest.mark.api
@pytest.mark.auth
class TestRefreshTokenEndpoint:
    """Tests for POST /api/v1/auth/refresh"""

    async def test_refresh_token_success(
        self,
        async_client: AsyncClient,
        test_user_with_password,
    ):
        """Valid refresh token returns new access token"""
        refresh_token = create_refresh_token(user_id=test_user_with_password.id)

        response = await async_client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    async def test_refresh_with_invalid_token(
        self,
        async_client: AsyncClient,
    ):
        """Invalid refresh token returns 401"""
        response = await async_client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "invalid.token.here"},
        )

        assert response.status_code == 401

    async def test_refresh_with_access_token(
        self,
        async_client: AsyncClient,
        test_user_with_password,
    ):
        """Using access token for refresh returns 401"""
        access_token = create_access_token(user_id=test_user_with_password.id)

        response = await async_client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": access_token},  # Wrong token type
        )

        assert response.status_code == 401


@pytest.mark.api
@pytest.mark.auth
class TestMeEndpoint:
    """Tests for GET /api/v1/auth/me"""

    async def test_get_current_user(
        self,
        authenticated_client: AsyncClient,
        test_user_with_password,
    ):
        """Authenticated user can get their info"""
        response = await authenticated_client.get("/api/v1/auth/me")

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user_with_password.email
        assert data["username"] == test_user_with_password.username
        assert "id" in data

    async def test_get_current_user_unauthenticated(
        self,
        async_client: AsyncClient,
    ):
        """Unauthenticated request returns 403"""
        response = await async_client.get("/api/v1/auth/me")

        # FastAPI returns 403 for missing auth header
        assert response.status_code == 403

    async def test_get_current_user_invalid_token(
        self,
        async_client: AsyncClient,
    ):
        """Invalid token returns 401"""
        async_client.headers["Authorization"] = "Bearer invalid.token.here"
        response = await async_client.get("/api/v1/auth/me")

        assert response.status_code == 401


@pytest.mark.api
@pytest.mark.auth
class TestLogoutEndpoint:
    """Tests for POST /api/v1/auth/logout"""

    async def test_logout_success(
        self,
        authenticated_client: AsyncClient,
    ):
        """Authenticated user can logout"""
        response = await authenticated_client.post("/api/v1/auth/logout")

        assert response.status_code == 200
        assert "message" in response.json()

    async def test_logout_unauthenticated(
        self,
        async_client: AsyncClient,
    ):
        """Unauthenticated request returns 403"""
        response = await async_client.post("/api/v1/auth/logout")

        assert response.status_code == 403


@pytest.mark.api
@pytest.mark.auth
class TestPermissionsEndpoint:
    """Tests for GET /api/v1/auth/permissions"""

    async def test_get_permissions(
        self,
        authenticated_client: AsyncClient,
    ):
        """Authenticated user can get their permissions"""
        response = await authenticated_client.get("/api/v1/auth/permissions")

        assert response.status_code == 200
        data = response.json()
        assert "permissions" in data
        assert "is_superuser" in data
        assert isinstance(data["permissions"], list)

    async def test_get_permissions_admin(
        self,
        admin_client: AsyncClient,
    ):
        """Admin user shows is_superuser=True"""
        response = await admin_client.get("/api/v1/auth/permissions")

        assert response.status_code == 200
        data = response.json()
        assert data["is_superuser"] is True


@pytest.mark.api
@pytest.mark.auth
class TestPasswordChangeEndpoint:
    """Tests for POST /api/v1/auth/change-password"""

    async def test_change_password_success(
        self,
        authenticated_client: AsyncClient,
        test_password: str,
    ):
        """User can change their password"""
        new_password = "NewSecurePass456!"

        response = await authenticated_client.post(
            "/api/v1/auth/change-password",
            json={
                "current_password": test_password,
                "new_password": new_password,
            },
        )

        assert response.status_code == 200
        assert "message" in response.json()

    async def test_change_password_wrong_current(
        self,
        authenticated_client: AsyncClient,
    ):
        """Wrong current password returns 400"""
        response = await authenticated_client.post(
            "/api/v1/auth/change-password",
            json={
                "current_password": "WrongPassword123!",
                "new_password": "NewSecurePass456!",
            },
        )

        assert response.status_code == 400


@pytest.mark.api
@pytest.mark.auth
class TestTwoFactorEndpoints:
    """Tests for 2FA endpoints"""

    async def test_setup_2fa(
        self,
        authenticated_client: AsyncClient,
    ):
        """User can initiate 2FA setup"""
        response = await authenticated_client.post("/api/v1/auth/2fa/setup")

        assert response.status_code == 200
        data = response.json()
        assert "secret" in data
        assert "qr_code" in data
        assert "backup_codes" in data
        assert len(data["backup_codes"]) == 10
