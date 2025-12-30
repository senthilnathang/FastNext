# Backend Development Guide

Guide for developing the FastVue backend.

## Development Workflow

### Starting Development

```bash
# Navigate to backend
cd backend

# Activate virtual environment
source venv/bin/activate

# Start services (if using Docker)
docker compose up -d db redis

# Start development server
python manage.py runserver

# Or using uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Management Commands (manage.py)

FastVue includes a Django-like CLI for common tasks:

### User Management

```bash
# Create a superuser (interactive)
python manage.py createsuperuser

# Create superuser with options
python manage.py createsuperuser -u admin -e admin@example.com --no-input -p secretpass

# List users
python manage.py showusers
python manage.py showusers --superusers  # Only superusers

# Change user password
python manage.py changepassword username

# Promote user to superuser
python manage.py promoteuser username

# Demote superuser to regular user
python manage.py demoteuser username
```

### Database Management

```bash
# Create database from config
python manage.py createdb

# Create with custom options
python manage.py createdb --name mydb --owner postgres --encoding UTF8

# Drop database (with confirmation)
python manage.py dropdb

# Drop without confirmation
python manage.py dropdb --force

# Reset database (drop, create, migrate, init)
python manage.py resetdb
python manage.py resetdb --force --sample-data

# Initialize database with default data
python manage.py initdb

# Initialize with sample data
python manage.py initdb --sample-data

# Run migrations
python manage.py migrate

# Create new migration
python manage.py makemigrations -m "add products table"

# Show migration status
python manage.py showmigrations

# Open database shell (PostgreSQL)
python manage.py dbshell
```

### Development Server

```bash
# Start server (default: 0.0.0.0:8000 with reload)
python manage.py runserver

# Custom port
python manage.py runserver --port 8080

# Production mode (no reload, multiple workers)
python manage.py runserver --no-reload --workers 4
```

### Interactive Shell

```bash
# Start Python shell with app context
python manage.py shell

# Available in shell:
#   - db: Database session
#   - User, Company, Role, Permission: Models
#   - settings: App configuration
```

### System Check

```bash
# Check system configuration
python manage.py check

# Verifies:
#   - Database connection
#   - Redis connection
#   - Security settings
```

### Demo Data Management

```bash
# Load default demo data from data/demo.json
python manage.py load-data

# Load from a custom file
python manage.py load-data --file data/custom.json

# Clear existing data before loading
python manage.py load-data --clear

# Export current data to JSON
python manage.py export-data --file backup.json

# Export including activity logs and messages
python manage.py export-data --file backup.json --all
```

#### Demo Data JSON Format

```json
{
  "companies": [
    {"name": "ACME Corp", "code": "ACME", "is_active": true}
  ],
  "users": [
    {
      "email": "admin@example.com",
      "username": "admin",
      "password": "secret123",
      "is_superuser": true,
      "current_company_code": "ACME"
    }
  ],
  "roles": [
    {"name": "Admin", "is_system_role": true, "permissions": ["user.read", "user.create"]}
  ],
  "groups": [
    {"name": "Engineering", "company_code": "ACME", "users": ["admin@example.com"]}
  ],
  "user_company_roles": [
    {"user_email": "admin@example.com", "company_code": "ACME", "role_name": "Admin", "is_default": true}
  ]
}
```

### Code Structure

```
app/
├── api/                    # API Layer
│   ├── deps/               # Dependencies (DI)
│   │   ├── __init__.py
│   │   ├── auth.py         # get_current_user, require_permissions
│   │   ├── database.py     # get_db session
│   │   └── pagination.py   # Pagination helpers
│   ├── v1/                 # API Version 1
│   │   ├── __init__.py
│   │   ├── auth.py         # /auth/* endpoints
│   │   ├── users.py        # /users/* endpoints
│   │   ├── companies.py    # /companies/* endpoints
│   │   ├── roles.py        # /roles/* endpoints
│   │   └── permissions.py  # /permissions/* endpoints
│   └── main.py             # Router aggregation
│
├── core/                   # Core Modules
│   ├── __init__.py
│   ├── config.py           # Pydantic Settings
│   ├── security.py         # JWT, password hashing, 2FA
│   ├── cache.py            # Redis caching
│   └── oauth.py            # OAuth providers
│
├── db/                     # Database
│   ├── __init__.py
│   ├── base.py             # SQLAlchemy engine, Base
│   ├── session.py          # Session factory
│   └── init_db.py          # Initial data seeding
│
├── models/                 # SQLAlchemy Models
│   ├── __init__.py
│   ├── base.py             # BaseModel, Mixins
│   ├── user.py             # User model
│   ├── company.py          # Company model
│   ├── role.py             # Role model
│   ├── permission.py       # Permission model
│   ├── group.py            # Group model
│   └── audit.py            # AuditLog model
│
├── schemas/                # Pydantic Schemas
│   ├── __init__.py
│   ├── user.py             # User DTOs
│   ├── company.py          # Company DTOs
│   ├── token.py            # Token DTOs
│   └── ...
│
└── services/               # Business Logic
    ├── __init__.py
    ├── base.py             # BaseCRUDService
    ├── user.py             # UserService
    └── permission.py       # PermissionService
```

## Creating New Features

### 1. Create Model

```python
# app/models/product.py
from sqlalchemy import Column, String, Integer, ForeignKey, Numeric
from sqlalchemy.orm import relationship

from app.models.base import BaseModel, TimestampMixin, AuditMixin

class Product(BaseModel, TimestampMixin, AuditMixin):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    sku = Column(String(50), unique=True, index=True)
    price = Column(Numeric(10, 2), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)

    # Relationships
    company = relationship("Company", back_populates="products")
```

### 2. Create Schema

```python
# app/schemas/product.py
from pydantic import BaseModel, Field
from decimal import Decimal
from datetime import datetime
from typing import Optional

class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    sku: str = Field(..., min_length=1, max_length=50)
    price: Decimal = Field(..., ge=0)

class ProductCreate(ProductBase):
    company_id: int

class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    sku: Optional[str] = Field(None, min_length=1, max_length=50)
    price: Optional[Decimal] = Field(None, ge=0)

class ProductResponse(ProductBase):
    id: int
    company_id: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

class ProductListResponse(BaseModel):
    total: int
    items: list[ProductResponse]
    page: int
    page_size: int
```

### 3. Create Service

```python
# app/services/product.py
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate
from app.services.base import BaseCRUDService

class ProductService(BaseCRUDService[Product, ProductCreate, ProductUpdate]):
    def __init__(self, db: Session):
        super().__init__(Product, db)

    def get_by_sku(self, sku: str) -> Product | None:
        stmt = select(Product).where(Product.sku == sku)
        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_company(
        self, company_id: int, page: int = 1, page_size: int = 20
    ) -> tuple[list[Product], int]:
        stmt = select(Product).where(Product.company_id == company_id)

        # Count total
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = self.db.execute(count_stmt).scalar()

        # Paginate
        stmt = stmt.offset((page - 1) * page_size).limit(page_size)
        items = self.db.execute(stmt).scalars().all()

        return items, total
```

### 4. Create API Endpoint

```python
# app/api/v1/products.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps.database import get_db
from app.api.deps.auth import get_current_user, require_permissions
from app.models.user import User
from app.schemas.product import (
    ProductCreate, ProductUpdate, ProductResponse, ProductListResponse
)
from app.services.product import ProductService

router = APIRouter(prefix="/products", tags=["Products"])

@router.get("/", response_model=ProductListResponse)
def list_products(
    page: int = 1,
    page_size: int = 20,
    company_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions(["product:read"])),
):
    """List products with pagination."""
    service = ProductService(db)

    if company_id:
        items, total = service.get_by_company(company_id, page, page_size)
    else:
        items, total = service.get_multi(page=page, page_size=page_size)

    return ProductListResponse(
        total=total,
        items=items,
        page=page,
        page_size=page_size,
    )

@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions(["product:create"])),
):
    """Create a new product."""
    service = ProductService(db)

    # Check SKU uniqueness
    if service.get_by_sku(data.sku):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product with this SKU already exists",
        )

    return service.create(data, created_by=current_user.id)

@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions(["product:read"])),
):
    """Get product by ID."""
    service = ProductService(db)
    product = service.get(product_id)

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    return product

@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions(["product:update"])),
):
    """Update product."""
    service = ProductService(db)
    product = service.get(product_id)

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    return service.update(product, data, updated_by=current_user.id)

@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions(["product:delete"])),
):
    """Delete product."""
    service = ProductService(db)
    product = service.get(product_id)

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    service.delete(product_id)
```

### 5. Register Router

```python
# app/api/v1/__init__.py
from fastapi import APIRouter
from app.api.v1 import auth, users, companies, products  # Add products

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(companies.router)
api_router.include_router(products.router)  # Add this line
```

### 6. Create Migration

```bash
# Generate migration
alembic revision --autogenerate -m "add_products_table"

# Review migration file in alembic/versions/

# Apply migration
alembic upgrade head
```

## Authentication & Authorization

### Protecting Endpoints

```python
from app.api.deps.auth import (
    get_current_user,           # Any authenticated user
    get_current_active_user,    # Active users only
    require_permissions,        # Require specific permissions
    require_roles,              # Require specific roles
)

# Public endpoint (no auth)
@router.get("/public")
def public_endpoint():
    return {"message": "public"}

# Any authenticated user
@router.get("/protected")
def protected_endpoint(current_user: User = Depends(get_current_user)):
    return {"user": current_user.email}

# Require specific permission
@router.get("/admin")
def admin_endpoint(
    current_user: User = Depends(require_permissions(["admin:access"]))
):
    return {"admin": True}

# Require multiple permissions (AND)
@router.post("/sensitive")
def sensitive_endpoint(
    current_user: User = Depends(require_permissions(["data:write", "audit:create"]))
):
    return {"success": True}

# Require role
@router.get("/managers")
def managers_only(
    current_user: User = Depends(require_roles(["admin", "manager"]))
):
    return {"managers": True}
```

## Database Operations

### Transactions

```python
from sqlalchemy.orm import Session

def complex_operation(db: Session):
    try:
        # Multiple operations in one transaction
        user = create_user(db, user_data)
        assign_role(db, user.id, role_id)
        send_welcome_email(user.email)

        db.commit()
    except Exception as e:
        db.rollback()
        raise
```

### Async Operations (Optional)

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

async def get_user_async(db: AsyncSession, user_id: int):
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()
```

## Caching

```python
from app.core.cache import cache

# Cache function result
@cache.cached(ttl=300)  # 5 minutes
def get_user_permissions(user_id: int) -> list[str]:
    # Expensive database query
    return ["perm1", "perm2"]

# Manual cache operations
cache.set("key", "value", ttl=60)
value = cache.get("key")
cache.delete("key")
```

## Testing

### Test Infrastructure

The backend uses pytest with SQLite in-memory databases for fast, isolated tests:

```
tests/
├── conftest.py              # Shared fixtures (db, users, companies)
├── unit/                    # Unit tests (no external deps)
│   └── services/
│       ├── test_rbac_service.py        # RBAC service tests
│       └── test_permission_service.py  # Permission service tests
└── integration/             # Integration tests (with database)
    └── api/
        └── test_auth.py
```

### Test Fixtures (conftest.py)

```python
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from app.db.base import Base
from app.models import User, Company

@pytest.fixture(scope="function")
def engine():
    """Fresh SQLite in-memory database per test"""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db_session(engine) -> Session:
    """Fresh database session per test with rollback"""
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)
    yield session
    session.close()
    transaction.rollback()

@pytest.fixture
def test_user(db_session) -> User:
    """Create a test user"""
    user = User(email="test@example.com", username="testuser", ...)
    db_session.add(user)
    db_session.commit()
    return user

@pytest.fixture
def test_company(db_session) -> Company:
    """Create a test company"""
    company = Company(name="Test Company", code="TEST", ...)
    db_session.add(company)
    db_session.commit()
    return company
```

### Running Tests

```bash
# Activate virtual environment first
source venv/bin/activate

# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific test file
pytest tests/unit/services/test_rbac_service.py

# Run specific test class
pytest tests/unit/services/test_permission_service.py::TestPermissionServiceRolePermissions

# Run specific test
pytest tests/unit/services/test_permission_service.py::TestPermissionServiceRolePermissions::test_has_permission_returns_true

# Run with coverage
pytest --cov=app --cov-report=html

# Run only unit tests
pytest tests/unit/ -v

# Run only integration tests
pytest tests/integration/ -v

# Run tests matching a pattern
pytest -k "permission" -v
```

### Writing Tests

```python
# tests/unit/services/test_example.py
import pytest
from sqlalchemy.orm import Session
from app.services.permission import PermissionService
from app.models import User, Company

class TestPermissionService:
    """Tests for PermissionService"""

    def test_get_user_permissions(self, db_session: Session, test_user, test_company):
        """Test getting permissions from user's role"""
        # Setup: Create role, permission, and assign to user
        role = Role(name="Test Role", codename="test", ...)
        db_session.add(role)
        db_session.flush()

        # Test
        service = PermissionService(db_session)
        permissions = service.get_user_permissions(
            test_user.id, test_company.id, use_cache=False
        )

        # Assert
        assert "expected.permission" in permissions

    def test_has_permission_returns_true(self, db_session, test_user, test_company):
        """Test has_permission returns True when user has permission"""
        # ... setup ...
        service = PermissionService(db_session)
        assert service.has_permission(test_user.id, "user.read", test_company.id) is True

    def test_superuser_always_has_permission(self, db_session, admin_user):
        """Test that superuser flag bypasses permission check"""
        service = PermissionService(db_session)
        assert service.has_permission(
            admin_user.id, "any.permission", None, is_superuser=True
        ) is True
```

### Test Best Practices

1. **Disable caching in tests** - Use `use_cache=False` for permission tests
2. **Use function-scoped fixtures** - Ensures test isolation
3. **Test edge cases** - Inactive permissions, missing roles, etc.
4. **Keep tests fast** - Use SQLite in-memory, mock external services
5. **Name tests clearly** - `test_<method>_<scenario>_<expected>`

### Writing Tests

```python
# tests/test_products.py
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from main import app
from app.models.product import Product

client = TestClient(app)

@pytest.fixture
def auth_headers(test_user_token):
    return {"Authorization": f"Bearer {test_user_token}"}

def test_create_product(db: Session, auth_headers):
    response = client.post(
        "/api/v1/products/",
        json={
            "name": "Test Product",
            "sku": "TEST-001",
            "price": "99.99",
            "company_id": 1,
        },
        headers=auth_headers,
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Product"
    assert data["sku"] == "TEST-001"

def test_create_product_duplicate_sku(db: Session, auth_headers):
    # Create first product
    client.post(
        "/api/v1/products/",
        json={"name": "Product 1", "sku": "DUPE-001", "price": "10.00", "company_id": 1},
        headers=auth_headers,
    )

    # Try to create duplicate
    response = client.post(
        "/api/v1/products/",
        json={"name": "Product 2", "sku": "DUPE-001", "price": "20.00", "company_id": 1},
        headers=auth_headers,
    )

    assert response.status_code == 400
    assert "SKU already exists" in response.json()["detail"]
```

## Code Quality

### Linting

```bash
# Run ruff linter
ruff check app/

# Auto-fix issues
ruff check --fix app/

# Format code
ruff format app/
```

### Type Checking

```bash
# Run mypy
mypy app/

# Strict mode
mypy --strict app/
```

### Pre-commit Hooks

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.1.6
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format
  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.7.1
    hooks:
      - id: mypy
```

## Debugging

### Using debugger

```python
# Add breakpoint in code
import pdb; pdb.set_trace()

# Or use breakpoint() (Python 3.7+)
breakpoint()
```

### VS Code Debug Config

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "FastAPI",
      "type": "python",
      "request": "launch",
      "module": "uvicorn",
      "args": ["main:app", "--reload"],
      "jinja": true,
      "justMyCode": false
    }
  ]
}
```

### Logging

```python
import logging

logger = logging.getLogger(__name__)

def some_function():
    logger.debug("Debug message")
    logger.info("Info message")
    logger.warning("Warning message")
    logger.error("Error message")
```

## Logging Configuration

FastVue configures logging in `main.py` with sensible defaults for development and production.

### Log Levels

| Level | Environment Variable | Default |
|-------|---------------------|---------|
| Root Logger | `LOG_LEVEL` | `INFO` |
| watchfiles | (hardcoded) | `WARNING` |
| uvicorn.access | (hardcoded) | `WARNING` |
| websockets | (hardcoded) | `WARNING` |

### Silenced Loggers

The following loggers are silenced by default to reduce noise:

```python
# In main.py
logging.getLogger("watchfiles").setLevel(logging.WARNING)      # Hot-reload file watcher
logging.getLogger("watchfiles.main").setLevel(logging.WARNING)
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)  # HTTP access logs
logging.getLogger("websockets").setLevel(logging.WARNING)      # WebSocket library
```

These are particularly noisy in development:
- **watchfiles**: Logs every file change when using `--reload`
- **uvicorn.access**: Logs every HTTP request
- **websockets**: Logs WebSocket connection events

### Log Files

Logs are written to:
- `logs/fastvue.log` - Main application logs
- `logs/security.log` - Security-related events (auth failures, rate limits)

### Customizing Log Levels

To enable debug logging for specific modules:

```python
# In main.py or your code
logging.getLogger("app.services.inbox").setLevel(logging.DEBUG)
logging.getLogger("app.api.v1.auth").setLevel(logging.DEBUG)
```

Or via environment:

```bash
# Set global log level
export LOG_LEVEL=DEBUG
python manage.py runserver
```

### Request Logging

The `RequestLoggingMiddleware` logs HTTP requests with:
- Request method and path
- Response status code
- Response time
- Client IP address

**Excluded Paths** (not logged):
- `/health` - Health check
- `/` - Root
- `/api/v1/docs` - Swagger UI
- `/api/v1/redoc` - ReDoc
- `/api/v1/openapi.json` - OpenAPI spec
- `/api/v1/ws` - WebSocket endpoints
- `/ws` - WebSocket endpoints

### Adding Custom Excluded Paths

To exclude additional paths from request logging:

```python
# In main.py
app.add_middleware(
    RequestLoggingMiddleware,
    log_request_body=settings.DEBUG,
    log_response_body=False,
    excluded_paths=[
        "/health", "/", "/api/v1/docs", "/api/v1/redoc", "/api/v1/openapi.json",
        "/api/v1/ws", "/ws",
        "/api/v1/my-custom-endpoint",  # Add your paths here
    ],
)
```

### WebSocket Logging

WebSocket connections are logged at INFO level:
- Connection established (with user ID)
- Connection disconnected
- Stale connection cleanup

To silence WebSocket logging:

```python
logging.getLogger("app.core.websocket").setLevel(logging.WARNING)
```

### Security Logging

Security events are logged to a separate file with these categories:
- Authentication failures (401)
- Authorization failures (403)
- Rate limiting (429)
- Suspicious request patterns

```python
from app.middleware.request_logging import log_security_event

log_security_event(
    event_type="suspicious_request",
    user_id=current_user.id,
    request=request,
    severity="HIGH",
    details={"reason": "SQL injection attempt"}
)
```

### Performance Logging

Slow requests are automatically logged with WARNING level:
- Requests > 2 seconds: WARNING
- Requests > 5 seconds: WARNING with "SLOW" tag

### Best Practices

1. **Use module-level loggers**: `logger = logging.getLogger(__name__)`
2. **Don't log sensitive data**: Passwords, tokens, PII
3. **Use appropriate levels**: DEBUG for dev, INFO for prod
4. **Include context**: User ID, request ID in log messages
5. **Monitor security logs**: Review `logs/security.log` regularly

## Model Mixins

FastVue provides several mixins for common model patterns:

### Available Mixins

```python
from app.models.base import (
    TimestampMixin,      # created_at, updated_at
    SoftDeleteMixin,     # is_deleted, deleted_at, soft_delete()
    AuditMixin,          # created_by, updated_by
    MetadataMixin,       # metadata JSONB field
    ActiveMixin,         # is_active field
    CompanyScopedMixin,  # company_id foreign key
    VersionMixin,        # version for optimistic locking
    ActivityMixin,       # log_activity() method
    MailThreadMixin,     # add_message(), get_messages()
    URLMixin,            # url, url_label fields
)
```

### Combined Models

```python
from app.models.base import (
    BaseModel,           # id, created_at, updated_at
    AuditableModel,      # BaseModel + created_by, updated_by
    SoftDeleteModel,     # AuditableModel + soft delete
    ActiveModel,         # SoftDeleteModel + is_active
    CompanyScopedModel,  # ActiveModel + company_id
    ActivityModel,       # CompanyScopedModel + activity logging
    MailThreadModel,     # ActivityModel + message threading
    EnterpriseModel,     # All features combined
)
```

### Using Mixins

```python
from app.models.base import BaseModel, ActivityMixin, MailThreadMixin

class Project(BaseModel, ActivityMixin, MailThreadMixin):
    __tablename__ = "projects"

    name = Column(String(255), nullable=False)
    status = Column(String(50), default="active")

# Now you can use activity logging and messages
project = Project(name="New Project")
db.add(project)
db.commit()

# Log activity
project.log_activity(
    db=db,
    action="create",
    user_id=current_user.id,
    description="Project created"
)

# Add message
project.add_message(
    db=db,
    body="Project kickoff meeting scheduled",
    user_id=current_user.id,
    message_type="comment"
)

# Get messages
messages = project.get_messages(db)
```

## Activity Logging

### Using Activity Logs

```python
from app.models.activity_log import ActivityLog, ActivityCategory, ActivityLevel

# Create activity log
ActivityLog.create(
    db=db,
    action="login",
    category=ActivityCategory.AUTHENTICATION,
    level=ActivityLevel.INFO,
    entity_type="user",
    entity_id=user.id,
    entity_name=user.full_name,
    user_id=user.id,
    description="User logged in successfully",
    ip_address=request.client.host,
    user_agent=request.headers.get("user-agent"),
    success=True,
)

# Query activity logs
logs = ActivityLog.get_by_entity(db, entity_type="user", entity_id=1, limit=50)
user_logs = ActivityLog.get_by_user(db, user_id=1, limit=100)
```

### Activity Categories

- `AUTHENTICATION` - Login, logout, password changes
- `AUTHORIZATION` - Permission changes, role assignments
- `USER_MANAGEMENT` - User CRUD operations
- `DATA_MANAGEMENT` - Data operations
- `SYSTEM_MANAGEMENT` - System configuration
- `SECURITY` - Security events
- `WORKFLOW` - Business process events
- `API` - API calls
- `FILE_MANAGEMENT` - File operations
- `CONFIGURATION` - Settings changes
- `NOTIFICATION` - Notification events
- `INTEGRATION` - External service events

## Message Threading

### Using Messages

```python
from app.models.message import Message, MessageType, MessageLevel

# Create a message
message = Message.create(
    db=db,
    model_name="projects",
    record_id=project.id,
    body="Great progress on this project!",
    user_id=current_user.id,
    message_type="comment",
    is_internal=False,
)

# Get thread messages
messages = Message.get_thread(
    db=db,
    model_name="projects",
    record_id=project.id,
    include_internal=True,
    limit=50,
)

# Reply to a message
reply = Message.create(
    db=db,
    model_name="projects",
    record_id=project.id,
    body="Thanks for the update!",
    user_id=current_user.id,
    parent_id=message.id,
    message_type="comment",
)

# Get pinned messages
pinned = Message.get_pinned(db, model_name="projects", record_id=project.id)
```

### Message Types

- `COMMENT` - General comments
- `NOTE` - Internal notes
- `SYSTEM` - System-generated messages
- `NOTIFICATION` - Notification messages
- `EMAIL` - Email correspondence
- `LOG` - Log entries
- `APPROVAL` - Approval requests/responses
- `REJECTION` - Rejection notices
- `ASSIGNMENT` - Task assignments

## Security Middleware

FastVue includes several security middleware components:

### Security Headers

```python
# Enabled by default in main.py
from app.middleware.security import SecurityMiddleware

app.add_middleware(SecurityMiddleware)

# Sets these headers:
# - Content-Security-Policy
# - X-Content-Type-Options: nosniff
# - X-Frame-Options: DENY
# - X-XSS-Protection: 1; mode=block
# - Strict-Transport-Security (HSTS)
```

### Rate Limiting

```python
from app.middleware.rate_limiting import RateLimitMiddleware

app.add_middleware(
    RateLimitMiddleware,
    requests_per_minute=60,
    burst_limit=10,
)

# Per-endpoint limits configured in settings
```

### Request Logging

```python
from app.middleware.request_logging import RequestLoggingMiddleware

app.add_middleware(RequestLoggingMiddleware)

# Logs requests with sensitive data masking
# Masks: password, token, secret, authorization, cookie
```

### Threat Detection

```python
from app.middleware.security import ThreatDetectionMiddleware

app.add_middleware(ThreatDetectionMiddleware)

# Detects:
# - SQL injection attempts
# - XSS attempts
# - Path traversal
# - Unusual request patterns
# Calculates risk score and flags suspicious requests
```

## Best Practices

1. **Always use type hints**
2. **Write docstrings for public functions**
3. **Use Pydantic for validation**
4. **Keep endpoints thin, logic in services**
5. **Use dependency injection**
6. **Write tests for new features**
7. **Follow REST conventions**
8. **Handle errors gracefully**
9. **Log important operations**
10. **Document API with OpenAPI**
11. **Use model mixins for common patterns**
12. **Log activities for audit trails**
13. **Use message threading for collaboration**
