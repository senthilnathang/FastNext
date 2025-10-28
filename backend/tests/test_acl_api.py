import pytest
from app.auth.deps import get_current_active_user
from app.db.base import Base
from app.db.session import get_db
from main import app
from app.models.user import User
from app.models.workflow import AccessControlList, RecordPermission
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Test database setup
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///./test_acl_api.db"
engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Override database dependency for testing"""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


def override_get_current_user():
    """Override current user dependency for testing"""
    return User(
        id=1,
        email="test@example.com",
        username="testuser",
        full_name="Test User",
        is_active=True,
        is_superuser=True,
    )


app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_active_user] = override_get_current_user

client = TestClient(app)


@pytest.fixture(scope="function")
def setup_database():
    """Setup test database"""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def test_create_acl(setup_database):
    """Test creating a new ACL"""
    acl_data = {
        "name": "test_acl",
        "description": "Test ACL for orders",
        "entity_type": "orders",
        "operation": "read",
        "allowed_roles": ["admin", "manager"],
        "priority": 100,
        "is_active": True
    }

    response = client.post("/api/v1/acls", json=acl_data)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "test_acl"
    assert data["entity_type"] == "orders"
    assert data["operation"] == "read"


def test_read_acls(setup_database):
    """Test reading ACLs"""
    # Create test ACL first
    acl_data = {
        "name": "test_acl_read",
        "description": "Test ACL for reading",
        "entity_type": "orders",
        "operation": "read",
        "allowed_roles": ["admin"],
        "priority": 100,
        "is_active": True
    }
    client.post("/api/v1/acls", json=acl_data)

    response = client.get("/api/v1/acls")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) >= 1
    assert any(acl["name"] == "test_acl_read" for acl in data["items"])


def test_update_acl(setup_database):
    """Test updating an ACL"""
    # Create test ACL
    acl_data = {
        "name": "test_acl_update",
        "description": "Test ACL for updating",
        "entity_type": "orders",
        "operation": "read",
        "allowed_roles": ["admin"],
        "priority": 100,
        "is_active": True
    }
    create_response = client.post("/api/v1/acls", json=acl_data)
    acl_id = create_response.json()["id"]

    # Update ACL
    update_data = {
        "name": "test_acl_updated",
        "description": "Updated test ACL",
        "allowed_roles": ["admin", "manager"],
        "priority": 50
    }
    response = client.put(f"/api/v1/acls/{acl_id}", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "test_acl_updated"
    assert data["priority"] == 50


def test_delete_acl(setup_database):
    """Test deleting an ACL"""
    # Create test ACL
    acl_data = {
        "name": "test_acl_delete",
        "description": "Test ACL for deletion",
        "entity_type": "orders",
        "operation": "read",
        "allowed_roles": ["admin"],
        "priority": 100,
        "is_active": True
    }
    create_response = client.post("/api/v1/acls", json=acl_data)
    acl_id = create_response.json()["id"]

    # Delete ACL
    response = client.delete(f"/api/v1/acls/{acl_id}")
    assert response.status_code == 200

    # Verify deletion
    response = client.get(f"/api/v1/acls/{acl_id}")
    assert response.status_code == 404


def test_create_record_permission(setup_database):
    """Test creating a record permission"""
    permission_data = {
        "entity_type": "orders",
        "entity_id": "order_123",
        "user_id": 1,
        "operation": "read"
    }

    response = client.post("/api/v1/acls/record-permissions", json=permission_data)
    assert response.status_code == 200
    data = response.json()
    assert data["entity_type"] == "orders"
    assert data["entity_id"] == "order_123"
    assert data["operation"] == "read"


def test_read_record_permissions(setup_database):
    """Test reading record permissions"""
    # Create test permission
    permission_data = {
        "entity_type": "orders",
        "entity_id": "order_456",
        "user_id": 1,
        "operation": "write"
    }
    client.post("/api/v1/acls/record-permissions", json=permission_data)

    response = client.get("/api/v1/acls/record-permissions")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) >= 1


def test_revoke_record_permission(setup_database):
    """Test revoking a record permission"""
    # Create test permission
    permission_data = {
        "entity_type": "orders",
        "entity_id": "order_789",
        "user_id": 1,
        "operation": "delete"
    }
    create_response = client.post("/api/v1/acls/record-permissions", json=permission_data)
    permission_id = create_response.json()["id"]

    # Revoke permission
    response = client.delete(f"/api/v1/acls/record-permissions/{permission_id}")
    assert response.status_code == 200


def test_check_permission(setup_database):
    """Test permission checking endpoint"""
    # Create test ACL
    acl_data = {
        "name": "test_permission_check",
        "description": "ACL for permission check test",
        "entity_type": "orders",
        "operation": "read",
        "allowed_roles": ["admin"],
        "priority": 100,
        "is_active": True
    }
    client.post("/api/v1/acls", json=acl_data)

    # Check permission
    check_data = {
        "entity_type": "orders",
        "entity_id": "order_test",
        "operation": "read"
    }
    response = client.post("/api/v1/acls/check-permission", json=check_data)
    assert response.status_code == 200
    data = response.json()
    assert "has_access" in data
    assert "reason" in data