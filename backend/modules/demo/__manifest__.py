{
    "name": "Demo Module",
    "version": "1.0.0",
    "summary": "Demonstration module showcasing the FastVue module system",
    "description": """
This module demonstrates the FastVue module system capabilities:

- Module structure with models, APIs, and services
- Dependency management
- Sample data loading
- Frontend asset integration

Use this as a template for creating your own modules.
    """,
    "author": "FastVue Team",
    "website": "https://fastvue.dev",
    "license": "MIT",
    "category": "Demo",
    "application": True,
    "installable": True,
    "auto_install": False,
    "depends": ["base"],
    "models": ["models"],
    "api": ["api.routes"],
    "services": ["services"],
    "data": ["data/demo_data.json"],
    "external_dependencies": {
        "python": [],
        "bin": [],
    },
    "assets": {
        "routes": "static/src/routes/index.ts",
        "stores": [],
        "components": [],
        "views": [],
        "locales": [],
    },
    "menus": [
        {
            "name": "Demo",
            "path": "/demo",
            "icon": "FlaskConical",
            "sequence": 100,
        }
    ],
}
