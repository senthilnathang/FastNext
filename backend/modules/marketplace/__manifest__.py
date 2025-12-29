{
    "technical_name": "marketplace",
    "name": "FastVue Marketplace",
    "display_name": "FastVue Marketplace",
    "version": "1.0.0",
    "category": "Platform",
    "summary": "Enterprise module marketplace for FastVue",
    "description": """
# FastVue Marketplace

Enterprise-grade module marketplace for discovering, distributing,
and monetizing FastVue modules.

## Features

### For Users
- Browse and search modules
- Free and paid module downloads
- License management
- Review and rate modules

### For Publishers
- Publish and manage modules
- Version management
- Analytics dashboard
- Earnings and payouts

### For Administrators
- Module approval workflow
- Publisher verification
- Platform analytics
- Revenue management

## Models

- **Publisher**: Module developer accounts
- **MarketplaceModule**: Module listings
- **ModuleVersion**: Module versions with downloads
- **License**: Module licenses and entitlements
- **Order**: Purchase orders
- **ModuleReview**: User reviews and ratings

## API Endpoints

- `GET /api/v1/marketplace/modules/` - Browse modules
- `GET /api/v1/marketplace/modules/{slug}` - Module details
- `POST /api/v1/marketplace/licenses/verify` - Verify license
- `POST /api/v1/marketplace/licenses/activate` - Activate license
    """,
    "author": "FastVue Team",
    "website": "https://fastvue.io",
    "license": "LGPL-3",
    "depends": ["base"],
    "external_dependencies": {
        "python": [
            "stripe",      # Payment processing
            "markdown",    # Description rendering
        ],
    },
    "data": [],
    "installable": True,
    "auto_install": False,
    "application": True,
}
