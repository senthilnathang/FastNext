# CRM Module Manifest
# Salesforce-like CRM with Leads, Opportunities, Contacts, Accounts
# Features: Kanban views, Pipeline stages, Workflow automation

{
    # Module Metadata
    "name": "CRM",
    "technical_name": "crm",
    "version": "1.0.0",
    "summary": "Customer Relationship Management",
    "description": """
# CRM Module

A comprehensive Customer Relationship Management system with Salesforce-like features.

## Features

- **Leads Management**: Track and qualify sales leads
- **Opportunities**: Manage deals through pipeline stages
- **Contacts**: Maintain customer contact information
- **Accounts**: Manage company/organization records
- **Activities**: Log calls, meetings, tasks, emails
- **Kanban Views**: Visual pipeline management with drag-drop
- **Pipeline Stages**: Customizable sales stages with probabilities
- **Workflow Automation**: Stage gates and actions

## Views

- List views with advanced filtering
- Kanban boards with drag-drop
- Form views with activity timeline
- Dashboard with analytics
    """,
    "author": "FastVue",
    "website": "https://fastvue.io",
    "license": "MIT",
    "category": "Sales",

    # Module Configuration
    "application": True,
    "installable": True,
    "auto_install": False,

    # Dependencies
    "depends": ["base"],
    "external_dependencies": {
        "python": [],
        "bin": [],
    },

    # Components to Load
    "models": ["models"],
    "api": ["api"],
    "services": ["services"],
    "data": ["data/demo.json"],
    "demo": ["data/demo.json"],

    # Frontend Assets
    "assets": {
        "routes": "static/src/routes/index.ts",
        "stores": [],
        "components": [],
        "views": [],
        "styles": [],
        "locales": [],
        "assets": [],
    },

    # Menu Registration
    "menus": [
        {"name": "CRM", "path": "/crm", "icon": "Users", "sequence": 20},
        {"name": "Dashboard", "path": "/crm", "icon": "LayoutDashboard", "sequence": 1, "parent": "CRM"},
        {"name": "Leads", "path": "/crm/leads", "icon": "UserPlus", "sequence": 10, "parent": "CRM"},
        {"name": "Opportunities", "path": "/crm/opportunities", "icon": "TrendingUp", "sequence": 20, "parent": "CRM"},
        {"name": "Contacts", "path": "/crm/contacts", "icon": "Contact", "sequence": 30, "parent": "CRM"},
        {"name": "Accounts", "path": "/crm/accounts", "icon": "Building", "sequence": 40, "parent": "CRM"},
        {"name": "Activities", "path": "/crm/activities", "icon": "Activity", "sequence": 50, "parent": "CRM"},
        {"name": "Settings", "path": "/crm/settings", "icon": "Settings", "sequence": 100, "parent": "CRM"},
    ],

    # Lifecycle Hooks
    "pre_init_hook": None,
    "post_init_hook": None,
    "post_load_hook": None,
    "uninstall_hook": None,

    # Permissions
    "permissions": [],
    "access_rules": [],
}
