"""Add marketplace phase 2 subscription tables

Revision ID: c22cb0ae5543
Revises: k7l8m9n0o1p2
Create Date: 2024-12-27 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'c22cb0ae5543'
down_revision = 'k7l8m9n0o1p2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ==========================================================================
    # Subscription Plans
    # ==========================================================================
    op.create_table(
        'marketplace_subscription_plans',
        sa.Column('id', sa.Integer(), nullable=False),
        # Identification
        sa.Column('code', sa.String(100), unique=True, nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        # Tier
        sa.Column('tier', sa.String(50), nullable=False),
        sa.Column('tier_order', sa.Integer(), default=0),
        # Module association
        sa.Column('module_id', sa.Integer(), nullable=True),
        # Billing
        sa.Column('billing_cycle', sa.String(20), nullable=False),
        sa.Column('price', sa.Numeric(10, 2), nullable=False),
        sa.Column('currency', sa.String(3), default='USD'),
        sa.Column('annual_discount_percent', sa.Numeric(5, 2), default=0),
        # Trial
        sa.Column('has_trial', sa.Boolean(), default=False),
        sa.Column('trial_days', sa.Integer(), default=14),
        # Features and Limits
        sa.Column('features', postgresql.JSONB(), default={}),
        sa.Column('limits', postgresql.JSONB(), default={}),
        sa.Column('max_instances', sa.Integer(), default=1),
        sa.Column('max_users', sa.Integer(), nullable=True),
        # Display
        sa.Column('sort_order', sa.Integer(), default=10),
        sa.Column('is_popular', sa.Boolean(), default=False),
        # Metered billing
        sa.Column('is_metered', sa.Boolean(), default=False),
        sa.Column('metered_unit', sa.String(50), nullable=True),
        sa.Column('metered_unit_price', sa.Numeric(10, 4), nullable=True),
        sa.Column('metered_included', sa.Integer(), nullable=True),
        # Status
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('is_public', sa.Boolean(), default=True),
        # Promotion
        sa.Column('badge_text', sa.String(50), nullable=True),
        sa.Column('highlight', sa.Boolean(), default=False),
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['module_id'], ['marketplace_modules.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.ForeignKeyConstraint(['updated_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_marketplace_subscription_plans_id', 'marketplace_subscription_plans', ['id'])
    op.create_index('ix_marketplace_subscription_plans_code', 'marketplace_subscription_plans', ['code'])
    op.create_index('ix_marketplace_subscription_plans_tier', 'marketplace_subscription_plans', ['tier'])
    op.create_index('ix_marketplace_subscription_plans_module_active', 'marketplace_subscription_plans', ['module_id', 'is_active'])

    # ==========================================================================
    # Subscriptions
    # ==========================================================================
    op.create_table(
        'marketplace_subscriptions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('subscription_id', sa.String(50), unique=True, nullable=False),
        # Owner
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('company_id', sa.Integer(), nullable=True),
        # Plan
        sa.Column('plan_id', sa.Integer(), nullable=False),
        # Module
        sa.Column('module_id', sa.Integer(), nullable=True),
        # License link
        sa.Column('license_id', sa.Integer(), nullable=True),
        # Status
        sa.Column('status', sa.String(20), default='active'),
        # Billing Cycle
        sa.Column('billing_cycle', sa.String(20), nullable=False),
        # Current Period
        sa.Column('current_period_start', sa.Date(), nullable=False),
        sa.Column('current_period_end', sa.Date(), nullable=False),
        # Trial
        sa.Column('trial_start', sa.Date(), nullable=True),
        sa.Column('trial_end', sa.Date(), nullable=True),
        # Cancellation
        sa.Column('cancel_at_period_end', sa.Boolean(), default=False),
        sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('cancellation_reason', sa.Text(), nullable=True),
        # Pausing
        sa.Column('paused_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('resume_at', sa.Date(), nullable=True),
        # Pricing
        sa.Column('quantity', sa.Integer(), default=1),
        sa.Column('unit_price', sa.Numeric(10, 2), nullable=False),
        sa.Column('amount', sa.Numeric(12, 2), nullable=True),
        sa.Column('currency', sa.String(3), default='USD'),
        sa.Column('discount_percent', sa.Numeric(5, 2), default=0),
        # Payment
        sa.Column('payment_method', sa.String(50), nullable=True),
        sa.Column('auto_renew', sa.Boolean(), default=True),
        # Usage
        sa.Column('current_usage', postgresql.JSONB(), default={}),
        # Billing Contact
        sa.Column('billing_email', sa.String(200), nullable=True),
        sa.Column('billing_name', sa.String(200), nullable=True),
        sa.Column('billing_address', postgresql.JSONB(), nullable=True),
        # Extra data
        sa.Column('extra_data', postgresql.JSONB(), default={}),
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id']),
        sa.ForeignKeyConstraint(['plan_id'], ['marketplace_subscription_plans.id']),
        sa.ForeignKeyConstraint(['module_id'], ['marketplace_modules.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['license_id'], ['marketplace_licenses.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_marketplace_subscriptions_id', 'marketplace_subscriptions', ['id'])
    op.create_index('ix_marketplace_subscriptions_subscription_id', 'marketplace_subscriptions', ['subscription_id'])
    op.create_index('ix_marketplace_subscriptions_user_status', 'marketplace_subscriptions', ['user_id', 'status'])
    op.create_index('ix_marketplace_subscriptions_company_status', 'marketplace_subscriptions', ['company_id', 'status'])
    op.create_index('ix_marketplace_subscriptions_period_end', 'marketplace_subscriptions', ['current_period_end'])
    op.create_index('ix_marketplace_subscriptions_module', 'marketplace_subscriptions', ['module_id'])

    # ==========================================================================
    # Subscription Invoices
    # ==========================================================================
    op.create_table(
        'marketplace_subscription_invoices',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('invoice_number', sa.String(50), unique=True, nullable=False),
        # Subscription
        sa.Column('subscription_id', sa.Integer(), nullable=True),
        # Owner (denormalized)
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('company_id', sa.Integer(), nullable=True),
        # Billing Period
        sa.Column('period_start', sa.Date(), nullable=False),
        sa.Column('period_end', sa.Date(), nullable=False),
        # Line Items
        sa.Column('line_items', postgresql.JSONB(), default=[]),
        # Amounts
        sa.Column('subtotal', sa.Numeric(12, 2), nullable=False),
        sa.Column('discount_amount', sa.Numeric(12, 2), default=0),
        sa.Column('tax_amount', sa.Numeric(12, 2), default=0),
        sa.Column('tax_rate', sa.Numeric(5, 2), nullable=True),
        sa.Column('total', sa.Numeric(12, 2), nullable=False),
        sa.Column('amount_paid', sa.Numeric(12, 2), default=0),
        sa.Column('amount_due', sa.Numeric(12, 2), nullable=False),
        sa.Column('currency', sa.String(3), default='USD'),
        # Status
        sa.Column('status', sa.String(20), default='draft'),
        # Dates
        sa.Column('issue_date', sa.Date(), nullable=False),
        sa.Column('due_date', sa.Date(), nullable=False),
        sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),
        # Payment
        sa.Column('payment_method', sa.String(50), nullable=True),
        sa.Column('payment_reference', sa.String(200), nullable=True),
        # Billing Details
        sa.Column('billing_name', sa.String(200), nullable=True),
        sa.Column('billing_email', sa.String(200), nullable=True),
        sa.Column('billing_address', postgresql.JSONB(), nullable=True),
        sa.Column('billing_vat_number', sa.String(50), nullable=True),
        # Notes
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('internal_notes', sa.Text(), nullable=True),
        # PDF
        sa.Column('pdf_url', sa.String(500), nullable=True),
        sa.Column('pdf_generated_at', sa.DateTime(timezone=True), nullable=True),
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['subscription_id'], ['marketplace_subscriptions.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_marketplace_subscription_invoices_id', 'marketplace_subscription_invoices', ['id'])
    op.create_index('ix_marketplace_subscription_invoices_invoice_number', 'marketplace_subscription_invoices', ['invoice_number'])
    op.create_index('ix_marketplace_subscription_invoices_status_due', 'marketplace_subscription_invoices', ['status', 'due_date'])
    op.create_index('ix_marketplace_subscription_invoices_user', 'marketplace_subscription_invoices', ['user_id'])
    op.create_index('ix_marketplace_subscription_invoices_company', 'marketplace_subscription_invoices', ['company_id'])
    op.create_index('ix_marketplace_subscription_invoices_subscription', 'marketplace_subscription_invoices', ['subscription_id'])

    # ==========================================================================
    # Invoice Payments
    # ==========================================================================
    op.create_table(
        'marketplace_invoice_payments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('invoice_id', sa.Integer(), nullable=False),
        # Amount
        sa.Column('amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('currency', sa.String(3), default='USD'),
        # Payment Details
        sa.Column('payment_method', sa.String(50), nullable=False),
        sa.Column('payment_reference', sa.String(200), nullable=True),
        sa.Column('payment_date', sa.Date(), nullable=False),
        # Notes
        sa.Column('notes', sa.Text(), nullable=True),
        # Recorded By
        sa.Column('recorded_by', sa.Integer(), nullable=True),
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['invoice_id'], ['marketplace_subscription_invoices.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['recorded_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_marketplace_invoice_payments_id', 'marketplace_invoice_payments', ['id'])
    op.create_index('ix_marketplace_invoice_payments_invoice', 'marketplace_invoice_payments', ['invoice_id'])
    op.create_index('ix_marketplace_invoice_payments_date', 'marketplace_invoice_payments', ['payment_date'])

    # ==========================================================================
    # Subscription Usage
    # ==========================================================================
    op.create_table(
        'marketplace_subscription_usage',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('subscription_id', sa.Integer(), nullable=False),
        # Usage Type
        sa.Column('metric', sa.String(50), nullable=False),
        # Period
        sa.Column('period_start', sa.Date(), nullable=False),
        sa.Column('period_end', sa.Date(), nullable=False),
        # Recorded
        sa.Column('recorded_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        # Quantity
        sa.Column('quantity', sa.Numeric(14, 4), nullable=False),
        # Pricing
        sa.Column('unit_price', sa.Numeric(10, 4), nullable=True),
        sa.Column('total_amount', sa.Numeric(12, 2), nullable=True),
        # Included in plan
        sa.Column('included_quantity', sa.Numeric(14, 4), default=0),
        sa.Column('billable_quantity', sa.Numeric(14, 4), nullable=True),
        # Status
        sa.Column('billed', sa.Boolean(), default=False),
        sa.Column('invoice_id', sa.Integer(), nullable=True),
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['subscription_id'], ['marketplace_subscriptions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['invoice_id'], ['marketplace_subscription_invoices.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('subscription_id', 'metric', 'period_start', 'period_end', name='uq_usage_subscription_metric_period'),
    )
    op.create_index('ix_marketplace_subscription_usage_id', 'marketplace_subscription_usage', ['id'])
    op.create_index('ix_marketplace_subscription_usage_subscription_period', 'marketplace_subscription_usage', ['subscription_id', 'period_start', 'period_end'])
    op.create_index('ix_marketplace_subscription_usage_metric', 'marketplace_subscription_usage', ['metric'])

    # ==========================================================================
    # Credit Balances
    # ==========================================================================
    op.create_table(
        'marketplace_credit_balances',
        sa.Column('id', sa.Integer(), nullable=False),
        # Owner
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('company_id', sa.Integer(), nullable=True),
        # Balance
        sa.Column('balance', sa.Numeric(14, 2), default=0),
        sa.Column('currency', sa.String(3), default='USD'),
        # Lifetime totals
        sa.Column('total_credits', sa.Numeric(14, 2), default=0),
        sa.Column('total_debits', sa.Numeric(14, 2), default=0),
        # Low balance alert
        sa.Column('low_balance_threshold', sa.Numeric(12, 2), nullable=True),
        sa.Column('low_balance_notified_at', sa.DateTime(timezone=True), nullable=True),
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', name='uq_credit_user'),
        sa.UniqueConstraint('company_id', name='uq_credit_company'),
    )
    op.create_index('ix_marketplace_credit_balances_id', 'marketplace_credit_balances', ['id'])
    op.create_index('ix_marketplace_credit_balances_user', 'marketplace_credit_balances', ['user_id'])
    op.create_index('ix_marketplace_credit_balances_company', 'marketplace_credit_balances', ['company_id'])

    # ==========================================================================
    # Credit Transactions
    # ==========================================================================
    op.create_table(
        'marketplace_credit_transactions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('transaction_id', sa.String(50), unique=True, nullable=False),
        # Balance Record
        sa.Column('balance_id', sa.Integer(), nullable=False),
        # Transaction Type
        sa.Column('transaction_type', sa.String(20), nullable=False),
        # Amount
        sa.Column('amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('balance_before', sa.Numeric(14, 2), nullable=False),
        sa.Column('balance_after', sa.Numeric(14, 2), nullable=False),
        sa.Column('currency', sa.String(3), default='USD'),
        # Reference
        sa.Column('reference_type', sa.String(50), nullable=True),
        sa.Column('reference_id', sa.Integer(), nullable=True),
        # Description
        sa.Column('description', sa.String(500), nullable=True),
        # Extra data
        sa.Column('extra_data', postgresql.JSONB(), default={}),
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['balance_id'], ['marketplace_credit_balances.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_marketplace_credit_transactions_id', 'marketplace_credit_transactions', ['id'])
    op.create_index('ix_marketplace_credit_transactions_transaction_id', 'marketplace_credit_transactions', ['transaction_id'])
    op.create_index('ix_marketplace_credit_transactions_balance', 'marketplace_credit_transactions', ['balance_id'])
    op.create_index('ix_marketplace_credit_transactions_type', 'marketplace_credit_transactions', ['transaction_type'])
    op.create_index('ix_marketplace_credit_transactions_reference', 'marketplace_credit_transactions', ['reference_type', 'reference_id'])

    # ==========================================================================
    # Subscription Events
    # ==========================================================================
    op.create_table(
        'marketplace_subscription_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('subscription_id', sa.Integer(), nullable=False),
        # Event Type
        sa.Column('event_type', sa.String(50), nullable=False),
        # Event Data
        sa.Column('data', postgresql.JSONB(), default={}),
        # Triggered By
        sa.Column('triggered_by', sa.String(50), nullable=True),
        sa.Column('triggered_by_user_id', sa.Integer(), nullable=True),
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['subscription_id'], ['marketplace_subscriptions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['triggered_by_user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_marketplace_subscription_events_id', 'marketplace_subscription_events', ['id'])
    op.create_index('ix_marketplace_subscription_events_subscription', 'marketplace_subscription_events', ['subscription_id'])
    op.create_index('ix_marketplace_subscription_events_type', 'marketplace_subscription_events', ['event_type'])
    op.create_index('ix_marketplace_subscription_events_created', 'marketplace_subscription_events', ['created_at'])


def downgrade() -> None:
    # Drop tables in reverse order (due to foreign key dependencies)
    op.drop_table('marketplace_subscription_events')
    op.drop_table('marketplace_credit_transactions')
    op.drop_table('marketplace_credit_balances')
    op.drop_table('marketplace_subscription_usage')
    op.drop_table('marketplace_invoice_payments')
    op.drop_table('marketplace_subscription_invoices')
    op.drop_table('marketplace_subscriptions')
    op.drop_table('marketplace_subscription_plans')
