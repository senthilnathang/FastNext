"""
Scoring & Ranking API Routes

CRUD operations for scoring criteria, candidate scores, and rankings.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, and_, desc
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User

from ..models.advanced import ScoringCriteria, CandidateScore, CandidateScorecard
from ..models.recruitment import Candidate, Recruitment
from ..schemas.advanced import (
    ScoringCriteriaCreate,
    ScoringCriteriaUpdate,
    ScoringCriteriaResponse,
    ScoringCriteriaList,
    CandidateScorecardResponse,
    CandidateScorecardList,
)

router = APIRouter(tags=["Recruitment - Scoring"])


# =============================================================================
# Scoring Criteria CRUD
# =============================================================================

@router.get("/criteria", response_model=ScoringCriteriaList)
@router.get("/criteria/", response_model=ScoringCriteriaList, include_in_schema=False)
def list_scoring_criteria(
    recruitment_id: Optional[int] = None,
    criteria_type: Optional[str] = None,
    is_active: Optional[bool] = True,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List scoring criteria with optional filters."""
    query = select(ScoringCriteria).where(
        ScoringCriteria.company_id == current_user.current_company_id,
        ScoringCriteria.deleted_at.is_(None),
    )

    if recruitment_id is not None:
        query = query.where(ScoringCriteria.recruitment_id == recruitment_id)
    if criteria_type:
        query = query.where(ScoringCriteria.criteria_type == criteria_type)
    if is_active is not None:
        query = query.where(ScoringCriteria.is_active == is_active)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = db.execute(count_query).scalar() or 0

    # Get items with pagination
    query = query.order_by(ScoringCriteria.sequence, ScoringCriteria.id).offset(skip).limit(limit)
    items = db.execute(query).scalars().all()

    return ScoringCriteriaList(
        items=[ScoringCriteriaResponse.model_validate(item) for item in items],
        total=total,
        page=skip // limit + 1 if limit > 0 else 1,
        page_size=limit,
    )


@router.get("/criteria/{criteria_id}", response_model=ScoringCriteriaResponse)
def get_scoring_criteria(
    criteria_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a scoring criteria by ID."""
    criteria = db.execute(
        select(ScoringCriteria).where(
            ScoringCriteria.id == criteria_id,
            ScoringCriteria.company_id == current_user.current_company_id,
            ScoringCriteria.deleted_at.is_(None),
        )
    ).scalar_one_or_none()

    if not criteria:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scoring criteria not found"
        )

    return ScoringCriteriaResponse.model_validate(criteria)


@router.post("/criteria", response_model=ScoringCriteriaResponse, status_code=status.HTTP_201_CREATED)
@router.post("/criteria/", response_model=ScoringCriteriaResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_scoring_criteria(
    data: ScoringCriteriaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new scoring criteria."""
    criteria = ScoringCriteria(
        **data.model_dump(),
        company_id=current_user.current_company_id,
        created_by_id=current_user.id,
    )
    db.add(criteria)
    db.commit()
    db.refresh(criteria)

    return ScoringCriteriaResponse.model_validate(criteria)


@router.put("/criteria/{criteria_id}", response_model=ScoringCriteriaResponse)
def update_scoring_criteria(
    criteria_id: int,
    data: ScoringCriteriaUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a scoring criteria."""
    criteria = db.execute(
        select(ScoringCriteria).where(
            ScoringCriteria.id == criteria_id,
            ScoringCriteria.company_id == current_user.current_company_id,
            ScoringCriteria.deleted_at.is_(None),
        )
    ).scalar_one_or_none()

    if not criteria:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scoring criteria not found"
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(criteria, field, value)

    criteria.updated_by_id = current_user.id
    db.commit()
    db.refresh(criteria)

    return ScoringCriteriaResponse.model_validate(criteria)


@router.delete("/criteria/{criteria_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_scoring_criteria(
    criteria_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a scoring criteria (soft delete)."""
    criteria = db.execute(
        select(ScoringCriteria).where(
            ScoringCriteria.id == criteria_id,
            ScoringCriteria.company_id == current_user.current_company_id,
            ScoringCriteria.deleted_at.is_(None),
        )
    ).scalar_one_or_none()

    if not criteria:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scoring criteria not found"
        )

    criteria.deleted_at = datetime.utcnow()
    criteria.deleted_by_id = current_user.id
    db.commit()


# =============================================================================
# Candidate Scores
# =============================================================================

@router.get("/candidates/{candidate_id}/scores")
@router.get("/candidates/{candidate_id}/scores/", include_in_schema=False)
def get_candidate_scores(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all scores for a candidate."""
    company_id = current_user.current_company_id

    # Verify candidate exists
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

    scores = db.execute(
        select(CandidateScore).where(
            CandidateScore.candidate_id == candidate_id,
            CandidateScore.company_id == company_id,
            CandidateScore.is_deleted == False,
        )
    ).scalars().all()

    result = []
    for score in scores:
        criteria = db.execute(
            select(ScoringCriteria).where(ScoringCriteria.id == score.criteria_id)
        ).scalar_one_or_none()

        result.append({
            "id": score.id,
            "candidate_id": score.candidate_id,
            "criteria_id": score.criteria_id,
            "criteria_name": criteria.name if criteria else None,
            "criteria_type": criteria.criteria_type if criteria else None,
            "score": float(score.score) if score.score else 0,
            "max_score": criteria.max_score if criteria else 10,
            "weight": float(criteria.weight) if criteria and criteria.weight else 1.0,
            "notes": score.notes,
            "scored_by_id": score.scored_by_id,
            "created_at": score.created_at.isoformat() if score.created_at else None,
        })

    return {"items": result, "total": len(result)}


@router.post("/candidates/{candidate_id}/scores")
@router.post("/candidates/{candidate_id}/scores/", include_in_schema=False)
def add_candidate_score(
    candidate_id: int,
    criteria_id: int = Query(..., description="Scoring criteria ID"),
    score: float = Query(..., ge=0, description="Score value"),
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a score for a candidate on a criteria."""
    company_id = current_user.current_company_id

    # Verify candidate
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

    # Verify criteria
    criteria = db.execute(
        select(ScoringCriteria).where(
            ScoringCriteria.id == criteria_id,
            ScoringCriteria.company_id == company_id,
            ScoringCriteria.deleted_at.is_(None),
        )
    ).scalar_one_or_none()

    if not criteria:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scoring criteria not found"
        )

    # Validate score against max
    if score > criteria.max_score:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Score {score} exceeds maximum {criteria.max_score}"
        )

    candidate_score = CandidateScore(
        candidate_id=candidate_id,
        criteria_id=criteria_id,
        score=Decimal(str(score)),
        notes=notes,
        scored_by_id=current_user.id,
        company_id=company_id,
    )
    db.add(candidate_score)
    db.commit()
    db.refresh(candidate_score)

    return {
        "id": candidate_score.id,
        "candidate_id": candidate_id,
        "criteria_id": criteria_id,
        "score": float(candidate_score.score),
        "message": "Score added successfully",
    }


# =============================================================================
# Candidate Scorecards
# =============================================================================

@router.get("/candidates/{candidate_id}/scorecard")
@router.get("/candidates/{candidate_id}/scorecard/", include_in_schema=False)
def get_candidate_scorecard(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get aggregate scorecard for a candidate."""
    company_id = current_user.current_company_id

    # Verify candidate
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

    scorecard = db.execute(
        select(CandidateScorecard).where(
            CandidateScorecard.candidate_id == candidate_id,
            CandidateScorecard.company_id == company_id,
            CandidateScorecard.is_deleted == False,
        )
    ).scalar_one_or_none()

    if not scorecard:
        return {
            "candidate_id": candidate_id,
            "has_scorecard": False,
            "message": "No scorecard available for this candidate"
        }

    return {
        "candidate_id": candidate_id,
        "has_scorecard": True,
        "id": scorecard.id,
        "status": scorecard.status,
        "total_score": float(scorecard.total_score) if scorecard.total_score else None,
        "weighted_score": float(scorecard.weighted_score) if scorecard.weighted_score else None,
        "max_possible_score": float(scorecard.max_possible_score) if scorecard.max_possible_score else None,
        "score_percentage": float(scorecard.score_percentage) if scorecard.score_percentage else None,
        "recommendation": scorecard.recommendation,
        "summary": scorecard.summary,
        "strengths": scorecard.strengths,
        "weaknesses": scorecard.weaknesses,
        "completed_at": scorecard.completed_at.isoformat() if scorecard.completed_at else None,
    }


# =============================================================================
# Rankings
# =============================================================================

@router.get("/rankings")
@router.get("/rankings/", include_in_schema=False)
def get_candidate_rankings(
    recruitment_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get candidate rankings based on aggregate scores.

    Returns candidates sorted by weighted score (descending).
    """
    company_id = current_user.current_company_id

    # Build base query for scorecards
    query = select(CandidateScorecard).where(
        CandidateScorecard.company_id == company_id,
        CandidateScorecard.is_deleted == False,
    )

    if recruitment_id:
        # Filter candidates by recruitment
        candidate_ids_query = select(Candidate.id).where(
            Candidate.recruitment_id == recruitment_id,
            Candidate.company_id == company_id,
            Candidate.deleted_at.is_(None),
        )
        query = query.where(
            CandidateScorecard.candidate_id.in_(candidate_ids_query)
        )

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = db.execute(count_query).scalar() or 0

    # Get items ordered by weighted score descending
    query = query.order_by(
        desc(CandidateScorecard.weighted_score)
    ).offset(skip).limit(limit)

    scorecards = db.execute(query).scalars().all()

    rankings = []
    for rank, scorecard in enumerate(scorecards, start=skip + 1):
        # Get candidate info
        candidate = db.execute(
            select(Candidate).where(Candidate.id == scorecard.candidate_id)
        ).scalar_one_or_none()

        rankings.append({
            "rank": rank,
            "candidate_id": scorecard.candidate_id,
            "candidate_name": candidate.partner_name if candidate else "Unknown",
            "candidate_email": candidate.email_from if candidate else None,
            "recruitment_id": candidate.recruitment_id if candidate else None,
            "scorecard_id": scorecard.id,
            "status": scorecard.status,
            "total_score": float(scorecard.total_score) if scorecard.total_score else 0,
            "weighted_score": float(scorecard.weighted_score) if scorecard.weighted_score else 0,
            "max_possible_score": float(scorecard.max_possible_score) if scorecard.max_possible_score else 0,
            "score_percentage": float(scorecard.score_percentage) if scorecard.score_percentage else 0,
            "recommendation": scorecard.recommendation,
        })

    return {
        "items": rankings,
        "total": total,
        "page": skip // limit + 1 if limit > 0 else 1,
        "page_size": limit,
    }
