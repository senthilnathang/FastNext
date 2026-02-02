"""
Employee Schemas
"""

from .employee import (
    EmployeeBase,
    EmployeeCreate,
    EmployeeUpdate,
    EmployeeResponse,
    EmployeeList,
    EmployeeSummary,
    EmployeeContactCreate,
    EmployeeContactUpdate,
    EmployeeContactResponse,
    EmployeeDocumentCreate,
    EmployeeDocumentUpdate,
    EmployeeDocumentResponse,
    EmployeeBankAccountCreate,
    EmployeeBankAccountUpdate,
    EmployeeBankAccountResponse,
    EmployeeSkillCreate,
    EmployeeSkillUpdate,
    EmployeeSkillResponse,
    EmployeeCertificationCreate,
    EmployeeCertificationUpdate,
    EmployeeCertificationResponse,
    EmployeeEducationCreate,
    EmployeeEducationUpdate,
    EmployeeEducationResponse,
    EmployeeExperienceCreate,
    EmployeeExperienceUpdate,
    EmployeeExperienceResponse,
    EmployeeEmergencyContactCreate,
    EmployeeEmergencyContactUpdate,
    EmployeeEmergencyContactResponse,
    EmployeeDependentCreate,
    EmployeeDependentUpdate,
    EmployeeDependentResponse,
)

# New schemas for HRMS feature parity
from .tags import (
    EmployeeTagCreate,
    EmployeeTagUpdate,
    EmployeeTagResponse,
)

from .notes import (
    EmployeeNoteCreate,
    EmployeeNoteUpdate,
    EmployeeNoteResponse,
    EmployeeNoteListResponse,
    NoteFileResponse,
)

from .bonus_points import (
    BonusPointCreate,
    BonusPointUpdate,
    BonusPointResponse,
    BonusPointListResponse,
)

from .disciplinary import (
    ActionTypeCreate,
    ActionTypeUpdate,
    ActionTypeResponse,
    DisciplinaryActionCreate,
    DisciplinaryActionUpdate,
    DisciplinaryActionResponse,
    DisciplinaryActionListResponse,
)

from .policies import (
    PolicyCreate,
    PolicyUpdate,
    PolicyResponse,
    PolicyListResponse,
    PolicyAttachmentResponse,
)

from .settings import (
    EmployeeGeneralSettingCreate,
    EmployeeGeneralSettingUpdate,
    EmployeeGeneralSettingResponse,
)

__all__ = [
    "EmployeeBase",
    "EmployeeCreate",
    "EmployeeUpdate",
    "EmployeeResponse",
    "EmployeeList",
    "EmployeeSummary",
    "EmployeeContactCreate",
    "EmployeeContactUpdate",
    "EmployeeContactResponse",
    "EmployeeDocumentCreate",
    "EmployeeDocumentUpdate",
    "EmployeeDocumentResponse",
    "EmployeeBankAccountCreate",
    "EmployeeBankAccountUpdate",
    "EmployeeBankAccountResponse",
    "EmployeeSkillCreate",
    "EmployeeSkillUpdate",
    "EmployeeSkillResponse",
    "EmployeeCertificationCreate",
    "EmployeeCertificationUpdate",
    "EmployeeCertificationResponse",
    "EmployeeEducationCreate",
    "EmployeeEducationUpdate",
    "EmployeeEducationResponse",
    "EmployeeExperienceCreate",
    "EmployeeExperienceUpdate",
    "EmployeeExperienceResponse",
    "EmployeeEmergencyContactCreate",
    "EmployeeEmergencyContactUpdate",
    "EmployeeEmergencyContactResponse",
    "EmployeeDependentCreate",
    "EmployeeDependentUpdate",
    "EmployeeDependentResponse",
    # New schemas for HRMS feature parity
    "EmployeeTagCreate",
    "EmployeeTagUpdate",
    "EmployeeTagResponse",
    "EmployeeNoteCreate",
    "EmployeeNoteUpdate",
    "EmployeeNoteResponse",
    "EmployeeNoteListResponse",
    "NoteFileResponse",
    "BonusPointCreate",
    "BonusPointUpdate",
    "BonusPointResponse",
    "BonusPointListResponse",
    "ActionTypeCreate",
    "ActionTypeUpdate",
    "ActionTypeResponse",
    "DisciplinaryActionCreate",
    "DisciplinaryActionUpdate",
    "DisciplinaryActionResponse",
    "DisciplinaryActionListResponse",
    "PolicyCreate",
    "PolicyUpdate",
    "PolicyResponse",
    "PolicyListResponse",
    "PolicyAttachmentResponse",
    "EmployeeGeneralSettingCreate",
    "EmployeeGeneralSettingUpdate",
    "EmployeeGeneralSettingResponse",
]
