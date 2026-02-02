"""
Recruitment Analytics API Routes

Analytics, metrics, and reporting endpoints for recruitment pipeline performance.
"""

from datetime import date, timedelta
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, and_, extract
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User

from ..models.recruitment import Recruitment, Candidate, RecruitmentStage
from ..models.advanced import (
    PipelineMetrics, HiringGoal, StageAnalytics,
    CandidateSourceChannel, CandidateSourceStats
)
from ..schemas.advanced import (
    PipelineMetricsResponse,
    PipelineMetricsList,
    HiringGoalCreate,
    HiringGoalUpdate,
    HiringGoalResponse,
    HiringGoalList,
)

router = APIRouter(tags=["Recruitment - Analytics"])


# =============================================================================
# Pipeline Overview
# =============================================================================

@router.get("/pipeline/overview")
def get_pipeline_overview(
    recruitment_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get pipeline overview with key metrics."""
    company_id = current_user.current_company_id

    # Default date range: last 30 days
    if not date_to:
        date_to = date.today()
    if not date_from:
        date_from = date_to - timedelta(days=30)

    # Base candidate query
    candidate_query = select(Candidate).where(
        Candidate.company_id == company_id,
        Candidate.deleted_at.is_(None),
        Candidate.created_at >= date_from,
        Candidate.created_at <= date_to,
    )

    if recruitment_id:
        candidate_query = candidate_query.where(Candidate.recruitment_id == recruitment_id)

    candidates = db.execute(candidate_query).scalars().all()

    # Calculate metrics
    total_candidates = len(candidates)
    hired_candidates = sum(1 for c in candidates if c.hired)
    rejected_candidates = sum(1 for c in candidates if c.canceled)
    active_candidates = total_candidates - hired_candidates - rejected_candidates

    # Stage distribution
    stage_distribution = {}
    for candidate in candidates:
        stage_name = candidate.stage.name if candidate.stage else "Unknown"
        stage_distribution[stage_name] = stage_distribution.get(stage_name, 0) + 1

    # Source distribution
    source_distribution = {}
    for candidate in candidates:
        source = candidate.source or "Direct"
        source_distribution[source] = source_distribution.get(source, 0) + 1

    # Calculate time to hire for hired candidates
    time_to_hire_days = []
    for candidate in candidates:
        if candidate.hired and candidate.joining_date and candidate.created_at:
            days = (candidate.joining_date - candidate.created_at.date()).days
            if days > 0:
                time_to_hire_days.append(days)

    avg_time_to_hire = sum(time_to_hire_days) / len(time_to_hire_days) if time_to_hire_days else None

    return {
        "period": {
            "from": date_from.isoformat(),
            "to": date_to.isoformat(),
        },
        "summary": {
            "total_candidates": total_candidates,
            "active_candidates": active_candidates,
            "hired_candidates": hired_candidates,
            "rejected_candidates": rejected_candidates,
            "hire_rate": round(hired_candidates / total_candidates * 100, 2) if total_candidates > 0 else 0,
        },
        "time_metrics": {
            "avg_time_to_hire_days": round(avg_time_to_hire, 1) if avg_time_to_hire else None,
        },
        "stage_distribution": stage_distribution,
        "source_distribution": source_distribution,
    }


@router.get("/pipeline/funnel")
def get_pipeline_funnel(
    recruitment_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get funnel conversion metrics for the recruitment pipeline."""
    company_id = current_user.current_company_id

    if not date_to:
        date_to = date.today()
    if not date_from:
        date_from = date_to - timedelta(days=90)

    # Get all stages ordered by sequence
    stage_query = select(RecruitmentStage).where(
        RecruitmentStage.company_id == company_id,
        RecruitmentStage.deleted_at.is_(None),
    )

    if recruitment_id:
        stage_query = stage_query.where(RecruitmentStage.recruitment_id == recruitment_id)

    stage_query = stage_query.order_by(RecruitmentStage.sequence)
    stages = db.execute(stage_query).scalars().all()

    # Get candidates
    candidate_query = select(Candidate).where(
        Candidate.company_id == company_id,
        Candidate.deleted_at.is_(None),
        Candidate.created_at >= date_from,
        Candidate.created_at <= date_to,
    )

    if recruitment_id:
        candidate_query = candidate_query.where(Candidate.recruitment_id == recruitment_id)

    candidates = db.execute(candidate_query).scalars().all()

    # Calculate stage progression - count candidates that reached each stage
    funnel_data = []
    total = len(candidates)

    for stage in stages:
        # Count candidates currently in this stage or who passed through it
        # Simplified: count by current stage (in production, you'd track stage history)
        count = sum(1 for c in candidates if c.stage_id == stage.id)

        funnel_data.append({
            "stage_id": stage.id,
            "stage_name": stage.name,
            "candidate_count": count,
            "percentage_of_total": round(count / total * 100, 2) if total > 0 else 0,
        })

    # Add hired as final stage
    hired_count = sum(1 for c in candidates if c.hired)
    funnel_data.append({
        "stage_id": None,
        "stage_name": "Hired",
        "candidate_count": hired_count,
        "percentage_of_total": round(hired_count / total * 100, 2) if total > 0 else 0,
    })

    # Calculate conversion rates between stages
    conversions = []
    for i in range(len(funnel_data) - 1):
        current = funnel_data[i]["candidate_count"]
        next_stage = funnel_data[i + 1]["candidate_count"]
        conversion_rate = round(next_stage / current * 100, 2) if current > 0 else 0

        conversions.append({
            "from_stage": funnel_data[i]["stage_name"],
            "to_stage": funnel_data[i + 1]["stage_name"],
            "conversion_rate": conversion_rate,
        })

    return {
        "period": {
            "from": date_from.isoformat(),
            "to": date_to.isoformat(),
        },
        "total_candidates": total,
        "funnel": funnel_data,
        "conversions": conversions,
    }


# =============================================================================
# Time-to-Hire Analytics
# =============================================================================

@router.get("/time-to-hire")
def get_time_to_hire_analytics(
    recruitment_id: Optional[int] = None,
    department_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get time-to-hire analytics and trends."""
    company_id = current_user.current_company_id

    if not date_to:
        date_to = date.today()
    if not date_from:
        date_from = date_to - timedelta(days=180)

    # Get hired candidates
    candidate_query = select(Candidate).where(
        Candidate.company_id == company_id,
        Candidate.deleted_at.is_(None),
        Candidate.hired == True,
        Candidate.joining_date.isnot(None),
    )

    if recruitment_id:
        candidate_query = candidate_query.where(Candidate.recruitment_id == recruitment_id)

    if date_from and date_to:
        candidate_query = candidate_query.where(
            Candidate.joining_date >= date_from,
            Candidate.joining_date <= date_to,
        )

    candidates = db.execute(candidate_query).scalars().all()

    # Calculate time-to-hire for each candidate
    time_data = []
    for candidate in candidates:
        if candidate.joining_date and candidate.created_at:
            days = (candidate.joining_date - candidate.created_at.date()).days
            if days > 0:
                time_data.append({
                    "candidate_id": candidate.id,
                    "recruitment_id": candidate.recruitment_id,
                    "days_to_hire": days,
                    "hired_date": candidate.joining_date.isoformat(),
                })

    if not time_data:
        return {
            "period": {"from": date_from.isoformat(), "to": date_to.isoformat()},
            "total_hires": 0,
            "avg_days_to_hire": None,
            "median_days_to_hire": None,
            "min_days_to_hire": None,
            "max_days_to_hire": None,
            "trend": [],
        }

    days_list = [d["days_to_hire"] for d in time_data]
    days_list.sort()

    # Calculate statistics
    avg_days = sum(days_list) / len(days_list)
    median_days = days_list[len(days_list) // 2]
    min_days = min(days_list)
    max_days = max(days_list)

    # Calculate monthly trend
    monthly_trend = {}
    for data in time_data:
        hire_date = date.fromisoformat(data["hired_date"])
        month_key = f"{hire_date.year}-{hire_date.month:02d}"
        if month_key not in monthly_trend:
            monthly_trend[month_key] = []
        monthly_trend[month_key].append(data["days_to_hire"])

    trend = [
        {
            "month": month,
            "avg_days": round(sum(days) / len(days), 1),
            "hires": len(days),
        }
        for month, days in sorted(monthly_trend.items())
    ]

    return {
        "period": {
            "from": date_from.isoformat(),
            "to": date_to.isoformat(),
        },
        "total_hires": len(time_data),
        "avg_days_to_hire": round(avg_days, 1),
        "median_days_to_hire": median_days,
        "min_days_to_hire": min_days,
        "max_days_to_hire": max_days,
        "trend": trend,
    }


# =============================================================================
# Source Effectiveness
# =============================================================================

@router.get("/sources/effectiveness")
def get_source_effectiveness(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get source channel effectiveness metrics."""
    company_id = current_user.current_company_id

    if not date_to:
        date_to = date.today()
    if not date_from:
        date_from = date_to - timedelta(days=90)

    # Get candidates with their sources
    candidate_query = select(Candidate).where(
        Candidate.company_id == company_id,
        Candidate.deleted_at.is_(None),
        Candidate.created_at >= date_from,
        Candidate.created_at <= date_to,
    )

    candidates = db.execute(candidate_query).scalars().all()

    # Group by source
    source_metrics = {}
    for candidate in candidates:
        source = candidate.source or "Direct/Unknown"

        if source not in source_metrics:
            source_metrics[source] = {
                "applications": 0,
                "interviewed": 0,
                "hired": 0,
                "rejected": 0,
            }

        source_metrics[source]["applications"] += 1

        if candidate.hired:
            source_metrics[source]["hired"] += 1
        elif candidate.canceled:
            source_metrics[source]["rejected"] += 1

        # Count interviewed (simplified - in production check interview records)
        if candidate.stage and candidate.stage.sequence and candidate.stage.sequence > 2:
            source_metrics[source]["interviewed"] += 1

    # Calculate effectiveness scores
    source_effectiveness = []
    for source, metrics in source_metrics.items():
        apps = metrics["applications"]
        hired = metrics["hired"]
        interviewed = metrics["interviewed"]

        effectiveness_score = 0
        if apps > 0:
            # Weighted score: hire rate (60%) + interview rate (40%)
            hire_rate = hired / apps
            interview_rate = interviewed / apps
            effectiveness_score = round((hire_rate * 60 + interview_rate * 40), 2)

        source_effectiveness.append({
            "source": source,
            "applications": apps,
            "interviewed": interviewed,
            "hired": hired,
            "hire_rate": round(hired / apps * 100, 2) if apps > 0 else 0,
            "interview_rate": round(interviewed / apps * 100, 2) if apps > 0 else 0,
            "effectiveness_score": effectiveness_score,
        })

    # Sort by effectiveness score
    source_effectiveness.sort(key=lambda x: x["effectiveness_score"], reverse=True)

    return {
        "period": {
            "from": date_from.isoformat(),
            "to": date_to.isoformat(),
        },
        "sources": source_effectiveness,
        "recommendations": _generate_source_recommendations(source_effectiveness),
    }


def _generate_source_recommendations(source_data: List[dict]) -> List[str]:
    """Generate recommendations based on source effectiveness."""
    recommendations = []

    if not source_data:
        return ["Start tracking application sources to optimize recruitment channels"]

    # Find top and bottom performers
    top_sources = [s for s in source_data if s["effectiveness_score"] > 50]
    low_sources = [s for s in source_data if s["effectiveness_score"] < 20 and s["applications"] > 5]

    if top_sources:
        top = top_sources[0]
        recommendations.append(f"'{top['source']}' is your best performing channel with {top['hire_rate']}% hire rate. Consider increasing budget allocation.")

    if low_sources:
        for source in low_sources[:2]:
            recommendations.append(f"Review '{source['source']}' channel - low conversion rate ({source['hire_rate']}% hires from {source['applications']} applications)")

    # Check for source diversity
    if len(source_data) < 3:
        recommendations.append("Consider diversifying recruitment channels to reduce dependency on few sources")

    return recommendations


# =============================================================================
# Hiring Goals
# =============================================================================

@router.get("/goals", response_model=HiringGoalList)
def list_hiring_goals(
    department_id: Optional[int] = None,
    is_active: Optional[bool] = True,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List hiring goals."""
    query = select(HiringGoal).where(
        HiringGoal.company_id == current_user.current_company_id,
        HiringGoal.deleted_at.is_(None),
    )

    if department_id:
        query = query.where(HiringGoal.department_id == department_id)
    if is_active is not None:
        query = query.where(HiringGoal.is_active == is_active)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = db.execute(count_query).scalar() or 0

    # Get items
    query = query.order_by(HiringGoal.period_end.desc()).offset(skip).limit(limit)
    items = db.execute(query).scalars().all()

    # Calculate progress
    response_items = []
    for goal in items:
        goal_data = HiringGoalResponse.model_validate(goal)
        if goal.target_hires > 0:
            goal_data.progress_percentage = round(
                (goal.current_hires / goal.target_hires) * 100, 2
            )
        response_items.append(goal_data)

    return HiringGoalList(
        items=response_items,
        total=total,
        page=skip // limit + 1,
        page_size=limit,
    )


@router.get("/goals/{goal_id}", response_model=HiringGoalResponse)
def get_hiring_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a hiring goal by ID."""
    goal = db.execute(
        select(HiringGoal).where(
            HiringGoal.id == goal_id,
            HiringGoal.company_id == current_user.current_company_id,
            HiringGoal.deleted_at.is_(None),
        )
    ).scalar_one_or_none()

    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hiring goal not found"
        )

    response = HiringGoalResponse.model_validate(goal)
    if goal.target_hires > 0:
        response.progress_percentage = round(
            (goal.current_hires / goal.target_hires) * 100, 2
        )

    return response


@router.post("/goals", response_model=HiringGoalResponse, status_code=status.HTTP_201_CREATED)
def create_hiring_goal(
    data: HiringGoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new hiring goal."""
    goal = HiringGoal(
        **data.model_dump(),
        company_id=current_user.current_company_id,
        created_by_id=current_user.id,
        current_hires=0,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)

    return HiringGoalResponse.model_validate(goal)


@router.put("/goals/{goal_id}", response_model=HiringGoalResponse)
def update_hiring_goal(
    goal_id: int,
    data: HiringGoalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a hiring goal."""
    goal = db.execute(
        select(HiringGoal).where(
            HiringGoal.id == goal_id,
            HiringGoal.company_id == current_user.current_company_id,
            HiringGoal.deleted_at.is_(None),
        )
    ).scalar_one_or_none()

    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hiring goal not found"
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(goal, field, value)

    goal.updated_by_id = current_user.id
    db.commit()
    db.refresh(goal)

    response = HiringGoalResponse.model_validate(goal)
    if goal.target_hires > 0:
        response.progress_percentage = round(
            (goal.current_hires / goal.target_hires) * 100, 2
        )

    return response


@router.delete("/goals/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_hiring_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a hiring goal (soft delete)."""
    goal = db.execute(
        select(HiringGoal).where(
            HiringGoal.id == goal_id,
            HiringGoal.company_id == current_user.current_company_id,
            HiringGoal.deleted_at.is_(None),
        )
    ).scalar_one_or_none()

    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hiring goal not found"
        )

    from datetime import datetime
    goal.deleted_at = datetime.utcnow()
    goal.deleted_by_id = current_user.id
    db.commit()


# =============================================================================
# Dashboard Summary
# =============================================================================

@router.get("/dashboard")
def get_analytics_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get comprehensive analytics dashboard data."""
    company_id = current_user.current_company_id
    today = date.today()
    thirty_days_ago = today - timedelta(days=30)

    # Get active recruitments
    recruitments = db.execute(
        select(Recruitment).where(
            Recruitment.company_id == company_id,
            Recruitment.deleted_at.is_(None),
            Recruitment.is_active == True,
        )
    ).scalars().all()

    # Get recent candidates
    recent_candidates = db.execute(
        select(Candidate).where(
            Candidate.company_id == company_id,
            Candidate.deleted_at.is_(None),
            Candidate.created_at >= thirty_days_ago,
        )
    ).scalars().all()

    # Get active hiring goals
    goals = db.execute(
        select(HiringGoal).where(
            HiringGoal.company_id == company_id,
            HiringGoal.deleted_at.is_(None),
            HiringGoal.is_active == True,
            HiringGoal.period_end >= today,
        )
    ).scalars().all()

    # Calculate summary metrics
    total_open_positions = len(recruitments)
    total_candidates_30d = len(recent_candidates)
    new_hires_30d = sum(1 for c in recent_candidates if c.hired)

    # Goal progress
    goals_summary = []
    for goal in goals:
        progress = round((goal.current_hires / goal.target_hires) * 100, 2) if goal.target_hires > 0 else 0
        goals_summary.append({
            "id": goal.id,
            "name": goal.name,
            "target": goal.target_hires,
            "current": goal.current_hires,
            "progress": progress,
            "status": "on_track" if progress >= 70 else "at_risk" if progress >= 40 else "behind",
        })

    return {
        "summary": {
            "open_positions": total_open_positions,
            "candidates_last_30_days": total_candidates_30d,
            "hires_last_30_days": new_hires_30d,
            "active_goals": len(goals),
        },
        "hiring_goals": goals_summary,
        "quick_stats": {
            "avg_candidates_per_position": round(total_candidates_30d / total_open_positions, 1) if total_open_positions > 0 else 0,
            "hire_rate": round(new_hires_30d / total_candidates_30d * 100, 2) if total_candidates_30d > 0 else 0,
        },
    }
