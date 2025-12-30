"""add_phase3_phase4_features

Revision ID: i5j6k7l8m9n0
Revises: h4i5j6k7l8m9
Create Date: 2024-12-26

Adds Phase 3 and Phase 4 module features:
- email_templates: Email template definitions
- email_queue: Email sending queue
- email_logs: Email delivery logs
- webhook_definitions: Webhook configurations
- webhook_logs: Webhook delivery logs
- webhook_secrets: Incoming webhook verification
- report_definitions: Report template definitions
- report_executions: Report execution logs
- report_schedules: Scheduled report configurations
- module_exports: Module export history
- module_imports: Module import history
- data_export_templates: Data export configurations
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'i5j6k7l8m9n0'
down_revision: Union[str, None] = 'h4i5j6k7l8m9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create Phase 3 and Phase 4 tables."""

    # -------------------------------------------------------------------------
    # Phase 3: Email Templates
    # -------------------------------------------------------------------------

    op.create_table(
        'email_templates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False,
                  comment='Human-readable template name'),
        sa.Column('code', sa.String(length=100), nullable=False,
                  comment='Unique template code'),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('module_name', sa.String(length=100), nullable=True),
        sa.Column('model_name', sa.String(length=100), nullable=True),
        sa.Column('subject', sa.String(length=500), nullable=False,
                  comment='Email subject (Jinja2 template)'),
        sa.Column('body_html', sa.Text(), nullable=True),
        sa.Column('body_text', sa.Text(), nullable=True),
        sa.Column('email_from', sa.String(length=200), nullable=True),
        sa.Column('reply_to', sa.String(length=200), nullable=True),
        sa.Column('email_to', sa.String(length=500), nullable=True),
        sa.Column('email_cc', sa.String(length=500), nullable=True),
        sa.Column('email_bcc', sa.String(length=500), nullable=True),
        sa.Column('attachment_ids', postgresql.JSONB(astext_type=sa.Text()), server_default='[]'),
        sa.Column('report_template_id', sa.Integer(), nullable=True),
        sa.Column('preview_context', postgresql.JSONB(astext_type=sa.Text()), server_default='{}'),
        sa.Column('lang', sa.String(length=10), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code', name='uq_email_templates_code')
    )
    op.create_index(op.f('ix_email_templates_id'), 'email_templates', ['id'], unique=False)
    op.create_index(op.f('ix_email_templates_code'), 'email_templates', ['code'], unique=True)
    op.create_index('ix_email_templates_model', 'email_templates', ['model_name'], unique=False)
    op.create_index('ix_email_templates_module', 'email_templates', ['module_name'], unique=False)

    op.create_table(
        'email_queue',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('template_id', sa.Integer(), nullable=True),
        sa.Column('email_from', sa.String(length=200), nullable=False),
        sa.Column('email_to', sa.String(length=500), nullable=False),
        sa.Column('email_cc', sa.String(length=500), nullable=True),
        sa.Column('email_bcc', sa.String(length=500), nullable=True),
        sa.Column('reply_to', sa.String(length=200), nullable=True),
        sa.Column('subject', sa.String(length=500), nullable=False),
        sa.Column('body_html', sa.Text(), nullable=True),
        sa.Column('body_text', sa.Text(), nullable=True),
        sa.Column('attachments', postgresql.JSONB(astext_type=sa.Text()), server_default='[]'),
        sa.Column('status', sa.String(length=20), server_default='pending'),
        sa.Column('retry_count', sa.Integer(), server_default='0'),
        sa.Column('max_retries', sa.Integer(), server_default='3'),
        sa.Column('next_retry', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('model_name', sa.String(length=100), nullable=True),
        sa.Column('res_id', sa.Integer(), nullable=True),
        sa.Column('priority', sa.Integer(), server_default='10'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['template_id'], ['email_templates.id'], ondelete='SET NULL')
    )
    op.create_index(op.f('ix_email_queue_id'), 'email_queue', ['id'], unique=False)
    op.create_index('ix_email_queue_status', 'email_queue', ['status'], unique=False)
    op.create_index('ix_email_queue_next_retry', 'email_queue', ['next_retry'], unique=False)
    op.create_index('ix_email_queue_record', 'email_queue', ['model_name', 'res_id'], unique=False)

    op.create_table(
        'email_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('queue_id', sa.Integer(), nullable=True),
        sa.Column('template_id', sa.Integer(), nullable=True),
        sa.Column('email_from', sa.String(length=200), nullable=False),
        sa.Column('email_to', sa.String(length=500), nullable=False),
        sa.Column('subject', sa.String(length=500), nullable=False),
        sa.Column('status', sa.String(length=20), server_default='sent'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('model_name', sa.String(length=100), nullable=True),
        sa.Column('res_id', sa.Integer(), nullable=True),
        sa.Column('message_id', sa.String(length=200), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_email_logs_id'), 'email_logs', ['id'], unique=False)
    op.create_index('ix_email_logs_record', 'email_logs', ['model_name', 'res_id'], unique=False)
    op.create_index('ix_email_logs_status', 'email_logs', ['status'], unique=False)

    # -------------------------------------------------------------------------
    # Phase 3: Webhooks
    # -------------------------------------------------------------------------

    op.create_table(
        'webhook_definitions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('code', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('module_name', sa.String(length=100), nullable=True),
        sa.Column('url', sa.String(length=1000), nullable=False),
        sa.Column('method', sa.String(length=10), server_default='POST'),
        sa.Column('headers', postgresql.JSONB(astext_type=sa.Text()), server_default='{}'),
        sa.Column('content_type', sa.String(length=100), server_default='application/json'),
        sa.Column('auth_type', sa.String(length=20), server_default='none'),
        sa.Column('auth_username', sa.String(length=200), nullable=True),
        sa.Column('auth_password', sa.String(length=500), nullable=True),
        sa.Column('auth_token', sa.String(length=500), nullable=True),
        sa.Column('auth_header_name', sa.String(length=100), nullable=True),
        sa.Column('secret_key', sa.String(length=200), nullable=True),
        sa.Column('signature_header', sa.String(length=100), server_default='X-Webhook-Signature'),
        sa.Column('events', postgresql.JSONB(astext_type=sa.Text()), server_default='[]'),
        sa.Column('model_name', sa.String(length=100), nullable=True),
        sa.Column('filter_domain', postgresql.JSONB(astext_type=sa.Text()), server_default='[]'),
        sa.Column('payload_template', sa.Text(), nullable=True),
        sa.Column('include_record', sa.Boolean(), server_default='true'),
        sa.Column('include_changes', sa.Boolean(), server_default='true'),
        sa.Column('max_retries', sa.Integer(), server_default='3'),
        sa.Column('retry_delay', sa.Integer(), server_default='60'),
        sa.Column('retry_backoff', sa.Integer(), server_default='2'),
        sa.Column('timeout', sa.Integer(), server_default='30'),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('company_id', sa.Integer(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code', name='uq_webhook_definitions_code')
    )
    op.create_index(op.f('ix_webhook_definitions_id'), 'webhook_definitions', ['id'], unique=False)
    op.create_index(op.f('ix_webhook_definitions_code'), 'webhook_definitions', ['code'], unique=True)
    op.create_index('ix_webhook_definitions_model', 'webhook_definitions', ['model_name'], unique=False)
    op.create_index('ix_webhook_definitions_module', 'webhook_definitions', ['module_name'], unique=False)

    op.create_table(
        'webhook_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('webhook_id', sa.Integer(), nullable=False),
        sa.Column('event_type', sa.String(length=50), nullable=False),
        sa.Column('model_name', sa.String(length=100), nullable=True),
        sa.Column('res_id', sa.Integer(), nullable=True),
        sa.Column('request_url', sa.String(length=1000), nullable=False),
        sa.Column('request_method', sa.String(length=10), nullable=False),
        sa.Column('request_headers', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('request_payload', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('response_status', sa.Integer(), nullable=True),
        sa.Column('response_headers', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('response_body', sa.Text(), nullable=True),
        sa.Column('duration_ms', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=20), server_default='pending'),
        sa.Column('retry_count', sa.Integer(), server_default='0'),
        sa.Column('next_retry', sa.DateTime(timezone=True), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['webhook_id'], ['webhook_definitions.id'], ondelete='CASCADE')
    )
    op.create_index(op.f('ix_webhook_logs_id'), 'webhook_logs', ['id'], unique=False)
    op.create_index('ix_webhook_logs_webhook', 'webhook_logs', ['webhook_id'], unique=False)
    op.create_index('ix_webhook_logs_record', 'webhook_logs', ['model_name', 'res_id'], unique=False)
    op.create_index('ix_webhook_logs_status', 'webhook_logs', ['status'], unique=False)
    op.create_index('ix_webhook_logs_created', 'webhook_logs', ['created_at'], unique=False)

    op.create_table(
        'webhook_secrets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('code', sa.String(length=100), nullable=False),
        sa.Column('secret_key', sa.String(length=500), nullable=False),
        sa.Column('algorithm', sa.String(length=20), server_default='sha256'),
        sa.Column('header_name', sa.String(length=100), server_default='X-Webhook-Signature'),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code', name='uq_webhook_secrets_code')
    )
    op.create_index(op.f('ix_webhook_secrets_id'), 'webhook_secrets', ['id'], unique=False)
    op.create_index(op.f('ix_webhook_secrets_code'), 'webhook_secrets', ['code'], unique=True)

    # -------------------------------------------------------------------------
    # Phase 4: Reports
    # -------------------------------------------------------------------------

    op.create_table(
        'report_definitions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('code', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('module_name', sa.String(length=100), nullable=True),
        sa.Column('model_name', sa.String(length=100), nullable=False),
        sa.Column('output_format', sa.String(length=10), server_default='pdf'),
        sa.Column('template_type', sa.String(length=20), server_default='jinja2'),
        sa.Column('template_content', sa.Text(), nullable=True),
        sa.Column('template_file', sa.String(length=500), nullable=True),
        sa.Column('paper_format', sa.String(length=20), server_default='A4'),
        sa.Column('orientation', sa.String(length=20), server_default='portrait'),
        sa.Column('margin_top', sa.Integer(), server_default='10'),
        sa.Column('margin_bottom', sa.Integer(), server_default='10'),
        sa.Column('margin_left', sa.Integer(), server_default='10'),
        sa.Column('margin_right', sa.Integer(), server_default='10'),
        sa.Column('header_html', sa.Text(), nullable=True),
        sa.Column('footer_html', sa.Text(), nullable=True),
        sa.Column('excel_sheet_name', sa.String(length=100), nullable=True),
        sa.Column('excel_template_file', sa.String(length=500), nullable=True),
        sa.Column('data_query', sa.Text(), nullable=True),
        sa.Column('default_filters', postgresql.JSONB(astext_type=sa.Text()), server_default='{}'),
        sa.Column('allow_filters', sa.Boolean(), server_default='true'),
        sa.Column('required_groups', postgresql.JSONB(astext_type=sa.Text()), server_default='[]'),
        sa.Column('supports_multi', sa.Boolean(), server_default='false'),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('preview_record_id', sa.Integer(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code', name='uq_report_definitions_code')
    )
    op.create_index(op.f('ix_report_definitions_id'), 'report_definitions', ['id'], unique=False)
    op.create_index(op.f('ix_report_definitions_code'), 'report_definitions', ['code'], unique=True)
    op.create_index('ix_report_definitions_model', 'report_definitions', ['model_name'], unique=False)
    op.create_index('ix_report_definitions_module', 'report_definitions', ['module_name'], unique=False)

    op.create_table(
        'report_executions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('report_id', sa.Integer(), nullable=True),
        sa.Column('report_code', sa.String(length=100), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('model_name', sa.String(length=100), nullable=True),
        sa.Column('record_ids', postgresql.JSONB(astext_type=sa.Text()), server_default='[]'),
        sa.Column('parameters', postgresql.JSONB(astext_type=sa.Text()), server_default='{}'),
        sa.Column('output_format', sa.String(length=10), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=True),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('duration_ms', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=20), server_default='pending'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['report_id'], ['report_definitions.id'], ondelete='SET NULL')
    )
    op.create_index(op.f('ix_report_executions_id'), 'report_executions', ['id'], unique=False)
    op.create_index('ix_report_executions_report', 'report_executions', ['report_id'], unique=False)
    op.create_index('ix_report_executions_user', 'report_executions', ['user_id'], unique=False)
    op.create_index('ix_report_executions_created', 'report_executions', ['created_at'], unique=False)

    op.create_table(
        'report_schedules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('report_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('cron_expression', sa.String(length=100), nullable=False),
        sa.Column('parameters', postgresql.JSONB(astext_type=sa.Text()), server_default='{}'),
        sa.Column('output_format', sa.String(length=10), nullable=True),
        sa.Column('email_to', sa.String(length=500), nullable=True),
        sa.Column('email_subject', sa.String(length=200), nullable=True),
        sa.Column('save_to_path', sa.String(length=500), nullable=True),
        sa.Column('last_run', sa.DateTime(timezone=True), nullable=True),
        sa.Column('next_run', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_status', sa.String(length=20), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['report_id'], ['report_definitions.id'], ondelete='CASCADE')
    )
    op.create_index(op.f('ix_report_schedules_id'), 'report_schedules', ['id'], unique=False)
    op.create_index('ix_report_schedules_report', 'report_schedules', ['report_id'], unique=False)

    # -------------------------------------------------------------------------
    # Phase 4: Module Export/Import
    # -------------------------------------------------------------------------

    op.create_table(
        'module_exports',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('module_name', sa.String(length=100), nullable=False),
        sa.Column('module_version', sa.String(length=50), nullable=True),
        sa.Column('export_type', sa.String(length=20), nullable=False),
        sa.Column('includes_data', sa.Boolean(), server_default='false'),
        sa.Column('includes_code', sa.Boolean(), server_default='true'),
        sa.Column('includes_static', sa.Boolean(), server_default='true'),
        sa.Column('exported_models', postgresql.JSONB(astext_type=sa.Text()), server_default='[]'),
        sa.Column('record_counts', postgresql.JSONB(astext_type=sa.Text()), server_default='{}'),
        sa.Column('file_path', sa.String(length=500), nullable=True),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('file_hash', sa.String(length=64), nullable=True),
        sa.Column('fastvue_version', sa.String(length=50), nullable=True),
        sa.Column('exported_by', sa.Integer(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_module_exports_id'), 'module_exports', ['id'], unique=False)
    op.create_index('ix_module_exports_module', 'module_exports', ['module_name'], unique=False)
    op.create_index('ix_module_exports_created', 'module_exports', ['created_at'], unique=False)

    op.create_table(
        'module_imports',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('source_file', sa.String(length=500), nullable=False),
        sa.Column('source_hash', sa.String(length=64), nullable=True),
        sa.Column('source_size', sa.Integer(), nullable=True),
        sa.Column('module_name', sa.String(length=100), nullable=True),
        sa.Column('module_version', sa.String(length=50), nullable=True),
        sa.Column('import_type', sa.String(length=20), nullable=False),
        sa.Column('conflict_resolution', sa.String(length=20), server_default='skip'),
        sa.Column('install_after_import', sa.Boolean(), server_default='false'),
        sa.Column('status', sa.String(length=20), server_default='pending'),
        sa.Column('validation_errors', postgresql.JSONB(astext_type=sa.Text()), server_default='[]'),
        sa.Column('validation_warnings', postgresql.JSONB(astext_type=sa.Text()), server_default='[]'),
        sa.Column('dependency_check', postgresql.JSONB(astext_type=sa.Text()), server_default='{}'),
        sa.Column('version_check', postgresql.JSONB(astext_type=sa.Text()), server_default='{}'),
        sa.Column('imported_records', postgresql.JSONB(astext_type=sa.Text()), server_default='{}'),
        sa.Column('skipped_records', postgresql.JSONB(astext_type=sa.Text()), server_default='{}'),
        sa.Column('updated_records', postgresql.JSONB(astext_type=sa.Text()), server_default='{}'),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('duration_ms', sa.Integer(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('error_traceback', sa.Text(), nullable=True),
        sa.Column('rollback_data', postgresql.JSONB(astext_type=sa.Text()), server_default='{}'),
        sa.Column('imported_by', sa.Integer(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_module_imports_id'), 'module_imports', ['id'], unique=False)
    op.create_index('ix_module_imports_module', 'module_imports', ['module_name'], unique=False)
    op.create_index('ix_module_imports_status', 'module_imports', ['status'], unique=False)
    op.create_index('ix_module_imports_created', 'module_imports', ['created_at'], unique=False)

    op.create_table(
        'data_export_templates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('code', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('module_name', sa.String(length=100), nullable=True),
        sa.Column('models', postgresql.JSONB(astext_type=sa.Text()), server_default='[]'),
        sa.Column('include_dependencies', sa.Boolean(), server_default='true'),
        sa.Column('filters', postgresql.JSONB(astext_type=sa.Text()), server_default='{}'),
        sa.Column('field_mapping', postgresql.JSONB(astext_type=sa.Text()), server_default='{}'),
        sa.Column('exclude_fields', postgresql.JSONB(astext_type=sa.Text()), server_default='{}'),
        sa.Column('output_format', sa.String(length=20), server_default='json'),
        sa.Column('single_file', sa.Boolean(), server_default='true'),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code', name='uq_data_export_templates_code')
    )
    op.create_index(op.f('ix_data_export_templates_id'), 'data_export_templates', ['id'], unique=False)
    op.create_index(op.f('ix_data_export_templates_code'), 'data_export_templates', ['code'], unique=True)


def downgrade() -> None:
    """Drop Phase 3 and Phase 4 tables."""

    # Drop Phase 4 tables
    op.drop_index(op.f('ix_data_export_templates_code'), table_name='data_export_templates')
    op.drop_index(op.f('ix_data_export_templates_id'), table_name='data_export_templates')
    op.drop_table('data_export_templates')

    op.drop_index('ix_module_imports_created', table_name='module_imports')
    op.drop_index('ix_module_imports_status', table_name='module_imports')
    op.drop_index('ix_module_imports_module', table_name='module_imports')
    op.drop_index(op.f('ix_module_imports_id'), table_name='module_imports')
    op.drop_table('module_imports')

    op.drop_index('ix_module_exports_created', table_name='module_exports')
    op.drop_index('ix_module_exports_module', table_name='module_exports')
    op.drop_index(op.f('ix_module_exports_id'), table_name='module_exports')
    op.drop_table('module_exports')

    op.drop_index('ix_report_schedules_report', table_name='report_schedules')
    op.drop_index(op.f('ix_report_schedules_id'), table_name='report_schedules')
    op.drop_table('report_schedules')

    op.drop_index('ix_report_executions_created', table_name='report_executions')
    op.drop_index('ix_report_executions_user', table_name='report_executions')
    op.drop_index('ix_report_executions_report', table_name='report_executions')
    op.drop_index(op.f('ix_report_executions_id'), table_name='report_executions')
    op.drop_table('report_executions')

    op.drop_index('ix_report_definitions_module', table_name='report_definitions')
    op.drop_index('ix_report_definitions_model', table_name='report_definitions')
    op.drop_index(op.f('ix_report_definitions_code'), table_name='report_definitions')
    op.drop_index(op.f('ix_report_definitions_id'), table_name='report_definitions')
    op.drop_table('report_definitions')

    # Drop Phase 3 tables
    op.drop_index(op.f('ix_webhook_secrets_code'), table_name='webhook_secrets')
    op.drop_index(op.f('ix_webhook_secrets_id'), table_name='webhook_secrets')
    op.drop_table('webhook_secrets')

    op.drop_index('ix_webhook_logs_created', table_name='webhook_logs')
    op.drop_index('ix_webhook_logs_status', table_name='webhook_logs')
    op.drop_index('ix_webhook_logs_record', table_name='webhook_logs')
    op.drop_index('ix_webhook_logs_webhook', table_name='webhook_logs')
    op.drop_index(op.f('ix_webhook_logs_id'), table_name='webhook_logs')
    op.drop_table('webhook_logs')

    op.drop_index('ix_webhook_definitions_module', table_name='webhook_definitions')
    op.drop_index('ix_webhook_definitions_model', table_name='webhook_definitions')
    op.drop_index(op.f('ix_webhook_definitions_code'), table_name='webhook_definitions')
    op.drop_index(op.f('ix_webhook_definitions_id'), table_name='webhook_definitions')
    op.drop_table('webhook_definitions')

    op.drop_index('ix_email_logs_status', table_name='email_logs')
    op.drop_index('ix_email_logs_record', table_name='email_logs')
    op.drop_index(op.f('ix_email_logs_id'), table_name='email_logs')
    op.drop_table('email_logs')

    op.drop_index('ix_email_queue_record', table_name='email_queue')
    op.drop_index('ix_email_queue_next_retry', table_name='email_queue')
    op.drop_index('ix_email_queue_status', table_name='email_queue')
    op.drop_index(op.f('ix_email_queue_id'), table_name='email_queue')
    op.drop_table('email_queue')

    op.drop_index('ix_email_templates_module', table_name='email_templates')
    op.drop_index('ix_email_templates_model', table_name='email_templates')
    op.drop_index(op.f('ix_email_templates_code'), table_name='email_templates')
    op.drop_index(op.f('ix_email_templates_id'), table_name='email_templates')
    op.drop_table('email_templates')
