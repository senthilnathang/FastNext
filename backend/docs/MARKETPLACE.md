# FastVue Enterprise Marketplace

The Enterprise Marketplace module provides a complete platform for discovering, distributing, and monetizing FastVue modules. Inspired by Odoo Apps Store, GitHub Marketplace, and npm Registry.

## Overview

The marketplace enables:
- **Module Discovery**: Search, browse, and filter modules by category, tags, and ratings
- **Publisher Portal**: Developer accounts, module publishing, and earnings management
- **Licensing System**: Support for free, paid, subscription, and trial licenses
- **Review System**: User ratings, reviews, and moderation
- **Analytics**: Download stats, view tracking, and revenue analytics

## Architecture

```
modules/marketplace/
├── models/
│   ├── publisher.py      # Publisher, PublisherStats, PublisherPayout
│   ├── module.py         # MarketplaceModule, ModuleVersion, Category, Tags
│   ├── license.py        # License, Order, LicenseActivation, Cart, Wishlist
│   ├── review.py         # ModuleReview, ReviewVote, ReviewComment, ReviewReport
│   ├── analytics.py      # ModuleDownload, ModuleView, SearchQuery, DailyStats
│   ├── security.py       # SigningKey, ModuleSignature, SecurityScan, SecurityPolicy
│   └── payout.py         # PayoutBatch, PublisherBalance, BalanceTransaction
├── services/
│   ├── publisher_service.py   # Publisher management
│   ├── module_service.py      # Module CRUD and publishing
│   ├── license_service.py     # License verification and activation
│   ├── review_service.py      # Reviews and ratings
│   ├── analytics_service.py   # Tracking and analytics
│   ├── security_service.py    # Code signing and security scanning
│   └── payout_service.py      # Publisher payouts and balances
├── api/
│   ├── modules.py        # Module endpoints
│   ├── licenses.py       # License endpoints
│   ├── reviews.py        # Review endpoints
│   ├── analytics.py      # Analytics endpoints
│   ├── security.py       # Security and signing endpoints
│   └── payouts.py        # Payout and balance endpoints
└── __manifest__.py       # Module manifest
```

## Database Models

### Publisher Models

| Model | Description |
|-------|-------------|
| `Publisher` | Developer/company publishing modules |
| `PublisherStats` | Aggregated statistics per publisher |
| `PublisherPayout` | Payment history and pending payouts |
| `PublisherInvitation` | Team member invitations |

### Module Models

| Model | Description |
|-------|-------------|
| `MarketplaceCategory` | Hierarchical module categories |
| `MarketplaceModule` | Module listing with metadata |
| `ModuleVersion` | Versioned releases with files |
| `ModuleTag` | Searchable tags |
| `ModuleScreenshot` | Gallery images |
| `ModuleDependency` | Module dependency graph |

### License Models

| Model | Description |
|-------|-------------|
| `Order` | Purchase transactions |
| `OrderItem` | Individual items in an order |
| `License` | User entitlements to modules |
| `LicenseActivation` | Per-instance activations |
| `Coupon` | Discount codes |
| `Cart` | Shopping cart |
| `Wishlist` | User wishlists |

### Review Models

| Model | Description |
|-------|-------------|
| `ModuleReview` | User reviews with ratings |
| `ReviewVote` | Helpful/not helpful votes |
| `ReviewComment` | Discussion on reviews |
| `ReviewReport` | Abuse reports |
| `RatingSummary` | Pre-aggregated ratings |

### Analytics Models

| Model | Description |
|-------|-------------|
| `ModuleDownload` | Download tracking |
| `ModuleView` | Page view tracking |
| `SearchQuery` | Search analytics |
| `DailyModuleStats` | Daily module metrics |
| `DailyPlatformStats` | Platform-wide metrics |
| `RevenueTransaction` | Financial transactions |
| `EventLog` | General event logging |

### Security Models

| Model | Description |
|-------|-------------|
| `SigningKey` | Publisher cryptographic signing keys |
| `ModuleSignature` | Cryptographic signatures for module versions |
| `SecurityScan` | Automated security scan results |
| `SecurityPolicy` | Security rules and policies |
| `TrustedPublisher` | Verified publishers with enhanced privileges |

### Payout Models

| Model | Description |
|-------|-------------|
| `PayoutBatch` | Batch payout processing |
| `PublisherPayoutItem` | Individual publisher payouts in a batch |
| `PayoutSchedule` | Automated payout scheduling |
| `PayoutAdjustment` | Refunds, chargebacks, bonuses |
| `PublisherBalance` | Real-time balance tracking |
| `BalanceTransaction` | Balance change ledger |

## API Endpoints

### Module Endpoints

```
GET    /api/v1/marketplace/modules/                    # List all published modules
GET    /api/v1/marketplace/modules/search              # Search modules
GET    /api/v1/marketplace/modules/featured            # Featured modules
GET    /api/v1/marketplace/modules/trending            # Trending modules
GET    /api/v1/marketplace/modules/{id}                # Get module details
GET    /api/v1/marketplace/modules/{id}/versions       # Get module versions
GET    /api/v1/marketplace/modules/category/{slug}     # Modules by category

# Publisher endpoints (authenticated)
POST   /api/v1/marketplace/modules/                    # Create new module
PUT    /api/v1/marketplace/modules/{id}                # Update module
DELETE /api/v1/marketplace/modules/{id}                # Delete module
POST   /api/v1/marketplace/modules/{id}/versions       # Add version
POST   /api/v1/marketplace/modules/{id}/submit         # Submit for review
POST   /api/v1/marketplace/modules/{id}/publish        # Publish module
GET    /api/v1/marketplace/publisher/modules           # My modules

# Admin endpoints
POST   /api/v1/marketplace/modules/{id}/approve        # Approve module
POST   /api/v1/marketplace/modules/{id}/reject         # Reject module
```

### License Endpoints

```
# Public verification (for FastVue instances)
POST   /api/v1/marketplace/licenses/verify             # Verify license key
POST   /api/v1/marketplace/licenses/activate           # Activate license
POST   /api/v1/marketplace/licenses/deactivate         # Deactivate license

# User endpoints
GET    /api/v1/marketplace/licenses/my                 # My licenses
POST   /api/v1/marketplace/licenses/free               # Create free license
POST   /api/v1/marketplace/licenses/trial              # Start trial
GET    /api/v1/marketplace/licenses/{id}               # License details
GET    /api/v1/marketplace/licenses/{id}/activations   # License activations
```

### Review Endpoints

```
# Public
GET    /api/v1/marketplace/modules/{id}/reviews        # Module reviews
GET    /api/v1/marketplace/modules/{id}/rating-summary # Rating summary
GET    /api/v1/marketplace/reviews/{id}                # Review details
GET    /api/v1/marketplace/reviews/{id}/comments       # Review comments

# Authenticated
POST   /api/v1/marketplace/reviews                     # Create review
PUT    /api/v1/marketplace/reviews/{id}                # Update review
DELETE /api/v1/marketplace/reviews/{id}                # Delete review
POST   /api/v1/marketplace/reviews/{id}/vote           # Vote on review
POST   /api/v1/marketplace/reviews/{id}/comments       # Add comment
POST   /api/v1/marketplace/reviews/{id}/report         # Report abuse
GET    /api/v1/marketplace/my/reviews                  # My reviews

# Publisher
POST   /api/v1/marketplace/reviews/{id}/publisher-response  # Respond to review

# Admin moderation
GET    /api/v1/marketplace/moderation/reports          # Pending reports
POST   /api/v1/marketplace/moderation/reviews/{id}     # Moderate review
POST   /api/v1/marketplace/moderation/reports/{id}/resolve  # Resolve report
```

### Analytics Endpoints

```
# Tracking (public)
POST   /api/v1/marketplace/analytics/track/download    # Track download
POST   /api/v1/marketplace/analytics/track/view        # Track page view
POST   /api/v1/marketplace/analytics/track/search      # Track search

# Module stats (public)
GET    /api/v1/marketplace/analytics/modules/{id}/download-stats  # Download stats
GET    /api/v1/marketplace/analytics/modules/{id}/view-stats      # View stats

# Publisher analytics
GET    /api/v1/marketplace/analytics/publisher/analytics           # My analytics

# Admin
GET    /api/v1/marketplace/analytics/search/popular                # Popular searches
GET    /api/v1/marketplace/analytics/search/zero-results           # Failed searches
POST   /api/v1/marketplace/analytics/aggregate/daily-module-stats  # Aggregate stats
POST   /api/v1/marketplace/analytics/aggregate/daily-platform-stats # Platform stats
GET    /api/v1/marketplace/analytics/events                        # Event logs
```

### Security Endpoints

```
# Signing Keys
POST   /api/v1/marketplace/security/keys/generate          # Generate signing key pair
GET    /api/v1/marketplace/security/keys/{publisher_id}    # Get publisher's keys
GET    /api/v1/marketplace/security/keys/{publisher_id}/primary  # Get primary key
POST   /api/v1/marketplace/security/keys/{key_id}/revoke   # Revoke a key

# Module Signing
POST   /api/v1/marketplace/security/sign                   # Sign a module version
POST   /api/v1/marketplace/security/verify/{version_id}    # Verify signature

# Security Scans
POST   /api/v1/marketplace/security/scans                  # Create security scan
POST   /api/v1/marketplace/security/scans/{scan_id}/run    # Run scan on uploaded file
GET    /api/v1/marketplace/security/scans/version/{version_id}  # Get version scans
GET    /api/v1/marketplace/security/scans/version/{version_id}/latest  # Latest scan

# Security Policies
GET    /api/v1/marketplace/security/policies               # List policies
POST   /api/v1/marketplace/security/policies               # Create policy

# Trusted Publishers
POST   /api/v1/marketplace/security/trusted                # Grant trusted status
GET    /api/v1/marketplace/security/trusted/{publisher_id} # Get trusted status
GET    /api/v1/marketplace/security/trusted/{publisher_id}/check  # Check if trusted
```

### Payout Endpoints

```
# Publisher Balance
GET    /api/v1/marketplace/payouts/balance/{publisher_id}        # Get balance
POST   /api/v1/marketplace/payouts/balance/{publisher_id}/release # Release pending

# Payout Batches
GET    /api/v1/marketplace/payouts/batches                       # List batches
GET    /api/v1/marketplace/payouts/batches/{batch_id}            # Get batch details
GET    /api/v1/marketplace/payouts/batches/{batch_id}/items      # Get batch items
POST   /api/v1/marketplace/payouts/batches                       # Create batch
POST   /api/v1/marketplace/payouts/batches/{batch_id}/populate   # Populate batch
POST   /api/v1/marketplace/payouts/batches/{batch_id}/approve    # Approve batch
POST   /api/v1/marketplace/payouts/batches/{batch_id}/process    # Process batch
POST   /api/v1/marketplace/payouts/batches/{batch_id}/cancel     # Cancel batch

# Payout Calculation
GET    /api/v1/marketplace/payouts/calculate/{publisher_id}      # Calculate payout

# Adjustments
GET    /api/v1/marketplace/payouts/adjustments                   # List adjustments
POST   /api/v1/marketplace/payouts/adjustments                   # Create adjustment
POST   /api/v1/marketplace/payouts/adjustments/{id}/approve      # Approve adjustment
POST   /api/v1/marketplace/payouts/adjustments/{id}/cancel       # Cancel adjustment

# Transaction History
GET    /api/v1/marketplace/payouts/transactions/{publisher_id}   # Get transactions
GET    /api/v1/marketplace/payouts/earnings/{publisher_id}/summary  # Earnings summary

# Payout Schedule
GET    /api/v1/marketplace/payouts/schedule                      # Get schedule
POST   /api/v1/marketplace/payouts/schedule                      # Create schedule
POST   /api/v1/marketplace/payouts/schedule/run                  # Run scheduled payout
```

## Services

### PublisherService

```python
from modules.marketplace import PublisherService, get_publisher_service

# In your endpoint
service = get_publisher_service(db)

# Register a new publisher
publisher = service.register_publisher(
    user_id=current_user.id,
    display_name="My Company",
    company_name="My Company Inc.",
    bio="We build great modules",
)

# Verify publisher
service.verify_publisher(publisher.id, verification_type="identity")

# Generate API key for programmatic access
api_key = service.generate_api_key(publisher.id)
```

### ModuleService

```python
from modules.marketplace import ModuleService, get_module_service

service = get_module_service(db)

# Create a module
module = service.create_module(
    publisher_id=publisher.id,
    technical_name="my_module",
    display_name="My Module",
    short_description="A great module",
    category_id=1,
)

# Add a version
version = service.create_version(
    module_id=module.id,
    version="1.0.0",
    zip_file_url="/path/to/module.zip",
    changelog="Initial release",
)

# Publish
service.publish_module(module.id)

# Search modules
results, total = service.search_modules(
    query="inventory",
    category_id=1,
    license_type="free",
)
```

### LicenseService

```python
from modules.marketplace import LicenseService, get_license_service

service = get_license_service(db)

# Create a free license
license_obj = service.create_license(
    user_id=user.id,
    module_id=module.id,
    license_type="free",
)

# Verify license (from FastVue instance)
result = service.verify_license(
    license_key="xxx-xxx-xxx",
    module_technical_name="my_module",
)

# Activate on an instance
activation = service.activate_license(
    license_key="xxx-xxx-xxx",
    instance_id="unique-machine-id",
    domain="example.com",
)
```

### ReviewService

```python
from modules.marketplace import ReviewService, get_review_service

service = get_review_service(db)

# Create a review
review = service.create_review(
    module_id=module.id,
    user_id=user.id,
    rating=5,
    title="Great module!",
    content="This module solved all my problems.",
    pros=["Easy setup", "Good docs"],
    cons=["Could use more features"],
)

# Vote on review
service.vote_review(review.id, user.id, "helpful")

# Get rating summary
summary = service.get_rating_summary(module.id)
```

### AnalyticsService

```python
from modules.marketplace import AnalyticsService, get_analytics_service

service = get_analytics_service(db)

# Track a download
service.track_download(
    module_id=module.id,
    version_id=version.id,
    user_id=user.id,
    ip_address="1.2.3.4",
    source="web",
)

# Get download stats
stats = service.get_download_stats(
    module_id=module.id,
    start_date=date(2024, 1, 1),
    end_date=date.today(),
)

# Publisher analytics
analytics = service.get_publisher_analytics(publisher.id)
```

### SecurityService

```python
from modules.marketplace import SecurityService, get_security_service

service = get_security_service(db)

# Generate a signing key for publisher
key, private_key = service.generate_signing_key(
    publisher_id=publisher.id,
    name="Production Key",
    algorithm="ed25519",
    set_as_primary=True,
)
# IMPORTANT: Store private_key securely!

# Sign a module version
signature = service.sign_module_version(
    version_id=version.id,
    private_key_pem=private_key,
    signing_key_id=key.key_id,
)

# Verify a signature
is_valid, error = service.verify_signature(version.id)

# Run a security scan
scan = service.create_security_scan(version.id, scan_type="full")
scan = service.run_security_scan(scan.scan_id, module_zip_content)

# Grant trusted publisher status
trusted = service.grant_trusted_status(
    publisher_id=publisher.id,
    trust_level="verified",
    verified_by=admin.id,
    verification_method="identity",
    privileges={"skip_code_review": True},
)
```

### PayoutService

```python
from modules.marketplace import PayoutService, get_payout_service

service = get_payout_service(db)

# Get publisher balance
balance = service.get_publisher_balance(publisher.id)

# Add earnings (from a sale)
transaction = service.add_earning(
    publisher_id=publisher.id,
    amount=Decimal("100.00"),
    reference_type="order",
    reference_id=order.id,
)

# Create payout batch
batch = service.create_payout_batch(
    period_start=date(2024, 1, 1),
    period_end=date(2024, 1, 31),
    batch_type="regular",
)

# Populate with eligible publishers
service.populate_batch_items(batch)

# Approve and process
service.approve_batch(batch.batch_id, admin.id)
service.process_batch(batch.batch_id)

# Create an adjustment
adjustment = service.create_adjustment(
    publisher_id=publisher.id,
    adjustment_type="bonus",
    amount=Decimal("50.00"),
    description="New publisher bonus",
    created_by=admin.id,
)
service.approve_adjustment(adjustment.id, admin.id)

# Get transaction history
transactions = service.get_transaction_history(publisher.id)

# Setup payout schedule
schedule = service.create_schedule(
    schedule_type="monthly",
    day_of_month=15,
    minimum_amount=Decimal("50.00"),
)
```

## License Types

| Type | Description |
|------|-------------|
| `free` | Open source, no cost |
| `paid` | One-time purchase |
| `subscription` | Monthly/yearly subscription |
| `trial` | Time-limited trial |
| `freemium` | Free with paid features |

## Review Moderation

Reviews go through the following statuses:

1. **published** - Visible to all users
2. **pending** - Awaiting moderation
3. **hidden** - Hidden from public view
4. **reported** - Flagged for review
5. **removed** - Permanently removed

## Analytics Events

The marketplace tracks various events:

- `module.view` - Module page viewed
- `module.download` - Module downloaded
- `module.install` - Module installed
- `module.purchase` - Module purchased
- `search.query` - Search performed
- `review.create` - Review submitted
- `license.activate` - License activated

## Database Migration

Run the marketplace migration:

```bash
# Apply migration
alembic upgrade head

# Or specifically
alembic upgrade j6k7l8m9n0o1
```

## Configuration

Add to your `.env`:

```env
# Marketplace settings
MARKETPLACE_PLATFORM_FEE=30.00  # Platform commission %
MARKETPLACE_MIN_PAYOUT=50.00    # Minimum payout amount
MARKETPLACE_TRIAL_DAYS=14       # Default trial duration

# Stripe (for payments)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PayPal (optional)
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
```

## Usage Example

### Publishing a Module

```python
# 1. Register as publisher
publisher = publisher_service.register_publisher(
    user_id=user.id,
    display_name="Acme Modules",
)

# 2. Create module
module = module_service.create_module(
    publisher_id=publisher.id,
    technical_name="acme_inventory",
    display_name="Acme Inventory",
    short_description="Complete inventory management",
    license_type="paid",
    price=99.00,
)

# 3. Upload version
version = module_service.create_version(
    module_id=module.id,
    version="1.0.0",
    zip_file_url="https://storage.example.com/modules/acme_inventory-1.0.0.zip",
    changelog="Initial release with core features",
)

# 4. Submit for review
module_service.submit_for_review(module.id)

# 5. Admin approves
module_service.approve_module(module.id, reviewer_id=admin.id)

# 6. Publish
module_service.publish_module(module.id)
```

### Installing a Module

```python
# 1. User creates license (free) or purchases (paid)
license_obj = license_service.create_license(
    user_id=user.id,
    module_id=module.id,
    license_type="free",
)

# 2. FastVue instance verifies license
result = license_service.verify_license(
    license_key=license_obj.license_key,
    module_technical_name="acme_inventory",
)

# 3. Activate on instance
activation = license_service.activate_license(
    license_key=license_obj.license_key,
    instance_id=get_machine_id(),
    domain="my-company.com",
)

# 4. Download and install module
download = analytics_service.track_download(
    module_id=module.id,
    license_id=license_obj.id,
)
```

## Security

- License keys are cryptographically generated (32 bytes, hex encoded)
- API keys use secure hashing (SHA-256)
- Publisher verification required for paid modules
- Review moderation prevents abuse
- Rate limiting on public endpoints
- **Code Signing**: Ed25519 and RSA cryptographic signing for module integrity
- **Security Scanning**: Automated scanning for dangerous patterns and vulnerabilities
- **Trusted Publishers**: Verified publishers can skip certain checks

## Code Signing

Publishers can sign their modules to verify integrity:

1. **Generate Key**: Create an Ed25519 or RSA key pair
2. **Sign Module**: Sign module versions with the private key
3. **Verify**: Users can verify signatures before installation

Supported algorithms:
- `ed25519` (recommended) - Fast, secure, small keys
- `rsa` - Traditional, 4096-bit keys

## Security Scanning

Modules are automatically scanned for:
- Dangerous file types (.exe, .dll, .bat, etc.)
- Dangerous code patterns (exec, eval, os.system, pickle)
- Hardcoded secrets and credentials
- Missing manifest files
- Policy violations

Scan results include:
- Risk score (0-100)
- Severity counts (critical, high, medium, low, info)
- Detailed findings with locations and recommendations

## Publisher Payouts

The payout system handles:
- **Balance Tracking**: Available, pending, and reserved balances
- **Batch Processing**: Group payouts for efficient processing
- **Adjustments**: Refunds, chargebacks, bonuses, corrections
- **Scheduling**: Automated weekly/biweekly/monthly payouts
- **Transaction Ledger**: Full audit trail of all balance changes

Payout workflow:
1. Sales earnings added to pending balance
2. After hold period, moved to available balance
3. Batch created for payout period
4. Batch populated with eligible publishers
5. Admin approves batch
6. Batch processed (Stripe/PayPal integration)

## Future Enhancements

- Stripe Connect payout integration
- PayPal Payouts integration
- Subscription billing
- Bundle pricing
- Volume discounts
- Advanced dependency scanning (CVE database)
- Timestamping authority integration
