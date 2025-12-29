"""
Marketplace Analytics Models

Download tracking, view tracking, and analytics data.
"""

from datetime import datetime, date
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

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
    BigInteger,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User
    from .module import MarketplaceModule, ModuleVersion


class ModuleDownload(Base, TimestampMixin):
    """
    Module download tracking.

    Records each download for analytics.
    """
    __tablename__ = "marketplace_downloads"

    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(
        Integer,
        ForeignKey("marketplace_modules.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    version_id = Column(
        Integer,
        ForeignKey("marketplace_module_versions.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    license_id = Column(
        Integer,
        ForeignKey("marketplace_licenses.id", ondelete="SET NULL"),
        nullable=True
    )

    # Request Info
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    referrer = Column(String(500), nullable=True)

    # Geo
    country_code = Column(String(2), nullable=True, index=True)
    region = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)

    # Context
    download_type = Column(String(20), default="manual")  # manual, auto_update, cli, api
    source = Column(String(50), nullable=True)  # web, cli, ide_plugin, api

    # Client Info
    fastvue_version = Column(String(20), nullable=True)
    python_version = Column(String(10), nullable=True)

    # Date (for partitioning/aggregation)
    download_date = Column(Date, nullable=False, index=True)

    # Relationships
    module = relationship("MarketplaceModule", backref="downloads")
    version = relationship("ModuleVersion", backref="downloads")
    user = relationship("User")

    __table_args__ = (
        Index("ix_downloads_module_date", "module_id", "download_date"),
        Index("ix_downloads_country", "country_code"),
        Index("ix_downloads_type", "download_type"),
    )


class ModuleView(Base, TimestampMixin):
    """
    Module page view tracking.
    """
    __tablename__ = "marketplace_views"

    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(
        Integer,
        ForeignKey("marketplace_modules.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    session_id = Column(String(64), nullable=True, index=True)

    # Request Info
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    referrer = Column(String(500), nullable=True)

    # Geo
    country_code = Column(String(2), nullable=True)

    # Page Info
    page_type = Column(String(20), default="detail")  # detail, versions, reviews

    # Session Tracking
    time_on_page = Column(Integer, nullable=True)  # Seconds
    scroll_depth = Column(Integer, nullable=True)  # Percentage

    # Conversion
    clicked_install = Column(Boolean, default=False)
    clicked_buy = Column(Boolean, default=False)
    added_to_cart = Column(Boolean, default=False)

    # Date
    view_date = Column(Date, nullable=False, index=True)

    # Relationships
    module = relationship("MarketplaceModule", backref="views")
    user = relationship("User")

    __table_args__ = (
        Index("ix_views_module_date", "module_id", "view_date"),
        Index("ix_views_session", "session_id"),
    )


class SearchQuery(Base, TimestampMixin):
    """
    Search query tracking for analytics.
    """
    __tablename__ = "marketplace_search_queries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    session_id = Column(String(64), nullable=True)

    # Query
    query = Column(String(500), nullable=False, index=True)
    query_normalized = Column(String(500), nullable=True)

    # Filters Applied
    filters = Column(JSONB, default=dict)  # {category, license_type, price_range, etc}

    # Results
    result_count = Column(Integer, nullable=True)
    result_module_ids = Column(JSONB, default=list)  # First 10 results

    # Engagement
    clicked_result = Column(Boolean, default=False)
    clicked_module_id = Column(Integer, nullable=True)
    clicked_position = Column(Integer, nullable=True)

    # Request Info
    ip_address = Column(String(45), nullable=True)
    country_code = Column(String(2), nullable=True)

    # Date
    search_date = Column(Date, nullable=False, index=True)

    __table_args__ = (
        Index("ix_searches_query", "query"),
        Index("ix_searches_date", "search_date"),
    )


class DailyModuleStats(Base):
    """
    Daily aggregated statistics per module.

    Pre-aggregated for dashboard performance.
    """
    __tablename__ = "marketplace_daily_module_stats"

    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(
        Integer,
        ForeignKey("marketplace_modules.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    stat_date = Column(Date, nullable=False, index=True)

    # Views
    view_count = Column(Integer, default=0)
    unique_visitors = Column(Integer, default=0)

    # Downloads
    download_count = Column(Integer, default=0)
    unique_downloaders = Column(Integer, default=0)

    # Installs (from license activations)
    install_count = Column(Integer, default=0)

    # Revenue (for paid modules)
    order_count = Column(Integer, default=0)
    gross_revenue = Column(Numeric(12, 2), default=Decimal("0.00"))

    # Reviews
    review_count = Column(Integer, default=0)
    average_rating = Column(Integer, nullable=True)  # * 100

    # Conversion
    view_to_download_rate = Column(Integer, nullable=True)  # * 100
    view_to_purchase_rate = Column(Integer, nullable=True)

    # Top Countries
    top_countries = Column(JSONB, default=list)  # [{country_code, count}]

    __table_args__ = (
        Index("ix_daily_stats_module_date", "module_id", "stat_date", unique=True),
    )


class DailyPlatformStats(Base):
    """
    Daily aggregated platform-wide statistics.
    """
    __tablename__ = "marketplace_daily_platform_stats"

    id = Column(Integer, primary_key=True, index=True)
    stat_date = Column(Date, nullable=False, unique=True, index=True)

    # Users
    new_users = Column(Integer, default=0)
    active_users = Column(Integer, default=0)
    new_publishers = Column(Integer, default=0)

    # Modules
    new_modules = Column(Integer, default=0)
    new_versions = Column(Integer, default=0)
    total_modules = Column(Integer, default=0)
    published_modules = Column(Integer, default=0)

    # Traffic
    total_views = Column(Integer, default=0)
    unique_visitors = Column(Integer, default=0)
    total_searches = Column(Integer, default=0)

    # Downloads
    total_downloads = Column(Integer, default=0)
    unique_downloaders = Column(Integer, default=0)

    # Revenue
    total_orders = Column(Integer, default=0)
    gross_revenue = Column(Numeric(12, 2), default=Decimal("0.00"))
    platform_fees = Column(Numeric(12, 2), default=Decimal("0.00"))

    # Reviews
    new_reviews = Column(Integer, default=0)
    average_rating = Column(Integer, nullable=True)

    # Top Modules
    top_downloaded = Column(JSONB, default=list)  # [{module_id, count}]
    top_viewed = Column(JSONB, default=list)
    top_purchased = Column(JSONB, default=list)

    # Geographic
    top_countries = Column(JSONB, default=list)


class RevenueTransaction(Base, TimestampMixin):
    """
    Individual revenue transactions for accounting.
    """
    __tablename__ = "marketplace_revenue_transactions"

    id = Column(Integer, primary_key=True, index=True)
    transaction_type = Column(String(20), nullable=False)  # sale, refund, chargeback, payout

    # References
    order_id = Column(Integer, ForeignKey("marketplace_orders.id"), nullable=True)
    payout_id = Column(Integer, ForeignKey("marketplace_payouts.id"), nullable=True)
    publisher_id = Column(Integer, ForeignKey("marketplace_publishers.id"), nullable=True)
    module_id = Column(Integer, ForeignKey("marketplace_modules.id"), nullable=True)

    # Amounts
    gross_amount = Column(Numeric(12, 2), nullable=False)
    platform_fee = Column(Numeric(12, 2), nullable=False)
    net_amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="USD")

    # Status
    status = Column(String(20), default="pending")  # pending, completed, failed

    # External
    stripe_transaction_id = Column(String(100), nullable=True)
    paypal_transaction_id = Column(String(100), nullable=True)

    # Date
    transaction_date = Column(Date, nullable=False, index=True)

    __table_args__ = (
        Index("ix_revenue_type_date", "transaction_type", "transaction_date"),
        Index("ix_revenue_publisher", "publisher_id", "transaction_date"),
    )


class EventLog(Base, TimestampMixin):
    """
    General event logging for marketplace.

    For tracking important events and audit trail.
    """
    __tablename__ = "marketplace_event_logs"

    id = Column(BigInteger, primary_key=True, index=True)
    event_type = Column(String(50), nullable=False, index=True)

    # Entity
    entity_type = Column(String(50), nullable=True)  # module, publisher, order, license
    entity_id = Column(Integer, nullable=True)

    # Actor
    user_id = Column(Integer, nullable=True, index=True)
    ip_address = Column(String(45), nullable=True)

    # Event Data
    data = Column(JSONB, default=dict)
    event_metadata = Column(JSONB, default=dict)

    # Date
    event_date = Column(Date, nullable=False, index=True)

    __table_args__ = (
        Index("ix_events_type_date", "event_type", "event_date"),
        Index("ix_events_entity", "entity_type", "entity_id"),
    )
