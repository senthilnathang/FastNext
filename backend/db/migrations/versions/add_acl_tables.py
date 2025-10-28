"""Add ACL (Access Control List) tables for dynamic per-record permissions

Revision ID: add_acl_tables
Revises: simple_import_export
Create Date: 2025-01-28 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_acl_tables'
down_revision = 'simple_import_export'
branch_labels = None
depends_on = None


def upgrade():
    # Create access_control_lists table
    op.create_table('access_control_lists',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('entity_type', sa.String(), nullable=False),
        sa.Column('operation', sa.String(), nullable=False),
        sa.Column('field_name', sa.String(), nullable=True),
        sa.Column('condition_script', sa.Text(), nullable=True),
        sa.Column('condition_context', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('allowed_roles', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('denied_roles', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('allowed_users', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('denied_users', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('requires_approval', sa.Boolean(), nullable=True),
        sa.Column('approval_workflow_id', sa.Integer(), nullable=True),
        sa.Column('priority', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['approval_workflow_id'], ['workflow_templates.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_access_control_lists_entity_type'), 'access_control_lists', ['entity_type'], unique=False)
    op.create_index(op.f('ix_access_control_lists_name'), 'access_control_lists', ['name'], unique=False)

    # Create record_permissions table
    op.create_table('record_permissions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('entity_type', sa.String(), nullable=False),
        sa.Column('entity_id', sa.String(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('role_id', sa.Integer(), nullable=True),
        sa.Column('operation', sa.String(), nullable=False),
        sa.Column('granted_by', sa.Integer(), nullable=False),
        sa.Column('granted_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('conditions', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('revoked_by', sa.Integer(), nullable=True),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['granted_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['revoked_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_record_permissions_entity'), 'record_permissions', ['entity_type', 'entity_id'], unique=False)
    op.create_index(op.f('ix_record_permissions_user'), 'record_permissions', ['user_id', 'operation'], unique=False)
    op.create_index(op.f('ix_record_permissions_role'), 'record_permissions', ['role_id', 'operation'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_record_permissions_role'), table_name='record_permissions')
    op.drop_index(op.f('ix_record_permissions_user'), table_name='record_permissions')
    op.drop_index(op.f('ix_record_permissions_entity'), table_name='record_permissions')
    op.drop_table('record_permissions')
    op.drop_index(op.f('ix_access_control_lists_name'), table_name='access_control_lists')
    op.drop_index(op.f('ix_access_control_lists_entity_type'), table_name='access_control_lists')
    op.drop_table('access_control_lists')