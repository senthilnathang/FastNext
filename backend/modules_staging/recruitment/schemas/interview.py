"""
Interview Schemas

Pydantic schemas for interview models: InterviewSchedule, InterviewScorecardTemplate,
InterviewFeedback, InterviewAvailability, InterviewQuestion, Competency,
InterviewKit, InterviewKitQuestion, CompetencyRating, InterviewGuide.
"""

from datetime import date, datetime, time
from decimal import Decimal
from typing import Optional, List, Dict, Any

from pydantic import BaseModel, Field


# =============================================================================
# Interview Schedule Schemas
# =============================================================================

class InterviewScheduleBase(BaseModel):
    """Base schema for interview schedules."""
    interview_date: date = Field(..., description="Interview date")
    interview_time: time = Field(..., description="Interview start time")
    end_time: Optional[time] = Field(None, description="Interview end time")
    description: Optional[str] = Field(None, description="Interview description")
    completed: bool = Field(False, description="Is interview completed")
    interview_type: str = Field(
        "technical",
        description="Interview type: phone, video, onsite, technical, hr, panel, final, assessment, culture_fit"
    )
    status: str = Field(
        "scheduled",
        description="Status: scheduled, confirmed, in_progress, completed, cancelled, rescheduled, no_show, pending_feedback"
    )
    result: str = Field(
        "pending",
        description="Result: pending, pass, fail, strong_hire, hire, no_hire, strong_no_hire, hold"
    )
    round_number: int = Field(1, ge=1, description="Interview round number")
    duration_minutes: int = Field(60, ge=1, description="Duration in minutes")
    location: Optional[str] = Field(None, max_length=255, description="Interview location")
    meeting_link: Optional[str] = Field(None, max_length=500, description="Meeting link")
    meeting_id: Optional[str] = Field(None, max_length=100, description="Meeting ID")
    meeting_password: Optional[str] = Field(None, max_length=50, description="Meeting password")
    timezone: str = Field("UTC", max_length=50, description="Timezone")
    interview_kit: Optional[str] = Field(None, description="Interview kit content")


class InterviewScheduleCreate(InterviewScheduleBase):
    """Schema for creating an interview schedule."""
    candidate_id: int = Field(..., description="Candidate ID")
    scorecard_template_id: Optional[int] = Field(None, description="Scorecard template ID")
    interviewer_ids: List[int] = Field(default_factory=list, description="Interviewer employee IDs")
    rescheduled_from_id: Optional[int] = Field(None, description="Rescheduled from interview ID")
    reschedule_reason: Optional[str] = Field(None, description="Reason for rescheduling")


class InterviewScheduleUpdate(BaseModel):
    """Schema for updating an interview schedule."""
    interview_date: Optional[date] = None
    interview_time: Optional[time] = None
    end_time: Optional[time] = None
    description: Optional[str] = None
    completed: Optional[bool] = None
    interview_type: Optional[str] = None
    status: Optional[str] = None
    result: Optional[str] = None
    round_number: Optional[int] = Field(None, ge=1)
    duration_minutes: Optional[int] = Field(None, ge=1)
    location: Optional[str] = Field(None, max_length=255)
    meeting_link: Optional[str] = Field(None, max_length=500)
    meeting_id: Optional[str] = Field(None, max_length=100)
    meeting_password: Optional[str] = Field(None, max_length=50)
    timezone: Optional[str] = Field(None, max_length=50)
    scorecard_template_id: Optional[int] = None
    interviewer_ids: Optional[List[int]] = None
    overall_rating: Optional[Decimal] = Field(None, ge=0, le=10)
    overall_feedback: Optional[str] = None
    next_steps: Optional[str] = None
    strengths: Optional[str] = None
    areas_of_improvement: Optional[str] = None
    interview_kit: Optional[str] = None
    reminder_sent: Optional[bool] = None
    candidate_notified: Optional[bool] = None
    interviewers_notified: Optional[bool] = None
    is_active: Optional[bool] = None


class InterviewScheduleResponse(InterviewScheduleBase):
    """Schema for interview schedule response."""
    id: int
    candidate_id: int
    scorecard_template_id: Optional[int] = None
    rescheduled_from_id: Optional[int] = None
    reschedule_reason: Optional[str] = None
    reschedule_count: int = 0
    overall_rating: Optional[Decimal] = None
    overall_feedback: Optional[str] = None
    next_steps: Optional[str] = None
    strengths: Optional[str] = None
    areas_of_improvement: Optional[str] = None
    calendar_event_id: Optional[str] = None
    reminder_sent: bool = False
    reminder_time: Optional[datetime] = None
    candidate_notified: bool = False
    interviewers_notified: bool = False
    is_active: bool = True
    # Computed/joined fields
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    interviewer_names: List[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InterviewScheduleList(BaseModel):
    """Paginated list of interview schedules."""
    items: List[InterviewScheduleResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Interview Scorecard Template Schemas
# =============================================================================

class ScorecardCriteria(BaseModel):
    """Schema for scorecard criteria item."""
    name: str = Field(..., description="Criteria name")
    description: Optional[str] = Field(None, description="Criteria description")
    weight: int = Field(30, ge=0, le=100, description="Criteria weight percentage")
    max_score: int = Field(5, ge=1, description="Maximum score")


class InterviewScorecardTemplateBase(BaseModel):
    """Base schema for interview scorecard templates."""
    name: str = Field(..., min_length=1, max_length=200, description="Template name")
    description: Optional[str] = Field(None, description="Template description")
    interview_type: Optional[str] = Field(
        None,
        description="Interview type: phone, video, onsite, technical, hr, panel, final, assessment, culture_fit"
    )
    criteria: List[ScorecardCriteria] = Field(default_factory=list, description="Scoring criteria")
    passing_score: Optional[Decimal] = Field(None, ge=0, description="Passing score threshold")


class InterviewScorecardTemplateCreate(InterviewScorecardTemplateBase):
    """Schema for creating an interview scorecard template."""
    pass


class InterviewScorecardTemplateUpdate(BaseModel):
    """Schema for updating an interview scorecard template."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    interview_type: Optional[str] = None
    criteria: Optional[List[ScorecardCriteria]] = None
    passing_score: Optional[Decimal] = Field(None, ge=0)
    is_active: Optional[bool] = None


class InterviewScorecardTemplateResponse(InterviewScorecardTemplateBase):
    """Schema for interview scorecard template response."""
    id: int
    is_active: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InterviewScorecardTemplateList(BaseModel):
    """Paginated list of interview scorecard templates."""
    items: List[InterviewScorecardTemplateResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Interview Feedback Schemas
# =============================================================================

class InterviewFeedbackBase(BaseModel):
    """Base schema for interview feedback."""
    overall_rating: Decimal = Field(..., ge=0, le=10, description="Overall rating")
    recommendation: str = Field(
        ...,
        description="Recommendation: strong_hire, hire, lean_hire, lean_no_hire, no_hire, strong_no_hire"
    )
    feedback: str = Field(..., description="Feedback text")
    strengths: Optional[str] = Field(None, description="Candidate strengths")
    weaknesses: Optional[str] = Field(None, description="Candidate weaknesses")
    notes: Optional[str] = Field(None, description="Additional notes")
    criteria_scores: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Criteria-based scores")


class InterviewFeedbackCreate(InterviewFeedbackBase):
    """Schema for creating interview feedback."""
    interview_id: int = Field(..., description="Interview ID")
    interviewer_id: int = Field(..., description="Interviewer employee ID")


class InterviewFeedbackUpdate(BaseModel):
    """Schema for updating interview feedback."""
    overall_rating: Optional[Decimal] = Field(None, ge=0, le=10)
    recommendation: Optional[str] = None
    feedback: Optional[str] = None
    strengths: Optional[str] = None
    weaknesses: Optional[str] = None
    notes: Optional[str] = None
    criteria_scores: Optional[Dict[str, Any]] = None


class InterviewFeedbackResponse(InterviewFeedbackBase):
    """Schema for interview feedback response."""
    id: int
    interview_id: int
    interviewer_id: int
    submitted_at: Optional[datetime] = None
    # Computed/joined fields
    interviewer_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InterviewFeedbackList(BaseModel):
    """Paginated list of interview feedback."""
    items: List[InterviewFeedbackResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Interview Availability Schemas
# =============================================================================

class RecurringPattern(BaseModel):
    """Schema for recurring availability pattern."""
    frequency: str = Field(..., description="Frequency: daily, weekly, monthly")
    days: List[int] = Field(default_factory=list, description="Days of week (0=Monday, 6=Sunday)")
    until: Optional[date] = Field(None, description="End date for recurrence")


class InterviewAvailabilityBase(BaseModel):
    """Base schema for interview availability."""
    availability_date: date = Field(..., description="Availability date")
    start_time: time = Field(..., description="Start time")
    end_time: time = Field(..., description="End time")
    status: str = Field(
        "available",
        description="Status: available, tentative, booked, unavailable"
    )
    interview_types: List[str] = Field(default_factory=list, description="Preferred interview types")
    notes: Optional[str] = Field(None, description="Notes")
    recurring: bool = Field(False, description="Is recurring availability")
    recurring_pattern: Optional[RecurringPattern] = Field(None, description="Recurring pattern")


class InterviewAvailabilityCreate(InterviewAvailabilityBase):
    """Schema for creating interview availability."""
    employee_id: int = Field(..., description="Employee ID")


class InterviewAvailabilityUpdate(BaseModel):
    """Schema for updating interview availability."""
    availability_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    status: Optional[str] = None
    interview_types: Optional[List[str]] = None
    notes: Optional[str] = None
    recurring: Optional[bool] = None
    recurring_pattern: Optional[RecurringPattern] = None


class InterviewAvailabilityResponse(InterviewAvailabilityBase):
    """Schema for interview availability response."""
    id: int
    employee_id: int
    # Computed/joined fields
    employee_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InterviewAvailabilityList(BaseModel):
    """Paginated list of interview availability."""
    items: List[InterviewAvailabilityResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Interview Question Schemas
# =============================================================================

class InterviewQuestionBase(BaseModel):
    """Base schema for interview questions."""
    question: str = Field(..., description="Question text")
    answer_guide: Optional[str] = Field(None, description="Answer guide/expected answer")
    interview_type: str = Field(
        ...,
        description="Interview type: phone, video, onsite, technical, hr, panel, final, assessment, culture_fit"
    )
    category: Optional[str] = Field(None, max_length=100, description="Question category")
    difficulty: str = Field("medium", description="Difficulty: easy, medium, hard, expert")
    skills: List[str] = Field(default_factory=list, description="Skills assessed")
    time_estimate_minutes: Optional[int] = Field(None, ge=1, description="Time estimate in minutes")


class InterviewQuestionCreate(InterviewQuestionBase):
    """Schema for creating an interview question."""
    job_position_id: Optional[int] = Field(None, description="Job position ID")


class InterviewQuestionUpdate(BaseModel):
    """Schema for updating an interview question."""
    question: Optional[str] = None
    answer_guide: Optional[str] = None
    interview_type: Optional[str] = None
    category: Optional[str] = Field(None, max_length=100)
    difficulty: Optional[str] = None
    skills: Optional[List[str]] = None
    time_estimate_minutes: Optional[int] = Field(None, ge=1)
    job_position_id: Optional[int] = None
    is_active: Optional[bool] = None


class InterviewQuestionResponse(InterviewQuestionBase):
    """Schema for interview question response."""
    id: int
    job_position_id: Optional[int] = None
    is_active: bool = True
    # Computed/joined fields
    job_position_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InterviewQuestionList(BaseModel):
    """Paginated list of interview questions."""
    items: List[InterviewQuestionResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Competency Schemas
# =============================================================================

class CompetencyBase(BaseModel):
    """Base schema for competencies."""
    name: str = Field(..., min_length=1, max_length=100, description="Competency name")
    description: Optional[str] = Field(None, description="Competency description")
    category: str = Field(
        "technical",
        description="Category: technical, leadership, communication, problem_solving, teamwork, "
                    "adaptability, domain, cultural, analytical, creativity"
    )
    rating_scale: Optional[List[Dict[str, Any]]] = Field(
        default_factory=list,
        description="Custom rating scale definitions"
    )


class CompetencyCreate(CompetencyBase):
    """Schema for creating a competency."""
    pass


class CompetencyUpdate(BaseModel):
    """Schema for updating a competency."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    category: Optional[str] = None
    rating_scale: Optional[List[Dict[str, Any]]] = None
    is_active: Optional[bool] = None


class CompetencyResponse(CompetencyBase):
    """Schema for competency response."""
    id: int
    is_active: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CompetencyList(BaseModel):
    """Paginated list of competencies."""
    items: List[CompetencyResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Interview Kit Schemas
# =============================================================================

class InterviewKitBase(BaseModel):
    """Base schema for interview kits."""
    name: str = Field(..., min_length=1, max_length=200, description="Kit name")
    description: Optional[str] = Field(None, description="Kit description")
    interview_type: str = Field(
        "technical",
        description="Interview type: phone_screen, technical, behavioral, culture_fit, panel, "
                    "case_study, presentation, final, hr, custom"
    )
    duration_minutes: int = Field(60, ge=1, description="Duration in minutes")
    is_template: bool = Field(False, description="Is a template")


class InterviewKitCreate(InterviewKitBase):
    """Schema for creating an interview kit."""
    job_position_id: Optional[int] = Field(None, description="Job position ID")
    department_id: Optional[int] = Field(None, description="Department ID")
    created_by_id: Optional[int] = Field(None, description="Created by employee ID")
    competency_ids: List[int] = Field(default_factory=list, description="Competency IDs")


class InterviewKitUpdate(BaseModel):
    """Schema for updating an interview kit."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    interview_type: Optional[str] = None
    duration_minutes: Optional[int] = Field(None, ge=1)
    is_template: Optional[bool] = None
    job_position_id: Optional[int] = None
    department_id: Optional[int] = None
    competency_ids: Optional[List[int]] = None
    is_active: Optional[bool] = None


class InterviewKitResponse(InterviewKitBase):
    """Schema for interview kit response."""
    id: int
    job_position_id: Optional[int] = None
    department_id: Optional[int] = None
    created_by_id: Optional[int] = None
    is_active: bool = True
    # Computed/joined fields
    job_position_name: Optional[str] = None
    department_name: Optional[str] = None
    competencies: List[CompetencyResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InterviewKitList(BaseModel):
    """Paginated list of interview kits."""
    items: List[InterviewKitResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Interview Kit Question Schemas
# =============================================================================

class InterviewKitQuestionBase(BaseModel):
    """Base schema for interview kit questions."""
    question: str = Field(..., description="Question text")
    question_type: str = Field(
        "general",
        description="Question type: behavioral, technical, situational, competency, case, role_play, general"
    )
    purpose: Optional[str] = Field(None, description="Why ask this question")
    good_answer_hints: Optional[str] = Field(None, description="What to look for in a good answer")
    red_flags: Optional[str] = Field(None, description="Warning signs in answers")
    sequence: int = Field(0, ge=0, description="Display order")
    time_allocation_minutes: int = Field(5, ge=1, description="Time allocation in minutes")
    is_required: bool = Field(False, description="Is question required")


class InterviewKitQuestionCreate(InterviewKitQuestionBase):
    """Schema for creating an interview kit question."""
    kit_id: int = Field(..., description="Interview kit ID")
    competency_id: Optional[int] = Field(None, description="Competency ID")


class InterviewKitQuestionUpdate(BaseModel):
    """Schema for updating an interview kit question."""
    question: Optional[str] = None
    question_type: Optional[str] = None
    purpose: Optional[str] = None
    good_answer_hints: Optional[str] = None
    red_flags: Optional[str] = None
    sequence: Optional[int] = Field(None, ge=0)
    time_allocation_minutes: Optional[int] = Field(None, ge=1)
    is_required: Optional[bool] = None
    competency_id: Optional[int] = None


class InterviewKitQuestionResponse(InterviewKitQuestionBase):
    """Schema for interview kit question response."""
    id: int
    kit_id: int
    competency_id: Optional[int] = None
    # Computed/joined fields
    competency_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InterviewKitQuestionList(BaseModel):
    """Paginated list of interview kit questions."""
    items: List[InterviewKitQuestionResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Competency Rating Schemas
# =============================================================================

class CompetencyRatingBase(BaseModel):
    """Base schema for competency ratings."""
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5")
    notes: Optional[str] = Field(None, description="Rating notes")


class CompetencyRatingCreate(CompetencyRatingBase):
    """Schema for creating a competency rating."""
    candidate_id: int = Field(..., description="Candidate ID")
    competency_id: int = Field(..., description="Competency ID")
    interview_id: int = Field(..., description="Interview ID")
    rated_by_id: Optional[int] = Field(None, description="Rated by employee ID")


class CompetencyRatingUpdate(BaseModel):
    """Schema for updating a competency rating."""
    rating: Optional[int] = Field(None, ge=1, le=5)
    notes: Optional[str] = None


class CompetencyRatingResponse(CompetencyRatingBase):
    """Schema for competency rating response."""
    id: int
    candidate_id: int
    competency_id: int
    interview_id: int
    rated_by_id: Optional[int] = None
    rated_at: Optional[datetime] = None
    # Computed/joined fields
    competency_name: Optional[str] = None
    rated_by_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CompetencyRatingList(BaseModel):
    """Paginated list of competency ratings."""
    items: List[CompetencyRatingResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Interview Guide Schemas
# =============================================================================

class InterviewGuideBase(BaseModel):
    """Base schema for interview guides."""
    title: str = Field(..., min_length=1, max_length=200, description="Guide title")
    content: str = Field(..., description="Guide content")
    attachments: Optional[List[str]] = Field(default_factory=list, description="Attachment file paths/URLs")
    is_for_lead_interviewer: bool = Field(False, description="Is for lead interviewer only")
    sequence: int = Field(0, ge=0, description="Display order")


class InterviewGuideCreate(InterviewGuideBase):
    """Schema for creating an interview guide."""
    kit_id: int = Field(..., description="Interview kit ID")


class InterviewGuideUpdate(BaseModel):
    """Schema for updating an interview guide."""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = None
    attachments: Optional[List[str]] = None
    is_for_lead_interviewer: Optional[bool] = None
    sequence: Optional[int] = Field(None, ge=0)


class InterviewGuideResponse(InterviewGuideBase):
    """Schema for interview guide response."""
    id: int
    kit_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InterviewGuideList(BaseModel):
    """Paginated list of interview guides."""
    items: List[InterviewGuideResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Interview Schedule with Related Data
# =============================================================================

class InterviewScheduleWithFeedback(InterviewScheduleResponse):
    """Interview schedule with nested feedback."""
    feedbacks: List[InterviewFeedbackResponse] = Field(default_factory=list)
    competency_ratings: List[CompetencyRatingResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class InterviewKitWithQuestions(InterviewKitResponse):
    """Interview kit with nested questions and guides."""
    questions: List[InterviewKitQuestionResponse] = Field(default_factory=list)
    guides: List[InterviewGuideResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True
