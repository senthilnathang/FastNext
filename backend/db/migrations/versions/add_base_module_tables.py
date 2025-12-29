"""Add base module tables

Revision ID: add_base_module_tables
Revises: add_inbox_system
Create Date: 2024-01-15

Creates:
- sequences: Auto-incrementing document number generation
- sequence_date_ranges: Date-based sub-sequences
- scheduled_actions: Cron jobs and scheduled tasks
- scheduled_action_logs: Execution history
- server_actions: Server-side automation actions
- automation_rules: Record-triggered automation
- record_rules: Row-level security rules
- computed_field_definitions: Dynamic computed fields
- config_parameters: Module configuration storage
- email_templates: Email template definitions
- email_queue: Async email sending queue
- email_logs: Email sending audit logs
- webhook_definitions: Outgoing webhook configuration
- webhook_logs: Webhook delivery logs
- webhook_secrets: Incoming webhook verification
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_base_module_tables'
down_revision = 'add_inbox_system'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enums
    op.execute("CREATE TYPE rulescope AS ENUM ('global', 'user', 'group', 'company')")

    # ==========================================================================
    # SEQUENCES
    # ==========================================================================
    op.create_table(
        'sequences',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('code', sa.String(100), nullable=False),
        sa.Column('module_name', sa.String(100), nullable=True),
        sa.Column('prefix', sa.String(100), server_default=''),
        sa.Column('suffix', sa.String(100), server_default=''),
        sa.Column('padding', sa.Integer(), server_default='5'),
        sa.Column('number_next', sa.Integer(), server_default='1'),
        sa.Column('number_increment', sa.Integer(), server_default='1'),
        sa.Column('company_id', sa.Integer(), nullable=True),
        sa.Column('reset_period', sa.String(20), nullable=True),
        sa.Column('last_reset_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('use_date_range', sa.Boolean(), server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code'),
    )
    op.create_index('idx_sequences_code', 'sequences', ['code'])
    op.create_index('idx_sequences_module', 'sequences', ['module_name'])
    op.create_index('idx_sequences_company', 'sequences', ['company_id'])

    op.create_table(
        'sequence_date_ranges',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('sequence_id', sa.Integer(), nullable=False),
        sa.Column('date_from', sa.DateTime(timezone=True), nullable=False),
        sa.Column('date_to', sa.DateTime(timezone=True), nullable=False),
        sa.Column('number_next', sa.Integer(), server_default='1'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['sequence_id'], ['sequences.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_seq_date_range_seq', 'sequence_date_ranges', ['sequence_id'])

    # ==========================================================================
    # SCHEDULED ACTIONS
    # ==========================================================================
    op.create_table(
        'scheduled_actions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('code', sa.String(100), nullable=False),
        sa.Column('module_name', sa.String(100), nullable=True),
        sa.Column('model_name', sa.String(100), nullable=True),
        sa.Column('method_name', sa.String(100), nullable=False),
        sa.Column('method_args', postgresql.JSONB(), server_default='[]'),
        sa.Column('method_kwargs', postgresql.JSONB(), server_default='{}'),
        sa.Column('python_code', sa.Text(), nullable=True),
        sa.Column('interval_number', sa.Integer(), server_default='1'),
        sa.Column('interval_type', sa.String(20), server_default='days'),
        sa.Column('cron_expression', sa.String(100), nullable=True),
        sa.Column('next_run', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_run', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_run_duration', sa.Integer(), nullable=True),
        sa.Column('last_run_status', sa.String(20), nullable=True),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('max_retries', sa.Integer(), server_default='3'),
        sa.Column('retry_count', sa.Integer(), server_default='0'),
        sa.Column('timeout_seconds', sa.Integer(), server_default='300'),
        sa.Column('priority', sa.Integer(), server_default='10'),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('run_missed', sa.Boolean(), server_default='true'),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code'),
    )
    op.create_index('idx_sched_action_code', 'scheduled_actions', ['code'])
    op.create_index('idx_sched_action_next_run', 'scheduled_actions', ['next_run'])
    op.create_index('idx_sched_action_active', 'scheduled_actions', ['is_active'])

    op.create_table(
        'scheduled_action_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('action_id', sa.Integer(), nullable=False),
        sa.Column('action_code', sa.String(100), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('finished_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('duration_seconds', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(20), nullable=False),
        sa.Column('result', postgresql.JSONB(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('error_traceback', sa.Text(), nullable=True),
        sa.Column('records_processed', sa.Integer(), server_default='0'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_sched_log_action', 'scheduled_action_logs', ['action_id'])
    op.create_index('idx_sched_log_code', 'scheduled_action_logs', ['action_code'])

    # ==========================================================================
    # SERVER ACTIONS AND AUTOMATION
    # ==========================================================================
    op.create_table(
        'server_actions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('code', sa.String(100), nullable=False),
        sa.Column('module_name', sa.String(100), nullable=True),
        sa.Column('model_name', sa.String(100), nullable=False),
        sa.Column('action_type', sa.String(30), server_default='python_code'),
        sa.Column('python_code', sa.Text(), nullable=True),
        sa.Column('method_name', sa.String(100), nullable=True),
        sa.Column('method_args', postgresql.JSONB(), server_default='[]'),
        sa.Column('update_values', postgresql.JSONB(), server_default='{}'),
        sa.Column('create_model', sa.String(100), nullable=True),
        sa.Column('create_values', postgresql.JSONB(), server_default='{}'),
        sa.Column('template_id', sa.Integer(), nullable=True),
        sa.Column('email_to', sa.String(500), nullable=True),
        sa.Column('notification_type', sa.String(50), nullable=True),
        sa.Column('webhook_url', sa.String(500), nullable=True),
        sa.Column('webhook_method', sa.String(10), server_default='POST'),
        sa.Column('webhook_payload', postgresql.JSONB(), server_default='{}'),
        sa.Column('child_action_ids', postgresql.JSONB(), server_default='[]'),
        sa.Column('use_sudo', sa.Boolean(), server_default='false'),
        sa.Column('sequence', sa.Integer(), server_default='10'),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code'),
    )
    op.create_index('idx_server_action_code', 'server_actions', ['code'])
    op.create_index('idx_server_action_model', 'server_actions', ['model_name'])
    op.create_index('idx_server_action_active', 'server_actions', ['is_active'])

    op.create_table(
        'automation_rules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('code', sa.String(100), nullable=False),
        sa.Column('module_name', sa.String(100), nullable=True),
        sa.Column('model_name', sa.String(100), nullable=False),
        sa.Column('trigger', sa.String(30), server_default='on_create'),
        sa.Column('domain', postgresql.JSONB(), server_default='[]'),
        sa.Column('before_domain', postgresql.JSONB(), nullable=True),
        sa.Column('time_field', sa.String(100), nullable=True),
        sa.Column('time_delta', sa.Integer(), server_default='0'),
        sa.Column('last_run', sa.DateTime(timezone=True), nullable=True),
        sa.Column('action_id', sa.Integer(), nullable=True),
        sa.Column('action_code', sa.String(100), nullable=True),
        sa.Column('python_code', sa.Text(), nullable=True),
        sa.Column('max_records_per_run', sa.Integer(), server_default='1000'),
        sa.Column('sequence', sa.Integer(), server_default='10'),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code'),
    )
    op.create_index('idx_automation_code', 'automation_rules', ['code'])
    op.create_index('idx_automation_model', 'automation_rules', ['model_name'])
    op.create_index('idx_automation_active', 'automation_rules', ['is_active'])

    # ==========================================================================
    # RECORD RULES (Row-Level Security)
    # ==========================================================================
    op.create_table(
        'record_rules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('model_name', sa.String(100), nullable=False),
        sa.Column('module_name', sa.String(100), nullable=True),
        sa.Column('domain', postgresql.JSONB(), server_default='[]'),
        sa.Column('scope', postgresql.ENUM('global', 'user', 'group', 'company', name='rulescope', create_type=False), server_default='user'),
        sa.Column('apply_read', sa.Boolean(), server_default='true'),
        sa.Column('apply_write', sa.Boolean(), server_default='true'),
        sa.Column('apply_create', sa.Boolean(), server_default='true'),
        sa.Column('apply_delete', sa.Boolean(), server_default='true'),
        sa.Column('role_id', sa.Integer(), nullable=True),
        sa.Column('sequence', sa.Integer(), server_default='10'),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('is_superuser_bypass', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_record_rule_model', 'record_rules', ['model_name'])
    op.create_index('idx_record_rule_active', 'record_rules', ['is_active'])

    # ==========================================================================
    # COMPUTED FIELD DEFINITIONS
    # ==========================================================================
    op.create_table(
        'computed_field_definitions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('model_name', sa.String(100), nullable=False),
        sa.Column('module_name', sa.String(100), nullable=True),
        sa.Column('compute_type', sa.String(30), server_default='python'),
        sa.Column('expression', sa.Text(), nullable=True),
        sa.Column('depends', postgresql.JSONB(), server_default='[]'),
        sa.Column('aggregate_function', sa.String(20), nullable=True),
        sa.Column('aggregate_field', sa.String(100), nullable=True),
        sa.Column('aggregate_model', sa.String(100), nullable=True),
        sa.Column('aggregate_domain', postgresql.JSONB(), server_default='[]'),
        sa.Column('related_field', sa.String(200), nullable=True),
        sa.Column('store', sa.Boolean(), server_default='false'),
        sa.Column('readonly', sa.Boolean(), server_default='true'),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_computed_name', 'computed_field_definitions', ['name'])
    op.create_index('idx_computed_model', 'computed_field_definitions', ['model_name'])

    # ==========================================================================
    # CONFIG PARAMETERS
    # ==========================================================================
    op.create_table(
        'config_parameters',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('key', sa.String(200), nullable=False),
        sa.Column('module_name', sa.String(100), nullable=True),
        sa.Column('value', sa.Text(), nullable=True),
        sa.Column('value_type', sa.String(20), server_default='string'),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_system', sa.Boolean(), server_default='false'),
        sa.Column('company_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('key'),
    )
    op.create_index('ix_config_parameters_key', 'config_parameters', ['key'])
    op.create_index('ix_config_parameters_key_module', 'config_parameters', ['key', 'module_name'])
    op.create_index('ix_config_parameters_module_company', 'config_parameters', ['module_name', 'company_id'])

    # ==========================================================================
    # EMAIL TEMPLATES AND QUEUE
    # ==========================================================================
    op.create_table(
        'email_templates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('code', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('module_name', sa.String(100), nullable=True),
        sa.Column('model_name', sa.String(100), nullable=True),
        sa.Column('subject', sa.String(500), nullable=False),
        sa.Column('body_html', sa.Text(), nullable=True),
        sa.Column('body_text', sa.Text(), nullable=True),
        sa.Column('email_from', sa.String(200), nullable=True),
        sa.Column('reply_to', sa.String(200), nullable=True),
        sa.Column('email_to', sa.String(500), nullable=True),
        sa.Column('email_cc', sa.String(500), nullable=True),
        sa.Column('email_bcc', sa.String(500), nullable=True),
        sa.Column('attachment_ids', postgresql.JSONB(), server_default='[]'),
        sa.Column('report_template_id', sa.Integer(), nullable=True),
        sa.Column('preview_context', postgresql.JSONB(), server_default='{}'),
        sa.Column('lang', sa.String(10), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code'),
    )
    op.create_index('ix_email_templates_code', 'email_templates', ['code'])
    op.create_index('ix_email_templates_model', 'email_templates', ['model_name'])
    op.create_index('ix_email_templates_module', 'email_templates', ['module_name'])

    op.create_table(
        'email_queue',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('template_id', sa.Integer(), nullable=True),
        sa.Column('email_from', sa.String(200), nullable=False),
        sa.Column('email_to', sa.String(500), nullable=False),
        sa.Column('email_cc', sa.String(500), nullable=True),
        sa.Column('email_bcc', sa.String(500), nullable=True),
        sa.Column('reply_to', sa.String(200), nullable=True),
        sa.Column('subject', sa.String(500), nullable=False),
        sa.Column('body_html', sa.Text(), nullable=True),
        sa.Column('body_text', sa.Text(), nullable=True),
        sa.Column('attachments', postgresql.JSONB(), server_default='[]'),
        sa.Column('status', sa.String(20), server_default='pending'),
        sa.Column('retry_count', sa.Integer(), server_default='0'),
        sa.Column('max_retries', sa.Integer(), server_default='3'),
        sa.Column('next_retry', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('model_name', sa.String(100), nullable=True),
        sa.Column('res_id', sa.Integer(), nullable=True),
        sa.Column('priority', sa.Integer(), server_default='10'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['template_id'], ['email_templates.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_email_queue_status', 'email_queue', ['status'])
    op.create_index('ix_email_queue_next_retry', 'email_queue', ['next_retry'])
    op.create_index('ix_email_queue_record', 'email_queue', ['model_name', 'res_id'])

    op.create_table(
        'email_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('queue_id', sa.Integer(), nullable=True),
        sa.Column('template_id', sa.Integer(), nullable=True),
        sa.Column('email_from', sa.String(200), nullable=False),
        sa.Column('email_to', sa.String(500), nullable=False),
        sa.Column('subject', sa.String(500), nullable=False),
        sa.Column('status', sa.String(20), server_default='sent'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('model_name', sa.String(100), nullable=True),
        sa.Column('res_id', sa.Integer(), nullable=True),
        sa.Column('message_id', sa.String(200), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_email_logs_record', 'email_logs', ['model_name', 'res_id'])
    op.create_index('ix_email_logs_status', 'email_logs', ['status'])

    # ==========================================================================
    # WEBHOOKS
    # ==========================================================================
    op.create_table(
        'webhook_definitions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('code', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('module_name', sa.String(100), nullable=True),
        sa.Column('url', sa.String(1000), nullable=False),
        sa.Column('method', sa.String(10), server_default='POST'),
        sa.Column('headers', postgresql.JSONB(), server_default='{}'),
        sa.Column('content_type', sa.String(100), server_default='application/json'),
        sa.Column('auth_type', sa.String(20), server_default='none'),
        sa.Column('auth_username', sa.String(200), nullable=True),
        sa.Column('auth_password', sa.String(500), nullable=True),
        sa.Column('auth_token', sa.String(500), nullable=True),
        sa.Column('auth_header_name', sa.String(100), nullable=True),
        sa.Column('secret_key', sa.String(200), nullable=True),
        sa.Column('signature_header', sa.String(100), server_default='X-Webhook-Signature'),
        sa.Column('events', postgresql.JSONB(), server_default='[]'),
        sa.Column('model_name', sa.String(100), nullable=True),
        sa.Column('filter_domain', postgresql.JSONB(), server_default='[]'),
        sa.Column('payload_template', sa.Text(), nullable=True),
        sa.Column('include_record', sa.Boolean(), server_default='true'),
        sa.Column('include_changes', sa.Boolean(), server_default='true'),
        sa.Column('max_retries', sa.Integer(), server_default='3'),
        sa.Column('retry_delay', sa.Integer(), server_default='60'),
        sa.Column('retry_backoff', sa.Integer(), server_default='2'),
        sa.Column('timeout', sa.Integer(), server_default='30'),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('company_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code'),
    )
    op.create_index('ix_webhook_definitions_code', 'webhook_definitions', ['code'])
    op.create_index('ix_webhook_definitions_model', 'webhook_definitions', ['model_name'])
    op.create_index('ix_webhook_definitions_module', 'webhook_definitions', ['module_name'])

    op.create_table(
        'webhook_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('webhook_id', sa.Integer(), nullable=False),
        sa.Column('event_type', sa.String(50), nullable=False),
        sa.Column('model_name', sa.String(100), nullable=True),
        sa.Column('res_id', sa.Integer(), nullable=True),
        sa.Column('request_url', sa.String(1000), nullable=False),
        sa.Column('request_method', sa.String(10), nullable=False),
        sa.Column('request_headers', postgresql.JSONB(), nullable=True),
        sa.Column('request_payload', postgresql.JSONB(), nullable=True),
        sa.Column('response_status', sa.Integer(), nullable=True),
        sa.Column('response_headers', postgresql.JSONB(), nullable=True),
        sa.Column('response_body', sa.Text(), nullable=True),
        sa.Column('duration_ms', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(20), server_default='pending'),
        sa.Column('retry_count', sa.Integer(), server_default='0'),
        sa.Column('next_retry', sa.DateTime(timezone=True), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['webhook_id'], ['webhook_definitions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_webhook_logs_webhook', 'webhook_logs', ['webhook_id'])
    op.create_index('ix_webhook_logs_record', 'webhook_logs', ['model_name', 'res_id'])
    op.create_index('ix_webhook_logs_status', 'webhook_logs', ['status'])
    op.create_index('ix_webhook_logs_created', 'webhook_logs', ['created_at'])

    op.create_table(
        'webhook_secrets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('code', sa.String(100), nullable=False),
        sa.Column('secret_key', sa.String(500), nullable=False),
        sa.Column('algorithm', sa.String(20), server_default='sha256'),
        sa.Column('header_name', sa.String(100), server_default='X-Webhook-Signature'),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code'),
    )
    op.create_index('ix_webhook_secrets_code', 'webhook_secrets', ['code'])


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('webhook_secrets')
    op.drop_table('webhook_logs')
    op.drop_table('webhook_definitions')
    op.drop_table('email_logs')
    op.drop_table('email_queue')
    op.drop_table('email_templates')
    op.drop_table('config_parameters')
    op.drop_table('computed_field_definitions')
    op.drop_table('record_rules')
    op.drop_table('automation_rules')
    op.drop_table('server_actions')
    op.drop_table('scheduled_action_logs')
    op.drop_table('scheduled_actions')
    op.drop_table('sequence_date_ranges')
    op.drop_table('sequences')

    # Drop enum
    op.execute("DROP TYPE IF EXISTS rulescope")
