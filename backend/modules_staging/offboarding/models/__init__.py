"""
Offboarding Models
"""

from .offboarding import (
    OffboardingStatus,
    ExitType,
    OffboardingTaskStatus,
    OffboardingTaskPriority,
    FnFStatus,
    ExitReason,
    OffboardingTemplate,
    OffboardingStage,
    OffboardingTaskTemplate,
    OffboardingEmployee,
    OffboardingTask,
    AssetReturn,
    ExitInterview,
    FnFSettlement,
    FnFComponent,
    ResignationLetter,
    OffboardingNote,
    OffboardingGeneralSetting,
)

# Aliases for backward compatibility
TaskStatus = OffboardingTaskStatus
TaskPriority = OffboardingTaskPriority
TaskTemplate = OffboardingTaskTemplate

__all__ = [
    "OffboardingStatus",
    "ExitType",
    "OffboardingTaskStatus",
    "OffboardingTaskPriority",
    "TaskStatus",
    "TaskPriority",
    "FnFStatus",
    "ExitReason",
    "OffboardingTemplate",
    "OffboardingStage",
    "OffboardingTaskTemplate",
    "TaskTemplate",
    "OffboardingEmployee",
    "OffboardingTask",
    "AssetReturn",
    "ExitInterview",
    "FnFSettlement",
    "FnFComponent",
    "ResignationLetter",
    "OffboardingNote",
    "OffboardingGeneralSetting",
]
