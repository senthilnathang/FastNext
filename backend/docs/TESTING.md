# Backend Testing Guide

Comprehensive testing documentation for the FastVue backend using pytest.

## Overview

The backend uses a multi-layer testing strategy with pytest:

| Layer | Tool | Purpose |
|-------|------|---------|
| Unit | pytest | Services, utilities, business logic |
| Integration | httpx.AsyncClient | API endpoint testing |
| API Mocking | pytest dependency overrides | Mock database and services |
| E2E | Real FastAPI server | Full system testing |

## Quick Start

```bash
# Activate virtual environment
source venv/bin/activate

# Run all tests
pytest

# Run with verbose output
pytest -v

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/unit/services/test_auth_service.py

# Run by marker
pytest -m unit        # Unit tests only
pytest -m integration # Integration tests only
pytest -m api         # API tests only
```

## Test Structure

```
backend/tests/
├── conftest.py                    # Shared fixtures
├── factories/                     # Factory Boy data generators
│   ├── base.py                   # BaseFactory
│   ├── user.py                   # User factories
│   ├── company.py                # Company factories
│   └── role.py                   # Role factories
├── unit/                          # Unit tests
│   ├── services/                 # Service layer tests
│   │   ├── test_auth_service.py
│   │   ├── test_permission_service.py
│   │   └── test_rbac_service.py
│   ├── models/                   # Model tests
│   └── utils/                    # Utility tests
├── integration/                   # Integration tests
│   └── api/                      # API endpoint tests
│       ├── test_auth.py
│       └── test_users.py
├── property/                      # Property-based tests (Hypothesis)
└── security/                      # Security-focused tests
```

## Configuration

### pytest.ini

```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
asyncio_mode = auto
asyncio_default_fixture_loop_scope = function
addopts = -v --tb=short --strict-markers

markers =
    unit: Fast isolated unit tests
    integration: Database integration tests
    api: HTTP API endpoint tests
    slow: Slow running tests
    security: Security related tests
    auth: Authentication tests
```

### Test Markers

```python
@pytest.mark.unit
def test_password_hashing():
    """Fast unit test"""
    pass

@pytest.mark.integration
@pytest.mark.api
async def test_login_endpoint(async_client):
    """Integration test requiring database"""
    pass

@pytest.mark.security
async def test_sql_injection_prevention(async_client):
    """Security-focused test"""
    pass
```

## Fixtures

### Database Fixtures

```python
# tests/conftest.py

@pytest.fixture(scope="session")
def engine():
    """Create SQLite in-memory database engine."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    yield engine
    engine.dispose()

@pytest.fixture
def db_session(engine):
    """Create database session with automatic rollback."""
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()
```

### HTTP Client Fixtures

```python
@pytest.fixture
async def async_client(db_session):
    """Unauthenticated HTTP client."""
    app.dependency_overrides[get_db] = lambda: db_session

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        yield client

    app.dependency_overrides.clear()

@pytest.fixture
async def authenticated_client(async_client, access_token):
    """HTTP client with user authentication."""
    async_client.headers["Authorization"] = f"Bearer {access_token}"
    return async_client

@pytest.fixture
async def admin_client(async_client, admin_access_token):
    """HTTP client with admin authentication."""
    async_client.headers["Authorization"] = f"Bearer {admin_access_token}"
    return async_client
```

### User Fixtures

```python
@pytest.fixture
def test_user(db_session):
    """Create test user."""
    user = User(
        email="test@example.com",
        username="testuser",
        hashed_password="...",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    return user

@pytest.fixture
def test_user_with_password(db_session):
    """Create user with known password."""
    from app.core.security import get_password_hash

    user = User(
        email="test@example.com",
        username="testuser",
        hashed_password=get_password_hash("TestPass123!"),
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    return user

@pytest.fixture
def access_token(test_user):
    """Generate JWT access token."""
    from app.core.security import create_access_token
    return create_access_token(subject=str(test_user.id))
```

## Factory Boy

Create realistic test data with Factory Boy.

### Base Factory

```python
# tests/factories/base.py
import factory
from factory.alchemy import SQLAlchemyModelFactory

class BaseFactory(SQLAlchemyModelFactory):
    class Meta:
        abstract = True
        sqlalchemy_session = None
        sqlalchemy_session_persistence = "commit"
```

### User Factory

```python
# tests/factories/user.py
from faker import Faker
from .base import BaseFactory
from app.models import User

fake = Faker()

class UserFactory(BaseFactory):
    class Meta:
        model = User

    email = factory.LazyAttribute(lambda _: fake.unique.email())
    username = factory.LazyAttribute(lambda _: fake.unique.user_name())
    full_name = factory.LazyAttribute(lambda _: fake.name())
    hashed_password = "hashed_password_placeholder"
    is_active = True
    is_superuser = False

class AdminUserFactory(UserFactory):
    is_superuser = True

class InactiveUserFactory(UserFactory):
    is_active = False
```

### Using Factories

```python
def test_user_creation(db_session):
    # Create single user
    user = UserFactory()

    # Create multiple users
    users = UserFactory.create_batch(5)

    # Create with specific attributes
    admin = AdminUserFactory(email="admin@example.com")

    assert user.is_active is True
    assert admin.is_superuser is True
```

## Unit Testing

Test individual functions and classes in isolation.

### Service Tests

```python
# tests/unit/services/test_auth_service.py
import pytest
from app.services.auth import AuthService
from tests.factories import UserFactory

class TestAuthService:
    @pytest.mark.unit
    def test_verify_password_success(self):
        service = AuthService()
        hashed = service.get_password_hash("secret123")

        assert service.verify_password("secret123", hashed) is True

    @pytest.mark.unit
    def test_verify_password_failure(self):
        service = AuthService()
        hashed = service.get_password_hash("secret123")

        assert service.verify_password("wrong", hashed) is False

    @pytest.mark.unit
    def test_create_access_token(self, test_user):
        service = AuthService()
        token = service.create_access_token(subject=str(test_user.id))

        assert token is not None
        assert len(token) > 0
```

### Utility Tests

```python
# tests/unit/utils/test_validators.py
import pytest
from app.utils.validators import validate_email, validate_password

class TestValidators:
    @pytest.mark.unit
    @pytest.mark.parametrize("email,expected", [
        ("test@example.com", True),
        ("invalid-email", False),
        ("", False),
        ("user@domain", False),
    ])
    def test_validate_email(self, email, expected):
        assert validate_email(email) is expected

    @pytest.mark.unit
    def test_validate_password_strength(self):
        assert validate_password("Str0ng!Pass") is True
        assert validate_password("weak") is False
```

## Integration Testing

Test API endpoints with database integration.

### API Endpoint Tests

```python
# tests/integration/api/test_auth.py
import pytest
from httpx import AsyncClient

@pytest.mark.api
@pytest.mark.auth
class TestLoginEndpoint:
    async def test_login_success(
        self,
        async_client: AsyncClient,
        test_user_with_password,
    ):
        response = await async_client.post(
            "/api/v1/auth/login",
            json={
                "username": test_user_with_password.email,
                "password": "TestPass123!",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    async def test_login_invalid_credentials(
        self,
        async_client: AsyncClient,
    ):
        response = await async_client.post(
            "/api/v1/auth/login",
            json={
                "username": "invalid@example.com",
                "password": "wrongpassword",
            },
        )

        assert response.status_code == 401
        assert "Invalid" in response.json()["detail"]
```

### CRUD Endpoint Tests

```python
# tests/integration/api/test_users.py
import pytest
from httpx import AsyncClient

@pytest.mark.api
class TestUserEndpoints:
    async def test_list_users(
        self,
        admin_client: AsyncClient,
    ):
        response = await admin_client.get("/api/v1/users/")

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data

    async def test_get_current_user(
        self,
        authenticated_client: AsyncClient,
        test_user,
    ):
        response = await authenticated_client.get("/api/v1/users/me")

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user.email

    async def test_create_user_requires_admin(
        self,
        authenticated_client: AsyncClient,
    ):
        response = await authenticated_client.post(
            "/api/v1/users/",
            json={
                "email": "new@example.com",
                "password": "NewPass123!",
            },
        )

        assert response.status_code == 403
```

## Mocking

### Dependency Overrides

```python
# Override database dependency
def override_get_db():
    try:
        yield test_db_session
    finally:
        pass

app.dependency_overrides[get_db] = override_get_db
```

### Service Mocking

```python
from unittest.mock import MagicMock, AsyncMock

@pytest.fixture
def mock_email_service():
    service = MagicMock()
    service.send_email = AsyncMock(return_value=True)
    return service

async def test_password_reset(async_client, mock_email_service, monkeypatch):
    monkeypatch.setattr(
        "app.services.auth.email_service",
        mock_email_service
    )

    response = await async_client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "user@example.com"},
    )

    assert response.status_code == 200
    mock_email_service.send_email.assert_called_once()
```

### Redis/Cache Mocking

```python
@pytest.fixture
def mock_redis():
    mock = MagicMock()
    mock.get.return_value = None
    mock.set.return_value = True
    mock.delete.return_value = True
    return mock

@pytest.fixture
def mock_cache(mock_redis):
    from app.core.cache import CacheService
    cache = CacheService()
    cache.redis = mock_redis
    return cache
```

## Property-Based Testing

Use Hypothesis for property-based testing.

```python
# tests/property/test_validators.py
import pytest
from hypothesis import given, strategies as st
from app.utils.validators import sanitize_input

class TestSanitization:
    @given(st.text())
    def test_sanitize_never_contains_script_tags(self, text):
        result = sanitize_input(text)
        assert "<script>" not in result.lower()
        assert "</script>" not in result.lower()

    @given(st.emails())
    def test_valid_emails_pass_validation(self, email):
        from app.utils.validators import validate_email
        # All generated emails should be valid
        assert validate_email(email) is True
```

## Coverage

### Running with Coverage

```bash
# Generate coverage report
pytest --cov=app --cov-report=html

# View report
open htmlcov/index.html

# Fail if coverage below threshold
pytest --cov=app --cov-fail-under=80
```

### Coverage Configuration

```ini
# pyproject.toml or setup.cfg
[tool.coverage.run]
source = ["app"]
omit = [
    "*/tests/*",
    "*/__init__.py",
    "*/migrations/*",
]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "if TYPE_CHECKING:",
    "raise NotImplementedError",
]
```

## Test Database

### SQLite In-Memory

For fast tests, use SQLite in-memory database:

```python
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
```

### PostgreSQL Testing

For production-like tests:

```python
TEST_DATABASE_URL = "postgresql://user:pass@localhost/test_db"

@pytest.fixture(scope="session")
def engine():
    engine = create_engine(TEST_DATABASE_URL)
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Backend Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install -r requirements-dev.txt

      - name: Run tests
        run: pytest --cov=app --cov-report=xml
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost/test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Best Practices

### Test Isolation

```python
# Each test should be independent
@pytest.fixture(autouse=True)
def reset_state():
    """Reset global state before each test."""
    yield
    # Cleanup after test
```

### Async Testing

```python
# Use async fixtures and tests
@pytest.fixture
async def async_resource():
    resource = await create_resource()
    yield resource
    await resource.cleanup()

async def test_async_operation(async_resource):
    result = await async_resource.process()
    assert result is not None
```

### Parameterized Tests

```python
@pytest.mark.parametrize("status_code,role", [
    (200, "admin"),
    (403, "viewer"),
    (403, "editor"),
])
async def test_admin_only_endpoint(
    async_client,
    status_code,
    role,
    create_user_with_role,
):
    user = create_user_with_role(role)
    response = await async_client.get(
        "/api/v1/admin/settings",
        headers={"Authorization": f"Bearer {user.token}"},
    )
    assert response.status_code == status_code
```

## Related Documentation

- [pytest Documentation](https://docs.pytest.org/)
- [Factory Boy](https://factoryboy.readthedocs.io/)
- [Hypothesis](https://hypothesis.readthedocs.io/)
- [httpx](https://www.python-httpx.org/)
