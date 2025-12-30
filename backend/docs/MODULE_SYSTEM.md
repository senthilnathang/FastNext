# FastVue Module System Documentation

## Overview

The FastVue module system provides a modular addon/plugin architecture inspired by Odoo and Django. It allows dynamic loading of FastAPI + Vue.js modules with dependency management, model inheritance, and router overrides.

## Table of Contents

1. [Module Structure](#module-structure)
2. [Manifest Format](#manifest-format)
3. [Creating a Module](#creating-a-module)
4. [Module APIs](#module-apis)
5. [Schema Management](#schema-management)
6. [CLI Commands](#cli-commands)
7. [Security Features](#security-features)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

## Module Structure

Each module follows a standard directory structure:

```
modules/
└── my_module/
    ├── __init__.py              # Python package init
    ├── __manifest__.py          # Module metadata (required)
    ├── models/                  # SQLAlchemy models
    │   ├── __init__.py
    │   └── my_model.py
    ├── schemas/                 # Pydantic schemas
    │   ├── __init__.py
    │   └── my_schema.py
    ├── api/                     # FastAPI routers
    │   ├── __init__.py
    │   └── routes.py
    ├── services/                # Business logic
    │   ├── __init__.py
    │   └── my_service.py
    ├── data/                    # Initial/seed data (JSON)
    └── static/                  # Frontend assets
        └── src/
            ├── routes/          # Vue router config
            ├── views/           # Vue views/pages
            ├── components/      # Vue components
            └── stores/          # Pinia stores
```

### Required Files

- `__init__.py` - Makes the module a Python package
- `__manifest__.py` - Module metadata and configuration

## Manifest Format

The `__manifest__.py` file defines all module metadata:

```python
{
    # Basic Info (required)
    "name": "My Module",           # Human-readable name
    "version": "1.0.0",            # Semantic version

    # Optional metadata
    "summary": "Short description",
    "description": "Long description with markdown",
    "author": "Your Name",
    "website": "https://example.com",
    "license": "MIT",
    "category": "Sales",           # For grouping

    # Module type
    "application": True,           # True = full app, False = technical
    "installable": True,
    "auto_install": False,         # Auto-install when deps met

    # Dependencies
    "depends": ["base"],           # Required modules
    "external_dependencies": {
        "python": ["pandas"],      # pip packages
        "bin": ["wkhtmltopdf"],    # System binaries
    },

    # Backend components
    "models": ["models"],          # Model packages
    "api": ["api.routes"],         # Router modules
    "services": ["services"],      # Service modules
    "data": ["data/init.json"],    # Data files

    # Frontend assets
    "assets": {
        "routes": "static/src/routes/index.ts",
        "stores": ["static/src/stores/*.ts"],
        "views": ["static/src/views/**/*.vue"],
    },

    # Menu items
    "menus": [
        {
            "name": "My Menu",
            "path": "/my-module",
            "icon": "mdi:home",
            "sequence": 10,
        }
    ],

    # Lifecycle hooks
    "pre_init_hook": "hooks.pre_init",
    "post_init_hook": "hooks.post_init",
    "uninstall_hook": "hooks.uninstall",
}
```

## Creating a Module

### Step 1: Create Directory Structure

```bash
mkdir -p modules/my_module/{models,api,services,schemas,data}
```

### Step 2: Create __init__.py

```python
"""My Module."""

from . import models
from . import api
from . import services

__all__ = ["models", "api", "services"]
```

### Step 3: Create __manifest__.py

```python
{
    "name": "My Module",
    "version": "1.0.0",
    "summary": "My custom module",
    "depends": ["base"],
    "models": ["models"],
    "api": ["api.routes"],
}
```

### Step 4: Create Models

```python
# models/my_model.py
from sqlalchemy import Column, Integer, String, ForeignKey, Table
from sqlalchemy.orm import relationship
from app.db.base import Base

class MyModel(Base):
    __tablename__ = "my_models"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
```

### Step 4b: Create Association Tables (Many-to-Many)

For many-to-many relationships, define association tables using SQLAlchemy's `Table`:

```python
# models/tag.py
from sqlalchemy import Column, Integer, ForeignKey, Table
from app.db.base import Base

# Association table for many-to-many relationship
model_tag_association = Table(
    "my_module_model_tag",  # Use module prefix
    Base.metadata,
    Column("model_id", Integer, ForeignKey("my_models.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("my_module_tags.id", ondelete="CASCADE"), primary_key=True),
)

class Tag(Base):
    __tablename__ = "my_module_tags"

    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False)
```

Then use the association table in your model's relationship:

```python
# models/my_model.py
from .tag import model_tag_association

class MyModel(Base):
    # ... columns ...

    tags = relationship(
        "Tag",
        secondary=model_tag_association,
        backref="models"
    )
```

**Important**: Export association tables in your `models/__init__.py`:

```python
# models/__init__.py
from .my_model import MyModel
from .tag import Tag, model_tag_association

__all__ = ["MyModel", "Tag", "model_tag_association"]
```

Association tables are automatically created during module installation alongside model tables.

### Step 5: Create API Routes

```python
# api/routes.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db

router = APIRouter(prefix="/my-items", tags=["My Items"])

@router.get("/")
def list_items(db: Session = Depends(get_db)):
    return {"items": []}
```

### Step 6: Install the Module

Via API:
```bash
curl -X POST http://localhost:8000/api/v1/modules/install/my_module \
  -H "Authorization: Bearer $TOKEN"
```

Or via the UI: Navigate to Settings > Modules and click Install.

## Module APIs

### List Modules

```
GET /api/v1/modules/
```

Query parameters:
- `installed_only`: Only show installed modules
- `category`: Filter by category
- `application_only`: Only show application modules

### Get Module Details

```
GET /api/v1/modules/{name}
```

### Install Module

```
POST /api/v1/modules/install/{name}
```

Requires superuser authentication.

### Uninstall Module

```
POST /api/v1/modules/uninstall/{name}
```

Requires superuser authentication. Cannot uninstall:
- The `base` module
- Modules that other installed modules depend on

Options:
- `drop_tables`: If true, drops database tables created by the module
- `cascade`: If true, also drops dependent tables
- `backup`: If true (default), creates JSON backup before dropping

### Upload Module (ZIP)

```
POST /api/v1/modules/upload
```

Upload a ZIP file containing a module. The ZIP must:
- Contain exactly one top-level directory (module name)
- Include `__init__.py` and `__manifest__.py`
- Be under 50MB

## Schema Management

The module system includes automatic database schema management. When modules are installed, upgraded, or uninstalled, the system automatically handles table creation, schema changes, and cleanup.

For full documentation, see [Schema Management](SCHEMA_MANAGEMENT.md).

### Key Features

- **Automatic Table Creation**: Tables are created automatically during module installation
- **Association Tables**: Many-to-many relationship tables (SQLAlchemy `Table` objects) are automatically detected and created
- **Schema Upgrades**: Column additions, type changes, and index updates during upgrades
- **Safe Uninstallation**: Optional table dropping with backup support
- **Migration Tracking**: Full history in `module_migrations` table
- **Rollback Support**: Revert schema changes when needed
- **Pre-Installation Validation**: Checks for conflicts before installation
- **FK-Ordered Table Drops**: Tables are dropped in correct dependency order during uninstall

### Pre-Installation Validation

Before installing a module, the system validates:

1. **Frontend Assets**: Routes, stores, components, and views exist
2. **Schema Compatibility**: No table name conflicts with existing tables
3. **Route Conflicts**: API paths don't conflict with existing routes
4. **Dependencies**: All required modules are available

```bash
# Validate a module before installation
curl -X POST http://localhost:8000/api/v1/modules/validate/my_module \
  -H "Authorization: Bearer $TOKEN"
```

Response:
```json
{
  "valid": true,
  "errors": [],
  "warnings": [
    {
      "category": "frontend",
      "severity": "warning",
      "message": "Routes file not found: static/src/routes/index.ts"
    }
  ]
}
```

### Uninstallation Process

When uninstalling a module:

1. **Dependency Check**: Ensures no installed modules depend on it
2. **Data Backup**: Creates JSON backup of all table data (optional)
3. **FK-Ordered Drop**: Tables are dropped in topological order based on FK dependencies
4. **Migration Cleanup**: Removes migration history for the module
5. **Frontend Cleanup**: Removes Vue.js assets including:
   - Module views directory (`views/{module}/`)
   - Module components (`components/{module}/`)
   - Module stores (`stores/{module}/`)
   - Module API files (`api/{module}/`)
   - **Router route file** (`router/routes/modules/{module}.ts`)
6. **Registry Update**: Removes module from the runtime registry

### Schema API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/modules/schema/{name}/status` | GET | Get pending schema changes |
| `/modules/schema/{name}/sync` | POST | Apply schema changes |
| `/modules/schema/{name}/migrations` | GET | View migration history |
| `/modules/schema/{name}/rollback` | POST | Rollback a migration |
| `/modules/schema/{name}/backup` | POST | Backup module data |

### Example: Adding a Column

1. Add the column to your model:

```python
class Product(Base):
    __tablename__ = "demo_products"
    # ... existing columns ...
    new_field = Column(String(100), nullable=True)  # New
```

2. Check pending changes:

```bash
python manage.py module check-schema demo
```

3. Apply changes:

```bash
python manage.py module sync-schema demo --apply
```

## CLI Commands

The module system includes CLI commands via `manage.py`:

### List Modules

```bash
# List all modules
python manage.py module list

# List only installed modules
python manage.py module list --installed

# List only application modules
python manage.py module list --apps
```

### Install Module

```bash
python manage.py module install my_module
```

This will:
1. Check and install dependencies
2. Create database tables for models
3. Create association tables (many-to-many relationships)
4. Load initial data files
5. Register API routes

### Upgrade Module

```bash
python manage.py module upgrade my_module
```

This will:
1. Reload module from disk
2. Detect schema changes
3. Apply database migrations
4. Update version tracking

### Uninstall Module

```bash
# Soft uninstall (keep data)
python manage.py module uninstall my_module

# Hard uninstall (drop tables)
python manage.py module uninstall my_module --drop-tables

# Force uninstall with dependents
python manage.py module uninstall my_module --drop-tables --cascade

# Skip backup
python manage.py module uninstall my_module --drop-tables --no-backup --force
```

### Schema Operations

```bash
# Check for pending schema changes
python manage.py module check-schema [module_name]

# Sync schema (dry run)
python manage.py module sync-schema my_module

# Apply schema changes
python manage.py module sync-schema my_module --apply

# View migration history
python manage.py module show-migrations [module_name]

# Backup module data
python manage.py module backup my_module
```

## Security Features

The module system includes several security measures:

### 1. Module Name Validation

Module names must:
- Start with a letter
- Contain only letters, numbers, and underscores
- Not be reserved names (`__pycache__`, `site-packages`, etc.)

### 2. ZIP Upload Protection

- **Path traversal prevention**: Files with `..` or absolute paths are rejected
- **ZIP bomb protection**: Maximum 100MB uncompressed, 1000 files
- **File size limits**: 50MB maximum upload size
- **Content-type validation**: Must be a valid ZIP file

### 3. Manifest Security

- Parsed using `ast.literal_eval` (no code execution)
- Maximum 100KB manifest size
- Input validation and sanitization

### 4. Thread Safety

- Singleton registry uses double-checked locking
- Manifest caching is thread-safe with RLock

## Best Practices

### 1. Dependencies

- Always specify dependencies in `depends`
- Use `external_dependencies` for pip packages
- Keep dependency chains shallow

### 2. Models

- Use `__table_args__ = {"extend_existing": True}` for models
- Follow naming conventions: `module_name_model_name` for tables
- Add proper indexes for common query patterns

### 3. API Routes

- Use a router with a unique prefix
- Include proper authentication dependencies
- Return structured response models

### 4. Data Loading

- Use JSON files in the `data/` directory
- Include sample data for testing
- Document data file format

### 5. Testing

- Create tests in `tests/unit/modules/`
- Test module discovery, loading, and APIs
- Include security tests for custom functionality

## Troubleshooting

### Module Not Discovered

1. Check the module is in an addon path (`settings.all_addon_paths`)
2. Verify `__init__.py` and `__manifest__.py` exist
3. Check module name is valid (letters, numbers, underscores only)
4. Check manifest syntax with `python -c "import ast; ast.literal_eval(open('__manifest__.py').read())"`

### Module Won't Install

1. Check all dependencies are installed first
2. Verify external dependencies are available
3. Check database migrations are applied
4. Look for errors in the logs

### API Routes Not Loading

1. Verify `api` key in manifest includes the router module
2. Check the router variable is named `router`
3. Ensure the router module has no import errors

### Common Errors

**"Module '{name}' not found"**
- Module directory doesn't exist or is not in addon paths

**"Missing dependencies: ..."**
- Install required modules first

**"Invalid module ZIP structure"**
- ZIP must contain __init__.py and __manifest__.py
- Check for path traversal attempts

**"Cannot uninstall the base module"**
- The base module is required and cannot be uninstalled

**Uninstall hangs or fails with timeout**
- Check for blocking database transactions
- Use CASCADE to force drop dependent objects:
  ```bash
  python manage.py module uninstall my_module --drop-tables --cascade
  ```
- Check PostgreSQL for idle transactions:
  ```sql
  SELECT pid, state, query FROM pg_stat_activity WHERE state = 'idle in transaction';
  ```

## Configuration

### Settings

Add to your `.env` or configuration:

```env
# Module directories (comma-separated)
ADDONS_PATHS=/opt/custom_modules,/opt/third_party

# Enable module system
MODULES_ENABLED=true

# Auto-discover and load modules on startup
AUTO_DISCOVER_MODULES=true
```

### Addon Paths

Modules are searched in this order:
1. Built-in `modules/` directory
2. Paths in `ADDONS_PATHS` setting

First found wins if duplicates exist.
