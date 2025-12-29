"""
Marketplace Payout Models

Publisher payout management and processing.
"""

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional, List

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
    Index,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from .publisher import Publisher


class PayoutBatch(Base, TimestampMixin):
    """
    Batch payout processing for publishers.

    Groups multiple publisher payouts into a single processing batch.
    """
    __tablename__ = "marketplace_payout_batches"

    id = Column(Integer, primary_key=True, index=True)

    # Batch identification
    batch_id = Column(String(64), unique=True, nullable=False, index=True)
    batch_type = Column(String(20), default="regular")  # regular, manual, bonus

    # Period
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)

    # Totals
    total_payouts = Column(Integer, default=0)
    total_gross_amount = Column(Numeric(14, 2), default=Decimal("0.00"))
    total_platform_fees = Column(Numeric(14, 2), default=Decimal("0.00"))
    total_net_amount = Column(Numeric(14, 2), default=Decimal("0.00"))
    currency = Column(String(3), default="USD")

    # Status
    status = Column(String(20), default="draft", index=True)  # draft, pending, processing, completed, failed, cancelled

    # Processing
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Success/failure counts
    success_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    pending_count = Column(Integer, default=0)

    # External references
    stripe_batch_id = Column(String(100), nullable=True)
    paypal_batch_id = Column(String(100), nullable=True)

    # Processing metadata
    processing_notes = Column(Text, nullable=True)
    error_summary = Column(JSONB, nullable=True)

    # Created by
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    payouts = relationship("PublisherPayoutItem", back_populates="batch", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_payout_batches_status", "status"),
        Index("ix_payout_batches_period", "period_start", "period_end"),
    )

    def __repr__(self) -> str:
        return f"<PayoutBatch {self.batch_id[:8]}... - {self.status}>"


class PublisherPayoutItem(Base, TimestampMixin):
    """
    Individual payout item within a batch.

    One per publisher per batch.
    """
    __tablename__ = "marketplace_payout_items"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(
        Integer,
        ForeignKey("marketplace_payout_batches.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    publisher_id = Column(
        Integer,
        ForeignKey("marketplace_publishers.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Amounts
    gross_amount = Column(Numeric(12, 2), nullable=False)
    platform_fee = Column(Numeric(12, 2), nullable=False)
    adjustments = Column(Numeric(12, 2), default=Decimal("0.00"))  # Refunds, chargebacks
    net_amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="USD")

    # Breakdown
    order_count = Column(Integer, default=0)
    order_ids = Column(JSONB, default=list)
    module_breakdown = Column(JSONB, default=list)  # [{module_id, amount, count}]

    # Status
    status = Column(String(20), default="pending", index=True)  # pending, processing, completed, failed, on_hold

    # Payout method
    payout_method = Column(String(20), nullable=True)  # stripe, paypal, bank_transfer
    payout_destination = Column(String(200), nullable=True)  # Account ID or email

    # External references
    stripe_transfer_id = Column(String(100), nullable=True)
    stripe_payout_id = Column(String(100), nullable=True)
    paypal_payout_item_id = Column(String(100), nullable=True)

    # Processing
    processed_at = Column(DateTime(timezone=True), nullable=True)
    arrival_date = Column(Date, nullable=True)  # Expected arrival

    # Error handling
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    last_error = Column(Text, nullable=True)
    error_code = Column(String(50), nullable=True)

    # Hold reasons
    on_hold_reason = Column(Text, nullable=True)
    on_hold_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    on_hold_at = Column(DateTime(timezone=True), nullable=True)

    # Invoice
    invoice_id = Column(String(100), nullable=True)
    invoice_url = Column(String(500), nullable=True)

    # Relationships
    batch = relationship("PayoutBatch", back_populates="payouts")
    publisher = relationship("Publisher")

    __table_args__ = (
        UniqueConstraint("batch_id", "publisher_id", name="uq_payout_batch_publisher"),
        Index("ix_payout_items_status", "status"),
        Index("ix_payout_items_publisher", "publisher_id"),
    )

    def __repr__(self) -> str:
        return f"<PayoutItem publisher={self.publisher_id} amount={self.net_amount}>"


class PayoutSchedule(Base, TimestampMixin):
    """
    Payout scheduling configuration.

    Defines when payouts are processed.
    """
    __tablename__ = "marketplace_payout_schedules"

    id = Column(Integer, primary_key=True, index=True)

    # Schedule type
    schedule_type = Column(String(20), nullable=False)  # weekly, biweekly, monthly
    day_of_week = Column(Integer, nullable=True)  # 0=Monday, 6=Sunday (for weekly)
    day_of_month = Column(Integer, nullable=True)  # 1-28 (for monthly)

    # Minimum threshold
    minimum_amount = Column(Numeric(10, 2), default=Decimal("50.00"))
    currency = Column(String(3), default="USD")

    # Processing window
    processing_hour = Column(Integer, default=9)  # UTC hour
    processing_timezone = Column(String(50), default="UTC")

    # Status
    is_active = Column(Boolean, default=True)

    # Last run
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    next_run_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_payout_schedules_active", "is_active"),
    )


class PayoutAdjustment(Base, TimestampMixin):
    """
    Manual adjustments to publisher balances.

    For refunds, chargebacks, bonuses, corrections.
    """
    __tablename__ = "marketplace_payout_adjustments"

    id = Column(Integer, primary_key=True, index=True)
    publisher_id = Column(
        Integer,
        ForeignKey("marketplace_publishers.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Adjustment details
    adjustment_type = Column(String(30), nullable=False)  # refund, chargeback, bonus, correction, fee
    amount = Column(Numeric(12, 2), nullable=False)  # Positive = credit, negative = debit
    currency = Column(String(3), default="USD")

    # Reference
    reference_type = Column(String(50), nullable=True)  # order, module, payout
    reference_id = Column(Integer, nullable=True)
    external_reference = Column(String(100), nullable=True)

    # Description
    description = Column(Text, nullable=False)
    internal_notes = Column(Text, nullable=True)

    # Status
    status = Column(String(20), default="pending", index=True)  # pending, applied, cancelled
    applied_at = Column(DateTime(timezone=True), nullable=True)
    applied_to_batch_id = Column(Integer, ForeignKey("marketplace_payout_batches.id"), nullable=True)

    # Created by
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    publisher = relationship("Publisher")

    __table_args__ = (
        Index("ix_adjustments_publisher", "publisher_id"),
        Index("ix_adjustments_status", "status"),
        Index("ix_adjustments_type", "adjustment_type"),
    )


class PublisherBalance(Base, TimestampMixin):
    """
    Publisher balance tracking.

    Real-time balance for each publisher.
    """
    __tablename__ = "marketplace_publisher_balances"

    id = Column(Integer, primary_key=True, index=True)
    publisher_id = Column(
        Integer,
        ForeignKey("marketplace_publishers.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True
    )

    # Balances
    available_balance = Column(Numeric(14, 2), default=Decimal("0.00"))
    pending_balance = Column(Numeric(14, 2), default=Decimal("0.00"))
    reserved_balance = Column(Numeric(14, 2), default=Decimal("0.00"))  # For chargebacks
    currency = Column(String(3), default="USD")

    # Lifetime totals
    lifetime_earnings = Column(Numeric(14, 2), default=Decimal("0.00"))
    lifetime_payouts = Column(Numeric(14, 2), default=Decimal("0.00"))
    lifetime_adjustments = Column(Numeric(14, 2), default=Decimal("0.00"))

    # Last activity
    last_earning_at = Column(DateTime(timezone=True), nullable=True)
    last_payout_at = Column(DateTime(timezone=True), nullable=True)

    # Payout settings
    auto_payout_enabled = Column(Boolean, default=True)
    payout_threshold = Column(Numeric(10, 2), nullable=True)  # Override default

    # Relationships
    publisher = relationship("Publisher", backref="balance")

    def __repr__(self) -> str:
        return f"<PublisherBalance publisher={self.publisher_id} available={self.available_balance}>"

    @property
    def total_balance(self) -> Decimal:
        """Total balance including pending."""
        return self.available_balance + self.pending_balance


class BalanceTransaction(Base, TimestampMixin):
    """
    Ledger of all balance changes.

    Provides audit trail for financial transactions.
    """
    __tablename__ = "marketplace_balance_transactions"

    id = Column(Integer, primary_key=True, index=True)
    publisher_id = Column(
        Integer,
        ForeignKey("marketplace_publishers.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Transaction details
    transaction_type = Column(String(30), nullable=False)  # sale, refund, payout, adjustment, fee
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="USD")

    # Balance impact
    balance_type = Column(String(20), nullable=False)  # available, pending, reserved
    balance_before = Column(Numeric(14, 2), nullable=False)
    balance_after = Column(Numeric(14, 2), nullable=False)

    # Reference
    reference_type = Column(String(50), nullable=True)
    reference_id = Column(Integer, nullable=True)

    # Description
    description = Column(String(500), nullable=True)

    # Extra data
    extra_data = Column(JSONB, default=dict)

    # Relationships
    publisher = relationship("Publisher")

    __table_args__ = (
        Index("ix_balance_tx_publisher", "publisher_id"),
        Index("ix_balance_tx_type", "transaction_type"),
        Index("ix_balance_tx_created", "created_at"),
    )
