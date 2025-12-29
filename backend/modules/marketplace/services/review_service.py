"""
Marketplace Review Service

Review and rating management operations.
"""

import logging
from datetime import datetime
from typing import Optional, List, Dict, Any

from sqlalchemy import func, and_, or_
from sqlalchemy.orm import Session, joinedload

from ..models.review import (
    ModuleReview,
    ReviewVote,
    ReviewComment,
    ReviewReport,
    RatingSummary,
)
from ..models.module import MarketplaceModule
from ..models.license import License

logger = logging.getLogger(__name__)


class ReviewService:
    """Service for managing reviews and ratings."""

    def __init__(self, db: Session):
        self.db = db

    # ==========================================================================
    # Review CRUD
    # ==========================================================================

    def create_review(
        self,
        module_id: int,
        user_id: int,
        rating: int,
        title: Optional[str] = None,
        content: Optional[str] = None,
        version_id: Optional[int] = None,
        detailed_ratings: Optional[Dict[str, int]] = None,
        pros: Optional[List[str]] = None,
        cons: Optional[List[str]] = None,
    ) -> ModuleReview:
        """Create a new review for a module."""
        # Check for existing review
        existing = self.db.query(ModuleReview).filter(
            ModuleReview.module_id == module_id,
            ModuleReview.user_id == user_id,
        ).first()

        if existing:
            raise ValueError("User has already reviewed this module")

        # Check if user has a license (verified purchase)
        license_obj = self.db.query(License).filter(
            License.module_id == module_id,
            License.user_id == user_id,
            License.status == "active",
        ).first()

        review = ModuleReview(
            module_id=module_id,
            user_id=user_id,
            version_id=version_id,
            rating=rating,
            title=title,
            content=content,
            pros=pros or [],
            cons=cons or [],
            verified_purchase=license_obj is not None,
            verified_at=datetime.utcnow() if license_obj else None,
            license_id=license_obj.id if license_obj else None,
            status="published",
            created_by=user_id,
        )

        # Set detailed ratings if provided
        if detailed_ratings:
            review.rating_ease_of_use = detailed_ratings.get("ease_of_use")
            review.rating_features = detailed_ratings.get("features")
            review.rating_documentation = detailed_ratings.get("documentation")
            review.rating_support = detailed_ratings.get("support")
            review.rating_value = detailed_ratings.get("value")

        self.db.add(review)
        self.db.flush()

        # Update rating summary
        self._update_rating_summary(module_id)

        self.db.commit()
        self.db.refresh(review)

        logger.info(f"Created review {review.id} for module {module_id} by user {user_id}")
        return review

    def update_review(
        self,
        review_id: int,
        user_id: int,
        rating: Optional[int] = None,
        title: Optional[str] = None,
        content: Optional[str] = None,
        detailed_ratings: Optional[Dict[str, int]] = None,
        pros: Optional[List[str]] = None,
        cons: Optional[List[str]] = None,
    ) -> ModuleReview:
        """Update an existing review."""
        review = self.db.query(ModuleReview).filter(
            ModuleReview.id == review_id,
            ModuleReview.user_id == user_id,
        ).first()

        if not review:
            raise ValueError("Review not found or not owned by user")

        # Store original content if first edit
        if not review.is_edited:
            review.original_content = review.content

        if rating is not None:
            review.rating = rating
        if title is not None:
            review.title = title
        if content is not None:
            review.content = content
        if pros is not None:
            review.pros = pros
        if cons is not None:
            review.cons = cons

        if detailed_ratings:
            if "ease_of_use" in detailed_ratings:
                review.rating_ease_of_use = detailed_ratings["ease_of_use"]
            if "features" in detailed_ratings:
                review.rating_features = detailed_ratings["features"]
            if "documentation" in detailed_ratings:
                review.rating_documentation = detailed_ratings["documentation"]
            if "support" in detailed_ratings:
                review.rating_support = detailed_ratings["support"]
            if "value" in detailed_ratings:
                review.rating_value = detailed_ratings["value"]

        review.is_edited = True
        review.edited_at = datetime.utcnow()
        review.updated_by = user_id

        # Update rating summary if rating changed
        if rating is not None:
            self._update_rating_summary(review.module_id)

        self.db.commit()
        self.db.refresh(review)

        return review

    def delete_review(self, review_id: int, user_id: int) -> bool:
        """Delete a review (by owner)."""
        review = self.db.query(ModuleReview).filter(
            ModuleReview.id == review_id,
            ModuleReview.user_id == user_id,
        ).first()

        if not review:
            return False

        module_id = review.module_id
        self.db.delete(review)

        # Update rating summary
        self._update_rating_summary(module_id)

        self.db.commit()
        return True

    def get_review(self, review_id: int) -> Optional[ModuleReview]:
        """Get a single review by ID."""
        return self.db.query(ModuleReview).options(
            joinedload(ModuleReview.user),
            joinedload(ModuleReview.version),
        ).filter(ModuleReview.id == review_id).first()

    def get_module_reviews(
        self,
        module_id: int,
        status: str = "published",
        rating: Optional[int] = None,
        verified_only: bool = False,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[List[ModuleReview], int]:
        """Get reviews for a module with filtering and pagination."""
        query = self.db.query(ModuleReview).filter(
            ModuleReview.module_id == module_id,
            ModuleReview.status == status,
        )

        if rating:
            query = query.filter(ModuleReview.rating == rating)

        if verified_only:
            query = query.filter(ModuleReview.verified_purchase == True)

        # Count total
        total = query.count()

        # Sorting
        sort_column = getattr(ModuleReview, sort_by, ModuleReview.created_at)
        if sort_order == "desc":
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())

        reviews = query.options(
            joinedload(ModuleReview.user),
        ).offset(skip).limit(limit).all()

        return reviews, total

    def get_user_reviews(
        self,
        user_id: int,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[List[ModuleReview], int]:
        """Get all reviews by a user."""
        query = self.db.query(ModuleReview).filter(
            ModuleReview.user_id == user_id,
        )

        total = query.count()

        reviews = query.options(
            joinedload(ModuleReview.module),
        ).order_by(ModuleReview.created_at.desc()).offset(skip).limit(limit).all()

        return reviews, total

    # ==========================================================================
    # Voting
    # ==========================================================================

    def vote_review(
        self,
        review_id: int,
        user_id: int,
        vote: str,  # "helpful" or "not_helpful"
    ) -> ReviewVote:
        """Vote on a review's helpfulness."""
        # Check if already voted
        existing = self.db.query(ReviewVote).filter(
            ReviewVote.review_id == review_id,
            ReviewVote.user_id == user_id,
        ).first()

        if existing:
            if existing.vote != vote:
                # Change vote
                old_vote = existing.vote
                existing.vote = vote
                self._update_vote_counts(review_id, old_vote, vote)
        else:
            vote_obj = ReviewVote(
                review_id=review_id,
                user_id=user_id,
                vote=vote,
            )
            self.db.add(vote_obj)
            self._update_vote_counts(review_id, None, vote)
            existing = vote_obj

        self.db.commit()
        self.db.refresh(existing)
        return existing

    def remove_vote(self, review_id: int, user_id: int) -> bool:
        """Remove a vote from a review."""
        vote = self.db.query(ReviewVote).filter(
            ReviewVote.review_id == review_id,
            ReviewVote.user_id == user_id,
        ).first()

        if not vote:
            return False

        old_vote = vote.vote
        self.db.delete(vote)
        self._update_vote_counts(review_id, old_vote, None)

        self.db.commit()
        return True

    def _update_vote_counts(
        self,
        review_id: int,
        old_vote: Optional[str],
        new_vote: Optional[str],
    ):
        """Update review vote counts."""
        review = self.db.query(ModuleReview).get(review_id)
        if not review:
            return

        if old_vote == "helpful":
            review.helpful_count = max(0, review.helpful_count - 1)
        elif old_vote == "not_helpful":
            review.not_helpful_count = max(0, review.not_helpful_count - 1)

        if new_vote == "helpful":
            review.helpful_count += 1
        elif new_vote == "not_helpful":
            review.not_helpful_count += 1

    # ==========================================================================
    # Comments
    # ==========================================================================

    def add_comment(
        self,
        review_id: int,
        user_id: int,
        content: str,
        parent_id: Optional[int] = None,
        is_publisher_reply: bool = False,
    ) -> ReviewComment:
        """Add a comment to a review."""
        comment = ReviewComment(
            review_id=review_id,
            user_id=user_id,
            parent_id=parent_id,
            content=content,
            is_publisher_reply=is_publisher_reply,
            status="published",
        )

        self.db.add(comment)

        # Update comment count
        review = self.db.query(ModuleReview).get(review_id)
        if review:
            review.comment_count += 1

        self.db.commit()
        self.db.refresh(comment)
        return comment

    def delete_comment(self, comment_id: int, user_id: int) -> bool:
        """Delete a comment (by owner)."""
        comment = self.db.query(ReviewComment).filter(
            ReviewComment.id == comment_id,
            ReviewComment.user_id == user_id,
        ).first()

        if not comment:
            return False

        review_id = comment.review_id
        self.db.delete(comment)

        # Update comment count
        review = self.db.query(ModuleReview).get(review_id)
        if review:
            review.comment_count = max(0, review.comment_count - 1)

        self.db.commit()
        return True

    def get_review_comments(
        self,
        review_id: int,
        skip: int = 0,
        limit: int = 50,
    ) -> List[ReviewComment]:
        """Get comments for a review."""
        return self.db.query(ReviewComment).filter(
            ReviewComment.review_id == review_id,
            ReviewComment.status == "published",
        ).options(
            joinedload(ReviewComment.user),
        ).order_by(ReviewComment.created_at.asc()).offset(skip).limit(limit).all()

    # ==========================================================================
    # Publisher Response
    # ==========================================================================

    def add_publisher_response(
        self,
        review_id: int,
        publisher_user_id: int,
        response: str,
    ) -> ModuleReview:
        """Add or update publisher response to a review."""
        review = self.db.query(ModuleReview).get(review_id)
        if not review:
            raise ValueError("Review not found")

        # Verify publisher owns the module
        module = self.db.query(MarketplaceModule).get(review.module_id)
        if not module or module.publisher.user_id != publisher_user_id:
            raise ValueError("Not authorized to respond to this review")

        review.publisher_response = response
        review.publisher_responded_at = datetime.utcnow()
        review.publisher_response_by = publisher_user_id
        review.has_response = True

        self.db.commit()
        self.db.refresh(review)
        return review

    # ==========================================================================
    # Reporting
    # ==========================================================================

    def report_review(
        self,
        review_id: int,
        reporter_id: int,
        reason: str,
        details: Optional[str] = None,
        evidence_urls: Optional[List[str]] = None,
    ) -> ReviewReport:
        """Report a review for abuse."""
        # Check if already reported
        existing = self.db.query(ReviewReport).filter(
            ReviewReport.review_id == review_id,
            ReviewReport.reporter_id == reporter_id,
        ).first()

        if existing:
            raise ValueError("User has already reported this review")

        report = ReviewReport(
            review_id=review_id,
            reporter_id=reporter_id,
            reason=reason,
            details=details,
            evidence_urls=evidence_urls or [],
            status="pending",
        )

        self.db.add(report)

        # Update report count on review
        review = self.db.query(ModuleReview).get(review_id)
        if review:
            review.reported_count += 1
            # Auto-hide if too many reports
            if review.reported_count >= 5:
                review.status = "reported"

        self.db.commit()
        self.db.refresh(report)
        return report

    def resolve_report(
        self,
        report_id: int,
        moderator_id: int,
        resolution: str,
        notes: Optional[str] = None,
    ) -> ReviewReport:
        """Resolve a report."""
        report = self.db.query(ReviewReport).get(report_id)
        if not report:
            raise ValueError("Report not found")

        report.status = "resolved"
        report.resolution = resolution
        report.resolution_notes = notes
        report.resolved_by = moderator_id
        report.resolved_at = datetime.utcnow()

        # Apply resolution to review
        review = self.db.query(ModuleReview).get(report.review_id)
        if review and resolution in ("removed", "hidden"):
            review.status = resolution
            review.moderated_by = moderator_id
            review.moderated_at = datetime.utcnow()
            review.moderation_notes = notes

        self.db.commit()
        self.db.refresh(report)
        return report

    # ==========================================================================
    # Rating Summary
    # ==========================================================================

    def _update_rating_summary(self, module_id: int):
        """Recalculate and update rating summary for a module."""
        # Get all published reviews
        reviews = self.db.query(ModuleReview).filter(
            ModuleReview.module_id == module_id,
            ModuleReview.status == "published",
        ).all()

        summary = self.db.query(RatingSummary).filter(
            RatingSummary.module_id == module_id,
        ).first()

        if not summary:
            summary = RatingSummary(module_id=module_id)
            self.db.add(summary)

        if not reviews:
            summary.average_rating = 0
            summary.total_reviews = 0
            summary.verified_reviews = 0
            summary.rating_5 = 0
            summary.rating_4 = 0
            summary.rating_3 = 0
            summary.rating_2 = 0
            summary.rating_1 = 0
        else:
            # Calculate averages
            total_rating = sum(r.rating for r in reviews)
            summary.total_reviews = len(reviews)
            summary.average_rating = int((total_rating / len(reviews)) * 100)

            summary.verified_reviews = sum(1 for r in reviews if r.verified_purchase)

            # Distribution
            summary.rating_5 = sum(1 for r in reviews if r.rating == 5)
            summary.rating_4 = sum(1 for r in reviews if r.rating == 4)
            summary.rating_3 = sum(1 for r in reviews if r.rating == 3)
            summary.rating_2 = sum(1 for r in reviews if r.rating == 2)
            summary.rating_1 = sum(1 for r in reviews if r.rating == 1)

            # Detailed averages
            ease_ratings = [r.rating_ease_of_use for r in reviews if r.rating_ease_of_use]
            if ease_ratings:
                summary.avg_ease_of_use = int((sum(ease_ratings) / len(ease_ratings)) * 100)

            feature_ratings = [r.rating_features for r in reviews if r.rating_features]
            if feature_ratings:
                summary.avg_features = int((sum(feature_ratings) / len(feature_ratings)) * 100)

            doc_ratings = [r.rating_documentation for r in reviews if r.rating_documentation]
            if doc_ratings:
                summary.avg_documentation = int((sum(doc_ratings) / len(doc_ratings)) * 100)

            support_ratings = [r.rating_support for r in reviews if r.rating_support]
            if support_ratings:
                summary.avg_support = int((sum(support_ratings) / len(support_ratings)) * 100)

            value_ratings = [r.rating_value for r in reviews if r.rating_value]
            if value_ratings:
                summary.avg_value = int((sum(value_ratings) / len(value_ratings)) * 100)

            # Last review
            summary.last_review_at = max(r.created_at for r in reviews)

        summary.recalculated_at = datetime.utcnow()

        # Also update module cached rating
        module = self.db.query(MarketplaceModule).get(module_id)
        if module:
            module.average_rating = summary.average_rating / 100 if summary.average_rating else None
            module.rating_count = summary.total_reviews
            module.rating_distribution = {
                "5": summary.rating_5,
                "4": summary.rating_4,
                "3": summary.rating_3,
                "2": summary.rating_2,
                "1": summary.rating_1,
            }

    def get_rating_summary(self, module_id: int) -> Optional[RatingSummary]:
        """Get rating summary for a module."""
        return self.db.query(RatingSummary).filter(
            RatingSummary.module_id == module_id,
        ).first()

    # ==========================================================================
    # Moderation
    # ==========================================================================

    def get_pending_reports(
        self,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[List[ReviewReport], int]:
        """Get pending review reports for moderation."""
        query = self.db.query(ReviewReport).filter(
            ReviewReport.status == "pending",
        )

        total = query.count()

        reports = query.options(
            joinedload(ReviewReport.review),
            joinedload(ReviewReport.reporter),
        ).order_by(ReviewReport.created_at.asc()).offset(skip).limit(limit).all()

        return reports, total

    def moderate_review(
        self,
        review_id: int,
        moderator_id: int,
        action: str,  # approve, hide, remove
        notes: Optional[str] = None,
    ) -> ModuleReview:
        """Moderate a review."""
        review = self.db.query(ModuleReview).get(review_id)
        if not review:
            raise ValueError("Review not found")

        if action == "approve":
            review.status = "published"
        elif action == "hide":
            review.status = "hidden"
        elif action == "remove":
            review.status = "removed"
        else:
            raise ValueError(f"Invalid action: {action}")

        review.moderated_by = moderator_id
        review.moderated_at = datetime.utcnow()
        review.moderation_notes = notes

        # Update rating summary if status changed
        if action in ("hide", "remove"):
            self._update_rating_summary(review.module_id)

        self.db.commit()
        self.db.refresh(review)
        return review

    def feature_review(
        self,
        review_id: int,
        featured: bool = True,
    ) -> ModuleReview:
        """Mark a review as featured."""
        review = self.db.query(ModuleReview).get(review_id)
        if not review:
            raise ValueError("Review not found")

        review.is_featured = featured
        review.featured_at = datetime.utcnow() if featured else None

        self.db.commit()
        self.db.refresh(review)
        return review


def get_review_service(db: Session) -> ReviewService:
    """Factory function for ReviewService."""
    return ReviewService(db)
