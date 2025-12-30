"""add_phase1_module_features

Revision ID: g3h4i5j6k7l8
Revises: f2a3b4c5d6e7
Create Date: 2024-12-26

Adds Phase 1 module features:
- config_parameters: Key-value configuration storage per module
- module_operations: Batch module operation tracking for state machine
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'g3h4i5j6k7l8'
down_revision: Union[str, None] = 'f2a3b4c5d6e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create Phase 1 tables."""

    # Create config_parameters table
    op.create_table(
        'config_parameters',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('key', sa.String(length=200), nullable=False,
                  comment='Unique parameter key, typically module.parameter_name'),
        sa.Column('module_name', sa.String(length=100), nullable=True,
                  comment='Module that owns this parameter'),
        sa.Column('value', sa.Text(), nullable=True,
                  comment='String representation of the value'),
        sa.Column('value_type', sa.String(length=20), nullable=False,
                  server_default='string',
                  comment='Type of the value: string, integer, float, boolean, json, secret'),
        sa.Column('description', sa.Text(), nullable=True,
                  comment='Human-readable description of the parameter'),
        sa.Column('is_system', sa.Boolean(), nullable=False,
                  server_default='false',
                  comment='Protected from user modification via UI'),
        sa.Column('company_id', sa.Integer(), nullable=True,
                  comment='Company ID for multi-tenant configuration'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'),
                  nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('key', name='uq_config_parameters_key')
    )
    op.create_index(op.f('ix_config_parameters_id'), 'config_parameters', ['id'], unique=False)
    op.create_index(op.f('ix_config_parameters_key'), 'config_parameters', ['key'], unique=True)
    op.create_index(op.f('ix_config_parameters_module_name'), 'config_parameters', ['module_name'], unique=False)
    op.create_index(op.f('ix_config_parameters_company_id'), 'config_parameters', ['company_id'], unique=False)
    op.create_index('ix_config_parameters_key_module', 'config_parameters', ['key', 'module_name'], unique=False)
    op.create_index('ix_config_parameters_module_company', 'config_parameters', ['module_name', 'company_id'], unique=False)

    # Create module_operations table
    op.create_table(
        'module_operations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('batch_id', sa.String(length=50), nullable=False,
                  comment='UUID grouping operations that should be applied together'),
        sa.Column('module_name', sa.String(length=100), nullable=False,
                  comment='Technical name of the module'),
        sa.Column('operation', sa.String(length=30), nullable=False,
                  comment='Type of operation: install, upgrade, remove'),
        sa.Column('status', sa.String(length=20), nullable=False,
                  server_default='pending',
                  comment='Current status: pending, in_progress, success, failed, rolled_back, cancelled'),
        sa.Column('sequence', sa.Integer(), nullable=False,
                  server_default='10',
                  comment='Order of execution within batch'),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True,
                  comment='When operation execution started'),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True,
                  comment='When operation completed'),
        sa.Column('duration_ms', sa.Integer(), nullable=True,
                  comment='Duration of operation in milliseconds'),
        sa.Column('error_message', sa.Text(), nullable=True,
                  comment='Error message if operation failed'),
        sa.Column('error_traceback', sa.Text(), nullable=True,
                  comment='Full traceback for debugging'),
        sa.Column('rollback_data', postgresql.JSONB(astext_type=sa.Text()), nullable=True,
                  server_default='{}',
                  comment='Data needed to rollback this operation'),
        sa.Column('previous_version', sa.String(length=50), nullable=True,
                  comment='Previous version for upgrade operations'),
        sa.Column('previous_state', sa.String(length=20), nullable=True,
                  comment='Previous module state for rollback'),
        sa.Column('marked_by', sa.Integer(), nullable=True,
                  comment='User ID who marked this operation'),
        sa.Column('executed_by', sa.Integer(), nullable=True,
                  comment='User ID who executed this operation'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'),
                  nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint(
            "operation IN ('install', 'upgrade', 'remove')",
            name='ck_module_operations_operation'
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'in_progress', 'success', 'failed', 'rolled_back', 'cancelled')",
            name='ck_module_operations_status'
        )
    )
    op.create_index(op.f('ix_module_operations_id'), 'module_operations', ['id'], unique=False)
    op.create_index('ix_module_operations_batch', 'module_operations', ['batch_id'], unique=False)
    op.create_index('ix_module_operations_status', 'module_operations', ['status'], unique=False)
    op.create_index('ix_module_operations_module', 'module_operations', ['module_name'], unique=False)


def downgrade() -> None:
    """Drop Phase 1 tables."""
    # Drop module_operations table
    op.drop_index('ix_module_operations_module', table_name='module_operations')
    op.drop_index('ix_module_operations_status', table_name='module_operations')
    op.drop_index('ix_module_operations_batch', table_name='module_operations')
    op.drop_index(op.f('ix_module_operations_id'), table_name='module_operations')
    op.drop_table('module_operations')

    # Drop config_parameters table
    op.drop_index('ix_config_parameters_module_company', table_name='config_parameters')
    op.drop_index('ix_config_parameters_key_module', table_name='config_parameters')
    op.drop_index(op.f('ix_config_parameters_company_id'), table_name='config_parameters')
    op.drop_index(op.f('ix_config_parameters_module_name'), table_name='config_parameters')
    op.drop_index(op.f('ix_config_parameters_key'), table_name='config_parameters')
    op.drop_index(op.f('ix_config_parameters_id'), table_name='config_parameters')
    op.drop_table('config_parameters')
