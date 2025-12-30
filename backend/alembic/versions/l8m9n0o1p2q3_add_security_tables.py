"""add security tables

Revision ID: l8m9n0o1p2q3
Revises: c22cb0ae5543
Create Date: 2025-12-30 01:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'l8m9n0o1p2q3'
down_revision: Union[str, None] = 'c22cb0ae5543'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create security_settings table
    op.create_table('security_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('two_factor_enabled', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('two_factor_secret', sa.String(length=255), nullable=True),
        sa.Column('backup_codes', sa.Text(), nullable=True),
        sa.Column('require_password_change', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('password_expiry_days', sa.Integer(), nullable=True, server_default='90'),
        sa.Column('max_login_attempts', sa.Integer(), nullable=False, server_default='5'),
        sa.Column('lockout_duration_minutes', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('min_password_length', sa.Integer(), nullable=False, server_default='8'),
        sa.Column('require_uppercase', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('require_lowercase', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('require_numbers', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('require_special_chars', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('password_history_count', sa.Integer(), nullable=False, server_default='5'),
        sa.Column('max_session_duration_hours', sa.Integer(), nullable=False, server_default='24'),
        sa.Column('allow_concurrent_sessions', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('max_concurrent_sessions', sa.Integer(), nullable=False, server_default='5'),
        sa.Column('email_on_login', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('email_on_password_change', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('email_on_security_change', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('email_on_suspicious_activity', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('activity_logging_enabled', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('data_retention_days', sa.Integer(), nullable=True, server_default='90'),
        sa.Column('api_access_enabled', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('api_rate_limit', sa.Integer(), nullable=False, server_default='100'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_security_settings_id', 'security_settings', ['id'], unique=False)
    op.create_index('ix_security_settings_user_id', 'security_settings', ['user_id'], unique=True)

    # Create organizations table
    op.create_table('organizations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('settings', sa.JSON(), nullable=True),
        sa.Column('rls_enabled', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_organizations_id', 'organizations', ['id'], unique=False)
    op.create_index('ix_organizations_name', 'organizations', ['name'], unique=False)
    op.create_index('ix_organizations_slug', 'organizations', ['slug'], unique=True)

    # Create organization_members table
    op.create_table('organization_members',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False, server_default='member'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_organization_members_id', 'organization_members', ['id'], unique=False)
    op.create_index('ix_organization_members_organization_id', 'organization_members', ['organization_id'], unique=False)
    op.create_index('ix_organization_members_user_id', 'organization_members', ['user_id'], unique=False)

    # Create rls_policies table
    op.create_table('rls_policies',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('entity_type', sa.String(length=50), nullable=False),
        sa.Column('table_name', sa.String(length=255), nullable=False),
        sa.Column('policy_type', sa.String(length=20), nullable=False, server_default='PERMISSIVE'),
        sa.Column('action', sa.String(length=20), nullable=False, server_default='SELECT'),
        sa.Column('condition_column', sa.String(length=255), nullable=True),
        sa.Column('condition_value_source', sa.String(length=255), nullable=True),
        sa.Column('custom_condition', sa.Text(), nullable=True),
        sa.Column('required_roles', sa.JSON(), nullable=True),
        sa.Column('required_permissions', sa.JSON(), nullable=True),
        sa.Column('priority', sa.Integer(), nullable=False, server_default='100'),
        sa.Column('organization_id', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_rls_policies_id', 'rls_policies', ['id'], unique=False)
    op.create_index('ix_rls_policies_name', 'rls_policies', ['name'], unique=False)
    op.create_index('ix_rls_policies_entity_type', 'rls_policies', ['entity_type'], unique=False)
    op.create_index('ix_rls_policies_table_name', 'rls_policies', ['table_name'], unique=False)
    op.create_index('ix_rls_policies_policy_type', 'rls_policies', ['policy_type'], unique=False)
    op.create_index('ix_rls_policies_action', 'rls_policies', ['action'], unique=False)
    op.create_index('ix_rls_policies_organization_id', 'rls_policies', ['organization_id'], unique=False)

    # Create rls_contexts table
    op.create_table('rls_contexts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('session_id', sa.String(length=255), nullable=False),
        sa.Column('tenant_id', sa.String(length=255), nullable=True),
        sa.Column('organization_id', sa.Integer(), nullable=True),
        sa.Column('roles', sa.JSON(), nullable=True),
        sa.Column('permissions', sa.JSON(), nullable=True),
        sa.Column('attributes', sa.JSON(), nullable=True),
        sa.Column('ip_address', sa.String(length=50), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_rls_contexts_id', 'rls_contexts', ['id'], unique=False)
    op.create_index('ix_rls_contexts_user_id', 'rls_contexts', ['user_id'], unique=False)
    op.create_index('ix_rls_contexts_session_id', 'rls_contexts', ['session_id'], unique=False)
    op.create_index('ix_rls_contexts_tenant_id', 'rls_contexts', ['tenant_id'], unique=False)
    op.create_index('ix_rls_contexts_organization_id', 'rls_contexts', ['organization_id'], unique=False)

    # Create rls_rule_assignments table
    op.create_table('rls_rule_assignments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('policy_id', sa.Integer(), nullable=False),
        sa.Column('entity_type', sa.String(length=50), nullable=False),
        sa.Column('entity_id', sa.String(length=255), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('role_id', sa.Integer(), nullable=True),
        sa.Column('conditions', sa.JSON(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['policy_id'], ['rls_policies.id'], ),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_rls_rule_assignments_id', 'rls_rule_assignments', ['id'], unique=False)
    op.create_index('ix_rls_rule_assignments_policy_id', 'rls_rule_assignments', ['policy_id'], unique=False)
    op.create_index('ix_rls_rule_assignments_entity_type', 'rls_rule_assignments', ['entity_type'], unique=False)
    op.create_index('ix_rls_rule_assignments_entity_id', 'rls_rule_assignments', ['entity_id'], unique=False)
    op.create_index('ix_rls_rule_assignments_user_id', 'rls_rule_assignments', ['user_id'], unique=False)
    op.create_index('ix_rls_rule_assignments_role_id', 'rls_rule_assignments', ['role_id'], unique=False)

    # Create rls_audit_logs table
    op.create_table('rls_audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('session_id', sa.String(length=255), nullable=True),
        sa.Column('request_id', sa.String(length=255), nullable=True),
        sa.Column('entity_type', sa.String(length=50), nullable=False),
        sa.Column('entity_id', sa.String(length=255), nullable=True),
        sa.Column('table_name', sa.String(length=255), nullable=True),
        sa.Column('action', sa.String(length=20), nullable=False),
        sa.Column('access_granted', sa.Boolean(), nullable=False),
        sa.Column('denial_reason', sa.Text(), nullable=True),
        sa.Column('policy_id', sa.Integer(), nullable=True),
        sa.Column('ip_address', sa.String(length=50), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['policy_id'], ['rls_policies.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_rls_audit_logs_id', 'rls_audit_logs', ['id'], unique=False)
    op.create_index('ix_rls_audit_logs_user_id', 'rls_audit_logs', ['user_id'], unique=False)
    op.create_index('ix_rls_audit_logs_session_id', 'rls_audit_logs', ['session_id'], unique=False)
    op.create_index('ix_rls_audit_logs_request_id', 'rls_audit_logs', ['request_id'], unique=False)
    op.create_index('ix_rls_audit_logs_entity_type', 'rls_audit_logs', ['entity_type'], unique=False)
    op.create_index('ix_rls_audit_logs_entity_id', 'rls_audit_logs', ['entity_id'], unique=False)
    op.create_index('ix_rls_audit_logs_action', 'rls_audit_logs', ['action'], unique=False)
    op.create_index('ix_rls_audit_logs_access_granted', 'rls_audit_logs', ['access_granted'], unique=False)
    op.create_index('ix_rls_audit_logs_policy_id', 'rls_audit_logs', ['policy_id'], unique=False)
    op.create_index('ix_rls_audit_logs_created_at', 'rls_audit_logs', ['created_at'], unique=False)

    # Create access_control_lists table
    op.create_table('access_control_lists',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('entity_type', sa.String(length=100), nullable=False),
        sa.Column('operation', sa.String(length=50), nullable=False),
        sa.Column('field_name', sa.String(length=255), nullable=True),
        sa.Column('condition_script', sa.Text(), nullable=True),
        sa.Column('condition_context', sa.JSON(), nullable=True),
        sa.Column('allowed_roles', sa.JSON(), nullable=True),
        sa.Column('denied_roles', sa.JSON(), nullable=True),
        sa.Column('allowed_users', sa.JSON(), nullable=True),
        sa.Column('denied_users', sa.JSON(), nullable=True),
        sa.Column('requires_approval', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('approval_workflow_id', sa.Integer(), nullable=True),
        sa.Column('priority', sa.Integer(), nullable=False, server_default='100'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_access_control_lists_id', 'access_control_lists', ['id'], unique=False)
    op.create_index('ix_access_control_lists_name', 'access_control_lists', ['name'], unique=True)
    op.create_index('ix_access_control_lists_entity_type', 'access_control_lists', ['entity_type'], unique=False)
    op.create_index('ix_access_control_lists_operation', 'access_control_lists', ['operation'], unique=False)

    # Create record_permissions table
    op.create_table('record_permissions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('entity_type', sa.String(length=100), nullable=False),
        sa.Column('entity_id', sa.String(length=255), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('role_id', sa.Integer(), nullable=True),
        sa.Column('operation', sa.String(length=50), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('conditions', sa.JSON(), nullable=True),
        sa.Column('granted_by', sa.Integer(), nullable=False),
        sa.Column('granted_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('revoked_by', sa.Integer(), nullable=True),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['granted_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['revoked_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_record_permissions_id', 'record_permissions', ['id'], unique=False)
    op.create_index('ix_record_permissions_entity_type', 'record_permissions', ['entity_type'], unique=False)
    op.create_index('ix_record_permissions_entity_id', 'record_permissions', ['entity_id'], unique=False)
    op.create_index('ix_record_permissions_user_id', 'record_permissions', ['user_id'], unique=False)
    op.create_index('ix_record_permissions_role_id', 'record_permissions', ['role_id'], unique=False)
    op.create_index('ix_record_permissions_operation', 'record_permissions', ['operation'], unique=False)


def downgrade() -> None:
    op.drop_table('record_permissions')
    op.drop_table('access_control_lists')
    op.drop_table('rls_audit_logs')
    op.drop_table('rls_rule_assignments')
    op.drop_table('rls_contexts')
    op.drop_table('rls_policies')
    op.drop_table('organization_members')
    op.drop_table('organizations')
    op.drop_table('security_settings')
