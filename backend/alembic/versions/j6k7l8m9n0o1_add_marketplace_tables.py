"""Add marketplace tables

Revision ID: j6k7l8m9n0o1
Revises: i5j6k7l8m9n0
Create Date: 2024-01-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'j6k7l8m9n0o1'
down_revision = 'i5j6k7l8m9n0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ==========================================================================
    # Publisher Tables
    # ==========================================================================

    # Publishers
    op.create_table(
        'marketplace_publishers',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('company_name', sa.String(200), nullable=True),
        sa.Column('display_name', sa.String(100), nullable=False),
        sa.Column('slug', sa.String(100), nullable=False),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('website', sa.String(500), nullable=True),
        sa.Column('support_email', sa.String(200), nullable=True),
        sa.Column('support_url', sa.String(500), nullable=True),
        sa.Column('logo_url', sa.String(500), nullable=True),
        sa.Column('banner_url', sa.String(500), nullable=True),
        sa.Column('primary_color', sa.String(7), nullable=True),
        sa.Column('verified', sa.Boolean(), default=False),
        sa.Column('verification_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('verification_type', sa.String(20), nullable=True),
        sa.Column('status', sa.String(20), default='pending'),
        sa.Column('status_reason', sa.Text(), nullable=True),
        sa.Column('suspended_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('stripe_account_id', sa.String(100), nullable=True),
        sa.Column('stripe_account_status', sa.String(20), nullable=True),
        sa.Column('paypal_email', sa.String(200), nullable=True),
        sa.Column('payout_method', sa.String(20), default='stripe'),
        sa.Column('payout_threshold', sa.Numeric(10, 2), default=50.00),
        sa.Column('commission_rate', sa.Numeric(5, 2), default=30.00),
        sa.Column('custom_commission', sa.Boolean(), default=False),
        sa.Column('social_links', postgresql.JSONB(), default={}),
        sa.Column('notification_settings', postgresql.JSONB(), default={}),
        sa.Column('api_key_hash', sa.String(64), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id'),
        sa.UniqueConstraint('slug'),
    )
    op.create_index('ix_marketplace_publishers_id', 'marketplace_publishers', ['id'])
    op.create_index('ix_marketplace_publishers_slug', 'marketplace_publishers', ['slug'])
    op.create_index('ix_marketplace_publishers_status', 'marketplace_publishers', ['status'])
    op.create_index('ix_marketplace_publishers_verified', 'marketplace_publishers', ['verified'])

    # Publisher Stats
    op.create_table(
        'marketplace_publisher_stats',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('publisher_id', sa.Integer(), nullable=False),
        sa.Column('total_modules', sa.Integer(), default=0),
        sa.Column('published_modules', sa.Integer(), default=0),
        sa.Column('total_versions', sa.Integer(), default=0),
        sa.Column('total_downloads', sa.Integer(), default=0),
        sa.Column('downloads_this_period', sa.Integer(), default=0),
        sa.Column('total_revenue', sa.Numeric(12, 2), default=0),
        sa.Column('revenue_this_period', sa.Numeric(12, 2), default=0),
        sa.Column('total_earnings', sa.Numeric(12, 2), default=0),
        sa.Column('pending_earnings', sa.Numeric(12, 2), default=0),
        sa.Column('average_rating', sa.Numeric(3, 2), nullable=True),
        sa.Column('total_reviews', sa.Integer(), default=0),
        sa.Column('reviews_this_period', sa.Integer(), default=0),
        sa.Column('total_views', sa.Integer(), default=0),
        sa.Column('views_this_period', sa.Integer(), default=0),
        sa.Column('period', sa.String(10), default='all'),
        sa.Column('period_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('period_end', sa.DateTime(timezone=True), nullable=True),
        sa.Column('calculated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['publisher_id'], ['marketplace_publishers.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('publisher_id', 'period', 'period_start', name='uq_publisher_stats_period'),
    )
    op.create_index('ix_marketplace_publisher_stats_id', 'marketplace_publisher_stats', ['id'])
    op.create_index('ix_marketplace_publisher_stats_publisher', 'marketplace_publisher_stats', ['publisher_id'])

    # Publisher Payouts
    op.create_table(
        'marketplace_payouts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('publisher_id', sa.Integer(), nullable=False),
        sa.Column('payout_number', sa.String(50), nullable=False),
        sa.Column('gross_amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('platform_fee', sa.Numeric(12, 2), nullable=False),
        sa.Column('net_amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('currency', sa.String(3), default='USD'),
        sa.Column('period_start', sa.DateTime(timezone=True), nullable=False),
        sa.Column('period_end', sa.DateTime(timezone=True), nullable=False),
        sa.Column('order_count', sa.Integer(), default=0),
        sa.Column('order_ids', postgresql.JSONB(), default=[]),
        sa.Column('status', sa.String(20), default='pending'),
        sa.Column('payout_method', sa.String(20), nullable=True),
        sa.Column('stripe_payout_id', sa.String(100), nullable=True),
        sa.Column('stripe_transfer_id', sa.String(100), nullable=True),
        sa.Column('paypal_batch_id', sa.String(100), nullable=True),
        sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('initiated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('failure_reason', sa.Text(), nullable=True),
        sa.Column('retry_count', sa.Integer(), default=0),
        sa.Column('last_retry_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('invoice_url', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['publisher_id'], ['marketplace_publishers.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('payout_number'),
    )
    op.create_index('ix_marketplace_payouts_id', 'marketplace_payouts', ['id'])
    op.create_index('ix_marketplace_payouts_publisher', 'marketplace_payouts', ['publisher_id'])
    op.create_index('ix_marketplace_payouts_status', 'marketplace_payouts', ['status'])

    # ==========================================================================
    # Category Table
    # ==========================================================================

    op.create_table(
        'marketplace_categories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('slug', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('icon', sa.String(50), nullable=True),
        sa.Column('color', sa.String(7), nullable=True),
        sa.Column('image_url', sa.String(500), nullable=True),
        sa.Column('parent_id', sa.Integer(), nullable=True),
        sa.Column('level', sa.Integer(), default=0),
        sa.Column('path', sa.String(500), nullable=True),
        sa.Column('order', sa.Integer(), default=0),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('is_featured', sa.Boolean(), default=False),
        sa.Column('module_count', sa.Integer(), default=0),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['parent_id'], ['marketplace_categories.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug'),
    )
    op.create_index('ix_marketplace_categories_id', 'marketplace_categories', ['id'])
    op.create_index('ix_marketplace_categories_slug', 'marketplace_categories', ['slug'])

    # ==========================================================================
    # Module Tables
    # ==========================================================================

    op.create_table(
        'marketplace_modules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('publisher_id', sa.Integer(), nullable=False),
        sa.Column('category_id', sa.Integer(), nullable=True),
        sa.Column('technical_name', sa.String(100), nullable=False),
        sa.Column('display_name', sa.String(200), nullable=False),
        sa.Column('slug', sa.String(200), nullable=False),
        sa.Column('short_description', sa.String(500), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('description_html', sa.Text(), nullable=True),
        sa.Column('license_type', sa.String(20), default='free'),
        sa.Column('price', sa.Numeric(10, 2), nullable=True),
        sa.Column('currency', sa.String(3), default='USD'),
        sa.Column('subscription_monthly_price', sa.Numeric(10, 2), nullable=True),
        sa.Column('subscription_yearly_price', sa.Numeric(10, 2), nullable=True),
        sa.Column('subscription_yearly_discount', sa.Integer(), nullable=True),
        sa.Column('has_trial', sa.Boolean(), default=False),
        sa.Column('trial_days', sa.Integer(), nullable=True),
        sa.Column('icon_url', sa.String(500), nullable=True),
        sa.Column('banner_url', sa.String(500), nullable=True),
        sa.Column('screenshots', postgresql.JSONB(), default=[]),
        sa.Column('video_url', sa.String(500), nullable=True),
        sa.Column('video_type', sa.String(20), nullable=True),
        sa.Column('tags', postgresql.JSONB(), default=[]),
        sa.Column('keywords', postgresql.JSONB(), default=[]),
        sa.Column('search_vector', sa.Text(), nullable=True),
        sa.Column('fastvue_versions', postgresql.JSONB(), default=[]),
        sa.Column('python_versions', postgresql.JSONB(), default=[]),
        sa.Column('database_support', postgresql.JSONB(), default=[]),
        sa.Column('dependencies', postgresql.JSONB(), default=[]),
        sa.Column('optional_dependencies', postgresql.JSONB(), default=[]),
        sa.Column('conflicts_with', postgresql.JSONB(), default=[]),
        sa.Column('external_dependencies', postgresql.JSONB(), default={}),
        sa.Column('status', sa.String(20), default='draft'),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('archived_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('visibility', sa.String(20), default='public'),
        sa.Column('requires_approval', sa.Boolean(), default=False),
        sa.Column('featured', sa.Boolean(), default=False),
        sa.Column('featured_order', sa.Integer(), nullable=True),
        sa.Column('featured_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('featured_reason', sa.String(200), nullable=True),
        sa.Column('download_count', sa.BigInteger(), default=0),
        sa.Column('install_count', sa.BigInteger(), default=0),
        sa.Column('view_count', sa.BigInteger(), default=0),
        sa.Column('purchase_count', sa.Integer(), default=0),
        sa.Column('active_installs', sa.Integer(), default=0),
        sa.Column('average_rating', sa.Numeric(3, 2), nullable=True),
        sa.Column('rating_count', sa.Integer(), default=0),
        sa.Column('rating_distribution', postgresql.JSONB(), default={}),
        sa.Column('documentation_url', sa.String(500), nullable=True),
        sa.Column('changelog_url', sa.String(500), nullable=True),
        sa.Column('source_code_url', sa.String(500), nullable=True),
        sa.Column('demo_url', sa.String(500), nullable=True),
        sa.Column('support_url', sa.String(500), nullable=True),
        sa.Column('auto_update_enabled', sa.Boolean(), default=True),
        sa.Column('show_download_count', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['publisher_id'], ['marketplace_publishers.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['category_id'], ['marketplace_categories.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('technical_name'),
        sa.UniqueConstraint('slug'),
    )
    op.create_index('ix_marketplace_modules_id', 'marketplace_modules', ['id'])
    op.create_index('ix_marketplace_modules_slug', 'marketplace_modules', ['slug'])
    op.create_index('ix_marketplace_modules_technical_name', 'marketplace_modules', ['technical_name'])
    op.create_index('ix_marketplace_modules_publisher', 'marketplace_modules', ['publisher_id'])
    op.create_index('ix_marketplace_modules_status', 'marketplace_modules', ['status'])
    op.create_index('ix_marketplace_modules_featured', 'marketplace_modules', ['featured', 'featured_order'])

    # Module Versions
    op.create_table(
        'marketplace_module_versions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('module_id', sa.Integer(), nullable=False),
        sa.Column('version', sa.String(50), nullable=False),
        sa.Column('semver_major', sa.Integer(), nullable=True),
        sa.Column('semver_minor', sa.Integer(), nullable=True),
        sa.Column('semver_patch', sa.Integer(), nullable=True),
        sa.Column('semver_prerelease', sa.String(50), nullable=True),
        sa.Column('zip_file_url', sa.String(500), nullable=False),
        sa.Column('zip_file_path', sa.String(500), nullable=True),
        sa.Column('zip_file_size', sa.BigInteger(), nullable=True),
        sa.Column('zip_file_hash', sa.String(64), nullable=True),
        sa.Column('signature', sa.Text(), nullable=True),
        sa.Column('signed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('signing_key_id', sa.String(64), nullable=True),
        sa.Column('manifest', postgresql.JSONB(), default={}),
        sa.Column('changelog', sa.Text(), nullable=True),
        sa.Column('release_notes', sa.Text(), nullable=True),
        sa.Column('min_fastvue_version', sa.String(20), nullable=True),
        sa.Column('max_fastvue_version', sa.String(20), nullable=True),
        sa.Column('min_python_version', sa.String(10), nullable=True),
        sa.Column('dependencies', postgresql.JSONB(), default=[]),
        sa.Column('external_dependencies', postgresql.JSONB(), default={}),
        sa.Column('status', sa.String(20), default='draft'),
        sa.Column('is_latest', sa.Boolean(), default=False),
        sa.Column('is_prerelease', sa.Boolean(), default=False),
        sa.Column('is_security_update', sa.Boolean(), default=False),
        sa.Column('review_status', sa.String(20), nullable=True),
        sa.Column('review_notes', sa.Text(), nullable=True),
        sa.Column('reviewed_by', sa.Integer(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('published_by', sa.Integer(), nullable=True),
        sa.Column('deprecated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('deprecation_message', sa.Text(), nullable=True),
        sa.Column('download_count', sa.BigInteger(), default=0),
        sa.Column('install_count', sa.BigInteger(), default=0),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['module_id'], ['marketplace_modules.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('module_id', 'version', name='uq_module_version'),
    )
    op.create_index('ix_marketplace_module_versions_id', 'marketplace_module_versions', ['id'])
    op.create_index('ix_marketplace_module_versions_module', 'marketplace_module_versions', ['module_id'])
    op.create_index('ix_marketplace_module_versions_latest', 'marketplace_module_versions', ['is_latest'])

    # ==========================================================================
    # Order and License Tables
    # ==========================================================================

    # Orders
    op.create_table(
        'marketplace_orders',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('order_number', sa.String(50), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('items', postgresql.JSONB(), default=[]),
        sa.Column('subtotal', sa.Numeric(12, 2), nullable=False),
        sa.Column('discount_amount', sa.Numeric(12, 2), default=0),
        sa.Column('discount_code', sa.String(50), nullable=True),
        sa.Column('tax_amount', sa.Numeric(12, 2), default=0),
        sa.Column('tax_rate', sa.Numeric(5, 2), nullable=True),
        sa.Column('total', sa.Numeric(12, 2), nullable=False),
        sa.Column('currency', sa.String(3), default='USD'),
        sa.Column('payment_method', sa.String(20), nullable=True),
        sa.Column('payment_status', sa.String(20), default='pending'),
        sa.Column('stripe_payment_intent_id', sa.String(100), nullable=True),
        sa.Column('stripe_checkout_session_id', sa.String(100), nullable=True),
        sa.Column('stripe_customer_id', sa.String(100), nullable=True),
        sa.Column('paypal_order_id', sa.String(100), nullable=True),
        sa.Column('paypal_capture_id', sa.String(100), nullable=True),
        sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(20), default='pending'),
        sa.Column('refund_amount', sa.Numeric(12, 2), nullable=True),
        sa.Column('refund_reason', sa.Text(), nullable=True),
        sa.Column('refunded_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('billing_email', sa.String(200), nullable=True),
        sa.Column('billing_name', sa.String(200), nullable=True),
        sa.Column('billing_company', sa.String(200), nullable=True),
        sa.Column('billing_address', postgresql.JSONB(), nullable=True),
        sa.Column('billing_vat_number', sa.String(50), nullable=True),
        sa.Column('invoice_number', sa.String(50), nullable=True),
        sa.Column('invoice_url', sa.String(500), nullable=True),
        sa.Column('invoice_pdf_url', sa.String(500), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('referrer', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('order_number'),
    )
    op.create_index('ix_marketplace_orders_id', 'marketplace_orders', ['id'])
    op.create_index('ix_marketplace_orders_user', 'marketplace_orders', ['user_id'])
    op.create_index('ix_marketplace_orders_status', 'marketplace_orders', ['status'])

    # Licenses
    op.create_table(
        'marketplace_licenses',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('license_key', sa.String(64), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('module_id', sa.Integer(), nullable=False),
        sa.Column('order_id', sa.Integer(), nullable=True),
        sa.Column('license_type', sa.String(20), nullable=False),
        sa.Column('tier', sa.String(20), nullable=True),
        sa.Column('status', sa.String(20), default='active'),
        sa.Column('issued_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('activated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_trial', sa.Boolean(), default=False),
        sa.Column('trial_ends_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('converted_from_trial', sa.Boolean(), default=False),
        sa.Column('max_instances', sa.Integer(), default=1),
        sa.Column('max_users', sa.Integer(), nullable=True),
        sa.Column('instance_domains', postgresql.JSONB(), default=[]),
        sa.Column('active_instances', sa.Integer(), default=0),
        sa.Column('last_verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('subscription_id', sa.String(100), nullable=True),
        sa.Column('subscription_status', sa.String(20), nullable=True),
        sa.Column('subscription_period_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('subscription_period_end', sa.DateTime(timezone=True), nullable=True),
        sa.Column('subscription_cancelled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('subscription_cancel_at_period_end', sa.Boolean(), default=False),
        sa.Column('entitled_versions', postgresql.JSONB(), default=[]),
        sa.Column('max_major_version', sa.Integer(), nullable=True),
        sa.Column('internal_notes', sa.Text(), nullable=True),
        sa.Column('revocation_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['module_id'], ['marketplace_modules.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['order_id'], ['marketplace_orders.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('license_key'),
    )
    op.create_index('ix_marketplace_licenses_id', 'marketplace_licenses', ['id'])
    op.create_index('ix_marketplace_licenses_key', 'marketplace_licenses', ['license_key'])
    op.create_index('ix_marketplace_licenses_user', 'marketplace_licenses', ['user_id'])
    op.create_index('ix_marketplace_licenses_module', 'marketplace_licenses', ['module_id'])
    op.create_index('ix_marketplace_licenses_status', 'marketplace_licenses', ['status'])

    # License Activations
    op.create_table(
        'marketplace_license_activations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('license_id', sa.Integer(), nullable=False),
        sa.Column('instance_id', sa.String(64), nullable=False),
        sa.Column('instance_name', sa.String(200), nullable=True),
        sa.Column('domain', sa.String(200), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('server_info', postgresql.JSONB(), nullable=True),
        sa.Column('status', sa.String(20), default='active'),
        sa.Column('activated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('deactivated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_check', sa.DateTime(timezone=True), nullable=True),
        sa.Column('check_count', sa.Integer(), default=0),
        sa.Column('last_check_ip', sa.String(45), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['license_id'], ['marketplace_licenses.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('license_id', 'instance_id', name='uq_license_instance'),
    )
    op.create_index('ix_marketplace_license_activations_id', 'marketplace_license_activations', ['id'])
    op.create_index('ix_marketplace_license_activations_license', 'marketplace_license_activations', ['license_id'])
    op.create_index('ix_marketplace_license_activations_instance', 'marketplace_license_activations', ['instance_id'])

    # ==========================================================================
    # Review Tables
    # ==========================================================================

    op.create_table(
        'marketplace_reviews',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('module_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('version_id', sa.Integer(), nullable=True),
        sa.Column('rating', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(200), nullable=True),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('rating_ease_of_use', sa.Integer(), nullable=True),
        sa.Column('rating_features', sa.Integer(), nullable=True),
        sa.Column('rating_documentation', sa.Integer(), nullable=True),
        sa.Column('rating_support', sa.Integer(), nullable=True),
        sa.Column('rating_value', sa.Integer(), nullable=True),
        sa.Column('pros', postgresql.JSONB(), default=[]),
        sa.Column('cons', postgresql.JSONB(), default=[]),
        sa.Column('helpful_count', sa.Integer(), default=0),
        sa.Column('not_helpful_count', sa.Integer(), default=0),
        sa.Column('comment_count', sa.Integer(), default=0),
        sa.Column('has_response', sa.Boolean(), default=False),
        sa.Column('publisher_response', sa.Text(), nullable=True),
        sa.Column('publisher_responded_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('publisher_response_by', sa.Integer(), nullable=True),
        sa.Column('verified_purchase', sa.Boolean(), default=False),
        sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('license_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(20), default='published'),
        sa.Column('reported_count', sa.Integer(), default=0),
        sa.Column('moderation_notes', sa.Text(), nullable=True),
        sa.Column('moderated_by', sa.Integer(), nullable=True),
        sa.Column('moderated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_featured', sa.Boolean(), default=False),
        sa.Column('featured_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_edited', sa.Boolean(), default=False),
        sa.Column('edited_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('original_content', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['module_id'], ['marketplace_modules.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['version_id'], ['marketplace_module_versions.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['license_id'], ['marketplace_licenses.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('module_id', 'user_id', name='uq_module_review_user'),
        sa.CheckConstraint('rating >= 1 AND rating <= 5', name='ck_review_rating_range'),
    )
    op.create_index('ix_marketplace_reviews_id', 'marketplace_reviews', ['id'])
    op.create_index('ix_marketplace_reviews_module', 'marketplace_reviews', ['module_id'])
    op.create_index('ix_marketplace_reviews_status', 'marketplace_reviews', ['status'])

    # Rating Summary
    op.create_table(
        'marketplace_rating_summaries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('module_id', sa.Integer(), nullable=False),
        sa.Column('average_rating', sa.Integer(), default=0),
        sa.Column('total_reviews', sa.Integer(), default=0),
        sa.Column('verified_reviews', sa.Integer(), default=0),
        sa.Column('rating_5', sa.Integer(), default=0),
        sa.Column('rating_4', sa.Integer(), default=0),
        sa.Column('rating_3', sa.Integer(), default=0),
        sa.Column('rating_2', sa.Integer(), default=0),
        sa.Column('rating_1', sa.Integer(), default=0),
        sa.Column('avg_ease_of_use', sa.Integer(), nullable=True),
        sa.Column('avg_features', sa.Integer(), nullable=True),
        sa.Column('avg_documentation', sa.Integer(), nullable=True),
        sa.Column('avg_support', sa.Integer(), nullable=True),
        sa.Column('avg_value', sa.Integer(), nullable=True),
        sa.Column('rating_trend', sa.String(10), nullable=True),
        sa.Column('reviews_this_month', sa.Integer(), default=0),
        sa.Column('average_this_month', sa.Integer(), nullable=True),
        sa.Column('last_review_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('recalculated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['module_id'], ['marketplace_modules.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('module_id'),
    )
    op.create_index('ix_marketplace_rating_summaries_id', 'marketplace_rating_summaries', ['id'])

    # ==========================================================================
    # Analytics Tables
    # ==========================================================================

    op.create_table(
        'marketplace_downloads',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('module_id', sa.Integer(), nullable=False),
        sa.Column('version_id', sa.Integer(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('license_id', sa.Integer(), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('referrer', sa.String(500), nullable=True),
        sa.Column('country_code', sa.String(2), nullable=True),
        sa.Column('region', sa.String(100), nullable=True),
        sa.Column('city', sa.String(100), nullable=True),
        sa.Column('download_type', sa.String(20), default='manual'),
        sa.Column('source', sa.String(50), nullable=True),
        sa.Column('fastvue_version', sa.String(20), nullable=True),
        sa.Column('python_version', sa.String(10), nullable=True),
        sa.Column('download_date', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['module_id'], ['marketplace_modules.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['version_id'], ['marketplace_module_versions.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['license_id'], ['marketplace_licenses.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_marketplace_downloads_id', 'marketplace_downloads', ['id'])
    op.create_index('ix_marketplace_downloads_module_date', 'marketplace_downloads', ['module_id', 'download_date'])

    op.create_table(
        'marketplace_views',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('module_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('session_id', sa.String(64), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('referrer', sa.String(500), nullable=True),
        sa.Column('country_code', sa.String(2), nullable=True),
        sa.Column('page_type', sa.String(20), default='detail'),
        sa.Column('time_on_page', sa.Integer(), nullable=True),
        sa.Column('scroll_depth', sa.Integer(), nullable=True),
        sa.Column('clicked_install', sa.Boolean(), default=False),
        sa.Column('clicked_buy', sa.Boolean(), default=False),
        sa.Column('added_to_cart', sa.Boolean(), default=False),
        sa.Column('view_date', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['module_id'], ['marketplace_modules.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_marketplace_views_id', 'marketplace_views', ['id'])
    op.create_index('ix_marketplace_views_module_date', 'marketplace_views', ['module_id', 'view_date'])

    # Publisher Invitations
    op.create_table(
        'marketplace_publisher_invitations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('publisher_id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(200), nullable=False),
        sa.Column('role', sa.String(20), default='member'),
        sa.Column('token', sa.String(64), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('accepted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('accepted_by', sa.Integer(), nullable=True),
        sa.Column('invited_by', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['publisher_id'], ['marketplace_publishers.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['invited_by'], ['users.id']),
        sa.ForeignKeyConstraint(['accepted_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token'),
    )
    op.create_index('ix_marketplace_publisher_invitations_id', 'marketplace_publisher_invitations', ['id'])
    op.create_index('ix_marketplace_publisher_invitations_token', 'marketplace_publisher_invitations', ['token'])

    # Module Tags
    op.create_table(
        'marketplace_tags',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(50), nullable=False),
        sa.Column('slug', sa.String(50), nullable=False),
        sa.Column('description', sa.String(200), nullable=True),
        sa.Column('module_count', sa.Integer(), default=0),
        sa.Column('color', sa.String(7), nullable=True),
        sa.Column('icon', sa.String(50), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('is_featured', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
        sa.UniqueConstraint('slug'),
    )
    op.create_index('ix_marketplace_tags_id', 'marketplace_tags', ['id'])
    op.create_index('ix_marketplace_tags_slug', 'marketplace_tags', ['slug'])

    # Module Screenshots
    op.create_table(
        'marketplace_screenshots',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('module_id', sa.Integer(), nullable=False),
        sa.Column('url', sa.String(500), nullable=False),
        sa.Column('thumbnail_url', sa.String(500), nullable=True),
        sa.Column('width', sa.Integer(), nullable=True),
        sa.Column('height', sa.Integer(), nullable=True),
        sa.Column('caption', sa.String(200), nullable=True),
        sa.Column('alt_text', sa.String(200), nullable=True),
        sa.Column('order', sa.Integer(), default=0),
        sa.Column('screenshot_type', sa.String(20), default='desktop'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['module_id'], ['marketplace_modules.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_marketplace_screenshots_id', 'marketplace_screenshots', ['id'])
    op.create_index('ix_marketplace_screenshots_module', 'marketplace_screenshots', ['module_id'])

    # Module Dependencies
    op.create_table(
        'marketplace_dependencies',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('module_id', sa.Integer(), nullable=False),
        sa.Column('depends_on_id', sa.Integer(), nullable=False),
        sa.Column('min_version', sa.String(50), nullable=True),
        sa.Column('max_version', sa.String(50), nullable=True),
        sa.Column('version_constraint', sa.String(100), nullable=True),
        sa.Column('dependency_type', sa.String(20), default='required'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['module_id'], ['marketplace_modules.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['depends_on_id'], ['marketplace_modules.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('module_id', 'depends_on_id', name='uq_module_dependency'),
    )
    op.create_index('ix_marketplace_dependencies_id', 'marketplace_dependencies', ['id'])
    op.create_index('ix_marketplace_dependencies_module', 'marketplace_dependencies', ['module_id'])

    # Order Items
    op.create_table(
        'marketplace_order_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('order_id', sa.Integer(), nullable=False),
        sa.Column('module_id', sa.Integer(), nullable=True),
        sa.Column('version_id', sa.Integer(), nullable=True),
        sa.Column('module_name', sa.String(200), nullable=False),
        sa.Column('module_technical_name', sa.String(100), nullable=False),
        sa.Column('version_string', sa.String(50), nullable=True),
        sa.Column('license_type', sa.String(20), nullable=False),
        sa.Column('unit_price', sa.Numeric(10, 2), nullable=False),
        sa.Column('quantity', sa.Integer(), default=1),
        sa.Column('discount_amount', sa.Numeric(10, 2), default=0),
        sa.Column('total_price', sa.Numeric(10, 2), nullable=False),
        sa.Column('subscription_period', sa.String(20), nullable=True),
        sa.Column('subscription_months', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['order_id'], ['marketplace_orders.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['module_id'], ['marketplace_modules.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['version_id'], ['marketplace_module_versions.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_marketplace_order_items_id', 'marketplace_order_items', ['id'])
    op.create_index('ix_marketplace_order_items_order', 'marketplace_order_items', ['order_id'])

    # Coupons
    op.create_table(
        'marketplace_coupons',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(50), nullable=False),
        sa.Column('name', sa.String(200), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('discount_type', sa.String(20), nullable=False),
        sa.Column('discount_value', sa.Numeric(10, 2), nullable=False),
        sa.Column('max_discount', sa.Numeric(10, 2), nullable=True),
        sa.Column('applies_to', sa.String(20), default='all'),
        sa.Column('module_ids', postgresql.JSONB(), default=[]),
        sa.Column('publisher_ids', postgresql.JSONB(), default=[]),
        sa.Column('category_ids', postgresql.JSONB(), default=[]),
        sa.Column('min_order_amount', sa.Numeric(10, 2), nullable=True),
        sa.Column('valid_from', sa.DateTime(timezone=True), nullable=True),
        sa.Column('valid_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('max_uses', sa.Integer(), nullable=True),
        sa.Column('max_uses_per_user', sa.Integer(), default=1),
        sa.Column('current_uses', sa.Integer(), default=0),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code'),
    )
    op.create_index('ix_marketplace_coupons_id', 'marketplace_coupons', ['id'])
    op.create_index('ix_marketplace_coupons_code', 'marketplace_coupons', ['code'])
    op.create_index('ix_marketplace_coupons_active', 'marketplace_coupons', ['is_active'])

    # Carts
    op.create_table(
        'marketplace_carts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('session_id', sa.String(64), nullable=True),
        sa.Column('status', sa.String(20), default='active'),
        sa.Column('items', postgresql.JSONB(), default=[]),
        sa.Column('item_count', sa.Integer(), default=0),
        sa.Column('subtotal', sa.Numeric(12, 2), default=0),
        sa.Column('coupon_code', sa.String(50), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_marketplace_carts_id', 'marketplace_carts', ['id'])
    op.create_index('ix_marketplace_carts_user', 'marketplace_carts', ['user_id'])
    op.create_index('ix_marketplace_carts_session', 'marketplace_carts', ['session_id'])

    # Wishlists
    op.create_table(
        'marketplace_wishlists',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('module_id', sa.Integer(), nullable=False),
        sa.Column('notify_on_sale', sa.Boolean(), default=True),
        sa.Column('notify_on_update', sa.Boolean(), default=False),
        sa.Column('personal_note', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['module_id'], ['marketplace_modules.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'module_id', name='uq_wishlist_user_module'),
    )
    op.create_index('ix_marketplace_wishlists_id', 'marketplace_wishlists', ['id'])
    op.create_index('ix_marketplace_wishlists_user', 'marketplace_wishlists', ['user_id'])

    # Review Votes
    op.create_table(
        'marketplace_review_votes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('review_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('vote', sa.String(15), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['review_id'], ['marketplace_reviews.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('review_id', 'user_id', name='uq_review_vote_user'),
    )
    op.create_index('ix_marketplace_review_votes_id', 'marketplace_review_votes', ['id'])
    op.create_index('ix_marketplace_review_votes_review', 'marketplace_review_votes', ['review_id'])

    # Review Comments
    op.create_table(
        'marketplace_review_comments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('review_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('parent_id', sa.Integer(), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('status', sa.String(20), default='published'),
        sa.Column('is_publisher_reply', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['review_id'], ['marketplace_reviews.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['parent_id'], ['marketplace_review_comments.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_marketplace_review_comments_id', 'marketplace_review_comments', ['id'])
    op.create_index('ix_marketplace_review_comments_review', 'marketplace_review_comments', ['review_id'])

    # Review Reports
    op.create_table(
        'marketplace_review_reports',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('review_id', sa.Integer(), nullable=False),
        sa.Column('reporter_id', sa.Integer(), nullable=False),
        sa.Column('reason', sa.String(50), nullable=False),
        sa.Column('details', sa.Text(), nullable=True),
        sa.Column('evidence_urls', postgresql.JSONB(), default=[]),
        sa.Column('status', sa.String(20), default='pending'),
        sa.Column('resolution', sa.String(20), nullable=True),
        sa.Column('resolution_notes', sa.Text(), nullable=True),
        sa.Column('resolved_by', sa.Integer(), nullable=True),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['review_id'], ['marketplace_reviews.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['reporter_id'], ['users.id']),
        sa.ForeignKeyConstraint(['resolved_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('review_id', 'reporter_id', name='uq_review_report_user'),
    )
    op.create_index('ix_marketplace_review_reports_id', 'marketplace_review_reports', ['id'])
    op.create_index('ix_marketplace_review_reports_status', 'marketplace_review_reports', ['status'])

    # Search Queries
    op.create_table(
        'marketplace_search_queries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('session_id', sa.String(64), nullable=True),
        sa.Column('query', sa.String(500), nullable=False),
        sa.Column('query_normalized', sa.String(500), nullable=True),
        sa.Column('filters', postgresql.JSONB(), default={}),
        sa.Column('result_count', sa.Integer(), nullable=True),
        sa.Column('result_module_ids', postgresql.JSONB(), default=[]),
        sa.Column('clicked_result', sa.Boolean(), default=False),
        sa.Column('clicked_module_id', sa.Integer(), nullable=True),
        sa.Column('clicked_position', sa.Integer(), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('country_code', sa.String(2), nullable=True),
        sa.Column('search_date', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_marketplace_search_queries_id', 'marketplace_search_queries', ['id'])
    op.create_index('ix_marketplace_search_queries_query', 'marketplace_search_queries', ['query'])
    op.create_index('ix_marketplace_search_queries_date', 'marketplace_search_queries', ['search_date'])

    # Daily Module Stats
    op.create_table(
        'marketplace_daily_module_stats',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('module_id', sa.Integer(), nullable=False),
        sa.Column('stat_date', sa.Date(), nullable=False),
        sa.Column('view_count', sa.Integer(), default=0),
        sa.Column('unique_visitors', sa.Integer(), default=0),
        sa.Column('download_count', sa.Integer(), default=0),
        sa.Column('unique_downloaders', sa.Integer(), default=0),
        sa.Column('install_count', sa.Integer(), default=0),
        sa.Column('order_count', sa.Integer(), default=0),
        sa.Column('gross_revenue', sa.Numeric(12, 2), default=0),
        sa.Column('review_count', sa.Integer(), default=0),
        sa.Column('average_rating', sa.Integer(), nullable=True),
        sa.Column('view_to_download_rate', sa.Integer(), nullable=True),
        sa.Column('view_to_purchase_rate', sa.Integer(), nullable=True),
        sa.Column('top_countries', postgresql.JSONB(), default=[]),
        sa.ForeignKeyConstraint(['module_id'], ['marketplace_modules.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('module_id', 'stat_date', name='uq_daily_module_stats'),
    )
    op.create_index('ix_marketplace_daily_module_stats_id', 'marketplace_daily_module_stats', ['id'])
    op.create_index('ix_marketplace_daily_module_stats_module_date', 'marketplace_daily_module_stats', ['module_id', 'stat_date'])

    # Daily Platform Stats
    op.create_table(
        'marketplace_daily_platform_stats',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('stat_date', sa.Date(), nullable=False),
        sa.Column('new_users', sa.Integer(), default=0),
        sa.Column('active_users', sa.Integer(), default=0),
        sa.Column('new_publishers', sa.Integer(), default=0),
        sa.Column('new_modules', sa.Integer(), default=0),
        sa.Column('new_versions', sa.Integer(), default=0),
        sa.Column('total_modules', sa.Integer(), default=0),
        sa.Column('published_modules', sa.Integer(), default=0),
        sa.Column('total_views', sa.Integer(), default=0),
        sa.Column('unique_visitors', sa.Integer(), default=0),
        sa.Column('total_searches', sa.Integer(), default=0),
        sa.Column('total_downloads', sa.Integer(), default=0),
        sa.Column('unique_downloaders', sa.Integer(), default=0),
        sa.Column('total_orders', sa.Integer(), default=0),
        sa.Column('gross_revenue', sa.Numeric(12, 2), default=0),
        sa.Column('platform_fees', sa.Numeric(12, 2), default=0),
        sa.Column('new_reviews', sa.Integer(), default=0),
        sa.Column('average_rating', sa.Integer(), nullable=True),
        sa.Column('top_downloaded', postgresql.JSONB(), default=[]),
        sa.Column('top_viewed', postgresql.JSONB(), default=[]),
        sa.Column('top_purchased', postgresql.JSONB(), default=[]),
        sa.Column('top_countries', postgresql.JSONB(), default=[]),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('stat_date'),
    )
    op.create_index('ix_marketplace_daily_platform_stats_id', 'marketplace_daily_platform_stats', ['id'])
    op.create_index('ix_marketplace_daily_platform_stats_date', 'marketplace_daily_platform_stats', ['stat_date'])

    # Revenue Transactions
    op.create_table(
        'marketplace_revenue_transactions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('transaction_type', sa.String(20), nullable=False),
        sa.Column('order_id', sa.Integer(), nullable=True),
        sa.Column('payout_id', sa.Integer(), nullable=True),
        sa.Column('publisher_id', sa.Integer(), nullable=True),
        sa.Column('module_id', sa.Integer(), nullable=True),
        sa.Column('gross_amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('platform_fee', sa.Numeric(12, 2), nullable=False),
        sa.Column('net_amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('currency', sa.String(3), default='USD'),
        sa.Column('status', sa.String(20), default='pending'),
        sa.Column('stripe_transaction_id', sa.String(100), nullable=True),
        sa.Column('paypal_transaction_id', sa.String(100), nullable=True),
        sa.Column('transaction_date', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['order_id'], ['marketplace_orders.id']),
        sa.ForeignKeyConstraint(['payout_id'], ['marketplace_payouts.id']),
        sa.ForeignKeyConstraint(['publisher_id'], ['marketplace_publishers.id']),
        sa.ForeignKeyConstraint(['module_id'], ['marketplace_modules.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_marketplace_revenue_transactions_id', 'marketplace_revenue_transactions', ['id'])
    op.create_index('ix_marketplace_revenue_transactions_type_date', 'marketplace_revenue_transactions', ['transaction_type', 'transaction_date'])
    op.create_index('ix_marketplace_revenue_transactions_publisher', 'marketplace_revenue_transactions', ['publisher_id', 'transaction_date'])

    # Event Logs
    op.create_table(
        'marketplace_event_logs',
        sa.Column('id', sa.BigInteger(), nullable=False),
        sa.Column('event_type', sa.String(50), nullable=False),
        sa.Column('entity_type', sa.String(50), nullable=True),
        sa.Column('entity_id', sa.Integer(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('data', postgresql.JSONB(), default={}),
        sa.Column('event_metadata', postgresql.JSONB(), default={}),
        sa.Column('event_date', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_marketplace_event_logs_id', 'marketplace_event_logs', ['id'])
    op.create_index('ix_marketplace_event_logs_type', 'marketplace_event_logs', ['event_type'])
    op.create_index('ix_marketplace_event_logs_type_date', 'marketplace_event_logs', ['event_type', 'event_date'])
    op.create_index('ix_marketplace_event_logs_entity', 'marketplace_event_logs', ['entity_type', 'entity_id'])
    op.create_index('ix_marketplace_event_logs_user', 'marketplace_event_logs', ['user_id'])


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('marketplace_event_logs')
    op.drop_table('marketplace_revenue_transactions')
    op.drop_table('marketplace_daily_platform_stats')
    op.drop_table('marketplace_daily_module_stats')
    op.drop_table('marketplace_search_queries')
    op.drop_table('marketplace_review_reports')
    op.drop_table('marketplace_review_comments')
    op.drop_table('marketplace_review_votes')
    op.drop_table('marketplace_wishlists')
    op.drop_table('marketplace_carts')
    op.drop_table('marketplace_coupons')
    op.drop_table('marketplace_order_items')
    op.drop_table('marketplace_dependencies')
    op.drop_table('marketplace_screenshots')
    op.drop_table('marketplace_tags')
    op.drop_table('marketplace_publisher_invitations')
    op.drop_table('marketplace_views')
    op.drop_table('marketplace_downloads')
    op.drop_table('marketplace_rating_summaries')
    op.drop_table('marketplace_reviews')
    op.drop_table('marketplace_license_activations')
    op.drop_table('marketplace_licenses')
    op.drop_table('marketplace_orders')
    op.drop_table('marketplace_module_versions')
    op.drop_table('marketplace_modules')
    op.drop_table('marketplace_categories')
    op.drop_table('marketplace_payouts')
    op.drop_table('marketplace_publisher_stats')
    op.drop_table('marketplace_publishers')
