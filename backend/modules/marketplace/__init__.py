"""
FastVue Marketplace Module

Enterprise-grade module marketplace for discovering, distributing,
and monetizing FastVue modules.

Features:
- Module discovery and search
- Publisher portal
- Licensing system (free, paid, subscription, trial)
- Payment processing (Stripe, PayPal)
- Version management
- Review and rating system
- Analytics and metrics
"""

from .api import router
from .models import (
    # Publisher
    Publisher,
    PublisherStats,
    PublisherPayout,
    PublisherInvitation,
    # Module
    MarketplaceCategory,
    MarketplaceModule,
    ModuleVersion,
    ModuleTag,
    ModuleScreenshot,
    ModuleDependency,
    # License
    License,
    LicenseActivation,
    Order,
    OrderItem,
    Coupon,
    Cart,
    Wishlist,
    # Reviews
    ModuleReview,
    ReviewVote,
    ReviewComment,
    ReviewReport,
    RatingSummary,
    # Analytics
    ModuleDownload,
    ModuleView,
    SearchQuery,
    DailyModuleStats,
    DailyPlatformStats,
    RevenueTransaction,
    EventLog,
)
from .services import (
    PublisherService,
    get_publisher_service,
    ModuleService,
    get_module_service,
    LicenseService,
    get_license_service,
    ReviewService,
    get_review_service,
    AnalyticsService,
    get_analytics_service,
)

__all__ = [
    # API
    "router",
    # Models - Publisher
    "Publisher",
    "PublisherStats",
    "PublisherPayout",
    "PublisherInvitation",
    # Models - Module
    "MarketplaceCategory",
    "MarketplaceModule",
    "ModuleVersion",
    "ModuleTag",
    "ModuleScreenshot",
    "ModuleDependency",
    # Models - License
    "License",
    "LicenseActivation",
    "Order",
    "OrderItem",
    "Coupon",
    "Cart",
    "Wishlist",
    # Models - Reviews
    "ModuleReview",
    "ReviewVote",
    "ReviewComment",
    "ReviewReport",
    "RatingSummary",
    # Models - Analytics
    "ModuleDownload",
    "ModuleView",
    "SearchQuery",
    "DailyModuleStats",
    "DailyPlatformStats",
    "RevenueTransaction",
    "EventLog",
    # Services
    "PublisherService",
    "get_publisher_service",
    "ModuleService",
    "get_module_service",
    "LicenseService",
    "get_license_service",
    "ReviewService",
    "get_review_service",
    "AnalyticsService",
    "get_analytics_service",
]
