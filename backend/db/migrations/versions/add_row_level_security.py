"""Add Row Level Security models

Revision ID: rls_001
Revises: 
Create Date: 2025-10-04

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = 'rls_001'
down_revision = None  # Set this to the latest migration ID
branch_labels = None
depends_on = None


def upgrade():
    # Create organizations table
    op.create_table(
        'organizations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('settings', sa.JSON(), nullable=True),
        sa.Column('rls_enabled', sa.Boolean(), nullable=False, default=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug')
    )
    op.create_index(op.f('ix_organizations_id'), 'organizations', ['id'], unique=False)
    op.create_index(op.f('ix_organizations_name'), 'organizations', ['name'], unique=False)
    op.create_index(op.f('ix_organizations_slug'), 'organizations', ['slug'], unique=True)

    # Create organization_members table
    op.create_table(
        'organization_members',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False, default='member'),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('joined_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_organization_members_id'), 'organization_members', ['id'], unique=False)
    op.create_index(op.f('ix_organization_members_organization_id'), 'organization_members', ['organization_id'], unique=False)
    op.create_index(op.f('ix_organization_members_user_id'), 'organization_members', ['user_id'], unique=False)

    # Create rls_policies table
    op.create_table(
        'rls_policies',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('entity_type', sa.Enum('PROJECT', 'PAGE', 'COMPONENT', 'USER', 'ASSET', 'ROLE', 'PERMISSION', 'ORGANIZATION', 'CUSTOM', name='rlsentitytype'), nullable=False),
        sa.Column('table_name', sa.String(length=100), nullable=False),
        sa.Column('policy_type', sa.Enum('OWNER_ONLY', 'ORGANIZATION_MEMBER', 'PROJECT_MEMBER', 'ROLE_BASED', 'CONDITIONAL', 'PUBLIC', 'TENANT_ISOLATED', name='rlspolicy'), nullable=False),
        sa.Column('action', sa.Enum('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'ALL', name='rlsaction'), nullable=False),
        sa.Column('condition_column', sa.String(length=100), nullable=True),
        sa.Column('condition_value_source', sa.String(length=100), nullable=True),
        sa.Column('custom_condition', sa.Text(), nullable=True),
        sa.Column('required_roles', sa.JSON(), nullable=True),
        sa.Column('required_permissions', sa.JSON(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('priority', sa.Integer(), nullable=False, default=100),
        sa.Column('organization_id', sa.Integer(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_rls_policies_id'), 'rls_policies', ['id'], unique=False)
    op.create_index(op.f('ix_rls_policies_name'), 'rls_policies', ['name'], unique=False)
    op.create_index(op.f('ix_rls_policies_entity_type'), 'rls_policies', ['entity_type'], unique=False)
    op.create_index(op.f('ix_rls_policies_table_name'), 'rls_policies', ['table_name'], unique=False)
    op.create_index(op.f('ix_rls_policies_policy_type'), 'rls_policies', ['policy_type'], unique=False)
    op.create_index(op.f('ix_rls_policies_action'), 'rls_policies', ['action'], unique=False)
    op.create_index(op.f('ix_rls_policies_organization_id'), 'rls_policies', ['organization_id'], unique=False)

    # Create rls_rule_assignments table
    op.create_table(
        'rls_rule_assignments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('policy_id', sa.Integer(), nullable=False),
        sa.Column('entity_type', sa.Enum('PROJECT', 'PAGE', 'COMPONENT', 'USER', 'ASSET', 'ROLE', 'PERMISSION', 'ORGANIZATION', 'CUSTOM', name='rlsentitytype'), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('role_id', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('conditions', sa.JSON(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['policy_id'], ['rls_policies.id'], ),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_rls_rule_assignments_id'), 'rls_rule_assignments', ['id'], unique=False)
    op.create_index(op.f('ix_rls_rule_assignments_policy_id'), 'rls_rule_assignments', ['policy_id'], unique=False)
    op.create_index(op.f('ix_rls_rule_assignments_entity_type'), 'rls_rule_assignments', ['entity_type'], unique=False)
    op.create_index(op.f('ix_rls_rule_assignments_entity_id'), 'rls_rule_assignments', ['entity_id'], unique=False)
    op.create_index(op.f('ix_rls_rule_assignments_user_id'), 'rls_rule_assignments', ['user_id'], unique=False)

    # Create rls_contexts table
    op.create_table(
        'rls_contexts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('session_id', sa.String(length=255), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=True),
        sa.Column('tenant_id', sa.String(length=100), nullable=True),
        sa.Column('project_ids', sa.JSON(), nullable=True),
        sa.Column('roles', sa.JSON(), nullable=True),
        sa.Column('permissions', sa.JSON(), nullable=True),
        sa.Column('context_data', sa.JSON(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_rls_contexts_id'), 'rls_contexts', ['id'], unique=False)
    op.create_index(op.f('ix_rls_contexts_session_id'), 'rls_contexts', ['session_id'], unique=False)
    op.create_index(op.f('ix_rls_contexts_user_id'), 'rls_contexts', ['user_id'], unique=False)
    op.create_index(op.f('ix_rls_contexts_organization_id'), 'rls_contexts', ['organization_id'], unique=False)
    op.create_index(op.f('ix_rls_contexts_tenant_id'), 'rls_contexts', ['tenant_id'], unique=False)

    # Create rls_audit_logs table
    op.create_table(
        'rls_audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('request_id', sa.String(length=255), nullable=True),
        sa.Column('session_id', sa.String(length=255), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('policy_id', sa.Integer(), nullable=True),
        sa.Column('entity_type', sa.Enum('PROJECT', 'PAGE', 'COMPONENT', 'USER', 'ASSET', 'ROLE', 'PERMISSION', 'ORGANIZATION', 'CUSTOM', name='rlsentitytype'), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=True),
        sa.Column('action', sa.Enum('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'ALL', name='rlsaction'), nullable=False),
        sa.Column('access_granted', sa.Boolean(), nullable=False),
        sa.Column('denial_reason', sa.Text(), nullable=True),
        sa.Column('table_name', sa.String(length=100), nullable=True),
        sa.Column('sql_query', sa.Text(), nullable=True),
        sa.Column('applied_conditions', sa.JSON(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('request_method', sa.String(length=10), nullable=True),
        sa.Column('request_path', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['policy_id'], ['rls_policies.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_rls_audit_logs_id'), 'rls_audit_logs', ['id'], unique=False)
    op.create_index(op.f('ix_rls_audit_logs_request_id'), 'rls_audit_logs', ['request_id'], unique=False)
    op.create_index(op.f('ix_rls_audit_logs_session_id'), 'rls_audit_logs', ['session_id'], unique=False)
    op.create_index(op.f('ix_rls_audit_logs_user_id'), 'rls_audit_logs', ['user_id'], unique=False)
    op.create_index(op.f('ix_rls_audit_logs_policy_id'), 'rls_audit_logs', ['policy_id'], unique=False)
    op.create_index(op.f('ix_rls_audit_logs_entity_type'), 'rls_audit_logs', ['entity_type'], unique=False)
    op.create_index(op.f('ix_rls_audit_logs_entity_id'), 'rls_audit_logs', ['entity_id'], unique=False)
    op.create_index(op.f('ix_rls_audit_logs_action'), 'rls_audit_logs', ['action'], unique=False)
    op.create_index(op.f('ix_rls_audit_logs_access_granted'), 'rls_audit_logs', ['access_granted'], unique=False)
    op.create_index(op.f('ix_rls_audit_logs_created_at'), 'rls_audit_logs', ['created_at'], unique=False)


def downgrade():
    # Drop all RLS tables in reverse order
    op.drop_table('rls_audit_logs')
    op.drop_table('rls_contexts')
    op.drop_table('rls_rule_assignments')
    op.drop_table('rls_policies')
    op.drop_table('organization_members')
    op.drop_table('organizations')
    
    # Drop enum types
    try:
        op.execute('DROP TYPE IF EXISTS rlsentitytype CASCADE')
        op.execute('DROP TYPE IF EXISTS rlspolicy CASCADE')
        op.execute('DROP TYPE IF EXISTS rlsaction CASCADE')
    except:
        pass  # Ignore errors for non-PostgreSQL databases