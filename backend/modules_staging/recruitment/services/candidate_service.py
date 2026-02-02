"""
Candidate Service

Business logic for candidate management operations.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List, Tuple, Dict, Any

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from ..models.recruitment import (
    Candidate, RecruitmentStage, Recruitment, RejectReason, RejectedCandidate,
    StageNote, StageFiles
)
from ..models.skill_zone import SkillZone, SkillZoneCandidate, CandidateRating
from ..models.advanced import (
    TalentPool, TalentPoolCandidate, CandidateTag, CandidateSourceChannel,
    CandidateScore, CandidateScorecard, ScoringCriteria
)
from ..models.documents import CandidateDocument, CandidateDocumentRequest


class CandidateService:
    """Service for candidate operations."""

    def __init__(self, db: Session):
        self.db = db

    # =========================================================================
    # Candidate CRUD Operations
    # =========================================================================

    def list_candidates(
        self,
        company_id: int,
        recruitment_id: Optional[int] = None,
        stage_id: Optional[int] = None,
        source: Optional[str] = None,
        is_hired: Optional[bool] = None,
        is_canceled: Optional[bool] = None,
        search: Optional[str] = None,
        tag_ids: Optional[List[int]] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[Candidate], int]:
        """List candidates with pagination and filters."""
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
            query = query.filter(Candidate.hired == is_hired)
        if is_canceled is not None:
            query = query.filter(Candidate.canceled == is_canceled)
        if search:
            query = query.filter(
                or_(
                    Candidate.name.ilike(f"%{search}%"),
                    Candidate.email.ilike(f"%{search}%"),
                    Candidate.mobile.ilike(f"%{search}%"),
                )
            )
        if tag_ids:
            query = query.join(Candidate.tags).filter(CandidateTag.id.in_(tag_ids))

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

    def get_candidate_by_email(
        self, email: str, recruitment_id: int, company_id: int
    ) -> Optional[Candidate]:
        """Get candidate by email for a specific recruitment."""
        return self.db.query(Candidate).filter(
            Candidate.email == email,
            Candidate.recruitment_id == recruitment_id,
            Candidate.company_id == company_id,
            Candidate.is_deleted == False,
        ).first()

    def create_candidate(
        self,
        data: Dict[str, Any],
        company_id: int,
        user_id: int
    ) -> Candidate:
        """Create a new candidate."""
        # Get initial stage if not provided
        stage_id = data.get('stage_id')
        if not stage_id and data.get('recruitment_id'):
            initial_stage = self.db.query(RecruitmentStage).filter(
                RecruitmentStage.recruitment_id == data['recruitment_id'],
                RecruitmentStage.stage_type == 'initial',
                RecruitmentStage.is_deleted == False,
            ).first()
            if initial_stage:
                stage_id = initial_stage.id

        candidate = Candidate(
            name=data.get('name'),
            email=data['email'],
            mobile=data.get('mobile'),
            gender=data.get('gender', 'male'),
            dob=data.get('dob'),
            profile=data.get('profile'),
            resume=data.get('resume'),
            portfolio=data.get('portfolio'),
            address=data.get('address'),
            country=data.get('country'),
            state=data.get('state'),
            city=data.get('city'),
            zip=data.get('zip'),
            recruitment_id=data.get('recruitment_id'),
            job_position_id=data.get('job_position_id'),
            stage_id=stage_id,
            referral_id=data.get('referral_id'),
            source=data.get('source', 'application'),
            source_channel_id=data.get('source_channel_id'),
            company_id=company_id,
            created_by=user_id,
        )
        self.db.add(candidate)
        self.db.commit()
        self.db.refresh(candidate)
        return candidate

    def update_candidate(
        self,
        candidate_id: int,
        data: Dict[str, Any],
        company_id: int,
        user_id: int
    ) -> Optional[Candidate]:
        """Update a candidate."""
        candidate = self.get_candidate(candidate_id, company_id)
        if not candidate:
            return None

        update_fields = [
            'name', 'email', 'mobile', 'gender', 'dob', 'profile', 'resume',
            'portfolio', 'address', 'country', 'state', 'city', 'zip',
            'job_position_id', 'source', 'source_channel_id', 'is_active'
        ]

        for field in update_fields:
            if field in data and data[field] is not None:
                setattr(candidate, field, data[field])

        candidate.updated_by = user_id
        candidate.last_updated = date.today()
        self.db.commit()
        self.db.refresh(candidate)
        return candidate

    def delete_candidate(
        self, candidate_id: int, company_id: int, user_id: int
    ) -> bool:
        """Soft delete a candidate."""
        candidate = self.get_candidate(candidate_id, company_id)
        if not candidate:
            return False

        candidate.is_deleted = True
        candidate.deleted_by = user_id
        candidate.deleted_at = datetime.utcnow()
        self.db.commit()
        return True

    # =========================================================================
    # Stage Management
    # =========================================================================

    def move_to_stage(
        self,
        candidate_id: int,
        stage_id: int,
        company_id: int,
        user_id: int,
        notes: Optional[str] = None
    ) -> Optional[Candidate]:
        """Move candidate to a different stage."""
        candidate = self.get_candidate(candidate_id, company_id)
        if not candidate:
            return None

        # Verify stage belongs to same recruitment
        new_stage = self.db.query(RecruitmentStage).filter(
            RecruitmentStage.id == stage_id,
            RecruitmentStage.recruitment_id == candidate.recruitment_id,
            RecruitmentStage.is_deleted == False,
        ).first()

        if not new_stage:
            return None

        old_stage_id = candidate.stage_id
        candidate.stage_id = new_stage.id
        candidate.updated_by = user_id
        candidate.last_updated = date.today()

        # Check if moved to hired stage
        if new_stage.stage_type == 'hired':
            candidate.hired = True
            candidate.hired_date = date.today()

        # Add stage note if provided
        if notes:
            stage_note = StageNote(
                candidate_id=candidate_id,
                stage_id=stage_id,
                description=notes,
                updated_by_id=user_id,
                company_id=company_id,
            )
            self.db.add(stage_note)

        self.db.commit()
        self.db.refresh(candidate)
        return candidate

    def hire_candidate(
        self,
        candidate_id: int,
        company_id: int,
        user_id: int,
        joining_date: Optional[date] = None,
        probation_end: Optional[date] = None
    ) -> Optional[Candidate]:
        """Mark candidate as hired."""
        candidate = self.get_candidate(candidate_id, company_id)
        if not candidate:
            return None

        candidate.hired = True
        candidate.hired_date = date.today()
        candidate.joining_date = joining_date
        candidate.probation_end = probation_end
        candidate.updated_by = user_id
        candidate.last_updated = date.today()

        self.db.commit()
        self.db.refresh(candidate)
        return candidate

    def cancel_candidate(
        self,
        candidate_id: int,
        company_id: int,
        user_id: int,
        reason: Optional[str] = None
    ) -> Optional[Candidate]:
        """Cancel/withdraw a candidate."""
        candidate = self.get_candidate(candidate_id, company_id)
        if not candidate:
            return None

        candidate.canceled = True
        candidate.updated_by = user_id
        candidate.last_updated = date.today()

        self.db.commit()
        self.db.refresh(candidate)
        return candidate

    # =========================================================================
    # Rejection Operations
    # =========================================================================

    def reject_candidate(
        self,
        candidate_id: int,
        company_id: int,
        user_id: int,
        reason_ids: List[int],
        description: str
    ) -> Optional[RejectedCandidate]:
        """Reject a candidate with reasons."""
        candidate = self.get_candidate(candidate_id, company_id)
        if not candidate:
            return None

        # Get reject reasons
        reasons = self.db.query(RejectReason).filter(
            RejectReason.id.in_(reason_ids),
            RejectReason.company_id == company_id,
            RejectReason.is_deleted == False,
        ).all()

        rejected = RejectedCandidate(
            candidate_id=candidate_id,
            description=description,
            company_id=company_id,
            created_by=user_id,
        )
        rejected.reject_reasons = reasons

        candidate.canceled = True
        candidate.updated_by = user_id
        candidate.last_updated = date.today()

        self.db.add(rejected)
        self.db.commit()
        self.db.refresh(rejected)
        return rejected

    def list_reject_reasons(self, company_id: int) -> List[RejectReason]:
        """List all rejection reasons."""
        return self.db.query(RejectReason).filter(
            RejectReason.company_id == company_id,
            RejectReason.is_deleted == False,
            RejectReason.is_active == True,
        ).order_by(RejectReason.title).all()

    def create_reject_reason(
        self, title: str, description: Optional[str], company_id: int, user_id: int
    ) -> RejectReason:
        """Create a rejection reason."""
        reason = RejectReason(
            title=title,
            description=description,
            company_id=company_id,
            created_by=user_id,
        )
        self.db.add(reason)
        self.db.commit()
        self.db.refresh(reason)
        return reason

    # =========================================================================
    # Rating Operations
    # =========================================================================

    def add_rating(
        self,
        candidate_id: int,
        rating: int,
        employee_id: int,
        company_id: int
    ) -> CandidateRating:
        """Add or update rating for a candidate."""
        # Check if rating exists
        existing = self.db.query(CandidateRating).filter(
            CandidateRating.candidate_id == candidate_id,
            CandidateRating.employee_id == employee_id,
        ).first()

        if existing:
            existing.rating = rating
            self.db.commit()
            self.db.refresh(existing)
            return existing

        new_rating = CandidateRating(
            candidate_id=candidate_id,
            employee_id=employee_id,
            rating=rating,
            company_id=company_id,
        )
        self.db.add(new_rating)
        self.db.commit()
        self.db.refresh(new_rating)
        return new_rating

    def get_candidate_ratings(
        self, candidate_id: int, company_id: int
    ) -> List[CandidateRating]:
        """Get all ratings for a candidate."""
        return self.db.query(CandidateRating).filter(
            CandidateRating.candidate_id == candidate_id,
            CandidateRating.company_id == company_id,
            CandidateRating.is_deleted == False,
        ).all()

    def get_average_rating(self, candidate_id: int) -> Optional[Decimal]:
        """Get average rating for a candidate."""
        result = self.db.query(func.avg(CandidateRating.rating)).filter(
            CandidateRating.candidate_id == candidate_id,
            CandidateRating.is_deleted == False,
        ).scalar()
        return Decimal(str(result)) if result else None

    # =========================================================================
    # Stage Notes Operations
    # =========================================================================

    def add_stage_note(
        self,
        candidate_id: int,
        stage_id: int,
        description: str,
        company_id: int,
        user_id: int,
        candidate_can_view: bool = False
    ) -> StageNote:
        """Add a note for candidate at a stage."""
        note = StageNote(
            candidate_id=candidate_id,
            stage_id=stage_id,
            description=description,
            updated_by_id=user_id,
            candidate_can_view=candidate_can_view,
            company_id=company_id,
        )
        self.db.add(note)
        self.db.commit()
        self.db.refresh(note)
        return note

    def get_stage_notes(
        self, candidate_id: int, company_id: int, stage_id: Optional[int] = None
    ) -> List[StageNote]:
        """Get stage notes for a candidate."""
        query = self.db.query(StageNote).filter(
            StageNote.candidate_id == candidate_id,
            StageNote.company_id == company_id,
            StageNote.is_deleted == False,
        )
        if stage_id:
            query = query.filter(StageNote.stage_id == stage_id)
        return query.order_by(StageNote.created_at.desc()).all()

    # =========================================================================
    # Tag Operations
    # =========================================================================

    def list_tags(self, company_id: int) -> List[CandidateTag]:
        """List all candidate tags."""
        return self.db.query(CandidateTag).filter(
            CandidateTag.company_id == company_id,
            CandidateTag.is_deleted == False,
            CandidateTag.is_active == True,
        ).order_by(CandidateTag.name).all()

    def create_tag(
        self,
        name: str,
        color: str,
        company_id: int,
        user_id: int,
        description: Optional[str] = None
    ) -> CandidateTag:
        """Create a candidate tag."""
        tag = CandidateTag(
            name=name,
            color=color,
            description=description,
            company_id=company_id,
            created_by=user_id,
        )
        self.db.add(tag)
        self.db.commit()
        self.db.refresh(tag)
        return tag

    def add_tags_to_candidate(
        self, candidate_id: int, tag_ids: List[int], company_id: int
    ) -> Optional[Candidate]:
        """Add tags to a candidate."""
        candidate = self.get_candidate(candidate_id, company_id)
        if not candidate:
            return None

        tags = self.db.query(CandidateTag).filter(
            CandidateTag.id.in_(tag_ids),
            CandidateTag.company_id == company_id,
            CandidateTag.is_deleted == False,
        ).all()

        for tag in tags:
            if tag not in candidate.tags:
                candidate.tags.append(tag)

        self.db.commit()
        self.db.refresh(candidate)
        return candidate

    def remove_tag_from_candidate(
        self, candidate_id: int, tag_id: int, company_id: int
    ) -> Optional[Candidate]:
        """Remove a tag from a candidate."""
        candidate = self.get_candidate(candidate_id, company_id)
        if not candidate:
            return None

        tag = self.db.query(CandidateTag).filter(
            CandidateTag.id == tag_id,
            CandidateTag.company_id == company_id,
        ).first()

        if tag and tag in candidate.tags:
            candidate.tags.remove(tag)
            self.db.commit()
            self.db.refresh(candidate)

        return candidate

    # =========================================================================
    # Source Channel Operations
    # =========================================================================

    def list_source_channels(self, company_id: int) -> List[CandidateSourceChannel]:
        """List all source channels."""
        return self.db.query(CandidateSourceChannel).filter(
            CandidateSourceChannel.company_id == company_id,
            CandidateSourceChannel.is_deleted == False,
            CandidateSourceChannel.is_active == True,
        ).order_by(CandidateSourceChannel.name).all()

    def create_source_channel(
        self,
        name: str,
        channel_type: str,
        company_id: int,
        user_id: int,
        description: Optional[str] = None,
        url: Optional[str] = None
    ) -> CandidateSourceChannel:
        """Create a source channel."""
        channel = CandidateSourceChannel(
            name=name,
            channel_type=channel_type,
            description=description,
            url=url,
            company_id=company_id,
            created_by=user_id,
        )
        self.db.add(channel)
        self.db.commit()
        self.db.refresh(channel)
        return channel

    # =========================================================================
    # Scoring Operations
    # =========================================================================

    def add_candidate_score(
        self,
        candidate_id: int,
        criteria_id: int,
        score: Decimal,
        company_id: int,
        user_id: int,
        notes: Optional[str] = None
    ) -> CandidateScore:
        """Add a score for a candidate on a criteria."""
        candidate_score = CandidateScore(
            candidate_id=candidate_id,
            criteria_id=criteria_id,
            score=score,
            notes=notes,
            scored_by_id=user_id,
            company_id=company_id,
        )
        self.db.add(candidate_score)
        self.db.commit()
        self.db.refresh(candidate_score)
        return candidate_score

    def get_candidate_scores(
        self, candidate_id: int, company_id: int
    ) -> List[CandidateScore]:
        """Get all scores for a candidate."""
        return self.db.query(CandidateScore).filter(
            CandidateScore.candidate_id == candidate_id,
            CandidateScore.company_id == company_id,
            CandidateScore.is_deleted == False,
        ).all()

    def get_candidate_scorecard(
        self, candidate_id: int, company_id: int
    ) -> Optional[CandidateScorecard]:
        """Get scorecard for a candidate."""
        return self.db.query(CandidateScorecard).filter(
            CandidateScorecard.candidate_id == candidate_id,
            CandidateScorecard.company_id == company_id,
            CandidateScorecard.is_deleted == False,
        ).first()

    # =========================================================================
    # Document Operations
    # =========================================================================

    def list_candidate_documents(
        self, candidate_id: int, company_id: int
    ) -> List[CandidateDocument]:
        """List documents for a candidate."""
        return self.db.query(CandidateDocument).filter(
            CandidateDocument.candidate_id == candidate_id,
            CandidateDocument.company_id == company_id,
            CandidateDocument.is_deleted == False,
        ).all()

    def add_candidate_document(
        self,
        candidate_id: int,
        title: str,
        document_path: str,
        company_id: int,
        user_id: int,
        document_request_id: Optional[int] = None
    ) -> CandidateDocument:
        """Add a document for a candidate."""
        doc = CandidateDocument(
            candidate_id=candidate_id,
            title=title,
            document=document_path,
            document_request_id=document_request_id,
            status='approved',
            company_id=company_id,
            created_by=user_id,
        )
        self.db.add(doc)
        self.db.commit()
        self.db.refresh(doc)
        return doc

    def update_document_status(
        self,
        document_id: int,
        status: str,
        company_id: int,
        user_id: int,
        reject_reason: Optional[str] = None
    ) -> Optional[CandidateDocument]:
        """Update document status."""
        doc = self.db.query(CandidateDocument).filter(
            CandidateDocument.id == document_id,
            CandidateDocument.company_id == company_id,
            CandidateDocument.is_deleted == False,
        ).first()

        if not doc:
            return None

        doc.status = status
        if reject_reason:
            doc.reject_reason = reject_reason
        doc.updated_by = user_id

        self.db.commit()
        self.db.refresh(doc)
        return doc

    # =========================================================================
    # Bulk Operations
    # =========================================================================

    def bulk_move_to_stage(
        self,
        candidate_ids: List[int],
        stage_id: int,
        company_id: int,
        user_id: int
    ) -> int:
        """Move multiple candidates to a stage. Returns count of moved candidates."""
        moved_count = 0
        for candidate_id in candidate_ids:
            result = self.move_to_stage(candidate_id, stage_id, company_id, user_id)
            if result:
                moved_count += 1
        return moved_count

    def bulk_add_tags(
        self,
        candidate_ids: List[int],
        tag_ids: List[int],
        company_id: int
    ) -> int:
        """Add tags to multiple candidates. Returns count of updated candidates."""
        updated_count = 0
        for candidate_id in candidate_ids:
            result = self.add_tags_to_candidate(candidate_id, tag_ids, company_id)
            if result:
                updated_count += 1
        return updated_count
