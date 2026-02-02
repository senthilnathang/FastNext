"""
HRMS Base Module Models

Export all HRMS base models for use in the application.
"""

# Organization Models
from .department import Department
from .job_position import JobPosition
from .job_role import JobRole
from .employee_type import EmployeeType

# Shift Models
from .shift import (
    EmployeeShift,
    GraceTime,
    ShiftSchedule,
    RotatingShift,
    RotatingShiftAssignment,
)

# Work Type Models
from .work_type import (
    WorkType,
    RotatingWorkType,
    RotatingWorkTypeAssignment,
    WorkTypeRequest,
    ShiftRequest,
    RequestStatus,
)

# Approval Workflow Models
from .approval import (
    ApprovalWorkflow,
    ApprovalLevel,
    ApprovalRule,
    ApprovalDelegation,
    ApprovalRequest,
    ApprovalAction,
    ApproverType,
    ApprovalStatus,
    ApprovalActionType,
)

# Settings & Configuration Models
from .settings import (
    StageDefinition,
    StatusDefinition,
    StatusTransition,
    HRMSSettings,
    Announcement,
    AnnouncementView,
    MailTemplate,
    AnnouncementType,
    AnnouncementTarget,
)

__all__ = [
    # Organization
    "Department",
    "JobPosition",
    "JobRole",
    "EmployeeType",

    # Shifts
    "EmployeeShift",
    "GraceTime",
    "ShiftSchedule",
    "RotatingShift",
    "RotatingShiftAssignment",

    # Work Types
    "WorkType",
    "RotatingWorkType",
    "RotatingWorkTypeAssignment",
    "WorkTypeRequest",
    "ShiftRequest",
    "RequestStatus",

    # Approval Workflows
    "ApprovalWorkflow",
    "ApprovalLevel",
    "ApprovalRule",
    "ApprovalDelegation",
    "ApprovalRequest",
    "ApprovalAction",
    "ApproverType",
    "ApprovalStatus",
    "ApprovalActionType",

    # Settings & Configuration
    "StageDefinition",
    "StatusDefinition",
    "StatusTransition",
    "HRMSSettings",
    "Announcement",
    "AnnouncementView",
    "MailTemplate",
    "AnnouncementType",
    "AnnouncementTarget",
]
