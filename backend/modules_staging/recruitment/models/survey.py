"""
Recruitment Survey Integration Models

This module now integrates with the shared Quiz module for questionnaires.
CandidateQuizAttempt links candidates to their quiz attempts.
"""

from sqlalchemy import (
    Column, Integer, String, ForeignKey, Table, DateTime
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base
from app.models.base import TimestampMixin, SoftDeleteMixin, CompanyScopedMixin


# Association table for recruitment to quizzes (screening questionnaires)
recruitment_quizzes = Table(
    'recruitment_recruitment_quizzes',
    Base.metadata,
    Column('recruitment_id', Integer, ForeignKey('recruitment_recruitment.id'), primary_key=True),
    Column('quiz_id', Integer, ForeignKey('quizzes.id'), primary_key=True),
)


class CandidateQuizAttempt(Base, TimestampMixin, SoftDeleteMixin, CompanyScopedMixin):
    """
    Links candidates to their quiz attempts from the Quiz module.

    This tracks which quiz attempts belong to which candidate in the recruitment context.
    The actual quiz data (questions, answers, scores) is managed by the Quiz module.
    """

    __tablename__ = "recruitment_candidate_quiz_attempt"

    id = Column(Integer, primary_key=True, index=True)

    # Candidate link
    candidate_id = Column(Integer, ForeignKey("recruitment_candidate.id"), nullable=False, index=True)

    # Recruitment context
    recruitment_id = Column(Integer, ForeignKey("recruitment_recruitment.id"), nullable=True, index=True)

    # Quiz module link
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False, index=True)
    quiz_attempt_id = Column(Integer, ForeignKey("quiz_attempts.id"), nullable=True, index=True)

    # Status tracking
    status = Column(String(20), default="pending")  # pending, in_progress, completed, expired

    # Timestamps
    invited_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    candidate = relationship("Candidate", back_populates="quiz_attempts")
    recruitment = relationship("Recruitment", back_populates="candidate_quiz_attempts")

    # Note: Quiz and QuizAttempt relationships removed to avoid cross-module mapper initialization issues.
    # Access quiz data via quiz_id and quiz_attempt_id foreign keys directly through the service layer.
    # quiz = relationship("Quiz", foreign_keys=[quiz_id], lazy="select")
    # quiz_attempt = relationship("QuizAttempt", foreign_keys=[quiz_attempt_id], lazy="select")


# =============================================================================
# DEPRECATED: Legacy survey tables removed
# Survey functionality has been replaced by Quiz module integration.
# Legacy tables (recruitment_survey_*) have been removed as they referenced
# non-existent tables and caused foreign key errors during model initialization.
# =============================================================================
