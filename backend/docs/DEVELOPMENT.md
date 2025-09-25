# FastNext Backend Development Guide

## Development Environment Setup

### Prerequisites
- **Python 3.11+** (recommended)
- **PostgreSQL 14+**
- **Redis 6+** (for caching and sessions)
- **Node.js 18+** (for frontend integration)
- **Git** for version control

### Quick Setup

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd FastNext/backend
   ```

2. **Create Virtual Environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install Dependencies**
   ```bash
   pip install -r requirements/dev.txt
   ```

4. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your local settings
   ```

5. **Database Setup**
   ```bash
   # Create database
   createdb fastnext_dev
   
   # Run migrations
   alembic upgrade head
   
   # Create admin user
   python scripts/create_admin.py
   ```

6. **Start Development Server**
   ```bash
   python main.py
   ```

### Environment Configuration

#### `.env` File Example
```bash
# Database
DATABASE_URL=postgresql://username:password@localhost/fastnext_dev
DATABASE_TEST_URL=postgresql://username:password@localhost/fastnext_test

# Security
SECRET_KEY=your-super-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Redis
REDIS_URL=redis://localhost:6379/0

# Email (Development)
SMTP_SERVER=localhost
SMTP_PORT=1025
SMTP_USERNAME=
SMTP_PASSWORD=
EMAILS_FROM=noreply@fastnext.dev

# Features
ENABLE_BACKGROUND_TASKS=true
ENABLE_CACHING=true
DEBUG=true

# External Services
SENTRY_DSN=
OPENAI_API_KEY=
```

## Project Structure

### Core Application Structure
```
app/
├── __init__.py
├── main.py                    # FastAPI app factory
├── api/                       # API layer
│   ├── __init__.py
│   ├── main.py               # API router aggregation
│   ├── deps/                 # Dependencies
│   │   ├── auth.py          # Authentication deps
│   │   ├── database.py      # Database deps
│   │   └── permissions.py   # Authorization deps
│   └── v1/                  # API version 1
│       ├── auth/           # Auth endpoints
│       ├── users/          # User endpoints
│       ├── admin/          # Admin endpoints
│       └── workflows/      # Workflow endpoints
├── core/                    # Core configurations
│   ├── config.py           # Settings management
│   ├── security.py         # Security utilities
│   ├── database.py         # DB configuration
│   ├── cache.py           # Cache configuration
│   └── events.py          # Event system
├── domain/                 # Business logic
│   ├── entities/          # Domain entities
│   ├── services/          # Domain services
│   ├── repositories/      # Repository interfaces
│   └── value_objects/     # Value objects
├── infrastructure/        # Technical implementations
│   ├── database/         # DB implementations
│   ├── external/         # External services
│   └── monitoring/       # Monitoring tools
├── application/           # Use cases
│   ├── use_cases/        # Use case implementations
│   ├── commands/         # Command handlers
│   ├── queries/          # Query handlers
│   └── events/           # Event handlers
├── schemas/              # Pydantic schemas
├── models/               # SQLAlchemy models
└── middleware/           # Custom middleware
```

## Development Workflow

### 1. **Feature Development Process**

#### Starting a New Feature
```bash
# Create feature branch
git checkout -b feature/user-notifications

# Create scaffolding (if needed)
python scaffold-cli.py generate --config configs/notification.json

# Run tests
python test_runner.py

# Start development server
python main.py
```

#### Development Cycle
1. **Write Tests First** (TDD approach)
2. **Implement Domain Logic** (business rules)
3. **Add Application Layer** (use cases)
4. **Create API Endpoints** (HTTP interface)
5. **Update Documentation**
6. **Run Full Test Suite**

### 2. **Code Quality Standards**

#### Pre-commit Hooks
```bash
# Install pre-commit hooks
pre-commit install

# Run hooks manually
pre-commit run --all-files
```

#### Code Formatting
```bash
# Format code with black
black app/ tests/

# Sort imports with isort
isort app/ tests/

# Lint with flake8
flake8 app/ tests/

# Type checking with mypy
mypy app/
```

#### Security Scanning
```bash
# Security linting with bandit
bandit -r app/

# Dependency vulnerability scanning
safety check
```

### 3. **Database Development**

#### Creating Migrations
```bash
# Auto-generate migration
alembic revision --autogenerate -m "Add user preferences table"

# Create empty migration
alembic revision -m "Add custom constraints"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

#### Database Operations
```bash
# Reset database
alembic downgrade base
alembic upgrade head

# Create test data
python scripts/seed_data.py

# Backup database
python scripts/backup_db.py
```

### 4. **Testing Strategy**

#### Test Categories
```bash
# Unit tests (fast, isolated)
pytest tests/unit/ -v

# Integration tests (with database)
pytest tests/integration/ -v

# API tests (full HTTP stack)
pytest tests/api/ -v

# End-to-end tests
pytest tests/e2e/ -v

# Performance tests
pytest tests/performance/ -v
```

#### Test Coverage
```bash
# Run tests with coverage
pytest --cov=app --cov-report=html --cov-report=term

# Coverage threshold (minimum 80%)
pytest --cov=app --cov-fail-under=80
```

#### Test Database Management
```bash
# Create test database
createdb fastnext_test

# Run tests with test database
DATABASE_TEST_URL=postgresql://user:pass@localhost/fastnext_test pytest
```

## Code Generation & Scaffolding

### 1. **Using the Scaffolding System**

#### Generate Complete CRUD
```bash
# Generate from configuration file
python scaffold-cli.py generate --config configs/product.json

# Interactive generation
python scaffold-cli.py interactive

# Generate specific components
python scaffold-cli.py generate --name BlogPost --type backend
```

#### Configuration Examples
```json
{
  "name": "Product",
  "pluralName": "Products",
  "description": "Product management system",
  "fields": [
    {
      "name": "name",
      "type": "string",
      "required": true,
      "validation": {"min_length": 2, "max_length": 100}
    },
    {
      "name": "price",
      "type": "number",
      "validation": {"min_value": 0}
    },
    {
      "name": "category",
      "type": "select",
      "options": ["Electronics", "Clothing", "Books"]
    }
  ]
}
```

### 2. **Generated Code Structure**
When you generate a new model, the following files are created:

#### Backend Files
- `app/models/{model}.py` - SQLAlchemy model
- `app/schemas/{model}.py` - Pydantic schemas
- `app/api/v1/{model}s.py` - API endpoints
- `app/services/{model}_service.py` - Business logic
- `tests/test_{model}.py` - Test suite
- `migrations/add_{model}s.py` - Database migration

#### Generated API Endpoints
- `GET /api/v1/{models}/` - List with pagination/filtering
- `POST /api/v1/{models}/` - Create new item
- `GET /api/v1/{models}/{id}` - Get specific item
- `PUT /api/v1/{models}/{id}` - Update item
- `DELETE /api/v1/{models}/{id}` - Delete item
- `POST /api/v1/{models}/{id}/toggle-status` - Toggle active status

## Advanced Features

### 1. **Background Tasks**

#### Celery Setup
```python
# app/core/celery.py
from celery import Celery

celery_app = Celery(
    "fastnext",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

@celery_app.task
def send_welcome_email(user_id: int):
    # Email sending logic
    pass
```

#### Task Usage
```python
# In your endpoint
@router.post("/users/")
async def create_user(user: UserCreate):
    new_user = await user_service.create_user(user)
    # Queue background task
    send_welcome_email.delay(new_user.id)
    return new_user
```

### 2. **Caching Strategy**

#### Redis Caching
```python
from app.core.cache import cache

@cache.cached(timeout=300)  # 5 minutes
async def get_user_profile(user_id: int):
    # Expensive database operation
    return await db.get_user_profile(user_id)
```

#### Cache Invalidation
```python
# Invalidate cache on updates
await cache.delete(f"user_profile_{user_id}")
await cache.delete_pattern("user_list_*")
```

### 3. **Event-Driven Architecture**

#### Domain Events
```python
# app/domain/events.py
from dataclasses import dataclass
from datetime import datetime

@dataclass
class UserCreated:
    user_id: int
    email: str
    created_at: datetime
```

#### Event Handlers
```python
# app/application/events/user_events.py
from app.domain.events import UserCreated

async def handle_user_created(event: UserCreated):
    # Send welcome email
    await email_service.send_welcome_email(event.email)
    
    # Track analytics
    await analytics_service.track_user_signup(event.user_id)
```

### 4. **Performance Monitoring**

#### APM Integration
```python
# app/core/monitoring.py
import opentelemetry
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

def setup_monitoring(app: FastAPI):
    FastAPIInstrumentor.instrument_app(app)
```

#### Custom Metrics
```python
from app.core.metrics import metrics

@router.get("/users/")
async def list_users():
    with metrics.timer("user_list_duration"):
        users = await user_service.list_users()
        metrics.increment("user_list_requests")
        return users
```

## Debugging & Troubleshooting

### 1. **Development Debugging**

#### FastAPI Debug Mode
```python
# main.py
app = FastAPI(debug=True)  # Enable debug mode
```

#### Database Query Logging
```python
# app/core/database.py
engine = create_async_engine(
    DATABASE_URL,
    echo=True  # Log all SQL queries
)
```

#### Exception Handling
```python
import traceback
import logging

logger = logging.getLogger(__name__)

try:
    # Your code here
    pass
except Exception as e:
    logger.error(f"Error occurred: {e}")
    logger.error(traceback.format_exc())
    raise
```

### 2. **Common Issues & Solutions**

#### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connection
psql -h localhost -U username -d fastnext_dev

# Reset connections
sudo systemctl restart postgresql
```

#### Migration Issues
```bash
# Check current migration status
alembic current

# Check migration history
alembic history

# Stamp database at specific revision
alembic stamp head
```

#### Performance Issues
```bash
# Enable SQL logging
export SQLALCHEMY_ECHO=true

# Profile code execution
python -m cProfile -o profile.stats main.py

# Analyze with snakeviz
pip install snakeviz
snakeviz profile.stats
```

### 3. **Monitoring & Logging**

#### Structured Logging
```python
import structlog

logger = structlog.get_logger(__name__)

logger.info(
    "User created",
    user_id=user.id,
    email=user.email,
    correlation_id=request_id
)
```

#### Health Checks
```python
@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "database": await check_database_health(),
        "redis": await check_redis_health(),
        "timestamp": datetime.utcnow().isoformat()
    }
```

## IDE Configuration

### 1. **VS Code Setup**

#### Extensions
- Python
- Pylance
- Python Docstring Generator
- GitLens
- Thunder Client (API testing)

#### Settings (.vscode/settings.json)
```json
{
  "python.defaultInterpreterPath": "./venv/bin/python",
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": true,
  "python.formatting.provider": "black",
  "python.sortImports.args": ["--profile", "black"],
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  }
}
```

#### Launch Configuration (.vscode/launch.json)
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "FastAPI Debug",
      "type": "python",
      "request": "launch",
      "program": "main.py",
      "console": "integratedTerminal",
      "env": {
        "DEBUG": "true"
      }
    }
  ]
}
```

### 2. **PyCharm Setup**

#### Configuration
1. **Interpreter**: Set to `./venv/bin/python`
2. **Code Style**: Configure Black and isort
3. **Database**: Connect to PostgreSQL
4. **Run Configuration**: Point to `main.py`

## Deployment Preparation

### 1. **Production Checklist**

#### Security
- [ ] Change default SECRET_KEY
- [ ] Update CORS settings
- [ ] Configure HTTPS
- [ ] Set up proper authentication
- [ ] Review permission settings

#### Performance
- [ ] Enable production caching
- [ ] Configure connection pooling
- [ ] Set up monitoring
- [ ] Optimize database queries
- [ ] Configure rate limiting

#### Reliability
- [ ] Set up health checks
- [ ] Configure logging
- [ ] Set up error tracking (Sentry)
- [ ] Test backup/restore procedures
- [ ] Configure auto-scaling

### 2. **Environment Preparation**

#### Production Dependencies
```bash
pip install -r requirements/prod.txt
```

#### Environment Variables
```bash
# Required for production
export SECRET_KEY="production-secret-key"
export DATABASE_URL="postgresql://..."
export REDIS_URL="redis://..."
export DEBUG=false
export ENVIRONMENT=production
```

## Contributing Guidelines

### 1. **Code Standards**
- Follow PEP 8 style guide
- Use type hints throughout
- Write comprehensive docstrings
- Maintain test coverage above 80%
- Follow clean architecture principles

### 2. **Pull Request Process**
1. Create feature branch from `main`
2. Write tests for new functionality
3. Ensure all tests pass
4. Update documentation
5. Submit pull request
6. Address review feedback
7. Merge after approval

### 3. **Commit Message Format**
```
feat: add user notification system
fix: resolve database connection issue
docs: update API documentation
test: add integration tests for auth
refactor: improve error handling
```

This development guide provides comprehensive information for setting up and working with the FastNext backend. For specific implementation details, refer to the code examples and architecture documentation.