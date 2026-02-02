# Offboarding Module Manifest
# Employee exit process management

{
    # Module Metadata
    "name": "Offboarding",
    "technical_name": "offboarding",
    "version": "1.0.0",
    "summary": "Employee offboarding and exit management",
    "description": """
# Offboarding Module

Comprehensive offboarding workflow management for departing employees.

## Features

- **Exit Reasons**: Predefined exit reason categories
- **Offboarding Templates**: Define exit workflows by type
- **Kanban Pipeline**: Visual exit process tracking
- **Task Management**: Track exit tasks and clearances
- **Asset Returns**: Track company asset returns
- **Exit Interviews**: Conduct and record exit interviews
- **FnF Settlement**: Full and final settlement calculation
- **Knowledge Transfer**: Handover tracking and documentation
- **Resignation Management**: Track and approve resignations
- **Clearance Workflow**: Department-wise clearance process
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
    "depends": ["base", "hrms_base", "employee"],
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
        "views/pipeline.vue",
        "views/resignations.vue",
        "views/settings.vue",
    ],

    # Frontend Assets
    "assets": {},

    # Menu Registration - Identical to HRMS frontend
    "menus": [
        {
            "name": "Offboarding",
            "path": "/offboarding",
            "icon": "lucide:user-minus",
            "sequence": 75,
            "children": [
                {
                    "name": "Dashboard",
                    "path": "/offboarding/dashboard",
                    "icon": "lucide:layout-dashboard",
                    "sequence": 1,
                },
                {
                    "name": "Pipeline",
                    "path": "/offboarding/pipeline",
                    "icon": "lucide:git-branch",
                    "sequence": 2,
                },
                {
                    "name": "Resignations",
                    "path": "/offboarding/resignations",
                    "icon": "lucide:file-text",
                    "sequence": 3,
                },
                {
                    "name": "Settings",
                    "path": "/offboarding/settings",
                    "icon": "lucide:settings",
                    "sequence": 4,
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
        # Offboarding Process Permissions
        "offboarding.process.view",
        "offboarding.process.view_all",
        "offboarding.process.create",
        "offboarding.process.edit",
        "offboarding.process.delete",
        "offboarding.process.start",
        "offboarding.process.approve",
        "offboarding.process.reject",
        "offboarding.process.complete",
        "offboarding.process.cancel",
        # Template Permissions
        "offboarding.template.view",
        "offboarding.template.create",
        "offboarding.template.edit",
        "offboarding.template.delete",
        # Stage Permissions
        "offboarding.stage.view",
        "offboarding.stage.create",
        "offboarding.stage.edit",
        "offboarding.stage.delete",
        # Exit Reason Permissions
        "offboarding.exit_reason.view",
        "offboarding.exit_reason.create",
        "offboarding.exit_reason.edit",
        "offboarding.exit_reason.delete",
        # Task Permissions
        "offboarding.task.view",
        "offboarding.task.view_all",
        "offboarding.task.create",
        "offboarding.task.edit",
        "offboarding.task.delete",
        "offboarding.task.assign",
        "offboarding.task.complete",
        "offboarding.task.reopen",
        # Asset Return Permissions
        "offboarding.asset.view",
        "offboarding.asset.create",
        "offboarding.asset.edit",
        "offboarding.asset.mark_returned",
        "offboarding.asset.mark_missing",
        # Exit Interview Permissions
        "offboarding.interview.view",
        "offboarding.interview.schedule",
        "offboarding.interview.conduct",
        "offboarding.interview.edit",
        "offboarding.interview.delete",
        # FnF Settlement Permissions
        "offboarding.fnf.view",
        "offboarding.fnf.view_all",
        "offboarding.fnf.create",
        "offboarding.fnf.edit",
        "offboarding.fnf.calculate",
        "offboarding.fnf.approve",
        "offboarding.fnf.reject",
        "offboarding.fnf.process",
        "offboarding.fnf.pay",
        # Knowledge Transfer Permissions
        "offboarding.knowledge_transfer.view",
        "offboarding.knowledge_transfer.assign",
        "offboarding.knowledge_transfer.complete",
        # Resignation Permissions
        "offboarding.resignation.view",
        "offboarding.resignation.submit",
        "offboarding.resignation.approve",
        "offboarding.resignation.reject",
        "offboarding.resignation.withdraw",
        # Clearance Permissions
        "offboarding.clearance.view",
        "offboarding.clearance.approve",
        "offboarding.clearance.reject",
        # Dashboard Permissions
        "offboarding.dashboard.view",
        # Reports Permissions
        "offboarding.reports.view",
        "offboarding.reports.export",
        # Settings Permissions
        "offboarding.settings.view",
        "offboarding.settings.edit",
    ],
    "access_rules": [],

    # Model Access Control (ir.model.access equivalent)
    "model_access": [
        # HR Users can manage templates
        {
            "name": "offboarding.template.hr_user",
            "model": "offboarding.offboarding_template",
            "group": "group_hr_user",
            "perm_read": True,
            "perm_write": True,
            "perm_create": True,
            "perm_unlink": True,
        },
        # HR Users can manage offboarding employees
        {
            "name": "offboarding.employee.hr_user",
            "model": "offboarding.offboarding_employee",
            "group": "group_hr_user",
            "perm_read": True,
            "perm_write": True,
            "perm_create": True,
            "perm_unlink": True,
        },
        # HR Users can manage exit reasons
        {
            "name": "offboarding.exit_reason.hr_user",
            "model": "offboarding.offboarding_exit_reason",
            "group": "group_hr_user",
            "perm_read": True,
            "perm_write": True,
            "perm_create": True,
            "perm_unlink": True,
        },
        # HR Users can manage tasks
        {
            "name": "offboarding.task.hr_user",
            "model": "offboarding.offboarding_task",
            "group": "group_hr_user",
            "perm_read": True,
            "perm_write": True,
            "perm_create": True,
            "perm_unlink": True,
        },
        # HR Users can manage exit interviews
        {
            "name": "offboarding.exit_interview.hr_user",
            "model": "offboarding.offboarding_exit_interview",
            "group": "group_hr_user",
            "perm_read": True,
            "perm_write": True,
            "perm_create": True,
            "perm_unlink": True,
        },
        # HR Users can manage FnF settlements
        {
            "name": "offboarding.fnf_settlement.hr_user",
            "model": "offboarding.offboarding_fnf_settlement",
            "group": "group_hr_user",
            "perm_read": True,
            "perm_write": True,
            "perm_create": True,
            "perm_unlink": True,
        },
    ],
}
