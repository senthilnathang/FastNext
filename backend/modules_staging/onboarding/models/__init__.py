"""
Onboarding Models
"""

from .onboarding import (
    OnboardingStatus,
    OnboardingTaskStatus,
    OnboardingTaskPriority,
    DocumentStatus,
    OnboardingTemplate,
    OnboardingStage,
    OnboardingTaskTemplate,
    DocumentType,
    OnboardingEmployee,
    OnboardingTask,
    OnboardingDocument,
    OnboardingChecklist,
    # Template models
    OnboardingTemplateStageType,
    OnboardingTemplateTaskType,
    OnboardingTemplateChecklistCategory,
    OnboardingTemplateStage,
    OnboardingTemplateTask,
    OnboardingTemplateChecklist,
)

from .process import (
    OnboardingProcessStatus,
    OnboardingProcessStageStatus,
    OnboardingProcessTaskStatus,
    OnboardingProcessTaskPriority,
    OnboardingProcessTaskType,
    OnboardingProcess,
    OnboardingProcessStage,
    OnboardingProcessTask,
    OnboardingPortal,
)

from .verification import (
    VerificationType,
    CandidateVerificationStatus,
    OnboardingVerificationRequirement,
    CandidateVerification,
)

from .conversion import (
    ConversionStatus,
    ConversionLogAction,
    DocumentVerificationLogAction,
    CandidateToEmployeeConversion,
    ConversionLog,
    OnboardingDocumentVerificationLog,
)

# Aliases for backward compatibility
TaskStatus = OnboardingTaskStatus
TaskPriority = OnboardingTaskPriority
TaskTemplate = OnboardingTaskTemplate

__all__ = [
    # Existing models and enums
    "OnboardingStatus",
    "OnboardingTaskStatus",
    "OnboardingTaskPriority",
    "TaskStatus",
    "TaskPriority",
    "DocumentStatus",
    "OnboardingTemplate",
    "OnboardingStage",
    "OnboardingTaskTemplate",
    "TaskTemplate",
    "DocumentType",
    "OnboardingEmployee",
    "OnboardingTask",
    "OnboardingDocument",
    "OnboardingChecklist",
    # Template models and enums
    "OnboardingTemplateStageType",
    "OnboardingTemplateTaskType",
    "OnboardingTemplateChecklistCategory",
    "OnboardingTemplateStage",
    "OnboardingTemplateTask",
    "OnboardingTemplateChecklist",
    # Process models and enums
    "OnboardingProcessStatus",
    "OnboardingProcessStageStatus",
    "OnboardingProcessTaskStatus",
    "OnboardingProcessTaskPriority",
    "OnboardingProcessTaskType",
    "OnboardingProcess",
    "OnboardingProcessStage",
    "OnboardingProcessTask",
    "OnboardingPortal",
    # Verification models and enums
    "VerificationType",
    "CandidateVerificationStatus",
    "OnboardingVerificationRequirement",
    "CandidateVerification",
    # Conversion models and enums
    "ConversionStatus",
    "ConversionLogAction",
    "DocumentVerificationLogAction",
    "CandidateToEmployeeConversion",
    "ConversionLog",
    "OnboardingDocumentVerificationLog",
]
