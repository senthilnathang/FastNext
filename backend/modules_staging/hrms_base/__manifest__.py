# HRMS Base Module Manifest
# Core HR entities: Departments, Job Positions, Shifts, Approval Workflows

{
    # Module Metadata
    "name": "HRMS Base",
    "technical_name": "hrms_base",
    "version": "1.0.0",
    "summary": "Core HRMS entities and configurations",
    "description": """
# HRMS Base Module

Core Human Resource Management System module providing foundational entities and configurations.

## Features

- **Organization Structure**: Departments, Job Positions, Job Roles
- **Employee Types**: Full-time, Part-time, Contract, Intern classifications
- **Shift Management**: Shifts, Schedules, Rotating shifts, Work types
- **Approval Workflows**: Multi-level approvals with delegation
- **Stage/Status Definitions**: Customizable workflow stages
- **Announcements**: Company-wide announcements with tracking
- **Mail Templates**: Email template management
- **HRMS Settings**: Module-wide configurations
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

    # Views (served from module's static/views/ folder)
    "views": [
        "views/departments.vue",
        "views/job-positions.vue",
        "views/job-roles.vue",
        "views/employee-types.vue",
        "views/shifts.vue",
        "views/work-types.vue",
        "views/approval-workflows.vue",
        "views/stage-definitions.vue",
        "views/announcements.vue",
        "views/mail-templates.vue",
        "views/model-access.vue",
        "views/access-rules.vue",
        "views/groups.vue",
    ],

    # Frontend Assets
    "assets": {},

    # Menu Registration
    "menus": [
        {
            "name": "HR Settings",
            "path": "/hrms/settings",
            "icon": "lucide:settings-2",
            "sequence": 99,
            "children": [
                {
                    "name": "Departments",
                    "path": "/hrms/settings/departments",
                    "icon": "lucide:building-2",
                    "sequence": 10,
                },
                {
                    "name": "Job Positions",
                    "path": "/hrms/settings/job-positions",
                    "icon": "lucide:briefcase",
                    "sequence": 20,
                },
                {
                    "name": "Job Roles",
                    "path": "/hrms/settings/job-roles",
                    "icon": "lucide:user-cog",
                    "sequence": 25,
                },
                {
                    "name": "Employee Types",
                    "path": "/hrms/settings/employee-types",
                    "icon": "lucide:users",
                    "sequence": 30,
                },
                {
                    "name": "Shifts",
                    "path": "/hrms/settings/shifts",
                    "icon": "lucide:clock",
                    "sequence": 40,
                },
                {
                    "name": "Work Types",
                    "path": "/hrms/settings/work-types",
                    "icon": "lucide:home",
                    "sequence": 50,
                },
                {
                    "name": "Approval Workflows",
                    "path": "/hrms/settings/approval-workflows",
                    "icon": "lucide:git-branch",
                    "sequence": 60,
                },
                {
                    "name": "Stage Definitions",
                    "path": "/hrms/settings/stage-definitions",
                    "icon": "lucide:layers",
                    "sequence": 65,
                },
                {
                    "name": "Announcements",
                    "path": "/hrms/settings/announcements",
                    "icon": "lucide:megaphone",
                    "sequence": 70,
                },
                {
                    "name": "Mail Templates",
                    "path": "/hrms/settings/mail-templates",
                    "icon": "lucide:mail",
                    "sequence": 75,
                },
                {
                    "name": "Model Access",
                    "path": "/hrms/settings/model-access",
                    "icon": "lucide:shield",
                    "sequence": 80,
                    "permission": "permission.manage",
                },
                {
                    "name": "Access Rules",
                    "path": "/hrms/settings/access-rules",
                    "icon": "lucide:shield-check",
                    "sequence": 85,
                    "permission": "permission.manage",
                },
                {
                    "name": "Groups",
                    "path": "/hrms/settings/groups",
                    "icon": "lucide:users-round",
                    "sequence": 90,
                    "permission": "permission.manage",
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
        # Department Permissions
        "hrms_base.department.view",
        "hrms_base.department.create",
        "hrms_base.department.edit",
        "hrms_base.department.delete",
        # Job Position Permissions
        "hrms_base.job_position.view",
        "hrms_base.job_position.create",
        "hrms_base.job_position.edit",
        "hrms_base.job_position.delete",
        # Job Role Permissions
        "hrms_base.job_role.view",
        "hrms_base.job_role.create",
        "hrms_base.job_role.edit",
        "hrms_base.job_role.delete",
        # Employee Type Permissions
        "hrms_base.employee_type.view",
        "hrms_base.employee_type.create",
        "hrms_base.employee_type.edit",
        "hrms_base.employee_type.delete",
        # Shift Permissions
        "hrms_base.shift.view",
        "hrms_base.shift.create",
        "hrms_base.shift.edit",
        "hrms_base.shift.delete",
        "hrms_base.shift.manage_schedules",
        # Work Type Permissions
        "hrms_base.work_type.view",
        "hrms_base.work_type.create",
        "hrms_base.work_type.edit",
        "hrms_base.work_type.delete",
        # Rotating Shift Permissions
        "hrms_base.rotating_shift.view",
        "hrms_base.rotating_shift.create",
        "hrms_base.rotating_shift.edit",
        "hrms_base.rotating_shift.delete",
        "hrms_base.rotating_shift.assign",
        # Shift Request Permissions
        "hrms_base.shift_request.view",
        "hrms_base.shift_request.create",
        "hrms_base.shift_request.approve",
        "hrms_base.shift_request.reject",
        # Work Type Request Permissions
        "hrms_base.work_type_request.view",
        "hrms_base.work_type_request.create",
        "hrms_base.work_type_request.approve",
        "hrms_base.work_type_request.reject",
        # Approval Workflow Permissions
        "hrms_base.approval_workflow.view",
        "hrms_base.approval_workflow.create",
        "hrms_base.approval_workflow.edit",
        "hrms_base.approval_workflow.delete",
        "hrms_base.approval_workflow.manage_levels",
        "hrms_base.approval_workflow.manage_rules",
        "hrms_base.approval_workflow.manage_delegations",
        # Approval Request Permissions
        "hrms_base.approval_request.view",
        "hrms_base.approval_request.approve",
        "hrms_base.approval_request.reject",
        "hrms_base.approval_request.delegate",
        # Stage/Status Permissions
        "hrms_base.stage_definition.view",
        "hrms_base.stage_definition.create",
        "hrms_base.stage_definition.edit",
        "hrms_base.stage_definition.delete",
        "hrms_base.status_definition.view",
        "hrms_base.status_definition.create",
        "hrms_base.status_definition.edit",
        "hrms_base.status_definition.delete",
        # Announcement Permissions
        "hrms_base.announcement.view",
        "hrms_base.announcement.create",
        "hrms_base.announcement.edit",
        "hrms_base.announcement.delete",
        "hrms_base.announcement.publish",
        # Mail Template Permissions
        "hrms_base.mail_template.view",
        "hrms_base.mail_template.create",
        "hrms_base.mail_template.edit",
        "hrms_base.mail_template.delete",
        # Settings Permissions
        "hrms_base.settings.view",
        "hrms_base.settings.edit",
    ],
    "access_rules": [],
}
