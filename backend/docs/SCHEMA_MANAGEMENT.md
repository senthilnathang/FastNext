# Schema Management (Core ORM)

## Overview

FastVue includes a comprehensive schema lifecycle management system inspired by Odoo ORM and Django migrations. This system automatically handles database schema operations during module installation, upgrade, and uninstallation.

## Key Features

- **Automatic Table Creation**: Tables are created automatically when modules are installed
- **Association Table Support**: Many-to-many relationship tables (SQLAlchemy `Table` objects) are automatically detected and created
- **Schema Upgrades**: Detect and apply schema changes during module upgrades
- **Safe Uninstallation**: Optional table dropping with backup support
- **Migration Tracking**: Full history of schema changes per module
- **Schema Validation**: Verify database matches model definitions
- **Rollback Support**: Revert migrations when needed

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ ModuleService   │────▶│ SchemaManager    │────▶│ MigrationEngine │
│ (orchestration) │     │ (DDL generation) │     │ (execution)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                       │                        │
         ▼                       ▼                        ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ ModuleLoader    │     │ SchemaInspector  │     │ ModuleMigration │
│ (model discovery│     │ (DB introspection│     │ (tracking table)│
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## Components

### 1. SchemaInspector

Compares SQLAlchemy model definitions with actual database schema.

```python
from modules.base.services import SchemaInspector
from app.db.base import engine

inspector = SchemaInspector(engine)

# Check if table exists
exists = inspector.table_exists("my_table")

# Get table schema from database
schema = inspector.get_table_schema("my_table")

# Get schema from model definition
model_schema = inspector.get_model_schema(MyModel)

# Compare and get differences
diff = inspector.compare_schemas(MyModel)
if diff.has_changes():
    print(f"Columns to add: {diff.columns_to_add}")
    print(f"Columns to drop: {diff.columns_to_drop}")
```

### 2. SchemaManager

Manages DDL operations for module tables.

```python
from modules.base.services import SchemaManager

manager = SchemaManager(engine)

# Create tables for module (including association tables)
operations = manager.create_tables_for_module(
    "my_module",
    [Model1, Model2],
    association_tables=[assoc_table1, assoc_table2]  # Optional Table objects
)

# Upgrade schema (detect and apply changes)
operations = manager.upgrade_module_schema("my_module", [Model1, Model2])

# Drop tables (with dependency ordering)
operations = manager.drop_tables_for_module("my_module", ["table1", "table2"], cascade=True)
```

### 3. MigrationEngine

Executes migrations with transaction support and tracking.

```python
from modules.base.services import MigrationEngine

engine = MigrationEngine(db, sql_engine)

# Install module schema (with optional association tables)
result = engine.install_module_schema(
    "my_module", "1.0.0", models,
    association_tables=[assoc_table1, assoc_table2]  # Optional
)

# Upgrade module schema
result = engine.upgrade_module_schema("my_module", "1.1.0", models)

# Uninstall module schema
result = engine.uninstall_module_schema("my_module", table_names, cascade=True)

# Rollback a migration
result = engine.rollback_migration("my_module", "20241226123456_schema")
```

## Migration Tracking

Migrations are tracked in two database tables:

### module_migrations

Stores the history of all schema migrations:

| Column | Type | Description |
|--------|------|-------------|
| id | Integer | Primary key |
| module_name | String | Module technical name |
| version | String | Module version |
| migration_name | String | Unique migration identifier |
| migration_type | String | schema, data, rollback, initial |
| operations | JSONB | List of DDL operations |
| rollback_sql | Text | SQL to revert this migration |
| status | String | pending, applied, failed, rolled_back |
| is_applied | Boolean | Whether currently applied |
| applied_at | DateTime | When applied |
| checksum | String | SHA-256 of operations |

### module_model_states

Stores schema snapshots for change detection:

| Column | Type | Description |
|--------|------|-------------|
| id | Integer | Primary key |
| module_name | String | Module technical name |
| model_name | String | Python model class name |
| table_name | String | Database table name |
| schema_snapshot | JSONB | Complete schema definition |
| columns | JSONB | Column definitions |
| indexes | JSONB | Index definitions |
| foreign_keys | JSONB | FK definitions |
| checksum | String | SHA-256 of schema |
| version | String | Module version |

## CLI Commands

### List Modules

```bash
python manage.py module list
python manage.py module list --installed
python manage.py module list --apps
```

### Install Module

```bash
python manage.py module install my_module
```

This will:
1. Load module manifest
2. Install dependencies first
3. Create database record
4. Create database tables for models
5. Load initial data

### Upgrade Module

```bash
python manage.py module upgrade my_module
```

This will:
1. Reload module from disk
2. Detect schema changes
3. Apply schema migrations (add columns, alter types, etc.)
4. Update database record

### Uninstall Module

```bash
# Soft uninstall (keep tables)
python manage.py module uninstall my_module

# Hard uninstall (drop tables)
python manage.py module uninstall my_module --drop-tables

# Force uninstall with dependents
python manage.py module uninstall my_module --drop-tables --cascade

# Skip backup before dropping
python manage.py module uninstall my_module --drop-tables --no-backup --force
```

### Check Schema Status

```bash
# Check all modules
python manage.py module check-schema

# Check specific module
python manage.py module check-schema my_module
```

### Sync Schema

```bash
# Preview changes (dry run)
python manage.py module sync-schema my_module

# Apply changes
python manage.py module sync-schema my_module --apply
```

### View Migration History

```bash
# All migrations
python manage.py module show-migrations

# Specific module
python manage.py module show-migrations my_module --limit 50
```

### Backup Module Data

```bash
python manage.py module backup my_module
```

Creates a JSON backup in `backups/modules/my_module_TIMESTAMP.json`.

## REST API Endpoints

All endpoints are under `/api/v1/base/modules/schema/`.

### Get Schema Status

```http
GET /api/v1/base/modules/schema/{module_name}/status
```

Response:
```json
{
  "module_name": "demo",
  "has_models": true,
  "models": ["Product", "Category"],
  "validation": {
    "valid": true,
    "models": [...],
    "issues": []
  },
  "pending_changes": false,
  "pending_operations": []
}
```

### Sync Module Schema

```http
POST /api/v1/base/modules/schema/{module_name}/sync
Content-Type: application/json

{
  "dry_run": true
}
```

### Get Migration History

```http
GET /api/v1/base/modules/schema/{module_name}/migrations?limit=20
```

### Rollback Migration

```http
POST /api/v1/base/modules/schema/{module_name}/rollback
Content-Type: application/json

{
  "migration_name": "20241226123456_schema"
}
```

### Get Module Tables

```http
GET /api/v1/base/modules/schema/{module_name}/tables
```

### Compare Schema

```http
GET /api/v1/base/modules/schema/{module_name}/compare
```

### Backup Module Data

```http
POST /api/v1/base/modules/schema/{module_name}/backup
```

### Check All Schemas

```http
GET /api/v1/base/modules/schema/check-all
```

### Sync All Schemas

```http
POST /api/v1/base/modules/schema/sync-all?dry_run=true
```

## Module Integration

When you create a module with models, the schema management is automatic:

### 1. Define Models

```python
# modules/my_module/models/product.py
from sqlalchemy import Column, Integer, String, Float
from app.db.base import Base

class Product(Base):
    __tablename__ = "my_module_products"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    price = Column(Float, default=0.0)
```

### 2. Register in Manifest

```python
# modules/my_module/__manifest__.py
{
    "name": "My Module",
    "version": "1.0.0",
    "depends": ["base"],
    "models": ["models"],  # This enables schema management
}
```

### 3. Install Module

```bash
python manage.py module install my_module
```

The table `my_module_products` is created automatically.

### Association Tables (Many-to-Many Relationships)

Association tables for many-to-many relationships are also automatically created during module installation. These are defined using SQLAlchemy's `Table` construct rather than as model classes:

```python
# models/tag.py
from sqlalchemy import Column, Integer, ForeignKey, Table, String
from app.db.base import Base

# Association table - will be created automatically
product_tag_association = Table(
    "my_module_product_tag",
    Base.metadata,
    Column("product_id", Integer, ForeignKey("my_module_products.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("my_module_tags.id", ondelete="CASCADE"), primary_key=True),
)

class Tag(Base):
    __tablename__ = "my_module_tags"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False)
```

**Important**: Export association tables in your `models/__init__.py`:

```python
from .product import Product
from .tag import Tag, product_tag_association

__all__ = ["Product", "Tag", "product_tag_association"]
```

The module loader automatically detects:
1. **Model classes**: Classes with `__tablename__` attribute (inherit from `Base`)
2. **Association tables**: SQLAlchemy `Table` objects registered with `Base.metadata`

Both types are passed to the schema manager for creation during installation.

### 4. Add New Column

```python
# Add to model
class Product(Base):
    # ... existing columns ...
    description = Column(Text, nullable=True)  # New column
```

### 5. Upgrade Module

```bash
# Check what will change
python manage.py module sync-schema my_module

# Apply changes
python manage.py module sync-schema my_module --apply
```

## Exception Handling

The schema system provides specific exceptions:

```python
from app.core.modules import (
    SchemaError,          # Base schema exception
    TableExistsError,     # Table already exists
    TableNotFoundError,   # Table doesn't exist
    ColumnExistsError,    # Column already exists
    ColumnNotFoundError,  # Column doesn't exist
    DependencyBlockError, # FK blocks operation
    MigrationError,       # Migration failed
    MigrationNotFoundError,
    RollbackError,        # Rollback failed
    SchemaValidationError,
)

try:
    service.install_module("my_module")
except MigrationError as e:
    print(f"Migration {e.migration_name} failed: {e.reason}")
except DependencyBlockError as e:
    print(f"Blocked by: {e.blocking_tables}")
```

## Best Practices

### 1. Table Naming

Use module prefix for all tables:
```python
__tablename__ = "my_module_products"  # Good
__tablename__ = "products"            # Bad - may conflict
```

### 2. Extend Existing

Always use `extend_existing` for module models:
```python
__table_args__ = {"extend_existing": True}
```

### 3. Nullable New Columns

When adding columns to existing tables, make them nullable or provide defaults:
```python
# Good - won't fail on existing data
new_column = Column(String(100), nullable=True)
new_column = Column(Integer, default=0)

# Bad - will fail if table has data
new_column = Column(String(100), nullable=False)  # No default!
```

### 4. Test Schema Changes

Always use dry run first:
```bash
python manage.py module sync-schema my_module  # Preview
python manage.py module sync-schema my_module --apply  # Execute
```

### 5. Backup Before Destructive Operations

```bash
# Backup before uninstall
python manage.py module backup my_module
python manage.py module uninstall my_module --drop-tables
```

## Comparison with Other Frameworks

| Feature | FastVue | Odoo | Django |
|---------|---------|------|--------|
| Auto table creation | Yes | Yes | Requires migrate |
| Auto column detection | Yes | Yes | Requires makemigrations |
| Migration files | DB-stored | DB-stored | File-based |
| Rollback support | Yes | Limited | Yes |
| Per-module tracking | Yes | Yes | Per-app |
| CLI commands | Yes | Yes | Yes |
| API endpoints | Yes | No | No |
| Data backup | Yes | Yes | Requires dumpdata |

## Table Drop Ordering

When uninstalling modules, tables must be dropped in the correct order to avoid foreign key constraint violations. The system uses topological sorting based on FK dependencies:

### How It Works

1. **FK Dependency Analysis**: Before dropping, the system inspects all foreign key relationships
2. **Topological Sort**: Tables are sorted so that dependent tables (those with FKs to other tables) are dropped first
3. **Cascade Option**: When enabled, PostgreSQL's CASCADE automatically drops dependent objects

### Example Drop Order

For a CRM module with these FK relationships:
```
crm_leads → crm_accounts (FK: account_id)
crm_leads → crm_contacts (FK: contact_id)
crm_opportunities → crm_leads (FK: lead_id)
crm_activities → crm_leads, crm_contacts, crm_accounts
crm_lead_tag → crm_leads, crm_tags (association table)
crm_opportunity_tag → crm_opportunities, crm_tags (association table)
```

The drop order would be:
1. `crm_lead_tag` (association table - depends on crm_leads, crm_tags)
2. `crm_opportunity_tag` (association table - depends on crm_opportunities, crm_tags)
3. `crm_opportunities` (depends on crm_leads)
4. `crm_activities` (depends on multiple tables)
5. `crm_leads` (depends on crm_accounts, crm_contacts)
6. `crm_contacts`
7. `crm_accounts`
8. `crm_tags`
9. Other tables with no FK dependencies

**Note**: Association tables are included in the drop order and handled the same as model tables.

### Transaction Management

The uninstall process uses separate database connections for:
- Module metadata queries (via ORM session)
- Schema DDL operations (via raw engine connection)

To prevent deadlocks, the ORM session is committed before schema operations to release any read locks:

```python
# In ModuleService.uninstall_module():
self.db.commit()  # Release locks before DROP TABLE
schema_result = self._drop_module_schema(name, cascade=cascade)
```

## Troubleshooting

### Table Already Exists

```
TableExistsError: Table 'my_table' already exists
```

The table exists in database but model wasn't tracked. Options:
1. Drop the table manually and reinstall
2. Import existing table into module state

### Foreign Key Blocks Drop

```
DependencyBlockError: Cannot drop table 'products': blocked by ['order_items']
```

Use cascade option:
```bash
python manage.py module uninstall my_module --drop-tables --cascade
```

### Migration Failed

Check the error in `module_migrations` table:
```sql
SELECT migration_name, error_message FROM module_migrations
WHERE module_name = 'my_module' AND status = 'failed';
```

### Schema Out of Sync

```bash
# Check what's different
python manage.py module check-schema my_module

# Sync changes
python manage.py module sync-schema my_module --apply
```

### Drop Table Hangs/Deadlock

If DROP TABLE operations hang, it may be due to:
1. **Open transactions**: Another connection has an open transaction on the table
2. **Lock contention**: Multiple processes trying to modify the same table

Solutions:
```sql
-- Check for blocking queries
SELECT pid, state, query FROM pg_stat_activity
WHERE state = 'idle in transaction';

-- Terminate blocking connections (use with caution)
SELECT pg_terminate_backend(pid) FROM pg_stat_activity
WHERE state = 'idle in transaction' AND pid != pg_backend_pid();
```
