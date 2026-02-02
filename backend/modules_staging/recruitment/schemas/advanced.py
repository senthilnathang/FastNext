"""
Advanced Recruitment Schemas

Pydantic schemas for advanced ATS features including LinkedIn integration, job offers,
talent pools, scoring, workflows, DEI, automation, and analytics models.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any

from pydantic import BaseModel, Field, EmailStr


# =============================================================================
# LinkedIn Account Schemas
# =============================================================================

class LinkedInAccountBase(BaseModel):
    """Base schema for LinkedIn accounts."""
    username: str = Field(..., min_length=1, max_length=250, description="LinkedIn username")
    email: EmailStr = Field(..., description="LinkedIn email")
    api_token: str = Field(..., min_length=1, max_length=500, description="API token")
    sub_id: str = Field(..., min_length=1, max_length=250, description="LinkedIn subscription ID")


class LinkedInAccountCreate(LinkedInAccountBase):
    """Schema for creating a LinkedIn account."""
    pass


class LinkedInAccountUpdate(BaseModel):
    """Schema for updating a LinkedIn account."""
    username: Optional[str] = Field(None, min_length=1, max_length=250)
    email: Optional[EmailStr] = None
    api_token: Optional[str] = Field(None, min_length=1, max_length=500)
    is_active: Optional[bool] = None


class LinkedInAccountResponse(BaseModel):
    """Schema for LinkedIn account response (token hidden)."""
    id: int
    username: str
    email: str
    sub_id: str
    is_active: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LinkedInAccountList(BaseModel):
    """Paginated list of LinkedIn accounts."""
    items: List[LinkedInAccountResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Job Alert Schemas
# =============================================================================

class JobAlertBase(BaseModel):
    """Base schema for job alerts."""
    email: EmailStr = Field(..., description="Subscriber email")
    name: Optional[str] = Field(None, max_length=100, description="Subscriber name")
    employment_types: Optional[List[str]] = Field(default_factory=list, description="Preferred employment types")
    locations: Optional[List[str]] = Field(default_factory=list, description="Preferred locations")
    keywords: Optional[str] = Field(None, max_length=500, description="Search keywords")
    remote_only: bool = Field(False, description="Remote only preference")
    min_salary: Optional[Decimal] = Field(None, description="Minimum salary preference")
    experience_level: Optional[str] = Field(
        None,
        description="Experience level: entry, junior, mid, senior, lead, executive"
    )
    frequency: str = Field("weekly", description="Notification frequency: daily, weekly, instant")


class JobAlertCreate(JobAlertBase):
    """Schema for creating a job alert."""
    department_ids: List[int] = Field(default_factory=list, description="Department IDs")
    job_position_ids: List[int] = Field(default_factory=list, description="Job position IDs")


class JobAlertUpdate(BaseModel):
    """Schema for updating a job alert."""
    name: Optional[str] = Field(None, max_length=100)
    employment_types: Optional[List[str]] = None
    locations: Optional[List[str]] = None
    keywords: Optional[str] = Field(None, max_length=500)
    remote_only: Optional[bool] = None
    min_salary: Optional[Decimal] = None
    experience_level: Optional[str] = None
    frequency: Optional[str] = None
    is_active: Optional[bool] = None
    department_ids: Optional[List[int]] = None
    job_position_ids: Optional[List[int]] = None


class JobAlertResponse(JobAlertBase):
    """Schema for job alert response."""
    id: int
    is_active: bool = True
    verified: bool = False
    last_sent: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class JobAlertList(BaseModel):
    """Paginated list of job alerts."""
    items: List[JobAlertResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Saved Job Schemas
# =============================================================================

class SavedJobBase(BaseModel):
    """Base schema for saved jobs."""
    email: EmailStr = Field(..., description="User email")
    notes: Optional[str] = Field(None, description="Notes about the saved job")


class SavedJobCreate(SavedJobBase):
    """Schema for creating a saved job."""
    recruitment_id: int = Field(..., description="Recruitment ID")


class SavedJobUpdate(BaseModel):
    """Schema for updating a saved job."""
    notes: Optional[str] = None


class SavedJobResponse(SavedJobBase):
    """Schema for saved job response."""
    id: int
    recruitment_id: int
    # Computed/joined fields
    recruitment_title: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SavedJobList(BaseModel):
    """Paginated list of saved jobs."""
    items: List[SavedJobResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Job Offer Schemas
# =============================================================================

class JobOfferBase(BaseModel):
    """Base schema for job offers."""
    job_title: str = Field(..., min_length=1, max_length=200, description="Job title")
    status: str = Field(
        "draft",
        description="Status: draft, pending_approval, approved, sent, viewed, negotiating, "
                    "accepted, declined, expired, withdrawn"
    )
    employment_type: str = Field(
        "full_time",
        description="Employment type: full_time, part_time, contract, internship, temporary"
    )
    work_location: Optional[str] = Field(None, max_length=200, description="Work location")
    base_salary: Decimal = Field(..., description="Base salary")
    salary_currency: str = Field("USD", max_length=3, description="Salary currency")
    salary_frequency: str = Field("annual", description="Salary frequency: annual, monthly, hourly")
    bonus_amount: Optional[Decimal] = Field(None, description="Bonus amount")
    bonus_type: Optional[str] = Field(None, max_length=50, description="Bonus type: signing, performance, annual")
    equity_grant: Optional[str] = Field(None, max_length=200, description="Equity grant details")
    benefits: Optional[List[str]] = Field(default_factory=list, description="Benefits list")
    start_date: date = Field(..., description="Start date")
    offer_expiry_date: Optional[date] = Field(None, description="Offer expiry date")
    probation_period_months: int = Field(3, ge=0, description="Probation period in months")
    terms_and_conditions: Optional[str] = Field(None, description="Terms and conditions")
    special_conditions: Optional[str] = Field(None, description="Special conditions")


class JobOfferCreate(JobOfferBase):
    """Schema for creating a job offer."""
    candidate_id: int = Field(..., description="Candidate ID")
    recruitment_id: int = Field(..., description="Recruitment ID")
    department_id: Optional[int] = Field(None, description="Department ID")
    reporting_to_id: Optional[int] = Field(None, description="Reporting to employee ID")


class JobOfferUpdate(BaseModel):
    """Schema for updating a job offer."""
    job_title: Optional[str] = Field(None, min_length=1, max_length=200)
    status: Optional[str] = None
    department_id: Optional[int] = None
    employment_type: Optional[str] = None
    work_location: Optional[str] = Field(None, max_length=200)
    reporting_to_id: Optional[int] = None
    base_salary: Optional[Decimal] = None
    salary_currency: Optional[str] = Field(None, max_length=3)
    salary_frequency: Optional[str] = None
    bonus_amount: Optional[Decimal] = None
    bonus_type: Optional[str] = Field(None, max_length=50)
    equity_grant: Optional[str] = Field(None, max_length=200)
    benefits: Optional[List[str]] = None
    start_date: Optional[date] = None
    offer_expiry_date: Optional[date] = None
    probation_period_months: Optional[int] = Field(None, ge=0)
    terms_and_conditions: Optional[str] = None
    special_conditions: Optional[str] = None
    offer_letter_file: Optional[str] = Field(None, max_length=500)
    signed_offer_file: Optional[str] = Field(None, max_length=500)
    candidate_response: Optional[str] = None
    is_active: Optional[bool] = None


class JobOfferResponse(JobOfferBase):
    """Schema for job offer response."""
    id: int
    candidate_id: int
    recruitment_id: int
    department_id: Optional[int] = None
    reporting_to_id: Optional[int] = None
    created_by_id: Optional[int] = None
    approved_by_id: Optional[int] = None
    approved_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    viewed_at: Optional[datetime] = None
    responded_at: Optional[datetime] = None
    candidate_response: Optional[str] = None
    offer_letter_file: Optional[str] = None
    signed_offer_file: Optional[str] = None
    is_active: bool = True
    # Computed/joined fields
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    recruitment_title: Optional[str] = None
    department_name: Optional[str] = None
    reporting_to_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class JobOfferList(BaseModel):
    """Paginated list of job offers."""
    items: List[JobOfferResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Offer Negotiation Schemas
# =============================================================================

class OfferNegotiationBase(BaseModel):
    """Base schema for offer negotiations."""
    initiated_by: str = Field(..., description="Initiated by: candidate, employer")
    original_value: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Original values")
    proposed_value: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Proposed values")
    negotiation_notes: Optional[str] = Field(None, description="Negotiation notes")


class OfferNegotiationCreate(OfferNegotiationBase):
    """Schema for creating an offer negotiation."""
    offer_id: int = Field(..., description="Job offer ID")


class OfferNegotiationUpdate(BaseModel):
    """Schema for updating an offer negotiation."""
    proposed_value: Optional[Dict[str, Any]] = None
    negotiation_notes: Optional[str] = None
    is_accepted: Optional[bool] = None


class OfferNegotiationResponse(OfferNegotiationBase):
    """Schema for offer negotiation response."""
    id: int
    offer_id: int
    is_accepted: Optional[bool] = None
    responded_by_id: Optional[int] = None
    responded_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class OfferNegotiationList(BaseModel):
    """Paginated list of offer negotiations."""
    items: List[OfferNegotiationResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Talent Pool Schemas
# =============================================================================

class TalentPoolBase(BaseModel):
    """Base schema for talent pools."""
    name: str = Field(..., min_length=1, max_length=200, description="Pool name")
    description: Optional[str] = Field(None, description="Pool description")
    pool_type: str = Field("general", max_length=50, description="Pool type: general, silver_medalists, future_leaders, etc.")
    auto_add_criteria: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Auto-add criteria")


class TalentPoolCreate(TalentPoolBase):
    """Schema for creating a talent pool."""
    department_id: Optional[int] = Field(None, description="Department ID")
    job_position_id: Optional[int] = Field(None, description="Job position ID")
    owner_id: Optional[int] = Field(None, description="Owner employee ID")


class TalentPoolUpdate(BaseModel):
    """Schema for updating a talent pool."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    pool_type: Optional[str] = Field(None, max_length=50)
    department_id: Optional[int] = None
    job_position_id: Optional[int] = None
    owner_id: Optional[int] = None
    auto_add_criteria: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class TalentPoolResponse(TalentPoolBase):
    """Schema for talent pool response."""
    id: int
    department_id: Optional[int] = None
    job_position_id: Optional[int] = None
    owner_id: Optional[int] = None
    is_active: bool = True
    candidate_count: int = 0
    # Computed/joined fields
    department_name: Optional[str] = None
    job_position_name: Optional[str] = None
    owner_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TalentPoolList(BaseModel):
    """Paginated list of talent pools."""
    items: List[TalentPoolResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Talent Pool Candidate Schemas
# =============================================================================

class TalentPoolCandidateBase(BaseModel):
    """Base schema for talent pool candidates."""
    reason: Optional[str] = Field(None, description="Reason for adding to pool")
    status: str = Field(
        "active",
        description="Status: active, contacted, not_interested, hired, removed"
    )
    notes: Optional[str] = Field(None, description="Notes")


class TalentPoolCandidateCreate(TalentPoolCandidateBase):
    """Schema for creating a talent pool candidate."""
    pool_id: int = Field(..., description="Talent pool ID")
    candidate_id: int = Field(..., description="Candidate ID")
    added_by_id: Optional[int] = Field(None, description="Added by employee ID")
    source_recruitment_id: Optional[int] = Field(None, description="Source recruitment ID")


class TalentPoolCandidateUpdate(BaseModel):
    """Schema for updating a talent pool candidate."""
    reason: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    last_contacted: Optional[datetime] = None
    is_active: Optional[bool] = None


class TalentPoolCandidateResponse(TalentPoolCandidateBase):
    """Schema for talent pool candidate response."""
    id: int
    pool_id: int
    candidate_id: int
    added_by_id: Optional[int] = None
    source_recruitment_id: Optional[int] = None
    last_contacted: Optional[datetime] = None
    is_active: bool = True
    # Computed/joined fields
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    pool_name: Optional[str] = None
    added_by_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TalentPoolCandidateList(BaseModel):
    """Paginated list of talent pool candidates."""
    items: List[TalentPoolCandidateResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Candidate Source Channel Schemas
# =============================================================================

class CandidateSourceChannelBase(BaseModel):
    """Base schema for candidate source channels."""
    name: str = Field(..., min_length=1, max_length=100, description="Channel name")
    channel_type: str = Field(
        "other",
        description="Channel type: job_board, social, referral, agency, careers_page, event, "
                    "university, internal, direct, other"
    )
    description: Optional[str] = Field(None, description="Channel description")
    url: Optional[str] = Field(None, max_length=500, description="Channel URL")
    cost_per_post: Optional[Decimal] = Field(None, description="Cost per post")
    cost_per_click: Optional[Decimal] = Field(None, description="Cost per click")


class CandidateSourceChannelCreate(CandidateSourceChannelBase):
    """Schema for creating a candidate source channel."""
    integration_key: Optional[str] = Field(None, max_length=255, description="Integration key")
    integration_config: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Integration config")


class CandidateSourceChannelUpdate(BaseModel):
    """Schema for updating a candidate source channel."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    channel_type: Optional[str] = None
    description: Optional[str] = None
    url: Optional[str] = Field(None, max_length=500)
    cost_per_post: Optional[Decimal] = None
    cost_per_click: Optional[Decimal] = None
    integration_key: Optional[str] = Field(None, max_length=255)
    integration_config: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class CandidateSourceChannelResponse(CandidateSourceChannelBase):
    """Schema for candidate source channel response."""
    id: int
    is_active: bool = True
    total_candidates: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CandidateSourceChannelList(BaseModel):
    """Paginated list of candidate source channels."""
    items: List[CandidateSourceChannelResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Candidate Tag Schemas
# =============================================================================

class CandidateTagBase(BaseModel):
    """Base schema for candidate tags."""
    name: str = Field(..., min_length=1, max_length=50, description="Tag name")
    color: str = Field("#1890ff", max_length=7, description="Hex color code")
    description: Optional[str] = Field(None, description="Tag description")
    is_system: bool = Field(False, description="Is a system tag")


class CandidateTagCreate(CandidateTagBase):
    """Schema for creating a candidate tag."""
    pass


class CandidateTagUpdate(BaseModel):
    """Schema for updating a candidate tag."""
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    color: Optional[str] = Field(None, max_length=7)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class CandidateTagResponse(CandidateTagBase):
    """Schema for candidate tag response."""
    id: int
    is_active: bool = True
    candidate_count: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CandidateTagList(BaseModel):
    """Paginated list of candidate tags."""
    items: List[CandidateTagResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Employee Referral Schemas
# =============================================================================

class EmployeeReferralBase(BaseModel):
    """Base schema for employee referrals."""
    relationship_desc: Optional[str] = Field(None, max_length=100, description="How referrer knows candidate")
    referral_notes: Optional[str] = Field(None, description="Referral notes")
    status: str = Field(
        "submitted",
        description="Status: submitted, reviewing, interviewing, hired, not_hired, bonus_pending, bonus_paid"
    )
    bonus_amount: Optional[Decimal] = Field(None, description="Bonus amount")


class EmployeeReferralCreate(EmployeeReferralBase):
    """Schema for creating an employee referral."""
    referrer_id: int = Field(..., description="Referrer employee ID")
    candidate_id: int = Field(..., description="Candidate ID")
    recruitment_id: int = Field(..., description="Recruitment ID")


class EmployeeReferralUpdate(BaseModel):
    """Schema for updating an employee referral."""
    relationship_desc: Optional[str] = Field(None, max_length=100)
    referral_notes: Optional[str] = None
    status: Optional[str] = None
    bonus_amount: Optional[Decimal] = None
    bonus_paid_date: Optional[date] = None
    hired_date: Optional[date] = None
    is_active: Optional[bool] = None


class EmployeeReferralResponse(EmployeeReferralBase):
    """Schema for employee referral response."""
    id: int
    referrer_id: int
    candidate_id: int
    recruitment_id: int
    bonus_paid_date: Optional[date] = None
    hired_date: Optional[date] = None
    is_active: bool = True
    # Computed/joined fields
    referrer_name: Optional[str] = None
    candidate_name: Optional[str] = None
    recruitment_title: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class EmployeeReferralList(BaseModel):
    """Paginated list of employee referrals."""
    items: List[EmployeeReferralResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Hiring Team Member Schemas
# =============================================================================

class HiringTeamMemberBase(BaseModel):
    """Base schema for hiring team members."""
    role: str = Field(
        "interviewer",
        description="Role: hiring_manager, recruiter, interviewer, approver, coordinator, observer"
    )
    can_view_salary: bool = Field(False, description="Can view salary information")
    can_approve_offer: bool = Field(False, description="Can approve offers")
    can_reject_candidate: bool = Field(False, description="Can reject candidates")
    notification_preferences: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Notification preferences")


class HiringTeamMemberCreate(HiringTeamMemberBase):
    """Schema for creating a hiring team member."""
    recruitment_id: int = Field(..., description="Recruitment ID")
    employee_id: int = Field(..., description="Employee ID")


class HiringTeamMemberUpdate(BaseModel):
    """Schema for updating a hiring team member."""
    role: Optional[str] = None
    can_view_salary: Optional[bool] = None
    can_approve_offer: Optional[bool] = None
    can_reject_candidate: Optional[bool] = None
    notification_preferences: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class HiringTeamMemberResponse(HiringTeamMemberBase):
    """Schema for hiring team member response."""
    id: int
    recruitment_id: int
    employee_id: int
    is_active: bool = True
    # Computed/joined fields
    employee_name: Optional[str] = None
    recruitment_title: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class HiringTeamMemberList(BaseModel):
    """Paginated list of hiring team members."""
    items: List[HiringTeamMemberResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Hiring Approval Schemas
# =============================================================================

class HiringApprovalBase(BaseModel):
    """Base schema for hiring approvals."""
    approval_type: str = Field(
        ...,
        description="Approval type: job_posting, candidate_advance, offer, hire, salary_exception"
    )
    status: str = Field("pending", description="Status: pending, approved, rejected, escalated")
    request_notes: Optional[str] = Field(None, description="Request notes")
    response_notes: Optional[str] = Field(None, description="Response notes")
    due_date: Optional[datetime] = Field(None, description="Due date")


class HiringApprovalCreate(HiringApprovalBase):
    """Schema for creating a hiring approval."""
    recruitment_id: int = Field(..., description="Recruitment ID")
    candidate_id: Optional[int] = Field(None, description="Candidate ID")
    offer_id: Optional[int] = Field(None, description="Offer ID")
    requested_by_id: Optional[int] = Field(None, description="Requested by employee ID")
    assigned_to_id: Optional[int] = Field(None, description="Assigned to employee ID")


class HiringApprovalUpdate(BaseModel):
    """Schema for updating a hiring approval."""
    status: Optional[str] = None
    response_notes: Optional[str] = None
    due_date: Optional[datetime] = None
    assigned_to_id: Optional[int] = None
    escalation_level: Optional[int] = None


class HiringApprovalResponse(HiringApprovalBase):
    """Schema for hiring approval response."""
    id: int
    recruitment_id: int
    candidate_id: Optional[int] = None
    offer_id: Optional[int] = None
    requested_by_id: Optional[int] = None
    assigned_to_id: Optional[int] = None
    responded_at: Optional[datetime] = None
    escalation_level: int = 0
    # Computed/joined fields
    requested_by_name: Optional[str] = None
    assigned_to_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class HiringApprovalList(BaseModel):
    """Paginated list of hiring approvals."""
    items: List[HiringApprovalResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# DEI Goal Schemas
# =============================================================================

class DEIGoalBase(BaseModel):
    """Base schema for DEI goals."""
    name: str = Field(..., min_length=1, max_length=200, description="Goal name")
    description: Optional[str] = Field(None, description="Goal description")
    goal_type: str = Field(
        ...,
        description="Goal type: gender, ethnicity, disability, veteran, age, lgbtq, socioeconomic, "
                    "neurodiversity, other"
    )
    target_percentage: Decimal = Field(..., ge=0, le=100, description="Target percentage")
    period_start: date = Field(..., description="Period start date")
    period_end: date = Field(..., description="Period end date")


class DEIGoalCreate(DEIGoalBase):
    """Schema for creating a DEI goal."""
    department_id: Optional[int] = Field(None, description="Department ID")
    owner_id: Optional[int] = Field(None, description="Owner employee ID")


class DEIGoalUpdate(BaseModel):
    """Schema for updating a DEI goal."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    goal_type: Optional[str] = None
    department_id: Optional[int] = None
    target_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    current_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    owner_id: Optional[int] = None
    is_active: Optional[bool] = None


class DEIGoalResponse(DEIGoalBase):
    """Schema for DEI goal response."""
    id: int
    department_id: Optional[int] = None
    owner_id: Optional[int] = None
    current_percentage: Decimal = Decimal("0")
    is_active: bool = True
    # Computed/joined fields
    department_name: Optional[str] = None
    owner_name: Optional[str] = None
    progress_percentage: float = 0.0
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DEIGoalList(BaseModel):
    """Paginated list of DEI goals."""
    items: List[DEIGoalResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Hiring Goal Schemas
# =============================================================================

class HiringGoalBase(BaseModel):
    """Base schema for hiring goals."""
    name: str = Field(..., min_length=1, max_length=200, description="Goal name")
    description: Optional[str] = Field(None, description="Goal description")
    target_hires: int = Field(..., ge=1, description="Target number of hires")
    period_start: date = Field(..., description="Period start date")
    period_end: date = Field(..., description="Period end date")


class HiringGoalCreate(HiringGoalBase):
    """Schema for creating a hiring goal."""
    department_id: Optional[int] = Field(None, description="Department ID")
    job_position_id: Optional[int] = Field(None, description="Job position ID")
    owner_id: Optional[int] = Field(None, description="Owner employee ID")


class HiringGoalUpdate(BaseModel):
    """Schema for updating a hiring goal."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    department_id: Optional[int] = None
    job_position_id: Optional[int] = None
    target_hires: Optional[int] = Field(None, ge=1)
    current_hires: Optional[int] = Field(None, ge=0)
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    owner_id: Optional[int] = None
    is_active: Optional[bool] = None


class HiringGoalResponse(HiringGoalBase):
    """Schema for hiring goal response."""
    id: int
    department_id: Optional[int] = None
    job_position_id: Optional[int] = None
    owner_id: Optional[int] = None
    current_hires: int = 0
    is_active: bool = True
    # Computed/joined fields
    department_name: Optional[str] = None
    job_position_name: Optional[str] = None
    owner_name: Optional[str] = None
    progress_percentage: float = 0.0
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class HiringGoalList(BaseModel):
    """Paginated list of hiring goals."""
    items: List[HiringGoalResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Communication Template Schemas
# =============================================================================

class CommunicationTemplateBase(BaseModel):
    """Base schema for communication templates."""
    name: str = Field(..., min_length=1, max_length=200, description="Template name")
    template_type: str = Field("email", description="Template type: email, sms, in_app")
    category: str = Field(
        "custom",
        description="Category: application_received, interview_invite, interview_reminder, "
                    "interview_feedback, offer, rejection, onboarding, follow_up, custom"
    )
    subject: Optional[str] = Field(None, max_length=500, description="Email subject")
    body: str = Field(..., description="Template body")
    variables: Optional[List[str]] = Field(default_factory=list, description="Available template variables")
    is_default: bool = Field(False, description="Is default template for category")


class CommunicationTemplateCreate(CommunicationTemplateBase):
    """Schema for creating a communication template."""
    pass


class CommunicationTemplateUpdate(BaseModel):
    """Schema for updating a communication template."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    template_type: Optional[str] = None
    category: Optional[str] = None
    subject: Optional[str] = Field(None, max_length=500)
    body: Optional[str] = None
    variables: Optional[List[str]] = None
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None


class CommunicationTemplateResponse(CommunicationTemplateBase):
    """Schema for communication template response."""
    id: int
    is_active: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CommunicationTemplateList(BaseModel):
    """Paginated list of communication templates."""
    items: List[CommunicationTemplateResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Automation Rule Schemas
# =============================================================================

class AutomationRuleBase(BaseModel):
    """Base schema for automation rules."""
    name: str = Field(..., min_length=1, max_length=200, description="Rule name")
    description: Optional[str] = Field(None, description="Rule description")
    trigger_type: str = Field(
        ...,
        description="Trigger type: stage_change, application_received, interview_scheduled, "
                    "interview_completed, interview_feedback_submitted, offer_sent, offer_accepted, "
                    "offer_rejected, time_in_stage, rating_received, document_uploaded, "
                    "candidate_tagged, schedule"
    )
    trigger_conditions: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Trigger conditions")
    action_type: str = Field(
        ...,
        description="Action type: send_email, send_sms, move_stage, assign_task, add_tag, remove_tag, "
                    "notify_user, notify_slack, webhook, add_to_talent_pool, schedule_reminder, update_field"
    )
    action_config: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Action configuration")
    delay_minutes: int = Field(0, ge=0, description="Delay before action in minutes")


class AutomationRuleCreate(AutomationRuleBase):
    """Schema for creating an automation rule."""
    recruitment_ids: List[int] = Field(default_factory=list, description="Recruitment IDs")
    department_ids: List[int] = Field(default_factory=list, description="Department IDs")


class AutomationRuleUpdate(BaseModel):
    """Schema for updating an automation rule."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    trigger_type: Optional[str] = None
    trigger_conditions: Optional[Dict[str, Any]] = None
    action_type: Optional[str] = None
    action_config: Optional[Dict[str, Any]] = None
    delay_minutes: Optional[int] = Field(None, ge=0)
    recruitment_ids: Optional[List[int]] = None
    department_ids: Optional[List[int]] = None
    is_active: Optional[bool] = None


class AutomationRuleResponse(AutomationRuleBase):
    """Schema for automation rule response."""
    id: int
    times_triggered: int = 0
    last_triggered: Optional[datetime] = None
    created_by_id: Optional[int] = None
    is_active: bool = True
    # Computed/joined fields
    created_by_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AutomationRuleList(BaseModel):
    """Paginated list of automation rules."""
    items: List[AutomationRuleResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Pipeline Metrics Schemas
# =============================================================================

class PipelineMetricsBase(BaseModel):
    """Base schema for pipeline metrics."""
    snapshot_date: date = Field(..., description="Snapshot date")
    total_candidates: int = Field(0, ge=0, description="Total candidates")
    new_candidates: int = Field(0, ge=0, description="New candidates")
    candidates_by_stage: Optional[Dict[str, int]] = Field(default_factory=dict, description="Candidates by stage")
    application_to_screen_rate: Optional[Decimal] = Field(None, description="Application to screen rate")
    screen_to_interview_rate: Optional[Decimal] = Field(None, description="Screen to interview rate")
    interview_to_offer_rate: Optional[Decimal] = Field(None, description="Interview to offer rate")
    offer_acceptance_rate: Optional[Decimal] = Field(None, description="Offer acceptance rate")
    avg_time_to_hire_days: Optional[Decimal] = Field(None, description="Average time to hire in days")
    avg_time_in_stage: Optional[Dict[str, float]] = Field(default_factory=dict, description="Average time in each stage")
    candidates_by_source: Optional[Dict[str, int]] = Field(default_factory=dict, description="Candidates by source")
    hires_by_source: Optional[Dict[str, int]] = Field(default_factory=dict, description="Hires by source")
    interviews_scheduled: int = Field(0, ge=0, description="Interviews scheduled")
    offers_sent: int = Field(0, ge=0, description="Offers sent")
    hires_made: int = Field(0, ge=0, description="Hires made")
    rejections: int = Field(0, ge=0, description="Rejections")


class PipelineMetricsCreate(PipelineMetricsBase):
    """Schema for creating pipeline metrics."""
    recruitment_id: int = Field(..., description="Recruitment ID")


class PipelineMetricsResponse(PipelineMetricsBase):
    """Schema for pipeline metrics response."""
    id: int
    recruitment_id: int
    # Computed/joined fields
    recruitment_title: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PipelineMetricsList(BaseModel):
    """Paginated list of pipeline metrics."""
    items: List[PipelineMetricsResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Scoring Criteria Schemas
# =============================================================================

class ScoringCriteriaBase(BaseModel):
    """Base schema for scoring criteria."""
    name: str = Field(..., min_length=1, max_length=200, description="Criteria name")
    description: Optional[str] = Field(None, description="Criteria description")
    criteria_type: str = Field(
        "custom",
        description="Criteria type: experience, education, skills, culture_fit, communication, "
                    "technical, leadership, custom"
    )
    weight: Decimal = Field(Decimal("1.0"), ge=0, description="Criteria weight")
    max_score: int = Field(10, ge=1, description="Maximum score")
    is_mandatory: bool = Field(False, description="Is mandatory")
    sequence: int = Field(0, ge=0, description="Display order")


class ScoringCriteriaCreate(ScoringCriteriaBase):
    """Schema for creating scoring criteria."""
    recruitment_id: Optional[int] = Field(None, description="Recruitment ID")


class ScoringCriteriaUpdate(BaseModel):
    """Schema for updating scoring criteria."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    criteria_type: Optional[str] = None
    weight: Optional[Decimal] = Field(None, ge=0)
    max_score: Optional[int] = Field(None, ge=1)
    is_mandatory: Optional[bool] = None
    sequence: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None


class ScoringCriteriaResponse(ScoringCriteriaBase):
    """Schema for scoring criteria response."""
    id: int
    recruitment_id: Optional[int] = None
    is_active: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ScoringCriteriaList(BaseModel):
    """Paginated list of scoring criteria."""
    items: List[ScoringCriteriaResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Candidate Scorecard Schemas
# =============================================================================

class CandidateScorecardBase(BaseModel):
    """Base schema for candidate scorecards."""
    status: str = Field("pending", description="Status: pending, in_progress, completed")
    total_score: Optional[Decimal] = Field(None, description="Total score")
    weighted_score: Optional[Decimal] = Field(None, description="Weighted score")
    max_possible_score: Optional[Decimal] = Field(None, description="Maximum possible score")
    score_percentage: Optional[Decimal] = Field(None, ge=0, le=100, description="Score percentage")
    recommendation: Optional[str] = Field(
        None,
        description="Recommendation: strong_hire, hire, maybe, no_hire, strong_no_hire"
    )
    summary: Optional[str] = Field(None, description="Summary")
    strengths: Optional[str] = Field(None, description="Strengths")
    weaknesses: Optional[str] = Field(None, description="Weaknesses")


class CandidateScorecardCreate(CandidateScorecardBase):
    """Schema for creating a candidate scorecard."""
    candidate_id: int = Field(..., description="Candidate ID")
    reviewer_id: Optional[int] = Field(None, description="Reviewer employee ID")


class CandidateScorecardUpdate(BaseModel):
    """Schema for updating a candidate scorecard."""
    status: Optional[str] = None
    total_score: Optional[Decimal] = None
    weighted_score: Optional[Decimal] = None
    max_possible_score: Optional[Decimal] = None
    score_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    recommendation: Optional[str] = None
    summary: Optional[str] = None
    strengths: Optional[str] = None
    weaknesses: Optional[str] = None


class CandidateScorecardResponse(CandidateScorecardBase):
    """Schema for candidate scorecard response."""
    id: int
    candidate_id: int
    reviewer_id: Optional[int] = None
    completed_at: Optional[datetime] = None
    # Computed/joined fields
    candidate_name: Optional[str] = None
    reviewer_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CandidateScorecardList(BaseModel):
    """Paginated list of candidate scorecards."""
    items: List[CandidateScorecardResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Bulk Operations Schemas
# =============================================================================

class BulkAddToTalentPool(BaseModel):
    """Schema for bulk adding candidates to talent pool."""
    pool_id: int = Field(..., description="Talent pool ID")
    candidate_ids: List[int] = Field(..., description="Candidate IDs to add")
    reason: Optional[str] = Field(None, description="Reason for adding")


class BulkTagCandidates(BaseModel):
    """Schema for bulk tagging candidates."""
    candidate_ids: List[int] = Field(..., description="Candidate IDs")
    tag_ids: List[int] = Field(..., description="Tag IDs to add")


class BulkMoveStage(BaseModel):
    """Schema for bulk moving candidates to a stage."""
    candidate_ids: List[int] = Field(..., description="Candidate IDs")
    stage_id: int = Field(..., description="Target stage ID")
    notes: Optional[str] = Field(None, description="Notes for stage transition")
