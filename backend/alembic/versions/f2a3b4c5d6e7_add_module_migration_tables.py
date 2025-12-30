"""add_module_migration_tables

Revision ID: f2a3b4c5d6e7
Revises: ea2e2c127424
Create Date: 2024-12-26

Adds tables for tracking module schema migrations and model states.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'f2a3b4c5d6e7'
down_revision: Union[str, None] = 'ea2e2c127424'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create module migration tracking tables."""

    # Create module_migrations table
    op.create_table(
        'module_migrations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('module_name', sa.String(length=100), nullable=False,
                  comment='Technical module name'),
        sa.Column('version', sa.String(length=50), nullable=False,
                  comment='Module version when migration was created'),
        sa.Column('migration_name', sa.String(length=200), nullable=False,
                  comment='Unique migration identifier'),
        sa.Column('migration_type', sa.String(length=20), nullable=False,
                  server_default='schema',
                  comment='Type of migration: schema, data, rollback, initial'),
        sa.Column('operations', postgresql.JSONB(astext_type=sa.Text()), nullable=False,
                  server_default='[]',
                  comment='List of DDL/DML operations performed'),
        sa.Column('rollback_sql', sa.Text(), nullable=True,
                  comment='SQL to rollback this migration'),
        sa.Column('rollback_operations', postgresql.JSONB(astext_type=sa.Text()), nullable=True,
                  server_default='[]',
                  comment='Structured rollback operations'),
        sa.Column('status', sa.String(length=20), nullable=False,
                  server_default='pending',
                  comment='Migration status: pending, applied, failed, rolled_back'),
        sa.Column('is_applied', sa.Boolean(), nullable=False,
                  server_default='false',
                  comment='Whether migration is currently applied'),
        sa.Column('applied_at', sa.DateTime(timezone=True), nullable=True,
                  server_default=sa.text('now()'),
                  comment='When the migration was applied'),
        sa.Column('rolled_back_at', sa.DateTime(timezone=True), nullable=True,
                  comment='When the migration was rolled back'),
        sa.Column('checksum', sa.String(length=64), nullable=True,
                  comment='SHA-256 checksum of migration content'),
        sa.Column('error_message', sa.Text(), nullable=True,
                  comment='Error message if migration failed'),
        sa.Column('description', sa.Text(), nullable=True,
                  comment='Human-readable description of changes'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'),
                  nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('module_name', 'migration_name', name='uq_module_migration_name')
    )
    op.create_index(op.f('ix_module_migrations_id'), 'module_migrations', ['id'], unique=False)
    op.create_index(op.f('ix_module_migrations_module_name'), 'module_migrations', ['module_name'], unique=False)
    op.create_index('ix_module_migrations_module_version', 'module_migrations', ['module_name', 'version'], unique=False)
    op.create_index('ix_module_migrations_applied_at', 'module_migrations', ['applied_at'], unique=False)
    op.create_index(op.f('ix_module_migrations_status'), 'module_migrations', ['status'], unique=False)

    # Create module_model_states table
    op.create_table(
        'module_model_states',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('module_name', sa.String(length=100), nullable=False,
                  comment='Technical module name'),
        sa.Column('model_name', sa.String(length=100), nullable=False,
                  comment='Python model class name'),
        sa.Column('table_name', sa.String(length=100), nullable=False,
                  comment='Database table name'),
        sa.Column('schema_snapshot', postgresql.JSONB(astext_type=sa.Text()), nullable=False,
                  comment='Complete schema definition: columns, indexes, constraints'),
        sa.Column('columns', postgresql.JSONB(astext_type=sa.Text()), nullable=False,
                  server_default='[]',
                  comment='List of column definitions'),
        sa.Column('indexes', postgresql.JSONB(astext_type=sa.Text()), nullable=True,
                  server_default='[]',
                  comment='List of index definitions'),
        sa.Column('foreign_keys', postgresql.JSONB(astext_type=sa.Text()), nullable=True,
                  server_default='[]',
                  comment='List of foreign key definitions'),
        sa.Column('constraints', postgresql.JSONB(astext_type=sa.Text()), nullable=True,
                  server_default='[]',
                  comment='List of other constraints'),
        sa.Column('checksum', sa.String(length=64), nullable=False,
                  comment='SHA-256 checksum of schema snapshot'),
        sa.Column('version', sa.String(length=50), nullable=False,
                  comment='Module version when state was captured'),
        sa.Column('last_migration', sa.String(length=200), nullable=True,
                  comment='Last migration that modified this model'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'),
                  nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('module_name', 'model_name', name='uq_module_model_state')
    )
    op.create_index(op.f('ix_module_model_states_id'), 'module_model_states', ['id'], unique=False)
    op.create_index('ix_module_model_states_module', 'module_model_states', ['module_name'], unique=False)
    op.create_index('ix_module_model_states_table', 'module_model_states', ['table_name'], unique=False)


def downgrade() -> None:
    """Drop module migration tracking tables."""
    # Drop module_model_states table
    op.drop_index('ix_module_model_states_table', table_name='module_model_states')
    op.drop_index('ix_module_model_states_module', table_name='module_model_states')
    op.drop_index(op.f('ix_module_model_states_id'), table_name='module_model_states')
    op.drop_table('module_model_states')

    # Drop module_migrations table
    op.drop_index(op.f('ix_module_migrations_status'), table_name='module_migrations')
    op.drop_index('ix_module_migrations_applied_at', table_name='module_migrations')
    op.drop_index('ix_module_migrations_module_version', table_name='module_migrations')
    op.drop_index(op.f('ix_module_migrations_module_name'), table_name='module_migrations')
    op.drop_index(op.f('ix_module_migrations_id'), table_name='module_migrations')
    op.drop_table('module_migrations')
