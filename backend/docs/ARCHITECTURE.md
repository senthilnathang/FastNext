# Backend Architecture

Detailed architecture documentation for the FastVue backend.

## Overview

The backend follows a layered architecture pattern with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────┐
│                    API Layer (FastAPI)                   │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Routes  │  Dependencies  │  Request/Response       │ │
│  └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│                    Service Layer                         │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Business Logic  │  Validation  │  Orchestration    │ │
│  └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│                    Data Layer                            │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Models (ORM)  │  Schemas (Pydantic)  │  Migrations │ │
│  └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│                  Infrastructure Layer                    │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Database  │  Cache  │  External Services           │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Directory Structure

```
backend/
├── app/
│   ├── api/                    # API Layer
│   │   ├── deps/               # Dependency Injection
│   │   │   ├── __init__.py
│   │   │   ├── auth.py         # Authentication deps
│   │   │   ├── database.py     # Database session
│   │   │   └── pagination.py   # Pagination helpers
│   │   ├── v1/                 # API Version 1
│   │   │   ├── __init__.py
│   │   │   ├── auth.py         # Authentication endpoints
│   │   │   ├── users.py        # User management
│   │   │   ├── companies.py    # Company management
│   │   │   ├── roles.py        # Role management
│   │   │   ├── permissions.py  # Permission management
│   │   │   └── groups.py       # Group management
│   │   └── main.py             # Router aggregation
│   │
│   ├── core/                   # Core Configuration
│   │   ├── __init__.py
│   │   ├── config.py           # Settings (Pydantic)
│   │   ├── security.py         # JWT, passwords, 2FA
│   │   ├── cache.py            # Redis caching
│   │   └── oauth.py            # OAuth providers
│   │
│   ├── db/                     # Database Layer
│   │   ├── __init__.py
│   │   ├── base.py             # SQLAlchemy engine, Base
│   │   ├── session.py          # Session factory
│   │   └── init_db.py          # Initial data seeding
│   │
│   ├── models/                 # SQLAlchemy Models
│   │   ├── __init__.py
│   │   ├── base.py             # BaseModel, Mixins
│   │   ├── user.py             # User model
│   │   ├── company.py          # Company model
│   │   ├── role.py             # Role model
│   │   ├── permission.py       # Permission model
│   │   ├── group.py            # Group model
│   │   ├── user_company_role.py # Junction table
│   │   ├── social_account.py   # OAuth accounts
│   │   └── audit.py            # Audit log model
│   │
│   ├── schemas/                # Pydantic Schemas
│   │   ├── __init__.py
│   │   ├── user.py             # User DTOs
│   │   ├── company.py          # Company DTOs
│   │   ├── role.py             # Role DTOs
│   │   ├── permission.py       # Permission DTOs
│   │   └── token.py            # Auth token DTOs
│   │
│   └── services/               # Business Logic
│       ├── __init__.py
│       ├── base.py             # BaseCRUDService with type hints
│       ├── user.py             # UserService
│       ├── auth.py             # AuthService
│       ├── permission.py       # PermissionService (optimized, cached)
│       └── rbac.py             # RBAC services (ContentType, MenuItem, AccessRule)
│
├── alembic/                    # Database Migrations
│   ├── versions/               # Migration files
│   ├── env.py                  # Migration environment
│   └── script.py.mako          # Template
│
├── tests/                      # Test Suite
│   ├── conftest.py             # Pytest fixtures (SQLite in-memory)
│   ├── unit/                   # Unit tests
│   │   └── services/           # Service tests
│   │       ├── test_rbac_service.py
│   │       └── test_permission_service.py
│   └── integration/            # Integration tests
│       └── api/                # API tests
│
├── main.py                     # Application entry point
├── alembic.ini                 # Alembic configuration
├── requirements.txt            # Dependencies
└── .env.example                # Environment template
```

## Layer Details

### API Layer (`app/api/`)

Handles HTTP requests, routing, and response formatting.

#### Dependencies (`app/api/deps/`)

Reusable dependencies for FastAPI endpoints:

```python
# auth.py - Authentication dependencies
def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """Extract and validate user from JWT token."""
    pass

def require_permissions(permissions: list[str]):
    """Factory for permission-checking dependency."""
    def dependency(user: User = Depends(get_current_user)) -> User:
        if not has_permissions(user, permissions):
            raise HTTPException(403)
        return user
    return dependency

# database.py - Database session
def get_db() -> Generator[Session, None, None]:
    """Provide database session with automatic cleanup."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

#### Route Structure

```python
# v1/users.py
router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/", response_model=UserListResponse)
def list_users(
    page: int = 1,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions(["user:read"])),
):
    """List users with pagination."""
    pass

@router.post("/", response_model=UserResponse, status_code=201)
def create_user(
    data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions(["user:create"])),
):
    """Create new user."""
    pass
```

### Service Layer (`app/services/`)

Contains business logic, separate from HTTP concerns.

```python
# base.py - Generic CRUD service
class BaseCRUDService(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: Type[ModelType], db: Session):
        self.model = model
        self.db = db

    def get(self, id: int) -> ModelType | None:
        return self.db.get(self.model, id)

    def get_multi(self, page: int = 1, page_size: int = 20) -> tuple[list, int]:
        offset = (page - 1) * page_size
        query = select(self.model)
        total = self.db.scalar(select(func.count()).select_from(query.subquery()))
        items = self.db.scalars(query.offset(offset).limit(page_size)).all()
        return items, total

    def create(self, schema: CreateSchemaType, **kwargs) -> ModelType:
        obj = self.model(**schema.model_dump(), **kwargs)
        self.db.add(obj)
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def update(self, obj: ModelType, schema: UpdateSchemaType) -> ModelType:
        for field, value in schema.model_dump(exclude_unset=True).items():
            setattr(obj, field, value)
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def delete(self, id: int) -> None:
        obj = self.get(id)
        if obj:
            self.db.delete(obj)
            self.db.commit()
```

### Data Layer

#### Models (`app/models/`)

SQLAlchemy ORM models with mixins for common functionality:

```python
# base.py - Mixins
class TimestampMixin:
    """Adds created_at and updated_at fields."""
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

class SoftDeleteMixin:
    """Adds soft delete support."""
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)

class AuditMixin:
    """Adds created_by and updated_by fields."""
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)

# Example model
class User(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, index=True)
    username = Column(String(100), unique=True, index=True)
    hashed_password = Column(String(255))
    # ... more fields
```

#### Schemas (`app/schemas/`)

Pydantic models for validation and serialization:

```python
# user.py
class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    full_name: str | None = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserUpdate(BaseModel):
    email: EmailStr | None = None
    username: str | None = Field(None, min_length=3, max_length=100)
    full_name: str | None = None

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
```

### Core Layer (`app/core/`)

#### Configuration

```python
# config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Application
    APP_NAME: str = "FastVue"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # Database
    DATABASE_URL: str

    # Redis
    REDIS_URL: str

    # Security
    SECRET_KEY: str
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    BACKEND_CORS_ORIGINS: str

    class Config:
        env_file = ".env"

settings = Settings()
```

#### Security

```python
# security.py
from passlib.context import CryptContext
from jose import jwt

pwd_context = CryptContext(schemes=["bcrypt"])

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict, expires_delta: timedelta) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm="HS256")
```

## Authentication Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │────▶│  Login   │────▶│ Validate │────▶│ Generate │
│          │     │ Request  │     │ Password │     │  Tokens  │
└──────────┘     └──────────┘     └──────────┘     └────┬─────┘
                                                        │
                      ┌─────────────────────────────────┘
                      ▼
              ┌──────────────┐     ┌──────────────┐
              │  Check 2FA   │────▶│   Return     │
              │  (optional)  │     │   Response   │
              └──────────────┘     └──────────────┘
```

### Token Structure

```python
# Access Token Payload
{
    "sub": "user_id",
    "email": "user@example.com",
    "company_id": 1,
    "permissions": ["user:read", "user:write"],
    "type": "access",
    "exp": 1234567890
}

# Refresh Token Payload
{
    "sub": "user_id",
    "type": "refresh",
    "jti": "unique-token-id",  # For blacklisting
    "exp": 1234567890
}
```

## Authorization Flow

```
Request with JWT
       │
       ▼
┌─────────────────┐
│  Validate JWT   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Get User      │
│  from Database  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Check Company   │
│    Context      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Get Effective   │──────┐
│  Permissions    │      │
└────────┬────────┘      │
         │               ▼
         │      ┌─────────────────┐
         │      │  From Roles     │
         │      │  From Groups    │
         │      │  Direct Perms   │
         │      └─────────────────┘
         ▼
┌─────────────────┐
│ Check Required  │
│  Permission     │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
  Allow     Deny
    │       (403)
    ▼
 Execute
 Handler
```

## Database Schema

### Core Tables

```
users
├── id (PK)
├── email (unique)
├── username (unique)
├── hashed_password
├── full_name
├── is_active
├── is_superuser
├── two_factor_enabled
├── current_company_id (FK)
├── created_at
└── updated_at

companies
├── id (PK)
├── name
├── code (unique)
├── parent_id (FK, self)
├── is_active
├── created_at
└── updated_at

roles
├── id (PK)
├── name
├── codename (unique)
├── company_id (FK, nullable)
├── is_system_role
├── is_active
├── created_at
└── updated_at

permissions
├── id (PK)
├── name
├── codename (unique)
├── category
├── action
├── resource
├── is_system_permission
└── is_active

user_company_roles
├── id (PK)
├── user_id (FK)
├── company_id (FK)
├── role_id (FK)
├── is_default
└── assigned_at

role_permissions
├── role_id (FK)
└── permission_id (FK)

audit_logs
├── id (PK)
├── user_id (FK)
├── company_id (FK)
├── action
├── entity_type
├── entity_id
├── old_values (JSON)
├── new_values (JSON)
├── ip_address
└── created_at
```

## Permission Service (Optimized)

The `PermissionService` provides optimized permission checking with Redis caching and efficient JOINs instead of N+1 queries.

### Permission Retrieval Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Check Redis    │────▶│  Cache Hit?     │────▶│  Return cached  │
│  Cache          │     │                 │     │  permissions    │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │ No
                                 ▼
                        ┌─────────────────┐
                        │  Query DB with  │
                        │  JOINs (2 queries)│
                        └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  Cache result   │
                        │  (1 hour TTL)   │
                        └─────────────────┘
```

### PermissionService Usage

```python
from app.services.permission import PermissionService

service = PermissionService(db)

# Get all permissions for a user (cached)
permissions = service.get_user_permissions(user_id, company_id)
# Returns: {"user.read", "user.create", "company.read", ...}

# Check specific permission (single query)
has_access = service.has_permission(user_id, "user.read", company_id)

# Invalidate cache on permission change
service.invalidate_user_cache(user_id)
service.invalidate_role_cache(role_id)  # Clears cache for all users with role
service.invalidate_group_cache(group_id)  # Clears cache for all users in group
```

### Cache Keys

```
user:{user_id}:company:{company_id}:permissions
```

TTL: 1 hour (3600 seconds)

## RBAC Services

Database-backed RBAC models replace in-memory storage for menu permissions and access rules.

### Models

```python
# ContentType - Similar to Django's ContentType
ContentType(app_label="core", model="user", name="User")

# MenuItem - Navigation menu structure
MenuItem(code="settings.users", name="Users", path="/settings/users", parent_id=1)

# UserMenuPermission - Per-user menu access
UserMenuPermission(user_id=1, menu_item_id=1, can_view=True, can_edit=True)

# AccessRule - Field-level access control
AccessRule(name="Own Records", content_type_id=1, user_id=1, can_read=True)
```

### Services

```python
from app.services.rbac import (
    ContentTypeService,
    MenuItemService,
    UserMenuPermissionService,
    AccessRuleService,
)

# ContentType operations
ct_service = ContentTypeService(db)
ct = ct_service.get_or_create("core", "user", "User")

# Menu item operations
menu_service = MenuItemService(db)
tree = menu_service.get_tree()  # Hierarchical menu
item = menu_service.get_by_code("settings.users")

# User menu permissions
perm_service = UserMenuPermissionService(db)
perm_service.set_user_permission(
    user_id=1, menu_item_id=1, company_id=1,
    can_view=True, can_edit=True
)
permissions = perm_service.get_user_permissions(user_id=1, company_id=1)

# Access rules
rule_service = AccessRuleService(db)
rule = rule_service.create_rule(
    name="User Access",
    content_type_id=1,
    user_id=1,
    can_read=True,
    can_write=True
)
```

## Caching Strategy

```python
# cache.py
import redis
from functools import wraps

redis_client = redis.from_url(settings.REDIS_URL)

def cached(ttl: int = 300):
    """Cache decorator with TTL."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            key = f"{func.__name__}:{hash((args, tuple(kwargs.items())))}"
            cached_value = redis_client.get(key)
            if cached_value:
                return json.loads(cached_value)
            result = func(*args, **kwargs)
            redis_client.setex(key, ttl, json.dumps(result))
            return result
        return wrapper
    return decorator

# Usage
@cached(ttl=300)
def get_user_permissions(user_id: int) -> list[str]:
    # Expensive database query
    pass
```

### Permission Caching

The `PermissionService` implements permission-specific caching:

```python
from app.services.permission import PermissionService

# Cache key: user:{id}:company:{id}:permissions
# TTL: 3600 seconds (1 hour)

# Automatic cache invalidation
service.invalidate_user_cache(user_id)           # Single user
service.invalidate_role_cache(role_id)           # All users with role
service.invalidate_group_cache(group_id)         # All users in group
PermissionService.invalidate_all_permissions_cache()  # Global clear
```

## Error Handling

```python
# Custom exceptions
class FastVueException(Exception):
    def __init__(self, message: str, code: str = None):
        self.message = message
        self.code = code

class NotFoundException(FastVueException):
    pass

class UnauthorizedException(FastVueException):
    pass

# Global exception handler
@app.exception_handler(FastVueException)
async def fastvue_exception_handler(request: Request, exc: FastVueException):
    return JSONResponse(
        status_code=400,
        content={"error": exc.message, "code": exc.code},
    )
```

## Testing Architecture

```
tests/
├── conftest.py          # Shared fixtures
├── factories/           # Test data factories
│   ├── user.py
│   └── company.py
├── unit/                # Unit tests
│   ├── test_services/
│   └── test_models/
├── integration/         # Integration tests
│   ├── test_auth.py
│   └── test_users.py
└── e2e/                 # End-to-end tests
    └── test_workflows.py
```

## Performance Considerations

1. **Database Optimization**
   - Use indexes on frequently queried columns
   - Implement connection pooling
   - Use select_related/joinedload for N+1 prevention

2. **Caching**
   - Cache user permissions (5 min TTL)
   - Cache static configuration
   - Use Redis for session storage

3. **Async Operations**
   - Background tasks for emails
   - Async database operations (optional)
   - Queue for heavy processing

4. **API Optimization**
   - Pagination for list endpoints
   - Field selection for large responses
   - Response compression

## Unified Inbox System (Huly-inspired)

The inbox system provides a unified view of all user communications, inspired by Huly.io.

### Inbox Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Inbox Item                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ item_type: message | notification | activity | mention  ││
│  │ reference_type: messages | notifications | activity_logs││
│  │ reference_id: FK to actual record                       ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│                    Source Tracking                           │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ source_model: users | leave_requests | etc.             ││
│  │ source_id: record that triggered the inbox item         ││
│  │ actor_id: user who performed the action                 ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│                    Status Flags                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ is_read | is_archived | is_starred | priority           ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Inbox API Endpoints

```
GET    /api/v1/inbox/                  # List inbox items (filtered)
GET    /api/v1/inbox/stats             # Get unread counts by type
GET    /api/v1/inbox/sent              # Get sent messages
GET    /api/v1/inbox/drafts            # Get saved drafts
POST   /api/v1/inbox/drafts            # Create draft
PUT    /api/v1/inbox/drafts/{id}       # Update draft
DELETE /api/v1/inbox/drafts/{id}       # Delete draft
GET    /api/v1/inbox/{id}              # Get item with details
PATCH  /api/v1/inbox/{id}              # Update item (read, star, etc.)
DELETE /api/v1/inbox/{id}              # Delete item
POST   /api/v1/inbox/{id}/read         # Mark as read
POST   /api/v1/inbox/{id}/unread       # Mark as unread
POST   /api/v1/inbox/{id}/archive      # Archive item
POST   /api/v1/inbox/{id}/unarchive    # Unarchive item
POST   /api/v1/inbox/{id}/star         # Star item
POST   /api/v1/inbox/{id}/unstar       # Unstar item
POST   /api/v1/inbox/send              # Send direct message
POST   /api/v1/inbox/bulk-read         # Bulk mark as read
POST   /api/v1/inbox/bulk-archive      # Bulk archive
```

### InboxItem Model

```python
class InboxItem(Base):
    id: int (PK)
    user_id: int (FK -> users)           # Inbox owner
    item_type: Enum                       # message, notification, activity, mention
    reference_type: str                   # Table name of referenced record
    reference_id: int                     # ID of referenced record
    source_model: str                     # Model that triggered this item
    source_id: int                        # ID of source record
    title: str                            # Display title
    preview: str                          # Truncated preview text
    priority: Enum                        # low, normal, high, urgent
    is_read: bool                         # Read status
    is_archived: bool                     # Archive status
    is_starred: bool                      # Starred/bookmarked
    actor_id: int (FK -> users)           # User who triggered this
    created_at, updated_at
```

### Message Flow

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│  Sender  │────▶│ POST /send   │────▶│ Create       │
│          │     │              │     │ Message      │
└──────────┘     └──────────────┘     └──────┬───────┘
                                              │
                      ┌───────────────────────┘
                      ▼
              ┌──────────────┐     ┌──────────────┐
              │ Create       │────▶│ Recipient    │
              │ InboxItem    │     │ sees in      │
              │ for recipient│     │ their inbox  │
              └──────────────┘     └──────────────┘
```

### Inbox Service Usage

```python
from app.services.inbox import InboxService

service = InboxService(db)

# Get unified inbox with filters
items = service.get_inbox(
    user_id=1,
    item_type="message",
    is_read=False,
    page=1,
    page_size=20
)

# Get stats
stats = service.get_stats(user_id=1)
# Returns: {total_count, unread_count, unread_by_type: {message: 5, notification: 3, ...}}

# Mark as read
service.mark_as_read(item_id=1, user_id=1)

# Bulk operations
service.bulk_mark_read(item_ids=[1, 2, 3], user_id=1)
service.bulk_archive(item_ids=[1, 2, 3], user_id=1)
```

### Frontend Integration

The inbox frontend consists of:

```
frontend/apps/web-fastvue/src/
├── views/inbox/
│   └── index.vue              # Main inbox view with tabs
├── components/inbox/
│   └── ComposeMessage.vue     # Message composer modal
├── store/
│   └── inbox.ts               # Pinia store for inbox state
└── api/core/
    └── inbox.ts               # API client functions
```

### Inbox Store (Pinia)

```typescript
// store/inbox.ts
export const useInboxStore = defineStore('inbox', {
  state: () => ({
    items: [],
    unreadCount: 0,
    unreadByType: { message: 0, notification: 0, activity: 0, mention: 0 },
    loading: false,
  }),
  actions: {
    async fetchInbox(filters) { ... },
    async markAsRead(itemId) { ... },
    async archive(itemId) { ... },
    startPolling(interval) { ... },
    stopPolling() { ... },
  },
});
```
