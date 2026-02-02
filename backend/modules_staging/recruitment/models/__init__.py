"""
Recruitment Models

Database models for recruitment management.
"""

# Core models
from .recruitment import (
    # Association tables
    recruitment_managers,
    recruitment_open_positions,
    recruitment_skills,
    stage_managers,
    rejected_candidate_reasons,
    stage_note_files,
    candidate_tags,
    recruitment_quizzes,
    # Models
    Skill,
    Recruitment,
    RecruitmentStage,
    Candidate,
    RejectReason,
    RejectedCandidate,
    StageFiles,
    StageNote,
    RecruitmentGeneralSetting,
    CandidateQuizAttempt,
)

# Survey/Quiz integration - legacy tables removed (caused FK errors)
# from .survey import (
#     survey_template_ids,
#     survey_recruitment_ids,
#     survey_job_position_ids,
# )

# Skill Zone models
from .skill_zone import (
    SkillZone,
    SkillZoneCandidate,
    CandidateSkill,
    CandidateRating,
)

# Interview models
from .interview import (
    # Association tables
    interview_employees,
    interview_kit_competencies,
    # Models
    InterviewSchedule,
    InterviewScorecardTemplate,
    InterviewFeedback,
    InterviewAvailability,
    InterviewQuestion,
    Competency,
    InterviewKit,
    InterviewKitQuestion,
    CompetencyRating,
    InterviewGuide,
)

# Document models
from .documents import (
    # Association tables
    document_request_candidates,
    # Models
    Resume,
    CandidateDocumentRequest,
    CandidateDocument,
)

# Advanced models
from .advanced import (
    # Association tables
    job_alert_departments,
    job_alert_positions,
    automation_recruitments,
    automation_departments,
    # LinkedIn & External Integrations
    LinkedInAccount,
    # Job Alerts & Saved Jobs
    JobAlert,
    SavedJob,
    ApplicationStatusUpdate,
    # Scoring & Evaluation
    ScoringCriteria,
    CandidateScore,
    CandidateScorecard,
    # Job Offers & Negotiations
    JobOffer,
    OfferNegotiation,
    # Referrals & Hiring Team
    EmployeeReferral,
    HiringTeamMember,
    HiringApproval,
    # Talent Pool
    TalentPool,
    TalentPoolCandidate,
    # Source Tracking & Tags
    CandidateSourceChannel,
    CandidateSourceStats,
    CandidateTag,
    # Workflows & Automation
    HiringWorkflow,
    WorkflowAction,
    CommunicationTemplate,
    CandidateCommunication,
    # Automation Rules & Logs
    RecruitmentEmailTemplate,
    RecruitmentAutomationRule,
    AutomationLog,
    RecruitmentScheduledAction,
    # DEI & Compliance
    DEIGoal,
    DEIMetrics,
    EEOCData,
    # Analytics & Metrics
    PipelineMetrics,
    HiringGoal,
    StageAnalytics,
)


__all__ = [
    # Association tables - Core
    "recruitment_managers",
    "recruitment_open_positions",
    "recruitment_skills",
    "stage_managers",
    "rejected_candidate_reasons",
    "stage_note_files",
    "candidate_tags",
    "recruitment_quizzes",
    # Association tables - Survey (legacy tables removed - caused FK errors)
    # "survey_template_ids",
    # "survey_recruitment_ids",
    # "survey_job_position_ids",
    # Association tables - Interview
    "interview_employees",
    "interview_kit_competencies",
    # Association tables - Documents
    "document_request_candidates",
    # Association tables - Advanced
    "job_alert_departments",
    "job_alert_positions",
    "automation_recruitments",
    "automation_departments",
    # Core models
    "Skill",
    "Recruitment",
    "RecruitmentStage",
    "Candidate",
    "RejectReason",
    "RejectedCandidate",
    "StageFiles",
    "StageNote",
    "RecruitmentGeneralSetting",
    # Quiz integration models
    "CandidateQuizAttempt",
    # Skill Zone models
    "SkillZone",
    "SkillZoneCandidate",
    "CandidateSkill",
    "CandidateRating",
    # Interview models
    "InterviewSchedule",
    "InterviewScorecardTemplate",
    "InterviewFeedback",
    "InterviewAvailability",
    "InterviewQuestion",
    "Competency",
    "InterviewKit",
    "InterviewKitQuestion",
    "CompetencyRating",
    "InterviewGuide",
    # Document models
    "Resume",
    "CandidateDocumentRequest",
    "CandidateDocument",
    # Advanced models - LinkedIn & External Integrations
    "LinkedInAccount",
    # Advanced models - Job Alerts & Saved Jobs
    "JobAlert",
    "SavedJob",
    "ApplicationStatusUpdate",
    # Advanced models - Scoring & Evaluation
    "ScoringCriteria",
    "CandidateScore",
    "CandidateScorecard",
    # Advanced models - Job Offers & Negotiations
    "JobOffer",
    "OfferNegotiation",
    # Advanced models - Referrals & Hiring Team
    "EmployeeReferral",
    "HiringTeamMember",
    "HiringApproval",
    # Advanced models - Talent Pool
    "TalentPool",
    "TalentPoolCandidate",
    # Advanced models - Source Tracking & Tags
    "CandidateSourceChannel",
    "CandidateSourceStats",
    "CandidateTag",
    # Advanced models - Workflows & Automation
    "HiringWorkflow",
    "WorkflowAction",
    "CommunicationTemplate",
    "CandidateCommunication",
    # Advanced models - Automation Rules & Logs
    "RecruitmentEmailTemplate",
    "RecruitmentAutomationRule",
    "AutomationLog",
    "RecruitmentScheduledAction",
    # Advanced models - DEI & Compliance
    "DEIGoal",
    "DEIMetrics",
    "EEOCData",
    # Advanced models - Analytics & Metrics
    "PipelineMetrics",
    "HiringGoal",
    "StageAnalytics",
]
