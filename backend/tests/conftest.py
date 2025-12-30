"""
Pytest configuration and fixtures for FastVue backend tests.

Provides fixtures for:
- Database sessions (SQLite in-memory)
- Async HTTP client (httpx.AsyncClient)
- Authenticated/admin clients
- Test users, companies, roles
- Mock services (Redis, cache)
"""

import pytest
from typing import AsyncGenerator, Generator
from unittest.mock import MagicMock

import httpx
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.core.config import settings
from app.core.security import get_password_hash, create_access_token
from app.models import User, Company, Role, Permission


# =============================================================================
# JSONB COMPATIBILITY FOR SQLITE
# =============================================================================

# SQLite doesn't support JSONB, so we need to compile it as JSON
from sqlalchemy.dialects import postgresql
from sqlalchemy import JSON

# Register a type adapter to compile JSONB as JSON for SQLite
from sqlalchemy.ext.compiler import compiles

@compiles(postgresql.JSONB, "sqlite")
def compile_jsonb_sqlite(element, compiler, **kw):
    return compiler.visit_JSON(JSON(), **kw)


# =============================================================================
# DATABASE FIXTURES
# =============================================================================

# Session-scoped engine to avoid recreating tables for each test
@pytest.fixture(scope="session")
def engine():
    """Create a test database engine using SQLite in-memory (session-scoped)"""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    # Create all tables once at session start
    Base.metadata.create_all(bind=engine)
    yield engine
    engine.dispose()


@pytest.fixture(scope="function")
def db_session(engine) -> Generator[Session, None, None]:
    """Create a fresh database session for each test with transaction rollback"""
    connection = engine.connect()
    transaction = connection.begin()
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=connection)
    session = TestingSessionLocal()

    # Start a nested transaction for automatic rollback
    nested = connection.begin_nested()

    try:
        yield session
    finally:
        session.close()
        # Rollback any changes made during the test
        if nested.is_active:
            nested.rollback()
        if transaction.is_active:
            transaction.rollback()
        connection.close()


@pytest.fixture(scope="function")
def db(db_session) -> Session:
    """Alias for db_session"""
    return db_session


# =============================================================================
# USER FIXTURES
# =============================================================================

@pytest.fixture
def test_user(db_session: Session) -> User:
    """Create a test user"""
    user = User(
        email="test@example.com",
        username="testuser",
        full_name="Test User",
        hashed_password="$2b$12$test_hashed_password",
        is_active=True,
        is_verified=True,
        is_superuser=False,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def admin_user(db_session: Session) -> User:
    """Create an admin user"""
    user = User(
        email="admin@example.com",
        username="admin",
        full_name="Admin User",
        hashed_password="$2b$12$admin_hashed_password",
        is_active=True,
        is_verified=True,
        is_superuser=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


# =============================================================================
# COMPANY FIXTURES
# =============================================================================

@pytest.fixture
def test_company(db_session: Session) -> Company:
    """Create a test company"""
    company = Company(
        name="Test Company",
        code="TEST",
        is_active=True,
    )
    db_session.add(company)
    db_session.commit()
    db_session.refresh(company)
    return company


# =============================================================================
# ROLE FIXTURES
# =============================================================================

@pytest.fixture
def admin_role(db_session: Session) -> Role:
    """Create an admin role"""
    role = Role(
        name="Admin",
        codename="admin",
        description="Administrator role",
        is_system_role=True,
        is_active=True,
    )
    db_session.add(role)
    db_session.commit()
    db_session.refresh(role)
    return role


@pytest.fixture
def viewer_role(db_session: Session) -> Role:
    """Create a viewer role"""
    role = Role(
        name="Viewer",
        codename="viewer",
        description="Read-only role",
        is_system_role=True,
        is_active=True,
    )
    db_session.add(role)
    db_session.commit()
    db_session.refresh(role)
    return role


# =============================================================================
# MOCK FIXTURES
# =============================================================================

@pytest.fixture
def mock_redis():
    """Create a mock Redis client"""
    mock = MagicMock()
    mock.get.return_value = None
    mock.set.return_value = True
    mock.delete.return_value = True
    return mock


@pytest.fixture
def mock_cache(mock_redis):
    """Create a mock cache service"""
    from app.core.cache import CacheService
    cache = CacheService()
    cache.redis = mock_redis
    return cache


# =============================================================================
# REQUEST CONTEXT FIXTURES
# =============================================================================

@pytest.fixture
def mock_request_context(test_user: User, test_company: Company):
    """Create a mock request context"""
    from app.core.context import RequestContext, set_request_context, clear_request_context

    context = RequestContext(
        user_id=test_user.id,
        company_id=test_company.id,
        ip_address="127.0.0.1",
        user_agent="pytest",
        request_id="test-request-id",
    )
    set_request_context(context)
    yield context
    clear_request_context()


# =============================================================================
# ASYNC CLIENT FIXTURES
# =============================================================================

@pytest.fixture
def test_password() -> str:
    """Standard test password that meets validation requirements"""
    return "TestPass123!"


@pytest.fixture
def test_user_with_password(db_session: Session, test_password: str) -> User:
    """Create a test user with a real hashed password for auth testing"""
    user = User(
        email="authtest@example.com",
        username="authtest",
        full_name="Auth Test User",
        hashed_password=get_password_hash(test_password),
        is_active=True,
        is_verified=True,
        is_superuser=False,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def admin_user_with_password(db_session: Session, test_password: str) -> User:
    """Create an admin user with a real hashed password"""
    user = User(
        email="authadmin@example.com",
        username="authadmin",
        full_name="Auth Admin User",
        hashed_password=get_password_hash(test_password),
        is_active=True,
        is_verified=True,
        is_superuser=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def access_token(test_user_with_password: User) -> str:
    """Create a valid access token for the test user"""
    return create_access_token(user_id=test_user_with_password.id)


@pytest.fixture
def admin_access_token(admin_user_with_password: User) -> str:
    """Create a valid access token for the admin user"""
    return create_access_token(user_id=admin_user_with_password.id)


@pytest.fixture
async def async_client(db_session: Session) -> AsyncGenerator[httpx.AsyncClient, None]:
    """
    Create an async HTTP client for testing endpoints.

    Overrides the get_db dependency to use the test database session.
    Clears rate limit cache before each test.
    """
    from main import app
    from app.api.deps.database import get_db

    # Clear rate limiting windows before each test
    try:
        from app.middleware.rate_limiting import _rate_limiter
        _rate_limiter._windows.clear()
    except (ImportError, AttributeError):
        pass

    def override_get_db():
        try:
            yield db_session
        finally:
            pass  # Session cleanup handled by db_session fixture

    app.dependency_overrides[get_db] = override_get_db

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        yield client

    app.dependency_overrides.clear()


@pytest.fixture
async def authenticated_client(
    async_client: httpx.AsyncClient,
    access_token: str,
) -> httpx.AsyncClient:
    """
    Create an authenticated async client with valid JWT token.
    """
    async_client.headers["Authorization"] = f"Bearer {access_token}"
    return async_client


@pytest.fixture
async def admin_client(
    async_client: httpx.AsyncClient,
    admin_access_token: str,
) -> httpx.AsyncClient:
    """
    Create an authenticated async client with admin/superuser token.
    """
    async_client.headers["Authorization"] = f"Bearer {admin_access_token}"
    return async_client


# =============================================================================
# LOCKED USER FIXTURES
# =============================================================================

@pytest.fixture
def locked_user(db_session: Session, test_password: str) -> User:
    """Create a locked user for testing lockout behavior"""
    from datetime import datetime, timedelta, timezone

    # Note: For SQLite testing, we need to mock the is_locked method or
    # skip these tests. For now, use a naive datetime and rely on the
    # model's locked check being handled appropriately.
    future_time = datetime.now(timezone.utc) + timedelta(hours=1)
    user = User(
        email="locked@example.com",
        username="lockeduser",
        full_name="Locked User",
        hashed_password=get_password_hash(test_password),
        is_active=True,
        is_verified=True,
        is_superuser=False,
        failed_login_attempts=5,
        locked_until=future_time,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    # Restore timezone info that SQLite strips
    user.locked_until = future_time
    return user


@pytest.fixture
def inactive_user(db_session: Session, test_password: str) -> User:
    """Create an inactive user for testing"""
    user = User(
        email="inactive@example.com",
        username="inactiveuser",
        full_name="Inactive User",
        hashed_password=get_password_hash(test_password),
        is_active=False,
        is_verified=True,
        is_superuser=False,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


# =============================================================================
# FACTORY SESSION FIXTURE
# =============================================================================

@pytest.fixture(autouse=True)
def _set_factory_session(db_session: Session):
    """
    Automatically set the SQLAlchemy session for all factories.

    This fixture runs for every test and sets the session on all
    Factory Boy factories that use SQLAlchemyModelFactory.
    """
    try:
        from tests.factories import set_session
        set_session(db_session)
        yield
    except ImportError:
        # Factories not yet created
        yield
