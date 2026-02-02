"""
Recruitment Quiz Integration Schemas

Pydantic schemas for Quiz module integration with recruitment.
The Quiz module handles questionnaires, questions, and answers.
This module provides schemas for linking candidates to quiz attempts.
"""

from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field


# =============================================================================
# Candidate Quiz Attempt Schemas
# =============================================================================

class CandidateQuizAttemptBase(BaseModel):
    """Base schema for candidate quiz attempts."""
    quiz_id: int = Field(..., description="Quiz ID from Quiz module")
    status: str = Field(
        "pending",
        description="Status: pending, in_progress, completed, expired"
    )


class CandidateQuizAttemptCreate(CandidateQuizAttemptBase):
    """Schema for creating a candidate quiz attempt (inviting candidate to quiz)."""
    candidate_id: int = Field(..., description="Candidate ID")
    recruitment_id: Optional[int] = Field(None, description="Recruitment ID")
    expires_at: Optional[datetime] = Field(None, description="Expiration datetime")


class CandidateQuizAttemptUpdate(BaseModel):
    """Schema for updating a candidate quiz attempt."""
    status: Optional[str] = Field(None, description="Status update")
    quiz_attempt_id: Optional[int] = Field(None, description="Link to actual quiz attempt")
    started_at: Optional[datetime] = Field(None, description="When candidate started")
    completed_at: Optional[datetime] = Field(None, description="When candidate completed")
    expires_at: Optional[datetime] = Field(None, description="Expiration datetime")


class CandidateQuizAttemptResponse(CandidateQuizAttemptBase):
    """Schema for candidate quiz attempt response."""
    id: int
    candidate_id: int
    recruitment_id: Optional[int] = None
    quiz_attempt_id: Optional[int] = None
    invited_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    # Nested data from Quiz module (populated when needed)
    quiz_title: Optional[str] = None
    quiz_score: Optional[float] = None
    quiz_passed: Optional[bool] = None

    class Config:
        from_attributes = True


class CandidateQuizAttemptList(BaseModel):
    """Paginated list of candidate quiz attempts."""
    items: List[CandidateQuizAttemptResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Recruitment Quiz Association Schemas
# =============================================================================

class RecruitmentQuizAssign(BaseModel):
    """Schema for assigning quizzes to a recruitment."""
    recruitment_id: int = Field(..., description="Recruitment ID")
    quiz_ids: List[int] = Field(..., description="List of Quiz IDs to assign")


class RecruitmentQuizUnassign(BaseModel):
    """Schema for unassigning quizzes from a recruitment."""
    recruitment_id: int = Field(..., description="Recruitment ID")
    quiz_ids: List[int] = Field(..., description="List of Quiz IDs to unassign")


class RecruitmentQuizResponse(BaseModel):
    """Schema for recruitment quiz assignment response."""
    recruitment_id: int
    quiz_id: int
    quiz_title: Optional[str] = None
    quiz_description: Optional[str] = None
    quiz_time_limit: Optional[int] = None
    quiz_passing_score: Optional[float] = None

    class Config:
        from_attributes = True


class RecruitmentQuizList(BaseModel):
    """List of quizzes assigned to a recruitment."""
    recruitment_id: int
    quizzes: List[RecruitmentQuizResponse]


# =============================================================================
# Bulk Operations Schemas
# =============================================================================

class BulkInviteCandidatesToQuiz(BaseModel):
    """Schema for bulk inviting candidates to take a quiz."""
    candidate_ids: List[int] = Field(..., description="List of Candidate IDs")
    quiz_id: int = Field(..., description="Quiz ID")
    recruitment_id: Optional[int] = Field(None, description="Recruitment ID for context")
    expires_in_days: Optional[int] = Field(7, description="Days until invitation expires")


class BulkQuizInviteResult(BaseModel):
    """Result of bulk quiz invitation."""
    invited_count: int
    skipped_count: int
    skipped_candidates: List[int] = Field(default_factory=list)
    message: str


# =============================================================================
# Quiz Results Summary Schemas
# =============================================================================

class CandidateQuizSummary(BaseModel):
    """Summary of a candidate's quiz performance."""
    candidate_id: int
    candidate_name: Optional[str] = None
    total_quizzes_assigned: int = 0
    quizzes_completed: int = 0
    quizzes_pending: int = 0
    quizzes_expired: int = 0
    average_score: Optional[float] = None
    passed_count: int = 0


class RecruitmentQuizSummary(BaseModel):
    """Summary of quiz results for a recruitment."""
    recruitment_id: int
    total_candidates: int = 0
    candidates_invited: int = 0
    candidates_completed: int = 0
    candidates_pending: int = 0
    average_score: Optional[float] = None
    pass_rate: Optional[float] = None
