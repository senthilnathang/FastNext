# Onboarding Module Manifest
# New employee onboarding process management

{
    # Module Metadata
    "name": "Onboarding",
    "technical_name": "onboarding",
    "version": "1.0.0",
    "summary": "Employee onboarding process management",
    "description": """
# Onboarding Module

Comprehensive onboarding workflow management for new employees.

## Features

- **Onboarding Templates**: Define reusable onboarding workflows
- **Kanban Pipeline**: Visual process tracking with drag-and-drop
- **Stages**: Configurable onboarding stages
- **Task Templates**: Pre-defined tasks for onboarding
- **Task Tracking**: Monitor task completion and progress
- **Document Types**: Required documents for new hires
- **Document Collection**: Track document submission and verification
- **Verifications**: Background and reference verification
- **Portal Access**: New hire self-service portal
- **Mentor/Buddy Assignment**: Assign mentors to new hires
- **Conversions**: Track probation to permanent conversion
- **Progress Dashboard**: Real-time onboarding progress
    """,
    "author": "FastVue",
    "website": "https://fastvue.io",
    "license": "MIT",
    "category": "Human Resources",

    # Module Configuration
    "application": True,
    "installable": True,
    "auto_install": False,

    # Dependencies
    "depends": ["base", "hrms_base", "employee", "recruitment"],
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

    # Views (served from module's views/ folder)
    "views": [
        "views/dashboard.vue",
        "views/processes.vue",
        "views/templates.vue",
        "views/documents.vue",
        "views/verifications.vue",
        "views/conversions.vue",
    ],

    # Frontend Assets
    "assets": {},

    # Menu Registration - Identical to HRMS frontend
    "menus": [
        {
            "name": "Onboarding",
            "path": "/onboarding",
            "icon": "lucide:user-check",
            "sequence": 70,
            "children": [
                {
                    "name": "Dashboard",
                    "path": "/onboarding/dashboard",
                    "icon": "lucide:layout-dashboard",
                    "sequence": 1,
                },
                {
                    "name": "Active Processes",
                    "path": "/onboarding/processes",
                    "icon": "lucide:git-branch",
                    "sequence": 2,
                },
                {
                    "name": "Templates",
                    "path": "/onboarding/templates",
                    "icon": "lucide:file-text",
                    "sequence": 3,
                },
                {
                    "name": "Conversions",
                    "path": "/onboarding/conversions",
                    "icon": "lucide:user-plus",
                    "sequence": 4,
                },
                {
                    "name": "Verifications",
                    "path": "/onboarding/verifications",
                    "icon": "lucide:shield-check",
                    "sequence": 5,
                },
                {
                    "name": "Documents",
                    "path": "/onboarding/documents",
                    "icon": "lucide:file-check",
                    "sequence": 6,
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
    "permissions": [
        # Onboarding Process Permissions
        "onboarding.process.view",
        "onboarding.process.view_all",
        "onboarding.process.create",
        "onboarding.process.edit",
        "onboarding.process.delete",
        "onboarding.process.start",
        "onboarding.process.complete",
        "onboarding.process.cancel",
        "onboarding.process.assign_mentor",
        # Template Permissions
        "onboarding.template.view",
        "onboarding.template.create",
        "onboarding.template.edit",
        "onboarding.template.delete",
        "onboarding.template.duplicate",
        # Stage Permissions
        "onboarding.stage.view",
        "onboarding.stage.create",
        "onboarding.stage.edit",
        "onboarding.stage.delete",
        "onboarding.stage.reorder",
        # Task Permissions
        "onboarding.task.view",
        "onboarding.task.view_all",
        "onboarding.task.create",
        "onboarding.task.edit",
        "onboarding.task.delete",
        "onboarding.task.assign",
        "onboarding.task.complete",
        "onboarding.task.reopen",
        # Task Template Permissions
        "onboarding.task_template.view",
        "onboarding.task_template.create",
        "onboarding.task_template.edit",
        "onboarding.task_template.delete",
        # Document Type Permissions
        "onboarding.document_type.view",
        "onboarding.document_type.create",
        "onboarding.document_type.edit",
        "onboarding.document_type.delete",
        # Document Permissions
        "onboarding.document.view",
        "onboarding.document.upload",
        "onboarding.document.download",
        "onboarding.document.approve",
        "onboarding.document.reject",
        "onboarding.document.delete",
        # Verification Permissions
        "onboarding.verification.view",
        "onboarding.verification.create",
        "onboarding.verification.edit",
        "onboarding.verification.complete",
        # Checklist Permissions
        "onboarding.checklist.view",
        "onboarding.checklist.edit",
        "onboarding.checklist.complete",
        # Conversion Permissions
        "onboarding.conversion.view",
        "onboarding.conversion.initiate",
        "onboarding.conversion.approve",
        "onboarding.conversion.reject",
        # Dashboard Permissions
        "onboarding.dashboard.view",
        # Reports Permissions
        "onboarding.reports.view",
        "onboarding.reports.export",
        # Settings Permissions
        "onboarding.settings.view",
        "onboarding.settings.edit",
    ],
    "access_rules": [],

    # Model Access Control (ir.model.access equivalent)
    "model_access": [
        # HR Users can manage templates
        {
            "name": "onboarding.template.hr_user",
            "model": "onboarding.onboarding_template",
            "group": "group_hr_user",
            "perm_read": True,
            "perm_write": True,
            "perm_create": True,
            "perm_unlink": True,
        },
        # HR Users can manage onboarding processes
        {
            "name": "onboarding.process.hr_user",
            "model": "onboarding.onboarding_process",
            "group": "group_hr_user",
            "perm_read": True,
            "perm_write": True,
            "perm_create": True,
            "perm_unlink": True,
        },
        # HR Users can manage onboarding employees
        {
            "name": "onboarding.employee.hr_user",
            "model": "onboarding.onboarding_employee",
            "group": "group_hr_user",
            "perm_read": True,
            "perm_write": True,
            "perm_create": True,
            "perm_unlink": True,
        },
        # HR Users can manage tasks
        {
            "name": "onboarding.task.hr_user",
            "model": "onboarding.onboarding_task",
            "group": "group_hr_user",
            "perm_read": True,
            "perm_write": True,
            "perm_create": True,
            "perm_unlink": True,
        },
        # HR Users can manage documents
        {
            "name": "onboarding.document.hr_user",
            "model": "onboarding.onboarding_document",
            "group": "group_hr_user",
            "perm_read": True,
            "perm_write": True,
            "perm_create": True,
            "perm_unlink": True,
        },
    ],
}
