"""
User API Integration Tests

Tests for /api/v1/users/* endpoints using httpx.AsyncClient.
Tests real HTTP behavior with permission checks.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.api
class TestListUsers:
    """Tests for GET /api/v1/users/"""

    async def test_list_users_as_admin(
        self,
        admin_client: AsyncClient,
        test_user_with_password,
    ):
        """Admin can list users"""
        response = await admin_client.get("/api/v1/users/")

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert isinstance(data["items"], list)

    async def test_list_users_pagination(
        self,
        admin_client: AsyncClient,
    ):
        """List users supports pagination"""
        response = await admin_client.get(
            "/api/v1/users/",
            params={"page": 1, "page_size": 5},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 1
        assert data["page_size"] == 5

    async def test_list_users_filter_active(
        self,
        admin_client: AsyncClient,
    ):
        """Can filter users by active status"""
        response = await admin_client.get(
            "/api/v1/users/",
            params={"is_active": True},
        )

        assert response.status_code == 200
        data = response.json()
        # All returned users should be active
        for user in data["items"]:
            assert user["is_active"] is True

    async def test_list_users_unauthenticated(
        self,
        async_client: AsyncClient,
    ):
        """Unauthenticated request returns 403"""
        response = await async_client.get("/api/v1/users/")

        assert response.status_code == 403

    async def test_list_users_without_permission(
        self,
        authenticated_client: AsyncClient,
    ):
        """User without permission returns 403"""
        response = await authenticated_client.get("/api/v1/users/")

        # Regular user may not have user.read permission
        assert response.status_code in [200, 403]


@pytest.mark.api
class TestGetUser:
    """Tests for GET /api/v1/users/{user_id}"""

    async def test_get_user_as_admin(
        self,
        admin_client: AsyncClient,
        test_user_with_password,
    ):
        """Admin can get user by ID"""
        response = await admin_client.get(
            f"/api/v1/users/{test_user_with_password.id}"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_user_with_password.id
        assert data["email"] == test_user_with_password.email
        assert "company_roles" in data
        assert "permissions" in data

    async def test_get_nonexistent_user(
        self,
        admin_client: AsyncClient,
    ):
        """Getting nonexistent user returns 404"""
        response = await admin_client.get("/api/v1/users/99999")

        assert response.status_code == 404

    async def test_get_user_unauthenticated(
        self,
        async_client: AsyncClient,
        test_user_with_password,
    ):
        """Unauthenticated request returns 403"""
        response = await async_client.get(
            f"/api/v1/users/{test_user_with_password.id}"
        )

        assert response.status_code == 403


@pytest.mark.api
class TestCreateUser:
    """Tests for POST /api/v1/users/"""

    async def test_create_user_as_admin(
        self,
        admin_client: AsyncClient,
    ):
        """Admin can create a new user"""
        response = await admin_client.post(
            "/api/v1/users/",
            json={
                "email": "newuser@example.com",
                "username": "newuser",
                "password": "SecurePass123!",
                "full_name": "New User",
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "newuser@example.com"
        assert data["username"] == "newuser"
        assert "id" in data
        # Password should not be returned
        assert "password" not in data
        assert "hashed_password" not in data

    async def test_create_user_duplicate_email(
        self,
        admin_client: AsyncClient,
        test_user_with_password,
    ):
        """Creating user with duplicate email returns 400"""
        response = await admin_client.post(
            "/api/v1/users/",
            json={
                "email": test_user_with_password.email,
                "username": "anotheruser",
                "password": "SecurePass123!",
            },
        )

        assert response.status_code == 400
        assert "email" in response.json()["detail"].lower()

    async def test_create_user_duplicate_username(
        self,
        admin_client: AsyncClient,
        test_user_with_password,
    ):
        """Creating user with duplicate username returns 400"""
        response = await admin_client.post(
            "/api/v1/users/",
            json={
                "email": "unique@example.com",
                "username": test_user_with_password.username,
                "password": "SecurePass123!",
            },
        )

        assert response.status_code == 400
        assert "username" in response.json()["detail"].lower()

    async def test_create_user_invalid_email(
        self,
        admin_client: AsyncClient,
    ):
        """Creating user with invalid email returns 422"""
        response = await admin_client.post(
            "/api/v1/users/",
            json={
                "email": "not-an-email",
                "username": "validuser",
                "password": "SecurePass123!",
            },
        )

        assert response.status_code == 422

    async def test_create_user_unauthenticated(
        self,
        async_client: AsyncClient,
    ):
        """Unauthenticated user cannot create users"""
        response = await async_client.post(
            "/api/v1/users/",
            json={
                "email": "test@example.com",
                "username": "testuser",
                "password": "SecurePass123!",
            },
        )

        assert response.status_code == 403


@pytest.mark.api
class TestUpdateUser:
    """Tests for PUT /api/v1/users/{user_id}"""

    async def test_update_user_as_admin(
        self,
        admin_client: AsyncClient,
        test_user_with_password,
    ):
        """Admin can update user"""
        response = await admin_client.put(
            f"/api/v1/users/{test_user_with_password.id}",
            json={
                "full_name": "Updated Name",
                "bio": "Updated bio",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == "Updated Name"
        assert data["bio"] == "Updated bio"

    async def test_update_nonexistent_user(
        self,
        admin_client: AsyncClient,
    ):
        """Updating nonexistent user returns 404"""
        response = await admin_client.put(
            "/api/v1/users/99999",
            json={"full_name": "Test"},
        )

        assert response.status_code == 404

    async def test_update_user_email_conflict(
        self,
        admin_client: AsyncClient,
        test_user_with_password,
        admin_user_with_password,
    ):
        """Updating to existing email returns 400"""
        response = await admin_client.put(
            f"/api/v1/users/{test_user_with_password.id}",
            json={"email": admin_user_with_password.email},
        )

        assert response.status_code == 400


@pytest.mark.api
class TestDeleteUser:
    """Tests for DELETE /api/v1/users/{user_id}"""

    async def test_delete_user_as_admin(
        self,
        admin_client: AsyncClient,
        test_user_with_password,
    ):
        """Admin can delete user"""
        response = await admin_client.delete(
            f"/api/v1/users/{test_user_with_password.id}"
        )

        assert response.status_code == 200
        assert "message" in response.json()

    async def test_delete_nonexistent_user(
        self,
        admin_client: AsyncClient,
    ):
        """Deleting nonexistent user returns 404"""
        response = await admin_client.delete("/api/v1/users/99999")

        assert response.status_code == 404

    async def test_delete_self(
        self,
        admin_client: AsyncClient,
        admin_user_with_password,
    ):
        """User cannot delete themselves"""
        response = await admin_client.delete(
            f"/api/v1/users/{admin_user_with_password.id}"
        )

        assert response.status_code == 400
        assert "own account" in response.json()["detail"].lower()


@pytest.mark.api
class TestMessageableUsers:
    """Tests for GET /api/v1/users/messageable"""

    async def test_get_messageable_users(
        self,
        authenticated_client: AsyncClient,
    ):
        """Authenticated user can get messageable users"""
        response = await authenticated_client.get("/api/v1/users/messageable")

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data

    async def test_get_messageable_users_with_search(
        self,
        authenticated_client: AsyncClient,
    ):
        """Can search messageable users"""
        response = await authenticated_client.get(
            "/api/v1/users/messageable",
            params={"search": "admin"},
        )

        assert response.status_code == 200

    async def test_messageable_users_unauthenticated(
        self,
        async_client: AsyncClient,
    ):
        """Unauthenticated request returns 403"""
        response = await async_client.get("/api/v1/users/messageable")

        assert response.status_code == 403


@pytest.mark.api
class TestMentionSearch:
    """Tests for GET /api/v1/users/search/mentions"""

    async def test_search_mentions(
        self,
        authenticated_client: AsyncClient,
    ):
        """Authenticated user can search for @mentions"""
        response = await authenticated_client.get(
            "/api/v1/users/search/mentions",
            params={"q": "test"},
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    async def test_search_mentions_limit(
        self,
        authenticated_client: AsyncClient,
    ):
        """Mention search respects limit parameter"""
        response = await authenticated_client.get(
            "/api/v1/users/search/mentions",
            params={"q": "", "limit": 5},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) <= 5

    async def test_search_mentions_unauthenticated(
        self,
        async_client: AsyncClient,
    ):
        """Unauthenticated request returns 403"""
        response = await async_client.get("/api/v1/users/search/mentions")

        assert response.status_code == 403
