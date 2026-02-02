"""
Offboarding Schemas
"""

from .offboarding import (
    # Exit Reasons
    ExitReasonBase,
    ExitReasonCreate,
    ExitReasonUpdate,
    ExitReasonResponse,
    # Templates
    OffboardingTemplateBase,
    OffboardingTemplateCreate,
    OffboardingTemplateUpdate,
    OffboardingTemplateResponse,
    # Stages
    OffboardingStageBase,
    OffboardingStageCreate,
    OffboardingStageUpdate,
    OffboardingStageResponse,
    # Task Templates
    TaskTemplateBase,
    TaskTemplateCreate,
    TaskTemplateUpdate,
    TaskTemplateResponse,
    # Offboarding Employees
    OffboardingEmployeeBase,
    OffboardingEmployeeCreate,
    OffboardingEmployeeUpdate,
    OffboardingEmployeeResponse,
    OffboardingEmployeeDetail,
    # Tasks
    OffboardingTaskBase,
    OffboardingTaskCreate,
    OffboardingTaskUpdate,
    OffboardingTaskResponse,
    # Asset Returns
    AssetReturnBase,
    AssetReturnCreate,
    AssetReturnUpdate,
    AssetReturnResponse,
    # Exit Interviews
    ExitInterviewBase,
    ExitInterviewCreate,
    ExitInterviewUpdate,
    ExitInterviewResponse,
    # FnF Settlement
    FnFSettlementBase,
    FnFSettlementCreate,
    FnFSettlementUpdate,
    FnFSettlementResponse,
    FnFComponentBase,
    FnFComponentCreate,
    FnFComponentResponse,
    # Dashboard
    OffboardingDashboard,
    OffboardingProgress,
)

__all__ = [
    # Exit Reasons
    "ExitReasonBase",
    "ExitReasonCreate",
    "ExitReasonUpdate",
    "ExitReasonResponse",
    # Templates
    "OffboardingTemplateBase",
    "OffboardingTemplateCreate",
    "OffboardingTemplateUpdate",
    "OffboardingTemplateResponse",
    # Stages
    "OffboardingStageBase",
    "OffboardingStageCreate",
    "OffboardingStageUpdate",
    "OffboardingStageResponse",
    # Task Templates
    "TaskTemplateBase",
    "TaskTemplateCreate",
    "TaskTemplateUpdate",
    "TaskTemplateResponse",
    # Offboarding Employees
    "OffboardingEmployeeBase",
    "OffboardingEmployeeCreate",
    "OffboardingEmployeeUpdate",
    "OffboardingEmployeeResponse",
    "OffboardingEmployeeDetail",
    # Tasks
    "OffboardingTaskBase",
    "OffboardingTaskCreate",
    "OffboardingTaskUpdate",
    "OffboardingTaskResponse",
    # Asset Returns
    "AssetReturnBase",
    "AssetReturnCreate",
    "AssetReturnUpdate",
    "AssetReturnResponse",
    # Exit Interviews
    "ExitInterviewBase",
    "ExitInterviewCreate",
    "ExitInterviewUpdate",
    "ExitInterviewResponse",
    # FnF Settlement
    "FnFSettlementBase",
    "FnFSettlementCreate",
    "FnFSettlementUpdate",
    "FnFSettlementResponse",
    "FnFComponentBase",
    "FnFComponentCreate",
    "FnFComponentResponse",
    # Dashboard
    "OffboardingDashboard",
    "OffboardingProgress",
]
