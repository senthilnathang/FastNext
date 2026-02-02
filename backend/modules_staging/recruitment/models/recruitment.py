"""
Recruitment Core Models

Core models for recruitment management including Skill,
Recruitment, RecruitmentStage, Candidate, RejectReason, RejectedCandidate, StageFiles, StageNote.

Note: Questionnaires/Surveys now use the shared Quiz module.
"""

from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Date, DateTime, Time,
    ForeignKey, Numeric, JSON, Table, UniqueConstraint
)
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.base import TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin


# Association tables for Many-to-Many relationships
recruitment_managers = Table(
    'recruitment_recruitment_managers',
    Base.metadata,
    Column('recruitment_id', Integer, ForeignKey('recruitment_recruitment.id'), primary_key=True),
    Column('employee_id', Integer, ForeignKey('employee_employees.id'), primary_key=True),
)

recruitment_open_positions = Table(
    'recruitment_recruitment_open_positions',
    Base.metadata,
    Column('recruitment_id', Integer, ForeignKey('recruitment_recruitment.id'), primary_key=True),
    Column('job_position_id', Integer, ForeignKey('hrms_job_positions.id'), primary_key=True),
)

# Note: recruitment_survey_templates removed - using recruitment_quizzes from survey.py instead

recruitment_skills = Table(
    'recruitment_recruitment_skills',
    Base.metadata,
    Column('recruitment_id', Integer, ForeignKey('recruitment_recruitment.id'), primary_key=True),
    Column('skill_id', Integer, ForeignKey('recruitment_skill.id'), primary_key=True),
)

stage_managers = Table(
    'recruitment_stage_managers',
    Base.metadata,
    Column('stage_id', Integer, ForeignKey('recruitment_stage.id'), primary_key=True),
    Column('employee_id', Integer, ForeignKey('employee_employees.id'), primary_key=True),
)

rejected_candidate_reasons = Table(
    'recruitment_rejected_candidate_reasons',
    Base.metadata,
    Column('rejected_candidate_id', Integer, ForeignKey('recruitment_rejected_candidate.id'), primary_key=True),
    Column('reject_reason_id', Integer, ForeignKey('recruitment_reject_reason.id'), primary_key=True),
)

stage_note_files = Table(
    'recruitment_stage_note_files',
    Base.metadata,
    Column('stage_note_id', Integer, ForeignKey('recruitment_stage_note.id'), primary_key=True),
    Column('stage_file_id', Integer, ForeignKey('recruitment_stage_files.id'), primary_key=True),
)

candidate_tags = Table(
    'recruitment_candidate_tags',
    Base.metadata,
    Column('candidate_id', Integer, ForeignKey('recruitment_candidate.id'), primary_key=True),
    Column('tag_id', Integer, ForeignKey('recruitment_candidate_tag.id'), primary_key=True),
)


# Note: SurveyTemplate class removed - using Quiz from quiz module instead
# To link quizzes to recruitment, use the recruitment_quizzes association table


class Skill(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """Skill for job requirements and candidate profiles."""

    __tablename__ = "recruitment_skill"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False)

    # Relationships
    recruitments = relationship("Recruitment", secondary=recruitment_skills, back_populates="skills")


class Recruitment(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """Recruitment/Job opening model."""

    __tablename__ = "recruitment_recruitment"
    __table_args__ = (
        UniqueConstraint('job_position_id', 'start_date', name='uq_recruitment_job_start'),
        UniqueConstraint('job_position_id', 'start_date', 'company_id', name='uq_recruitment_job_start_company'),
    )

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    is_event_based = Column(Boolean, default=False)
    closed = Column(Boolean, default=False)
    is_published = Column(Boolean, default=True)
    vacancy = Column(Integer, default=0, nullable=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)

    # Job position FK (legacy single position)
    job_position_id = Column(Integer, ForeignKey("hrms_job_positions.id"), nullable=True)

    # LinkedIn integration
    linkedin_account_id = Column(Integer, ForeignKey("recruitment_linkedin_account.id"), nullable=True)
    linkedin_post_id = Column(String(150), nullable=True)
    publish_in_linkedin = Column(Boolean, default=True)

    # Optional fields
    optional_profile_image = Column(Boolean, default=False)
    optional_resume = Column(Boolean, default=False)

    # Posted by
    posted_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    posted_by_name = Column(String(100), nullable=True)

    # Location
    location = Column(String(200), nullable=True)
    is_remote = Column(Boolean, default=False)

    # Employment type
    employment_type = Column(String(50), nullable=True, default="full_time")

    # Salary information
    salary_min = Column(Numeric(12, 2), nullable=True)
    salary_max = Column(Numeric(12, 2), nullable=True)
    salary_currency = Column(String(10), default="USD")
    salary_period = Column(String(20), default="yearly")
    hide_salary = Column(Boolean, default=False)

    # Experience requirements
    experience_min = Column(Integer, nullable=True)
    experience_max = Column(Integer, nullable=True)
    experience_level = Column(String(30), nullable=True)

    # Education requirements
    education_level = Column(String(50), nullable=True)

    # Benefits (JSON field)
    benefits = Column(JSON, default=list, nullable=True)

    # Job visibility and tracking
    view_count = Column(Integer, default=0)
    is_featured = Column(Boolean, default=False)
    is_urgent = Column(Boolean, default=False)

    # Relationships
    job_position = relationship("JobPosition", foreign_keys=[job_position_id])
    linkedin_account = relationship("LinkedInAccount", back_populates="recruitments")
    posted_by_user = relationship("User", foreign_keys=[posted_by_user_id])
    recruitment_managers = relationship("Employee", secondary=recruitment_managers)
    open_positions = relationship("JobPosition", secondary=recruitment_open_positions)
    skills = relationship("Skill", secondary=recruitment_skills, back_populates="recruitments")
    stages = relationship("RecruitmentStage", back_populates="recruitment", cascade="all, delete-orphan")
    candidates = relationship("Candidate", back_populates="recruitment")
    resumes = relationship("Resume", back_populates="recruitment")
    # Quiz module integration - screening questionnaires
    # Note: Quiz relationship removed to avoid cross-module mapper initialization issues.
    # Access screening quizzes via recruitment_recruitment_quizzes association table directly.
    # screening_quizzes = relationship("Quiz", secondary="recruitment_recruitment_quizzes", lazy="select")
    candidate_quiz_attempts = relationship("CandidateQuizAttempt", back_populates="recruitment")


class RecruitmentStage(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """Recruitment pipeline stage."""

    __tablename__ = "recruitment_stage"
    __table_args__ = (
        UniqueConstraint('recruitment_id', 'stage', name='uq_stage_recruitment_name'),
    )

    id = Column(Integer, primary_key=True, index=True)
    recruitment_id = Column(Integer, ForeignKey("recruitment_recruitment.id"), nullable=False)
    stage = Column(String(50), nullable=False)
    stage_type = Column(String(20), default="interview")  # initial, applied, test, interview, cancelled, hired
    sequence = Column(Integer, default=0, nullable=True)

    # Link to centralized stage definition
    stage_definition_id = Column(Integer, ForeignKey("hrms_stage_definitions.id"), nullable=True)

    # Relationships
    recruitment = relationship("Recruitment", back_populates="stages")
    stage_managers = relationship("Employee", secondary=stage_managers)
    candidates = relationship("Candidate", back_populates="stage")
    stage_definition = relationship("StageDefinition", foreign_keys=[stage_definition_id])
    stage_notes = relationship("StageNote", back_populates="stage")


class Candidate(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """Job candidate model."""

    __tablename__ = "recruitment_candidate"
    __table_args__ = (
        UniqueConstraint('email', 'recruitment_id', name='uq_candidate_email_recruitment'),
    )

    id = Column(Integer, primary_key=True, index=True)

    # Personal info
    name = Column(String(100), nullable=True)
    email = Column(String(254), nullable=False)
    mobile = Column(String(15), nullable=True)
    gender = Column(String(15), nullable=True, default="male")  # male, female, other
    dob = Column(Date, nullable=True)

    # Profile and resume
    profile = Column(String(500), nullable=True)  # ImageField -> store path
    resume = Column(String(500), nullable=True)  # FileField -> store path
    portfolio = Column(String(200), nullable=True)

    # Address
    address = Column(String(255), nullable=True)
    country = Column(String(30), nullable=True)
    state = Column(String(30), nullable=True)
    city = Column(String(30), nullable=True)
    zip = Column(String(30), nullable=True)

    # Recruitment links
    recruitment_id = Column(Integer, ForeignKey("recruitment_recruitment.id"), nullable=True)
    job_position_id = Column(Integer, ForeignKey("hrms_job_positions.id"), nullable=True)
    stage_id = Column(Integer, ForeignKey("recruitment_stage.id"), nullable=True)

    # Referral
    referral_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=True)

    # Converted employee
    converted_employee_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=True)

    # Schedule
    schedule_date = Column(DateTime, nullable=True)

    # Source tracking
    source = Column(String(20), nullable=True)  # application, software, other
    source_channel_id = Column(Integer, ForeignKey("recruitment_candidate_source_channel.id"), nullable=True)

    # Status flags
    start_onboard = Column(Boolean, default=False)
    hired = Column(Boolean, default=False)
    canceled = Column(Boolean, default=False)
    converted = Column(Boolean, default=False)

    # Dates
    joining_date = Column(Date, nullable=True)
    probation_end = Column(Date, nullable=True)
    hired_date = Column(Date, nullable=True)
    last_updated = Column(Date, nullable=True)

    # Offer letter status
    offer_letter_status = Column(String(10), default="not_sent")  # not_sent, sent, accepted, rejected, joined

    # Sequence for ordering
    sequence = Column(Integer, default=0, nullable=True)

    # Relationships
    recruitment = relationship("Recruitment", back_populates="candidates")
    job_position = relationship("JobPosition", foreign_keys=[job_position_id])
    stage = relationship("RecruitmentStage", back_populates="candidates")
    referral = relationship("Employee", foreign_keys=[referral_id])
    converted_employee = relationship("Employee", foreign_keys=[converted_employee_id])
    source_channel = relationship("CandidateSourceChannel", back_populates="candidates")
    tags = relationship("CandidateTag", secondary=candidate_tags, back_populates="candidates")
    rejected_candidates = relationship("RejectedCandidate", back_populates="candidate")
    stage_notes = relationship("StageNote", back_populates="candidate")
    ratings = relationship("CandidateRating", back_populates="candidate")
    candidate_skills = relationship("CandidateSkill", back_populates="candidate")
    interviews = relationship("InterviewSchedule", back_populates="candidate")
    quiz_attempts = relationship("CandidateQuizAttempt", back_populates="candidate")
    documents = relationship("CandidateDocument", back_populates="candidate")


class RejectReason(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """Rejection reason for candidates."""

    __tablename__ = "recruitment_reject_reason"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(50), nullable=False)
    description = Column(String(255), nullable=True)

    # Relationships
    rejected_candidates = relationship("RejectedCandidate", secondary=rejected_candidate_reasons, back_populates="reject_reasons")


class RejectedCandidate(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """Rejected candidate record."""

    __tablename__ = "recruitment_rejected_candidate"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("recruitment_candidate.id"), nullable=False)
    description = Column(String(255), nullable=False)

    # Relationships
    candidate = relationship("Candidate", back_populates="rejected_candidates")
    reject_reasons = relationship("RejectReason", secondary=rejected_candidate_reasons, back_populates="rejected_candidates")


class StageFiles(Base, TimestampMixin, AuditMixin, SoftDeleteMixin):
    """Files attached to stage notes."""

    __tablename__ = "recruitment_stage_files"

    id = Column(Integer, primary_key=True, index=True)
    files = Column(String(500), nullable=True)  # FileField -> store path

    # Relationships
    stage_notes = relationship("StageNote", secondary=stage_note_files, back_populates="stage_files")


class StageNote(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin):
    """Notes for candidates at specific stages."""

    __tablename__ = "recruitment_stage_note"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("recruitment_candidate.id"), nullable=False)
    stage_id = Column(Integer, ForeignKey("recruitment_stage.id"), nullable=False)
    description = Column(Text, nullable=False)
    updated_by_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=True)
    candidate_can_view = Column(Boolean, default=False)

    # Relationships
    candidate = relationship("Candidate", back_populates="stage_notes")
    stage = relationship("RecruitmentStage", back_populates="stage_notes")
    updated_by_employee = relationship("Employee", foreign_keys=[updated_by_id])
    stage_files = relationship("StageFiles", secondary=stage_note_files, back_populates="stage_notes")


class RecruitmentGeneralSetting(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin):
    """General settings for recruitment module."""

    __tablename__ = "recruitment_general_setting"

    id = Column(Integer, primary_key=True, index=True)
    candidate_self_tracking = Column(Boolean, default=False)
    show_overall_rating = Column(Boolean, default=False)


# Quiz module integration
from .survey import CandidateQuizAttempt, recruitment_quizzes

# CandidateSkill and CandidateRating from skill_zone
from .skill_zone import CandidateSkill, CandidateRating

# Interview models from interview.py
from .interview import InterviewSchedule as Interview, InterviewFeedback

# JobOffer from advanced.py (aliased as OfferLetter for compatibility)
from .advanced import JobOffer as OfferLetter


# Enums for compatibility (proper str+Enum for Pydantic support)
import enum


class RecruitmentStatus(str, enum.Enum):
    DRAFT = "draft"
    OPEN = "open"
    CLOSED = "closed"
    PAUSED = "paused"


class StageType(str, enum.Enum):
    INITIAL = "initial"
    APPLIED = "applied"
    TEST = "test"
    INTERVIEW = "interview"
    CANCELLED = "cancelled"
    HIRED = "hired"


class CandidateSource(str, enum.Enum):
    APPLICATION = "application"
    SOFTWARE = "software"
    OTHER = "other"


class OfferStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    NEGOTIATING = "negotiating"


class InterviewStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"
