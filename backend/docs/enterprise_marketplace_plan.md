# FastVue Enterprise Marketplace - Architecture Plan

> **Implementation Status:** Phase 1 & 3 Complete (Core + Security + Payouts)
>
> See [MARKETPLACE.md](MARKETPLACE.md) for usage documentation.

## Implementation Progress

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Publisher Portal | Done |
| 1 | Module Ecosystem | Done |
| 1 | Licensing System | Done |
| 1 | Review System | Done |
| 1 | Analytics Tracking | Done |
| 2 | Payment Processing (Stripe) | Pending |
| 2 | Payment Processing (PayPal) | Pending |
| 2 | Subscription Billing | Pending |
| 3 | Code Signing | Done |
| 3 | Automated Security Scanning | Done |
| 3 | Publisher Payouts | Done |

---

## Executive Summary

This document outlines the architecture for the FastVue Module Marketplace - an enterprise-grade platform for discovering, distributing, and monetizing FastVue modules. Inspired by Odoo Apps Store, GitHub Marketplace, and npm Registry.

---

## 1. Marketplace Overview

### 1.1 Core Capabilities

| Capability | Description |
|------------|-------------|
| Module Discovery | Search, browse, and filter modules |
| Publisher Portal | Developer accounts, module publishing |
| Licensing System | Free, paid, subscription, and trial licenses |
| Payment Processing | Stripe/PayPal integration |
| Version Management | Semantic versioning, compatibility tracking |
| Code Signing | Module integrity verification |
| Review System | Ratings, reviews, and abuse reporting |
| Analytics | Download stats, revenue analytics |

### 1.2 User Roles

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Anonymous  │     │  Consumer   │     │  Publisher  │     │   Admin     │
│   Visitor   │     │   (Buyer)   │     │ (Developer) │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │                   │
      ▼                   ▼                   ▼                   ▼
 • Browse              • Purchase          • Publish            • Approve
 • Search              • Download          • Analytics          • Moderate
 • View Details        • Reviews           • Earnings           • Settings
```

---

## 2. Database Schema

### 2.1 Publisher & Account Models

```python
# marketplace/models/publisher.py

class Publisher(Base, TimestampMixin, AuditMixin):
    """Module publisher account."""
    __tablename__ = "marketplace_publishers"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    company_name = Column(String(200), nullable=True)
    display_name = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    bio = Column(Text, nullable=True)
    website = Column(String(500), nullable=True)
    support_email = Column(String(200), nullable=True)
    logo_url = Column(String(500), nullable=True)
    banner_url = Column(String(500), nullable=True)
    verified = Column(Boolean, default=False)
    verification_date = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(20), default="pending")  # pending, active, suspended
    stripe_account_id = Column(String(100), nullable=True)
    paypal_email = Column(String(200), nullable=True)
    payout_method = Column(String(20), default="stripe")
    commission_rate = Column(Numeric(5, 2), default=30.00)  # Platform fee %
    social_links = Column(JSONB, default=dict)

    # Relationships
    user = relationship("User", backref="publisher_profile")
    modules = relationship("MarketplaceModule", back_populates="publisher")


class PublisherStats(Base, TimestampMixin):
    """Aggregated publisher statistics."""
    __tablename__ = "marketplace_publisher_stats"

    id = Column(Integer, primary_key=True)
    publisher_id = Column(Integer, ForeignKey("marketplace_publishers.id"), nullable=False)
    total_modules = Column(Integer, default=0)
    total_downloads = Column(BigInteger, default=0)
    total_revenue = Column(Numeric(12, 2), default=0)
    average_rating = Column(Numeric(3, 2), nullable=True)
    total_reviews = Column(Integer, default=0)
    period = Column(String(10), default="all")  # day, week, month, all
    calculated_at = Column(DateTime(timezone=True), nullable=False)
```

### 2.2 Module Listing Models

```python
# marketplace/models/module.py

class MarketplaceModule(Base, TimestampMixin, AuditMixin):
    """Module listing in marketplace."""
    __tablename__ = "marketplace_modules"

    id = Column(Integer, primary_key=True)
    publisher_id = Column(Integer, ForeignKey("marketplace_publishers.id"), nullable=False)
    technical_name = Column(String(100), unique=True, nullable=False, index=True)
    display_name = Column(String(200), nullable=False)
    slug = Column(String(200), unique=True, nullable=False, index=True)
    short_description = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)  # Markdown
    category_id = Column(Integer, ForeignKey("marketplace_categories.id"), nullable=True)

    # Pricing
    license_type = Column(String(20), default="free")  # free, paid, subscription, trial
    price = Column(Numeric(10, 2), nullable=True)
    currency = Column(String(3), default="USD")
    subscription_period = Column(String(20), nullable=True)  # monthly, yearly
    trial_days = Column(Integer, nullable=True)

    # Media
    icon_url = Column(String(500), nullable=True)
    banner_url = Column(String(500), nullable=True)
    screenshots = Column(JSONB, default=list)  # [{url, caption, order}]
    video_url = Column(String(500), nullable=True)

    # Metadata
    tags = Column(JSONB, default=list)
    keywords = Column(JSONB, default=list)
    fastvue_versions = Column(JSONB, default=list)  # Supported versions
    python_versions = Column(JSONB, default=list)
    dependencies = Column(JSONB, default=list)  # Required modules
    external_dependencies = Column(JSONB, default=dict)  # pip packages

    # Status
    status = Column(String(20), default="draft")  # draft, pending, published, rejected, archived
    featured = Column(Boolean, default=False)
    featured_order = Column(Integer, nullable=True)
    visibility = Column(String(20), default="public")  # public, private, unlisted

    # Stats
    download_count = Column(BigInteger, default=0)
    install_count = Column(BigInteger, default=0)
    view_count = Column(BigInteger, default=0)

    # Relationships
    publisher = relationship("Publisher", back_populates="modules")
    category = relationship("MarketplaceCategory")
    versions = relationship("ModuleVersion", back_populates="module", order_by="desc(ModuleVersion.created_at)")
    reviews = relationship("ModuleReview", back_populates="module")


class MarketplaceCategory(Base, TimestampMixin):
    """Module categories."""
    __tablename__ = "marketplace_categories"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    icon = Column(String(50), nullable=True)  # Icon name
    parent_id = Column(Integer, ForeignKey("marketplace_categories.id"), nullable=True)
    order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    module_count = Column(Integer, default=0)

    # Relationships
    parent = relationship("MarketplaceCategory", remote_side=[id])
    children = relationship("MarketplaceCategory", backref=backref("parent_category", remote_side=[id]))


class ModuleVersion(Base, TimestampMixin):
    """Module version with downloadable assets."""
    __tablename__ = "marketplace_module_versions"

    id = Column(Integer, primary_key=True)
    module_id = Column(Integer, ForeignKey("marketplace_modules.id"), nullable=False)
    version = Column(String(50), nullable=False)
    semver_major = Column(Integer, nullable=True)
    semver_minor = Column(Integer, nullable=True)
    semver_patch = Column(Integer, nullable=True)

    # Files
    zip_file_url = Column(String(500), nullable=False)
    zip_file_size = Column(BigInteger, nullable=True)
    zip_file_hash = Column(String(64), nullable=True)  # SHA-256
    signature = Column(Text, nullable=True)  # Code signing signature

    # Changelog
    changelog = Column(Text, nullable=True)
    release_notes = Column(Text, nullable=True)

    # Compatibility
    min_fastvue_version = Column(String(20), nullable=True)
    max_fastvue_version = Column(String(20), nullable=True)

    # Status
    status = Column(String(20), default="draft")  # draft, published, deprecated
    is_latest = Column(Boolean, default=False)
    is_prerelease = Column(Boolean, default=False)
    download_count = Column(BigInteger, default=0)

    # Audit
    published_at = Column(DateTime(timezone=True), nullable=True)
    published_by = Column(Integer, nullable=True)

    # Relationships
    module = relationship("MarketplaceModule", back_populates="versions")

    __table_args__ = (
        UniqueConstraint("module_id", "version", name="uq_module_version"),
    )
```

### 2.3 Purchase & License Models

```python
# marketplace/models/license.py

class License(Base, TimestampMixin):
    """Module license/purchase."""
    __tablename__ = "marketplace_licenses"

    id = Column(Integer, primary_key=True)
    license_key = Column(String(64), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    module_id = Column(Integer, ForeignKey("marketplace_modules.id"), nullable=False)
    version_id = Column(Integer, ForeignKey("marketplace_module_versions.id"), nullable=True)

    # License Details
    license_type = Column(String(20), nullable=False)  # free, purchase, subscription, trial
    status = Column(String(20), default="active")  # active, expired, cancelled, revoked

    # Validity
    purchased_at = Column(DateTime(timezone=True), nullable=True)
    activated_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    # Usage Limits
    max_instances = Column(Integer, default=1)
    max_users = Column(Integer, nullable=True)
    instance_domains = Column(JSONB, default=list)  # Allowed domains

    # Payment
    order_id = Column(Integer, ForeignKey("marketplace_orders.id"), nullable=True)
    subscription_id = Column(String(100), nullable=True)  # Stripe subscription

    # Relationships
    user = relationship("User")
    module = relationship("MarketplaceModule")
    version = relationship("ModuleVersion")


class LicenseActivation(Base, TimestampMixin):
    """License activation record per instance."""
    __tablename__ = "marketplace_license_activations"

    id = Column(Integer, primary_key=True)
    license_id = Column(Integer, ForeignKey("marketplace_licenses.id"), nullable=False)
    instance_id = Column(String(64), nullable=False)  # Unique machine/instance ID
    domain = Column(String(200), nullable=True)
    ip_address = Column(String(45), nullable=True)
    activated_at = Column(DateTime(timezone=True), nullable=False)
    last_check = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(20), default="active")
    deactivated_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    license = relationship("License", backref="activations")


class Order(Base, TimestampMixin):
    """Purchase order."""
    __tablename__ = "marketplace_orders"

    id = Column(Integer, primary_key=True)
    order_number = Column(String(50), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Items
    items = Column(JSONB, default=list)  # [{module_id, version_id, price, quantity}]

    # Pricing
    subtotal = Column(Numeric(12, 2), nullable=False)
    discount_amount = Column(Numeric(12, 2), default=0)
    tax_amount = Column(Numeric(12, 2), default=0)
    total = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="USD")

    # Discount
    coupon_code = Column(String(50), nullable=True)
    coupon_id = Column(Integer, nullable=True)

    # Payment
    payment_method = Column(String(20), nullable=True)  # stripe, paypal
    payment_intent_id = Column(String(100), nullable=True)
    payment_status = Column(String(20), default="pending")
    paid_at = Column(DateTime(timezone=True), nullable=True)

    # Status
    status = Column(String(20), default="pending")  # pending, completed, refunded, failed

    # Billing
    billing_email = Column(String(200), nullable=True)
    billing_name = Column(String(200), nullable=True)
    billing_address = Column(JSONB, nullable=True)
    invoice_id = Column(String(100), nullable=True)

    # Relationships
    user = relationship("User")
    licenses = relationship("License", backref="order")
```

### 2.4 Review & Rating Models

```python
# marketplace/models/review.py

class ModuleReview(Base, TimestampMixin, AuditMixin):
    """Module review and rating."""
    __tablename__ = "marketplace_reviews"

    id = Column(Integer, primary_key=True)
    module_id = Column(Integer, ForeignKey("marketplace_modules.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    version_id = Column(Integer, ForeignKey("marketplace_module_versions.id"), nullable=True)

    # Rating
    rating = Column(Integer, nullable=False)  # 1-5
    title = Column(String(200), nullable=True)
    content = Column(Text, nullable=True)

    # Engagement
    helpful_count = Column(Integer, default=0)
    not_helpful_count = Column(Integer, default=0)

    # Publisher Response
    publisher_response = Column(Text, nullable=True)
    publisher_responded_at = Column(DateTime(timezone=True), nullable=True)

    # Status
    status = Column(String(20), default="published")  # pending, published, hidden, reported
    verified_purchase = Column(Boolean, default=False)

    # Relationships
    module = relationship("MarketplaceModule", back_populates="reviews")
    user = relationship("User")
    version = relationship("ModuleVersion")

    __table_args__ = (
        UniqueConstraint("module_id", "user_id", name="uq_module_review_user"),
    )


class ReviewVote(Base, TimestampMixin):
    """Helpful/not helpful votes on reviews."""
    __tablename__ = "marketplace_review_votes"

    id = Column(Integer, primary_key=True)
    review_id = Column(Integer, ForeignKey("marketplace_reviews.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    vote = Column(String(10), nullable=False)  # helpful, not_helpful

    __table_args__ = (
        UniqueConstraint("review_id", "user_id", name="uq_review_vote_user"),
    )


class ReviewReport(Base, TimestampMixin):
    """Abuse reports for reviews."""
    __tablename__ = "marketplace_review_reports"

    id = Column(Integer, primary_key=True)
    review_id = Column(Integer, ForeignKey("marketplace_reviews.id"), nullable=False)
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reason = Column(String(50), nullable=False)  # spam, inappropriate, fake, etc.
    details = Column(Text, nullable=True)
    status = Column(String(20), default="pending")  # pending, resolved, dismissed
    resolved_by = Column(Integer, nullable=True)
    resolution_note = Column(Text, nullable=True)
```

### 2.5 Analytics & Tracking Models

```python
# marketplace/models/analytics.py

class ModuleDownload(Base, TimestampMixin):
    """Download tracking."""
    __tablename__ = "marketplace_downloads"

    id = Column(Integer, primary_key=True)
    module_id = Column(Integer, ForeignKey("marketplace_modules.id"), nullable=False)
    version_id = Column(Integer, ForeignKey("marketplace_module_versions.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    license_id = Column(Integer, ForeignKey("marketplace_licenses.id"), nullable=True)

    # Request Info
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    country_code = Column(String(2), nullable=True)
    city = Column(String(100), nullable=True)

    # Context
    download_type = Column(String(20), default="manual")  # manual, auto_update, cli


class ModuleView(Base, TimestampMixin):
    """Page view tracking."""
    __tablename__ = "marketplace_views"

    id = Column(Integer, primary_key=True)
    module_id = Column(Integer, ForeignKey("marketplace_modules.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    session_id = Column(String(64), nullable=True)

    # Request Info
    ip_address = Column(String(45), nullable=True)
    referrer = Column(String(500), nullable=True)
    country_code = Column(String(2), nullable=True)


class PublisherPayout(Base, TimestampMixin):
    """Publisher earnings and payouts."""
    __tablename__ = "marketplace_payouts"

    id = Column(Integer, primary_key=True)
    publisher_id = Column(Integer, ForeignKey("marketplace_publishers.id"), nullable=False)

    # Amount
    gross_amount = Column(Numeric(12, 2), nullable=False)
    platform_fee = Column(Numeric(12, 2), nullable=False)
    net_amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="USD")

    # Period
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)

    # Payout Details
    status = Column(String(20), default="pending")  # pending, processing, completed, failed
    payout_method = Column(String(20), nullable=True)
    payout_id = Column(String(100), nullable=True)  # Stripe/PayPal payout ID
    paid_at = Column(DateTime(timezone=True), nullable=True)

    # Related Orders
    order_ids = Column(JSONB, default=list)
```

---

## 3. API Architecture

### 3.1 Public API Endpoints

```
# Discovery & Search
GET    /api/v1/marketplace/modules                    # List modules
GET    /api/v1/marketplace/modules/{slug}             # Module details
GET    /api/v1/marketplace/modules/{slug}/versions    # List versions
GET    /api/v1/marketplace/modules/{slug}/reviews     # List reviews
GET    /api/v1/marketplace/categories                 # List categories
GET    /api/v1/marketplace/search                     # Full-text search
GET    /api/v1/marketplace/featured                   # Featured modules
GET    /api/v1/marketplace/trending                   # Trending modules

# Publisher Profiles
GET    /api/v1/marketplace/publishers/{slug}          # Publisher profile
GET    /api/v1/marketplace/publishers/{slug}/modules  # Publisher's modules

# Reviews
POST   /api/v1/marketplace/modules/{slug}/reviews     # Submit review
PUT    /api/v1/marketplace/reviews/{id}               # Update review
DELETE /api/v1/marketplace/reviews/{id}               # Delete review
POST   /api/v1/marketplace/reviews/{id}/vote          # Vote helpful
POST   /api/v1/marketplace/reviews/{id}/report        # Report abuse
```

### 3.2 Consumer API Endpoints

```
# Purchases
POST   /api/v1/marketplace/cart/add                   # Add to cart
DELETE /api/v1/marketplace/cart/{item_id}             # Remove from cart
GET    /api/v1/marketplace/cart                       # Get cart
POST   /api/v1/marketplace/checkout                   # Create order
POST   /api/v1/marketplace/checkout/confirm           # Confirm payment

# Licenses
GET    /api/v1/marketplace/licenses                   # My licenses
GET    /api/v1/marketplace/licenses/{key}             # License details
POST   /api/v1/marketplace/licenses/{key}/activate    # Activate license
POST   /api/v1/marketplace/licenses/{key}/deactivate  # Deactivate
POST   /api/v1/marketplace/licenses/{key}/verify      # Verify license

# Downloads
GET    /api/v1/marketplace/modules/{slug}/download    # Download (with license)
GET    /api/v1/marketplace/modules/{slug}/download/{version}  # Specific version

# Purchase History
GET    /api/v1/marketplace/orders                     # Order history
GET    /api/v1/marketplace/orders/{id}                # Order details
GET    /api/v1/marketplace/orders/{id}/invoice        # Download invoice
```

### 3.3 Publisher API Endpoints

```
# Publisher Management
POST   /api/v1/publisher/register                     # Register as publisher
GET    /api/v1/publisher/profile                      # My publisher profile
PUT    /api/v1/publisher/profile                      # Update profile
POST   /api/v1/publisher/verify                       # Request verification

# Module Management
GET    /api/v1/publisher/modules                      # My modules
POST   /api/v1/publisher/modules                      # Create module listing
PUT    /api/v1/publisher/modules/{id}                 # Update module
DELETE /api/v1/publisher/modules/{id}                 # Delete/archive module

# Version Management
POST   /api/v1/publisher/modules/{id}/versions        # Upload new version
PUT    /api/v1/publisher/modules/{id}/versions/{ver}  # Update version
DELETE /api/v1/publisher/modules/{id}/versions/{ver}  # Deprecate version

# Analytics
GET    /api/v1/publisher/analytics/overview           # Dashboard stats
GET    /api/v1/publisher/analytics/downloads          # Download analytics
GET    /api/v1/publisher/analytics/revenue            # Revenue analytics
GET    /api/v1/publisher/analytics/reviews            # Review analytics

# Payouts
GET    /api/v1/publisher/payouts                      # Payout history
GET    /api/v1/publisher/payouts/{id}                 # Payout details
POST   /api/v1/publisher/payouts/settings             # Payout settings
```

### 3.4 Admin API Endpoints

```
# Module Moderation
GET    /api/v1/admin/marketplace/pending              # Pending approvals
POST   /api/v1/admin/marketplace/modules/{id}/approve # Approve module
POST   /api/v1/admin/marketplace/modules/{id}/reject  # Reject module
POST   /api/v1/admin/marketplace/modules/{id}/feature # Feature module

# Publisher Management
GET    /api/v1/admin/marketplace/publishers           # List publishers
POST   /api/v1/admin/marketplace/publishers/{id}/verify    # Verify publisher
POST   /api/v1/admin/marketplace/publishers/{id}/suspend   # Suspend publisher

# Review Moderation
GET    /api/v1/admin/marketplace/review-reports       # Reported reviews
POST   /api/v1/admin/marketplace/reviews/{id}/hide    # Hide review
POST   /api/v1/admin/marketplace/reviews/{id}/restore # Restore review

# Platform Settings
GET    /api/v1/admin/marketplace/settings             # Platform settings
PUT    /api/v1/admin/marketplace/settings             # Update settings
GET    /api/v1/admin/marketplace/analytics            # Platform analytics
```

---

## 4. Service Architecture

### 4.1 Core Services

```python
# marketplace/services/

class ModuleListingService:
    """Module listing management."""

    def create_module(publisher_id, data) -> MarketplaceModule
    def update_module(module_id, data) -> MarketplaceModule
    def publish_module(module_id) -> bool
    def search_modules(query, filters, pagination) -> List[MarketplaceModule]
    def get_featured_modules() -> List[MarketplaceModule]
    def get_trending_modules(period="week") -> List[MarketplaceModule]


class VersionService:
    """Module version management."""

    def create_version(module_id, file, data) -> ModuleVersion
    def validate_manifest(manifest) -> ValidationResult
    def sign_package(zip_file) -> str  # Returns signature
    def verify_signature(zip_file, signature) -> bool
    def parse_semver(version_string) -> Tuple[int, int, int]


class LicenseService:
    """License management."""

    def create_license(user_id, module_id, license_type, order_id=None) -> License
    def generate_license_key() -> str
    def activate_license(license_key, instance_id, domain) -> LicenseActivation
    def verify_license(license_key, instance_id) -> VerificationResult
    def check_license_limits(license) -> bool
    def renew_subscription(license_id) -> License


class PaymentService:
    """Payment processing."""

    def create_checkout_session(cart, user) -> StripeSession
    def handle_webhook(event) -> bool
    def process_refund(order_id, reason) -> RefundResult
    def create_subscription(user, module, plan) -> Subscription


class PayoutService:
    """Publisher payouts."""

    def calculate_earnings(publisher_id, period) -> Earnings
    def create_payout(publisher_id, amount) -> Payout
    def process_stripe_payout(payout_id) -> bool
    def generate_earning_report(publisher_id, period) -> Report


class ReviewService:
    """Review management."""

    def create_review(user_id, module_id, rating, content) -> ModuleReview
    def verify_purchase(user_id, module_id) -> bool
    def calculate_average_rating(module_id) -> float
    def report_review(review_id, reporter_id, reason) -> ReviewReport


class AnalyticsService:
    """Analytics and tracking."""

    def track_download(module_id, version_id, user_id, request) -> None
    def track_view(module_id, user_id, request) -> None
    def get_module_stats(module_id, period) -> ModuleStats
    def get_publisher_stats(publisher_id, period) -> PublisherStats
    def get_platform_stats(period) -> PlatformStats
```

### 4.2 Integration Services

```python
class StripeIntegration:
    """Stripe payment integration."""

    def create_customer(user) -> str  # Stripe customer ID
    def create_checkout_session(items, success_url, cancel_url) -> Session
    def create_subscription(customer_id, price_id) -> Subscription
    def cancel_subscription(subscription_id) -> bool
    def create_payout(account_id, amount) -> Payout
    def verify_webhook_signature(payload, signature) -> bool


class PayPalIntegration:
    """PayPal payment integration."""

    def create_order(items) -> Order
    def capture_order(order_id) -> CaptureResult
    def create_payout(recipient_email, amount) -> PayoutResult


class StorageService:
    """Module file storage (S3/MinIO)."""

    def upload_module_zip(module_id, version, file) -> str  # Returns URL
    def generate_download_url(module_id, version, expires=3600) -> str
    def delete_version(module_id, version) -> bool
    def calculate_file_hash(file) -> str


class CodeSigningService:
    """Module code signing."""

    def sign_module(zip_content) -> str  # Returns signature
    def verify_module(zip_content, signature) -> bool
    def generate_keypair() -> Tuple[str, str]  # private, public
    def get_public_key() -> str


class NotificationService:
    """Marketplace notifications."""

    def notify_module_approved(module_id) -> None
    def notify_module_rejected(module_id, reason) -> None
    def notify_new_review(review_id) -> None
    def notify_payout_completed(payout_id) -> None
    def notify_license_expiring(license_id, days) -> None
```

---

## 5. Security Architecture

### 5.1 License Verification Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  FastVue    │     │ Marketplace │     │  License    │
│  Instance   │────▶│    API      │────▶│  Database   │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │
      │  1. Send:         │
      │  - License Key    │
      │  - Instance ID    │
      │  - Domain         │
      │                   │
      │◀──────────────────│
      │  2. Response:     │
      │  - Valid/Invalid  │
      │  - Expiry Date    │
      │  - Features       │
      │  - Signature      │
```

### 5.2 Code Signing

```python
# Sign module before publishing
def sign_module(zip_path: Path, private_key: str) -> str:
    """Create ECDSA signature for module ZIP."""
    import hashlib
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.asymmetric import ec

    file_hash = hashlib.sha256(zip_path.read_bytes()).digest()
    signature = private_key.sign(file_hash, ec.ECDSA(hashes.SHA256()))
    return base64.b64encode(signature).decode()

# Verify before installation
def verify_module(zip_path: Path, signature: str, public_key: str) -> bool:
    """Verify module signature."""
    file_hash = hashlib.sha256(zip_path.read_bytes()).digest()
    try:
        public_key.verify(
            base64.b64decode(signature),
            file_hash,
            ec.ECDSA(hashes.SHA256())
        )
        return True
    except InvalidSignature:
        return False
```

### 5.3 API Security

- OAuth 2.0 for authentication
- Rate limiting per endpoint
- Request signing for critical operations
- Webhook signature verification
- CORS with allowed origins
- Input validation and sanitization

---

## 6. Frontend Components

### 6.1 Marketplace Pages

| Page | Route | Description |
|------|-------|-------------|
| Browse | `/marketplace` | Module listing with filters |
| Search | `/marketplace/search` | Full-text search results |
| Module Detail | `/marketplace/m/{slug}` | Module information |
| Category | `/marketplace/c/{slug}` | Category listing |
| Publisher | `/marketplace/p/{slug}` | Publisher profile |
| Cart | `/marketplace/cart` | Shopping cart |
| Checkout | `/marketplace/checkout` | Payment flow |
| My Purchases | `/account/purchases` | Purchased modules |
| My Licenses | `/account/licenses` | License management |

### 6.2 Publisher Portal

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/publisher` | Analytics overview |
| My Modules | `/publisher/modules` | Module management |
| New Module | `/publisher/modules/new` | Create listing |
| Edit Module | `/publisher/modules/{id}` | Edit listing |
| Upload Version | `/publisher/modules/{id}/versions` | Version management |
| Analytics | `/publisher/analytics` | Detailed analytics |
| Payouts | `/publisher/payouts` | Earnings & payouts |
| Settings | `/publisher/settings` | Publisher settings |

### 6.3 Admin Console

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/admin/marketplace` | Platform overview |
| Pending Modules | `/admin/marketplace/pending` | Approval queue |
| Publishers | `/admin/marketplace/publishers` | Publisher management |
| Reviews | `/admin/marketplace/reviews` | Review moderation |
| Settings | `/admin/marketplace/settings` | Platform config |

---

## 7. Infrastructure Requirements

### 7.1 Storage

```yaml
# MinIO/S3 Configuration
storage:
  endpoint: s3.marketplace.fastvue.io
  buckets:
    - name: module-packages
      lifecycle:
        - rule: delete-old-versions
          days: 365
    - name: module-assets
      cdn: true
    - name: invoices
      private: true
```

### 7.2 CDN

```yaml
# CloudFlare/CloudFront Configuration
cdn:
  origins:
    - storage.marketplace.fastvue.io
    - api.marketplace.fastvue.io
  cache:
    static_assets: 1d
    api_responses: 5m
    module_packages: 1h
```

### 7.3 Search

```yaml
# Elasticsearch/Meilisearch Configuration
search:
  indices:
    - name: modules
      fields:
        - name: searchable
        - description: searchable
        - tags: filterable
        - category: filterable
    - name: publishers
      fields:
        - name: searchable
        - bio: searchable
```

---

## 8. Implementation Phases

### Phase 1: Core Marketplace (8-10 weeks)

1. Database models and migrations
2. Module listing CRUD
3. Version management with uploads
4. Basic search and browse
5. Publisher registration

### Phase 2: Payments & Licensing (6-8 weeks)

1. Stripe integration
2. Order and checkout flow
3. License generation
4. License verification API
5. Invoice generation

### Phase 3: Reviews & Analytics (4-6 weeks)

1. Review system
2. Rating aggregation
3. Download tracking
4. Publisher analytics
5. Platform dashboard

### Phase 4: Advanced Features (4-6 weeks)

1. Code signing
2. Subscription billing
3. Payout system
4. Category management
5. Featured modules

### Phase 5: Polish & Launch (4 weeks)

1. Admin moderation tools
2. Email notifications
3. Full-text search
4. Performance optimization
5. Documentation

---

## 9. Monitoring & Operations

### 9.1 Key Metrics

- Module downloads/day
- Conversion rate (views → purchases)
- Average revenue per user (ARPU)
- Publisher payout volume
- License activation rate
- Search success rate

### 9.2 Alerts

- Payment processing failures
- High error rates
- License abuse detection
- Download bandwidth spikes
- Review spam detection

---

## 10. Future Enhancements

- **Module Bundles**: Discounted module packages
- **Subscription Plans**: All-access subscriptions
- **Enterprise Contracts**: Volume licensing
- **Partner Program**: Certified partners
- **Affiliate System**: Referral commissions
- **Module Recommendations**: AI-powered suggestions
- **Community Forums**: Discussion boards
- **Documentation Hub**: Module docs hosting
