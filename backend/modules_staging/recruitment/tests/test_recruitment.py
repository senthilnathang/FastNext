"""
Recruitment Module Tests
"""

import pytest
from datetime import date, datetime
from decimal import Decimal

from ..models.recruitment import (
    Skill, Recruitment, RecruitmentStage, Candidate, Interview, OfferLetter,
    RecruitmentStatus, StageType, CandidateSource,
    OfferStatus, EmploymentType, InterviewStatus
)
from ..schemas.recruitment import (
    RecruitmentCreate, CandidateCreate, InterviewCreate, OfferLetterCreate
)


class TestRecruitmentModel:
    """Tests for Recruitment model."""

    def test_recruitment_creation(self):
        """Test recruitment creation."""
        recruitment = Recruitment(
            title="Software Engineer",
            description="Join our team",
            employment_type=EmploymentType.FULL_TIME,
            vacancy=2,
            status=RecruitmentStatus.DRAFT,
        )
        assert recruitment.title == "Software Engineer"
        assert recruitment.status == RecruitmentStatus.DRAFT

    def test_recruitment_status_values(self):
        """Test recruitment status enum values."""
        assert RecruitmentStatus.DRAFT.value == "draft"
        assert RecruitmentStatus.OPEN.value == "open"
        assert RecruitmentStatus.CLOSED.value == "closed"


class TestStageModel:
    """Tests for RecruitmentStage model."""

    def test_stage_creation(self):
        """Test stage creation."""
        stage = RecruitmentStage(
            recruitment_id=1,
            name="Interview",
            stage_type=StageType.INTERVIEW,
            sequence=2,
        )
        assert stage.name == "Interview"
        assert stage.stage_type == StageType.INTERVIEW

    def test_stage_type_values(self):
        """Test stage type enum values."""
        assert StageType.INITIAL.value == "initial"
        assert StageType.INTERVIEW.value == "interview"
        assert StageType.HIRED.value == "hired"


class TestCandidateModel:
    """Tests for Candidate model."""

    def test_candidate_creation(self):
        """Test candidate creation."""
        candidate = Candidate(
            recruitment_id=1,
            name="John Doe",
            email="john@example.com",
            source=CandidateSource.APPLICATION,
            experience_years=5,
        )
        assert candidate.name == "John Doe"
        assert candidate.source == CandidateSource.APPLICATION

    def test_candidate_source_values(self):
        """Test candidate source enum values."""
        assert CandidateSource.APPLICATION.value == "application"
        assert CandidateSource.REFERRAL.value == "referral"
        assert CandidateSource.LINKEDIN.value == "linkedin"


class TestInterviewModel:
    """Tests for Interview model."""

    def test_interview_creation(self):
        """Test interview creation."""
        interview = Interview(
            candidate_id=1,
            title="Technical Interview",
            interview_type="video",
            scheduled_date=datetime(2024, 3, 15, 10, 0),
            duration_minutes=60,
            status=InterviewStatus.SCHEDULED,
        )
        assert interview.title == "Technical Interview"
        assert interview.status == InterviewStatus.SCHEDULED

    def test_interview_status_values(self):
        """Test interview status enum values."""
        assert InterviewStatus.SCHEDULED.value == "scheduled"
        assert InterviewStatus.COMPLETED.value == "completed"
        assert InterviewStatus.CANCELLED.value == "cancelled"


class TestOfferLetterModel:
    """Tests for OfferLetter model."""

    def test_offer_creation(self):
        """Test offer letter creation."""
        offer = OfferLetter(
            candidate_id=1,
            base_salary=Decimal("100000"),
            salary_currency="USD",
            employment_type=EmploymentType.FULL_TIME,
            status=OfferStatus.DRAFT,
        )
        assert offer.base_salary == Decimal("100000")
        assert offer.status == OfferStatus.DRAFT

    def test_offer_status_values(self):
        """Test offer status enum values."""
        assert OfferStatus.DRAFT.value == "draft"
        assert OfferStatus.SENT.value == "sent"
        assert OfferStatus.ACCEPTED.value == "accepted"
        assert OfferStatus.REJECTED.value == "rejected"


class TestRecruitmentSchemas:
    """Tests for Recruitment schemas."""

    def test_recruitment_create(self):
        """Test recruitment create schema."""
        data = RecruitmentCreate(
            title="Developer",
            vacancy=1,
        )
        assert data.title == "Developer"
        assert data.employment_type == EmploymentType.FULL_TIME  # Default

    def test_candidate_create(self):
        """Test candidate create schema."""
        data = CandidateCreate(
            recruitment_id=1,
            name="Jane Doe",
            email="jane@example.com",
        )
        assert data.name == "Jane Doe"
        assert data.source == CandidateSource.APPLICATION  # Default


class TestRecruitmentService:
    """Tests for RecruitmentService."""

    def test_create_recruitment_with_stages(self):
        """Test recruitment creation creates default stages."""
        # Would test with mock database
        pass

    def test_move_candidate_stage(self):
        """Test moving candidate between stages."""
        # Would test with mock database
        pass

    def test_pipeline_view(self):
        """Test pipeline view generation."""
        # Would test with mock database
        pass


class TestRecruitmentAPI:
    """Tests for Recruitment API endpoints."""

    def test_list_jobs_endpoint(self):
        """Test GET /recruitment/jobs endpoint."""
        # Would test with FastAPI TestClient
        pass

    def test_create_candidate_endpoint(self):
        """Test POST /recruitment/candidates endpoint."""
        # Would test with FastAPI TestClient
        pass

    def test_schedule_interview_endpoint(self):
        """Test POST /recruitment/interviews endpoint."""
        # Would test with FastAPI TestClient
        pass

    def test_accept_offer_endpoint(self):
        """Test POST /recruitment/offers/{id}/accept endpoint."""
        # Would test with FastAPI TestClient
        pass
