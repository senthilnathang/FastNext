"""
DEI (Diversity, Equity, Inclusion) & Compliance API Routes

CRUD operations for DEI goals, metrics, and EEOC compliance data.
"""

from datetime import date
from typing import Optional, List
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, and_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User

from ..models.advanced import DEIGoal, DEIMetrics, EEOCData
from ..models.recruitment import Candidate, Recruitment
from ..schemas.advanced import (
    DEIGoalCreate,
    DEIGoalUpdate,
    DEIGoalResponse,
    DEIGoalList,
)

router = APIRouter(tags=["Recruitment - DEI"])


# =============================================================================
# DEI Goals
# =============================================================================

@router.get("/goals", response_model=DEIGoalList)
def list_dei_goals(
    goal_type: Optional[str] = None,
    department_id: Optional[int] = None,
    is_active: Optional[bool] = True,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List DEI goals."""
    query = select(DEIGoal).where(
        DEIGoal.company_id == current_user.current_company_id,
        DEIGoal.deleted_at.is_(None),
    )

    if goal_type:
        query = query.where(DEIGoal.goal_type == goal_type)
    if department_id:
        query = query.where(DEIGoal.department_id == department_id)
    if is_active is not None:
        query = query.where(DEIGoal.is_active == is_active)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = db.execute(count_query).scalar() or 0

    # Get items with pagination
    query = query.order_by(DEIGoal.period_start.desc()).offset(skip).limit(limit)
    items = db.execute(query).scalars().all()

    # Calculate progress for each goal
    response_items = []
    for goal in items:
        goal_data = DEIGoalResponse.model_validate(goal)
        if goal.target_percentage and goal.target_percentage > 0:
            goal_data.progress_percentage = float(
                (goal.current_percentage / goal.target_percentage) * 100
            ) if goal.current_percentage else 0.0
        response_items.append(goal_data)

    return DEIGoalList(
        items=response_items,
        total=total,
        page=skip // limit + 1,
        page_size=limit,
    )


@router.get("/goals/{goal_id}", response_model=DEIGoalResponse)
def get_dei_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a DEI goal by ID."""
    goal = db.execute(
        select(DEIGoal).where(
            DEIGoal.id == goal_id,
            DEIGoal.company_id == current_user.current_company_id,
            DEIGoal.deleted_at.is_(None),
        )
    ).scalar_one_or_none()

    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="DEI goal not found"
        )

    response = DEIGoalResponse.model_validate(goal)
    if goal.target_percentage and goal.target_percentage > 0:
        response.progress_percentage = float(
            (goal.current_percentage / goal.target_percentage) * 100
        ) if goal.current_percentage else 0.0

    return response


@router.post("/goals", response_model=DEIGoalResponse, status_code=status.HTTP_201_CREATED)
def create_dei_goal(
    data: DEIGoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new DEI goal."""
    goal = DEIGoal(
        **data.model_dump(),
        company_id=current_user.current_company_id,
        created_by_id=current_user.id,
        current_percentage=Decimal("0"),
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)

    return DEIGoalResponse.model_validate(goal)


@router.put("/goals/{goal_id}", response_model=DEIGoalResponse)
def update_dei_goal(
    goal_id: int,
    data: DEIGoalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a DEI goal."""
    goal = db.execute(
        select(DEIGoal).where(
            DEIGoal.id == goal_id,
            DEIGoal.company_id == current_user.current_company_id,
            DEIGoal.deleted_at.is_(None),
        )
    ).scalar_one_or_none()

    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="DEI goal not found"
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(goal, field, value)

    goal.updated_by_id = current_user.id
    db.commit()
    db.refresh(goal)

    response = DEIGoalResponse.model_validate(goal)
    if goal.target_percentage and goal.target_percentage > 0:
        response.progress_percentage = float(
            (goal.current_percentage / goal.target_percentage) * 100
        ) if goal.current_percentage else 0.0

    return response


@router.delete("/goals/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_dei_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a DEI goal (soft delete)."""
    goal = db.execute(
        select(DEIGoal).where(
            DEIGoal.id == goal_id,
            DEIGoal.company_id == current_user.current_company_id,
            DEIGoal.deleted_at.is_(None),
        )
    ).scalar_one_or_none()

    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="DEI goal not found"
        )

    from datetime import datetime
    goal.deleted_at = datetime.utcnow()
    goal.deleted_by_id = current_user.id
    db.commit()


# =============================================================================
# DEI Metrics & Dashboard
# =============================================================================

@router.get("/metrics")
def get_dei_metrics(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    department_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get DEI metrics and statistics."""
    company_id = current_user.current_company_id

    # Build base query for candidates
    candidate_query = select(Candidate).where(
        Candidate.company_id == company_id,
        Candidate.deleted_at.is_(None),
    )

    if date_from:
        candidate_query = candidate_query.where(Candidate.created_at >= date_from)
    if date_to:
        candidate_query = candidate_query.where(Candidate.created_at <= date_to)

    # Get all candidates
    candidates = db.execute(candidate_query).scalars().all()

    # Calculate gender distribution
    gender_counts = {"male": 0, "female": 0, "other": 0, "not_specified": 0}
    hired_gender_counts = {"male": 0, "female": 0, "other": 0, "not_specified": 0}

    for candidate in candidates:
        gender = candidate.gender or "not_specified"
        if gender in gender_counts:
            gender_counts[gender] += 1
            if candidate.hired:
                hired_gender_counts[gender] += 1
        else:
            gender_counts["not_specified"] += 1
            if candidate.hired:
                hired_gender_counts["not_specified"] += 1

    total_candidates = len(candidates)
    total_hired = sum(1 for c in candidates if c.hired)

    # Calculate percentages
    gender_percentages = {}
    hired_gender_percentages = {}
    for gender, count in gender_counts.items():
        gender_percentages[gender] = round(count / total_candidates * 100, 2) if total_candidates > 0 else 0
    for gender, count in hired_gender_counts.items():
        hired_gender_percentages[gender] = round(count / total_hired * 100, 2) if total_hired > 0 else 0

    return {
        "period": {
            "from": date_from.isoformat() if date_from else None,
            "to": date_to.isoformat() if date_to else None,
        },
        "summary": {
            "total_candidates": total_candidates,
            "total_hired": total_hired,
            "hire_rate": round(total_hired / total_candidates * 100, 2) if total_candidates > 0 else 0,
        },
        "gender_distribution": {
            "candidates": gender_counts,
            "candidates_percentage": gender_percentages,
            "hired": hired_gender_counts,
            "hired_percentage": hired_gender_percentages,
        },
        "goals_progress": [],  # Would be populated from DEIGoal model
    }


@router.get("/dashboard")
def get_dei_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get complete DEI dashboard data."""
    company_id = current_user.current_company_id
    today = date.today()

    # Get active DEI goals
    goals_query = select(DEIGoal).where(
        DEIGoal.company_id == company_id,
        DEIGoal.deleted_at.is_(None),
        DEIGoal.is_active == True,
        DEIGoal.period_end >= today,
    )
    goals = db.execute(goals_query).scalars().all()

    goals_summary = []
    for goal in goals:
        progress = 0.0
        if goal.target_percentage and goal.target_percentage > 0 and goal.current_percentage:
            progress = float((goal.current_percentage / goal.target_percentage) * 100)

        goals_summary.append({
            "id": goal.id,
            "name": goal.name,
            "goal_type": goal.goal_type,
            "target_percentage": float(goal.target_percentage) if goal.target_percentage else 0,
            "current_percentage": float(goal.current_percentage) if goal.current_percentage else 0,
            "progress": progress,
            "period_end": goal.period_end.isoformat() if goal.period_end else None,
            "status": "on_track" if progress >= 75 else "at_risk" if progress >= 50 else "behind",
        })

    # Get candidate pipeline demographics
    candidates = db.execute(
        select(Candidate).where(
            Candidate.company_id == company_id,
            Candidate.deleted_at.is_(None),
            Candidate.canceled == False,
        )
    ).scalars().all()

    pipeline_demographics = {
        "total": len(candidates),
        "by_gender": {},
        "by_stage": {},
    }

    for candidate in candidates:
        # Gender breakdown
        gender = candidate.gender or "not_specified"
        pipeline_demographics["by_gender"][gender] = pipeline_demographics["by_gender"].get(gender, 0) + 1

    return {
        "goals": goals_summary,
        "pipeline_demographics": pipeline_demographics,
        "recommendations": [
            "Consider expanding sourcing channels for underrepresented groups",
            "Review job descriptions for inclusive language",
            "Implement blind resume screening",
        ],
    }


# =============================================================================
# EEOC Data (linked via Candidate)
# =============================================================================

@router.get("/eeoc")
def get_eeoc_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get aggregated EEOC compliance data.

    EEOC data is collected per-candidate and aggregated here for reporting.
    """
    company_id = current_user.current_company_id

    # Query EEOC data via candidates that belong to this company
    query = (
        select(EEOCData)
        .join(Candidate, EEOCData.candidate_id == Candidate.id)
        .where(
            Candidate.company_id == company_id,
            Candidate.deleted_at.is_(None),
        )
    )

    eeoc_records = db.execute(query).scalars().all()

    # Aggregate by categories
    gender_breakdown = {}
    ethnicity_breakdown = {}
    veteran_breakdown = {}
    disability_breakdown = {}

    for record in eeoc_records:
        if record.gender:
            gender_breakdown[record.gender] = gender_breakdown.get(record.gender, 0) + 1
        if record.ethnicity:
            ethnicity_breakdown[record.ethnicity] = ethnicity_breakdown.get(record.ethnicity, 0) + 1
        if record.veteran_status:
            veteran_breakdown[record.veteran_status] = veteran_breakdown.get(record.veteran_status, 0) + 1
        if record.disability_status:
            disability_breakdown[record.disability_status] = disability_breakdown.get(record.disability_status, 0) + 1

    return {
        "total_responses": len(eeoc_records),
        "gender_breakdown": gender_breakdown,
        "ethnicity_breakdown": ethnicity_breakdown,
        "veteran_breakdown": veteran_breakdown,
        "disability_breakdown": disability_breakdown,
        "voluntary_responses": sum(1 for r in eeoc_records if r.is_voluntary),
    }


@router.get("/eeoc/{candidate_id}")
def get_candidate_eeoc_data(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get EEOC data for a specific candidate."""
    company_id = current_user.current_company_id

    # Verify candidate belongs to company
    candidate = db.execute(
        select(Candidate).where(
            Candidate.id == candidate_id,
            Candidate.company_id == company_id,
            Candidate.deleted_at.is_(None),
        )
    ).scalar_one_or_none()

    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found"
        )

    eeoc_data = db.execute(
        select(EEOCData).where(EEOCData.candidate_id == candidate_id)
    ).scalar_one_or_none()

    if not eeoc_data:
        return {
            "candidate_id": candidate_id,
            "has_data": False,
            "message": "No EEOC data submitted for this candidate"
        }

    return {
        "candidate_id": candidate_id,
        "has_data": True,
        "gender": eeoc_data.gender,
        "ethnicity": eeoc_data.ethnicity,
        "veteran_status": eeoc_data.veteran_status,
        "disability_status": eeoc_data.disability_status,
        "is_voluntary": eeoc_data.is_voluntary,
        "collected_at": eeoc_data.collected_at.isoformat() if eeoc_data.collected_at else None,
    }


@router.post("/eeoc/{candidate_id}")
def submit_candidate_eeoc_data(
    candidate_id: int,
    gender: Optional[str] = None,
    ethnicity: Optional[str] = None,
    veteran_status: Optional[str] = None,
    disability_status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Submit EEOC compliance data for a candidate.

    This endpoint can be public - candidates can self-report demographic information.
    """
    from datetime import datetime

    # Verify candidate exists
    candidate = db.execute(
        select(Candidate).where(
            Candidate.id == candidate_id,
            Candidate.deleted_at.is_(None),
        )
    ).scalar_one_or_none()

    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found"
        )

    # Check if EEOC data already exists
    existing = db.execute(
        select(EEOCData).where(EEOCData.candidate_id == candidate_id)
    ).scalar_one_or_none()

    if existing:
        # Update existing record
        if gender is not None:
            existing.gender = gender
        if ethnicity is not None:
            existing.ethnicity = ethnicity
        if veteran_status is not None:
            existing.veteran_status = veteran_status
        if disability_status is not None:
            existing.disability_status = disability_status
        existing.collected_at = datetime.utcnow()
        db.commit()

        return {
            "id": existing.id,
            "candidate_id": candidate_id,
            "message": "EEOC data updated successfully",
        }

    # Create new record
    eeoc_data = EEOCData(
        candidate_id=candidate_id,
        gender=gender,
        ethnicity=ethnicity,
        veteran_status=veteran_status,
        disability_status=disability_status,
        is_voluntary=True,
        collected_at=datetime.utcnow(),
    )
    db.add(eeoc_data)
    db.commit()
    db.refresh(eeoc_data)

    return {
        "id": eeoc_data.id,
        "candidate_id": candidate_id,
        "message": "EEOC data submitted successfully",
    }
