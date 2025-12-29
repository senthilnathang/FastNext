{
    "name": "Base",
    "version": "1.0.0",
    "summary": "FastNext Base Module with Core Features",
    "description": """
Core module for the FastNext module system.

Features:
- Module state tracking and management
- InstalledModule database persistence
- Module reload signals for frontend sync

This module is automatically installed and is a dependency for all other modules.
""",
    "author": "FastNext Team",
    "website": "https://fastnext.dev",
    "license": "MIT",
    "category": "Technical",
    "application": False,
    "installable": True,
    "auto_install": True,
    "depends": [],
    "external_dependencies": {
        "python": [],
    },
    "models": ["models"],
    "api": ["api"],
    "services": ["services"],
    "data": [],
    "assets": {},
}
