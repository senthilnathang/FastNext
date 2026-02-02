"""
Employee Pydantic Schemas
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List, Any, Dict

from pydantic import BaseModel, Field, EmailStr

from ..models.employee import (
    Gender, MaritalStatus, BloodGroup, ContactType,
    DocumentStatus, SkillLevel, RelationshipType
)


# Employee Contact Schemas
class EmployeeContactBase(BaseModel):
    contact_type: ContactType
    is_primary: bool = False
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class EmployeeContactCreate(EmployeeContactBase):
    pass


class EmployeeContactUpdate(BaseModel):
    contact_type: Optional[ContactType] = None
    is_primary: Optional[bool] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class EmployeeContactResponse(EmployeeContactBase):
    id: int
    employee_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Employee Document Schemas
class EmployeeDocumentBase(BaseModel):
    document_type: str
    document_number: Optional[str] = None
    name: str
    description: Optional[str] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None
    is_confidential: bool = False


class EmployeeDocumentCreate(EmployeeDocumentBase):
    pass


class EmployeeDocumentUpdate(BaseModel):
    document_type: Optional[str] = None
    document_number: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None
    is_confidential: Optional[bool] = None
    status: Optional[DocumentStatus] = None


class EmployeeDocumentResponse(EmployeeDocumentBase):
    id: int
    employee_id: int
    status: DocumentStatus
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    verified_by: Optional[int] = None
    verified_at: Optional[datetime] = None
    verification_notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Employee Bank Account Schemas
class EmployeeBankAccountBase(BaseModel):
    bank_name: str
    branch_name: Optional[str] = None
    account_number: str
    account_holder_name: str
    account_type: Optional[str] = None
    routing_number: Optional[str] = None
    swift_code: Optional[str] = None
    iban: Optional[str] = None
    is_primary: bool = False


class EmployeeBankAccountCreate(EmployeeBankAccountBase):
    pass


class EmployeeBankAccountUpdate(BaseModel):
    bank_name: Optional[str] = None
    branch_name: Optional[str] = None
    account_number: Optional[str] = None
    account_holder_name: Optional[str] = None
    account_type: Optional[str] = None
    routing_number: Optional[str] = None
    swift_code: Optional[str] = None
    iban: Optional[str] = None
    is_primary: Optional[bool] = None


class EmployeeBankAccountResponse(EmployeeBankAccountBase):
    id: int
    employee_id: int
    is_verified: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Employee Skill Schemas
class EmployeeSkillBase(BaseModel):
    skill_name: str
    category: Optional[str] = None
    proficiency_level: SkillLevel = SkillLevel.INTERMEDIATE
    years_of_experience: Optional[Decimal] = None


class EmployeeSkillCreate(EmployeeSkillBase):
    pass


class EmployeeSkillUpdate(BaseModel):
    skill_name: Optional[str] = None
    category: Optional[str] = None
    proficiency_level: Optional[SkillLevel] = None
    years_of_experience: Optional[Decimal] = None


class EmployeeSkillResponse(EmployeeSkillBase):
    id: int
    employee_id: int
    is_verified: bool
    verified_by: Optional[int] = None
    verified_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Employee Certification Schemas
class EmployeeCertificationBase(BaseModel):
    name: str
    issuing_organization: Optional[str] = None
    credential_id: Optional[str] = None
    credential_url: Optional[str] = None
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None
    does_not_expire: bool = False
    document_url: Optional[str] = None


class EmployeeCertificationCreate(EmployeeCertificationBase):
    pass


class EmployeeCertificationUpdate(BaseModel):
    name: Optional[str] = None
    issuing_organization: Optional[str] = None
    credential_id: Optional[str] = None
    credential_url: Optional[str] = None
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None
    does_not_expire: Optional[bool] = None
    document_url: Optional[str] = None


class EmployeeCertificationResponse(EmployeeCertificationBase):
    id: int
    employee_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Employee Education Schemas
class EmployeeEducationBase(BaseModel):
    institution: str
    degree: Optional[str] = None
    field_of_study: Optional[str] = None
    grade: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_current: bool = False
    description: Optional[str] = None
    document_url: Optional[str] = None


class EmployeeEducationCreate(EmployeeEducationBase):
    pass


class EmployeeEducationUpdate(BaseModel):
    institution: Optional[str] = None
    degree: Optional[str] = None
    field_of_study: Optional[str] = None
    grade: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_current: Optional[bool] = None
    description: Optional[str] = None
    document_url: Optional[str] = None


class EmployeeEducationResponse(EmployeeEducationBase):
    id: int
    employee_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Employee Experience Schemas
class EmployeeExperienceBase(BaseModel):
    company_name: str
    job_title: str
    location: Optional[str] = None
    employment_type: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_current: bool = False
    description: Optional[str] = None
    reference_name: Optional[str] = None
    reference_contact: Optional[str] = None


class EmployeeExperienceCreate(EmployeeExperienceBase):
    pass


class EmployeeExperienceUpdate(BaseModel):
    company_name: Optional[str] = None
    job_title: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_current: Optional[bool] = None
    description: Optional[str] = None
    reference_name: Optional[str] = None
    reference_contact: Optional[str] = None


class EmployeeExperienceResponse(EmployeeExperienceBase):
    id: int
    employee_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Employee Emergency Contact Schemas
class EmployeeEmergencyContactBase(BaseModel):
    name: str
    relation_type: str
    phone: str
    alternate_phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    is_primary: bool = False


class EmployeeEmergencyContactCreate(EmployeeEmergencyContactBase):
    pass


class EmployeeEmergencyContactUpdate(BaseModel):
    name: Optional[str] = None
    relation_type: Optional[str] = None
    phone: Optional[str] = None
    alternate_phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    is_primary: Optional[bool] = None


class EmployeeEmergencyContactResponse(EmployeeEmergencyContactBase):
    id: int
    employee_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Employee Dependent Schemas
class EmployeeDependentBase(BaseModel):
    name: str
    relation_type: RelationshipType
    date_of_birth: Optional[date] = None
    gender: Optional[Gender] = None
    national_id: Optional[str] = None
    is_dependent_for_tax: bool = False
    is_dependent_for_insurance: bool = False
    phone: Optional[str] = None
    email: Optional[str] = None


class EmployeeDependentCreate(EmployeeDependentBase):
    pass


class EmployeeDependentUpdate(BaseModel):
    name: Optional[str] = None
    relation_type: Optional[RelationshipType] = None
    date_of_birth: Optional[date] = None
    gender: Optional[Gender] = None
    national_id: Optional[str] = None
    is_dependent_for_tax: Optional[bool] = None
    is_dependent_for_insurance: Optional[bool] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class EmployeeDependentResponse(EmployeeDependentBase):
    id: int
    employee_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Main Employee Schemas
class EmployeeBase(BaseModel):
    employee_number: str
    badge_id: Optional[str] = None
    first_name: str
    middle_name: Optional[str] = None
    last_name: str
    preferred_name: Optional[str] = None
    work_email: Optional[str] = None
    personal_email: Optional[str] = None
    work_phone: Optional[str] = None
    mobile_phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[Gender] = None
    marital_status: Optional[MaritalStatus] = None
    blood_group: Optional[BloodGroup] = None
    nationality: Optional[str] = None


class EmployeeCreate(EmployeeBase):
    user_id: Optional[int] = None
    national_id: Optional[str] = None
    passport_number: Optional[str] = None
    passport_expiry: Optional[date] = None
    tax_id: Optional[str] = None
    department_id: Optional[int] = None
    job_position_id: Optional[int] = None
    job_role_id: Optional[int] = None
    employee_type_id: Optional[int] = None
    reporting_manager_id: Optional[int] = None
    shift_id: Optional[int] = None
    work_type_id: Optional[int] = None
    work_location: Optional[str] = None
    hire_date: Optional[date] = None
    probation_end_date: Optional[date] = None
    salary: Optional[Decimal] = None
    currency: str = "USD"
    pay_frequency: str = "monthly"
    bio: Optional[str] = None
    is_manager: bool = False
    can_approve: bool = False


class EmployeeUpdate(BaseModel):
    employee_number: Optional[str] = None
    badge_id: Optional[str] = None
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    preferred_name: Optional[str] = None
    work_email: Optional[str] = None
    personal_email: Optional[str] = None
    work_phone: Optional[str] = None
    mobile_phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[Gender] = None
    marital_status: Optional[MaritalStatus] = None
    blood_group: Optional[BloodGroup] = None
    nationality: Optional[str] = None
    national_id: Optional[str] = None
    passport_number: Optional[str] = None
    passport_expiry: Optional[date] = None
    tax_id: Optional[str] = None
    department_id: Optional[int] = None
    job_position_id: Optional[int] = None
    job_role_id: Optional[int] = None
    employee_type_id: Optional[int] = None
    reporting_manager_id: Optional[int] = None
    shift_id: Optional[int] = None
    work_type_id: Optional[int] = None
    work_location: Optional[str] = None
    hire_date: Optional[date] = None
    probation_end_date: Optional[date] = None
    confirmation_date: Optional[date] = None
    contract_end_date: Optional[date] = None
    termination_date: Optional[date] = None
    termination_reason: Optional[str] = None
    salary: Optional[Decimal] = None
    currency: Optional[str] = None
    pay_frequency: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    cover_image_url: Optional[str] = None
    is_active: Optional[bool] = None
    is_manager: Optional[bool] = None
    can_approve: Optional[bool] = None
    custom_fields: Optional[Dict[str, Any]] = None


class EmployeeSummary(BaseModel):
    """Minimal employee info for lists and references."""
    id: int
    employee_number: str
    full_name: str
    display_name: str
    work_email: Optional[str] = None
    avatar_url: Optional[str] = None
    department_id: Optional[int] = None
    job_position_id: Optional[int] = None
    is_active: bool

    class Config:
        from_attributes = True


class EmployeeResponse(EmployeeBase):
    id: int
    user_id: Optional[int] = None
    full_name: str
    display_name: str

    # Identification
    national_id: Optional[str] = None
    passport_number: Optional[str] = None
    passport_expiry: Optional[date] = None
    tax_id: Optional[str] = None
    social_security_number: Optional[str] = None
    driving_license: Optional[str] = None
    driving_license_expiry: Optional[date] = None

    # Employment
    department_id: Optional[int] = None
    job_position_id: Optional[int] = None
    job_role_id: Optional[int] = None
    employee_type_id: Optional[int] = None
    reporting_manager_id: Optional[int] = None
    shift_id: Optional[int] = None
    work_type_id: Optional[int] = None
    work_location: Optional[str] = None

    # Dates
    hire_date: Optional[date] = None
    probation_end_date: Optional[date] = None
    confirmation_date: Optional[date] = None
    contract_end_date: Optional[date] = None
    termination_date: Optional[date] = None
    termination_reason: Optional[str] = None

    # Compensation
    salary: Optional[Decimal] = None
    currency: str
    pay_frequency: str

    # Additional
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    cover_image_url: Optional[str] = None
    is_active: bool
    is_manager: bool
    can_approve: bool
    custom_fields: Optional[Dict[str, Any]] = None

    # Related data
    contacts: List[EmployeeContactResponse] = []
    documents: List[EmployeeDocumentResponse] = []
    bank_accounts: List[EmployeeBankAccountResponse] = []
    skills: List[EmployeeSkillResponse] = []
    certifications: List[EmployeeCertificationResponse] = []
    education: List[EmployeeEducationResponse] = []
    experience: List[EmployeeExperienceResponse] = []
    emergency_contacts: List[EmployeeEmergencyContactResponse] = []
    dependents: List[EmployeeDependentResponse] = []

    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class EmployeeList(BaseModel):
    """Paginated list of employees."""
    items: List[EmployeeSummary]
    total: int
    page: int
    page_size: int
