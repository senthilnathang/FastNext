"""
HRMS Base Module Schemas

Export all Pydantic schemas for the HRMS Base module.
"""

from .department import (
    DepartmentBase,
    DepartmentCreate,
    DepartmentUpdate,
    DepartmentResponse,
    DepartmentList,
    DepartmentTree,
)
from .job_position import (
    JobPositionBase,
    JobPositionCreate,
    JobPositionUpdate,
    JobPositionResponse,
    JobPositionList,
)
from .job_role import (
    JobRoleBase,
    JobRoleCreate,
    JobRoleUpdate,
    JobRoleResponse,
    JobRoleList,
)
from .employee_type import (
    EmployeeTypeBase,
    EmployeeTypeCreate,
    EmployeeTypeUpdate,
    EmployeeTypeResponse,
    EmployeeTypeList,
)
from .shift import (
    EmployeeShiftBase,
    EmployeeShiftCreate,
    EmployeeShiftUpdate,
    EmployeeShiftResponse,
    EmployeeShiftList,
    ShiftScheduleBase,
    ShiftScheduleCreate,
    ShiftScheduleUpdate,
    ShiftScheduleResponse,
    RotatingShiftBase,
    RotatingShiftCreate,
    RotatingShiftUpdate,
    RotatingShiftResponse,
)
from .work_type import (
    WorkTypeBase,
    WorkTypeCreate,
    WorkTypeUpdate,
    WorkTypeResponse,
    WorkTypeList,
    WorkTypeRequestBase,
    WorkTypeRequestCreate,
    WorkTypeRequestResponse,
    ShiftRequestBase,
    ShiftRequestCreate,
    ShiftRequestResponse,
    RequestApproval,
)
from .approval import (
    ApprovalWorkflowBase,
    ApprovalWorkflowCreate,
    ApprovalWorkflowUpdate,
    ApprovalWorkflowResponse,
    ApprovalWorkflowList,
    ApprovalLevelBase,
    ApprovalLevelCreate,
    ApprovalLevelResponse,
    ApprovalRuleBase,
    ApprovalRuleCreate,
    ApprovalRuleResponse,
    ApprovalDelegationBase,
    ApprovalDelegationCreate,
    ApprovalDelegationResponse,
    ApprovalRequestBase,
    ApprovalRequestCreate,
    ApprovalRequestResponse,
    ApprovalActionCreate,
    ApprovalActionResponse,
)
from .settings import (
    StageDefinitionBase,
    StageDefinitionCreate,
    StageDefinitionUpdate,
    StageDefinitionResponse,
    StatusDefinitionBase,
    StatusDefinitionCreate,
    StatusDefinitionUpdate,
    StatusDefinitionResponse,
    StatusTransitionBase,
    StatusTransitionCreate,
    StatusTransitionResponse,
    HRMSSettingsBase,
    HRMSSettingsCreate,
    HRMSSettingsUpdate,
    HRMSSettingsResponse,
    AnnouncementBase,
    AnnouncementCreate,
    AnnouncementUpdate,
    AnnouncementResponse,
    AnnouncementList,
)

__all__ = [
    # Department
    "DepartmentBase", "DepartmentCreate", "DepartmentUpdate", "DepartmentResponse", "DepartmentList", "DepartmentTree",
    # Job Position
    "JobPositionBase", "JobPositionCreate", "JobPositionUpdate", "JobPositionResponse", "JobPositionList",
    # Job Role
    "JobRoleBase", "JobRoleCreate", "JobRoleUpdate", "JobRoleResponse", "JobRoleList",
    # Employee Type
    "EmployeeTypeBase", "EmployeeTypeCreate", "EmployeeTypeUpdate", "EmployeeTypeResponse", "EmployeeTypeList",
    # Shift
    "EmployeeShiftBase", "EmployeeShiftCreate", "EmployeeShiftUpdate", "EmployeeShiftResponse", "EmployeeShiftList",
    "ShiftScheduleBase", "ShiftScheduleCreate", "ShiftScheduleUpdate", "ShiftScheduleResponse",
    "RotatingShiftBase", "RotatingShiftCreate", "RotatingShiftUpdate", "RotatingShiftResponse",
    # Work Type
    "WorkTypeBase", "WorkTypeCreate", "WorkTypeUpdate", "WorkTypeResponse", "WorkTypeList",
    "WorkTypeRequestBase", "WorkTypeRequestCreate", "WorkTypeRequestResponse",
    "ShiftRequestBase", "ShiftRequestCreate", "ShiftRequestResponse", "RequestApproval",
    # Approval
    "ApprovalWorkflowBase", "ApprovalWorkflowCreate", "ApprovalWorkflowUpdate", "ApprovalWorkflowResponse", "ApprovalWorkflowList",
    "ApprovalLevelBase", "ApprovalLevelCreate", "ApprovalLevelResponse",
    "ApprovalRuleBase", "ApprovalRuleCreate", "ApprovalRuleResponse",
    "ApprovalDelegationBase", "ApprovalDelegationCreate", "ApprovalDelegationResponse",
    "ApprovalRequestBase", "ApprovalRequestCreate", "ApprovalRequestResponse",
    "ApprovalActionCreate", "ApprovalActionResponse",
    # Settings
    "StageDefinitionBase", "StageDefinitionCreate", "StageDefinitionUpdate", "StageDefinitionResponse",
    "StatusDefinitionBase", "StatusDefinitionCreate", "StatusDefinitionUpdate", "StatusDefinitionResponse",
    "StatusTransitionBase", "StatusTransitionCreate", "StatusTransitionResponse",
    "HRMSSettingsBase", "HRMSSettingsCreate", "HRMSSettingsUpdate", "HRMSSettingsResponse",
    "AnnouncementBase", "AnnouncementCreate", "AnnouncementUpdate", "AnnouncementResponse", "AnnouncementList",
]
