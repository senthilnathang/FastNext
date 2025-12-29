"""
Marketplace License and Order Models

Handles purchases, licenses, and subscriptions.
"""

from datetime import datetime, date
from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional

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
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User
    from .module import MarketplaceModule, ModuleVersion


class Order(Base, TimestampMixin):
    """
    Purchase order for marketplace modules.

    Represents a single purchase transaction.
    """
    __tablename__ = "marketplace_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(50), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Items (denormalized for history)
    items = Column(JSONB, default=list)  # [{module_id, version_id, name, price, quantity, license_type}]

    # Pricing
    subtotal = Column(Numeric(12, 2), nullable=False)
    discount_amount = Column(Numeric(12, 2), default=Decimal("0.00"))
    discount_code = Column(String(50), nullable=True)
    tax_amount = Column(Numeric(12, 2), default=Decimal("0.00"))
    tax_rate = Column(Numeric(5, 2), nullable=True)
    total = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="USD")

    # Payment
    payment_method = Column(String(20), nullable=True)  # stripe, paypal
    payment_status = Column(String(20), default="pending", index=True)  # pending, processing, completed, failed, refunded

    # Stripe
    stripe_payment_intent_id = Column(String(100), nullable=True, index=True)
    stripe_checkout_session_id = Column(String(100), nullable=True)
    stripe_customer_id = Column(String(100), nullable=True)

    # PayPal
    paypal_order_id = Column(String(100), nullable=True)
    paypal_capture_id = Column(String(100), nullable=True)

    # Timing
    paid_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Status
    status = Column(String(20), default="pending", index=True)  # pending, completed, cancelled, refunded, failed

    # Refund
    refund_amount = Column(Numeric(12, 2), nullable=True)
    refund_reason = Column(Text, nullable=True)
    refunded_at = Column(DateTime(timezone=True), nullable=True)

    # Billing
    billing_email = Column(String(200), nullable=True)
    billing_name = Column(String(200), nullable=True)
    billing_company = Column(String(200), nullable=True)
    billing_address = Column(JSONB, nullable=True)  # {line1, line2, city, state, postal_code, country}
    billing_vat_number = Column(String(50), nullable=True)

    # Invoice
    invoice_number = Column(String(50), nullable=True)
    invoice_url = Column(String(500), nullable=True)
    invoice_pdf_url = Column(String(500), nullable=True)

    # Metadata
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    referrer = Column(String(500), nullable=True)

    # Relationships
    user = relationship("User", backref="marketplace_orders")
    licenses: List["License"] = relationship("License", back_populates="order")
    order_items: List["OrderItem"] = relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_orders_user_status", "user_id", "status"),
        Index("ix_orders_payment_status", "payment_status"),
        Index("ix_orders_created", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<Order {self.order_number} - {self.total} {self.currency}>"

    @property
    def is_paid(self) -> bool:
        return self.payment_status == "completed"


class OrderItem(Base, TimestampMixin):
    """
    Individual items in an order.

    Normalized for complex order handling.
    """
    __tablename__ = "marketplace_order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(
        Integer,
        ForeignKey("marketplace_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    module_id = Column(
        Integer,
        ForeignKey("marketplace_modules.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    version_id = Column(
        Integer,
        ForeignKey("marketplace_module_versions.id", ondelete="SET NULL"),
        nullable=True
    )

    # Snapshot (in case module changes/deleted)
    module_name = Column(String(200), nullable=False)
    module_technical_name = Column(String(100), nullable=False)
    version_string = Column(String(50), nullable=True)

    # Pricing
    license_type = Column(String(20), nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    quantity = Column(Integer, default=1)
    discount_amount = Column(Numeric(10, 2), default=Decimal("0.00"))
    total_price = Column(Numeric(10, 2), nullable=False)

    # Subscription details
    subscription_period = Column(String(20), nullable=True)  # monthly, yearly
    subscription_months = Column(Integer, nullable=True)

    # Relationships
    order: "Order" = relationship("Order", back_populates="order_items")
    module = relationship("MarketplaceModule")
    version = relationship("ModuleVersion")

    __table_args__ = (
        Index("ix_order_items_module", "module_id"),
    )


class License(Base, TimestampMixin):
    """
    Module license/entitlement.

    Grants access to use a module.
    """
    __tablename__ = "marketplace_licenses"

    id = Column(Integer, primary_key=True, index=True)
    license_key = Column(String(64), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    module_id = Column(
        Integer,
        ForeignKey("marketplace_modules.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    order_id = Column(
        Integer,
        ForeignKey("marketplace_orders.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # License Type
    license_type = Column(String(20), nullable=False, index=True)  # free, purchase, subscription, trial, dev
    tier = Column(String(20), nullable=True)  # basic, pro, enterprise

    # Status
    status = Column(String(20), default="active", index=True)  # active, expired, cancelled, suspended, revoked

    # Validity
    issued_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    activated_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)

    # Trial
    is_trial = Column(Boolean, default=False)
    trial_ends_at = Column(DateTime(timezone=True), nullable=True)
    converted_from_trial = Column(Boolean, default=False)

    # Usage Limits
    max_instances = Column(Integer, default=1)
    max_users = Column(Integer, nullable=True)  # Per instance
    instance_domains = Column(JSONB, default=list)  # Allowed domains

    # Current Usage
    active_instances = Column(Integer, default=0)
    last_verified_at = Column(DateTime(timezone=True), nullable=True)

    # Subscription
    subscription_id = Column(String(100), nullable=True, index=True)  # Stripe subscription
    subscription_status = Column(String(20), nullable=True)
    subscription_period_start = Column(DateTime(timezone=True), nullable=True)
    subscription_period_end = Column(DateTime(timezone=True), nullable=True)
    subscription_cancelled_at = Column(DateTime(timezone=True), nullable=True)
    subscription_cancel_at_period_end = Column(Boolean, default=False)

    # Version Access
    entitled_versions = Column(JSONB, default=list)  # Empty = all versions
    max_major_version = Column(Integer, nullable=True)  # For one-time purchases

    # Notes
    internal_notes = Column(Text, nullable=True)
    revocation_reason = Column(Text, nullable=True)

    # Relationships
    user = relationship("User", backref="marketplace_licenses")
    module: "MarketplaceModule" = relationship("MarketplaceModule", back_populates="licenses")
    order = relationship("Order", back_populates="licenses")
    activations: List["LicenseActivation"] = relationship(
        "LicenseActivation",
        back_populates="license",
        cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("user_id", "module_id", "license_type", name="uq_user_module_license"),
        Index("ix_licenses_status_expires", "status", "expires_at"),
        Index("ix_licenses_subscription", "subscription_id"),
    )

    def __repr__(self) -> str:
        return f"<License {self.license_key[:8]}... for module {self.module_id}>"

    @property
    def is_valid(self) -> bool:
        """Check if license is currently valid."""
        if self.status != "active":
            return False
        if self.expires_at and datetime.utcnow() > self.expires_at:
            return False
        return True

    @property
    def can_activate(self) -> bool:
        """Check if license can accept new activations."""
        return self.is_valid and self.active_instances < self.max_instances


class LicenseActivation(Base, TimestampMixin):
    """
    License activation record per instance.

    Tracks where a license is being used.
    """
    __tablename__ = "marketplace_license_activations"

    id = Column(Integer, primary_key=True, index=True)
    license_id = Column(
        Integer,
        ForeignKey("marketplace_licenses.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Instance Identification
    instance_id = Column(String(64), nullable=False, index=True)  # Unique machine/instance ID
    instance_name = Column(String(200), nullable=True)  # Friendly name

    # Network Info
    domain = Column(String(200), nullable=True)
    ip_address = Column(String(45), nullable=True)
    server_info = Column(JSONB, nullable=True)  # OS, Python version, etc.

    # Status
    status = Column(String(20), default="active", index=True)  # active, deactivated
    activated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    deactivated_at = Column(DateTime(timezone=True), nullable=True)

    # Verification
    last_check = Column(DateTime(timezone=True), nullable=True)
    check_count = Column(Integer, default=0)
    last_check_ip = Column(String(45), nullable=True)

    # Relationships
    license: "License" = relationship("License", back_populates="activations")

    __table_args__ = (
        UniqueConstraint("license_id", "instance_id", name="uq_license_instance"),
        Index("ix_activations_status", "status"),
        Index("ix_activations_instance", "instance_id"),
    )


class Coupon(Base, TimestampMixin):
    """
    Discount coupons for marketplace.
    """
    __tablename__ = "marketplace_coupons"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=True)
    description = Column(Text, nullable=True)

    # Discount
    discount_type = Column(String(20), nullable=False)  # percentage, fixed
    discount_value = Column(Numeric(10, 2), nullable=False)
    max_discount = Column(Numeric(10, 2), nullable=True)  # Cap for percentage discounts

    # Applicability
    applies_to = Column(String(20), default="all")  # all, specific_modules, specific_publishers
    module_ids = Column(JSONB, default=list)
    publisher_ids = Column(JSONB, default=list)
    category_ids = Column(JSONB, default=list)
    min_order_amount = Column(Numeric(10, 2), nullable=True)

    # Validity
    valid_from = Column(DateTime(timezone=True), nullable=True)
    valid_until = Column(DateTime(timezone=True), nullable=True)

    # Usage Limits
    max_uses = Column(Integer, nullable=True)
    max_uses_per_user = Column(Integer, default=1)
    current_uses = Column(Integer, default=0)

    # Status
    is_active = Column(Boolean, default=True, index=True)

    # Creator
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    __table_args__ = (
        Index("ix_coupons_active_valid", "is_active", "valid_from", "valid_until"),
    )

    @property
    def is_valid(self) -> bool:
        """Check if coupon is currently valid."""
        if not self.is_active:
            return False
        now = datetime.utcnow()
        if self.valid_from and now < self.valid_from:
            return False
        if self.valid_until and now > self.valid_until:
            return False
        if self.max_uses and self.current_uses >= self.max_uses:
            return False
        return True


class Cart(Base, TimestampMixin):
    """
    Shopping cart for marketplace.
    """
    __tablename__ = "marketplace_carts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    session_id = Column(String(64), nullable=True, index=True)  # For anonymous carts

    # Status
    status = Column(String(20), default="active")  # active, abandoned, converted

    # Items
    items = Column(JSONB, default=list)  # [{module_id, version_id, license_type, quantity}]

    # Totals (cached)
    item_count = Column(Integer, default=0)
    subtotal = Column(Numeric(12, 2), default=Decimal("0.00"))

    # Coupon
    coupon_code = Column(String(50), nullable=True)

    # Expiry
    expires_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", backref="marketplace_cart")

    __table_args__ = (
        Index("ix_carts_user_status", "user_id", "status"),
        Index("ix_carts_session", "session_id"),
    )


class Wishlist(Base, TimestampMixin):
    """
    User wishlist for modules.
    """
    __tablename__ = "marketplace_wishlists"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    module_id = Column(
        Integer,
        ForeignKey("marketplace_modules.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Notification
    notify_on_sale = Column(Boolean, default=True)
    notify_on_update = Column(Boolean, default=False)

    # Notes
    personal_note = Column(Text, nullable=True)

    # Relationships
    user = relationship("User", backref="wishlist_items")
    module = relationship("MarketplaceModule", backref="wishlisted_by")

    __table_args__ = (
        UniqueConstraint("user_id", "module_id", name="uq_wishlist_user_module"),
    )
