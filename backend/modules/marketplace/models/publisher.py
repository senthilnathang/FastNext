"""
Marketplace Publisher Models

Publisher accounts for module developers and companies.
"""

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    Boolean,
    Column,
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
    from .module import MarketplaceModule


class Publisher(Base, TimestampMixin, AuditMixin):
    """
    Module publisher account.

    Publishers can be individual developers or companies that
    publish modules to the marketplace.
    """
    __tablename__ = "marketplace_publishers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)

    # Profile
    company_name = Column(String(200), nullable=True)
    display_name = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    bio = Column(Text, nullable=True)
    website = Column(String(500), nullable=True)
    support_email = Column(String(200), nullable=True)
    support_url = Column(String(500), nullable=True)

    # Branding
    logo_url = Column(String(500), nullable=True)
    banner_url = Column(String(500), nullable=True)
    primary_color = Column(String(7), nullable=True)  # Hex color

    # Verification
    verified = Column(Boolean, default=False)
    verification_date = Column(DateTime(timezone=True), nullable=True)
    verification_type = Column(String(20), nullable=True)  # identity, business, partner

    # Status
    status = Column(String(20), default="pending", index=True)  # pending, active, suspended, banned
    status_reason = Column(Text, nullable=True)
    suspended_at = Column(DateTime(timezone=True), nullable=True)

    # Payment Settings
    stripe_account_id = Column(String(100), nullable=True)
    stripe_account_status = Column(String(20), nullable=True)
    paypal_email = Column(String(200), nullable=True)
    payout_method = Column(String(20), default="stripe")  # stripe, paypal, bank
    payout_threshold = Column(Numeric(10, 2), default=Decimal("50.00"))

    # Commission
    commission_rate = Column(Numeric(5, 2), default=Decimal("30.00"))  # Platform fee %
    custom_commission = Column(Boolean, default=False)

    # Social Links
    social_links = Column(JSONB, default=dict)  # {github, twitter, linkedin, etc}

    # Settings
    notification_settings = Column(JSONB, default=dict)
    api_key_hash = Column(String(64), nullable=True)  # For CLI publishing

    # Relationships
    user: "User" = relationship(
        "User",
        backref="publisher_profile",
        foreign_keys=[user_id]
    )
    modules: List["MarketplaceModule"] = relationship(
        "MarketplaceModule",
        back_populates="publisher",
        cascade="all, delete-orphan"
    )
    stats: List["PublisherStats"] = relationship(
        "PublisherStats",
        back_populates="publisher",
        cascade="all, delete-orphan"
    )
    payouts: List["PublisherPayout"] = relationship(
        "PublisherPayout",
        back_populates="publisher",
        cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_marketplace_publishers_status", "status"),
        Index("ix_marketplace_publishers_verified", "verified"),
    )

    def __repr__(self) -> str:
        return f"<Publisher {self.display_name} ({self.slug})>"

    @property
    def is_active(self) -> bool:
        return self.status == "active"

    @property
    def can_publish(self) -> bool:
        return self.status == "active"

    @property
    def net_commission_rate(self) -> Decimal:
        """Publisher's earnings percentage (100 - platform fee)."""
        return Decimal("100.00") - self.commission_rate


class PublisherStats(Base, TimestampMixin):
    """
    Aggregated publisher statistics.

    Pre-calculated stats for dashboard performance.
    """
    __tablename__ = "marketplace_publisher_stats"

    id = Column(Integer, primary_key=True, index=True)
    publisher_id = Column(
        Integer,
        ForeignKey("marketplace_publishers.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Counts
    total_modules = Column(Integer, default=0)
    published_modules = Column(Integer, default=0)
    total_versions = Column(Integer, default=0)

    # Downloads
    total_downloads = Column(Integer, default=0)
    downloads_this_period = Column(Integer, default=0)

    # Revenue
    total_revenue = Column(Numeric(12, 2), default=Decimal("0.00"))
    revenue_this_period = Column(Numeric(12, 2), default=Decimal("0.00"))
    total_earnings = Column(Numeric(12, 2), default=Decimal("0.00"))  # After commission
    pending_earnings = Column(Numeric(12, 2), default=Decimal("0.00"))

    # Reviews
    average_rating = Column(Numeric(3, 2), nullable=True)
    total_reviews = Column(Integer, default=0)
    reviews_this_period = Column(Integer, default=0)

    # Engagement
    total_views = Column(Integer, default=0)
    views_this_period = Column(Integer, default=0)

    # Period
    period = Column(String(10), default="all", index=True)  # day, week, month, year, all
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)

    # Calculation
    calculated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    # Relationships
    publisher: "Publisher" = relationship("Publisher", back_populates="stats")

    __table_args__ = (
        UniqueConstraint("publisher_id", "period", "period_start", name="uq_publisher_stats_period"),
        Index("ix_publisher_stats_period", "period"),
    )


class PublisherPayout(Base, TimestampMixin):
    """
    Publisher earnings and payouts.

    Tracks money owed and paid to publishers.
    """
    __tablename__ = "marketplace_payouts"

    id = Column(Integer, primary_key=True, index=True)
    publisher_id = Column(
        Integer,
        ForeignKey("marketplace_publishers.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    payout_number = Column(String(50), unique=True, nullable=False, index=True)

    # Amount
    gross_amount = Column(Numeric(12, 2), nullable=False)
    platform_fee = Column(Numeric(12, 2), nullable=False)
    net_amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="USD")

    # Period
    period_start = Column(DateTime(timezone=True), nullable=False)
    period_end = Column(DateTime(timezone=True), nullable=False)

    # Included Orders
    order_count = Column(Integer, default=0)
    order_ids = Column(JSONB, default=list)

    # Payout Details
    status = Column(String(20), default="pending", index=True)  # pending, processing, completed, failed
    payout_method = Column(String(20), nullable=True)  # stripe, paypal, bank

    # External References
    stripe_payout_id = Column(String(100), nullable=True)
    stripe_transfer_id = Column(String(100), nullable=True)
    paypal_batch_id = Column(String(100), nullable=True)

    # Timing
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    initiated_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Failure Handling
    failure_reason = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)
    last_retry_at = Column(DateTime(timezone=True), nullable=True)

    # Invoice/Receipt
    invoice_url = Column(String(500), nullable=True)

    # Relationships
    publisher: "Publisher" = relationship("Publisher", back_populates="payouts")

    __table_args__ = (
        Index("ix_payouts_status", "status"),
        Index("ix_payouts_period", "period_start", "period_end"),
    )

    def __repr__(self) -> str:
        return f"<Payout {self.payout_number} - {self.net_amount} {self.currency}>"


class PublisherInvitation(Base, TimestampMixin):
    """
    Invitation to become a publisher.

    For invite-only publisher programs or team invites.
    """
    __tablename__ = "marketplace_publisher_invitations"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(200), nullable=False, index=True)
    token = Column(String(64), unique=True, nullable=False, index=True)

    # Inviter
    invited_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    publisher_id = Column(Integer, ForeignKey("marketplace_publishers.id"), nullable=True)

    # Type
    invitation_type = Column(String(20), default="publisher")  # publisher, team_member
    role = Column(String(20), nullable=True)  # For team invites: admin, editor, viewer

    # Status
    status = Column(String(20), default="pending")  # pending, accepted, expired, revoked
    expires_at = Column(DateTime(timezone=True), nullable=False)
    accepted_at = Column(DateTime(timezone=True), nullable=True)

    # Custom commission for invited publishers
    custom_commission_rate = Column(Numeric(5, 2), nullable=True)

    # Message
    personal_message = Column(Text, nullable=True)

    __table_args__ = (
        Index("ix_invitations_email_status", "email", "status"),
    )
