"""
Interview API Routes

CRUD operations for interview scheduling and management.
"""

from datetime import date, datetime, time
from decimal import Decimal
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User

from ..services.interview_service import InterviewService


router = APIRouter(tags=["Interviews"])


def get_service(db: Session = Depends(get_db)) -> InterviewService:
    return InterviewService(db)


# =============================================================================
# Pydantic Schemas
# =============================================================================

class InterviewBase(BaseModel):
    interview_date: date
    interview_time: time
    end_time: Optional[time] = None
    description: Optional[str] = None
    interview_type: str = "technical"
    round_number: int = 1
    duration_minutes: int = 60
    location: Optional[str] = None
    meeting_link: Optional[str] = None
    meeting_id: Optional[str] = None
    meeting_password: Optional[str] = None
    timezone: str = "UTC"
    scorecard_template_id: Optional[int] = None


class InterviewCreate(InterviewBase):
    candidate_id: int
    interviewer_ids: List[int] = Field(default_factory=list)
    interview_kit: Optional[str] = None


class InterviewUpdate(BaseModel):
    interview_date: Optional[date] = None
    interview_time: Optional[time] = None
    end_time: Optional[time] = None
    description: Optional[str] = None
    interview_type: Optional[str] = None
    status: Optional[str] = None
    round_number: Optional[int] = None
    duration_minutes: Optional[int] = None
    location: Optional[str] = None
    meeting_link: Optional[str] = None
    meeting_id: Optional[str] = None
    meeting_password: Optional[str] = None
    timezone: Optional[str] = None
    scorecard_template_id: Optional[int] = None
    interviewer_ids: Optional[List[int]] = None
    overall_rating: Optional[Decimal] = None
    overall_feedback: Optional[str] = None
    next_steps: Optional[str] = None
    strengths: Optional[str] = None
    areas_of_improvement: Optional[str] = None
    result: Optional[str] = None


class InterviewResponse(InterviewBase):
    id: int
    candidate_id: int
    status: str = "scheduled"
    result: str = "pending"
    completed: bool = False
    overall_rating: Optional[Decimal] = None
    overall_feedback: Optional[str] = None
    is_active: bool = True

    class Config:
        from_attributes = True


class InterviewList(BaseModel):
    items: List[InterviewResponse]
    total: int
    page: int
    page_size: int


class RescheduleRequest(BaseModel):
    new_date: date
    new_time: time
    reason: Optional[str] = None


class CompleteInterviewRequest(BaseModel):
    result: Optional[str] = None
    overall_feedback: Optional[str] = None


class CancelInterviewRequest(BaseModel):
    reason: Optional[str] = None


class FeedbackBase(BaseModel):
    overall_rating: Decimal = Field(..., ge=0, le=5)
    recommendation: str
    feedback: str
    strengths: Optional[str] = None
    weaknesses: Optional[str] = None
    notes: Optional[str] = None
    criteria_scores: Dict[str, Any] = Field(default_factory=dict)


class FeedbackCreate(FeedbackBase):
    pass


class FeedbackResponse(FeedbackBase):
    id: int
    interview_id: int
    interviewer_id: int
    submitted_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AvailabilityBase(BaseModel):
    date: date
    start_time: time
    end_time: time
    status: str = "available"
    interview_types: List[str] = Field(default_factory=list)
    notes: Optional[str] = None
    recurring: bool = False
    recurring_pattern: Optional[Dict[str, Any]] = None


class AvailabilityCreate(AvailabilityBase):
    pass


class AvailabilityUpdate(BaseModel):
    date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    status: Optional[str] = None
    interview_types: Optional[List[str]] = None
    notes: Optional[str] = None
    recurring: Optional[bool] = None
    recurring_pattern: Optional[Dict[str, Any]] = None


class AvailabilityResponse(AvailabilityBase):
    id: int
    employee_id: int

    class Config:
        from_attributes = True


class AvailabilityList(BaseModel):
    items: List[AvailabilityResponse]
    total: int
    page: int
    page_size: int


class QuestionBase(BaseModel):
    question: str
    answer_guide: Optional[str] = None
    interview_type: str
    category: Optional[str] = None
    difficulty: str = "medium"
    skills: List[str] = Field(default_factory=list)
    time_estimate_minutes: Optional[int] = None
    job_position_id: Optional[int] = None


class QuestionCreate(QuestionBase):
    pass


class QuestionUpdate(BaseModel):
    question: Optional[str] = None
    answer_guide: Optional[str] = None
    interview_type: Optional[str] = None
    category: Optional[str] = None
    difficulty: Optional[str] = None
    skills: Optional[List[str]] = None
    time_estimate_minutes: Optional[int] = None
    job_position_id: Optional[int] = None
    is_active: Optional[bool] = None


class QuestionResponse(QuestionBase):
    id: int
    is_active: bool = True

    class Config:
        from_attributes = True


class QuestionList(BaseModel):
    items: List[QuestionResponse]
    total: int
    page: int
    page_size: int


class ScorecardTemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    interview_type: Optional[str] = None
    criteria: List[Dict[str, Any]] = Field(default_factory=list)
    passing_score: Optional[Decimal] = None


class ScorecardTemplateCreate(ScorecardTemplateBase):
    pass


class ScorecardTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    interview_type: Optional[str] = None
    criteria: Optional[List[Dict[str, Any]]] = None
    passing_score: Optional[Decimal] = None
    is_active: Optional[bool] = None


class ScorecardTemplateResponse(ScorecardTemplateBase):
    id: int
    is_active: bool = True

    class Config:
        from_attributes = True


class ScorecardTemplateList(BaseModel):
    items: List[ScorecardTemplateResponse]
    total: int
    page: int
    page_size: int


class CompetencyBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: str = "technical"
    rating_scale: List[Dict[str, Any]] = Field(default_factory=list)


class CompetencyCreate(CompetencyBase):
    pass


class CompetencyResponse(CompetencyBase):
    id: int
    is_active: bool = True

    class Config:
        from_attributes = True


class CompetencyList(BaseModel):
    items: List[CompetencyResponse]
    total: int
    page: int
    page_size: int


class CompetencyRatingCreate(BaseModel):
    competency_id: int
    rating: int = Field(..., ge=1, le=5)
    notes: Optional[str] = None


class InterviewKitQuestionCreate(BaseModel):
    question: str
    question_type: str = "general"
    purpose: Optional[str] = None
    good_answer_hints: Optional[str] = None
    red_flags: Optional[str] = None
    competency_id: Optional[int] = None
    sequence: int = 0
    time_allocation_minutes: int = 5
    is_required: bool = False


class InterviewKitBase(BaseModel):
    name: str
    description: Optional[str] = None
    job_position_id: Optional[int] = None
    department_id: Optional[int] = None
    interview_type: str = "technical"
    duration_minutes: int = 60
    is_template: bool = False


class InterviewKitCreate(InterviewKitBase):
    competency_ids: List[int] = Field(default_factory=list)
    questions: List[InterviewKitQuestionCreate] = Field(default_factory=list)


class InterviewKitUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    job_position_id: Optional[int] = None
    department_id: Optional[int] = None
    interview_type: Optional[str] = None
    duration_minutes: Optional[int] = None
    is_template: Optional[bool] = None
    is_active: Optional[bool] = None
    competency_ids: Optional[List[int]] = None


class InterviewKitResponse(InterviewKitBase):
    id: int
    created_by_id: Optional[int] = None
    is_active: bool = True

    class Config:
        from_attributes = True


class InterviewKitList(BaseModel):
    items: List[InterviewKitResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Interview List Endpoints (MUST be first)
# =============================================================================

@router.get("/", response_model=InterviewList)
@router.get("/list", response_model=InterviewList)
def list_interviews(
    candidate_id: Optional[int] = None,
    interview_type: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    interviewer_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    service: InterviewService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """List interviews with filters."""
    interviews, total = service.list_interviews(
        company_id=current_user.current_company_id,
        candidate_id=candidate_id,
        interview_type=interview_type,
        status=status,
        start_date=start_date,
        end_date=end_date,
        interviewer_id=interviewer_id,
        skip=skip,
        limit=limit,
    )
    return InterviewList(
        items=interviews,
        total=total,
        page=skip // limit + 1,
        page_size=limit
    )


@router.post("/", response_model=InterviewResponse, status_code=201)
def create_interview(
    data: InterviewCreate,
    service: InterviewService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Create a new interview."""
    return service.create_interview(
        data.model_dump(),
        current_user.current_company_id,
        current_user.id
    )


@router.get("/stats")
@router.get("/stats/", include_in_schema=False)
def get_interview_stats(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    service: InterviewService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Get interview statistics."""
    return service.get_interview_stats(
        company_id=current_user.current_company_id,
        start_date=start_date,
        end_date=end_date
    )


# =============================================================================
# Availability Endpoints
# =============================================================================

@router.get("/availability", response_model=AvailabilityList)
def list_availability(
    employee_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    service: InterviewService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """List interviewer availability slots."""
    slots, total = service.list_availability(
        company_id=current_user.current_company_id,
        employee_id=employee_id,
        start_date=start_date,
        end_date=end_date,
        status=status,
        skip=skip,
        limit=limit,
    )
    return AvailabilityList(
        items=slots,
        total=total,
        page=skip // limit + 1,
        page_size=limit
    )


@router.post("/availability", response_model=AvailabilityResponse, status_code=201)
def create_availability(
    data: AvailabilityCreate,
    employee_id: int,
    service: InterviewService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Create an availability slot."""
    return service.create_availability(
        employee_id=employee_id,
        data=data.model_dump(),
        company_id=current_user.current_company_id
    )


@router.put("/availability/{availability_id}", response_model=AvailabilityResponse)
def update_availability(
    availability_id: int,
    data: AvailabilityUpdate,
    service: InterviewService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Update an availability slot."""
    slot = service.update_availability(
        availability_id=availability_id,
        data=data.model_dump(exclude_unset=True),
        company_id=current_user.current_company_id
    )
    if not slot:
        raise HTTPException(status_code=404, detail="Availability slot not found")
    return slot


@router.delete("/availability/{availability_id}", status_code=204)
def delete_availability(
    availability_id: int,
    service: InterviewService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Delete an availability slot."""
    success = service.delete_availability(
        availability_id=availability_id,
        company_id=current_user.current_company_id
    )
    if not success:
        raise HTTPException(status_code=404, detail="Availability slot not found")
    return None


# =============================================================================
# Question Bank Endpoints
# =============================================================================

@router.get("/questions", response_model=QuestionList)
@router.get("/questions/", response_model=QuestionList, include_in_schema=False)
def list_questions(
    interview_type: Optional[str] = None,
    category: Optional[str] = None,
    difficulty: Optional[str] = None,
    job_position_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    service: InterviewService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """List interview questions."""
    questions, total = service.list_questions(
        company_id=current_user.current_company_id,
        interview_type=interview_type,
        category=category,
        difficulty=difficulty,
        job_position_id=job_position_id,
        skip=skip,
        limit=limit,
    )
    return QuestionList(
        items=questions,
        total=total,
        page=skip // limit + 1,
        page_size=limit
    )


@router.post("/questions", response_model=QuestionResponse, status_code=201)
def create_question(
    data: QuestionCreate,
    service: InterviewService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Create an interview question."""
    return service.create_question(
        data.model_dump(),
        current_user.current_company_id,
        current_user.id
    )


@router.put("/questions/{question_id}", response_model=QuestionResponse)
def update_question(
    question_id: int,
    data: QuestionUpdate,
    service: InterviewService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Update an interview question."""
    question = service.update_question(
        question_id=question_id,
        data=data.model_dump(exclude_unset=True),
        company_id=current_user.current_company_id,
        user_id=current_user.id
    )
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return question


@router.delete("/questions/{question_id}", status_code=204)
def delete_question(
    question_id: int,
    service: InterviewService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Delete an interview question."""
    success = service.delete_question(
        question_id=question_id,
        company_id=current_user.current_company_id,
        user_id=current_user.id
    )
    if not success:
        raise HTTPException(status_code=404, detail="Question not found")
    return None


# =============================================================================
# Scorecard Template Endpoints
# =============================================================================

@router.get("/scorecard-templates", response_model=ScorecardTemplateList)
def list_scorecard_templates(
    interview_type: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    service: InterviewService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """List scorecard templates."""
    templates, total = service.list_scorecard_templates(
        company_id=current_user.current_company_id,
        interview_type=interview_type,
        skip=skip,
        limit=limit,
    )
    return ScorecardTemplateList(
        items=templates,
        total=total,
        page=skip // limit + 1,
        page_size=limit
    )


@router.post("/scorecard-templates", response_model=ScorecardTemplateResponse, status_code=201)
def create_scorecard_template(
    data: ScorecardTemplateCreate,
    service: InterviewService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Create a scorecard template."""
    return service.create_scorecard_template(
        data.model_dump(),
        current_user.current_company_id,
        current_user.id
    )


@router.get("/scorecard-templates/{template_id}", response_model=ScorecardTemplateResponse)
def get_scorecard_template(
    template_id: int,
    service: InterviewService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Get scorecard template by ID."""
    template = service.get_scorecard_template(template_id, current_user.current_company_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.put("/scorecard-templates/{template_id}", response_model=ScorecardTemplateResponse)
def update_scorecard_template(
    template_id: int,
    data: ScorecardTemplateUpdate,
    service: InterviewService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Update a scorecard template."""
    template = service.update_scorecard_template(
        template_id=template_id,
        data=data.model_dump(exclude_unset=True),
        company_id=current_user.current_company_id,
        user_id=current_user.id
    )
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


# =============================================================================
# Competency Endpoints
# =============================================================================

@router.get("/competencies", response_model=CompetencyList)
def list_competencies(
    category: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    service: InterviewService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """List competencies."""
    competencies, total = service.list_competencies(
        company_id=current_user.current_company_id,
        category=category,
        skip=skip,
        limit=limit,
    )
    return CompetencyList(
        items=competencies,
        total=total,
        page=skip // limit + 1,
        page_size=limit
    )


@router.post("/competencies", response_model=CompetencyResponse, status_code=201)
def create_competency(
    data: CompetencyCreate,
    service: InterviewService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Create a competency."""
    return service.create_competency(
        data.model_dump(),
        current_user.current_company_id,
        current_user.id
    )


# =============================================================================
# Interview Kit Endpoints
# =============================================================================

@router.get("/kits", response_model=InterviewKitList)
def list_interview_kits(
    interview_type: Optional[str] = None,
    job_position_id: Optional[int] = None,
    department_id: Optional[int] = None,
    is_template: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    service: InterviewService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """List interview kits."""
    kits, total = service.list_interview_kits(
        company_id=current_user.current_company_id,
        interview_type=interview_type,
        job_position_id=job_position_id,
        department_id=department_id,
        is_template=is_template,
        skip=skip,
        limit=limit,
    )
    return InterviewKitList(
        items=kits,
        total=total,
        page=skip // limit + 1,
        page_size=limit
    )


@router.post("/kits", response_model=InterviewKitResponse, status_code=201)
def create_interview_kit(
    data: InterviewKitCreate,
    service: InterviewService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Create an interview kit."""
    return service.create_interview_kit(
        data.model_dump(),
        current_user.current_company_id,
        current_user.id
    )


@router.get("/kits/{kit_id}", response_model=InterviewKitResponse)
def get_interview_kit(
    kit_id: int,
    service: InterviewService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Get interview kit by ID."""
    kit = service.get_interview_kit(kit_id, current_user.current_company_id)
    if not kit:
        raise HTTPException(status_code=404, detail="Interview kit not found")
    return kit


@router.put("/kits/{kit_id}", response_model=InterviewKitResponse)
def update_interview_kit(
    kit_id: int,
    data: InterviewKitUpdate,
    service: InterviewService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Update an interview kit."""
    kit = service.update_interview_kit(
        kit_id=kit_id,
        data=data.model_dump(exclude_unset=True),
        company_id=current_user.current_company_id,
        user_id=current_user.id
    )
    if not kit:
        raise HTTPException(status_code=404, detail="Interview kit not found")
    return kit


# =============================================================================
# Feedback Endpoints (standalone - MUST be before {interview_id})
# =============================================================================

@router.get("/feedbacks")
@router.get("/feedbacks/", include_in_schema=False)
def list_all_feedbacks(
    interview_id: Optional[int] = None,
    interviewer_id: Optional[int] = None,
    recommendation: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    service: InterviewService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """List all interview feedback with optional filters."""
    from ..models.interview import InterviewFeedback
    query = service.db.query(InterviewFeedback).filter(
        InterviewFeedback.company_id == current_user.current_company_id,
        InterviewFeedback.is_deleted == False,
    )
    if interview_id:
        query = query.filter(InterviewFeedback.interview_id == interview_id)
    if interviewer_id:
        query = query.filter(InterviewFeedback.interviewer_id == interviewer_id)
    if recommendation:
        query = query.filter(InterviewFeedback.recommendation == recommendation)

    total = query.count()
    items = query.order_by(InterviewFeedback.id.desc()).offset(skip).limit(limit).all()

    return {
        "items": [FeedbackResponse.model_validate(item) for item in items],
        "total": total,
        "page": skip // limit + 1 if limit > 0 else 1,
        "page_size": limit,
    }


@router.put("/feedbacks/{feedback_id}", response_model=FeedbackResponse)
def update_feedback(
    feedback_id: int,
    data: FeedbackCreate,
    service: InterviewService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Update an existing feedback."""
    from ..models.interview import InterviewFeedback
    feedback = service.db.query(InterviewFeedback).filter(
        InterviewFeedback.id == feedback_id,
        InterviewFeedback.company_id == current_user.current_company_id,
        InterviewFeedback.is_deleted == False,
    ).first()
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(feedback, field, value)
    service.db.commit()
    service.db.refresh(feedback)
    return FeedbackResponse.model_validate(feedback)


@router.delete("/feedbacks/{feedback_id}", status_code=204)
def delete_feedback(
    feedback_id: int,
    service: InterviewService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Delete a feedback (soft delete)."""
    from ..models.interview import InterviewFeedback
    feedback = service.db.query(InterviewFeedback).filter(
        InterviewFeedback.id == feedback_id,
        InterviewFeedback.company_id == current_user.current_company_id,
        InterviewFeedback.is_deleted == False,
    ).first()
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    feedback.is_deleted = True
    service.db.commit()


# =============================================================================
# Single Interview Endpoints (with {interview_id} - MUST be last)
# =============================================================================

@router.get("/{interview_id}", response_model=InterviewResponse)
def get_interview(
    interview_id: int,
    service: InterviewService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Get interview by ID."""
    interview = service.get_interview(interview_id, current_user.current_company_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    return interview


@router.put("/{interview_id}", response_model=InterviewResponse)
def update_interview(
    interview_id: int,
    data: InterviewUpdate,
    service: InterviewService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Update an interview."""
    interview = service.update_interview(
        interview_id,
        data.model_dump(exclude_unset=True),
        current_user.current_company_id,
        current_user.id
    )
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    return interview


@router.delete("/{interview_id}", status_code=204)
def delete_interview(
    interview_id: int,
    service: InterviewService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Delete an interview."""
    success = service.delete_interview(
        interview_id,
        current_user.current_company_id,
        current_user.id
    )
    if not success:
        raise HTTPException(status_code=404, detail="Interview not found")
    return None


@router.post("/{interview_id}/reschedule", response_model=InterviewResponse)
def reschedule_interview(
    interview_id: int,
    data: RescheduleRequest,
    service: InterviewService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Reschedule an interview."""
    interview = service.reschedule_interview(
        interview_id=interview_id,
        new_date=data.new_date,
        new_time=data.new_time,
        company_id=current_user.current_company_id,
        user_id=current_user.id,
        reason=data.reason
    )
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    return interview


@router.post("/{interview_id}/complete", response_model=InterviewResponse)
def complete_interview(
    interview_id: int,
    data: CompleteInterviewRequest,
    service: InterviewService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Mark interview as completed."""
    interview = service.complete_interview(
        interview_id=interview_id,
        company_id=current_user.current_company_id,
        user_id=current_user.id,
        result=data.result,
        overall_feedback=data.overall_feedback
    )
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    return interview


@router.post("/{interview_id}/cancel", response_model=InterviewResponse)
def cancel_interview(
    interview_id: int,
    data: CancelInterviewRequest,
    service: InterviewService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Cancel an interview."""
    interview = service.cancel_interview(
        interview_id=interview_id,
        company_id=current_user.current_company_id,
        user_id=current_user.id,
        reason=data.reason
    )
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    return interview


@router.get("/{interview_id}/feedback", response_model=List[FeedbackResponse])
def get_interview_feedback(
    interview_id: int,
    service: InterviewService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Get all feedback for an interview."""
    return service.get_interview_feedbacks(interview_id, current_user.current_company_id)


@router.post("/{interview_id}/feedback", response_model=FeedbackResponse, status_code=201)
def add_interview_feedback(
    interview_id: int,
    data: FeedbackCreate,
    service: InterviewService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Add feedback for an interview."""
    # Get employee_id from current user
    from modules.employee.models.employee import Employee
    employee = service.db.query(Employee).filter(
        Employee.user_id == current_user.id,
        Employee.company_id == current_user.current_company_id,
    ).first()

    if not employee:
        raise HTTPException(status_code=400, detail="User is not an employee")

    return service.add_feedback(
        interview_id=interview_id,
        interviewer_id=employee.id,
        data=data.model_dump(),
        company_id=current_user.current_company_id
    )


# =============================================================================
# Competency Rating Endpoints
# =============================================================================

@router.post("/{interview_id}/competency-ratings")
def add_competency_rating(
    interview_id: int,
    candidate_id: int,
    data: CompetencyRatingCreate,
    service: InterviewService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Add a competency rating for a candidate during an interview."""
    # Get employee_id from current user
    from modules.employee.models.employee import Employee
    employee = service.db.query(Employee).filter(
        Employee.user_id == current_user.id,
        Employee.company_id == current_user.current_company_id,
    ).first()

    if not employee:
        raise HTTPException(status_code=400, detail="User is not an employee")

    rating = service.add_competency_rating(
        candidate_id=candidate_id,
        competency_id=data.competency_id,
        interview_id=interview_id,
        rating=data.rating,
        rated_by_id=employee.id,
        notes=data.notes
    )
    return {"id": rating.id, "status": "created"}
