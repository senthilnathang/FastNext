"""
Recruitment Service

Business logic for recruitment operations.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List, Tuple, Dict, Any

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from ..models.recruitment import (
    Skill, Recruitment, RecruitmentStage,
    Candidate, CandidateSkill, CandidateRating,
    Interview, InterviewFeedback, OfferLetter,
    RecruitmentStatus, StageType, CandidateSource,
    OfferStatus, InterviewStatus
)
from ..models.survey import CandidateQuizAttempt, recruitment_quizzes
from ..schemas.recruitment import (
    SkillCreate, SkillUpdate,
    RecruitmentCreate, RecruitmentUpdate,
    StageCreate, StageUpdate,
    CandidateCreate, CandidateUpdate, CandidateMoveStage,
    CandidateSkillCreate, CandidateRatingCreate,
    InterviewCreate, InterviewUpdate, InterviewFeedbackCreate,
    OfferLetterCreate, OfferLetterUpdate,
)
from ..schemas.survey import (
    CandidateQuizAttemptCreate, CandidateQuizAttemptUpdate,
    RecruitmentQuizList, RecruitmentQuizResponse, BulkInviteCandidatesToQuiz,
    BulkQuizInviteResult, CandidateQuizSummary, RecruitmentQuizSummary,
)


class RecruitmentService:
    """Service for recruitment operations."""

    def __init__(self, db: Session):
        self.db = db

    # =========================================================================
    # Skill Operations
    # =========================================================================

    def list_skills(
        self, company_id: int, category: Optional[str] = None
    ) -> List[Skill]:
        """List all skills."""
        query = self.db.query(Skill).filter(
            Skill.company_id == company_id,
            Skill.is_deleted == False,
            Skill.is_active == True,
        )
        # Note: Skill model uses 'title' not 'name' or 'category'
        return query.order_by(Skill.title).all()

    def create_skill(
        self, data: SkillCreate, company_id: int, user_id: int
    ) -> Skill:
        """Create a skill."""
        skill = Skill(
            **data.model_dump(),
            company_id=company_id,
            created_by=user_id,
        )
        self.db.add(skill)
        self.db.commit()
        self.db.refresh(skill)
        return skill

    # =========================================================================
    # Quiz Integration Operations (Screening Questionnaires)
    # =========================================================================

    def list_recruitment_quizzes(
        self, recruitment_id: int, company_id: int
    ) -> RecruitmentQuizList:
        """List quizzes assigned to a recruitment."""
        recruitment = self.get_recruitment(recruitment_id, company_id)
        if not recruitment:
            return RecruitmentQuizList(recruitment_id=recruitment_id, quizzes=[])

        quizzes = []
        for quiz in recruitment.screening_quizzes:
            quizzes.append(RecruitmentQuizResponse(
                recruitment_id=recruitment_id,
                quiz_id=quiz.id,
                quiz_title=quiz.title,
                quiz_description=quiz.description,
                quiz_time_limit=quiz.time_limit,
                quiz_passing_score=quiz.passing_score,
            ))
        return RecruitmentQuizList(recruitment_id=recruitment_id, quizzes=quizzes)

    def assign_quizzes_to_recruitment(
        self, recruitment_id: int, quiz_ids: List[int], company_id: int
    ) -> RecruitmentQuizList:
        """Assign screening quizzes to a recruitment."""
        recruitment = self.get_recruitment(recruitment_id, company_id)
        if not recruitment:
            raise ValueError("Recruitment not found")

        # Import Quiz model dynamically to avoid circular imports
        from modules.quiz.models import Quiz

        for quiz_id in quiz_ids:
            quiz = self.db.query(Quiz).filter(Quiz.id == quiz_id).first()
            if quiz and quiz not in recruitment.screening_quizzes:
                recruitment.screening_quizzes.append(quiz)

        self.db.commit()
        return self.list_recruitment_quizzes(recruitment_id, company_id)

    def unassign_quizzes_from_recruitment(
        self, recruitment_id: int, quiz_ids: List[int], company_id: int
    ) -> None:
        """Remove screening quizzes from a recruitment."""
        recruitment = self.get_recruitment(recruitment_id, company_id)
        if not recruitment:
            raise ValueError("Recruitment not found")

        for quiz in recruitment.screening_quizzes[:]:
            if quiz.id in quiz_ids:
                recruitment.screening_quizzes.remove(quiz)

        self.db.commit()

    def invite_candidate_to_quiz(
        self, candidate_id: int, data: CandidateQuizAttemptCreate,
        company_id: int, user_id: int
    ) -> CandidateQuizAttempt:
        """Invite a candidate to take a screening quiz."""
        attempt = CandidateQuizAttempt(
            candidate_id=candidate_id,
            quiz_id=data.quiz_id,
            recruitment_id=data.recruitment_id,
            status="pending",
            expires_at=data.expires_at,
            company_id=company_id,
        )
        self.db.add(attempt)
        self.db.commit()
        self.db.refresh(attempt)
        return attempt

    def list_candidate_quiz_attempts(
        self, candidate_id: int, company_id: int,
        status: Optional[str] = None, skip: int = 0, limit: int = 20
    ) -> Tuple[List[CandidateQuizAttempt], int]:
        """List a candidate's quiz attempts."""
        query = self.db.query(CandidateQuizAttempt).filter(
            CandidateQuizAttempt.candidate_id == candidate_id,
            CandidateQuizAttempt.company_id == company_id,
            CandidateQuizAttempt.is_deleted == False,
        )
        if status:
            query = query.filter(CandidateQuizAttempt.status == status)

        total = query.count()
        attempts = query.order_by(CandidateQuizAttempt.created_at.desc()).offset(skip).limit(limit).all()
        return attempts, total

    def get_candidate_quiz_summary(
        self, candidate_id: int, company_id: int
    ) -> CandidateQuizSummary:
        """Get summary of a candidate's quiz performance."""
        attempts = self.db.query(CandidateQuizAttempt).filter(
            CandidateQuizAttempt.candidate_id == candidate_id,
            CandidateQuizAttempt.company_id == company_id,
            CandidateQuizAttempt.is_deleted == False,
        ).all()

        candidate = self.db.query(Candidate).filter(Candidate.id == candidate_id).first()

        completed = [a for a in attempts if a.status == "completed"]
        pending = [a for a in attempts if a.status in ("pending", "in_progress")]
        expired = [a for a in attempts if a.status == "expired"]

        # Calculate average score from completed quiz attempts
        scores = []
        passed_count = 0
        for attempt in completed:
            if attempt.quiz_attempt and attempt.quiz_attempt.score is not None:
                scores.append(attempt.quiz_attempt.score)
                if attempt.quiz_attempt.passed:
                    passed_count += 1

        return CandidateQuizSummary(
            candidate_id=candidate_id,
            candidate_name=candidate.name if candidate else None,
            total_quizzes_assigned=len(attempts),
            quizzes_completed=len(completed),
            quizzes_pending=len(pending),
            quizzes_expired=len(expired),
            average_score=sum(scores) / len(scores) if scores else None,
            passed_count=passed_count,
        )

    def bulk_invite_candidates_to_quiz(
        self, data: BulkInviteCandidatesToQuiz, company_id: int, user_id: int
    ) -> BulkQuizInviteResult:
        """Bulk invite multiple candidates to take a quiz."""
        from datetime import timedelta

        invited_count = 0
        skipped_candidates = []

        expires_at = None
        if data.expires_in_days:
            expires_at = datetime.utcnow() + timedelta(days=data.expires_in_days)

        for candidate_id in data.candidate_ids:
            # Check if candidate already has a pending invite for this quiz
            existing = self.db.query(CandidateQuizAttempt).filter(
                CandidateQuizAttempt.candidate_id == candidate_id,
                CandidateQuizAttempt.quiz_id == data.quiz_id,
                CandidateQuizAttempt.status.in_(["pending", "in_progress"]),
            ).first()

            if existing:
                skipped_candidates.append(candidate_id)
                continue

            attempt = CandidateQuizAttempt(
                candidate_id=candidate_id,
                quiz_id=data.quiz_id,
                recruitment_id=data.recruitment_id,
                status="pending",
                expires_at=expires_at,
                company_id=company_id,
            )
            self.db.add(attempt)
            invited_count += 1

        self.db.commit()

        return BulkQuizInviteResult(
            invited_count=invited_count,
            skipped_count=len(skipped_candidates),
            skipped_candidates=skipped_candidates,
            message=f"Invited {invited_count} candidates, skipped {len(skipped_candidates)} (already invited)",
        )

    def get_recruitment_quiz_summary(
        self, recruitment_id: int, company_id: int
    ) -> RecruitmentQuizSummary:
        """Get summary of quiz results for a recruitment."""
        recruitment = self.get_recruitment(recruitment_id, company_id)
        if not recruitment:
            return RecruitmentQuizSummary(recruitment_id=recruitment_id)

        # Get all candidates for this recruitment
        candidates = self.db.query(Candidate).filter(
            Candidate.recruitment_id == recruitment_id,
            Candidate.is_deleted == False,
        ).all()

        total_candidates = len(candidates)
        candidate_ids = [c.id for c in candidates]

        if not candidate_ids:
            return RecruitmentQuizSummary(
                recruitment_id=recruitment_id,
                total_candidates=total_candidates,
            )

        # Get quiz attempts for these candidates
        attempts = self.db.query(CandidateQuizAttempt).filter(
            CandidateQuizAttempt.candidate_id.in_(candidate_ids),
            CandidateQuizAttempt.recruitment_id == recruitment_id,
            CandidateQuizAttempt.is_deleted == False,
        ).all()

        invited_candidates = set(a.candidate_id for a in attempts)
        completed_candidates = set(a.candidate_id for a in attempts if a.status == "completed")
        pending_candidates = set(a.candidate_id for a in attempts if a.status in ("pending", "in_progress"))

        # Calculate scores
        scores = []
        passed_count = 0
        for attempt in attempts:
            if attempt.status == "completed" and attempt.quiz_attempt:
                if attempt.quiz_attempt.score is not None:
                    scores.append(attempt.quiz_attempt.score)
                if attempt.quiz_attempt.passed:
                    passed_count += 1

        return RecruitmentQuizSummary(
            recruitment_id=recruitment_id,
            total_candidates=total_candidates,
            candidates_invited=len(invited_candidates),
            candidates_completed=len(completed_candidates),
            candidates_pending=len(pending_candidates),
            average_score=sum(scores) / len(scores) if scores else None,
            pass_rate=passed_count / len(completed_candidates) * 100 if completed_candidates else None,
        )

    # =========================================================================
    # Recruitment Operations
    # =========================================================================

    def list_recruitments(
        self,
        company_id: int,
        status: Optional[RecruitmentStatus] = None,
        department_id: Optional[int] = None,
        is_published: Optional[bool] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[Recruitment], int]:
        """List recruitments with pagination."""
        query = self.db.query(Recruitment).filter(
            Recruitment.company_id == company_id,
            Recruitment.is_deleted == False,
        )
        # Convert status enum to actual model fields
        if status:
            if status.value == 'open':
                query = query.filter(Recruitment.is_published == True, Recruitment.closed == False)
            elif status.value == 'closed':
                query = query.filter(Recruitment.closed == True)
            elif status.value == 'draft':
                query = query.filter(Recruitment.is_published == False, Recruitment.closed == False)
            elif status.value == 'paused':
                # Paused is a special state - published but temporarily closed
                query = query.filter(Recruitment.is_published == True, Recruitment.closed == True)
        if department_id:
            query = query.filter(Recruitment.department_id == department_id)
        if is_published is not None:
            query = query.filter(Recruitment.is_published == is_published)

        total = query.count()
        recruitments = query.order_by(Recruitment.created_at.desc()).offset(skip).limit(limit).all()
        return recruitments, total

    def get_recruitment(self, recruitment_id: int, company_id: int) -> Optional[Recruitment]:
        """Get recruitment by ID."""
        return self.db.query(Recruitment).filter(
            Recruitment.id == recruitment_id,
            Recruitment.company_id == company_id,
            Recruitment.is_deleted == False,
        ).first()

    def create_recruitment(
        self, data: RecruitmentCreate, company_id: int, user_id: int
    ) -> Recruitment:
        """Create a recruitment with default stages."""
        recruitment = Recruitment(
            **data.model_dump(exclude={'manager_ids', 'skill_ids', 'open_position_ids', 'quiz_ids'}),
            company_id=company_id,
            created_by=user_id,
        )
        self.db.add(recruitment)
        self.db.flush()

        # Create default stages
        default_stages = [
            ("Applied", StageType.APPLIED, 0, True, False),
            ("Screening", StageType.TEST, 1, False, False),
            ("Interview", StageType.INTERVIEW, 2, False, False),
            ("Offer", StageType.INTERVIEW, 3, False, False),
            ("Hired", StageType.HIRED, 4, False, True),
            ("Rejected", StageType.CANCELLED, 5, False, True),
        ]

        for name, stage_type, seq, is_initial, is_final in default_stages:
            stage = RecruitmentStage(
                recruitment_id=recruitment.id,
                name=name,
                stage_type=stage_type,
                sequence=seq,
                is_initial=is_initial,
                is_final=is_final,
                company_id=company_id,
                created_by=user_id,
            )
            self.db.add(stage)

        self.db.commit()
        self.db.refresh(recruitment)
        return recruitment

    def update_recruitment(
        self, recruitment_id: int, data: RecruitmentUpdate, company_id: int, user_id: int
    ) -> Optional[Recruitment]:
        """Update a recruitment."""
        recruitment = self.get_recruitment(recruitment_id, company_id)
        if not recruitment:
            return None
        for key, value in data.model_dump(exclude_unset=True, exclude={'manager_ids', 'skill_ids'}).items():
            setattr(recruitment, key, value)
        recruitment.updated_by = user_id
        self.db.commit()
        self.db.refresh(recruitment)
        return recruitment

    def publish_recruitment(
        self, recruitment_id: int, company_id: int, user_id: int
    ) -> Optional[Recruitment]:
        """Publish a recruitment."""
        recruitment = self.get_recruitment(recruitment_id, company_id)
        if not recruitment:
            return None
        recruitment.is_published = True
        recruitment.status = RecruitmentStatus.OPEN
        if not recruitment.start_date:
            recruitment.start_date = date.today()
        recruitment.updated_by = user_id
        self.db.commit()
        self.db.refresh(recruitment)
        return recruitment

    def close_recruitment(
        self, recruitment_id: int, company_id: int, user_id: int
    ) -> Optional[Recruitment]:
        """Close a recruitment."""
        recruitment = self.get_recruitment(recruitment_id, company_id)
        if not recruitment:
            return None
        recruitment.status = RecruitmentStatus.CLOSED
        recruitment.end_date = date.today()
        recruitment.updated_by = user_id
        self.db.commit()
        self.db.refresh(recruitment)
        return recruitment

    # =========================================================================
    # Stage Operations
    # =========================================================================

    def list_stages(self, recruitment_id: int, company_id: int) -> List[RecruitmentStage]:
        """List stages for a recruitment."""
        return self.db.query(RecruitmentStage).filter(
            RecruitmentStage.recruitment_id == recruitment_id,
            RecruitmentStage.company_id == company_id,
            RecruitmentStage.is_deleted == False,
        ).order_by(RecruitmentStage.sequence).all()

    def create_stage(
        self, data: StageCreate, company_id: int, user_id: int
    ) -> RecruitmentStage:
        """Create a stage."""
        stage = RecruitmentStage(
            **data.model_dump(exclude={'manager_ids'}),
            company_id=company_id,
            created_by=user_id,
        )
        self.db.add(stage)
        self.db.commit()
        self.db.refresh(stage)
        return stage

    def update_stage(
        self, stage_id: int, data: StageUpdate, company_id: int, user_id: int
    ) -> Optional[RecruitmentStage]:
        """Update a stage."""
        stage = self.db.query(RecruitmentStage).filter(
            RecruitmentStage.id == stage_id,
            RecruitmentStage.company_id == company_id,
            RecruitmentStage.is_deleted == False,
        ).first()
        if not stage:
            return None
        for key, value in data.model_dump(exclude_unset=True, exclude={'manager_ids'}).items():
            setattr(stage, key, value)
        stage.updated_by = user_id
        self.db.commit()
        self.db.refresh(stage)
        return stage

    # =========================================================================
    # Candidate Operations
    # =========================================================================

    def list_candidates(
        self,
        company_id: int,
        recruitment_id: Optional[int] = None,
        stage_id: Optional[int] = None,
        source: Optional[CandidateSource] = None,
        is_hired: Optional[bool] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[Candidate], int]:
        """List candidates with pagination."""
        query = self.db.query(Candidate).filter(
            Candidate.company_id == company_id,
            Candidate.is_deleted == False,
        )
        if recruitment_id:
            query = query.filter(Candidate.recruitment_id == recruitment_id)
        if stage_id:
            query = query.filter(Candidate.stage_id == stage_id)
        if source:
            query = query.filter(Candidate.source == source)
        if is_hired is not None:
            query = query.filter(Candidate.is_hired == is_hired)
        if search:
            query = query.filter(
                or_(
                    Candidate.name.ilike(f"%{search}%"),
                    Candidate.email.ilike(f"%{search}%"),
                )
            )

        total = query.count()
        candidates = query.order_by(Candidate.created_at.desc()).offset(skip).limit(limit).all()
        return candidates, total

    def get_candidate(self, candidate_id: int, company_id: int) -> Optional[Candidate]:
        """Get candidate by ID."""
        return self.db.query(Candidate).filter(
            Candidate.id == candidate_id,
            Candidate.company_id == company_id,
            Candidate.is_deleted == False,
        ).first()

    def create_candidate(
        self, data: CandidateCreate, company_id: int, user_id: int
    ) -> Candidate:
        """Create a candidate."""
        # Get initial stage if not provided
        stage_id = data.stage_id
        if not stage_id:
            initial_stage = self.db.query(RecruitmentStage).filter(
                RecruitmentStage.recruitment_id == data.recruitment_id,
                RecruitmentStage.is_initial == True,
            ).first()
            if initial_stage:
                stage_id = initial_stage.id

        candidate = Candidate(
            **data.model_dump(exclude={'skills', 'application_data'}),
            stage_id=stage_id,
            application_data=data.application_data,
            application_date=date.today(),
            company_id=company_id,
            created_by=user_id,
        )
        self.db.add(candidate)
        self.db.flush()

        # Add skills
        for skill_data in data.skills:
            skill = CandidateSkill(
                candidate_id=candidate.id,
                **skill_data.model_dump(),
            )
            self.db.add(skill)

        self.db.commit()
        self.db.refresh(candidate)
        return candidate

    def update_candidate(
        self, candidate_id: int, data: CandidateUpdate, company_id: int, user_id: int
    ) -> Optional[Candidate]:
        """Update a candidate."""
        candidate = self.get_candidate(candidate_id, company_id)
        if not candidate:
            return None
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(candidate, key, value)
        candidate.updated_by = user_id
        self.db.commit()
        self.db.refresh(candidate)
        return candidate

    def move_candidate_stage(
        self, candidate_id: int, data: CandidateMoveStage, company_id: int, user_id: int
    ) -> Optional[Candidate]:
        """Move candidate to a different stage."""
        candidate = self.get_candidate(candidate_id, company_id)
        if not candidate:
            return None

        # Get new stage
        new_stage = self.db.query(RecruitmentStage).filter(
            RecruitmentStage.id == data.stage_id,
            RecruitmentStage.recruitment_id == candidate.recruitment_id,
        ).first()
        if not new_stage:
            return None

        candidate.stage_id = new_stage.id

        # Check if hired
        if new_stage.stage_type == StageType.HIRED:
            candidate.is_hired = True
            candidate.hired_date = date.today()

        candidate.updated_by = user_id
        self.db.commit()
        self.db.refresh(candidate)
        return candidate

    def add_candidate_rating(
        self, data: CandidateRatingCreate, evaluator_id: int, company_id: int
    ) -> CandidateRating:
        """Add rating to a candidate."""
        rating = CandidateRating(
            **data.model_dump(),
            evaluator_id=evaluator_id,
            company_id=company_id,
        )
        self.db.add(rating)
        self.db.flush()

        # Update candidate's overall rating
        candidate = self.get_candidate(data.candidate_id, company_id)
        if candidate:
            avg_rating = self.db.query(func.avg(CandidateRating.rating)).filter(
                CandidateRating.candidate_id == data.candidate_id
            ).scalar()
            candidate.overall_rating = avg_rating or Decimal("0")

        self.db.commit()
        self.db.refresh(rating)
        return rating

    # =========================================================================
    # Interview Operations
    # =========================================================================

    def list_interviews(
        self,
        company_id: int,
        candidate_id: Optional[int] = None,
        interviewer_id: Optional[int] = None,
        status: Optional[InterviewStatus] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[Interview], int]:
        """List interviews with pagination."""
        query = self.db.query(Interview).filter(
            Interview.company_id == company_id,
            Interview.is_deleted == False,
        )
        if candidate_id:
            query = query.filter(Interview.candidate_id == candidate_id)
        if status:
            query = query.filter(Interview.status == status)
        if start_date:
            query = query.filter(Interview.scheduled_date >= start_date)
        if end_date:
            query = query.filter(Interview.scheduled_date <= end_date)

        total = query.count()
        interviews = query.order_by(Interview.scheduled_date.desc()).offset(skip).limit(limit).all()
        return interviews, total

    def get_interview(self, interview_id: int, company_id: int) -> Optional[Interview]:
        """Get interview by ID."""
        return self.db.query(Interview).filter(
            Interview.id == interview_id,
            Interview.company_id == company_id,
            Interview.is_deleted == False,
        ).first()

    def create_interview(
        self, data: InterviewCreate, company_id: int, user_id: int
    ) -> Interview:
        """Create an interview."""
        interview = Interview(
            **data.model_dump(),
            company_id=company_id,
            created_by=user_id,
        )
        self.db.add(interview)
        self.db.commit()
        self.db.refresh(interview)
        return interview

    def update_interview(
        self, interview_id: int, data: InterviewUpdate, company_id: int, user_id: int
    ) -> Optional[Interview]:
        """Update an interview."""
        interview = self.get_interview(interview_id, company_id)
        if not interview:
            return None
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(interview, key, value)
        interview.updated_by = user_id
        self.db.commit()
        self.db.refresh(interview)
        return interview

    def add_interview_feedback(
        self, data: InterviewFeedbackCreate, interviewer_id: int, company_id: int
    ) -> InterviewFeedback:
        """Add feedback to an interview."""
        feedback = InterviewFeedback(
            **data.model_dump(),
            interviewer_id=interviewer_id,
            company_id=company_id,
        )
        self.db.add(feedback)
        self.db.commit()
        self.db.refresh(feedback)
        return feedback

    def complete_interview(
        self, interview_id: int, company_id: int, user_id: int
    ) -> Optional[Interview]:
        """Mark interview as completed."""
        interview = self.get_interview(interview_id, company_id)
        if not interview:
            return None
        interview.status = InterviewStatus.COMPLETED
        interview.actual_end = datetime.utcnow()
        interview.updated_by = user_id
        self.db.commit()
        self.db.refresh(interview)
        return interview

    # =========================================================================
    # Offer Letter Operations
    # =========================================================================

    def list_offers(
        self,
        company_id: int,
        candidate_id: Optional[int] = None,
        status: Optional[OfferStatus] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[OfferLetter], int]:
        """List offer letters with pagination."""
        query = self.db.query(OfferLetter).filter(
            OfferLetter.company_id == company_id,
            OfferLetter.is_deleted == False,
        )
        if candidate_id:
            query = query.filter(OfferLetter.candidate_id == candidate_id)
        if status:
            query = query.filter(OfferLetter.status == status)

        total = query.count()
        offers = query.order_by(OfferLetter.created_at.desc()).offset(skip).limit(limit).all()
        return offers, total

    def get_offer(self, offer_id: int, company_id: int) -> Optional[OfferLetter]:
        """Get offer letter by ID."""
        return self.db.query(OfferLetter).filter(
            OfferLetter.id == offer_id,
            OfferLetter.company_id == company_id,
            OfferLetter.is_deleted == False,
        ).first()

    def create_offer(
        self, data: OfferLetterCreate, company_id: int, user_id: int
    ) -> OfferLetter:
        """Create an offer letter."""
        offer = OfferLetter(
            **data.model_dump(),
            company_id=company_id,
            created_by=user_id,
        )
        self.db.add(offer)
        self.db.commit()
        self.db.refresh(offer)
        return offer

    def update_offer(
        self, offer_id: int, data: OfferLetterUpdate, company_id: int, user_id: int
    ) -> Optional[OfferLetter]:
        """Update an offer letter."""
        offer = self.get_offer(offer_id, company_id)
        if not offer:
            return None
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(offer, key, value)
        offer.updated_by = user_id
        self.db.commit()
        self.db.refresh(offer)
        return offer

    def approve_offer(
        self, offer_id: int, company_id: int, user_id: int
    ) -> Optional[OfferLetter]:
        """Approve an offer letter."""
        offer = self.get_offer(offer_id, company_id)
        if not offer or offer.status != OfferStatus.PENDING_APPROVAL:
            return None
        offer.status = OfferStatus.APPROVED
        offer.approved_by_id = user_id
        offer.approved_date = datetime.utcnow()
        offer.updated_by = user_id
        self.db.commit()
        self.db.refresh(offer)
        return offer

    def send_offer(
        self, offer_id: int, company_id: int, user_id: int
    ) -> Optional[OfferLetter]:
        """Send an offer letter to candidate."""
        offer = self.get_offer(offer_id, company_id)
        if not offer or offer.status != OfferStatus.APPROVED:
            return None
        offer.status = OfferStatus.SENT
        offer.sent_date = datetime.utcnow()
        offer.updated_by = user_id
        self.db.commit()
        self.db.refresh(offer)
        return offer

    def accept_offer(
        self, offer_id: int, company_id: int
    ) -> Optional[OfferLetter]:
        """Mark offer as accepted."""
        offer = self.get_offer(offer_id, company_id)
        if not offer or offer.status != OfferStatus.SENT:
            return None
        offer.status = OfferStatus.ACCEPTED
        offer.response_date = datetime.utcnow()

        # Mark candidate as hired
        candidate = self.get_candidate(offer.candidate_id, company_id)
        if candidate:
            candidate.is_hired = True
            candidate.hired_date = date.today()

        self.db.commit()
        self.db.refresh(offer)
        return offer

    def reject_offer(
        self, offer_id: int, company_id: int, reason: str
    ) -> Optional[OfferLetter]:
        """Mark offer as rejected."""
        offer = self.get_offer(offer_id, company_id)
        if not offer or offer.status != OfferStatus.SENT:
            return None
        offer.status = OfferStatus.REJECTED
        offer.response_date = datetime.utcnow()
        offer.rejection_reason = reason
        self.db.commit()
        self.db.refresh(offer)
        return offer

    # =========================================================================
    # Pipeline View
    # =========================================================================

    def get_pipeline(self, recruitment_id: int, company_id: int) -> Dict[str, Any]:
        """Get pipeline view for a recruitment."""
        recruitment = self.get_recruitment(recruitment_id, company_id)
        if not recruitment:
            return {}

        stages = self.list_stages(recruitment_id, company_id)
        pipeline = []

        for stage in stages:
            candidates, _ = self.list_candidates(
                company_id=company_id,
                recruitment_id=recruitment_id,
                stage_id=stage.id,
                limit=100,
            )
            pipeline.append({
                "stage": stage,
                "candidates": candidates,
                "count": len(candidates),
            })

        return {
            "recruitment": recruitment,
            "stages": pipeline,
            "total_candidates": sum(s["count"] for s in pipeline),
        }

    # =========================================================================
    # Reports
    # =========================================================================

    def get_hiring_stats(
        self, company_id: int, start_date: date, end_date: date
    ) -> Dict[str, Any]:
        """Get hiring statistics."""
        # Total openings
        openings = self.db.query(func.count(Recruitment.id)).filter(
            Recruitment.company_id == company_id,
            Recruitment.created_at >= start_date,
            Recruitment.created_at <= end_date,
        ).scalar()

        # Total applications
        applications = self.db.query(func.count(Candidate.id)).filter(
            Candidate.company_id == company_id,
            Candidate.created_at >= start_date,
            Candidate.created_at <= end_date,
        ).scalar()

        # Total hired
        hired = self.db.query(func.count(Candidate.id)).filter(
            Candidate.company_id == company_id,
            Candidate.hired == True,
            Candidate.hired_date >= start_date,
            Candidate.hired_date <= end_date,
        ).scalar()

        # Total offers
        offers = self.db.query(func.count(OfferLetter.id)).filter(
            OfferLetter.company_id == company_id,
            OfferLetter.created_at >= start_date,
            OfferLetter.created_at <= end_date,
        ).scalar()

        return {
            "period_start": start_date,
            "period_end": end_date,
            "total_openings": openings or 0,
            "total_applications": applications or 0,
            "total_hired": hired or 0,
            "total_offers": offers or 0,
        }
