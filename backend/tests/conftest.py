"""
FastNext Backend Test Configuration

This module provides shared pytest fixtures and test configuration for the FastNext backend.
Includes database setup, authentication helpers, and common test utilities.
"""

import asyncio
import os
import tempfile
from typing import Any, Dict, Generator
from unittest.mock import patch

import pytest
from app.core.config import settings
from app.core.security import create_access_token, get_password_hash
from app.db.base import Base
from app.db.session import get_db
from app.models.permission import Permission
from app.models.role import Role
from app.models.user import User
from app.models.workflow import WorkflowState, WorkflowType
from fastapi import FastAPI
from fastapi.testclient import TestClient
from httpx import AsyncClient
from main import create_app
from sqlalchemy import StaticPool, create_engine
from sqlalchemy.orm import Session, sessionmaker

# Test Database Setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
def db() -> Generator[Session, None, None]:
    """Create a fresh database for each test."""
    # Create all tables
    Base.metadata.create_all(bind=engine)

    # Create session
    session = TestingSessionLocal()

    try:
        yield session
    finally:
        session.close()
        # Drop all tables after test
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def app(db: Session) -> FastAPI:
    """Create FastAPI app with test database."""

    def get_test_db():
        try:
            yield db
        finally:
            pass

    # Create app
    test_app = create_app()

    # Override database dependency
    test_app.dependency_overrides[get_db] = get_test_db

    return test_app


@pytest.fixture(scope="function")
def client(app: FastAPI) -> TestClient:
    """Create test client."""
    return TestClient(app)


@pytest.fixture(scope="function")
async def async_client(app: FastAPI) -> AsyncClient:
    """Create async test client."""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def admin_user(db: Session) -> User:
    """Create admin user for testing."""
    user = User(
        email="admin@test.com",
        username="admin",
        full_name="Test Admin",
        hashed_password=get_password_hash("testpassword"),
        is_active=True,
        is_superuser=True,
        is_verified=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def regular_user(db: Session) -> User:
    """Create regular user for testing."""
    user = User(
        email="user@test.com",
        username="user",
        full_name="Test User",
        hashed_password=get_password_hash("testpassword"),
        is_active=True,
        is_superuser=False,
        is_verified=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def inactive_user(db: Session) -> User:
    """Create inactive user for testing."""
    user = User(
        email="inactive@test.com",
        username="inactive",
        full_name="Inactive User",
        hashed_password=get_password_hash("testpassword"),
        is_active=False,
        is_superuser=False,
        is_verified=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def admin_token(admin_user: User) -> str:
    """Create JWT token for admin user."""
    return create_access_token(data={"sub": str(admin_user.id)})


@pytest.fixture
def user_token(regular_user: User) -> str:
    """Create JWT token for regular user."""
    return create_access_token(data={"sub": str(regular_user.id)})


@pytest.fixture
def admin_headers(admin_token: str) -> Dict[str, str]:
    """Create headers with admin authorization."""
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def user_headers(user_token: str) -> Dict[str, str]:
    """Create headers with user authorization."""
    return {"Authorization": f"Bearer {user_token}"}


@pytest.fixture
def sample_role(db: Session) -> Role:
    """Create sample role for testing."""
    role = Role(
        name="test_role", description="Test Role", is_active=True, is_system_role=False
    )
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


@pytest.fixture
def sample_permission(db: Session) -> Permission:
    """Create sample permission for testing."""
    permission = Permission(
        name="test_permission",
        description="Test Permission",
        action="read",
        resource="test",
        category="test",
        is_system_permission=False,
    )
    db.add(permission)
    db.commit()
    db.refresh(permission)
    return permission


@pytest.fixture
def sample_workflow_type(db: Session, admin_user: User) -> WorkflowType:
    """Create sample workflow type for testing."""
    workflow_type = WorkflowType(
        name="Test Workflow",
        description="Test workflow type",
        icon="TestIcon",
        color="#FF0000",
        is_active=True,
        created_by=admin_user.id,
    )
    db.add(workflow_type)
    db.commit()
    db.refresh(workflow_type)
    return workflow_type


@pytest.fixture
def sample_workflow_state(db: Session) -> WorkflowState:
    """Create sample workflow state for testing."""
    state = WorkflowState(
        name="test_state",
        label="Test State",
        description="Test workflow state",
        color="#00FF00",
        bg_color="#CCFFCC",
        icon="TestIcon",
        is_initial=True,
        is_final=False,
    )
    db.add(state)
    db.commit()
    db.refresh(state)
    return state


@pytest.fixture
def temp_file():
    """Create temporary file for testing."""
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        yield tmp.name
    os.unlink(tmp.name)


@pytest.fixture
def mock_settings():
    """Mock settings for testing."""
    test_settings = {
        "SECRET_KEY": "test-secret-key",
        "ACCESS_TOKEN_EXPIRE_MINUTES": 30,
        "SQLALCHEMY_DATABASE_URL": "sqlite:///./test.db",
    }

    with patch.object(settings, "__dict__", test_settings):
        yield test_settings


class TestDataFactory:
    """Factory for creating test data."""

    @staticmethod
    def create_user_data(**kwargs) -> Dict[str, Any]:
        """Create user data for testing."""
        default_data = {
            "email": "test@example.com",
            "username": "testuser",
            "full_name": "Test User",
            "password": "testpassword123",
            "is_active": True,
        }
        default_data.update(kwargs)
        return default_data

    @staticmethod
    def create_role_data(**kwargs) -> Dict[str, Any]:
        """Create role data for testing."""
        default_data = {
            "name": "test_role",
            "description": "Test Role Description",
            "is_active": True,
        }
        default_data.update(kwargs)
        return default_data

    @staticmethod
    def create_permission_data(**kwargs) -> Dict[str, Any]:
        """Create permission data for testing."""
        default_data = {
            "name": "test_permission",
            "description": "Test Permission Description",
            "action": "read",
            "resource": "test_resource",
            "category": "test",
        }
        default_data.update(kwargs)
        return default_data

    @staticmethod
    def create_workflow_type_data(**kwargs) -> Dict[str, Any]:
        """Create workflow type data for testing."""
        default_data = {
            "name": "Test Workflow Type",
            "description": "Test workflow type description",
            "icon": "TestIcon",
            "color": "#3B82F6",
        }
        default_data.update(kwargs)
        return default_data


@pytest.fixture
def test_data_factory():
    """Provide test data factory."""
    return TestDataFactory


# Test utilities
class TestUtils:
    """Utility functions for testing."""

    @staticmethod
    def assert_response_success(response, expected_status=200):
        """Assert response is successful."""
        assert response.status_code == expected_status
        assert response.headers["content-type"] == "application/json"

    @staticmethod
    def assert_response_error(response, expected_status=400):
        """Assert response is an error."""
        assert response.status_code == expected_status
        data = response.json()
        assert "success" in data
        assert data["success"] is False
        assert "error" in data

    @staticmethod
    def assert_pagination_response(response, expected_total=None):
        """Assert response has pagination structure."""
        TestUtils.assert_response_success(response)
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        assert "size" in data

        if expected_total is not None:
            assert data["total"] == expected_total


@pytest.fixture
def test_utils():
    """Provide test utilities."""
    return TestUtils
