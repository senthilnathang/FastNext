"""
Recruitment API Routes

CRUD operations for recruitment management.
"""

from datetime import date, datetime
from typing import Optional, List
import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Form, UploadFile, File
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User

from ..services.recruitment_service import RecruitmentService
from ..models.recruitment import (
    Recruitment,
    RecruitmentStatus, StageType, CandidateSource,
    OfferStatus, InterviewStatus
)
from ..schemas.recruitment import (
    SkillCreate, SkillUpdate, SkillResponse,
    RecruitmentCreate, RecruitmentUpdate, RecruitmentResponse, RecruitmentList,
    StageCreate, StageUpdate, StageResponse,
    CandidateCreate, CandidateUpdate, CandidateResponse, CandidateList,
    CandidateRatingCreate, CandidateRatingResponse, CandidateMoveStage,
    InterviewCreate, InterviewUpdate, InterviewResponse, InterviewList,
    InterviewFeedbackCreate, InterviewFeedbackResponse,
    OfferLetterCreate, OfferLetterUpdate, OfferLetterResponse, OfferLetterList,
)
from ..schemas.survey import (
    CandidateQuizAttemptCreate, CandidateQuizAttemptUpdate, CandidateQuizAttemptResponse,
    CandidateQuizAttemptList, RecruitmentQuizAssign, RecruitmentQuizUnassign,
    RecruitmentQuizResponse, RecruitmentQuizList, BulkInviteCandidatesToQuiz,
    BulkQuizInviteResult, CandidateQuizSummary, RecruitmentQuizSummary,
)

router = APIRouter(tags=["Recruitment"])


def get_service(db: Session = Depends(get_db)) -> RecruitmentService:
    return RecruitmentService(db)


# =============================================================================
# Public Endpoints (No Authentication Required)
# =============================================================================

def _format_salary_display(job) -> Optional[str]:
    """Build human-readable salary string."""
    if job.hide_salary:
        return None
    s_min = float(job.salary_min) if job.salary_min else None
    s_max = float(job.salary_max) if job.salary_max else None
    if not s_min and not s_max:
        return None
    symbol = "$" if (job.salary_currency or "USD") == "USD" else (job.salary_currency or "")
    period_map = {"yearly": "/yr", "monthly": "/mo", "hourly": "/hr", "weekly": "/wk", "daily": "/day"}
    period = period_map.get(job.salary_period or "", "")

    def _fmt(n):
        if n >= 1000:
            return f"{n / 1000:.0f}K"
        return str(int(n))

    if s_min and s_max:
        return f"{symbol}{_fmt(s_min)} – {symbol}{_fmt(s_max)}{period}"
    if s_min:
        return f"From {symbol}{_fmt(s_min)}{period}"
    if s_max:
        return f"Up to {symbol}{_fmt(s_max)}{period}"
    return None


def _format_experience_display(job) -> Optional[str]:
    """Build human-readable experience string."""
    level_labels = {
        "entry": "Entry Level", "junior": "Junior", "mid": "Mid Level",
        "senior": "Senior", "lead": "Lead", "executive": "Executive",
    }
    parts = []
    if job.experience_min is not None or job.experience_max is not None:
        lo = job.experience_min or 0
        hi = job.experience_max
        if hi:
            parts.append(f"{lo}–{hi} years")
        else:
            parts.append(f"{lo}+ years")
    if job.experience_level and job.experience_level in level_labels:
        parts.append(level_labels[job.experience_level])
    return " · ".join(parts) if parts else None


def _serialize_job_item(job, include_salary=True):
    """Serialize a Recruitment row into a public job dict."""
    item = {
        "id": job.id,
        "title": job.title,
        "description": job.description,
        "location": job.location,
        "is_remote": job.is_remote,
        "employment_type": job.employment_type,
        "experience_min": job.experience_min,
        "experience_max": job.experience_max,
        "experience_level": job.experience_level,
        "education_level": job.education_level,
        "vacancy": job.vacancy,
        "is_featured": job.is_featured,
        "is_urgent": job.is_urgent,
        "benefits": job.benefits or [],
        "skills": [s.title for s in (job.skills or [])],
        "created_at": str(job.created_at) if job.created_at else None,
        "view_count": job.view_count or 0,
        "salary_display": _format_salary_display(job),
        "experience_display": _format_experience_display(job),
    }
    if include_salary and not job.hide_salary:
        item["salary_min"] = float(job.salary_min) if job.salary_min else None
        item["salary_max"] = float(job.salary_max) if job.salary_max else None
        item["salary_currency"] = job.salary_currency
        item["salary_period"] = job.salary_period
        item["hide_salary"] = False
    else:
        item["hide_salary"] = True
    return item


def _base_public_query(db: Session):
    """Base query for published, open, active, non-deleted jobs."""
    return db.query(Recruitment).filter(
        Recruitment.is_published == True,
        Recruitment.closed == False,
        Recruitment.is_active == True,
        Recruitment.is_deleted == False,
    )


@router.get("/public/jobs")
@router.get("/public/jobs/", include_in_schema=False)
def list_public_jobs(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    search: Optional[str] = None,
    location: Optional[str] = None,
    employment_type: Optional[str] = None,
    experience_level: Optional[str] = None,
    is_remote: Optional[bool] = None,
    sort: Optional[str] = Query("newest"),
    db: Session = Depends(get_db),
):
    """Public endpoint to list published job openings. No authentication required."""
    from sqlalchemy import or_, func, distinct

    query = _base_public_query(db)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Recruitment.title.ilike(search_term),
                Recruitment.description.ilike(search_term),
                Recruitment.location.ilike(search_term),
            )
        )
    if location:
        query = query.filter(Recruitment.location.ilike(f"%{location}%"))
    if employment_type:
        query = query.filter(Recruitment.employment_type == employment_type)
    if experience_level:
        query = query.filter(Recruitment.experience_level == experience_level)
    if is_remote is not None:
        query = query.filter(Recruitment.is_remote == is_remote)

    total = query.count()

    # Sorting
    sort_map = {
        "newest": [Recruitment.is_featured.desc(), Recruitment.created_at.desc()],
        "oldest": [Recruitment.is_featured.desc(), Recruitment.created_at.asc()],
        "salary_high": [Recruitment.salary_max.desc().nullslast(), Recruitment.created_at.desc()],
        "salary_low": [Recruitment.salary_min.asc().nullslast(), Recruitment.created_at.desc()],
        "popular": [Recruitment.view_count.desc().nullslast(), Recruitment.created_at.desc()],
    }
    order_clauses = sort_map.get(sort, sort_map["newest"])
    query = query.order_by(*order_clauses)

    offset = (page - 1) * page_size
    jobs = query.offset(offset).limit(page_size).all()

    results = [_serialize_job_item(job) for job in jobs]

    # Build available filters from ALL published jobs (not just filtered ones)
    all_q = _base_public_query(db)
    employment_types = [
        r[0] for r in all_q.with_entities(distinct(Recruitment.employment_type))
        .filter(Recruitment.employment_type.isnot(None)).all() if r[0]
    ]
    experience_levels = [
        r[0] for r in all_q.with_entities(distinct(Recruitment.experience_level))
        .filter(Recruitment.experience_level.isnot(None)).all() if r[0]
    ]
    locations = [
        r[0] for r in all_q.with_entities(distinct(Recruitment.location))
        .filter(Recruitment.location.isnot(None)).all() if r[0]
    ]

    return {
        "results": results,
        "count": total,
        "filters": {
            "employment_types": sorted(employment_types),
            "experience_levels": experience_levels,
            "locations": sorted(locations),
        },
        "sort_options": [
            {"value": "newest", "label": "Newest First"},
            {"value": "oldest", "label": "Oldest First"},
            {"value": "salary_high", "label": "Highest Salary"},
            {"value": "salary_low", "label": "Lowest Salary"},
            {"value": "popular", "label": "Most Popular"},
        ],
    }


@router.get("/public/jobs/{job_id}")
@router.get("/public/jobs/{job_id}/", include_in_schema=False)
def get_public_job(
    job_id: int,
    db: Session = Depends(get_db),
):
    """Public endpoint to get a single job opening detail. No authentication required."""
    job = _base_public_query(db).filter(Recruitment.id == job_id).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Increment view count
    job.view_count = (job.view_count or 0) + 1
    db.commit()

    result = _serialize_job_item(job)
    result["start_date"] = str(job.start_date) if job.start_date else None
    result["end_date"] = str(job.end_date) if job.end_date else None

    return result


@router.get("/public/jobs/{job_id}/similar")
@router.get("/public/jobs/{job_id}/similar/", include_in_schema=False)
def get_similar_jobs(
    job_id: int,
    db: Session = Depends(get_db),
):
    """Public endpoint to get similar job openings. No authentication required."""
    from sqlalchemy import or_

    job = _base_public_query(db).filter(Recruitment.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    similar_query = _base_public_query(db).filter(Recruitment.id != job_id)

    # Match by employment_type or location
    conditions = []
    if job.employment_type:
        conditions.append(Recruitment.employment_type == job.employment_type)
    if job.location:
        conditions.append(Recruitment.location == job.location)

    if conditions:
        similar_query = similar_query.filter(or_(*conditions))

    similar_jobs = similar_query.order_by(
        Recruitment.is_featured.desc(), Recruitment.created_at.desc()
    ).limit(3).all()

    return {"results": [_serialize_job_item(j) for j in similar_jobs]}


@router.post("/public/jobs/{job_id}/apply")
@router.post("/public/jobs/{job_id}/apply/", include_in_schema=False)
async def apply_to_job(
    job_id: int,
    name: str = Form(...),
    email: str = Form(...),
    mobile: Optional[str] = Form(None),
    gender: Optional[str] = Form("male"),
    portfolio: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    city: Optional[str] = Form(None),
    state: Optional[str] = Form(None),
    country: Optional[str] = Form(None),
    zip: Optional[str] = Form(None),
    resume: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    """Public endpoint to submit a job application. No authentication required."""
    from ..models.recruitment import Candidate, RecruitmentStage

    job = _base_public_query(db).filter(Recruitment.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or no longer accepting applications")

    # Check duplicate application
    existing = db.query(Candidate).filter(
        Candidate.email == email,
        Candidate.recruitment_id == job_id,
        Candidate.is_deleted == False,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already applied for this position")

    # Find the applied stage or first stage
    applied_stage = db.query(RecruitmentStage).filter(
        RecruitmentStage.recruitment_id == job_id,
        RecruitmentStage.stage_type == "applied",
        RecruitmentStage.is_deleted == False,
    ).first()
    if not applied_stage:
        applied_stage = db.query(RecruitmentStage).filter(
            RecruitmentStage.recruitment_id == job_id,
            RecruitmentStage.is_deleted == False,
        ).order_by(RecruitmentStage.sequence).first()

    # Handle resume upload
    resume_path = None
    if resume:
        allowed_types = [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ]
        if resume.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Resume must be a PDF or Word document")

        content = await resume.read()
        if len(content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Resume must be smaller than 5MB")

        upload_dir = os.path.join("uploads", "resumes")
        os.makedirs(upload_dir, exist_ok=True)
        ext = os.path.splitext(resume.filename or "resume.pdf")[1]
        filename = f"{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(upload_dir, filename)
        with open(filepath, "wb") as f:
            f.write(content)
        resume_path = filepath

    candidate = Candidate(
        name=name,
        email=email,
        mobile=mobile,
        gender=gender,
        portfolio=portfolio,
        address=address,
        city=city,
        state=state,
        country=country,
        zip=zip,
        resume=resume_path,
        recruitment_id=job_id,
        job_position_id=job.job_position_id,
        stage_id=applied_stage.id if applied_stage else None,
        source="application",
        company_id=job.company_id,
        is_active=True,
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)

    return {"application_id": candidate.id, "message": "Application submitted successfully"}


# =============================================================================
# Skill Endpoints
# =============================================================================

@router.get("/skills", response_model=List[SkillResponse])
def list_skills(
    category: Optional[str] = None,
    service: RecruitmentService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """List skills."""
    return service.list_skills(current_user.current_company_id, category)


@router.post("/skills", response_model=SkillResponse, status_code=201)
def create_skill(
    data: SkillCreate,
    service: RecruitmentService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Create a skill."""
    return service.create_skill(data, current_user.current_company_id, current_user.id)


# =============================================================================
# Quiz Integration Endpoints (Screening Questionnaires)
# =============================================================================

@router.get("/jobs/{recruitment_id}/quizzes", response_model=RecruitmentQuizList)
def list_recruitment_quizzes(
    recruitment_id: int,
    service: RecruitmentService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """List quizzes assigned to a recruitment for screening candidates."""
    return service.list_recruitment_quizzes(recruitment_id, current_user.current_company_id)


@router.post("/jobs/{recruitment_id}/quizzes", response_model=RecruitmentQuizList)
def assign_quizzes_to_recruitment(
    recruitment_id: int,
    data: RecruitmentQuizAssign,
    service: RecruitmentService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Assign screening quizzes to a recruitment."""
    return service.assign_quizzes_to_recruitment(
        recruitment_id, data.quiz_ids, current_user.current_company_id
    )


@router.delete("/jobs/{recruitment_id}/quizzes")
def unassign_quizzes_from_recruitment(
    recruitment_id: int,
    data: RecruitmentQuizUnassign,
    service: RecruitmentService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Remove screening quizzes from a recruitment."""
    service.unassign_quizzes_from_recruitment(
        recruitment_id, data.quiz_ids, current_user.current_company_id
    )
    return {"message": "Quizzes unassigned successfully"}


@router.post("/candidates/{candidate_id}/quiz-invites", response_model=CandidateQuizAttemptResponse, status_code=201)
def invite_candidate_to_quiz(
    candidate_id: int,
    data: CandidateQuizAttemptCreate,
    service: RecruitmentService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Invite a candidate to take a screening quiz."""
    return service.invite_candidate_to_quiz(
        candidate_id, data, current_user.current_company_id, current_user.id
    )


@router.get("/candidates/{candidate_id}/quiz-attempts", response_model=CandidateQuizAttemptList)
def list_candidate_quiz_attempts(
    candidate_id: int,
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    service: RecruitmentService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """List a candidate's quiz attempts."""
    attempts, total = service.list_candidate_quiz_attempts(
        candidate_id, current_user.current_company_id, status, skip, limit
    )
    return CandidateQuizAttemptList(items=attempts, total=total, page=skip // limit + 1, page_size=limit)


@router.get("/candidates/{candidate_id}/quiz-summary", response_model=CandidateQuizSummary)
def get_candidate_quiz_summary(
    candidate_id: int,
    service: RecruitmentService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Get summary of a candidate's quiz performance."""
    return service.get_candidate_quiz_summary(candidate_id, current_user.current_company_id)


@router.post("/quiz-invites/bulk", response_model=BulkQuizInviteResult)
def bulk_invite_candidates_to_quiz(
    data: BulkInviteCandidatesToQuiz,
    service: RecruitmentService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Bulk invite multiple candidates to take a quiz."""
    return service.bulk_invite_candidates_to_quiz(
        data, current_user.current_company_id, current_user.id
    )


@router.get("/jobs/{recruitment_id}/quiz-summary", response_model=RecruitmentQuizSummary)
def get_recruitment_quiz_summary(
    recruitment_id: int,
    service: RecruitmentService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Get summary of quiz results for a recruitment."""
    return service.get_recruitment_quiz_summary(recruitment_id, current_user.current_company_id)


# =============================================================================
# Recruitment Endpoints
# =============================================================================

@router.get("/", response_model=RecruitmentList)
@router.get("/list", response_model=RecruitmentList)
@router.get("/jobs", response_model=RecruitmentList)
def list_recruitments(
    status: Optional[RecruitmentStatus] = None,
    department_id: Optional[int] = None,
    is_published: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    service: RecruitmentService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """List job openings."""
    recruitments, total = service.list_recruitments(
        company_id=current_user.current_company_id,
        status=status,
        department_id=department_id,
        is_published=is_published,
        skip=skip,
        limit=limit,
    )
    return RecruitmentList(items=recruitments, total=total, page=skip // limit + 1, page_size=limit)


@router.get("/jobs/{recruitment_id}", response_model=RecruitmentResponse)
def get_recruitment(
    recruitment_id: int,
    service: RecruitmentService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Get job opening by ID."""
    recruitment = service.get_recruitment(recruitment_id, current_user.current_company_id)
    if not recruitment:
        raise HTTPException(status_code=404, detail="Job opening not found")
    return recruitment


@router.post("/jobs", response_model=RecruitmentResponse, status_code=201)
def create_recruitment(
    data: RecruitmentCreate,
    service: RecruitmentService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Create a job opening."""
    return service.create_recruitment(data, current_user.current_company_id, current_user.id)


@router.put("/jobs/{recruitment_id}", response_model=RecruitmentResponse)
def update_recruitment(
    recruitment_id: int,
    data: RecruitmentUpdate,
    service: RecruitmentService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Update a job opening."""
    recruitment = service.update_recruitment(
        recruitment_id, data, current_user.current_company_id, current_user.id
    )
    if not recruitment:
        raise HTTPException(status_code=404, detail="Job opening not found")
    return recruitment


@router.post("/jobs/{recruitment_id}/publish", response_model=RecruitmentResponse)
def publish_recruitment(
    recruitment_id: int,
    service: RecruitmentService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Publish a job opening."""
    recruitment = service.publish_recruitment(
        recruitment_id, current_user.current_company_id, current_user.id
    )
    if not recruitment:
        raise HTTPException(status_code=404, detail="Job opening not found")
    return recruitment


@router.post("/jobs/{recruitment_id}/close", response_model=RecruitmentResponse)
def close_recruitment(
    recruitment_id: int,
    service: RecruitmentService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Close a job opening."""
    recruitment = service.close_recruitment(
        recruitment_id, current_user.current_company_id, current_user.id
    )
    if not recruitment:
        raise HTTPException(status_code=404, detail="Job opening not found")
    return recruitment


# =============================================================================
# Stage Endpoints
# =============================================================================

@router.get("/stages/", response_model=None)
@router.get("/stages", response_model=None, include_in_schema=False)
def list_all_stages(
    recruitment_id: Optional[int] = None,
    page_size: int = Query(100, ge=1, le=500),
    service: RecruitmentService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """List all stages, optionally filtered by job opening."""
    company_id = current_user.current_company_id
    if recruitment_id:
        stages = service.list_stages(recruitment_id, company_id)
    else:
        from ..models.recruitment import RecruitmentStage
        stages = service.db.query(RecruitmentStage).filter(
            RecruitmentStage.company_id == company_id,
            RecruitmentStage.is_deleted == False,
        ).order_by(RecruitmentStage.sequence).limit(page_size).all()
    return {"items": [StageResponse.model_validate(s) for s in stages], "total": len(stages)}


@router.get("/jobs/{recruitment_id}/stages", response_model=List[StageResponse])
def list_stages(
    recruitment_id: int,
    service: RecruitmentService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """List stages for a job opening."""
    return service.list_stages(recruitment_id, current_user.current_company_id)


@router.post("/jobs/{recruitment_id}/stages", response_model=StageResponse, status_code=201)
def create_stage(
    recruitment_id: int,
    data: StageCreate,
    service: RecruitmentService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Create a stage."""
    data.recruitment_id = recruitment_id
    return service.create_stage(data, current_user.current_company_id, current_user.id)


@router.put("/stages/{stage_id}", response_model=StageResponse)
def update_stage(
    stage_id: int,
    data: StageUpdate,
    service: RecruitmentService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Update a stage."""
    stage = service.update_stage(
        stage_id, data, current_user.current_company_id, current_user.id
    )
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")
    return stage


# =============================================================================
# Candidate Endpoints (CRUD handled by candidate sub-router at /candidates prefix)
# Only quiz-related candidate endpoints remain here (unique to recruitment.py)
# =============================================================================


# =============================================================================
# Pipeline Endpoint
# =============================================================================


# =============================================================================
# Pipeline Endpoint
# =============================================================================

@router.get("/jobs/{recruitment_id}/pipeline")
def get_pipeline(
    recruitment_id: int,
    service: RecruitmentService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Get pipeline view for a job opening."""
    pipeline = service.get_pipeline(recruitment_id, current_user.current_company_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Job opening not found")
    return pipeline


# =============================================================================
# Report Endpoints
# =============================================================================

@router.get("/reports/hiring")
def get_hiring_report(
    start_date: date = Query(...),
    end_date: date = Query(...),
    service: RecruitmentService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Get hiring statistics report."""
    return service.get_hiring_stats(current_user.current_company_id, start_date, end_date)
