# Backend Development Guide

This guide covers backend development, testing, and deployment for the FastNext framework.

## Prerequisites

- Python 3.8+
- PostgreSQL 12+
- Git

## Development Environment Setup

### 1. Initial Setup

```bash
# Clone and navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Linux/Mac:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your configuration
# Required variables:
# - DATABASE_URL=postgresql://user:password@localhost/dbname
# - SECRET_KEY=your-secret-key
# - ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### 3. Database Setup

```bash
# Initialize database (if needed)
python -c "from app.db.init_db import init_db; init_db()"

# Run migrations
alembic upgrade head

# Seed initial data (roles, permissions, components)
python -c "from app.db.seed_roles_permissions import create_default_roles_and_permissions; create_default_roles_and_permissions()"
python -c "from app.db.seed_components import create_default_components; create_default_components()"
```

## Development Workflow

### Running the Development Server

```bash
# Start FastAPI server with auto-reload
python main.py

# Server will be available at:
# - API: http://localhost:8000
# - Interactive API docs: http://localhost:8000/docs
# - Alternative docs: http://localhost:8000/redoc
# - OpenAPI specification: http://localhost:8000/api/v1/openapi.json
```

### Code Quality

```bash
# Run linting
pylint app/

# Format code (if black is configured)
black app/

# Run type checking (if mypy is configured)
mypy app/
```

## Testing

### Running Tests

```bash
# Run all tests
pytest

# Run tests with coverage
pytest --cov=app

# Run specific test file
pytest tests/test_specific.py

# Run tests in watch mode
pytest-watch
```

### Test Structure

```
backend/tests/
├── conftest.py           # Pytest configuration and fixtures
├── test_auth.py         # Authentication tests
├── test_users.py        # User management tests
├── test_projects.py     # Project tests
└── test_components.py   # Component tests
```

### Writing Tests

```python
# Example test structure
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_example_endpoint():
    response = client.get("/api/v1/endpoint")
    assert response.status_code == 200
    assert response.json()["status"] == "success"
```

## Database Management

### Migrations

```bash
# Create new migration
alembic revision --autogenerate -m "Description of changes"

# Apply migrations
alembic upgrade head

# Downgrade migration
alembic downgrade -1

# View migration history
alembic history
```

### Database Schema

The backend uses SQLAlchemy ORM with the following key models:
- `User` - User authentication and profile
- `Project` - Application projects
- `Page` - Project pages
- `Component` - Reusable components
- `ComponentInstance` - Component instances on pages
- `Role` & `Permission` - RBAC system
- `ActivityLog` & `AuditTrail` - Audit and logging

## API Development

### Adding New Endpoints

1. **Create/Update Model** (`app/models/`)
```python
from sqlalchemy import Column, Integer, String
from app.db.base import Base

class MyModel(Base):
    __tablename__ = "my_table"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
```

2. **Create Schema** (`app/schemas/`)
```python
from pydantic import BaseModel

class MyModelCreate(BaseModel):
    name: str

class MyModelResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True
```

3. **Create Route** (`app/api/routes/`)
```python
from fastapi import APIRouter, Depends
from app.auth.deps import get_current_user

router = APIRouter()

@router.post("/", response_model=MyModelResponse)
def create_item(item: MyModelCreate, current_user: User = Depends(get_current_user)):
    # Implementation
    pass
```

4. **Register Route** (in `app/api/main.py`)
```python
from app.api.routes import my_model

api_router.include_router(my_model.router, prefix="/my-model", tags=["my-model"])
```

## Production Deployment

### Environment Variables

```bash
# Production environment variables
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"
export SECRET_KEY="your-production-secret-key"
export ACCESS_TOKEN_EXPIRE_MINUTES=60
export ENVIRONMENT="production"
```

### Using Docker

```bash
# Build Docker image
docker build -t fastnext-backend .

# Run container
docker run -d \
  --name fastnext-api \
  -p 8000:8000 \
  -e DATABASE_URL="postgresql://..." \
  -e SECRET_KEY="..." \
  fastnext-backend
```

### Using Gunicorn

```bash
# Install gunicorn
pip install gunicorn

# Run with gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app

# With configuration file
gunicorn -c gunicorn.conf.py app.main:app
```

### Production Checklist

- [ ] Set strong `SECRET_KEY`
- [ ] Use production database
- [ ] Configure proper CORS settings
- [ ] Set up SSL/TLS
- [ ] Configure logging
- [ ] Set up monitoring
- [ ] Configure backup strategy
- [ ] Set up health checks
- [ ] Configure rate limiting
- [ ] Set up error tracking (e.g., Sentry)

## Monitoring and Logging

### Application Logs

Logs are configured in `app/core/logging.py`:
- `logs/fastnext.log` - Application logs
- `logs/security.log` - Security events
- `logs/performance.log` - Performance metrics

### Health Checks

```bash
# Basic health check
curl http://localhost:8000/health

# Database connectivity check
curl http://localhost:8000/health/db
```

## Common Issues and Solutions

### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -h localhost -U username -d database_name
```

### Migration Issues
```bash
# Reset migrations (development only)
alembic downgrade base
alembic upgrade head

# Fix migration conflicts
alembic merge heads
```

### Performance Issues
```bash
# Enable SQL query logging
export SQLALCHEMY_ECHO=true

# Monitor slow queries in PostgreSQL
# Enable log_min_duration_statement in postgresql.conf
```

## Contributing

1. Create feature branch from `main`
2. Make changes following code style guidelines
3. Write/update tests
4. Run linting and tests
5. Submit pull request

### Code Style Guidelines

- Follow PEP 8
- Use type hints
- Write docstrings for functions and classes
- Keep functions small and focused
- Use meaningful variable names
- Handle errors appropriately

## Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Alembic Documentation](https://alembic.sqlalchemy.org/)
- [Pydantic Documentation](https://pydantic-docs.helpmanual.io/)
