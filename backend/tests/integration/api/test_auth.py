"""
Integration tests for authentication API endpoints.

Tests login, registration, token validation, and password management.
"""

import pytest
from fastapi.testclient import TestClient

from tests.factories import UserFactory, AdminUserFactory


class TestAuthLogin:
    """Tests for login endpoint."""

    @pytest.mark.integration
    @pytest.mark.auth
    def test_login_success(self, client: TestClient, db):
        """Test successful login."""
        # Create user with known password
        user = UserFactory(email="login@test.com", username="loginuser")

        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": "login@test.com",
                "password": "testpassword123",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    @pytest.mark.integration
    @pytest.mark.auth
    def test_login_invalid_password(self, client: TestClient, db):
        """Test login with wrong password."""
        user = UserFactory(email="wrong@test.com", username="wrongpass")

        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": "wrong@test.com",
                "password": "wrongpassword",
            },
        )

        assert response.status_code == 401

    @pytest.mark.integration
    @pytest.mark.auth
    def test_login_inactive_user(self, client: TestClient, db):
        """Test login with inactive user."""
        from tests.factories import InactiveUserFactory

        user = InactiveUserFactory(email="inactive@test.com", username="inactivelogin")

        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": "inactive@test.com",
                "password": "testpassword123",
            },
        )

        assert response.status_code in [400, 401, 403]

    @pytest.mark.integration
    @pytest.mark.auth
    def test_login_nonexistent_user(self, client: TestClient, db):
        """Test login with non-existent user."""
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": "nonexistent@test.com",
                "password": "anypassword",
            },
        )

        assert response.status_code in [401, 404]


class TestAuthProtectedRoutes:
    """Tests for protected route access."""

    @pytest.mark.integration
    @pytest.mark.auth
    def test_access_protected_route_with_token(
        self, client: TestClient, db, admin_headers
    ):
        """Test accessing protected route with valid token."""
        response = client.get("/api/v1/users/me", headers=admin_headers)
        assert response.status_code == 200

    @pytest.mark.integration
    @pytest.mark.auth
    def test_access_protected_route_without_token(self, client: TestClient, db):
        """Test accessing protected route without token."""
        response = client.get("/api/v1/users/me")
        assert response.status_code == 401

    @pytest.mark.integration
    @pytest.mark.auth
    def test_access_protected_route_invalid_token(self, client: TestClient, db):
        """Test accessing protected route with invalid token."""
        response = client.get(
            "/api/v1/users/me",
            headers={"Authorization": "Bearer invalid_token"},
        )
        assert response.status_code == 401


class TestAuthCurrentUser:
    """Tests for current user endpoint."""

    @pytest.mark.integration
    @pytest.mark.auth
    def test_get_current_user(self, client: TestClient, db, admin_user, admin_headers):
        """Test getting current user info."""
        response = client.get("/api/v1/users/me", headers=admin_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == admin_user.email
        assert data["username"] == admin_user.username

    @pytest.mark.integration
    @pytest.mark.auth
    def test_update_current_user(
        self, client: TestClient, db, admin_user, admin_headers
    ):
        """Test updating current user profile."""
        response = client.patch(
            "/api/v1/users/me",
            headers=admin_headers,
            json={
                "full_name": "Updated Name",
                "bio": "Updated bio",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == "Updated Name"
