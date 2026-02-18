# Inventory Module Manifest

{
    "name": "Inventory",
    "technical_name": "inventory",
    "version": "1.0.0",
    "summary": "Manage your stock and logistics activities",
    "description": """
# Inventory Management

Key features:
- Products: Manage products, variants, and categories.
- Operations: Receipts, Deliveries, Internal Transfers.
- Stock Levels: Track stock across multiple locations.
- Traceability: Lots and Serial Numbers.
    """,
    "author": "FastVue",
    "website": "https://fastvue.io",
    "license": "MIT",
    "category": "Inventory",
    "application": True,
    "installable": True,
    "auto_install": False,
    "depends": ["base"],
    "models": ["models"],
    "api": ["api"],
    "services": ["services"],
    "data": [],
    "menus": [
        {"name": "Inventory", "path": "/inventory", "icon": "Box", "sequence": 30},
        {"name": "Products", "path": "/inventory/products", "icon": "Package", "sequence": 10, "parent": "Inventory"},
        {"name": "Operations", "path": "/inventory/operations", "icon": "ArrowLeftRight", "sequence": 20, "parent": "Inventory"},
    ],
}
