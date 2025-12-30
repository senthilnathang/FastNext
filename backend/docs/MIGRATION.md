# Database Migration Guide

Guide for managing database migrations with Alembic in FastVue.

## Overview

FastVue uses **Alembic** for database migrations. Alembic tracks schema changes and applies them incrementally.

## Basic Commands

```bash
# Show current migration version
alembic current

# Show migration history
alembic history

# Upgrade to latest
alembic upgrade head

# Upgrade by one version
alembic upgrade +1

# Downgrade by one version
alembic downgrade -1

# Downgrade to specific version
alembic downgrade abc123

# Downgrade to base (empty database)
alembic downgrade base
```

## Creating Migrations

### Auto-Generate from Models

```bash
# Generate migration from model changes
alembic revision --autogenerate -m "add_products_table"

# Review the generated file in alembic/versions/
```

### Manual Migration

```bash
# Create empty migration
alembic revision -m "custom_data_migration"
```

## Migration File Structure

```python
# alembic/versions/xxxx_add_products_table.py
"""add products table

Revision ID: abc123def456
Revises: 789xyz
Create Date: 2024-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'abc123def456'
down_revision = '789xyz'
branch_labels = None
depends_on = None

def upgrade():
    """Apply migration."""
    op.create_table(
        'products',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('sku', sa.String(50), nullable=False),
        sa.Column('price', sa.Numeric(10, 2), nullable=False),
        sa.Column('company_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime()),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('sku'),
    )
    op.create_index('ix_products_sku', 'products', ['sku'])

def downgrade():
    """Revert migration."""
    op.drop_index('ix_products_sku')
    op.drop_table('products')
```

## Common Migration Operations

### Add Column

```python
def upgrade():
    op.add_column('users', sa.Column('phone', sa.String(20), nullable=True))

def downgrade():
    op.drop_column('users', 'phone')
```

### Remove Column

```python
def upgrade():
    op.drop_column('users', 'legacy_field')

def downgrade():
    op.add_column('users', sa.Column('legacy_field', sa.String(100)))
```

### Rename Column

```python
def upgrade():
    op.alter_column('users', 'name', new_column_name='full_name')

def downgrade():
    op.alter_column('users', 'full_name', new_column_name='name')
```

### Add Index

```python
def upgrade():
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

def downgrade():
    op.drop_index('ix_users_email')
```

### Add Foreign Key

```python
def upgrade():
    op.add_column('orders', sa.Column('user_id', sa.Integer()))
    op.create_foreign_key(
        'fk_orders_user_id',
        'orders', 'users',
        ['user_id'], ['id']
    )

def downgrade():
    op.drop_constraint('fk_orders_user_id', 'orders')
    op.drop_column('orders', 'user_id')
```

### Create Table with Relationships

```python
def upgrade():
    op.create_table(
        'order_items',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('order_id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False, default=1),
        sa.Column('price', sa.Numeric(10, 2), nullable=False),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_id'], ['products.id']),
    )

def downgrade():
    op.drop_table('order_items')
```

## Data Migrations

### Migrate Data During Schema Change

```python
from sqlalchemy.sql import table, column
from sqlalchemy import String, Integer

def upgrade():
    # Add new column
    op.add_column('users', sa.Column('status', sa.String(20), default='active'))

    # Migrate data
    users = table('users', column('id', Integer), column('status', String))
    op.execute(users.update().values(status='active'))

    # Make column non-nullable
    op.alter_column('users', 'status', nullable=False)

def downgrade():
    op.drop_column('users', 'status')
```

### Bulk Data Update

```python
def upgrade():
    # Using raw SQL for performance
    op.execute("""
        UPDATE users
        SET email = LOWER(email)
        WHERE email != LOWER(email)
    """)

def downgrade():
    pass  # Cannot revert case change
```

## Best Practices

### 1. Always Review Auto-Generated Migrations

```bash
# Generate
alembic revision --autogenerate -m "changes"

# Review the file carefully before applying!
cat alembic/versions/xxx_changes.py

# Then apply
alembic upgrade head
```

### 2. Test Migrations

```bash
# Apply migration
alembic upgrade head

# Verify by downgrading and upgrading again
alembic downgrade -1
alembic upgrade head
```

### 3. Keep Migrations Small

Create separate migrations for:
- Schema changes
- Data migrations
- Index additions

### 4. Handle Nullable Carefully

```python
# BAD: May fail if existing data
op.add_column('users', sa.Column('required_field', sa.String(), nullable=False))

# GOOD: Add nullable, migrate, then make required
def upgrade():
    op.add_column('users', sa.Column('required_field', sa.String(), nullable=True))
    op.execute("UPDATE users SET required_field = 'default_value'")
    op.alter_column('users', 'required_field', nullable=False)
```

### 5. Use Batch Operations for SQLite (if needed)

```python
# For SQLite compatibility
with op.batch_alter_table('users') as batch_op:
    batch_op.add_column(sa.Column('new_field', sa.String()))
    batch_op.drop_column('old_field')
```

## Production Migrations

### Pre-Deployment Steps

1. **Backup database**
   ```bash
   pg_dump -U fastvue fastvue > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Test migration on staging**
   ```bash
   alembic upgrade head
   ```

3. **Check for breaking changes**
   - Column removals
   - Type changes
   - Constraint additions

### Deployment

```bash
# Apply migrations
docker compose exec backend alembic upgrade head

# Verify
docker compose exec backend alembic current
```

### Rollback Plan

```bash
# If issues occur, rollback
docker compose exec backend alembic downgrade -1

# Restore from backup if needed
psql -U fastvue fastvue < backup_20240101.sql
```

## Troubleshooting

### Common Issues

#### 1. "Target database is not up to date"

```bash
# Check current state
alembic current

# Stamp current state if needed
alembic stamp head
```

#### 2. "Can't locate revision"

```bash
# List all revisions
alembic history --verbose

# Check for missing files in alembic/versions/
```

#### 3. Migration Conflicts

```bash
# When two developers create migrations from same base
# Merge migrations
alembic merge heads -m "merge branches"
```

#### 4. Failed Migration Cleanup

```bash
# If migration partially applied:
# 1. Check what was applied
alembic current

# 2. Manually fix database state

# 3. Stamp to correct version
alembic stamp <revision_id>
```

### Reset Database (Development Only)

```bash
# WARNING: Destroys all data!
alembic downgrade base
alembic upgrade head
```

## Environment-Specific Migrations

### Using Alembic Branches

```python
# alembic/env.py
def run_migrations_online():
    # Different behavior for different environments
    if os.getenv('ENVIRONMENT') == 'production':
        # Production: stricter settings
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )
    else:
        # Development: more permissive
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/migrate.yml
name: Database Migration

on:
  push:
    branches: [main]
    paths:
      - 'backend/alembic/**'

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run migrations
        run: |
          docker compose exec backend alembic upgrade head
```

### Migration Verification Script

```bash
#!/bin/bash
# scripts/verify_migration.sh

echo "Checking migration status..."
CURRENT=$(alembic current 2>&1)
HEAD=$(alembic heads 2>&1)

if [[ "$CURRENT" != *"$HEAD"* ]]; then
    echo "Migration needed!"
    exit 1
else
    echo "Database is up to date"
    exit 0
fi
```
