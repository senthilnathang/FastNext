"""
Onboarding Verification Models

Models for managing verification requirements and candidate verifications.
"""

import enum
from datetime import date, datetime
from typing import Optional

from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Date, DateTime,
    ForeignKey, Table
)
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.base import (
    TimestampMixin, AuditMixin, SoftDeleteMixin,
    CompanyScopedMixin, ActiveMixin
)


class VerificationType(str, enum.Enum):
    """Verification type."""
    DOCUMENT = "document"
    BACKGROUND_CHECK = "background_check"
    REFERENCE_CHECK = "reference_check"
    MEDICAL_CHECK = "medical_check"
    DRUG_TEST = "drug_test"
    EDUCATION_VERIFICATION = "education_verification"
    EMPLOYMENT_VERIFICATION = "employment_verification"
    IDENTITY_VERIFICATION = "identity_verification"
    ADDRESS_VERIFICATION = "address_verification"
    CUSTOM = "custom"


class CandidateVerificationStatus(str, enum.Enum):
    """Candidate verification status."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    PASSED = "passed"
    FAILED = "failed"
    WAIVED = "waived"


# Association table for verification requirement document types
verification_requirement_document_types = Table(
    "onboarding_verification_requirement_document_types",
    Base.metadata,
    Column("verification_requirement_id", Integer, ForeignKey("onboarding_verification_requirement.id"), primary_key=True),
    Column("document_type_id", Integer, ForeignKey("onboarding_document_type.id"), primary_key=True),
)


class OnboardingVerificationRequirement(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """
    Configurable verification requirements per recruitment/department/job position.
    """
    __tablename__ = "onboarding_verification_requirement"

    id = Column(Integer, primary_key=True, index=True)

    # Basic info
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    verification_type = Column(String(30), default="custom", nullable=False)

    # Scope - can be linked to specific recruitment, department, or job position
    recruitment_id = Column(Integer, ForeignKey("recruitment_recruitment.id"), nullable=True)
    department_id = Column(Integer, ForeignKey("hrms_departments.id"), nullable=True)
    job_position_id = Column(Integer, ForeignKey("hrms_job_positions.id"), nullable=True)

    # Requirements
    is_mandatory = Column(Boolean, default=True)
    block_conversion = Column(Boolean, default=True)

    # Workflow
    auto_assign_to_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=True)
    sequence = Column(Integer, default=0, nullable=False)

    # Relationships
    recruitment = relationship("Recruitment", foreign_keys=[recruitment_id])
    department = relationship("Department", foreign_keys=[department_id])
    job_position = relationship("JobPosition", foreign_keys=[job_position_id])
    auto_assign_to = relationship("Employee", foreign_keys=[auto_assign_to_id])

    # Many-to-many relationship with document types
    required_document_types = relationship(
        "DocumentType",
        secondary=verification_requirement_document_types,
        backref="verification_requirements"
    )

    # One-to-many relationship with candidate verifications
    candidate_verifications = relationship(
        "CandidateVerification",
        back_populates="requirement",
        cascade="all, delete-orphan"
    )


class CandidateVerification(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin):
    """
    Verification status for a candidate.
    """
    __tablename__ = "onboarding_candidate_verification"

    id = Column(Integer, primary_key=True, index=True)

    # References
    candidate_id = Column(Integer, ForeignKey("recruitment_candidate.id"), nullable=False)
    requirement_id = Column(Integer, ForeignKey("onboarding_verification_requirement.id"), nullable=False)

    # Status
    status = Column(String(20), default="pending", nullable=False)

    # Verification details
    verified_by_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)

    # External verification
    external_reference = Column(String(200), nullable=True)
    external_report_url = Column(String(500), nullable=True)

    # Relationships
    candidate = relationship("Candidate", foreign_keys=[candidate_id])
    requirement = relationship(
        "OnboardingVerificationRequirement",
        back_populates="candidate_verifications"
    )
    verified_by = relationship("Employee", foreign_keys=[verified_by_id])

    # Unique constraint on candidate_id and requirement_id
    __table_args__ = (
        {"extend_existing": True},
    )
