"""
Recruitment Core Schemas

Pydantic schemas for core recruitment models: Recruitment, Stage, Candidate, Skill,
RejectReason, RejectedCandidate, StageNote.

Note: Questionnaire/Survey functionality now uses the shared Quiz module.
See survey.py for Quiz integration schemas.
"""

from datetime import date, datetime, time
from decimal import Decimal
from typing import Optional, List, Dict, Any

from pydantic import BaseModel, Field, EmailStr


# =============================================================================
# Skill Schemas
# =============================================================================

class SkillBase(BaseModel):
    """Base schema for skills."""
    title: str = Field(..., min_length=1, max_length=100, description="Skill title")


class SkillCreate(SkillBase):
    """Schema for creating a skill."""
    pass


class SkillUpdate(BaseModel):
    """Schema for updating a skill - all fields optional."""
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    is_active: Optional[bool] = None


class SkillResponse(SkillBase):
    """Schema for skill response."""
    id: int
    is_active: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SkillList(BaseModel):
    """Paginated list of skills."""
    items: List[SkillResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Stage Schemas
# =============================================================================

class StageBase(BaseModel):
    """Base schema for recruitment stages."""
    stage: str = Field(..., min_length=1, max_length=50, description="Stage name")
    stage_type: str = Field(
        "interview",
        description="Stage type: initial, applied, test, interview, cancelled, hired"
    )
    sequence: int = Field(0, ge=0, description="Display order")
    stage_definition_id: Optional[int] = Field(None, description="Link to centralized stage definition")


class StageCreate(StageBase):
    """Schema for creating a stage."""
    recruitment_id: int = Field(..., description="Recruitment ID")
    manager_ids: List[int] = Field(default_factory=list, description="Stage manager IDs")


class StageUpdate(BaseModel):
    """Schema for updating a stage."""
    stage: Optional[str] = Field(None, min_length=1, max_length=50)
    stage_type: Optional[str] = None
    sequence: Optional[int] = Field(None, ge=0)
    stage_definition_id: Optional[int] = None
    manager_ids: Optional[List[int]] = None
    is_active: Optional[bool] = None


class StageResponse(StageBase):
    """Schema for stage response."""
    id: int
    recruitment_id: int
    is_active: bool = True
    candidate_count: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class StageList(BaseModel):
    """Paginated list of stages."""
    items: List[StageResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Reject Reason Schemas
# =============================================================================

class RejectReasonBase(BaseModel):
    """Base schema for reject reasons."""
    title: str = Field(..., min_length=1, max_length=50, description="Reject reason title")
    description: Optional[str] = Field(None, max_length=255, description="Description")


class RejectReasonCreate(RejectReasonBase):
    """Schema for creating a reject reason."""
    pass


class RejectReasonUpdate(BaseModel):
    """Schema for updating a reject reason."""
    title: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = Field(None, max_length=255)
    is_active: Optional[bool] = None


class RejectReasonResponse(RejectReasonBase):
    """Schema for reject reason response."""
    id: int
    is_active: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RejectReasonList(BaseModel):
    """Paginated list of reject reasons."""
    items: List[RejectReasonResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Candidate Schemas
# =============================================================================

class CandidateBase(BaseModel):
    """Base schema for candidates."""
    name: Optional[str] = Field(None, max_length=100, description="Candidate name")
    email: EmailStr = Field(..., description="Candidate email")
    mobile: Optional[str] = Field(None, max_length=15, description="Mobile number")
    gender: Optional[str] = Field("male", description="Gender: male, female, other")
    dob: Optional[date] = Field(None, description="Date of birth")
    profile: Optional[str] = Field(None, max_length=500, description="Profile image path")
    resume: Optional[str] = Field(None, max_length=500, description="Resume file path")
    portfolio: Optional[str] = Field(None, max_length=200, description="Portfolio URL")
    address: Optional[str] = Field(None, max_length=255, description="Address")
    country: Optional[str] = Field(None, max_length=30, description="Country")
    state: Optional[str] = Field(None, max_length=30, description="State")
    city: Optional[str] = Field(None, max_length=30, description="City")
    zip: Optional[str] = Field(None, max_length=30, description="ZIP code")
    source: Optional[str] = Field(None, description="Source: application, software, other")


class CandidateCreate(CandidateBase):
    """Schema for creating a candidate."""
    recruitment_id: Optional[int] = Field(None, description="Recruitment ID")
    job_position_id: Optional[int] = Field(None, description="Job position ID")
    stage_id: Optional[int] = Field(None, description="Stage ID")
    referral_id: Optional[int] = Field(None, description="Referral employee ID")
    source_channel_id: Optional[int] = Field(None, description="Source channel ID")
    schedule_date: Optional[datetime] = Field(None, description="Schedule date")
    joining_date: Optional[date] = Field(None, description="Joining date")


class CandidateUpdate(BaseModel):
    """Schema for updating a candidate."""
    name: Optional[str] = Field(None, max_length=100)
    email: Optional[EmailStr] = None
    mobile: Optional[str] = Field(None, max_length=15)
    gender: Optional[str] = None
    dob: Optional[date] = None
    profile: Optional[str] = Field(None, max_length=500)
    resume: Optional[str] = Field(None, max_length=500)
    portfolio: Optional[str] = Field(None, max_length=200)
    address: Optional[str] = Field(None, max_length=255)
    country: Optional[str] = Field(None, max_length=30)
    state: Optional[str] = Field(None, max_length=30)
    city: Optional[str] = Field(None, max_length=30)
    zip: Optional[str] = Field(None, max_length=30)
    recruitment_id: Optional[int] = None
    job_position_id: Optional[int] = None
    stage_id: Optional[int] = None
    referral_id: Optional[int] = None
    source: Optional[str] = None
    source_channel_id: Optional[int] = None
    schedule_date: Optional[datetime] = None
    start_onboard: Optional[bool] = None
    hired: Optional[bool] = None
    canceled: Optional[bool] = None
    converted: Optional[bool] = None
    joining_date: Optional[date] = None
    probation_end: Optional[date] = None
    hired_date: Optional[date] = None
    offer_letter_status: Optional[str] = None
    sequence: Optional[int] = None
    is_active: Optional[bool] = None


class CandidateMoveStage(BaseModel):
    """Schema for moving candidate to a different stage."""
    stage_id: int = Field(..., description="Target stage ID")
    notes: Optional[str] = Field(None, description="Notes for stage transition")


class CandidateResponse(CandidateBase):
    """Schema for candidate response."""
    id: int
    recruitment_id: Optional[int] = None
    job_position_id: Optional[int] = None
    stage_id: Optional[int] = None
    referral_id: Optional[int] = None
    converted_employee_id: Optional[int] = None
    source_channel_id: Optional[int] = None
    schedule_date: Optional[datetime] = None
    start_onboard: bool = False
    hired: bool = False
    canceled: bool = False
    converted: bool = False
    joining_date: Optional[date] = None
    probation_end: Optional[date] = None
    hired_date: Optional[date] = None
    last_updated: Optional[date] = None
    offer_letter_status: str = "not_sent"
    sequence: int = 0
    is_active: bool = True
    # Computed/joined fields
    recruitment_title: Optional[str] = None
    stage_name: Optional[str] = None
    job_position_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CandidateList(BaseModel):
    """Paginated list of candidates."""
    items: List[CandidateResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Rejected Candidate Schemas
# =============================================================================

class RejectedCandidateBase(BaseModel):
    """Base schema for rejected candidates."""
    description: str = Field(..., min_length=1, max_length=255, description="Rejection description")


class RejectedCandidateCreate(RejectedCandidateBase):
    """Schema for creating a rejected candidate record."""
    candidate_id: int = Field(..., description="Candidate ID")
    reject_reason_ids: List[int] = Field(default_factory=list, description="Reject reason IDs")


class RejectedCandidateUpdate(BaseModel):
    """Schema for updating a rejected candidate record."""
    description: Optional[str] = Field(None, min_length=1, max_length=255)
    reject_reason_ids: Optional[List[int]] = None


class RejectedCandidateResponse(RejectedCandidateBase):
    """Schema for rejected candidate response."""
    id: int
    candidate_id: int
    reject_reason_ids: List[int] = Field(default_factory=list)
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RejectedCandidateList(BaseModel):
    """Paginated list of rejected candidates."""
    items: List[RejectedCandidateResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Stage Note Schemas
# =============================================================================

class StageNoteBase(BaseModel):
    """Base schema for stage notes."""
    description: str = Field(..., description="Note description")
    candidate_can_view: bool = Field(False, description="Candidate can view this note")


class StageNoteCreate(StageNoteBase):
    """Schema for creating a stage note."""
    candidate_id: int = Field(..., description="Candidate ID")
    stage_id: int = Field(..., description="Stage ID")
    stage_file_ids: List[int] = Field(default_factory=list, description="Stage file IDs")


class StageNoteUpdate(BaseModel):
    """Schema for updating a stage note."""
    description: Optional[str] = None
    candidate_can_view: Optional[bool] = None
    stage_file_ids: Optional[List[int]] = None


class StageNoteResponse(StageNoteBase):
    """Schema for stage note response."""
    id: int
    candidate_id: int
    stage_id: int
    updated_by_id: Optional[int] = None
    stage_file_ids: List[int] = Field(default_factory=list)
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class StageNoteList(BaseModel):
    """Paginated list of stage notes."""
    items: List[StageNoteResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Stage Files Schemas
# =============================================================================

class StageFilesBase(BaseModel):
    """Base schema for stage files."""
    files: Optional[str] = Field(None, max_length=500, description="File path")


class StageFilesCreate(StageFilesBase):
    """Schema for creating stage files."""
    pass


class StageFilesUpdate(BaseModel):
    """Schema for updating stage files."""
    files: Optional[str] = Field(None, max_length=500)


class StageFilesResponse(StageFilesBase):
    """Schema for stage files response."""
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class StageFilesList(BaseModel):
    """Paginated list of stage files."""
    items: List[StageFilesResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Recruitment Schemas
# =============================================================================

class RecruitmentBase(BaseModel):
    """Base schema for recruitment/job opening."""
    title: Optional[str] = Field(None, max_length=50, description="Recruitment title")
    description: Optional[str] = Field(None, description="Job description")
    is_event_based: bool = Field(False, description="Is event based recruitment")
    closed: bool = Field(False, description="Is recruitment closed")
    is_published: bool = Field(True, description="Is published on careers page")
    vacancy: Optional[int] = Field(0, ge=0, description="Number of vacancies")
    start_date: date = Field(..., description="Start date")
    end_date: Optional[date] = Field(None, description="End date")
    location: Optional[str] = Field(None, max_length=200, description="Job location")
    is_remote: bool = Field(False, description="Is remote position")
    employment_type: Optional[str] = Field(
        "full_time",
        description="Employment type: full_time, part_time, contract, etc."
    )
    salary_min: Optional[Decimal] = Field(None, description="Minimum salary")
    salary_max: Optional[Decimal] = Field(None, description="Maximum salary")
    salary_currency: str = Field("USD", max_length=10, description="Salary currency")
    salary_period: str = Field("yearly", max_length=20, description="Salary period")
    hide_salary: bool = Field(False, description="Hide salary on job posting")
    experience_min: Optional[int] = Field(None, ge=0, description="Minimum experience years")
    experience_max: Optional[int] = Field(None, ge=0, description="Maximum experience years")
    experience_level: Optional[str] = Field(None, max_length=30, description="Experience level")
    education_level: Optional[str] = Field(None, max_length=50, description="Education level")
    benefits: Optional[List[str]] = Field(default_factory=list, description="Benefits list")
    is_featured: bool = Field(False, description="Is featured job")
    is_urgent: bool = Field(False, description="Is urgent hiring")
    optional_profile_image: bool = Field(False, description="Profile image is optional")
    optional_resume: bool = Field(False, description="Resume is optional")


class RecruitmentCreate(RecruitmentBase):
    """Schema for creating a recruitment."""
    job_position_id: Optional[int] = Field(None, description="Primary job position ID")
    linkedin_account_id: Optional[int] = Field(None, description="LinkedIn account ID")
    publish_in_linkedin: bool = Field(True, description="Publish in LinkedIn")
    manager_ids: List[int] = Field(default_factory=list, description="Recruitment manager IDs")
    open_position_ids: List[int] = Field(default_factory=list, description="Open position IDs")
    survey_template_ids: List[int] = Field(default_factory=list, description="Survey template IDs")
    skill_ids: List[int] = Field(default_factory=list, description="Required skill IDs")


class RecruitmentUpdate(BaseModel):
    """Schema for updating a recruitment."""
    title: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    is_event_based: Optional[bool] = None
    closed: Optional[bool] = None
    is_published: Optional[bool] = None
    vacancy: Optional[int] = Field(None, ge=0)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    job_position_id: Optional[int] = None
    linkedin_account_id: Optional[int] = None
    publish_in_linkedin: Optional[bool] = None
    location: Optional[str] = Field(None, max_length=200)
    is_remote: Optional[bool] = None
    employment_type: Optional[str] = None
    salary_min: Optional[Decimal] = None
    salary_max: Optional[Decimal] = None
    salary_currency: Optional[str] = Field(None, max_length=10)
    salary_period: Optional[str] = Field(None, max_length=20)
    hide_salary: Optional[bool] = None
    experience_min: Optional[int] = Field(None, ge=0)
    experience_max: Optional[int] = Field(None, ge=0)
    experience_level: Optional[str] = Field(None, max_length=30)
    education_level: Optional[str] = Field(None, max_length=50)
    benefits: Optional[List[str]] = None
    is_featured: Optional[bool] = None
    is_urgent: Optional[bool] = None
    optional_profile_image: Optional[bool] = None
    optional_resume: Optional[bool] = None
    manager_ids: Optional[List[int]] = None
    open_position_ids: Optional[List[int]] = None
    survey_template_ids: Optional[List[int]] = None
    skill_ids: Optional[List[int]] = None
    is_active: Optional[bool] = None


class RecruitmentResponse(RecruitmentBase):
    """Schema for recruitment response."""
    id: int
    job_position_id: Optional[int] = None
    linkedin_account_id: Optional[int] = None
    linkedin_post_id: Optional[str] = None
    publish_in_linkedin: bool = True
    posted_by_user_id: Optional[int] = None
    posted_by_name: Optional[str] = None
    view_count: int = 0
    is_active: bool = True
    # Computed/joined fields
    job_position_name: Optional[str] = None
    total_candidates: int = 0
    total_hired: int = 0
    stages: List[StageResponse] = Field(default_factory=list)
    skills: List[SkillResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RecruitmentList(BaseModel):
    """Paginated list of recruitments."""
    items: List[RecruitmentResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Recruitment General Settings Schemas
# =============================================================================

class RecruitmentGeneralSettingBase(BaseModel):
    """Base schema for recruitment general settings."""
    candidate_self_tracking: bool = Field(False, description="Allow candidate self-tracking")
    show_overall_rating: bool = Field(False, description="Show overall rating to candidates")


class RecruitmentGeneralSettingCreate(RecruitmentGeneralSettingBase):
    """Schema for creating recruitment general settings."""
    pass


class RecruitmentGeneralSettingUpdate(BaseModel):
    """Schema for updating recruitment general settings."""
    candidate_self_tracking: Optional[bool] = None
    show_overall_rating: Optional[bool] = None


class RecruitmentGeneralSettingResponse(RecruitmentGeneralSettingBase):
    """Schema for recruitment general settings response."""
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# =============================================================================
# Report Schemas
# =============================================================================

class HiringReport(BaseModel):
    """Hiring statistics report."""
    period_start: date
    period_end: date
    total_openings: int
    total_applications: int
    total_interviews: int
    total_offers: int
    total_hired: int
    avg_time_to_hire_days: float
    offer_acceptance_rate: float
    by_department: List[Dict[str, Any]] = Field(default_factory=list)
    by_source: List[Dict[str, Any]] = Field(default_factory=list)


class SourceAnalysis(BaseModel):
    """Source analysis report."""
    source: str
    total_candidates: int
    hired_candidates: int
    conversion_rate: float
    avg_time_to_hire_days: float
    avg_rating: float


# =============================================================================
# Candidate Skill Schemas
# =============================================================================

class CandidateSkillBase(BaseModel):
    """Base schema for candidate skills."""
    candidate_id: int = Field(..., description="Candidate ID")
    skill_id: Optional[int] = Field(None, description="Skill ID (if from system)")
    skill_name: Optional[str] = Field(None, max_length=100, description="Skill name (if custom)")
    proficiency_level: int = Field(3, ge=1, le=5, description="Proficiency level (1-5)")
    years_experience: Optional[float] = Field(None, ge=0, description="Years of experience")
    is_verified: bool = Field(False, description="Is skill verified")


class CandidateSkillCreate(CandidateSkillBase):
    """Schema for creating a candidate skill."""
    pass


class CandidateSkillUpdate(BaseModel):
    """Schema for updating a candidate skill."""
    skill_id: Optional[int] = None
    skill_name: Optional[str] = Field(None, max_length=100)
    proficiency_level: Optional[int] = Field(None, ge=1, le=5)
    years_experience: Optional[float] = Field(None, ge=0)
    is_verified: Optional[bool] = None


class CandidateSkillResponse(CandidateSkillBase):
    """Schema for candidate skill response."""
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# =============================================================================
# Candidate Rating Schemas
# =============================================================================

class CandidateRatingBase(BaseModel):
    """Base schema for candidate ratings."""
    employee_id: int = Field(..., description="Employee (rater) ID")
    candidate_id: int = Field(..., description="Candidate ID")
    rating: int = Field(..., ge=0, le=5, description="Rating (0-5)")


class CandidateRatingCreate(CandidateRatingBase):
    """Schema for creating a candidate rating."""
    pass


class CandidateRatingUpdate(BaseModel):
    """Schema for updating a candidate rating."""
    rating: Optional[int] = Field(None, ge=0, le=5)


class CandidateRatingResponse(CandidateRatingBase):
    """Schema for candidate rating response."""
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# =============================================================================
# Backward Compatibility Aliases
# =============================================================================

# Interview schemas (named InterviewSchedule* in interview.py)
from .interview import (
    InterviewScheduleCreate as InterviewCreate,
    InterviewScheduleUpdate as InterviewUpdate,
    InterviewScheduleResponse as InterviewResponse,
    InterviewScheduleList as InterviewList,
    InterviewFeedbackCreate,
    InterviewFeedbackResponse,
)

# Offer schemas (named JobOffer* in advanced.py)
from .advanced import (
    JobOfferCreate as OfferLetterCreate,
    JobOfferUpdate as OfferLetterUpdate,
    JobOfferResponse as OfferLetterResponse,
    JobOfferList as OfferLetterList,
)
