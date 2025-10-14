"""
API tests for user management endpoints.

Tests CRUD operations for users, including admin-only endpoints.
"""

import pytest
from fastapi import status


class TestUsersAPI:
    """Test user management API endpoints."""

    def test_get_users_admin(self, client, admin_headers, admin_user, regular_user):
        """Test getting users list as admin."""
        response = client.get("/api/v1/users", headers=admin_headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] >= 2  # At least admin and regular user

        # Check user data structure
        user_data = data["items"][0]
        assert "id" in user_data
        assert "email" in user_data
        assert "username" in user_data
        assert "is_active" in user_data
        assert (
            "hashed_password" not in user_data
        )  # Sensitive data should not be returned

    def test_get_users_regular_user(self, client, user_headers):
        """Test getting users list as regular user (should fail)."""
        response = client.get("/api/v1/users", headers=user_headers)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_get_users_unauthorized(self, client):
        """Test getting users list without authentication."""
        response = client.get("/api/v1/users")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_get_users_with_search(self, client, admin_headers, admin_user):
        """Test searching users."""
        response = client.get(
            "/api/v1/users", headers=admin_headers, params={"search": "admin"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total"] >= 1

        # Check that returned user matches search
        found_admin = any(user["username"] == "admin" for user in data["items"])
        assert found_admin

    def test_get_users_with_pagination(self, client, admin_headers):
        """Test user pagination."""
        response = client.get(
            "/api/v1/users", headers=admin_headers, params={"skip": 0, "limit": 1}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["items"]) <= 1
        assert "page" in data
        assert "pages" in data

    def test_create_user_admin(self, client, admin_headers, test_data_factory):
        """Test creating user as admin."""
        user_data = test_data_factory.create_user_data(
            email="newuser@test.com", username="newuser"
        )

        response = client.post("/api/v1/users", headers=admin_headers, json=user_data)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["email"] == "newuser@test.com"
        assert data["username"] == "newuser"
        assert data["is_active"] is True
        assert "password" not in data

    def test_create_user_duplicate_email(
        self, client, admin_headers, admin_user, test_data_factory
    ):
        """Test creating user with duplicate email."""
        user_data = test_data_factory.create_user_data(
            email="admin@test.com", username="newadmin"  # Already exists
        )

        response = client.post("/api/v1/users", headers=admin_headers, json=user_data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_user_duplicate_username(
        self, client, admin_headers, admin_user, test_data_factory
    ):
        """Test creating user with duplicate username."""
        user_data = test_data_factory.create_user_data(
            email="newadmin@test.com", username="admin"  # Already exists
        )

        response = client.post("/api/v1/users", headers=admin_headers, json=user_data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_user_regular_user(self, client, user_headers, test_data_factory):
        """Test creating user as regular user (should fail)."""
        user_data = test_data_factory.create_user_data()

        response = client.post("/api/v1/users", headers=user_headers, json=user_data)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_get_user_by_id_admin(self, client, admin_headers, regular_user):
        """Test getting user by ID as admin."""
        response = client.get(f"/api/v1/users/{regular_user.id}", headers=admin_headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == regular_user.id
        assert data["email"] == regular_user.email
        assert data["username"] == regular_user.username

    def test_get_user_by_id_not_found(self, client, admin_headers):
        """Test getting non-existent user."""
        response = client.get("/api/v1/users/99999", headers=admin_headers)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_user_admin(self, client, admin_headers, regular_user):
        """Test updating user as admin."""
        update_data = {"full_name": "Updated Name", "is_active": False}

        response = client.put(
            f"/api/v1/users/{regular_user.id}", headers=admin_headers, json=update_data
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["full_name"] == "Updated Name"
        assert data["is_active"] is False

    def test_update_user_regular_user(self, client, user_headers, admin_user):
        """Test updating user as regular user (should fail)."""
        update_data = {"full_name": "Hacked Name"}

        response = client.put(
            f"/api/v1/users/{admin_user.id}", headers=user_headers, json=update_data
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_delete_user_admin(self, client, admin_headers, regular_user):
        """Test deleting user as admin."""
        response = client.delete(
            f"/api/v1/users/{regular_user.id}", headers=admin_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "message" in data

        # Verify user is deactivated (soft delete)
        get_response = client.get(
            f"/api/v1/users/{regular_user.id}", headers=admin_headers
        )
        assert get_response.status_code == status.HTTP_200_OK
        user_data = get_response.json()
        assert user_data["is_active"] is False

    def test_delete_superuser_protection(self, client, admin_headers, admin_user):
        """Test that superuser cannot be deleted."""
        response = client.delete(
            f"/api/v1/users/{admin_user.id}", headers=admin_headers
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_toggle_user_status_admin(self, client, admin_headers, regular_user):
        """Test toggling user status as admin."""
        original_status = regular_user.is_active

        response = client.patch(
            f"/api/v1/users/{regular_user.id}/toggle-status", headers=admin_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["is_active"] is not original_status

    def test_toggle_superuser_status_protection(
        self, client, admin_headers, admin_user
    ):
        """Test that superuser status cannot be toggled."""
        response = client.patch(
            f"/api/v1/users/{admin_user.id}/toggle-status", headers=admin_headers
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestUserSelfManagement:
    """Test user self-management endpoints."""

    def test_get_current_user(self, client, user_headers, regular_user):
        """Test getting current user profile."""
        response = client.get("/api/v1/users/me", headers=user_headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == regular_user.id
        assert data["email"] == regular_user.email

    def test_update_current_user(self, client, user_headers):
        """Test updating current user profile."""
        update_data = {"full_name": "Updated Self Name", "bio": "Updated bio"}

        response = client.put(
            "/api/v1/users/me", headers=user_headers, json=update_data
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["full_name"] == "Updated Self Name"

    def test_update_current_user_password(self, client, user_headers):
        """Test updating current user password."""
        update_data = {"password": "newpassword123"}

        response = client.put(
            "/api/v1/users/me", headers=user_headers, json=update_data
        )

        assert response.status_code == status.HTTP_200_OK
        # Password should be hashed, not returned
        data = response.json()
        assert "password" not in data
        assert "hashed_password" not in data
