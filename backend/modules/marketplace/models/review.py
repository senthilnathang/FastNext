"""
Marketplace Review and Rating Models

User reviews, ratings, and moderation.
"""

from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Index,
    CheckConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.base import TimestampMixin, AuditMixin

if TYPE_CHECKING:
    from app.models.user import User
    from .module import MarketplaceModule, ModuleVersion


class ModuleReview(Base, TimestampMixin, AuditMixin):
    """
    Module review and rating.

    Users can review modules they've used.
    """
    __tablename__ = "marketplace_reviews"

    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(
        Integer,
        ForeignKey("marketplace_modules.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    version_id = Column(
        Integer,
        ForeignKey("marketplace_module_versions.id", ondelete="SET NULL"),
        nullable=True
    )

    # Rating (1-5 stars)
    rating = Column(Integer, nullable=False)

    # Content
    title = Column(String(200), nullable=True)
    content = Column(Text, nullable=True)

    # Detailed Ratings (optional)
    rating_ease_of_use = Column(Integer, nullable=True)
    rating_features = Column(Integer, nullable=True)
    rating_documentation = Column(Integer, nullable=True)
    rating_support = Column(Integer, nullable=True)
    rating_value = Column(Integer, nullable=True)

    # Pros/Cons
    pros = Column(JSONB, default=list)  # ["Easy setup", "Good docs"]
    cons = Column(JSONB, default=list)

    # Engagement
    helpful_count = Column(Integer, default=0)
    not_helpful_count = Column(Integer, default=0)
    comment_count = Column(Integer, default=0)

    # Publisher Response
    has_response = Column(Boolean, default=False)
    publisher_response = Column(Text, nullable=True)
    publisher_responded_at = Column(DateTime(timezone=True), nullable=True)
    publisher_response_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Verification
    verified_purchase = Column(Boolean, default=False)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    license_id = Column(Integer, ForeignKey("marketplace_licenses.id"), nullable=True)

    # Status
    status = Column(String(20), default="published", index=True)  # pending, published, hidden, reported, removed

    # Moderation
    reported_count = Column(Integer, default=0)
    moderation_notes = Column(Text, nullable=True)
    moderated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    moderated_at = Column(DateTime(timezone=True), nullable=True)

    # Featured
    is_featured = Column(Boolean, default=False)
    featured_at = Column(DateTime(timezone=True), nullable=True)

    # Edit tracking
    is_edited = Column(Boolean, default=False)
    edited_at = Column(DateTime(timezone=True), nullable=True)
    original_content = Column(Text, nullable=True)

    # Relationships
    module: "MarketplaceModule" = relationship("MarketplaceModule", back_populates="reviews")
    user = relationship("User", foreign_keys=[user_id], backref="marketplace_reviews")
    version = relationship("ModuleVersion")
    votes: List["ReviewVote"] = relationship(
        "ReviewVote",
        back_populates="review",
        cascade="all, delete-orphan"
    )
    comments: List["ReviewComment"] = relationship(
        "ReviewComment",
        back_populates="review",
        cascade="all, delete-orphan"
    )
    reports: List["ReviewReport"] = relationship(
        "ReviewReport",
        back_populates="review",
        cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("module_id", "user_id", name="uq_module_review_user"),
        CheckConstraint("rating >= 1 AND rating <= 5", name="ck_review_rating_range"),
        Index("ix_reviews_rating", "rating"),
        Index("ix_reviews_verified", "verified_purchase"),
        Index("ix_reviews_status_created", "status", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<Review {self.id} - {self.rating} stars for module {self.module_id}>"

    @property
    def helpfulness_score(self) -> float:
        """Calculate helpfulness percentage."""
        total = self.helpful_count + self.not_helpful_count
        if total == 0:
            return 0
        return self.helpful_count / total


class ReviewVote(Base, TimestampMixin):
    """
    Helpful/not helpful votes on reviews.
    """
    __tablename__ = "marketplace_review_votes"

    id = Column(Integer, primary_key=True, index=True)
    review_id = Column(
        Integer,
        ForeignKey("marketplace_reviews.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Vote
    vote = Column(String(15), nullable=False)  # helpful, not_helpful

    # Relationships
    review: "ModuleReview" = relationship("ModuleReview", back_populates="votes")
    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("review_id", "user_id", name="uq_review_vote_user"),
    )


class ReviewComment(Base, TimestampMixin):
    """
    Comments on reviews.

    For discussions about reviews.
    """
    __tablename__ = "marketplace_review_comments"

    id = Column(Integer, primary_key=True, index=True)
    review_id = Column(
        Integer,
        ForeignKey("marketplace_reviews.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    parent_id = Column(Integer, ForeignKey("marketplace_review_comments.id"), nullable=True)

    # Content
    content = Column(Text, nullable=False)

    # Status
    status = Column(String(20), default="published")  # published, hidden, removed
    is_publisher_reply = Column(Boolean, default=False)

    # Relationships
    review: "ModuleReview" = relationship("ModuleReview", back_populates="comments")
    user = relationship("User")
    parent = relationship("ReviewComment", remote_side=[id], backref="replies")

    __table_args__ = (
        Index("ix_review_comments_review", "review_id"),
    )


class ReviewReport(Base, TimestampMixin):
    """
    Abuse reports for reviews.
    """
    __tablename__ = "marketplace_review_reports"

    id = Column(Integer, primary_key=True, index=True)
    review_id = Column(
        Integer,
        ForeignKey("marketplace_reviews.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Report Details
    reason = Column(String(50), nullable=False)  # spam, inappropriate, fake, harassment, off_topic, other
    details = Column(Text, nullable=True)
    evidence_urls = Column(JSONB, default=list)

    # Status
    status = Column(String(20), default="pending", index=True)  # pending, investigating, resolved, dismissed

    # Resolution
    resolution = Column(String(20), nullable=True)  # removed, hidden, no_action, warning_issued
    resolution_notes = Column(Text, nullable=True)
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    review: "ModuleReview" = relationship("ModuleReview", back_populates="reports")
    reporter = relationship("User", foreign_keys=[reporter_id])

    __table_args__ = (
        UniqueConstraint("review_id", "reporter_id", name="uq_review_report_user"),
        Index("ix_reports_status", "status"),
    )


class RatingSummary(Base, TimestampMixin):
    """
    Pre-aggregated rating statistics per module.

    Updated via triggers or scheduled tasks for performance.
    """
    __tablename__ = "marketplace_rating_summaries"

    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(
        Integer,
        ForeignKey("marketplace_modules.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True
    )

    # Overall
    average_rating = Column(Integer, default=0)  # Stored as integer * 100 for precision
    total_reviews = Column(Integer, default=0)
    verified_reviews = Column(Integer, default=0)

    # Distribution
    rating_5 = Column(Integer, default=0)
    rating_4 = Column(Integer, default=0)
    rating_3 = Column(Integer, default=0)
    rating_2 = Column(Integer, default=0)
    rating_1 = Column(Integer, default=0)

    # Detailed Averages (if collected)
    avg_ease_of_use = Column(Integer, nullable=True)
    avg_features = Column(Integer, nullable=True)
    avg_documentation = Column(Integer, nullable=True)
    avg_support = Column(Integer, nullable=True)
    avg_value = Column(Integer, nullable=True)

    # Trends
    rating_trend = Column(String(10), nullable=True)  # up, down, stable
    reviews_this_month = Column(Integer, default=0)
    average_this_month = Column(Integer, nullable=True)

    # Last Update
    last_review_at = Column(DateTime(timezone=True), nullable=True)
    recalculated_at = Column(DateTime(timezone=True), nullable=False)

    # Relationships
    module = relationship("MarketplaceModule", backref="rating_summary")

    @property
    def average_rating_display(self) -> float:
        """Get display-friendly average rating."""
        return self.average_rating / 100 if self.average_rating else 0.0
