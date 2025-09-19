"""Add activity log audit trail and security settings tables

Revision ID: 2e84d23d2884
Revises: fcf715d2f4f2
Create Date: 2025-09-19 09:43:58.943384

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2e84d23d2884'
down_revision: Union[str, None] = 'add_user_auth_fields'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create activity_logs table
    op.create_table('activity_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('action', sa.Enum('CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'IMPORT', 'SHARE', 'PERMISSION_CHANGE', name='activityaction'), nullable=False),
        sa.Column('entity_type', sa.String(length=100), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=True),
        sa.Column('entity_name', sa.String(length=255), nullable=True),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('level', sa.Enum('INFO', 'WARNING', 'ERROR', 'CRITICAL', name='activitylevel'), nullable=False),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('request_method', sa.String(length=10), nullable=True),
        sa.Column('request_path', sa.String(length=500), nullable=True),
        sa.Column('status_code', sa.Integer(), nullable=True),
        sa.Column('extra_data', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_activity_logs_action'), 'activity_logs', ['action'], unique=False)
    op.create_index(op.f('ix_activity_logs_created_at'), 'activity_logs', ['created_at'], unique=False)
    op.create_index(op.f('ix_activity_logs_entity_id'), 'activity_logs', ['entity_id'], unique=False)
    op.create_index(op.f('ix_activity_logs_entity_type'), 'activity_logs', ['entity_type'], unique=False)
    op.create_index(op.f('ix_activity_logs_user_id'), 'activity_logs', ['user_id'], unique=False)

    # Create audit_trails table
    op.create_table('audit_trails',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('entity_type', sa.String(length=100), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=False),
        sa.Column('entity_name', sa.String(length=255), nullable=True),
        sa.Column('operation', sa.String(length=50), nullable=False),
        sa.Column('old_values', sa.Text(), nullable=True),
        sa.Column('new_values', sa.Text(), nullable=True),
        sa.Column('changed_fields', sa.Text(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('session_id', sa.String(length=255), nullable=True),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('extra_data', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_audit_trails_created_at'), 'audit_trails', ['created_at'], unique=False)
    op.create_index(op.f('ix_audit_trails_entity_id'), 'audit_trails', ['entity_id'], unique=False)
    op.create_index(op.f('ix_audit_trails_entity_type'), 'audit_trails', ['entity_type'], unique=False)
    op.create_index(op.f('ix_audit_trails_operation'), 'audit_trails', ['operation'], unique=False)
    op.create_index(op.f('ix_audit_trails_user_id'), 'audit_trails', ['user_id'], unique=False)

    # Create security_settings table
    op.create_table('security_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('two_factor_enabled', sa.Boolean(), nullable=False),
        sa.Column('two_factor_secret', sa.String(length=255), nullable=True),
        sa.Column('backup_codes', sa.Text(), nullable=True),
        sa.Column('require_password_change', sa.Boolean(), nullable=False),
        sa.Column('password_expiry_days', sa.Integer(), nullable=True),
        sa.Column('max_login_attempts', sa.Integer(), nullable=False),
        sa.Column('lockout_duration_minutes', sa.Integer(), nullable=False),
        sa.Column('max_session_duration_hours', sa.Integer(), nullable=False),
        sa.Column('allow_concurrent_sessions', sa.Boolean(), nullable=False),
        sa.Column('max_concurrent_sessions', sa.Integer(), nullable=False),
        sa.Column('email_on_login', sa.Boolean(), nullable=False),
        sa.Column('email_on_password_change', sa.Boolean(), nullable=False),
        sa.Column('email_on_security_change', sa.Boolean(), nullable=False),
        sa.Column('email_on_suspicious_activity', sa.Boolean(), nullable=False),
        sa.Column('activity_logging_enabled', sa.Boolean(), nullable=False),
        sa.Column('data_retention_days', sa.Integer(), nullable=True),
        sa.Column('api_access_enabled', sa.Boolean(), nullable=False),
        sa.Column('api_rate_limit', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index(op.f('ix_security_settings_user_id'), 'security_settings', ['user_id'], unique=True)


def downgrade() -> None:
    # Drop security_settings table
    op.drop_index(op.f('ix_security_settings_user_id'), table_name='security_settings')
    op.drop_table('security_settings')
    
    # Drop audit_trails table
    op.drop_index(op.f('ix_audit_trails_user_id'), table_name='audit_trails')
    op.drop_index(op.f('ix_audit_trails_operation'), table_name='audit_trails')
    op.drop_index(op.f('ix_audit_trails_entity_type'), table_name='audit_trails')
    op.drop_index(op.f('ix_audit_trails_entity_id'), table_name='audit_trails')
    op.drop_index(op.f('ix_audit_trails_created_at'), table_name='audit_trails')
    op.drop_table('audit_trails')
    
    # Drop activity_logs table
    op.drop_index(op.f('ix_activity_logs_user_id'), table_name='activity_logs')
    op.drop_index(op.f('ix_activity_logs_entity_type'), table_name='activity_logs')
    op.drop_index(op.f('ix_activity_logs_entity_id'), table_name='activity_logs')
    op.drop_index(op.f('ix_activity_logs_created_at'), table_name='activity_logs')
    op.drop_index(op.f('ix_activity_logs_action'), table_name='activity_logs')
    op.drop_table('activity_logs')
