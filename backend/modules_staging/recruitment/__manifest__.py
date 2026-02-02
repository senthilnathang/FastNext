# Recruitment Module Manifest
# Job postings, candidates, stages, interviews, offers, and hiring management

{
    # Module Metadata
    "name": "Recruitment",
    "technical_name": "recruitment",
    "version": "1.0.0",
    "summary": "Recruitment management with pipeline and hiring workflow",
    "description": """
# Recruitment Module

Complete recruitment management system with job postings, candidate tracking, interviews, and offers.

## Features

- **Job Openings**: Create and publish job postings with requirements
- **Candidates**: Manage candidate applications and profiles
- **Pipeline/Kanban**: Visual recruitment pipeline with drag-and-drop
- **Stages**: Configurable recruitment stages per job
- **Interviews**: Schedule and track interviews with feedback
- **Scoring**: Candidate scoring and ranking system
- **Offers**: Generate, approve, and track job offers
- **Skills**: Skill requirements and matching
- **Screening Quizzes**: Pre-hire assessments via Quiz module
- **Automation**: Workflow automation rules
- **DEI Dashboard**: Diversity, Equity, Inclusion analytics
- **Reports**: Comprehensive hiring analytics
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
    "depends": ["base", "hrms_base", "employee", "quiz"],
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
        "views/reports.vue",
        "views/pipeline.vue",
        "views/jobs.vue",
        "views/candidates.vue",
        "views/interviews.vue",
        "views/interview-feedback.vue",
        "views/interview-questions.vue",
        "views/interview-scorecards.vue",
        "views/interview-availability.vue",
        "views/talent-pools.vue",
        "views/questionnaires.vue",
        "views/scoring.vue",
        "views/offers.vue",
        "views/sourcing.vue",
        "views/interview-kits.vue",
        "views/dei.vue",
        "views/automation.vue",
    ],

    # Frontend Assets
    "assets": {},

    # Menu Registration - Identical to HRMS frontend
    "menus": [
        {
            "name": "Recruitment",
            "path": "/recruitment",
            "icon": "lucide:user-plus",
            "sequence": 10,
            "children": [
                {
                    "name": "Dashboard",
                    "path": "/recruitment/dashboard",
                    "icon": "lucide:layout-dashboard",
                    "sequence": 1,
                },
                {
                    "name": "Reports",
                    "path": "/recruitment/reports",
                    "icon": "lucide:file-bar-chart",
                    "sequence": 2,
                },
                {
                    "name": "Pipeline",
                    "path": "/recruitment/pipeline",
                    "icon": "lucide:kanban",
                    "sequence": 3,
                },
                {
                    "name": "Jobs",
                    "path": "/recruitment/jobs",
                    "icon": "lucide:briefcase",
                    "sequence": 4,
                },
                {
                    "name": "Candidates",
                    "path": "/recruitment/candidates",
                    "icon": "lucide:users",
                    "sequence": 5,
                },
                {
                    "name": "Interviews",
                    "path": "/recruitment/interviews",
                    "icon": "lucide:video",
                    "sequence": 6,
                },
                {
                    "name": "Interview Feedback",
                    "path": "/recruitment/interview-feedback",
                    "icon": "lucide:message-square-text",
                    "sequence": 7,
                },
                {
                    "name": "Question Bank",
                    "path": "/recruitment/interview-questions",
                    "icon": "lucide:help-circle",
                    "sequence": 8,
                },
                {
                    "name": "Scorecard Templates",
                    "path": "/recruitment/interview-scorecards",
                    "icon": "lucide:clipboard-check",
                    "sequence": 9,
                },
                {
                    "name": "Availability",
                    "path": "/recruitment/interview-availability",
                    "icon": "lucide:calendar-clock",
                    "sequence": 10,
                },
                {
                    "name": "Talent Pools",
                    "path": "/recruitment/talent-pools",
                    "icon": "lucide:users-round",
                    "sequence": 11,
                },
                {
                    "name": "Questionnaires",
                    "path": "/recruitment/questionnaires",
                    "icon": "lucide:clipboard-list",
                    "sequence": 12,
                },
                {
                    "name": "Scoring & Ranking",
                    "path": "/recruitment/scoring",
                    "icon": "lucide:star",
                    "sequence": 13,
                },
                {
                    "name": "Job Offers",
                    "path": "/recruitment/offers",
                    "icon": "lucide:file-check",
                    "sequence": 14,
                },
                {
                    "name": "Sourcing",
                    "path": "/recruitment/sourcing",
                    "icon": "lucide:search",
                    "sequence": 15,
                },
                {
                    "name": "Interview Kits",
                    "path": "/recruitment/interview-kits",
                    "icon": "lucide:clipboard-list",
                    "sequence": 16,
                },
                {
                    "name": "DEI Dashboard",
                    "path": "/recruitment/dei",
                    "icon": "lucide:users-round",
                    "sequence": 17,
                },
                {
                    "name": "Automation",
                    "path": "/recruitment/automation",
                    "icon": "lucide:bot",
                    "sequence": 18,
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
        # Job Opening Permissions
        "recruitment.job.view",
        "recruitment.job.create",
        "recruitment.job.edit",
        "recruitment.job.delete",
        "recruitment.job.publish",
        "recruitment.job.close",
        "recruitment.job.export",
        # Candidate Permissions
        "recruitment.candidate.view",
        "recruitment.candidate.create",
        "recruitment.candidate.edit",
        "recruitment.candidate.delete",
        "recruitment.candidate.move_stage",
        "recruitment.candidate.rate",
        "recruitment.candidate.add_notes",
        "recruitment.candidate.export",
        "recruitment.candidate.import",
        # Stage Permissions
        "recruitment.stage.view",
        "recruitment.stage.create",
        "recruitment.stage.edit",
        "recruitment.stage.delete",
        "recruitment.stage.reorder",
        # Interview Permissions
        "recruitment.interview.view",
        "recruitment.interview.schedule",
        "recruitment.interview.reschedule",
        "recruitment.interview.cancel",
        "recruitment.interview.complete",
        "recruitment.interview.feedback",
        "recruitment.interview.view_feedback",
        # Offer Permissions
        "recruitment.offer.view",
        "recruitment.offer.create",
        "recruitment.offer.edit",
        "recruitment.offer.delete",
        "recruitment.offer.approve",
        "recruitment.offer.send",
        "recruitment.offer.withdraw",
        # Skill Permissions
        "recruitment.skill.view",
        "recruitment.skill.create",
        "recruitment.skill.edit",
        "recruitment.skill.delete",
        # Quiz Integration Permissions (Screening Questionnaires)
        "recruitment.quiz.view",
        "recruitment.quiz.assign",
        "recruitment.quiz.unassign",
        "recruitment.quiz.invite_candidate",
        "recruitment.quiz.bulk_invite",
        "recruitment.quiz.view_results",
        # Interview Kit Permissions
        "recruitment.interview_kit.view",
        "recruitment.interview_kit.create",
        "recruitment.interview_kit.edit",
        "recruitment.interview_kit.delete",
        # Scorecard Permissions
        "recruitment.scorecard.view",
        "recruitment.scorecard.create",
        "recruitment.scorecard.edit",
        "recruitment.scorecard.delete",
        # Automation Permissions
        "recruitment.automation.view",
        "recruitment.automation.create",
        "recruitment.automation.edit",
        "recruitment.automation.delete",
        # Reports Permissions
        "recruitment.reports.view",
        "recruitment.reports.export",
        "recruitment.reports.dei",
        # Analytics Permissions
        "recruitment.analytics.view",
        # Sourcing Permissions
        "recruitment.sourcing.view",
        "recruitment.sourcing.manage",
        # Onboarding Trigger Permissions
        "recruitment.onboarding.initiate",
    ],
    "access_rules": [],

    # Model Access Control (ir.model.access equivalent)
    # Defines which groups can perform CRUD operations on which models
    "model_access": [
        # All authenticated users can view job openings
        {
            "name": "recruitment.recruitment.user",
            "model": "recruitment.recruitment_recruitment",
            "group": "group_user",
            "perm_read": True,
            "perm_write": False,
            "perm_create": False,
            "perm_unlink": False,
        },
        # HR Users can manage job openings
        {
            "name": "recruitment.recruitment.hr_user",
            "model": "recruitment.recruitment_recruitment",
            "group": "group_hr_user",
            "perm_read": True,
            "perm_write": True,
            "perm_create": True,
            "perm_unlink": False,
        },
        # HR Managers have full access to job openings
        {
            "name": "recruitment.recruitment.hr_manager",
            "model": "recruitment.recruitment_recruitment",
            "group": "group_hr_manager",
            "perm_read": True,
            "perm_write": True,
            "perm_create": True,
            "perm_unlink": True,
        },
        # HR Users can manage candidates
        {
            "name": "recruitment.candidate.hr_user",
            "model": "recruitment.recruitment_candidate",
            "group": "group_hr_user",
            "perm_read": True,
            "perm_write": True,
            "perm_create": True,
            "perm_unlink": False,
        },
        # HR Managers have full access to candidates
        {
            "name": "recruitment.candidate.hr_manager",
            "model": "recruitment.recruitment_candidate",
            "group": "group_hr_manager",
            "perm_read": True,
            "perm_write": True,
            "perm_create": True,
            "perm_unlink": True,
        },
        # HR Users can manage interviews
        {
            "name": "recruitment.interview.hr_user",
            "model": "recruitment.recruitment_interview_schedule",
            "group": "group_hr_user",
            "perm_read": True,
            "perm_write": True,
            "perm_create": True,
            "perm_unlink": True,
        },
        # HR Users can manage job offers
        {
            "name": "recruitment.offer.hr_user",
            "model": "recruitment.recruitment_job_offer",
            "group": "group_hr_user",
            "perm_read": True,
            "perm_write": True,
            "perm_create": True,
            "perm_unlink": False,
        },
        # HR Managers have full access to job offers
        {
            "name": "recruitment.offer.hr_manager",
            "model": "recruitment.recruitment_job_offer",
            "group": "group_hr_manager",
            "perm_read": True,
            "perm_write": True,
            "perm_create": True,
            "perm_unlink": True,
        },
        # HR Users can manage skills
        {
            "name": "recruitment.skill.hr_user",
            "model": "recruitment.recruitment_skill",
            "group": "group_hr_user",
            "perm_read": True,
            "perm_write": True,
            "perm_create": True,
            "perm_unlink": True,
        },
        # HR Users can manage stages
        {
            "name": "recruitment.stage.hr_user",
            "model": "recruitment.recruitment_stage",
            "group": "group_hr_user",
            "perm_read": True,
            "perm_write": True,
            "perm_create": True,
            "perm_unlink": True,
        },
        # HR Users can manage interview feedback
        {
            "name": "recruitment.feedback.hr_user",
            "model": "recruitment.recruitment_interview_feedback",
            "group": "group_hr_user",
            "perm_read": True,
            "perm_write": True,
            "perm_create": True,
            "perm_unlink": True,
        },
        # HR Users can manage talent pools
        {
            "name": "recruitment.talent_pool.hr_user",
            "model": "recruitment.recruitment_talent_pool",
            "group": "group_hr_user",
            "perm_read": True,
            "perm_write": True,
            "perm_create": True,
            "perm_unlink": True,
        },
        # Candidate Quiz Attempts - HR Users can manage
        {
            "name": "recruitment.candidate_quiz_attempt.hr_user",
            "model": "recruitment.recruitment_candidate_quiz_attempt",
            "group": "group_hr_user",
            "perm_read": True,
            "perm_write": True,
            "perm_create": True,
            "perm_unlink": False,
        },
        # Candidate Quiz Attempts - HR Managers have full access
        {
            "name": "recruitment.candidate_quiz_attempt.hr_manager",
            "model": "recruitment.recruitment_candidate_quiz_attempt",
            "group": "group_hr_manager",
            "perm_read": True,
            "perm_write": True,
            "perm_create": True,
            "perm_unlink": True,
        },
    ],
}
