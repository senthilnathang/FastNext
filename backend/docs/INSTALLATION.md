# Backend Installation Guide

Complete guide for setting up the FastVue backend development environment.

## Prerequisites

### Required Software

| Software | Version | Installation |
|----------|---------|--------------|
| Python | 3.11+ | [python.org](https://python.org) |
| PostgreSQL | 15+ | [postgresql.org](https://postgresql.org) |
| Redis | 7+ | [redis.io](https://redis.io) |
| Git | 2.40+ | [git-scm.com](https://git-scm.com) |

### Optional (Recommended)

| Software | Purpose |
|----------|---------|
| Docker | Run PostgreSQL/Redis containers |
| pyenv | Python version management |
| direnv | Automatic env loading |

## Installation Methods

### Method 1: Local Development (Recommended)

#### Step 1: Clone Repository

```bash
git clone https://github.com/your-org/fastvue.git
cd fastvue/backend
```

#### Step 2: Create Virtual Environment

```bash
# Using venv (built-in)
python3.11 -m venv venv

# Activate virtual environment
# Linux/macOS:
source venv/bin/activate

# Windows (cmd):
venv\Scripts\activate.bat

# Windows (PowerShell):
venv\Scripts\Activate.ps1
```

#### Step 3: Install Dependencies

```bash
# Upgrade pip
pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt

# Install development dependencies (optional)
pip install -r requirements-dev.txt
```

#### Step 4: Setup Database

**Option A: Using Docker (Recommended)**

```bash
# Start PostgreSQL and Redis
docker compose up -d db redis

# Wait for services to be ready
docker compose logs -f db
```

**Option B: Local PostgreSQL**

```bash
# Create database
createdb fastvue

# Create user
createuser -P fastvue
# Enter password: fastvue123

# Grant privileges
psql -c "GRANT ALL PRIVILEGES ON DATABASE fastvue TO fastvue;"
```

#### Step 5: Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit configuration
nano .env  # or use your preferred editor
```

**Required Environment Variables:**

```env
# Database
DATABASE_URL=postgresql://fastvue:fastvue123@localhost:5432/fastvue

# Redis
REDIS_URL=redis://localhost:6379/0

# Security (generate new keys for production!)
SECRET_KEY=your-secret-key-min-32-chars
JWT_SECRET_KEY=your-jwt-secret-key-min-32-chars

# Application
DEBUG=true
ENVIRONMENT=development
```

#### Step 6: Run Migrations

```bash
# Apply all migrations
alembic upgrade head

# Verify migration status
alembic current
```

#### Step 7: Initialize Data (Optional)

```bash
# Create admin user and initial data
python -c "from app.db.init_db import init_db; init_db()"
```

#### Step 8: Start Development Server

```bash
# Start with auto-reload
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Or with specific settings
uvicorn main:app --reload --host 127.0.0.1 --port 8000 --log-level debug
```

#### Step 9: Verify Installation

```bash
# Check API health
curl http://localhost:8000/health

# Open API docs
open http://localhost:8000/docs
```

### Method 2: Docker Development

#### Step 1: Clone and Setup

```bash
git clone https://github.com/your-org/fastvue.git
cd fastvue

# Copy environment file
cp .env.example .env
```

#### Step 2: Build and Start

```bash
# Build containers
docker compose build backend

# Start all services
docker compose up -d

# View logs
docker compose logs -f backend
```

#### Step 3: Run Migrations

```bash
docker compose exec backend alembic upgrade head
```

#### Step 4: Verify

```bash
curl http://localhost:8000/health
```

## Post-Installation

### IDE Setup

#### VS Code

1. Install Python extension
2. Select interpreter: `./venv/bin/python`
3. Install recommended extensions:
   - Python
   - Pylance
   - Python Debugger
   - Ruff (linter)

**`.vscode/settings.json`:**

```json
{
  "python.defaultInterpreterPath": "./venv/bin/python",
  "python.analysis.typeCheckingMode": "basic",
  "editor.formatOnSave": true,
  "[python]": {
    "editor.defaultFormatter": "charliermarsh.ruff"
  }
}
```

#### PyCharm

1. Open project folder
2. Configure interpreter: `./venv/bin/python`
3. Enable Django/FastAPI support
4. Configure Run Configuration for `uvicorn`

### Generate Secret Keys

```bash
# Generate secure keys
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Or use openssl
openssl rand -base64 32
```

### Database Tools

**pgAdmin (Docker):**

```bash
docker compose --profile tools up -d pgadmin
# Access: http://localhost:5050
```

**CLI Access:**

```bash
# Direct access
psql postgresql://fastvue:fastvue123@localhost:5432/fastvue

# Via Docker
docker compose exec db psql -U fastvue -d fastvue
```

### Redis Tools

**Redis Commander (Docker):**

```bash
docker compose --profile tools up -d redis-commander
# Access: http://localhost:8081
```

**CLI Access:**

```bash
# Direct access
redis-cli

# Via Docker
docker compose exec redis redis-cli
```

## Troubleshooting

### Common Issues

#### 1. Python Version Mismatch

```bash
# Check Python version
python --version

# Use pyenv for version management
pyenv install 3.11.7
pyenv local 3.11.7
```

#### 2. Database Connection Failed

```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Check connection string
psql $DATABASE_URL

# Check Docker containers
docker compose ps
```

#### 3. Redis Connection Failed

```bash
# Check Redis is running
redis-cli ping

# Check Docker Redis
docker compose exec redis redis-cli ping
```

#### 4. Migration Errors

```bash
# Check current state
alembic current

# Show history
alembic history

# Reset if needed (WARNING: destroys data)
alembic downgrade base
alembic upgrade head
```

#### 5. Port Already in Use

```bash
# Find process using port 8000
lsof -i :8000

# Kill process
kill -9 <PID>

# Or use different port
uvicorn main:app --port 8001
```

#### 6. Virtual Environment Issues

```bash
# Recreate venv
rm -rf venv
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Getting Help

1. Check logs: `uvicorn` terminal output
2. Enable debug: `DEBUG=true` in `.env`
3. API docs: http://localhost:8000/docs
4. GitHub Issues: [Report bugs](https://github.com/your-org/fastvue/issues)

## Next Steps

1. Read [Development Guide](DEVELOPMENT.md)
2. Understand [Architecture](ARCHITECTURE.md)
3. Setup [OAuth providers](../README.md#oauth-setup)
4. Configure [production deployment](DEPLOYMENT.md)
