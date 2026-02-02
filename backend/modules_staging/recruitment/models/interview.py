"""
Interview Models

Interview scheduling and feedback models: InterviewSchedule, InterviewScorecardTemplate,
InterviewFeedback, InterviewAvailability, InterviewQuestion.
"""

from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Date, DateTime, Time,
    ForeignKey, Numeric, JSON, Table, UniqueConstraint
)
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.base import TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin


# Association table for Interview employees (interviewers)
interview_employees = Table(
    'recruitment_interview_employees',
    Base.metadata,
    Column('interview_id', Integer, ForeignKey('recruitment_interview_schedule.id'), primary_key=True),
    Column('employee_id', Integer, ForeignKey('employee_employees.id'), primary_key=True),
)


class InterviewSchedule(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """Interview scheduling model with advanced features."""

    __tablename__ = "recruitment_interview_schedule"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("recruitment_candidate.id"), nullable=False)

    # Basic scheduling
    interview_date = Column(Date, nullable=False)
    interview_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=True)
    description = Column(Text, nullable=True)
    completed = Column(Boolean, default=False)

    # Interview type: phone, video, onsite, technical, hr, panel, final, assessment, culture_fit
    interview_type = Column(String(20), default="technical")

    # Status: scheduled, confirmed, in_progress, completed, cancelled, rescheduled, no_show, pending_feedback
    status = Column(String(20), default="scheduled")

    # Result: pending, pass, fail, strong_hire, hire, no_hire, strong_no_hire, hold
    result = Column(String(20), default="pending")

    round_number = Column(Integer, default=1)
    duration_minutes = Column(Integer, default=60)

    # Location & Meeting
    location = Column(String(255), nullable=True)
    meeting_link = Column(String(500), nullable=True)
    meeting_id = Column(String(100), nullable=True)
    meeting_password = Column(String(50), nullable=True)

    # Feedback & Rating
    overall_rating = Column(Numeric(3, 1), nullable=True)
    overall_feedback = Column(Text, nullable=True)
    next_steps = Column(Text, nullable=True)
    strengths = Column(Text, nullable=True)
    areas_of_improvement = Column(Text, nullable=True)

    # Calendar & Notifications
    timezone = Column(String(50), default="UTC")
    calendar_event_id = Column(String(255), nullable=True)
    reminder_sent = Column(Boolean, default=False)
    reminder_time = Column(DateTime, nullable=True)
    candidate_notified = Column(Boolean, default=False)
    interviewers_notified = Column(Boolean, default=False)

    # Interview Kit
    interview_kit = Column(Text, nullable=True)
    scorecard_template_id = Column(Integer, ForeignKey("recruitment_interview_scorecard_template.id"), nullable=True)

    # Rescheduling tracking
    rescheduled_from_id = Column(Integer, ForeignKey("recruitment_interview_schedule.id"), nullable=True)
    reschedule_reason = Column(Text, nullable=True)
    reschedule_count = Column(Integer, default=0)

    # Relationships
    candidate = relationship("Candidate", back_populates="interviews")
    interviewers = relationship("Employee", secondary=interview_employees)
    scorecard_template = relationship("InterviewScorecardTemplate", back_populates="interviews")
    rescheduled_from = relationship("InterviewSchedule", remote_side=[id])
    feedbacks = relationship("InterviewFeedback", back_populates="interview", cascade="all, delete-orphan")
    competency_ratings = relationship("CompetencyRating", back_populates="interview")


class InterviewScorecardTemplate(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """Template for interview scorecards with predefined criteria."""

    __tablename__ = "recruitment_interview_scorecard_template"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)

    # Interview type: phone, video, onsite, technical, hr, panel, final, assessment, culture_fit
    interview_type = Column(String(20), nullable=True)

    # Criteria (JSON): [{"name": "...", "description": "...", "weight": 30, "max_score": 5}]
    criteria = Column(JSON, default=list)
    passing_score = Column(Numeric(5, 2), nullable=True)

    # Relationships
    interviews = relationship("InterviewSchedule", back_populates="scorecard_template")


class InterviewFeedback(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin):
    """Individual feedback from each interviewer."""

    __tablename__ = "recruitment_interview_feedback"
    __table_args__ = (
        UniqueConstraint('interview_id', 'interviewer_id', name='uq_interview_feedback_interview_interviewer'),
    )

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("recruitment_interview_schedule.id"), nullable=False)
    interviewer_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=False)

    overall_rating = Column(Numeric(3, 1), nullable=False)

    # Recommendation: strong_hire, hire, lean_hire, lean_no_hire, no_hire, strong_no_hire
    recommendation = Column(String(20), nullable=False)

    feedback = Column(Text, nullable=False)
    strengths = Column(Text, nullable=True)
    weaknesses = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)

    # Criteria-based scores (JSON)
    criteria_scores = Column(JSON, default=dict)

    submitted_at = Column(DateTime, nullable=True)

    # Relationships
    interview = relationship("InterviewSchedule", back_populates="feedbacks")
    interviewer = relationship("Employee")


class InterviewAvailability(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin):
    """Interviewer availability slots for scheduling."""

    __tablename__ = "recruitment_interview_availability"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=False)
    date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)

    # Status: available, tentative, booked, unavailable
    status = Column(String(20), default="available")

    interview_types = Column(JSON, default=list)  # Preferred interview types
    notes = Column(Text, nullable=True)
    recurring = Column(Boolean, default=False)

    # Recurring pattern (JSON): {"frequency": "weekly", "days": [1, 3, 5], "until": "2024-12-31"}
    recurring_pattern = Column(JSON, nullable=True)

    # Relationships
    employee = relationship("Employee")


class InterviewQuestion(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """Interview question bank for different interview types."""

    __tablename__ = "recruitment_interview_question"

    id = Column(Integer, primary_key=True, index=True)
    question = Column(Text, nullable=False)
    answer_guide = Column(Text, nullable=True)

    # Interview type: phone, video, onsite, technical, hr, panel, final, assessment, culture_fit
    interview_type = Column(String(20), nullable=False)

    category = Column(String(100), nullable=True)  # e.g., Algorithms, System Design, Behavioral

    # Difficulty: easy, medium, hard, expert
    difficulty = Column(String(10), default="medium")

    skills = Column(JSON, default=list)  # Skills assessed
    time_estimate_minutes = Column(Integer, nullable=True)

    job_position_id = Column(Integer, ForeignKey("hrms_job_positions.id"), nullable=True)

    # Relationships
    job_position = relationship("JobPosition")


class Competency(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """Competencies for structured evaluation of candidates."""

    __tablename__ = "recruitment_competency"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)

    # Category: technical, leadership, communication, problem_solving, teamwork,
    # adaptability, domain, cultural, analytical, creativity
    category = Column(String(20), default="technical")

    rating_scale = Column(JSON, default=list, nullable=True)  # Custom rating scale definitions

    # Relationships
    interview_kits = relationship("InterviewKit", secondary="recruitment_interview_kit_competencies", back_populates="competencies")
    ratings = relationship("CompetencyRating", back_populates="competency")


# Association table for InterviewKit competencies
interview_kit_competencies = Table(
    'recruitment_interview_kit_competencies',
    Base.metadata,
    Column('interview_kit_id', Integer, ForeignKey('recruitment_interview_kit.id'), primary_key=True),
    Column('competency_id', Integer, ForeignKey('recruitment_competency.id'), primary_key=True),
)


class InterviewKit(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """Structured interview kits for consistent candidate evaluation."""

    __tablename__ = "recruitment_interview_kit"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)

    job_position_id = Column(Integer, ForeignKey("hrms_job_positions.id"), nullable=True)
    department_id = Column(Integer, ForeignKey("hrms_departments.id"), nullable=True)

    # Interview type: phone_screen, technical, behavioral, culture_fit, panel,
    # case_study, presentation, final, hr, custom
    interview_type = Column(String(20), default="technical")

    duration_minutes = Column(Integer, default=60)
    is_template = Column(Boolean, default=False)
    created_by_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=True)

    # Relationships
    job_position = relationship("JobPosition")
    department = relationship("Department")
    competencies = relationship("Competency", secondary=interview_kit_competencies, back_populates="interview_kits")
    created_by_employee = relationship("Employee", foreign_keys=[created_by_id])
    questions = relationship("InterviewKitQuestion", back_populates="kit", cascade="all, delete-orphan")
    guides = relationship("InterviewGuide", back_populates="kit", cascade="all, delete-orphan")


class InterviewKitQuestion(Base, TimestampMixin):
    """Questions within an interview kit."""

    __tablename__ = "recruitment_interview_kit_question"

    id = Column(Integer, primary_key=True, index=True)
    kit_id = Column(Integer, ForeignKey("recruitment_interview_kit.id"), nullable=False)
    question = Column(Text, nullable=False)

    # Question type: behavioral, technical, situational, competency, case, role_play, general
    question_type = Column(String(20), default="general")

    purpose = Column(Text, nullable=True)  # Why ask this question
    good_answer_hints = Column(Text, nullable=True)  # What to look for
    red_flags = Column(Text, nullable=True)  # Warning signs

    competency_id = Column(Integer, ForeignKey("recruitment_competency.id"), nullable=True)
    sequence = Column(Integer, default=0)
    time_allocation_minutes = Column(Integer, default=5)
    is_required = Column(Boolean, default=False)

    # Relationships
    kit = relationship("InterviewKit", back_populates="questions")
    competency = relationship("Competency")


class CompetencyRating(Base, TimestampMixin):
    """Competency-based rating for candidates during interviews."""

    __tablename__ = "recruitment_competency_rating"
    __table_args__ = (
        UniqueConstraint('candidate_id', 'competency_id', 'interview_id', 'rated_by_id',
                         name='uq_competency_rating_candidate_comp_interview_rater'),
    )

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("recruitment_candidate.id"), nullable=False)
    competency_id = Column(Integer, ForeignKey("recruitment_competency.id"), nullable=False)
    interview_id = Column(Integer, ForeignKey("recruitment_interview_schedule.id"), nullable=False)

    rating = Column(Integer, nullable=False)  # 1-5 scale
    notes = Column(Text, nullable=True)

    rated_by_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=True)
    rated_at = Column(DateTime, nullable=True)

    # Relationships
    candidate = relationship("Candidate")
    competency = relationship("Competency", back_populates="ratings")
    interview = relationship("InterviewSchedule", back_populates="competency_ratings")
    rated_by = relationship("Employee")


class InterviewGuide(Base, TimestampMixin, AuditMixin, SoftDeleteMixin):
    """Interviewer guides and instructions for interview kits."""

    __tablename__ = "recruitment_interview_guide"

    id = Column(Integer, primary_key=True, index=True)
    kit_id = Column(Integer, ForeignKey("recruitment_interview_kit.id"), nullable=False)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    attachments = Column(JSON, default=list, nullable=True)  # List of file paths/URLs
    is_for_lead_interviewer = Column(Boolean, default=False)
    sequence = Column(Integer, default=0)

    # Relationships
    kit = relationship("InterviewKit", back_populates="guides")
