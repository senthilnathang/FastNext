"""
Employee Models

Core employee profile and related information.
"""

import enum
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List

from sqlalchemy import (
    Column, Integer, String, Text, Date, DateTime, Boolean,
    ForeignKey, Numeric, Enum, JSON, UniqueConstraint
)
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.base import TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin


class Gender(str, enum.Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"
    PREFER_NOT_TO_SAY = "prefer_not_to_say"


class MaritalStatus(str, enum.Enum):
    SINGLE = "single"
    MARRIED = "married"
    DIVORCED = "divorced"
    WIDOWED = "widowed"
    SEPARATED = "separated"
    DOMESTIC_PARTNER = "domestic_partner"


class BloodGroup(str, enum.Enum):
    A_POSITIVE = "A+"
    A_NEGATIVE = "A-"
    B_POSITIVE = "B+"
    B_NEGATIVE = "B-"
    AB_POSITIVE = "AB+"
    AB_NEGATIVE = "AB-"
    O_POSITIVE = "O+"
    O_NEGATIVE = "O-"


class ContactType(str, enum.Enum):
    HOME = "home"
    WORK = "work"
    PERMANENT = "permanent"
    CURRENT = "current"
    MAILING = "mailing"


class DocumentStatus(str, enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    EXPIRED = "expired"
    REJECTED = "rejected"


class SkillLevel(str, enum.Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"


class RelationshipType(str, enum.Enum):
    SPOUSE = "spouse"
    CHILD = "child"
    PARENT = "parent"
    SIBLING = "sibling"
    OTHER = "other"


class Employee(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """Employee profile model."""

    __tablename__ = "employee_employees"

    id = Column(Integer, primary_key=True, index=True)

    # Link to user account
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, unique=True)

    # Employee identification
    employee_number = Column(String(50), nullable=False, index=True)
    badge_id = Column(String(50), nullable=True)

    # Personal information
    first_name = Column(String(100), nullable=False)
    middle_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=False)
    preferred_name = Column(String(100), nullable=True)

    # Contact
    work_email = Column(String(255), nullable=True)
    personal_email = Column(String(255), nullable=True)
    work_phone = Column(String(50), nullable=True)
    mobile_phone = Column(String(50), nullable=True)

    # Demographics
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String(50), nullable=True)  # male, female, other, prefer_not_to_say
    marital_status = Column(String(50), nullable=True)  # single, married, divorced, widowed, separated, domestic_partner
    blood_group = Column(String(10), nullable=True)  # A+, A-, B+, B-, AB+, AB-, O+, O-
    nationality = Column(String(100), nullable=True)

    # Identification
    national_id = Column(String(100), nullable=True)
    passport_number = Column(String(100), nullable=True)
    passport_expiry = Column(Date, nullable=True)
    tax_id = Column(String(100), nullable=True)
    social_security_number = Column(String(100), nullable=True)
    driving_license = Column(String(100), nullable=True)
    driving_license_expiry = Column(Date, nullable=True)

    # Employment details
    department_id = Column(Integer, ForeignKey("hrms_departments.id"), nullable=True)
    job_position_id = Column(Integer, ForeignKey("hrms_job_positions.id"), nullable=True)
    job_role_id = Column(Integer, ForeignKey("hrms_job_roles.id"), nullable=True)
    employee_type_id = Column(Integer, ForeignKey("hrms_employee_types.id"), nullable=True)
    reporting_manager_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=True)

    # Work arrangements
    shift_id = Column(Integer, ForeignKey("hrms_employee_shifts.id"), nullable=True)
    work_type_id = Column(Integer, ForeignKey("hrms_work_types.id"), nullable=True)
    work_location = Column(String(255), nullable=True)

    # Dates
    hire_date = Column(Date, nullable=True)
    probation_end_date = Column(Date, nullable=True)
    confirmation_date = Column(Date, nullable=True)
    contract_end_date = Column(Date, nullable=True)
    termination_date = Column(Date, nullable=True)
    termination_reason = Column(Text, nullable=True)

    # Compensation
    salary = Column(Numeric(15, 2), nullable=True)
    currency = Column(String(3), default="USD")
    pay_frequency = Column(String(50), default="monthly")  # monthly, biweekly, weekly

    # Additional info
    bio = Column(Text, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    cover_image_url = Column(String(500), nullable=True)

    # System fields
    is_manager = Column(Boolean, default=False)
    can_approve = Column(Boolean, default=False)

    # Custom fields
    custom_fields = Column(JSON, nullable=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    department = relationship("Department", foreign_keys=[department_id])
    job_position = relationship("JobPosition", foreign_keys=[job_position_id])
    job_role = relationship("JobRole", foreign_keys=[job_role_id])
    employee_type = relationship("EmployeeType", foreign_keys=[employee_type_id])
    reporting_manager = relationship("Employee", remote_side=[id], foreign_keys=[reporting_manager_id])
    shift = relationship("EmployeeShift", foreign_keys=[shift_id])
    work_type = relationship("WorkType", foreign_keys=[work_type_id])

    # Child relationships
    contacts = relationship("EmployeeContact", back_populates="employee", cascade="all, delete-orphan")
    documents = relationship("EmployeeDocument", back_populates="employee", cascade="all, delete-orphan")
    bank_accounts = relationship("EmployeeBankAccount", back_populates="employee", cascade="all, delete-orphan")
    skills = relationship("EmployeeSkill", back_populates="employee", cascade="all, delete-orphan")
    certifications = relationship("EmployeeCertification", back_populates="employee", cascade="all, delete-orphan")
    education = relationship("EmployeeEducation", back_populates="employee", cascade="all, delete-orphan")
    experience = relationship("EmployeeExperience", back_populates="employee", cascade="all, delete-orphan")
    emergency_contacts = relationship("EmployeeEmergencyContact", back_populates="employee", cascade="all, delete-orphan")
    dependents = relationship("EmployeeDependent", back_populates="employee", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("employee_number", "company_id", name="uq_employee_number_company"),
    )

    @property
    def full_name(self) -> str:
        """Get employee's full name."""
        parts = [self.first_name]
        if self.middle_name:
            parts.append(self.middle_name)
        parts.append(self.last_name)
        return " ".join(parts)

    @property
    def display_name(self) -> str:
        """Get display name (preferred or full name)."""
        return self.preferred_name or self.full_name


class EmployeeContact(Base, TimestampMixin, AuditMixin, CompanyScopedMixin):
    """Employee contact/address information."""

    __tablename__ = "employee_contacts"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=False)

    contact_type = Column(String(50), nullable=False)  # home, work, permanent, current, mailing
    is_primary = Column(Boolean, default=False)

    # Address fields
    address_line1 = Column(String(255), nullable=True)
    address_line2 = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    postal_code = Column(String(20), nullable=True)
    country = Column(String(100), nullable=True)

    # Contact fields
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)

    employee = relationship("Employee", back_populates="contacts")


class EmployeeDocument(Base, TimestampMixin, AuditMixin, CompanyScopedMixin):
    """Employee documents with expiry tracking."""

    __tablename__ = "employee_documents"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=False)

    document_type = Column(String(100), nullable=False)  # passport, visa, contract, etc.
    document_number = Column(String(100), nullable=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    file_url = Column(String(500), nullable=True)
    file_name = Column(String(255), nullable=True)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(100), nullable=True)

    issue_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=True)
    status = Column(String(50), default="pending")  # pending, verified, expired, rejected

    verified_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    verification_notes = Column(Text, nullable=True)

    is_confidential = Column(Boolean, default=False)

    employee = relationship("Employee", back_populates="documents")


class EmployeeBankAccount(Base, TimestampMixin, AuditMixin, CompanyScopedMixin):
    """Employee bank account details."""

    __tablename__ = "employee_bank_accounts"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=False)

    bank_name = Column(String(255), nullable=False)
    branch_name = Column(String(255), nullable=True)
    account_number = Column(String(100), nullable=False)
    account_holder_name = Column(String(255), nullable=False)
    account_type = Column(String(50), nullable=True)  # savings, checking, etc.

    routing_number = Column(String(50), nullable=True)
    swift_code = Column(String(50), nullable=True)
    iban = Column(String(50), nullable=True)

    is_primary = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)

    employee = relationship("Employee", back_populates="bank_accounts")


class EmployeeSkill(Base, TimestampMixin, AuditMixin, CompanyScopedMixin):
    """Employee skills and proficiency."""

    __tablename__ = "employee_skills"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=False)

    skill_name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=True)  # technical, soft, language, etc.
    proficiency_level = Column(String(50), default="intermediate")  # beginner, intermediate, advanced, expert
    years_of_experience = Column(Numeric(4, 1), nullable=True)

    is_verified = Column(Boolean, default=False)
    verified_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime, nullable=True)

    employee = relationship("Employee", back_populates="skills")


class EmployeeCertification(Base, TimestampMixin, AuditMixin, CompanyScopedMixin):
    """Employee certifications."""

    __tablename__ = "employee_certifications"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=False)

    name = Column(String(255), nullable=False)
    issuing_organization = Column(String(255), nullable=True)
    credential_id = Column(String(100), nullable=True)
    credential_url = Column(String(500), nullable=True)

    issue_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=True)
    does_not_expire = Column(Boolean, default=False)

    document_url = Column(String(500), nullable=True)

    employee = relationship("Employee", back_populates="certifications")


class EmployeeEducation(Base, TimestampMixin, AuditMixin, CompanyScopedMixin):
    """Employee education history."""

    __tablename__ = "employee_education"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=False)

    institution = Column(String(255), nullable=False)
    degree = Column(String(255), nullable=True)
    field_of_study = Column(String(255), nullable=True)
    grade = Column(String(50), nullable=True)

    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    is_current = Column(Boolean, default=False)

    description = Column(Text, nullable=True)
    document_url = Column(String(500), nullable=True)

    employee = relationship("Employee", back_populates="education")


class EmployeeExperience(Base, TimestampMixin, AuditMixin, CompanyScopedMixin):
    """Employee work experience."""

    __tablename__ = "employee_experience"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=False)

    company_name = Column(String(255), nullable=False)
    job_title = Column(String(255), nullable=False)
    location = Column(String(255), nullable=True)
    employment_type = Column(String(50), nullable=True)  # full-time, part-time, contract

    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    is_current = Column(Boolean, default=False)

    description = Column(Text, nullable=True)
    reference_name = Column(String(255), nullable=True)
    reference_contact = Column(String(255), nullable=True)

    employee = relationship("Employee", back_populates="experience")


class EmployeeEmergencyContact(Base, TimestampMixin, AuditMixin, CompanyScopedMixin):
    """Employee emergency contacts."""

    __tablename__ = "employee_emergency_contacts"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=False)

    name = Column(String(255), nullable=False)
    relation_type = Column(String(100), nullable=False)  # e.g., "spouse", "parent", "sibling"
    phone = Column(String(50), nullable=False)
    alternate_phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)

    is_primary = Column(Boolean, default=False)

    employee = relationship("Employee", back_populates="emergency_contacts")


class EmployeeDependent(Base, TimestampMixin, AuditMixin, CompanyScopedMixin):
    """Employee dependents/family members."""

    __tablename__ = "employee_dependents"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=False)

    name = Column(String(255), nullable=False)
    relation_type = Column(String(50), nullable=False)  # spouse, child, parent, sibling, other
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String(50), nullable=True)  # male, female, other, prefer_not_to_say

    national_id = Column(String(100), nullable=True)
    is_dependent_for_tax = Column(Boolean, default=False)
    is_dependent_for_insurance = Column(Boolean, default=False)

    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)

    employee = relationship("Employee", back_populates="dependents")


# ========================================
# New Models for HRMS Feature Parity
# ========================================

class ActionTypeEnum(str, enum.Enum):
    WARNING = "warning"
    SUSPENSION = "suspension"
    DISMISSAL = "dismissal"


class EmployeeTag(Base, TimestampMixin, CompanyScopedMixin):
    """Tags for categorizing employees."""

    __tablename__ = "employee_tags"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False)
    color = Column(String(20), default="#1890ff")

    __table_args__ = (
        UniqueConstraint("title", "company_id", name="uq_employee_tag_title_company"),
    )


class EmployeeNote(Base, TimestampMixin, AuditMixin, CompanyScopedMixin):
    """Notes attached to employees."""

    __tablename__ = "employee_notes"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=False)
    description = Column(Text, nullable=False)

    employee = relationship("Employee")
    note_files = relationship("NoteFile", back_populates="note", cascade="all, delete-orphan")


class NoteFile(Base, TimestampMixin):
    """File attachments for employee notes."""

    __tablename__ = "employee_note_files"

    id = Column(Integer, primary_key=True, index=True)
    note_id = Column(Integer, ForeignKey("employee_notes.id"), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)

    note = relationship("EmployeeNote", back_populates="note_files")


class ActionType(Base, TimestampMixin, CompanyScopedMixin):
    """Types of disciplinary actions (warning, suspension, dismissal)."""

    __tablename__ = "employee_action_types"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False)
    action_type = Column(String(20), nullable=False)  # warning, suspension, dismissal
    block_option = Column(Boolean, default=False)  # Block login when action is active

    disciplinary_actions = relationship("DisciplinaryAction", back_populates="action")


class DisciplinaryAction(Base, TimestampMixin, AuditMixin, CompanyScopedMixin):
    """Disciplinary actions applied to employees."""

    __tablename__ = "employee_disciplinary_actions"

    id = Column(Integer, primary_key=True, index=True)
    action_id = Column(Integer, ForeignKey("employee_action_types.id"), nullable=False)
    description = Column(Text, nullable=True)
    unit_in = Column(String(10), nullable=True)  # days or hours
    days = Column(Integer, nullable=True)
    hours = Column(Integer, nullable=True)
    start_date = Column(Date, nullable=True)
    attachment = Column(String(500), nullable=True)  # File path

    action = relationship("ActionType", back_populates="disciplinary_actions")
    employees = relationship("DisciplinaryActionEmployee", back_populates="disciplinary_action", cascade="all, delete-orphan")


class DisciplinaryActionEmployee(Base):
    """Many-to-many relationship between disciplinary actions and employees."""

    __tablename__ = "employee_disciplinary_action_employees"

    id = Column(Integer, primary_key=True, index=True)
    disciplinary_action_id = Column(Integer, ForeignKey("employee_disciplinary_actions.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=False)

    disciplinary_action = relationship("DisciplinaryAction", back_populates="employees")
    employee = relationship("Employee")


class BonusPoint(Base, TimestampMixin, AuditMixin, CompanyScopedMixin):
    """Bonus points for employees."""

    __tablename__ = "employee_bonus_points"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=False)
    points = Column(Integer, default=0, nullable=False)
    encashment_condition = Column(String(5), nullable=True)  # ==, >, <, >=, <=
    redeeming_points = Column(Integer, nullable=True)
    reason = Column(Text, nullable=True)

    employee = relationship("Employee")


class Policy(Base, TimestampMixin, AuditMixin, CompanyScopedMixin):
    """Company policies visible to employees."""

    __tablename__ = "employee_policies"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)  # HTML content
    is_visible_to_all = Column(Boolean, default=True)

    attachments = relationship("PolicyAttachment", back_populates="policy", cascade="all, delete-orphan")
    specific_employees = relationship("PolicyEmployee", back_populates="policy", cascade="all, delete-orphan")


class PolicyAttachment(Base, TimestampMixin):
    """File attachments for policies."""

    __tablename__ = "employee_policy_attachments"

    id = Column(Integer, primary_key=True, index=True)
    policy_id = Column(Integer, ForeignKey("employee_policies.id"), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)

    policy = relationship("Policy", back_populates="attachments")


class PolicyEmployee(Base):
    """Many-to-many relationship for policies visible to specific employees."""

    __tablename__ = "employee_policy_employees"

    id = Column(Integer, primary_key=True, index=True)
    policy_id = Column(Integer, ForeignKey("employee_policies.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=False)

    policy = relationship("Policy", back_populates="specific_employees")
    employee = relationship("Employee")


class EmployeeGeneralSetting(Base, CompanyScopedMixin):
    """General settings for the employee module (per company)."""

    __tablename__ = "employee_general_settings"

    id = Column(Integer, primary_key=True, index=True)
    badge_id_prefix = Column(String(20), default="EMP-")

    __table_args__ = (
        UniqueConstraint("company_id", name="uq_employee_settings_company"),
    )
