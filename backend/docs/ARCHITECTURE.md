# FastNext Backend Architecture Documentation

## Overview

The FastNext backend is built on **FastAPI 0.115+** following a **clean architecture pattern** with clear separation of concerns, enterprise-grade features, Row Level Security (RLS), and comprehensive scaffolding capabilities.

## Architecture Principles

### 1. **Domain-Driven Design (DDD)**
- **Domain Layer**: Core business logic in `app/models/` and `app/services/`
- **Application Layer**: Use cases and orchestration in `app/api/routes/`
- **Infrastructure Layer**: Database, external APIs, and frameworks in `app/db/`, `app/core/`
- **Interface Layer**: FastAPI routes and schemas in `app/api/` and `app/schemas/`

### 2. **Clean Architecture Benefits**
- **Independence**: Business logic independent of frameworks, UI, and databases
- **Testability**: Easy unit testing with clear boundaries
- **Flexibility**: Easy to change external dependencies
- **Maintainability**: Clear code organization and responsibilities

### 3. **SOLID Principles Implementation**
- **Single Responsibility**: Each module has one reason to change
- **Open/Closed**: Extensible through interfaces and dependency injection
- **Liskov Substitution**: Proper inheritance and interface usage
- **Interface Segregation**: Small, focused interfaces
- **Dependency Inversion**: Depend on abstractions, not concretions

## Folder Structure (Optimized)

```
backend/
├── app/                           # Main application code
│   ├── __init__.py
│   ├── api/                       # API layer (Interface)
│   │   ├── __init__.py
│   │   ├── main.py               # API router aggregation
│   │   ├── deps/                 # Dependency providers
│   │   │   ├── __init__.py
│   │   │   ├── auth.py          # Authentication dependencies
│   │   │   ├── database.py      # Database session dependencies
│   │   │   ├── pagination.py    # Pagination dependencies
│   │   │   └── permissions.py   # Authorization dependencies
│   │   └── v1/                  # API version 1
│   │       ├── __init__.py
│   │       ├── auth/            # Authentication endpoints
│   │       │   ├── __init__.py
│   │       │   ├── login.py
│   │       │   ├── register.py
│   │       │   └── tokens.py
│   │       ├── admin/           # Admin-only endpoints
│   │       │   ├── __init__.py
│   │       │   ├── users.py
│   │       │   ├── roles.py
│   │       │   ├── permissions.py
│   │       │   └── system.py
│   │       ├── users/           # User management
│   │       │   ├── __init__.py
│   │       │   ├── profile.py
│   │       │   ├── settings.py
│   │       │   └── activities.py
│   │       └── workflows/       # Workflow management
│   │           ├── __init__.py
│   │           ├── types.py
│   │           ├── templates.py
│   │           ├── instances.py
│   │           └── states.py
│   ├── core/                     # Core configurations (Infrastructure)
│   │   ├── __init__.py
│   │   ├── config.py            # Application settings
│   │   ├── database.py          # Database configuration
│   │   ├── security.py          # Security utilities
│   │   ├── cache.py             # Caching configuration
│   │   ├── logging.py           # Logging setup
│   │   ├── exceptions.py        # Custom exception classes
│   │   ├── events.py            # Event system
│   │   └── monitoring.py        # Monitoring and metrics
│   ├── domain/                   # Domain layer (Business Logic)
│   │   ├── __init__.py
│   │   ├── entities/            # Domain entities
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── workflow.py
│   │   │   ├── project.py
│   │   │   └── permission.py
│   │   ├── repositories/        # Repository interfaces
│   │   │   ├── __init__.py
│   │   │   ├── user_repository.py
│   │   │   ├── workflow_repository.py
│   │   │   └── base_repository.py
│   │   ├── services/            # Domain services
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py
│   │   │   ├── workflow_engine.py
│   │   │   ├── permission_service.py
│   │   │   └── notification_service.py
│   │   └── value_objects/       # Value objects
│   │       ├── __init__.py
│   │       ├── email.py
│   │       ├── password.py
│   │       └── workflow_state.py
│   ├── infrastructure/          # Infrastructure layer
│   │   ├── __init__.py
│   │   ├── database/           # Database implementation
│   │   │   ├── __init__.py
│   │   │   ├── models/         # SQLAlchemy models
│   │   │   ├── repositories/   # Repository implementations
│   │   │   ├── migrations/     # Database migrations
│   │   │   └── seeders/        # Data seeders
│   │   ├── external/          # External service integrations
│   │   │   ├── __init__.py
│   │   │   ├── email_service.py
│   │   │   ├── storage_service.py
│   │   │   └── payment_service.py
│   │   └── monitoring/        # Monitoring implementations
│   │       ├── __init__.py
│   │       ├── metrics.py
│   │       └── health_checks.py
│   ├── application/            # Application layer
│   │   ├── __init__.py
│   │   ├── use_cases/         # Use case implementations
│   │   │   ├── __init__.py
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   └── workflows/
│   │   ├── commands/          # Command handlers (CQRS)
│   │   │   ├── __init__.py
│   │   │   └── user_commands.py
│   │   ├── queries/           # Query handlers (CQRS)
│   │   │   ├── __init__.py
│   │   │   └── user_queries.py
│   │   └── events/            # Event handlers
│   │       ├── __init__.py
│   │       └── user_events.py
│   ├── schemas/               # Pydantic schemas (Interface)
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── users.py
│   │   ├── workflows.py
│   │   ├── common.py
│   │   └── responses.py
│   └── middleware/            # Custom middleware
│       ├── __init__.py
│       ├── auth_middleware.py
│       ├── logging_middleware.py
│       ├── cors_middleware.py
│       └── error_middleware.py
├── tests/                     # Test suite
│   ├── __init__.py
│   ├── conftest.py           # Test configuration
│   ├── unit/                 # Unit tests
│   │   ├── domain/
│   │   ├── application/
│   │   └── infrastructure/
│   ├── integration/          # Integration tests
│   │   ├── api/
│   │   ├── database/
│   │   └── external/
│   ├── e2e/                  # End-to-end tests
│   │   ├── auth_flows.py
│   │   └── workflow_flows.py
│   └── fixtures/             # Test data and fixtures
│       ├── users.py
│       └── workflows.py
├── scripts/                  # Utility scripts
│   ├── setup_dev_db.py      # Development database setup
│   ├── create_admin.py      # Create admin user
│   ├── migrate.py           # Migration runner
│   └── backup_db.py         # Database backup
├── docs/                     # Documentation
│   ├── ARCHITECTURE.md      # This file
│   ├── API_REFERENCE.md     # API documentation
│   ├── DEPLOYMENT.md        # Deployment guide
│   ├── DEVELOPMENT.md       # Development setup
│   ├── TESTING.md           # Testing guide
│   └── SECURITY.md          # Security documentation
├── migrations/              # Alembic migrations
├── scaffolding/            # Code generation system
├── requirements/           # Dependencies
│   ├── base.txt           # Base requirements
│   ├── dev.txt            # Development requirements
│   ├── prod.txt           # Production requirements
│   └── test.txt           # Testing requirements
├── deploy/                 # Deployment configurations
│   ├── docker/
│   ├── kubernetes/
│   └── terraform/
├── monitoring/            # Monitoring configurations
│   ├── prometheus/
│   ├── grafana/
│   └── alerting/
├── main.py               # Application entry point
├── pyproject.toml       # Project configuration
├── Dockerfile           # Docker configuration
├── docker-compose.yml   # Development environment
└── README.md           # Project overview
```

## Core Components

### 1. **API Layer (`app/api/`)**
- **Purpose**: Handle HTTP requests/responses
- **Responsibilities**:
  - Request validation
  - Response serialization
  - Route definition
  - Authentication/Authorization
  - Error handling

### 2. **Domain Layer (`app/domain/`)**
- **Purpose**: Core business logic
- **Responsibilities**:
  - Business rules enforcement
  - Domain entities and value objects
  - Domain services
  - Repository interfaces

### 3. **Application Layer (`app/application/`)**
- **Purpose**: Orchestrate use cases
- **Responsibilities**:
  - Use case implementations
  - Command/Query handlers (CQRS pattern)
  - Event handling
  - Cross-cutting concerns

### 4. **Infrastructure Layer (`app/infrastructure/`)**
- **Purpose**: Technical implementation details
- **Responsibilities**:
  - Database access
  - External service integration
  - File system operations
  - Third-party libraries

## Design Patterns

### 1. **Repository Pattern**
```python
# Domain layer interface
class UserRepository(ABC):
    @abstractmethod
    async def get_by_id(self, user_id: int) -> Optional[User]:
        pass
    
    @abstractmethod
    async def create(self, user: User) -> User:
        pass

# Infrastructure layer implementation
class SQLAlchemyUserRepository(UserRepository):
    async def get_by_id(self, user_id: int) -> Optional[User]:
        # SQLAlchemy implementation
        pass
```

### 2. **Dependency Injection**
```python
# Use case depends on abstraction
class CreateUserUseCase:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo
    
    async def execute(self, command: CreateUserCommand) -> User:
        # Business logic
        pass

# Dependency injection in FastAPI
@router.post("/users")
async def create_user(
    command: CreateUserCommand,
    use_case: CreateUserUseCase = Depends()
):
    return await use_case.execute(command)
```

### 3. **CQRS (Command Query Responsibility Segregation)**
```python
# Separate read and write models
class UserCommand:
    """For write operations"""
    pass

class UserQuery:
    """For read operations"""
    pass

class UserCommandHandler:
    async def handle_create_user(self, command: CreateUserCommand):
        pass

class UserQueryHandler:
    async def handle_get_user(self, query: GetUserQuery):
        pass
```

### 4. **Event-Driven Architecture**
```python
# Domain events
class UserCreated(DomainEvent):
    user_id: int
    email: str

# Event handlers
class SendWelcomeEmailHandler:
    async def handle(self, event: UserCreated):
        # Send welcome email
        pass

# Event dispatcher
class EventDispatcher:
    async def dispatch(self, event: DomainEvent):
        handlers = self.get_handlers(type(event))
        for handler in handlers:
            await handler.handle(event)
```

## Security Architecture

### 1. **Authentication Flow**
```
Client Request → JWT Token → Token Validation → User Context → Route Handler
```

### 2. **Authorization Layers**
- **Route-level**: `@require_permissions("user.read")`
- **Resource-level**: `@require_resource_access("project", "owner")`
- **Field-level**: Conditional field serialization based on permissions

### 3. **Security Middleware Stack**
1. **CORS Middleware**: Handle cross-origin requests
2. **Security Headers**: Add security headers (HSTS, CSP, etc.)
3. **Rate Limiting**: Prevent abuse
4. **Request Validation**: Validate and sanitize input
5. **Authentication**: Verify JWT tokens
6. **Authorization**: Check permissions

## Database Architecture

### 1. **SQLAlchemy 2.x Modern Patterns**
```python
# Modern declarative mapping
class User(Base):
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    
    # Relationships with proper typing
    roles: Mapped[List["Role"]] = relationship(back_populates="users")
```

### 2. **Migration Strategy**
- **Feature migrations**: One migration per feature
- **Data migrations**: Separate from schema migrations
- **Rollback support**: All migrations are reversible
- **Environment consistency**: Same migrations across all environments

### 3. **Query Optimization**
- **Eager loading**: Use `selectinload()` for N+1 prevention
- **Lazy loading**: Default for optional relationships
- **Query profiling**: Log slow queries automatically
- **Index optimization**: Automatic index suggestions

## Performance Architecture

### 1. **Caching Strategy**
- **Application Cache**: In-memory caching for frequently accessed data
- **Redis Cache**: Distributed caching for session data
- **Database Cache**: Query result caching
- **CDN Cache**: Static asset caching

### 2. **Async Optimization**
- **Connection Pooling**: SQLAlchemy async engine with proper pool size
- **Background Tasks**: Celery for heavy operations
- **Stream Processing**: Async generators for large datasets
- **Circuit Breakers**: Prevent cascade failures

### 3. **Monitoring and Observability**
- **Metrics**: Custom metrics with Prometheus
- **Tracing**: Distributed tracing with OpenTelemetry
- **Logging**: Structured logging with correlation IDs
- **Health Checks**: Comprehensive health monitoring

## Testing Architecture

### 1. **Test Pyramid**
```
        E2E Tests (Few)
      Integration Tests (Some)
    Unit Tests (Many)
```

### 2. **Test Categories**
- **Unit Tests**: Domain logic, use cases, services
- **Integration Tests**: Database operations, external APIs
- **Contract Tests**: API schema validation
- **E2E Tests**: Complete user workflows

### 3. **Test Utilities**
- **Factories**: Generate test data with Factory Boy
- **Fixtures**: Reusable test setup with pytest fixtures
- **Mocks**: Mock external dependencies
- **Database**: Isolated test database per test

## Deployment Architecture

### 1. **Containerization**
- **Multi-stage builds**: Optimize Docker image size
- **Health checks**: Container health monitoring
- **Resource limits**: Proper CPU/memory limits
- **Security scanning**: Vulnerability scanning in CI/CD

### 2. **Environment Management**
- **12-Factor App**: Environment-based configuration
- **Secret Management**: Encrypted secrets with proper rotation
- **Feature Flags**: Runtime feature toggling
- **Configuration Validation**: Pydantic settings validation

### 3. **Scaling Strategy**
- **Horizontal Scaling**: Stateless application design
- **Database Scaling**: Read replicas and connection pooling
- **Load Balancing**: Application load balancer with health checks
- **Auto Scaling**: Resource-based scaling policies

## Development Workflow

### 1. **Code Quality**
- **Pre-commit hooks**: Automated code formatting and linting
- **Code review**: Required for all changes
- **Static analysis**: Mypy for type checking
- **Security scanning**: Bandit for security issues

### 2. **CI/CD Pipeline**
```
Code Push → Tests → Security Scan → Build → Deploy → Monitor
```

### 3. **Development Environment**
- **Docker Compose**: Complete local development stack
- **Hot Reload**: Automatic code reloading
- **Database Migrations**: Automatic migration on startup
- **Test Data**: Seeders for development data

## Troubleshooting

### 1. **Common Issues**
- **Database Connection**: Check connection pool settings
- **Memory Usage**: Monitor SQLAlchemy session management
- **Performance**: Use query profiling and APM tools
- **Security**: Review authentication and authorization logs

### 2. **Debugging Tools**
- **FastAPI Debug Mode**: Enhanced error messages
- **Database Query Logging**: SQL query inspection
- **Performance Profiling**: Code execution profiling
- **Memory Profiling**: Memory usage analysis

### 3. **Monitoring Dashboards**
- **Application Metrics**: Response time, error rate, throughput
- **Infrastructure Metrics**: CPU, memory, disk, network
- **Business Metrics**: User activities, feature usage
- **Security Metrics**: Failed logins, suspicious activities

This architecture provides a solid foundation for building scalable, maintainable, and secure web applications with FastAPI while following enterprise best practices and clean architecture principles.