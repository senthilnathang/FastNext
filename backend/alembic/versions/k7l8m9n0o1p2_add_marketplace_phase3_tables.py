"""Add marketplace phase 3 tables (security and payouts)

Revision ID: k7l8m9n0o1p2
Revises: j6k7l8m9n0o1
Create Date: 2024-01-20 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'k7l8m9n0o1p2'
down_revision = 'j6k7l8m9n0o1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ==========================================================================
    # Security Tables
    # ==========================================================================

    # Signing Keys
    op.create_table(
        'marketplace_signing_keys',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('publisher_id', sa.Integer(), nullable=False),
        sa.Column('key_id', sa.String(64), nullable=False),
        sa.Column('name', sa.String(200), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('algorithm', sa.String(20), default='ed25519'),
        sa.Column('key_size', sa.Integer(), nullable=True),
        sa.Column('public_key', sa.Text(), nullable=False),
        sa.Column('private_key_fingerprint', sa.String(64), nullable=True),
        sa.Column('status', sa.String(20), default='active'),
        sa.Column('is_primary', sa.Boolean(), default=False),
        sa.Column('issued_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('revocation_reason', sa.Text(), nullable=True),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('signature_count', sa.Integer(), default=0),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['publisher_id'], ['marketplace_publishers.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('key_id'),
    )
    op.create_index('ix_marketplace_signing_keys_id', 'marketplace_signing_keys', ['id'])
    op.create_index('ix_marketplace_signing_keys_key_id', 'marketplace_signing_keys', ['key_id'])
    op.create_index('ix_marketplace_signing_keys_publisher_status', 'marketplace_signing_keys', ['publisher_id', 'status'])
    op.create_index('ix_marketplace_signing_keys_primary', 'marketplace_signing_keys', ['publisher_id', 'is_primary'])

    # Module Signatures
    op.create_table(
        'marketplace_module_signatures',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('version_id', sa.Integer(), nullable=False),
        sa.Column('signing_key_id', sa.Integer(), nullable=True),
        sa.Column('signature', sa.Text(), nullable=False),
        sa.Column('signature_algorithm', sa.String(50), nullable=False),
        sa.Column('signed_content_hash', sa.String(64), nullable=False),
        sa.Column('signed_manifest_hash', sa.String(64), nullable=True),
        sa.Column('verified', sa.Boolean(), default=False),
        sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('verification_error', sa.Text(), nullable=True),
        sa.Column('signed_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('signed_by', sa.Integer(), nullable=True),
        sa.Column('tsa_timestamp', sa.Text(), nullable=True),
        sa.Column('tsa_response', postgresql.JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['version_id'], ['marketplace_module_versions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['signing_key_id'], ['marketplace_signing_keys.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['signed_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_marketplace_module_signatures_id', 'marketplace_module_signatures', ['id'])
    op.create_index('ix_marketplace_module_signatures_version', 'marketplace_module_signatures', ['version_id'])
    op.create_index('ix_marketplace_module_signatures_verified', 'marketplace_module_signatures', ['verified'])

    # Security Scans
    op.create_table(
        'marketplace_security_scans',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('version_id', sa.Integer(), nullable=False),
        sa.Column('scan_id', sa.String(64), nullable=False),
        sa.Column('scan_type', sa.String(50), nullable=False),
        sa.Column('status', sa.String(20), default='pending'),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('result', sa.String(20), nullable=True),
        sa.Column('risk_score', sa.Integer(), nullable=True),
        sa.Column('critical_count', sa.Integer(), default=0),
        sa.Column('high_count', sa.Integer(), default=0),
        sa.Column('medium_count', sa.Integer(), default=0),
        sa.Column('low_count', sa.Integer(), default=0),
        sa.Column('info_count', sa.Integer(), default=0),
        sa.Column('findings', postgresql.JSONB(), default=[]),
        sa.Column('dependency_vulnerabilities', postgresql.JSONB(), default=[]),
        sa.Column('outdated_dependencies', postgresql.JSONB(), default=[]),
        sa.Column('code_issues', postgresql.JSONB(), default=[]),
        sa.Column('policy_violations', postgresql.JSONB(), default=[]),
        sa.Column('scanner_version', sa.String(50), nullable=True),
        sa.Column('scan_duration_ms', sa.Integer(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('error_details', postgresql.JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['version_id'], ['marketplace_module_versions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('scan_id'),
    )
    op.create_index('ix_marketplace_security_scans_id', 'marketplace_security_scans', ['id'])
    op.create_index('ix_marketplace_security_scans_scan_id', 'marketplace_security_scans', ['scan_id'])
    op.create_index('ix_marketplace_security_scans_version_status', 'marketplace_security_scans', ['version_id', 'status'])
    op.create_index('ix_marketplace_security_scans_result', 'marketplace_security_scans', ['result'])

    # Security Policies
    op.create_table(
        'marketplace_security_policies',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(100), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('policy_type', sa.String(50), nullable=False),
        sa.Column('rule', postgresql.JSONB(), nullable=False),
        sa.Column('severity', sa.String(20), default='medium'),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('is_blocking', sa.Boolean(), default=False),
        sa.Column('applies_to_free', sa.Boolean(), default=True),
        sa.Column('applies_to_paid', sa.Boolean(), default=True),
        sa.Column('violation_message', sa.Text(), nullable=True),
        sa.Column('recommendation', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code'),
    )
    op.create_index('ix_marketplace_security_policies_id', 'marketplace_security_policies', ['id'])
    op.create_index('ix_marketplace_security_policies_code', 'marketplace_security_policies', ['code'])
    op.create_index('ix_marketplace_security_policies_type', 'marketplace_security_policies', ['policy_type'])
    op.create_index('ix_marketplace_security_policies_active', 'marketplace_security_policies', ['is_active'])

    # Trusted Publishers
    op.create_table(
        'marketplace_trusted_publishers',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('publisher_id', sa.Integer(), nullable=False),
        sa.Column('trust_level', sa.String(20), default='basic'),
        sa.Column('skip_code_review', sa.Boolean(), default=False),
        sa.Column('skip_security_scan', sa.Boolean(), default=False),
        sa.Column('auto_publish', sa.Boolean(), default=False),
        sa.Column('extended_api_limits', sa.Boolean(), default=False),
        sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('verified_by', sa.Integer(), nullable=True),
        sa.Column('verification_method', sa.String(50), nullable=True),
        sa.Column('verification_docs', postgresql.JSONB(), default=[]),
        sa.Column('status', sa.String(20), default='active'),
        sa.Column('suspended_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('suspension_reason', sa.Text(), nullable=True),
        sa.Column('internal_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['publisher_id'], ['marketplace_publishers.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['verified_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('publisher_id'),
    )
    op.create_index('ix_marketplace_trusted_publishers_id', 'marketplace_trusted_publishers', ['id'])
    op.create_index('ix_marketplace_trusted_publishers_status', 'marketplace_trusted_publishers', ['status'])
    op.create_index('ix_marketplace_trusted_publishers_level', 'marketplace_trusted_publishers', ['trust_level'])

    # ==========================================================================
    # Payout Tables
    # ==========================================================================

    # Payout Batches
    op.create_table(
        'marketplace_payout_batches',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('batch_id', sa.String(64), nullable=False),
        sa.Column('batch_type', sa.String(20), default='regular'),
        sa.Column('period_start', sa.Date(), nullable=False),
        sa.Column('period_end', sa.Date(), nullable=False),
        sa.Column('total_payouts', sa.Integer(), default=0),
        sa.Column('total_gross_amount', sa.Numeric(14, 2), default=0),
        sa.Column('total_platform_fees', sa.Numeric(14, 2), default=0),
        sa.Column('total_net_amount', sa.Numeric(14, 2), default=0),
        sa.Column('currency', sa.String(3), default='USD'),
        sa.Column('status', sa.String(20), default='draft'),
        sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('success_count', sa.Integer(), default=0),
        sa.Column('failed_count', sa.Integer(), default=0),
        sa.Column('pending_count', sa.Integer(), default=0),
        sa.Column('stripe_batch_id', sa.String(100), nullable=True),
        sa.Column('paypal_batch_id', sa.String(100), nullable=True),
        sa.Column('processing_notes', sa.Text(), nullable=True),
        sa.Column('error_summary', postgresql.JSONB(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('approved_by', sa.Integer(), nullable=True),
        sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.ForeignKeyConstraint(['approved_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('batch_id'),
    )
    op.create_index('ix_marketplace_payout_batches_id', 'marketplace_payout_batches', ['id'])
    op.create_index('ix_marketplace_payout_batches_batch_id', 'marketplace_payout_batches', ['batch_id'])
    op.create_index('ix_marketplace_payout_batches_status', 'marketplace_payout_batches', ['status'])
    op.create_index('ix_marketplace_payout_batches_period', 'marketplace_payout_batches', ['period_start', 'period_end'])

    # Payout Items
    op.create_table(
        'marketplace_payout_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('batch_id', sa.Integer(), nullable=False),
        sa.Column('publisher_id', sa.Integer(), nullable=False),
        sa.Column('gross_amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('platform_fee', sa.Numeric(12, 2), nullable=False),
        sa.Column('adjustments', sa.Numeric(12, 2), default=0),
        sa.Column('net_amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('currency', sa.String(3), default='USD'),
        sa.Column('order_count', sa.Integer(), default=0),
        sa.Column('order_ids', postgresql.JSONB(), default=[]),
        sa.Column('module_breakdown', postgresql.JSONB(), default=[]),
        sa.Column('status', sa.String(20), default='pending'),
        sa.Column('payout_method', sa.String(20), nullable=True),
        sa.Column('payout_destination', sa.String(200), nullable=True),
        sa.Column('stripe_transfer_id', sa.String(100), nullable=True),
        sa.Column('stripe_payout_id', sa.String(100), nullable=True),
        sa.Column('paypal_payout_item_id', sa.String(100), nullable=True),
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('arrival_date', sa.Date(), nullable=True),
        sa.Column('retry_count', sa.Integer(), default=0),
        sa.Column('max_retries', sa.Integer(), default=3),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('error_code', sa.String(50), nullable=True),
        sa.Column('on_hold_reason', sa.Text(), nullable=True),
        sa.Column('on_hold_by', sa.Integer(), nullable=True),
        sa.Column('on_hold_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('invoice_id', sa.String(100), nullable=True),
        sa.Column('invoice_url', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['batch_id'], ['marketplace_payout_batches.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['publisher_id'], ['marketplace_publishers.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['on_hold_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('batch_id', 'publisher_id', name='uq_payout_batch_publisher'),
    )
    op.create_index('ix_marketplace_payout_items_id', 'marketplace_payout_items', ['id'])
    op.create_index('ix_marketplace_payout_items_batch', 'marketplace_payout_items', ['batch_id'])
    op.create_index('ix_marketplace_payout_items_publisher', 'marketplace_payout_items', ['publisher_id'])
    op.create_index('ix_marketplace_payout_items_status', 'marketplace_payout_items', ['status'])

    # Payout Schedules
    op.create_table(
        'marketplace_payout_schedules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('schedule_type', sa.String(20), nullable=False),
        sa.Column('day_of_week', sa.Integer(), nullable=True),
        sa.Column('day_of_month', sa.Integer(), nullable=True),
        sa.Column('minimum_amount', sa.Numeric(10, 2), default=50.00),
        sa.Column('currency', sa.String(3), default='USD'),
        sa.Column('processing_hour', sa.Integer(), default=9),
        sa.Column('processing_timezone', sa.String(50), default='UTC'),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('last_run_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('next_run_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_marketplace_payout_schedules_id', 'marketplace_payout_schedules', ['id'])
    op.create_index('ix_marketplace_payout_schedules_active', 'marketplace_payout_schedules', ['is_active'])

    # Payout Adjustments
    op.create_table(
        'marketplace_payout_adjustments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('publisher_id', sa.Integer(), nullable=False),
        sa.Column('adjustment_type', sa.String(30), nullable=False),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('currency', sa.String(3), default='USD'),
        sa.Column('reference_type', sa.String(50), nullable=True),
        sa.Column('reference_id', sa.Integer(), nullable=True),
        sa.Column('external_reference', sa.String(100), nullable=True),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('internal_notes', sa.Text(), nullable=True),
        sa.Column('status', sa.String(20), default='pending'),
        sa.Column('applied_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('applied_to_batch_id', sa.Integer(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('approved_by', sa.Integer(), nullable=True),
        sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['publisher_id'], ['marketplace_publishers.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['applied_to_batch_id'], ['marketplace_payout_batches.id']),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.ForeignKeyConstraint(['approved_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_marketplace_payout_adjustments_id', 'marketplace_payout_adjustments', ['id'])
    op.create_index('ix_marketplace_payout_adjustments_publisher', 'marketplace_payout_adjustments', ['publisher_id'])
    op.create_index('ix_marketplace_payout_adjustments_status', 'marketplace_payout_adjustments', ['status'])
    op.create_index('ix_marketplace_payout_adjustments_type', 'marketplace_payout_adjustments', ['adjustment_type'])

    # Publisher Balances
    op.create_table(
        'marketplace_publisher_balances',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('publisher_id', sa.Integer(), nullable=False),
        sa.Column('available_balance', sa.Numeric(14, 2), default=0),
        sa.Column('pending_balance', sa.Numeric(14, 2), default=0),
        sa.Column('reserved_balance', sa.Numeric(14, 2), default=0),
        sa.Column('currency', sa.String(3), default='USD'),
        sa.Column('lifetime_earnings', sa.Numeric(14, 2), default=0),
        sa.Column('lifetime_payouts', sa.Numeric(14, 2), default=0),
        sa.Column('lifetime_adjustments', sa.Numeric(14, 2), default=0),
        sa.Column('last_earning_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_payout_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('auto_payout_enabled', sa.Boolean(), default=True),
        sa.Column('payout_threshold', sa.Numeric(10, 2), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['publisher_id'], ['marketplace_publishers.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('publisher_id'),
    )
    op.create_index('ix_marketplace_publisher_balances_id', 'marketplace_publisher_balances', ['id'])
    op.create_index('ix_marketplace_publisher_balances_publisher', 'marketplace_publisher_balances', ['publisher_id'])

    # Balance Transactions
    op.create_table(
        'marketplace_balance_transactions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('publisher_id', sa.Integer(), nullable=False),
        sa.Column('transaction_type', sa.String(30), nullable=False),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('currency', sa.String(3), default='USD'),
        sa.Column('balance_type', sa.String(20), nullable=False),
        sa.Column('balance_before', sa.Numeric(14, 2), nullable=False),
        sa.Column('balance_after', sa.Numeric(14, 2), nullable=False),
        sa.Column('reference_type', sa.String(50), nullable=True),
        sa.Column('reference_id', sa.Integer(), nullable=True),
        sa.Column('description', sa.String(500), nullable=True),
        sa.Column('extra_data', postgresql.JSONB(), default={}),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['publisher_id'], ['marketplace_publishers.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_marketplace_balance_transactions_id', 'marketplace_balance_transactions', ['id'])
    op.create_index('ix_marketplace_balance_transactions_publisher', 'marketplace_balance_transactions', ['publisher_id'])
    op.create_index('ix_marketplace_balance_transactions_type', 'marketplace_balance_transactions', ['transaction_type'])
    op.create_index('ix_marketplace_balance_transactions_created', 'marketplace_balance_transactions', ['created_at'])

    # Add payout_settings column to publishers
    op.add_column(
        'marketplace_publishers',
        sa.Column('payout_settings', postgresql.JSONB(), default={})
    )


def downgrade() -> None:
    # Remove payout_settings column
    op.drop_column('marketplace_publishers', 'payout_settings')

    # Drop payout tables
    op.drop_table('marketplace_balance_transactions')
    op.drop_table('marketplace_publisher_balances')
    op.drop_table('marketplace_payout_adjustments')
    op.drop_table('marketplace_payout_schedules')
    op.drop_table('marketplace_payout_items')
    op.drop_table('marketplace_payout_batches')

    # Drop security tables
    op.drop_table('marketplace_trusted_publishers')
    op.drop_table('marketplace_security_policies')
    op.drop_table('marketplace_security_scans')
    op.drop_table('marketplace_module_signatures')
    op.drop_table('marketplace_signing_keys')
