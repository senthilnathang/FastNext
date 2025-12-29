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
        {
            "name": "CRM",
            "path": "/crm",
            "icon": "mdi:account-group",
            "sequence": 20,
            "children": [
                {
                    "name": "Dashboard",
                    "path": "/crm/dashboard",
                    "icon": "mdi:view-dashboard",
                    "sequence": 1,
                },
                {
                    "name": "Leads",
                    "path": "/crm/leads",
                    "icon": "mdi:account-plus",
                    "sequence": 10,
                },
                {
                    "name": "Opportunities",
                    "path": "/crm/opportunities",
                    "icon": "mdi:cash-multiple",
                    "sequence": 20,
                },
                {
                    "name": "Contacts",
                    "path": "/crm/contacts",
                    "icon": "mdi:card-account-phone",
                    "sequence": 30,
                },
                {
                    "name": "Accounts",
                    "path": "/crm/accounts",
                    "icon": "mdi:domain",
                    "sequence": 40,
                },
                {
                    "name": "Activities",
                    "path": "/crm/activities",
                    "icon": "mdi:calendar-check",
                    "sequence": 50,
                },
                {
                    "name": "Pipeline Settings",
                    "path": "/crm/settings/pipelines",
                    "icon": "mdi:cog",
                    "sequence": 100,
                },
            ],
        },
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
