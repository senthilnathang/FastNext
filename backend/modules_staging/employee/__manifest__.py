# Employee Module Manifest
# Comprehensive employee management: profiles, contacts, documents, skills, bank details

{
    # Module Metadata
    "name": "Employee",
    "technical_name": "employee",
    "version": "1.0.0",
    "summary": "Employee profile and information management",
    "description": """
# Employee Module

Comprehensive employee management system.

## Features

- **Employee Profiles**: Complete employee information with personal and work details
- **Contact Information**: Multiple addresses (home, work, permanent, current)
- **Documents**: Document management with expiry tracking
- **Bank Details**: Banking and payment information with multiple accounts
- **Skills & Certifications**: Skill tracking with proficiency levels and certifications
- **Education & Experience**: Work history and education records
- **Emergency Contacts**: Emergency contact management
- **Dependents**: Family and dependent information for benefits
- **Directory & Org Chart**: Employee directory and organizational chart views
- **Analytics**: Employee statistics and insights
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
    "depends": ["base", "hrms_base"],
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
        "views/list.vue",
        "views/list-refactored.vue",
        "views/form.vue",
        "views/detail.vue",
        "views/analytics.vue",
        "views/documents.vue",
        "views/notes.vue",
        "views/bonus-points.vue",
        "views/disciplinary-actions.vue",
        "views/policies.vue",
        "views/reports.vue",
        "views/settings.vue",
    ],

    # Frontend Assets
    "assets": {
        "routes": None,
        "stores": [],
        "components": [],
        "views": [],
        "styles": [],
        "locales": [],
        "assets": [],
    },

    # Menu Registration - Identical to HRMS frontend
    "menus": [
        {
            "name": "Employee",
            "path": "/employee",
            "icon": "lucide:users",
            "sequence": 5,
            "children": [
                {
                    "name": "Dashboard",
                    "path": "/employee/dashboard",
                    "icon": "lucide:layout-dashboard",
                    "sequence": 1,
                },
                {
                    "name": "Reports",
                    "path": "/employee/reports",
                    "icon": "lucide:file-bar-chart",
                    "sequence": 2,
                },
                {
                    "name": "Employee List",
                    "path": "/employee/list",
                    "icon": "lucide:list",
                    "sequence": 3,
                },
                {
                    "name": "Employee Documents",
                    "path": "/employee/documents",
                    "icon": "lucide:file-text",
                    "sequence": 4,
                },
                {
                    "name": "Employee Notes",
                    "path": "/employee/notes",
                    "icon": "lucide:sticky-note",
                    "sequence": 5,
                },
                {
                    "name": "Bonus Points",
                    "path": "/employee/bonus-points",
                    "icon": "lucide:star",
                    "sequence": 6,
                },
                {
                    "name": "Disciplinary Actions",
                    "path": "/employee/disciplinary-actions",
                    "icon": "lucide:alert-triangle",
                    "sequence": 7,
                },
                {
                    "name": "Policies",
                    "path": "/employee/policies",
                    "icon": "lucide:book-open",
                    "sequence": 8,
                },
                {
                    "name": "Employee Settings",
                    "path": "/employee/settings",
                    "icon": "lucide:settings",
                    "sequence": 9,
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
        # Employee Profile Permissions
        "employee.view_own",
        "employee.edit_own",
        "employee.view_all",
        "employee.create",
        "employee.edit",
        "employee.delete",
        "employee.view_sensitive",
        "employee.export",
        "employee.import",
        # Contact Permissions
        "employee.contact.view",
        "employee.contact.create",
        "employee.contact.edit",
        "employee.contact.delete",
        # Document Permissions
        "employee.document.view",
        "employee.document.create",
        "employee.document.edit",
        "employee.document.delete",
        "employee.document.download",
        # Bank Account Permissions
        "employee.bank.view",
        "employee.bank.create",
        "employee.bank.edit",
        "employee.bank.delete",
        # Skill Permissions
        "employee.skill.view",
        "employee.skill.create",
        "employee.skill.edit",
        "employee.skill.delete",
        # Certification Permissions
        "employee.certification.view",
        "employee.certification.create",
        "employee.certification.edit",
        "employee.certification.delete",
        # Education Permissions
        "employee.education.view",
        "employee.education.create",
        "employee.education.edit",
        "employee.education.delete",
        # Experience Permissions
        "employee.experience.view",
        "employee.experience.create",
        "employee.experience.edit",
        "employee.experience.delete",
        # Emergency Contact Permissions
        "employee.emergency_contact.view",
        "employee.emergency_contact.create",
        "employee.emergency_contact.edit",
        "employee.emergency_contact.delete",
        # Dependent Permissions
        "employee.dependent.view",
        "employee.dependent.create",
        "employee.dependent.edit",
        "employee.dependent.delete",
        # Notes Permissions
        "employee.notes.view",
        "employee.notes.create",
        "employee.notes.edit",
        "employee.notes.delete",
        # Bonus Points Permissions
        "employee.bonus_points.view",
        "employee.bonus_points.allocate",
        "employee.bonus_points.deduct",
        # Disciplinary Actions Permissions
        "employee.disciplinary.view",
        "employee.disciplinary.create",
        "employee.disciplinary.edit",
        "employee.disciplinary.delete",
        # Directory & Org Chart Permissions
        "employee.directory.view",
        "employee.org_chart.view",
        # Analytics Permissions
        "employee.analytics.view",
        # Settings Permissions
        "employee.settings.view",
        "employee.settings.edit",
    ],
    "access_rules": [],

    # Model Access Control (ir.model.access equivalent)
    # Defines which groups can perform CRUD operations on which models
    "model_access": [
        # All authenticated users can read employees (basic info)
        {
            "name": "employee.employees.user",
            "model": "employee.employees",
            "group": "group_user",
            "perm_read": True,
            "perm_write": False,
            "perm_create": False,
            "perm_unlink": False,
        },
        # HR Users can read and write employees
        {
            "name": "employee.employees.hr_user",
            "model": "employee.employees",
            "group": "group_hr_user",
            "perm_read": True,
            "perm_write": True,
            "perm_create": True,
            "perm_unlink": False,
        },
        # HR Managers have full access to employees
        {
            "name": "employee.employees.hr_manager",
            "model": "employee.employees",
            "group": "group_hr_manager",
            "perm_read": True,
            "perm_write": True,
            "perm_create": True,
            "perm_unlink": True,
        },
        # HR Users can manage contacts
        {
            "name": "employee.contacts.hr_user",
            "model": "employee.contacts",
            "group": "group_hr_user",
            "perm_read": True,
            "perm_write": True,
            "perm_create": True,
            "perm_unlink": True,
        },
        # HR Users can manage bank accounts
        {
            "name": "employee.bank_accounts.hr_user",
            "model": "employee.bank_accounts",
            "group": "group_hr_user",
            "perm_read": True,
            "perm_write": True,
            "perm_create": True,
            "perm_unlink": True,
        },
        # HR Users can manage skills
        {
            "name": "employee.skills.hr_user",
            "model": "employee.skills",
            "group": "group_hr_user",
            "perm_read": True,
            "perm_write": True,
            "perm_create": True,
            "perm_unlink": True,
        },
        # HR Users can manage documents
        {
            "name": "employee.documents.hr_user",
            "model": "employee.documents",
            "group": "group_hr_user",
            "perm_read": True,
            "perm_write": True,
            "perm_create": True,
            "perm_unlink": True,
        },
        # HR Users can manage dependents
        {
            "name": "employee.dependents.hr_user",
            "model": "employee.dependents",
            "group": "group_hr_user",
            "perm_read": True,
            "perm_write": True,
            "perm_create": True,
            "perm_unlink": True,
        },
    ],
}
