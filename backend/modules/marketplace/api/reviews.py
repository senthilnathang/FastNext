"""
Marketplace Reviews API

Review and rating endpoints.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.api.deps import get_db, get_current_user
from app.models.user import User
from ..services.review_service import ReviewService, get_review_service

router = APIRouter()


# =============================================================================
# Schemas
# =============================================================================

class DetailedRatings(BaseModel):
    ease_of_use: Optional[int] = Field(None, ge=1, le=5)
    features: Optional[int] = Field(None, ge=1, le=5)
    documentation: Optional[int] = Field(None, ge=1, le=5)
    support: Optional[int] = Field(None, ge=1, le=5)
    value: Optional[int] = Field(None, ge=1, le=5)


class ReviewCreate(BaseModel):
    module_id: int
    rating: int = Field(..., ge=1, le=5)
    title: Optional[str] = Field(None, max_length=200)
    content: Optional[str] = None
    version_id: Optional[int] = None
    detailed_ratings: Optional[DetailedRatings] = None
    pros: Optional[List[str]] = None
    cons: Optional[List[str]] = None


class ReviewUpdate(BaseModel):
    rating: Optional[int] = Field(None, ge=1, le=5)
    title: Optional[str] = Field(None, max_length=200)
    content: Optional[str] = None
    detailed_ratings: Optional[DetailedRatings] = None
    pros: Optional[List[str]] = None
    cons: Optional[List[str]] = None


class ReviewResponse(BaseModel):
    id: int
    module_id: int
    user_id: int
    rating: int
    title: Optional[str]
    content: Optional[str]
    verified_purchase: bool
    helpful_count: int
    not_helpful_count: int
    comment_count: int
    has_response: bool
    publisher_response: Optional[str]
    is_featured: bool
    is_edited: bool
    status: str
    created_at: str
    user_name: Optional[str] = None

    class Config:
        from_attributes = True


class VoteCreate(BaseModel):
    vote: str = Field(..., pattern="^(helpful|not_helpful)$")


class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    parent_id: Optional[int] = None


class CommentResponse(BaseModel):
    id: int
    review_id: int
    user_id: int
    content: str
    is_publisher_reply: bool
    status: str
    created_at: str
    user_name: Optional[str] = None

    class Config:
        from_attributes = True


class ReportCreate(BaseModel):
    reason: str = Field(..., pattern="^(spam|inappropriate|fake|harassment|off_topic|other)$")
    details: Optional[str] = None
    evidence_urls: Optional[List[str]] = None


class PublisherResponseCreate(BaseModel):
    response: str = Field(..., min_length=1, max_length=5000)


class RatingSummaryResponse(BaseModel):
    average_rating: float
    total_reviews: int
    verified_reviews: int
    rating_5: int
    rating_4: int
    rating_3: int
    rating_2: int
    rating_1: int

    class Config:
        from_attributes = True


# =============================================================================
# Public Endpoints - Read Reviews
# =============================================================================

@router.get("/modules/{module_id}/reviews")
async def get_module_reviews(
    module_id: int,
    rating: Optional[int] = Query(None, ge=1, le=5),
    verified_only: bool = Query(False),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Get reviews for a module."""
    service = get_review_service(db)
    reviews, total = service.get_module_reviews(
        module_id=module_id,
        rating=rating,
        verified_only=verified_only,
        sort_by=sort_by,
        sort_order=sort_order,
        skip=skip,
        limit=limit,
    )

    return {
        "items": [
            {
                "id": r.id,
                "module_id": r.module_id,
                "user_id": r.user_id,
                "rating": r.rating,
                "title": r.title,
                "content": r.content,
                "verified_purchase": r.verified_purchase,
                "helpful_count": r.helpful_count,
                "not_helpful_count": r.not_helpful_count,
                "comment_count": r.comment_count,
                "has_response": r.has_response,
                "publisher_response": r.publisher_response,
                "is_featured": r.is_featured,
                "is_edited": r.is_edited,
                "status": r.status,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "user_name": r.user.username if r.user else None,
            }
            for r in reviews
        ],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/modules/{module_id}/rating-summary")
async def get_rating_summary(
    module_id: int,
    db: Session = Depends(get_db),
):
    """Get rating summary for a module."""
    service = get_review_service(db)
    summary = service.get_rating_summary(module_id)

    if not summary:
        return {
            "average_rating": 0,
            "total_reviews": 0,
            "verified_reviews": 0,
            "rating_5": 0,
            "rating_4": 0,
            "rating_3": 0,
            "rating_2": 0,
            "rating_1": 0,
        }

    return {
        "average_rating": summary.average_rating_display,
        "total_reviews": summary.total_reviews,
        "verified_reviews": summary.verified_reviews,
        "rating_5": summary.rating_5,
        "rating_4": summary.rating_4,
        "rating_3": summary.rating_3,
        "rating_2": summary.rating_2,
        "rating_1": summary.rating_1,
    }


@router.get("/reviews/{review_id}")
async def get_review(
    review_id: int,
    db: Session = Depends(get_db),
):
    """Get a single review."""
    service = get_review_service(db)
    review = service.get_review(review_id)

    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    return {
        "id": review.id,
        "module_id": review.module_id,
        "user_id": review.user_id,
        "rating": review.rating,
        "title": review.title,
        "content": review.content,
        "verified_purchase": review.verified_purchase,
        "helpful_count": review.helpful_count,
        "not_helpful_count": review.not_helpful_count,
        "comment_count": review.comment_count,
        "has_response": review.has_response,
        "publisher_response": review.publisher_response,
        "is_featured": review.is_featured,
        "is_edited": review.is_edited,
        "status": review.status,
        "created_at": review.created_at.isoformat() if review.created_at else None,
    }


@router.get("/reviews/{review_id}/comments")
async def get_review_comments(
    review_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Get comments for a review."""
    service = get_review_service(db)
    comments = service.get_review_comments(review_id, skip=skip, limit=limit)

    return [
        {
            "id": c.id,
            "review_id": c.review_id,
            "user_id": c.user_id,
            "content": c.content,
            "is_publisher_reply": c.is_publisher_reply,
            "status": c.status,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "user_name": c.user.username if c.user else None,
        }
        for c in comments
    ]


# =============================================================================
# Authenticated User Endpoints
# =============================================================================

@router.post("/reviews")
async def create_review(
    data: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new review."""
    service = get_review_service(db)

    try:
        review = service.create_review(
            module_id=data.module_id,
            user_id=current_user.id,
            rating=data.rating,
            title=data.title,
            content=data.content,
            version_id=data.version_id,
            detailed_ratings=data.detailed_ratings.model_dump() if data.detailed_ratings else None,
            pros=data.pros,
            cons=data.cons,
        )

        return {
            "id": review.id,
            "message": "Review created successfully",
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/reviews/{review_id}")
async def update_review(
    review_id: int,
    data: ReviewUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a review."""
    service = get_review_service(db)

    try:
        review = service.update_review(
            review_id=review_id,
            user_id=current_user.id,
            rating=data.rating,
            title=data.title,
            content=data.content,
            detailed_ratings=data.detailed_ratings.model_dump() if data.detailed_ratings else None,
            pros=data.pros,
            cons=data.cons,
        )

        return {"message": "Review updated successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/reviews/{review_id}")
async def delete_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a review."""
    service = get_review_service(db)

    if not service.delete_review(review_id, current_user.id):
        raise HTTPException(status_code=404, detail="Review not found or not owned by user")

    return {"message": "Review deleted successfully"}


@router.get("/my/reviews")
async def get_my_reviews(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current user's reviews."""
    service = get_review_service(db)
    reviews, total = service.get_user_reviews(current_user.id, skip=skip, limit=limit)

    return {
        "items": [
            {
                "id": r.id,
                "module_id": r.module_id,
                "rating": r.rating,
                "title": r.title,
                "content": r.content,
                "status": r.status,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "module_name": r.module.display_name if r.module else None,
            }
            for r in reviews
        ],
        "total": total,
    }


# =============================================================================
# Voting
# =============================================================================

@router.post("/reviews/{review_id}/vote")
async def vote_on_review(
    review_id: int,
    data: VoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Vote on a review's helpfulness."""
    service = get_review_service(db)
    vote = service.vote_review(review_id, current_user.id, data.vote)
    return {"message": "Vote recorded", "vote": vote.vote}


@router.delete("/reviews/{review_id}/vote")
async def remove_vote(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove vote from a review."""
    service = get_review_service(db)

    if not service.remove_vote(review_id, current_user.id):
        raise HTTPException(status_code=404, detail="Vote not found")

    return {"message": "Vote removed"}


# =============================================================================
# Comments
# =============================================================================

@router.post("/reviews/{review_id}/comments")
async def add_comment(
    review_id: int,
    data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a comment to a review."""
    service = get_review_service(db)
    comment = service.add_comment(
        review_id=review_id,
        user_id=current_user.id,
        content=data.content,
        parent_id=data.parent_id,
    )

    return {
        "id": comment.id,
        "message": "Comment added successfully",
    }


@router.delete("/comments/{comment_id}")
async def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a comment."""
    service = get_review_service(db)

    if not service.delete_comment(comment_id, current_user.id):
        raise HTTPException(status_code=404, detail="Comment not found or not owned by user")

    return {"message": "Comment deleted"}


# =============================================================================
# Reporting
# =============================================================================

@router.post("/reviews/{review_id}/report")
async def report_review(
    review_id: int,
    data: ReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Report a review for abuse."""
    service = get_review_service(db)

    try:
        report = service.report_review(
            review_id=review_id,
            reporter_id=current_user.id,
            reason=data.reason,
            details=data.details,
            evidence_urls=data.evidence_urls,
        )

        return {
            "id": report.id,
            "message": "Report submitted successfully",
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# =============================================================================
# Publisher Response
# =============================================================================

@router.post("/reviews/{review_id}/publisher-response")
async def add_publisher_response(
    review_id: int,
    data: PublisherResponseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add publisher response to a review."""
    service = get_review_service(db)

    try:
        review = service.add_publisher_response(
            review_id=review_id,
            publisher_user_id=current_user.id,
            response=data.response,
        )

        return {"message": "Response added successfully"}
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))


# =============================================================================
# Moderation (Admin)
# =============================================================================

@router.get("/moderation/reports")
async def get_pending_reports(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get pending review reports for moderation."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")

    service = get_review_service(db)
    reports, total = service.get_pending_reports(skip=skip, limit=limit)

    return {
        "items": [
            {
                "id": r.id,
                "review_id": r.review_id,
                "reason": r.reason,
                "details": r.details,
                "status": r.status,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in reports
        ],
        "total": total,
    }


@router.post("/moderation/reviews/{review_id}")
async def moderate_review(
    review_id: int,
    action: str = Query(..., pattern="^(approve|hide|remove)$"),
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Moderate a review."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")

    service = get_review_service(db)

    try:
        review = service.moderate_review(
            review_id=review_id,
            moderator_id=current_user.id,
            action=action,
            notes=notes,
        )

        return {"message": f"Review {action}d successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/moderation/reports/{report_id}/resolve")
async def resolve_report(
    report_id: int,
    resolution: str = Query(..., pattern="^(removed|hidden|no_action|warning_issued)$"),
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Resolve a review report."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")

    service = get_review_service(db)

    try:
        report = service.resolve_report(
            report_id=report_id,
            moderator_id=current_user.id,
            resolution=resolution,
            notes=notes,
        )

        return {"message": "Report resolved successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/moderation/reviews/{review_id}/feature")
async def feature_review(
    review_id: int,
    featured: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a review as featured."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")

    service = get_review_service(db)

    try:
        review = service.feature_review(review_id, featured)
        return {"message": f"Review {'featured' if featured else 'unfeatured'} successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
