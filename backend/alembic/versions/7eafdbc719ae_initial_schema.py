"""initial_schema

Revision ID: 7eafdbc719ae
Revises:
Create Date: 2025-12-25 10:13:56.643194

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7eafdbc719ae'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Step 1: Create permissions table (no dependencies)
    op.create_table('permissions',
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('codename', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category', sa.Enum('USER', 'COMPANY', 'GROUP', 'ROLE', 'PERMISSION', 'SYSTEM', 'AUDIT', name='permissioncategory'), nullable=False),
        sa.Column('action', sa.Enum('CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE', 'EXPORT', 'IMPORT', name='permissionaction'), nullable=False),
        sa.Column('resource', sa.String(length=100), nullable=True),
        sa.Column('is_system_permission', sa.Boolean(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_permissions_action'), 'permissions', ['action'], unique=False)
    op.create_index(op.f('ix_permissions_category'), 'permissions', ['category'], unique=False)
    op.create_index(op.f('ix_permissions_codename'), 'permissions', ['codename'], unique=True)
    op.create_index(op.f('ix_permissions_id'), 'permissions', ['id'], unique=False)
    op.create_index(op.f('ix_permissions_name'), 'permissions', ['name'], unique=True)

    # Step 2: Create companies table WITHOUT FK to users (will add later)
    op.create_table('companies',
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('parent_company_id', sa.Integer(), nullable=True),
        sa.Column('address', sa.String(length=500), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('state', sa.String(length=100), nullable=True),
        sa.Column('country', sa.String(length=100), nullable=True),
        sa.Column('zip_code', sa.String(length=20), nullable=True),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('website', sa.String(length=255), nullable=True),
        sa.Column('tax_id', sa.String(length=50), nullable=True),
        sa.Column('registration_number', sa.String(length=100), nullable=True),
        sa.Column('date_format', sa.String(length=20), nullable=True),
        sa.Column('time_format', sa.String(length=20), nullable=True),
        sa.Column('timezone', sa.String(length=50), nullable=True),
        sa.Column('currency', sa.String(length=10), nullable=True),
        sa.Column('logo_url', sa.String(length=500), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('is_headquarters', sa.Boolean(), nullable=False),
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['parent_company_id'], ['companies.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_companies_code'), 'companies', ['code'], unique=True)
    op.create_index(op.f('ix_companies_id'), 'companies', ['id'], unique=False)
    op.create_index(op.f('ix_companies_is_active'), 'companies', ['is_active'], unique=False)
    op.create_index(op.f('ix_companies_name'), 'companies', ['name'], unique=False)
    op.create_index(op.f('ix_companies_parent_company_id'), 'companies', ['parent_company_id'], unique=False)

    # Step 3: Create users table
    op.create_table('users',
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('username', sa.String(length=100), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=True),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('avatar_url', sa.String(length=500), nullable=True),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('location', sa.String(length=255), nullable=True),
        sa.Column('website', sa.String(length=500), nullable=True),
        sa.Column('timezone', sa.String(length=50), nullable=True),
        sa.Column('language', sa.String(length=10), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('is_verified', sa.Boolean(), nullable=False),
        sa.Column('is_superuser', sa.Boolean(), nullable=False),
        sa.Column('current_company_id', sa.Integer(), nullable=True),
        sa.Column('failed_login_attempts', sa.Integer(), nullable=False),
        sa.Column('locked_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_login_ip', sa.String(length=45), nullable=True),
        sa.Column('password_changed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('must_change_password', sa.Boolean(), nullable=False),
        sa.Column('two_factor_enabled', sa.Boolean(), nullable=False),
        sa.Column('two_factor_secret', sa.String(length=255), nullable=True),
        sa.Column('backup_codes', sa.JSON(), nullable=False),
        sa.Column('two_factor_verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('email_verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('email_verification_token', sa.String(length=255), nullable=True),
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['current_company_id'], ['companies.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['updated_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_current_company_id'), 'users', ['current_company_id'], unique=False)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_is_active'), 'users', ['is_active'], unique=False)
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)

    # Step 4: Add FK constraints from companies to users (now that users exists)
    op.create_foreign_key('fk_companies_created_by', 'companies', 'users', ['created_by'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_companies_updated_by', 'companies', 'users', ['updated_by'], ['id'], ondelete='SET NULL')

    # Step 5: Create remaining tables
    op.create_table('audit_logs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('company_id', sa.Integer(), nullable=True),
        sa.Column('action', sa.Enum('CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_CHANGE', 'PASSWORD_RESET', 'TWO_FACTOR_ENABLE', 'TWO_FACTOR_DISABLE', 'ROLE_ASSIGN', 'ROLE_REMOVE', 'PERMISSION_GRANT', 'PERMISSION_REVOKE', 'COMPANY_SWITCH', 'EXPORT', 'IMPORT', name='auditaction'), nullable=False),
        sa.Column('entity_type', sa.String(length=100), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=True),
        sa.Column('entity_name', sa.String(length=255), nullable=True),
        sa.Column('old_values', sa.Text(), nullable=True),
        sa.Column('new_values', sa.Text(), nullable=True),
        sa.Column('changed_fields', sa.Text(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.String(length=500), nullable=True),
        sa.Column('request_id', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_audit_logs_action'), 'audit_logs', ['action'], unique=False)
    op.create_index(op.f('ix_audit_logs_company_id'), 'audit_logs', ['company_id'], unique=False)
    op.create_index(op.f('ix_audit_logs_created_at'), 'audit_logs', ['created_at'], unique=False)
    op.create_index(op.f('ix_audit_logs_entity_id'), 'audit_logs', ['entity_id'], unique=False)
    op.create_index(op.f('ix_audit_logs_entity_type'), 'audit_logs', ['entity_type'], unique=False)
    op.create_index(op.f('ix_audit_logs_id'), 'audit_logs', ['id'], unique=False)
    op.create_index(op.f('ix_audit_logs_user_id'), 'audit_logs', ['user_id'], unique=False)

    op.create_table('groups',
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('codename', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('company_id', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('is_system_group', sa.Boolean(), nullable=False),
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['updated_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_groups_codename'), 'groups', ['codename'], unique=False)
    op.create_index(op.f('ix_groups_company_id'), 'groups', ['company_id'], unique=False)
    op.create_index(op.f('ix_groups_id'), 'groups', ['id'], unique=False)
    op.create_index(op.f('ix_groups_is_active'), 'groups', ['is_active'], unique=False)
    op.create_index(op.f('ix_groups_name'), 'groups', ['name'], unique=False)

    op.create_table('roles',
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('codename', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('company_id', sa.Integer(), nullable=True),
        sa.Column('is_system_role', sa.Boolean(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['updated_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_roles_codename'), 'roles', ['codename'], unique=False)
    op.create_index(op.f('ix_roles_company_id'), 'roles', ['company_id'], unique=False)
    op.create_index(op.f('ix_roles_id'), 'roles', ['id'], unique=False)
    op.create_index(op.f('ix_roles_is_active'), 'roles', ['is_active'], unique=False)
    op.create_index(op.f('ix_roles_name'), 'roles', ['name'], unique=False)

    op.create_table('social_accounts',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('provider', sa.Enum('GOOGLE', 'GITHUB', 'MICROSOFT', name='oauthprovider'), nullable=False),
        sa.Column('provider_user_id', sa.String(length=255), nullable=False),
        sa.Column('provider_email', sa.String(length=255), nullable=True),
        sa.Column('provider_username', sa.String(length=255), nullable=True),
        sa.Column('provider_name', sa.String(length=255), nullable=True),
        sa.Column('provider_avatar', sa.String(length=500), nullable=True),
        sa.Column('access_token', sa.Text(), nullable=True),
        sa.Column('refresh_token', sa.Text(), nullable=True),
        sa.Column('token_expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('raw_data', sa.Text(), nullable=True),
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_social_accounts_id'), 'social_accounts', ['id'], unique=False)
    op.create_index(op.f('ix_social_accounts_provider'), 'social_accounts', ['provider'], unique=False)
    op.create_index(op.f('ix_social_accounts_provider_user_id'), 'social_accounts', ['provider_user_id'], unique=False)
    op.create_index(op.f('ix_social_accounts_user_id'), 'social_accounts', ['user_id'], unique=False)

    op.create_table('group_permissions',
        sa.Column('group_id', sa.Integer(), nullable=False),
        sa.Column('permission_id', sa.Integer(), nullable=False),
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['group_id'], ['groups.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['permission_id'], ['permissions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_group_permissions_group_id'), 'group_permissions', ['group_id'], unique=False)
    op.create_index(op.f('ix_group_permissions_id'), 'group_permissions', ['id'], unique=False)
    op.create_index(op.f('ix_group_permissions_permission_id'), 'group_permissions', ['permission_id'], unique=False)

    op.create_table('role_permissions',
        sa.Column('role_id', sa.Integer(), nullable=False),
        sa.Column('permission_id', sa.Integer(), nullable=False),
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['permission_id'], ['permissions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_role_permissions_id'), 'role_permissions', ['id'], unique=False)
    op.create_index(op.f('ix_role_permissions_permission_id'), 'role_permissions', ['permission_id'], unique=False)
    op.create_index(op.f('ix_role_permissions_role_id'), 'role_permissions', ['role_id'], unique=False)

    op.create_table('user_company_roles',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('company_id', sa.Integer(), nullable=False),
        sa.Column('role_id', sa.Integer(), nullable=False),
        sa.Column('is_default', sa.Boolean(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('assigned_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('assigned_by', sa.Integer(), nullable=True),
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['assigned_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_company_roles_company_id'), 'user_company_roles', ['company_id'], unique=False)
    op.create_index(op.f('ix_user_company_roles_id'), 'user_company_roles', ['id'], unique=False)
    op.create_index(op.f('ix_user_company_roles_role_id'), 'user_company_roles', ['role_id'], unique=False)
    op.create_index(op.f('ix_user_company_roles_user_id'), 'user_company_roles', ['user_id'], unique=False)

    op.create_table('user_groups',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('group_id', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['group_id'], ['groups.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_groups_group_id'), 'user_groups', ['group_id'], unique=False)
    op.create_index(op.f('ix_user_groups_id'), 'user_groups', ['id'], unique=False)
    op.create_index(op.f('ix_user_groups_user_id'), 'user_groups', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_user_groups_user_id'), table_name='user_groups')
    op.drop_index(op.f('ix_user_groups_id'), table_name='user_groups')
    op.drop_index(op.f('ix_user_groups_group_id'), table_name='user_groups')
    op.drop_table('user_groups')

    op.drop_index(op.f('ix_user_company_roles_user_id'), table_name='user_company_roles')
    op.drop_index(op.f('ix_user_company_roles_role_id'), table_name='user_company_roles')
    op.drop_index(op.f('ix_user_company_roles_id'), table_name='user_company_roles')
    op.drop_index(op.f('ix_user_company_roles_company_id'), table_name='user_company_roles')
    op.drop_table('user_company_roles')

    op.drop_index(op.f('ix_role_permissions_role_id'), table_name='role_permissions')
    op.drop_index(op.f('ix_role_permissions_permission_id'), table_name='role_permissions')
    op.drop_index(op.f('ix_role_permissions_id'), table_name='role_permissions')
    op.drop_table('role_permissions')

    op.drop_index(op.f('ix_group_permissions_permission_id'), table_name='group_permissions')
    op.drop_index(op.f('ix_group_permissions_id'), table_name='group_permissions')
    op.drop_index(op.f('ix_group_permissions_group_id'), table_name='group_permissions')
    op.drop_table('group_permissions')

    op.drop_index(op.f('ix_social_accounts_user_id'), table_name='social_accounts')
    op.drop_index(op.f('ix_social_accounts_provider_user_id'), table_name='social_accounts')
    op.drop_index(op.f('ix_social_accounts_provider'), table_name='social_accounts')
    op.drop_index(op.f('ix_social_accounts_id'), table_name='social_accounts')
    op.drop_table('social_accounts')

    op.drop_index(op.f('ix_roles_name'), table_name='roles')
    op.drop_index(op.f('ix_roles_is_active'), table_name='roles')
    op.drop_index(op.f('ix_roles_id'), table_name='roles')
    op.drop_index(op.f('ix_roles_company_id'), table_name='roles')
    op.drop_index(op.f('ix_roles_codename'), table_name='roles')
    op.drop_table('roles')

    op.drop_index(op.f('ix_groups_name'), table_name='groups')
    op.drop_index(op.f('ix_groups_is_active'), table_name='groups')
    op.drop_index(op.f('ix_groups_id'), table_name='groups')
    op.drop_index(op.f('ix_groups_company_id'), table_name='groups')
    op.drop_index(op.f('ix_groups_codename'), table_name='groups')
    op.drop_table('groups')

    op.drop_index(op.f('ix_audit_logs_user_id'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_id'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_entity_type'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_entity_id'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_created_at'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_company_id'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_action'), table_name='audit_logs')
    op.drop_table('audit_logs')

    # Drop FK constraints from companies to users first
    op.drop_constraint('fk_companies_created_by', 'companies', type_='foreignkey')
    op.drop_constraint('fk_companies_updated_by', 'companies', type_='foreignkey')

    op.drop_index(op.f('ix_users_username'), table_name='users')
    op.drop_index(op.f('ix_users_is_active'), table_name='users')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_index(op.f('ix_users_current_company_id'), table_name='users')
    op.drop_table('users')

    op.drop_index(op.f('ix_companies_parent_company_id'), table_name='companies')
    op.drop_index(op.f('ix_companies_name'), table_name='companies')
    op.drop_index(op.f('ix_companies_is_active'), table_name='companies')
    op.drop_index(op.f('ix_companies_id'), table_name='companies')
    op.drop_index(op.f('ix_companies_code'), table_name='companies')
    op.drop_table('companies')

    op.drop_index(op.f('ix_permissions_name'), table_name='permissions')
    op.drop_index(op.f('ix_permissions_id'), table_name='permissions')
    op.drop_index(op.f('ix_permissions_codename'), table_name='permissions')
    op.drop_index(op.f('ix_permissions_category'), table_name='permissions')
    op.drop_index(op.f('ix_permissions_action'), table_name='permissions')
    op.drop_table('permissions')

    # Drop enums
    sa.Enum(name='oauthprovider').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='auditaction').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='permissionaction').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='permissioncategory').drop(op.get_bind(), checkfirst=True)
