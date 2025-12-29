# FastVue Backend

FastAPI-based backend for the FastVue framework with PostgreSQL and Redis.

## Overview

The backend provides a RESTful API with comprehensive authentication, authorization, and data management capabilities.

## Features

- **Authentication**
  - JWT with access/refresh tokens
  - Two-Factor Authentication (TOTP)
  - OAuth social login (Google, GitHub, Microsoft)
  - Password reset flow

- **Authorization**
  - Role-Based Access Control (RBAC)
  - Permission-based access with optimized queries (no N+1)
  - Database-backed menu permissions and access rules
  - Multi-company support
  - Per-company user roles
  - Redis-cached permissions (1-hour TTL)
  - Row Level Security (RLS) policies with audit logging
  - Access Control Lists (ACL) for per-record permissions
  - Dynamic condition-based access control

- **Data Management**
  - SQLAlchemy 2.x ORM
  - Alembic migrations
  - Soft delete support
  - Audit logging
  - Demo data management (JSON import/export)

- **Enterprise Features**
  - Activity logging with risk scoring and threat detection
  - Message threading (Odoo-like mail.thread functionality)
  - Comprehensive model mixins (Timestamp, Audit, SoftDelete, Activity, etc.)
  - Management CLI (Django-like manage.py)

- **Module System (Odoo/Django-inspired)**
  - Dynamic module loading with dependency management
  - Automatic database schema management
  - Table creation, upgrade, and drop during module lifecycle
  - Association table support (many-to-many relationships)
  - Pre-installation validation (frontend, schema, routes)
  - FK-ordered table drops during uninstallation
  - Migration tracking with rollback support
  - JSON data backup before destructive operations
  - REST API for module management
  - CLI commands for module operations

- **Enterprise Marketplace**
  - Module discovery and search with categories and tags
  - Publisher portal with verification and payout management
  - Licensing system (free, paid, subscription, trial)
  - License activation and verification per instance
  - Review and rating system with moderation
  - Download and view analytics tracking
  - Search analytics and trend analysis
  - Publisher revenue analytics dashboard

- **Unified Inbox (Huly-inspired)**
  - Unified inbox combining messages, notifications, and activities
  - Direct messaging between users
  - Sent messages tracking
  - Draft messages with auto-save
  - Emoji reactions on messages
  - @mentions with notifications
  - Star/archive/bulk actions
  - Real-time unread counts by type
  - Labels/folders for organization
  - Real-time updates via WebSocket
  - Messaging configuration (control who can message whom)

- **Notification System**
  - Multi-channel: in-app, push (VAPID), email (SMTP)
  - User-based targeting (all or specific users)
  - Notification preferences per user
  - Do Not Disturb scheduling
  - Email digest options (none, immediate, daily, weekly)
  - Push notification service worker

- **Security Middleware**
  - Content Security Policy (CSP)
  - HTTP Strict Transport Security (HSTS)
  - Rate limiting with sliding window algorithm
  - Threat detection and risk scoring
  - Request/response logging with sensitive data masking

- **Performance**
  - Redis caching with automatic invalidation
  - Optimized permission queries (JOINs, not N+1)
  - Configurable connection pooling
  - Async database operations

- **Testing**
  - Multi-layer testing (unit, integration, API, E2E)
  - pytest with async support
  - SQLite in-memory test database
  - Factory Boy for test data generation
  - httpx.AsyncClient for API testing
  - Dependency overrides for mocking
  - Coverage reporting

## Quick Start

```bash
# From project root
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or: venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Setup environment
cp .env.example .env
# Edit .env with your settings

# Run migrations
alembic upgrade head

# Start development server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Documentation

- [Installation Guide](INSTALLATION.md)
- [Development Guide](DEVELOPMENT.md)
- [Testing Guide](TESTING.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Migration Guide](MIGRATION.md)
- [Architecture](ARCHITECTURE.md)
- [Module System](MODULE_SYSTEM.md)
- [Schema Management](SCHEMA_MANAGEMENT.md)
- [Unified Inbox](INBOX.md)
- [Notification System](NOTIFICATIONS.md)
- [Enterprise Marketplace](MARKETPLACE.md)
- [Security Features](SECURITY.md)

## API Documentation

When running locally:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- OpenAPI JSON: http://localhost:8000/openapi.json

## Project Structure

```
backend/
├── app/
│   ├── api/                # API endpoints
│   │   ├── deps/           # Dependencies (auth, db, pagination)
│   │   └── v1/             # API v1 routes
│   │       ├── auth.py     # Authentication endpoints
│   │       ├── users.py    # User management
│   │       ├── companies.py # Company management
│   │       ├── roles.py    # Role management
│   │       ├── permissions.py # Permission management
│   │       ├── groups.py   # Group management
│   │       ├── activity.py # Activity logs endpoints
│   │       ├── messages.py # Message threading endpoints
│   │       ├── inbox.py    # Unified inbox endpoints
│   │       ├── security.py # Security settings & 2FA
│   │       ├── rls.py      # Row Level Security endpoints
│   │       └── acls.py     # Access Control Lists endpoints
│   ├── core/               # Core configuration
│   │   ├── config.py       # Settings with Pydantic
│   │   ├── security.py     # Auth, JWT, password hashing
│   │   └── cache.py        # Redis caching
│   ├── db/                 # Database setup
│   │   ├── base.py         # SQLAlchemy engine
│   │   ├── session.py      # Session management
│   │   └── init_db.py      # Database initialization
│   ├── middleware/         # Security middleware
│   │   ├── security.py     # CSP, HSTS, threat detection
│   │   ├── rate_limiting.py # Rate limiter
│   │   ├── request_logging.py # Request/response logging
│   │   └── error_handling.py # Error handling
│   ├── models/             # SQLAlchemy models
│   │   ├── base.py         # Model mixins (Timestamp, Audit, etc.)
│   │   ├── user.py         # User model
│   │   ├── company.py      # Company model
│   │   ├── role.py         # Role model
│   │   ├── permission.py   # Permission model
│   │   ├── group.py        # Group model
│   │   ├── rbac.py         # RBAC models (ContentType, MenuItem, AccessRule)
│   │   ├── activity_log.py # Activity logging model
│   │   ├── message.py      # Message threading model
│   │   └── inbox.py        # Unified inbox model
│   ├── schemas/            # Pydantic schemas
│   └── services/           # Business logic
│       ├── base.py         # Base CRUD service
│       ├── user.py         # User service
│       ├── permission.py   # Permission service (optimized)
│       ├── rbac.py         # RBAC services
│       └── inbox.py        # Unified inbox service
├── tests/                  # Test suite
│   ├── conftest.py         # Pytest fixtures
│   └── unit/               # Unit tests
│       └── services/       # Service tests
├── alembic/                # Database migrations
├── data/                   # Demo/seed data
│   └── demo.json           # Demo data file
├── modules/                # FastVue modules
│   ├── base/               # Core base module
│   │   ├── models/         # Module models (migrations, etc.)
│   │   ├── services/       # Schema, migration services
│   │   └── api/            # Module management APIs
│   ├── demo/               # Demo/example module
│   └── marketplace/        # Enterprise marketplace module
│       ├── models/         # Publisher, Module, License, Review, Analytics
│       ├── services/       # Business logic services
│       ├── api/            # REST API endpoints
│       └── __manifest__.py # Module manifest
├── docs/                   # Documentation
├── main.py                 # Application entry
├── manage.py               # Management CLI
└── requirements.txt        # Python dependencies
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection | Required |
| `REDIS_URL` | Redis connection | Required |
| `SECRET_KEY` | Application secret | Required (validated in production) |
| `JWT_SECRET_KEY` | JWT signing key | Required |
| `DEBUG` | Debug mode | `false` |
| `ENVIRONMENT` | Environment name | `development` |
| `DB_POOL_SIZE` | Database connection pool size | `20` |
| `DB_MAX_OVERFLOW` | Max overflow connections | `40` |
| `DB_POOL_TIMEOUT` | Pool timeout (seconds) | `30` |
| `DB_POOL_RECYCLE` | Connection recycle time (seconds) | `3600` |
| `CACHE_ENABLED` | Enable Redis caching | `true` |
| `CACHE_DEFAULT_TTL` | Default cache TTL (seconds) | `300` |

> **Security Note:** In production, `SECRET_KEY` must be set to a secure value. The application will fail to start if using the default key in production. Generate a secure key with: `python -c "import secrets; print(secrets.token_urlsafe(32))"`

## Management Commands

The backend includes a Django-like management CLI (`manage.py`):

```bash
# Activate virtual environment first
source venv/bin/activate

# Database Management
python manage.py initdb                    # Initialize database with defaults
python manage.py migrate                   # Run Alembic migrations
python manage.py makemigrations -m "desc"  # Create new migration
python manage.py showmigrations            # Show migration status
python manage.py resetdb --force           # Reset database (DESTRUCTIVE)
python manage.py createdb                  # Create database
python manage.py dropdb                    # Drop database

# Demo Data Management
python manage.py load-data                          # Load demo data (data/demo.json)
python manage.py load-data --file data/custom.json  # Load custom data file
python manage.py load-data --clear                  # Clear existing data first
python manage.py export-data --file backup.json    # Export data to JSON
python manage.py export-data --all                  # Include logs and messages

# User Management
python manage.py createsuperuser           # Create admin user (interactive)
python manage.py createsuperuser -u admin -e admin@example.com -p secret --no-input
python manage.py showusers                 # List all users
python manage.py showusers --superusers    # List only superusers
python manage.py changepassword username   # Change user password
python manage.py promoteuser username      # Promote to superuser
python manage.py demoteuser username       # Remove superuser status

# Development Tools
python manage.py runserver                 # Start development server
python manage.py runserver --port 8080     # Custom port
python manage.py shell                     # Interactive Python shell
python manage.py dbshell                   # PostgreSQL shell
python manage.py check                     # System status check

# Module Management
python manage.py module list               # List all modules
python manage.py module list --installed   # List installed modules
python manage.py module install my_module  # Install a module
python manage.py module upgrade my_module  # Upgrade a module
python manage.py module uninstall my_module               # Soft uninstall
python manage.py module uninstall my_module --drop-tables # Hard uninstall
python manage.py module check-schema       # Check all schemas
python manage.py module sync-schema my_module --apply     # Apply schema changes
python manage.py module show-migrations    # View migration history
python manage.py module backup my_module   # Backup module data
```

## Demo Data

The `data/demo.json` file contains sample data for testing and development:

- **Companies:** Default, ACME Corp, ACME-EAST, Global Tech Solutions
- **Users:** admin, johndoe, janesmith, bobwilson, alicejohnson, demo
- **Roles:** Administrator, Manager, Editor, Viewer, HR Admin, Finance Manager, Project Manager
- **Permissions:** Full CRUD for users, companies, roles, groups, permissions, system
- **Groups:** Engineering, HR, Finance, Sales, Operations, Consulting
- **Sample activity logs and messages**

### Loading Demo Data

```bash
# Load default demo data
python manage.py load-data

# Load and clear existing data first
python manage.py load-data --clear

# Load custom data file
python manage.py load-data --file data/production-seed.json
```

### Demo Credentials

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Superuser |
| demo | demo123 | Viewer |
| johndoe | password123 | Manager |

## Tech Stack

- **Framework:** FastAPI
- **ORM:** SQLAlchemy 2.x
- **Database:** PostgreSQL 15+
- **Cache:** Redis 7+
- **Auth:** PyJWT, passlib
- **Validation:** Pydantic v2
- **Server:** Uvicorn
- **CLI:** Typer with Rich
