{
    "name": "Base",
    "version": "1.1.0",
    "summary": "FastVue Base Module with Enterprise Features",
    "description": """
Core module for the FastVue module system.

Features:
- Module state tracking and management
- Record Rules (row-level security)
- Sequences (auto-numbering with date patterns)
- Scheduled Actions (cron jobs)
- Server Actions and Automation Rules
- Computed Fields (formulas and aggregations)
- Data Loader (JSON/YAML seed data)
- Model Hooks (lifecycle triggers)
- Model Data (XML ID registry)

Inspired by Odoo and Salesforce enterprise features.
""",
    "author": "FastVue Team",
    "website": "https://fastvue.dev",
    "license": "MIT",
    "category": "Technical",
    "application": False,
    "installable": True,
    "auto_install": True,
    "depends": [],
    "external_dependencies": {
        "python": ["pyyaml", "croniter"],
    },
    "models": ["models"],
    "api": ["api"],  # Uses combined router from api/__init__.py
    "services": ["services"],
    "data": [],
    "assets": {},
}
