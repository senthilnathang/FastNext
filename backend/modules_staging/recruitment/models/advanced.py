"""
Advanced Recruitment Models

Advanced ATS features including LinkedIn integration, job offers, talent pools,
scoring, workflows, DEI, automation, and analytics models.
"""

from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Date, DateTime, Time,
    ForeignKey, Numeric, JSON, Table, UniqueConstraint
)
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.base import TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin


# ============================================================================
# LinkedIn & External Integrations
# ============================================================================

class LinkedInAccount(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """LinkedIn account for job posting integration."""

    __tablename__ = "recruitment_linkedin_account"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(250), nullable=False)
    email = Column(String(254), nullable=False)
    api_token = Column(String(500), nullable=False)
    sub_id = Column(String(250), nullable=False, unique=True)

    # Relationships
    recruitments = relationship("Recruitment", back_populates="linkedin_account")


# ============================================================================
# Job Alerts & Saved Jobs
# ============================================================================

# Association tables
job_alert_departments = Table(
    'recruitment_job_alert_departments',
    Base.metadata,
    Column('job_alert_id', Integer, ForeignKey('recruitment_job_alert.id'), primary_key=True),
    Column('department_id', Integer, ForeignKey('hrms_departments.id'), primary_key=True),
)

job_alert_positions = Table(
    'recruitment_job_alert_positions',
    Base.metadata,
    Column('job_alert_id', Integer, ForeignKey('recruitment_job_alert.id'), primary_key=True),
    Column('job_position_id', Integer, ForeignKey('hrms_job_positions.id'), primary_key=True),
)


class JobAlert(Base, TimestampMixin):
    """Job alert subscriptions for external candidates."""

    __tablename__ = "recruitment_job_alert"
    __table_args__ = (
        UniqueConstraint('email', name='uq_job_alert_email'),
    )

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(254), nullable=False)
    name = Column(String(100), nullable=True)

    # Filter preferences
    employment_types = Column(JSON, default=list, nullable=True)
    locations = Column(JSON, default=list, nullable=True)
    keywords = Column(String(500), nullable=True)
    remote_only = Column(Boolean, default=False)
    min_salary = Column(Numeric(12, 2), nullable=True)

    # Experience level: entry, junior, mid, senior, lead, executive
    experience_level = Column(String(30), nullable=True)

    # Notification settings: daily, weekly, instant
    frequency = Column(String(20), default="weekly")

    is_active = Column(Boolean, default=True)
    verified = Column(Boolean, default=False)
    verification_token = Column(String(100), nullable=True)
    unsubscribe_token = Column(String(100), nullable=True)

    # Tracking
    last_sent = Column(DateTime, nullable=True)
    jobs_sent = Column(JSON, default=list)

    # Relationships
    departments = relationship("Department", secondary=job_alert_departments)
    job_positions = relationship("JobPosition", secondary=job_alert_positions)


class SavedJob(Base, TimestampMixin):
    """Saved/bookmarked jobs by candidates."""

    __tablename__ = "recruitment_saved_job"
    __table_args__ = (
        UniqueConstraint('email', 'recruitment_id', name='uq_saved_job_email_recruitment'),
    )

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(254), nullable=False)
    recruitment_id = Column(Integer, ForeignKey("recruitment_recruitment.id"), nullable=False)
    notes = Column(Text, nullable=True)

    # Relationships
    recruitment = relationship("Recruitment")


class ApplicationStatusUpdate(Base, TimestampMixin):
    """Application status updates and communication tracking."""

    __tablename__ = "recruitment_application_status_update"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("recruitment_candidate.id"), nullable=False)

    # Status: received, reviewing, shortlisted, interview_scheduled, interviewed,
    # offer_pending, offer_sent, hired, rejected, withdrawn
    status = Column(String(30), nullable=False)

    message = Column(Text, nullable=True)
    is_public = Column(Boolean, default=True)  # Visible to candidate
    created_by_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=True)

    # Relationships
    candidate = relationship("Candidate")
    created_by = relationship("Employee")


# ============================================================================
# Scoring & Evaluation
# ============================================================================

class ScoringCriteria(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """Configurable scoring criteria for evaluating candidates."""

    __tablename__ = "recruitment_scoring_criteria"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)

    # Criteria type: experience, education, skills, culture_fit, communication,
    # technical, leadership, custom
    criteria_type = Column(String(50), default="custom")

    weight = Column(Numeric(5, 2), default=1.0)
    max_score = Column(Integer, default=10)

    recruitment_id = Column(Integer, ForeignKey("recruitment_recruitment.id"), nullable=True)
    is_mandatory = Column(Boolean, default=False)
    sequence = Column(Integer, default=0)

    # Relationships
    recruitment = relationship("Recruitment")
    candidate_scores = relationship("CandidateScore", back_populates="criteria")


class CandidateScore(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin):
    """Individual score for a candidate on a specific criteria."""

    __tablename__ = "recruitment_candidate_score"
    __table_args__ = (
        UniqueConstraint('candidate_id', 'criteria_id', 'scored_by_id',
                         name='uq_candidate_score_candidate_criteria_scorer'),
    )

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("recruitment_candidate.id"), nullable=False)
    criteria_id = Column(Integer, ForeignKey("recruitment_scoring_criteria.id"), nullable=False)
    score = Column(Numeric(5, 2), nullable=False)
    notes = Column(Text, nullable=True)
    scored_by_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=True)

    # Relationships
    candidate = relationship("Candidate")
    criteria = relationship("ScoringCriteria", back_populates="candidate_scores")
    scored_by = relationship("Employee")


class CandidateScorecard(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin):
    """Aggregate scorecard for a candidate."""

    __tablename__ = "recruitment_candidate_scorecard"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("recruitment_candidate.id"), nullable=False)
    reviewer_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=True)

    # Status: pending, in_progress, completed
    status = Column(String(20), default="pending")

    total_score = Column(Numeric(7, 2), nullable=True)
    weighted_score = Column(Numeric(7, 2), nullable=True)
    max_possible_score = Column(Numeric(7, 2), nullable=True)
    score_percentage = Column(Numeric(5, 2), nullable=True)

    # Recommendation: strong_hire, hire, maybe, no_hire, strong_no_hire
    recommendation = Column(String(20), nullable=True)

    summary = Column(Text, nullable=True)
    strengths = Column(Text, nullable=True)
    weaknesses = Column(Text, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    candidate = relationship("Candidate")
    reviewer = relationship("Employee")


# ============================================================================
# Job Offers & Negotiations
# ============================================================================

class JobOffer(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """Job offer management for candidates."""

    __tablename__ = "recruitment_job_offer"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("recruitment_candidate.id"), nullable=False)
    recruitment_id = Column(Integer, ForeignKey("recruitment_recruitment.id"), nullable=False)

    # Status: draft, pending_approval, approved, sent, viewed, negotiating,
    # accepted, declined, expired, withdrawn
    status = Column(String(20), default="draft")

    job_title = Column(String(200), nullable=False)
    department_id = Column(Integer, ForeignKey("hrms_departments.id"), nullable=True)

    # Employment type: full_time, part_time, contract, internship, temporary
    employment_type = Column(String(20), default="full_time")

    work_location = Column(String(200), nullable=True)
    reporting_to_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=True)

    # Compensation
    base_salary = Column(Numeric(12, 2), nullable=False)
    salary_currency = Column(String(3), default="USD")
    salary_frequency = Column(String(20), default="annual")  # annual, monthly, hourly
    bonus_amount = Column(Numeric(12, 2), nullable=True)
    bonus_type = Column(String(50), nullable=True)  # signing, performance, annual
    equity_grant = Column(String(200), nullable=True)

    # Benefits (JSON list)
    benefits = Column(JSON, default=list)

    # Dates
    start_date = Column(Date, nullable=False)
    offer_expiry_date = Column(Date, nullable=True)
    probation_period_months = Column(Integer, default=3)

    # Terms
    terms_and_conditions = Column(Text, nullable=True)
    special_conditions = Column(Text, nullable=True)

    # Documents
    offer_letter_file = Column(String(500), nullable=True)
    signed_offer_file = Column(String(500), nullable=True)

    # Tracking
    created_by_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=True)
    approved_by_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    sent_at = Column(DateTime, nullable=True)
    viewed_at = Column(DateTime, nullable=True)
    responded_at = Column(DateTime, nullable=True)
    candidate_response = Column(Text, nullable=True)

    # Relationships
    candidate = relationship("Candidate")
    recruitment = relationship("Recruitment")
    department = relationship("Department")
    reporting_to = relationship("Employee", foreign_keys=[reporting_to_id])
    created_by_employee = relationship("Employee", foreign_keys=[created_by_id])
    approved_by = relationship("Employee", foreign_keys=[approved_by_id])
    negotiations = relationship("OfferNegotiation", back_populates="offer", cascade="all, delete-orphan")
    approvals = relationship("HiringApproval", back_populates="offer")


class OfferNegotiation(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin):
    """Track offer negotiation history."""

    __tablename__ = "recruitment_offer_negotiation"

    id = Column(Integer, primary_key=True, index=True)
    offer_id = Column(Integer, ForeignKey("recruitment_job_offer.id"), nullable=False)

    # Initiated by: candidate, employer
    initiated_by = Column(String(20), nullable=False)

    original_value = Column(JSON, default=dict)
    proposed_value = Column(JSON, default=dict)
    negotiation_notes = Column(Text, nullable=True)
    is_accepted = Column(Boolean, nullable=True)

    responded_by_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=True)
    responded_at = Column(DateTime, nullable=True)

    # Relationships
    offer = relationship("JobOffer", back_populates="negotiations")
    responded_by = relationship("Employee")


# ============================================================================
# Referrals & Hiring Team
# ============================================================================

class EmployeeReferral(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """Track employee referrals for candidates."""

    __tablename__ = "recruitment_employee_referral"
    __table_args__ = (
        UniqueConstraint('referrer_id', 'candidate_id', name='uq_referral_referrer_candidate'),
    )

    id = Column(Integer, primary_key=True, index=True)
    referrer_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=False)
    candidate_id = Column(Integer, ForeignKey("recruitment_candidate.id"), nullable=False)
    recruitment_id = Column(Integer, ForeignKey("recruitment_recruitment.id"), nullable=False)

    relationship_desc = Column(String(100), nullable=True)  # How referrer knows candidate
    referral_notes = Column(Text, nullable=True)

    # Status: submitted, reviewing, interviewing, hired, not_hired, bonus_pending, bonus_paid
    status = Column(String(20), default="submitted")

    bonus_amount = Column(Numeric(10, 2), nullable=True)
    bonus_paid_date = Column(Date, nullable=True)
    hired_date = Column(Date, nullable=True)

    # Relationships
    referrer = relationship("Employee")
    candidate = relationship("Candidate")
    recruitment = relationship("Recruitment")


class HiringTeamMember(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """Members of the hiring team for a recruitment."""

    __tablename__ = "recruitment_hiring_team_member"
    __table_args__ = (
        UniqueConstraint('recruitment_id', 'employee_id', name='uq_hiring_team_recruitment_employee'),
    )

    id = Column(Integer, primary_key=True, index=True)
    recruitment_id = Column(Integer, ForeignKey("recruitment_recruitment.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=False)

    # Role: hiring_manager, recruiter, interviewer, approver, coordinator, observer
    role = Column(String(20), default="interviewer")

    can_view_salary = Column(Boolean, default=False)
    can_approve_offer = Column(Boolean, default=False)
    can_reject_candidate = Column(Boolean, default=False)
    notification_preferences = Column(JSON, default=dict)

    # Relationships
    recruitment = relationship("Recruitment")
    employee = relationship("Employee")


class HiringApproval(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin):
    """Approval workflow for hiring decisions."""

    __tablename__ = "recruitment_hiring_approval"

    id = Column(Integer, primary_key=True, index=True)

    # Approval type: job_posting, candidate_advance, offer, hire, salary_exception
    approval_type = Column(String(30), nullable=False)

    recruitment_id = Column(Integer, ForeignKey("recruitment_recruitment.id"), nullable=False)
    candidate_id = Column(Integer, ForeignKey("recruitment_candidate.id"), nullable=True)
    offer_id = Column(Integer, ForeignKey("recruitment_job_offer.id"), nullable=True)

    requested_by_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=True)
    assigned_to_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=True)

    # Status: pending, approved, rejected, escalated
    status = Column(String(20), default="pending")

    request_notes = Column(Text, nullable=True)
    response_notes = Column(Text, nullable=True)
    responded_at = Column(DateTime, nullable=True)
    due_date = Column(DateTime, nullable=True)
    escalation_level = Column(Integer, default=0)

    # Relationships
    recruitment = relationship("Recruitment")
    candidate = relationship("Candidate")
    offer = relationship("JobOffer", back_populates="approvals")
    requested_by = relationship("Employee", foreign_keys=[requested_by_id])
    assigned_to = relationship("Employee", foreign_keys=[assigned_to_id])


# ============================================================================
# Talent Pool
# ============================================================================

class TalentPool(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """Talent pools for nurturing candidates for future positions."""

    __tablename__ = "recruitment_talent_pool"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    pool_type = Column(String(50), default="general")  # e.g., silver_medalists, future_leaders

    department_id = Column(Integer, ForeignKey("hrms_departments.id"), nullable=True)
    job_position_id = Column(Integer, ForeignKey("hrms_job_positions.id"), nullable=True)

    auto_add_criteria = Column(JSON, default=dict)  # Criteria for auto-adding candidates
    owner_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=True)

    # Relationships
    department = relationship("Department")
    job_position = relationship("JobPosition")
    owner = relationship("Employee")
    pool_candidates = relationship("TalentPoolCandidate", back_populates="pool", cascade="all, delete-orphan")


class TalentPoolCandidate(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """Candidates in a talent pool."""

    __tablename__ = "recruitment_talent_pool_candidate"
    __table_args__ = (
        UniqueConstraint('pool_id', 'candidate_id', name='uq_talent_pool_pool_candidate'),
    )

    id = Column(Integer, primary_key=True, index=True)
    pool_id = Column(Integer, ForeignKey("recruitment_talent_pool.id"), nullable=False)
    candidate_id = Column(Integer, ForeignKey("recruitment_candidate.id"), nullable=False)

    added_by_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=True)
    source_recruitment_id = Column(Integer, ForeignKey("recruitment_recruitment.id"), nullable=True)

    reason = Column(Text, nullable=True)

    # Status: active, contacted, not_interested, hired, removed
    status = Column(String(20), default="active")

    notes = Column(Text, nullable=True)
    last_contacted = Column(DateTime, nullable=True)

    # Relationships
    pool = relationship("TalentPool", back_populates="pool_candidates")
    candidate = relationship("Candidate")
    added_by = relationship("Employee")
    source_recruitment = relationship("Recruitment")


# ============================================================================
# Source Tracking & Tags
# ============================================================================

class CandidateSourceChannel(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """Track recruitment source channels."""

    __tablename__ = "recruitment_candidate_source_channel"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)

    # Channel type: job_board, social, referral, agency, careers_page, event,
    # university, internal, direct, other
    channel_type = Column(String(20), default="other")

    description = Column(Text, nullable=True)
    url = Column(String(500), nullable=True)
    cost_per_post = Column(Numeric(10, 2), nullable=True)
    cost_per_click = Column(Numeric(10, 2), nullable=True)
    integration_key = Column(String(255), nullable=True)
    integration_config = Column(JSON, default=dict)

    # Relationships
    candidates = relationship("Candidate", back_populates="source_channel")
    stats = relationship("CandidateSourceStats", back_populates="source_channel")


class CandidateSourceStats(Base, TimestampMixin):
    """Track source effectiveness metrics over time."""

    __tablename__ = "recruitment_candidate_source_stats"

    id = Column(Integer, primary_key=True, index=True)
    source_channel_id = Column(Integer, ForeignKey("recruitment_candidate_source_channel.id"), nullable=False)
    recruitment_id = Column(Integer, ForeignKey("recruitment_recruitment.id"), nullable=True)

    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)

    applications = Column(Integer, default=0)
    qualified = Column(Integer, default=0)
    interviews = Column(Integer, default=0)
    offers = Column(Integer, default=0)
    hires = Column(Integer, default=0)
    cost = Column(Numeric(10, 2), default=0)

    # Relationships
    source_channel = relationship("CandidateSourceChannel", back_populates="stats")
    recruitment = relationship("Recruitment")


class CandidateTag(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """Flexible tagging system for candidates."""

    __tablename__ = "recruitment_candidate_tag"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    color = Column(String(7), default="#1890ff")  # Hex color
    description = Column(Text, nullable=True)
    is_system = Column(Boolean, default=False)  # System tags cannot be deleted

    # Relationships - imported from recruitment.py
    candidates = relationship("Candidate", secondary="recruitment_candidate_tags", back_populates="tags")


# ============================================================================
# Workflows & Automation
# ============================================================================

class HiringWorkflow(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """Automated workflow templates for the hiring process."""

    __tablename__ = "recruitment_hiring_workflow"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)

    recruitment_id = Column(Integer, ForeignKey("recruitment_recruitment.id"), nullable=True)

    # Trigger type: stage_change, status_change, score_threshold, time_based, manual
    trigger_type = Column(String(50), default="stage_change")
    trigger_config = Column(JSON, default=dict)

    priority = Column(Integer, default=0)

    # Relationships
    recruitment = relationship("Recruitment")
    actions = relationship("WorkflowAction", back_populates="workflow", cascade="all, delete-orphan")


class WorkflowAction(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """Actions to be executed as part of a workflow."""

    __tablename__ = "recruitment_workflow_action"

    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("recruitment_hiring_workflow.id"), nullable=False)

    # Action type: send_email, send_sms, create_task, move_stage, assign_reviewer,
    # schedule_interview, send_notification, update_status, create_offer, webhook
    action_type = Column(String(50), nullable=False)
    action_config = Column(JSON, default=dict)

    template_id = Column(Integer, ForeignKey("recruitment_communication_template.id"), nullable=True)
    delay_minutes = Column(Integer, default=0)
    sequence = Column(Integer, default=0)

    # Relationships
    workflow = relationship("HiringWorkflow", back_populates="actions")
    template = relationship("CommunicationTemplate")


class CommunicationTemplate(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """Email and SMS templates for candidate communication."""

    __tablename__ = "recruitment_communication_template"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)

    # Template type: email, sms, in_app
    template_type = Column(String(20), default="email")

    # Category: application_received, interview_invite, interview_reminder,
    # interview_feedback, offer, rejection, onboarding, follow_up, custom
    category = Column(String(50), default="custom")

    subject = Column(String(500), nullable=True)  # For email
    body = Column(Text, nullable=False)
    variables = Column(JSON, default=list)  # Available template variables
    is_default = Column(Boolean, default=False)


class CandidateCommunication(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin):
    """Log of all communications with candidates."""

    __tablename__ = "recruitment_candidate_communication"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("recruitment_candidate.id"), nullable=False)

    # Channel: email, sms, phone, in_person, portal, linkedin, other
    channel = Column(String(20), nullable=False)

    # Direction: outbound, inbound
    direction = Column(String(20), default="outbound")

    subject = Column(String(500), nullable=True)
    content = Column(Text, nullable=False)
    template_used_id = Column(Integer, ForeignKey("recruitment_communication_template.id"), nullable=True)

    # Status: pending, sent, delivered, opened, clicked, replied, failed, bounced
    status = Column(String(20), default="pending")

    sent_at = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)
    opened_at = Column(DateTime, nullable=True)

    sent_by_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=True)
    external_id = Column(String(200), nullable=True)  # ID from email/SMS provider
    extra_data = Column(JSON, default=dict)  # renamed from 'metadata' to avoid SQLAlchemy conflict

    # Relationships
    candidate = relationship("Candidate")
    template_used = relationship("CommunicationTemplate")
    sent_by = relationship("Employee")


# ============================================================================
# Automation Rules & Logs
# ============================================================================

# Association tables
automation_recruitments = Table(
    'recruitment_automation_recruitments',
    Base.metadata,
    Column('automation_rule_id', Integer, ForeignKey('recruitment_automation_rule.id'), primary_key=True),
    Column('recruitment_id', Integer, ForeignKey('recruitment_recruitment.id'), primary_key=True),
)

automation_departments = Table(
    'recruitment_automation_departments',
    Base.metadata,
    Column('automation_rule_id', Integer, ForeignKey('recruitment_automation_rule.id'), primary_key=True),
    Column('department_id', Integer, ForeignKey('hrms_departments.id'), primary_key=True),
)


class RecruitmentEmailTemplate(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """Email templates for recruitment automation."""

    __tablename__ = "recruitment_email_template"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)

    # Template type: application_received, application_reviewed, interview_invitation,
    # interview_reminder, interview_feedback_request, stage_update, rejection, offer,
    # offer_reminder, onboarding, referral_update, custom
    template_type = Column(String(30), default="custom")

    subject = Column(String(500), nullable=False)
    body_html = Column(Text, nullable=False)
    body_text = Column(Text, nullable=True)
    variables = Column(JSON, default=list)  # e.g., {{candidate_name}}, {{job_title}}
    is_default = Column(Boolean, default=False)
    created_by_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=True)

    # Relationships
    created_by_employee = relationship("Employee")


class RecruitmentAutomationRule(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """Trigger-based automation rules for recruitment workflows."""

    __tablename__ = "recruitment_automation_rule"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)

    # Trigger type: stage_change, application_received, interview_scheduled,
    # interview_completed, interview_feedback_submitted, offer_sent, offer_accepted,
    # offer_rejected, time_in_stage, rating_received, document_uploaded,
    # candidate_tagged, schedule
    trigger_type = Column(String(30), nullable=False)
    trigger_conditions = Column(JSON, default=dict)

    # Action type: send_email, send_sms, move_stage, assign_task, add_tag, remove_tag,
    # notify_user, notify_slack, webhook, add_to_talent_pool, schedule_reminder, update_field
    action_type = Column(String(30), nullable=False)
    action_config = Column(JSON, default=dict)

    delay_minutes = Column(Integer, default=0)
    times_triggered = Column(Integer, default=0)
    last_triggered = Column(DateTime, nullable=True)
    created_by_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=True)

    # Relationships
    recruitments = relationship("Recruitment", secondary=automation_recruitments)
    departments = relationship("Department", secondary=automation_departments)
    created_by_employee = relationship("Employee")
    logs = relationship("AutomationLog", back_populates="rule", cascade="all, delete-orphan")
    scheduled_actions = relationship("RecruitmentScheduledAction", back_populates="automation_rule")


class AutomationLog(Base, TimestampMixin):
    """Log of automation rule executions."""

    __tablename__ = "recruitment_automation_log"

    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(Integer, ForeignKey("recruitment_automation_rule.id"), nullable=False)
    candidate_id = Column(Integer, ForeignKey("recruitment_candidate.id"), nullable=True)
    recruitment_id = Column(Integer, ForeignKey("recruitment_recruitment.id"), nullable=True)

    triggered_at = Column(DateTime, nullable=True)
    executed_at = Column(DateTime, nullable=True)

    # Status: success, failed, skipped, pending
    status = Column(String(20), default="pending")

    details = Column(JSON, default=dict)
    error_message = Column(Text, nullable=True)

    # Relationships
    rule = relationship("RecruitmentAutomationRule", back_populates="logs")
    candidate = relationship("Candidate")
    recruitment = relationship("Recruitment")


class RecruitmentScheduledAction(Base, TimestampMixin):
    """Scheduled/delayed actions for recruitment automation."""

    __tablename__ = "recruitment_scheduled_action"

    id = Column(Integer, primary_key=True, index=True)
    automation_rule_id = Column(Integer, ForeignKey("recruitment_automation_rule.id"), nullable=True)

    action_type = Column(String(50), nullable=False)
    action_config = Column(JSON, default=dict)
    scheduled_for = Column(DateTime, nullable=False)

    candidate_id = Column(Integer, ForeignKey("recruitment_candidate.id"), nullable=True)
    recruitment_id = Column(Integer, ForeignKey("recruitment_recruitment.id"), nullable=True)

    # Status: pending, executed, cancelled, failed
    status = Column(String(20), default="pending")

    executed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)

    # Relationships
    automation_rule = relationship("RecruitmentAutomationRule", back_populates="scheduled_actions")
    candidate = relationship("Candidate")
    recruitment = relationship("Recruitment")


# ============================================================================
# DEI & Compliance
# ============================================================================

class DEIGoal(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """Diversity, Equity & Inclusion hiring goals."""

    __tablename__ = "recruitment_dei_goal"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)

    # Goal type: gender, ethnicity, disability, veteran, age, lgbtq, socioeconomic,
    # neurodiversity, other
    goal_type = Column(String(20), nullable=False)

    department_id = Column(Integer, ForeignKey("hrms_departments.id"), nullable=True)
    target_percentage = Column(Numeric(5, 2), nullable=False)
    current_percentage = Column(Numeric(5, 2), default=0)
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    owner_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=True)

    # Relationships
    department = relationship("Department")
    owner = relationship("Employee")


class DEIMetrics(Base, TimestampMixin):
    """Anonymized DEI tracking metrics for compliance and reporting."""

    __tablename__ = "recruitment_dei_metrics"

    id = Column(Integer, primary_key=True, index=True)
    recruitment_id = Column(Integer, ForeignKey("recruitment_recruitment.id"), nullable=True)
    department_id = Column(Integer, ForeignKey("hrms_departments.id"), nullable=True)
    period = Column(Date, nullable=False)

    # Aggregate metrics
    total_applications = Column(Integer, default=0)
    diverse_applications = Column(Integer, default=0)
    total_interviews = Column(Integer, default=0)
    diverse_interviews = Column(Integer, default=0)
    total_offers = Column(Integer, default=0)
    diverse_offers = Column(Integer, default=0)
    total_hires = Column(Integer, default=0)
    diverse_hires = Column(Integer, default=0)

    # Anonymized aggregate breakdowns (JSON)
    gender_breakdown = Column(JSON, default=dict)
    ethnicity_breakdown = Column(JSON, default=dict)
    age_breakdown = Column(JSON, default=dict)
    veteran_breakdown = Column(JSON, default=dict)
    disability_breakdown = Column(JSON, default=dict)

    # Relationships
    recruitment = relationship("Recruitment")
    department = relationship("Department")


class EEOCData(Base, TimestampMixin):
    """EEOC compliance data - voluntary, anonymized self-identification."""

    __tablename__ = "recruitment_eeoc_data"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("recruitment_candidate.id"), nullable=False, unique=True)

    # Gender: male, female, non_binary, prefer_not_say, other
    gender = Column(String(20), nullable=True)

    ethnicity = Column(String(100), nullable=True)

    # Veteran status: not_veteran, veteran, protected_veteran, prefer_not_say
    veteran_status = Column(String(20), nullable=True)

    # Disability status: no_disability, has_disability, prefer_not_say
    disability_status = Column(String(20), nullable=True)

    collected_at = Column(DateTime, nullable=True)
    is_voluntary = Column(Boolean, default=True)

    # Relationships
    candidate = relationship("Candidate")


# ============================================================================
# Analytics & Metrics
# ============================================================================

class PipelineMetrics(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin):
    """Daily snapshot of pipeline metrics for analytics."""

    __tablename__ = "recruitment_pipeline_metrics"
    __table_args__ = (
        UniqueConstraint('recruitment_id', 'snapshot_date', name='uq_pipeline_metrics_recruitment_date'),
    )

    id = Column(Integer, primary_key=True, index=True)
    recruitment_id = Column(Integer, ForeignKey("recruitment_recruitment.id"), nullable=False)
    snapshot_date = Column(Date, nullable=False)

    # Candidate counts
    total_candidates = Column(Integer, default=0)
    new_candidates = Column(Integer, default=0)
    candidates_by_stage = Column(JSON, default=dict)

    # Conversion metrics
    application_to_screen_rate = Column(Numeric(5, 2), nullable=True)
    screen_to_interview_rate = Column(Numeric(5, 2), nullable=True)
    interview_to_offer_rate = Column(Numeric(5, 2), nullable=True)
    offer_acceptance_rate = Column(Numeric(5, 2), nullable=True)

    # Time metrics
    avg_time_to_hire_days = Column(Numeric(6, 1), nullable=True)
    avg_time_in_stage = Column(JSON, default=dict)

    # Source metrics
    candidates_by_source = Column(JSON, default=dict)
    hires_by_source = Column(JSON, default=dict)

    # Activity
    interviews_scheduled = Column(Integer, default=0)
    offers_sent = Column(Integer, default=0)
    hires_made = Column(Integer, default=0)
    rejections = Column(Integer, default=0)

    # Relationships
    recruitment = relationship("Recruitment")


class HiringGoal(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """Quarterly/annual hiring goals."""

    __tablename__ = "recruitment_hiring_goal"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)

    department_id = Column(Integer, ForeignKey("hrms_departments.id"), nullable=True)
    job_position_id = Column(Integer, ForeignKey("hrms_job_positions.id"), nullable=True)

    target_hires = Column(Integer, nullable=False)
    current_hires = Column(Integer, default=0)
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    owner_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=True)

    # Relationships
    department = relationship("Department")
    job_position = relationship("JobPosition")
    owner = relationship("Employee")


class StageAnalytics(Base, TimestampMixin):
    """Per-stage analytics for pipeline optimization."""

    __tablename__ = "recruitment_stage_analytics"
    __table_args__ = (
        UniqueConstraint('stage_id', 'recruitment_id', 'period',
                         name='uq_stage_analytics_stage_recruitment_period'),
    )

    id = Column(Integer, primary_key=True, index=True)
    stage_id = Column(Integer, ForeignKey("recruitment_stage.id"), nullable=False)
    recruitment_id = Column(Integer, ForeignKey("recruitment_recruitment.id"), nullable=True)
    period = Column(Date, nullable=False)

    # Volume metrics
    candidates_entered = Column(Integer, default=0)
    candidates_exited = Column(Integer, default=0)
    candidates_rejected = Column(Integer, default=0)
    candidates_advanced = Column(Integer, default=0)

    # Time metrics (in hours)
    total_time_in_stage = Column(Numeric(10, 2), default=0)
    average_time_in_stage = Column(Numeric(10, 2), nullable=True)
    min_time_in_stage = Column(Numeric(10, 2), nullable=True)
    max_time_in_stage = Column(Numeric(10, 2), nullable=True)

    # Relationships
    stage = relationship("RecruitmentStage")
    recruitment = relationship("Recruitment")
