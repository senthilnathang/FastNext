"""
Marketplace Subscription Models

Handles subscription plans, active subscriptions, and invoicing.
No external payment gateway integration - uses internal billing.
"""

from datetime import datetime, date, timedelta
from decimal import Decimal
from enum import Enum
from typing import TYPE_CHECKING, List, Optional
import uuid

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    Index,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.base import TimestampMixin, AuditMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.company import Company
    from .module import MarketplaceModule


class BillingCycle(str, Enum):
    """Subscription billing cycles."""
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    SEMI_ANNUAL = "semi_annual"
    ANNUAL = "annual"
    LIFETIME = "lifetime"


class SubscriptionStatus(str, Enum):
    """Subscription statuses."""
    TRIALING = "trialing"
    ACTIVE = "active"
    PAST_DUE = "past_due"
    PAUSED = "paused"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class InvoiceStatus(str, Enum):
    """Invoice statuses."""
    DRAFT = "draft"
    PENDING = "pending"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class SubscriptionPlan(Base, TimestampMixin, AuditMixin):
    """
    Subscription plan/tier definition.

    Defines what features and pricing are available for each tier.

    Example:
        SubscriptionPlan(
            code="pro_monthly",
            name="Pro Plan - Monthly",
            tier="pro",
            billing_cycle="monthly",
            price=29.99,
            features={"max_users": 10, "api_calls": 10000}
        )
    """
    __tablename__ = "marketplace_subscription_plans"

    id = Column(Integer, primary_key=True, index=True)

    # Identification
    code = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)

    # Tier (for grouping plans)
    tier = Column(String(50), nullable=False, index=True)  # free, basic, pro, enterprise
    tier_order = Column(Integer, default=0)  # For sorting tiers

    # Module association (optional - for module-specific plans)
    module_id = Column(
        Integer,
        ForeignKey("marketplace_modules.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )

    # Billing
    billing_cycle = Column(String(20), nullable=False)  # monthly, quarterly, annual, lifetime
    price = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="USD")

    # Discounts for longer billing cycles
    annual_discount_percent = Column(Numeric(5, 2), default=Decimal("0.00"))

    # Trial
    has_trial = Column(Boolean, default=False)
    trial_days = Column(Integer, default=14)

    # Features as JSON
    features = Column(JSONB, default=dict)
    """
    Example features:
    {
        "max_users": 10,
        "max_projects": 100,
        "api_calls_per_month": 10000,
        "storage_gb": 50,
        "priority_support": true,
        "custom_branding": false,
        "sso_enabled": false
    }
    """

    # Limits as JSON (for API/feature limits)
    limits = Column(JSONB, default=dict)
    """
    Example limits:
    {
        "api_rate_limit": 1000,
        "max_projects": 100,
        "max_storage_gb": 50
    }
    """

    # Limits (legacy columns)
    max_instances = Column(Integer, default=1)
    max_users = Column(Integer, nullable=True)

    # Display
    sort_order = Column(Integer, default=10)
    is_popular = Column(Boolean, default=False)

    # Usage-based pricing (metered)
    is_metered = Column(Boolean, default=False)
    metered_unit = Column(String(50), nullable=True)  # api_calls, storage_gb, users
    metered_unit_price = Column(Numeric(10, 4), nullable=True)  # Price per unit
    metered_included = Column(Integer, nullable=True)  # Included units in base price

    # Status
    is_active = Column(Boolean, default=True, index=True)
    is_public = Column(Boolean, default=True)  # Visible in plan selector

    # Promotion
    badge_text = Column(String(50), nullable=True)  # "Popular", "Best Value"
    highlight = Column(Boolean, default=False)  # Featured plan

    # Relationships
    module = relationship("MarketplaceModule", backref="subscription_plans")
    subscriptions = relationship("Subscription", back_populates="plan")

    __table_args__ = (
        Index("ix_plans_tier", "tier"),
        Index("ix_plans_module_active", "module_id", "is_active"),
    )

    def __repr__(self) -> str:
        return f"<SubscriptionPlan {self.code}: {self.name}>"

    @property
    def monthly_equivalent(self) -> Decimal:
        """Get monthly equivalent price for comparison."""
        if self.billing_cycle == BillingCycle.MONTHLY.value:
            return self.price
        elif self.billing_cycle == BillingCycle.QUARTERLY.value:
            return self.price / 3
        elif self.billing_cycle == BillingCycle.SEMI_ANNUAL.value:
            return self.price / 6
        elif self.billing_cycle == BillingCycle.ANNUAL.value:
            return self.price / 12
        else:
            return self.price


class Subscription(Base, TimestampMixin):
    """
    Active subscription record.

    Tracks the subscription lifecycle for a user/company.

    Example:
        Subscription(
            subscription_id="sub_abc123",
            user_id=1,
            plan_id=1,
            status="active",
            current_period_start=date.today(),
            current_period_end=date.today() + timedelta(days=30)
        )
    """
    __tablename__ = "marketplace_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
        default=lambda: f"sub_{uuid.uuid4().hex[:16]}"
    )

    # Owner (either user or company)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)

    # Plan
    plan_id = Column(
        Integer,
        ForeignKey("marketplace_subscription_plans.id"),
        nullable=False,
        index=True
    )

    # Module (for module-specific subscriptions)
    module_id = Column(
        Integer,
        ForeignKey("marketplace_modules.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )

    # License link
    license_id = Column(
        Integer,
        ForeignKey("marketplace_licenses.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Status
    status = Column(String(20), default="active", index=True)

    # Billing Cycle
    billing_cycle = Column(String(20), nullable=False)  # Copied from plan at creation

    # Current Period
    current_period_start = Column(Date, nullable=False)
    current_period_end = Column(Date, nullable=False)

    # Trial
    trial_start = Column(Date, nullable=True)
    trial_end = Column(Date, nullable=True)

    # Cancellation
    cancel_at_period_end = Column(Boolean, default=False)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    cancellation_reason = Column(Text, nullable=True)

    # Pausing
    paused_at = Column(DateTime(timezone=True), nullable=True)
    resume_at = Column(Date, nullable=True)

    # Pricing (snapshot at subscription time)
    quantity = Column(Integer, default=1)  # Number of seats/licenses
    unit_price = Column(Numeric(10, 2), nullable=False)
    amount = Column(Numeric(12, 2), nullable=True)  # Total amount = unit_price * quantity
    currency = Column(String(3), default="USD")
    discount_percent = Column(Numeric(5, 2), default=Decimal("0.00"))

    # Payment
    payment_method = Column(String(50), nullable=True)  # credit_balance, bank_transfer, invoice
    auto_renew = Column(Boolean, default=True)

    # Usage (for metered billing)
    current_usage = Column(JSONB, default=dict)
    """
    Example:
    {
        "api_calls": 5432,
        "storage_gb": 12.5,
        "last_updated": "2024-01-15T10:00:00Z"
    }
    """

    # Billing Contact
    billing_email = Column(String(200), nullable=True)
    billing_name = Column(String(200), nullable=True)
    billing_address = Column(JSONB, nullable=True)

    # Extra data (custom fields)
    extra_data = Column(JSONB, default=dict)

    # Relationships
    user = relationship("User", backref="subscriptions")
    company = relationship("Company", backref="subscriptions")
    plan = relationship("SubscriptionPlan", back_populates="subscriptions")
    module = relationship("MarketplaceModule", backref="active_subscriptions")
    license = relationship("License", backref="subscription")
    invoices = relationship("SubscriptionInvoice", back_populates="subscription")
    usage_records = relationship(
        "SubscriptionUsage",
        back_populates="subscription",
        cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_subscriptions_user_status", "user_id", "status"),
        Index("ix_subscriptions_company_status", "company_id", "status"),
        Index("ix_subscriptions_period_end", "current_period_end"),
        Index("ix_subscriptions_module", "module_id"),
    )

    def __repr__(self) -> str:
        return f"<Subscription {self.subscription_id} - {self.status}>"

    @property
    def is_active(self) -> bool:
        """Check if subscription is currently active."""
        return self.status in [
            SubscriptionStatus.ACTIVE.value,
            SubscriptionStatus.TRIALING.value
        ]

    @property
    def is_trialing(self) -> bool:
        """Check if in trial period."""
        return self.status == SubscriptionStatus.TRIALING.value

    @property
    def days_until_renewal(self) -> int:
        """Days until next billing period."""
        if self.current_period_end:
            delta = self.current_period_end - date.today()
            return max(0, delta.days)
        return 0

    @property
    def owner_id(self) -> int:
        """Get owner ID (user or company)."""
        return self.company_id or self.user_id

    @property
    def owner_type(self) -> str:
        """Get owner type."""
        return "company" if self.company_id else "user"


class SubscriptionInvoice(Base, TimestampMixin):
    """
    Invoice for subscription billing.

    Generated for each billing period.

    Example:
        SubscriptionInvoice(
            invoice_number="INV-2024-0001",
            subscription_id=1,
            amount=29.99,
            status="pending"
        )
    """
    __tablename__ = "marketplace_subscription_invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String(50), unique=True, nullable=False, index=True)

    # Subscription
    subscription_id = Column(
        Integer,
        ForeignKey("marketplace_subscriptions.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Owner (denormalized for when subscription is deleted)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)

    # Billing Period
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)

    # Line Items
    line_items = Column(JSONB, default=list)
    """
    Example:
    [
        {"description": "Pro Plan - Monthly", "quantity": 1, "unit_price": 29.99, "amount": 29.99},
        {"description": "Additional API calls (5000)", "quantity": 5000, "unit_price": 0.001, "amount": 5.00}
    ]
    """

    # Amounts
    subtotal = Column(Numeric(12, 2), nullable=False)
    discount_amount = Column(Numeric(12, 2), default=Decimal("0.00"))
    tax_amount = Column(Numeric(12, 2), default=Decimal("0.00"))
    tax_rate = Column(Numeric(5, 2), nullable=True)
    total = Column(Numeric(12, 2), nullable=False)
    amount_paid = Column(Numeric(12, 2), default=Decimal("0.00"))
    amount_due = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="USD")

    # Status
    status = Column(String(20), default="draft", index=True)

    # Dates
    issue_date = Column(Date, nullable=False, default=date.today)
    due_date = Column(Date, nullable=False)
    paid_at = Column(DateTime(timezone=True), nullable=True)

    # Payment
    payment_method = Column(String(50), nullable=True)
    payment_reference = Column(String(200), nullable=True)  # Check number, transfer ID

    # Billing Details (snapshot)
    billing_name = Column(String(200), nullable=True)
    billing_email = Column(String(200), nullable=True)
    billing_address = Column(JSONB, nullable=True)
    billing_vat_number = Column(String(50), nullable=True)

    # Notes
    notes = Column(Text, nullable=True)
    internal_notes = Column(Text, nullable=True)

    # PDF
    pdf_url = Column(String(500), nullable=True)
    pdf_generated_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    subscription = relationship("Subscription", back_populates="invoices")
    user = relationship("User", backref="subscription_invoices")
    company = relationship("Company", backref="subscription_invoices")
    payments = relationship(
        "InvoicePayment",
        back_populates="invoice",
        cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_invoices_status_due", "status", "due_date"),
        Index("ix_invoices_user", "user_id"),
        Index("ix_invoices_company", "company_id"),
        Index("ix_invoices_subscription", "subscription_id"),
    )

    def __repr__(self) -> str:
        return f"<Invoice {self.invoice_number} - {self.total} {self.currency}>"

    @property
    def is_paid(self) -> bool:
        return self.status == InvoiceStatus.PAID.value

    @property
    def is_overdue(self) -> bool:
        if self.status == InvoiceStatus.PENDING.value:
            return date.today() > self.due_date
        return self.status == InvoiceStatus.OVERDUE.value


class InvoicePayment(Base, TimestampMixin):
    """
    Payment record for invoices.

    Supports partial payments and multiple payment methods.
    """
    __tablename__ = "marketplace_invoice_payments"

    id = Column(Integer, primary_key=True, index=True)

    invoice_id = Column(
        Integer,
        ForeignKey("marketplace_subscription_invoices.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Amount
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="USD")

    # Payment Details
    payment_method = Column(String(50), nullable=False)  # credit_balance, bank_transfer, check, cash
    payment_reference = Column(String(200), nullable=True)
    payment_date = Column(Date, nullable=False, default=date.today)

    # Notes
    notes = Column(Text, nullable=True)

    # Recorded By
    recorded_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    invoice = relationship("SubscriptionInvoice", back_populates="payments")
    recorded_by_user = relationship("User")

    __table_args__ = (
        Index("ix_payments_invoice", "invoice_id"),
        Index("ix_payments_date", "payment_date"),
    )


class SubscriptionUsage(Base, TimestampMixin):
    """
    Usage tracking for metered billing.

    Records usage events for subscriptions with metered features.
    """
    __tablename__ = "marketplace_subscription_usage"

    id = Column(Integer, primary_key=True, index=True)

    subscription_id = Column(
        Integer,
        ForeignKey("marketplace_subscriptions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Usage Type
    metric = Column(String(50), nullable=False, index=True)  # api_calls, storage_gb, users

    # Period
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)

    # Recorded
    recorded_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Quantity
    quantity = Column(Numeric(14, 4), nullable=False)

    # Pricing
    unit_price = Column(Numeric(10, 4), nullable=True)
    total_amount = Column(Numeric(12, 2), nullable=True)

    # Included in plan
    included_quantity = Column(Numeric(14, 4), default=Decimal("0"))
    billable_quantity = Column(Numeric(14, 4), nullable=True)

    # Status
    billed = Column(Boolean, default=False)
    invoice_id = Column(
        Integer,
        ForeignKey("marketplace_subscription_invoices.id", ondelete="SET NULL"),
        nullable=True
    )

    # Relationships
    subscription = relationship("Subscription", back_populates="usage_records")
    invoice = relationship("SubscriptionInvoice")

    __table_args__ = (
        Index("ix_usage_subscription_period", "subscription_id", "period_start", "period_end"),
        Index("ix_usage_metric", "metric"),
        UniqueConstraint(
            "subscription_id", "metric", "period_start", "period_end",
            name="uq_usage_subscription_metric_period"
        ),
    )


class CreditBalance(Base, TimestampMixin):
    """
    Credit balance for prepaid billing.

    Users/companies can add credits to pay for subscriptions.
    """
    __tablename__ = "marketplace_credit_balances"

    id = Column(Integer, primary_key=True, index=True)

    # Owner
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)

    # Balance
    balance = Column(Numeric(14, 2), default=Decimal("0.00"))
    currency = Column(String(3), default="USD")

    # Lifetime totals
    total_credits = Column(Numeric(14, 2), default=Decimal("0.00"))
    total_debits = Column(Numeric(14, 2), default=Decimal("0.00"))

    # Low balance alert
    low_balance_threshold = Column(Numeric(12, 2), nullable=True)
    low_balance_notified_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", backref="credit_balance")
    company = relationship("Company", backref="credit_balance")
    transactions = relationship(
        "CreditTransaction",
        back_populates="balance_record",
        cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("user_id", name="uq_credit_user"),
        UniqueConstraint("company_id", name="uq_credit_company"),
    )


class CreditTransaction(Base, TimestampMixin):
    """
    Credit transaction history.

    Tracks all credit additions and deductions.
    """
    __tablename__ = "marketplace_credit_transactions"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
        default=lambda: f"txn_{uuid.uuid4().hex[:16]}"
    )

    # Balance Record
    balance_id = Column(
        Integer,
        ForeignKey("marketplace_credit_balances.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Transaction Type
    transaction_type = Column(String(20), nullable=False)  # credit, debit, refund, adjustment

    # Amount
    amount = Column(Numeric(12, 2), nullable=False)  # Positive for credits, negative for debits
    balance_before = Column(Numeric(14, 2), nullable=False)
    balance_after = Column(Numeric(14, 2), nullable=False)
    currency = Column(String(3), default="USD")

    # Reference
    reference_type = Column(String(50), nullable=True)  # invoice, subscription, refund, manual
    reference_id = Column(Integer, nullable=True)

    # Description
    description = Column(String(500), nullable=True)

    # Extra data (custom fields)
    extra_data = Column(JSONB, default=dict)

    # Relationships
    balance_record = relationship("CreditBalance", back_populates="transactions")

    __table_args__ = (
        Index("ix_credit_tx_balance", "balance_id"),
        Index("ix_credit_tx_type", "transaction_type"),
        Index("ix_credit_tx_reference", "reference_type", "reference_id"),
    )


class SubscriptionEvent(Base, TimestampMixin):
    """
    Subscription lifecycle events.

    Tracks all changes to subscriptions for audit and analytics.
    """
    __tablename__ = "marketplace_subscription_events"

    id = Column(Integer, primary_key=True, index=True)

    subscription_id = Column(
        Integer,
        ForeignKey("marketplace_subscriptions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Event Type
    event_type = Column(String(50), nullable=False, index=True)
    """
    Event types:
    - created, activated, renewed
    - paused, resumed
    - upgraded, downgraded
    - cancelled, expired
    - payment_succeeded, payment_failed
    - trial_started, trial_ended
    """

    # Event Data
    data = Column(JSONB, default=dict)
    """
    Example for upgrade:
    {
        "previous_plan_id": 1,
        "new_plan_id": 2,
        "prorated_amount": 15.00
    }
    """

    # Triggered By
    triggered_by = Column(String(50), nullable=True)  # user, system, admin
    triggered_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    subscription = relationship("Subscription", backref="events")
    triggered_by_user = relationship("User")

    __table_args__ = (
        Index("ix_sub_events_subscription", "subscription_id"),
        Index("ix_sub_events_type", "event_type"),
        Index("ix_sub_events_created", "created_at"),
    )
