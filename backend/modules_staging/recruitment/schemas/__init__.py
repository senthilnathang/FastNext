"""
Recruitment Schemas

Pydantic schemas for the recruitment module.
"""

# Core recruitment schemas
from .recruitment import (
    # Skill
    SkillBase, SkillCreate, SkillUpdate, SkillResponse, SkillList,
    # Stage
    StageBase, StageCreate, StageUpdate, StageResponse, StageList,
    # Reject Reason
    RejectReasonBase, RejectReasonCreate, RejectReasonUpdate,
    RejectReasonResponse, RejectReasonList,
    # Candidate
    CandidateBase, CandidateCreate, CandidateUpdate, CandidateMoveStage,
    CandidateResponse, CandidateList,
    # Rejected Candidate
    RejectedCandidateBase, RejectedCandidateCreate, RejectedCandidateUpdate,
    RejectedCandidateResponse, RejectedCandidateList,
    # Stage Note
    StageNoteBase, StageNoteCreate, StageNoteUpdate,
    StageNoteResponse, StageNoteList,
    # Stage Files
    StageFilesBase, StageFilesCreate, StageFilesUpdate,
    StageFilesResponse, StageFilesList,
    # Recruitment
    RecruitmentBase, RecruitmentCreate, RecruitmentUpdate,
    RecruitmentResponse, RecruitmentList,
    # Recruitment General Settings
    RecruitmentGeneralSettingBase, RecruitmentGeneralSettingCreate,
    RecruitmentGeneralSettingUpdate, RecruitmentGeneralSettingResponse,
    # Reports
    HiringReport, SourceAnalysis,
)

# Quiz integration schemas (questionnaires now use shared Quiz module)
from .survey import (
    # Candidate Quiz Attempt
    CandidateQuizAttemptBase, CandidateQuizAttemptCreate, CandidateQuizAttemptUpdate,
    CandidateQuizAttemptResponse, CandidateQuizAttemptList,
    # Recruitment Quiz Association
    RecruitmentQuizAssign, RecruitmentQuizUnassign,
    RecruitmentQuizResponse, RecruitmentQuizList,
    # Bulk Operations
    BulkInviteCandidatesToQuiz, BulkQuizInviteResult,
    # Quiz Results Summary
    CandidateQuizSummary, RecruitmentQuizSummary,
)

# Skill Zone schemas
from .skill_zone import (
    # Skill Zone
    SkillZoneBase, SkillZoneCreate, SkillZoneUpdate,
    SkillZoneResponse, SkillZoneList,
    # Skill Zone Candidate
    SkillZoneCandidateBase, SkillZoneCandidateCreate, SkillZoneCandidateUpdate,
    SkillZoneCandidateResponse, SkillZoneCandidateList,
    # Candidate Rating
    CandidateRatingBase, CandidateRatingCreate, CandidateRatingUpdate,
    CandidateRatingResponse, CandidateRatingList,
    # Bulk Operations
    BulkAddToSkillZone, BulkRemoveFromSkillZone, SkillZoneWithCandidates,
)

# Interview schemas
from .interview import (
    # Interview Schedule
    InterviewScheduleBase, InterviewScheduleCreate, InterviewScheduleUpdate,
    InterviewScheduleResponse, InterviewScheduleList,
    # Interview Scorecard Template
    ScorecardCriteria, InterviewScorecardTemplateBase, InterviewScorecardTemplateCreate,
    InterviewScorecardTemplateUpdate, InterviewScorecardTemplateResponse,
    InterviewScorecardTemplateList,
    # Interview Feedback
    InterviewFeedbackBase, InterviewFeedbackCreate, InterviewFeedbackUpdate,
    InterviewFeedbackResponse, InterviewFeedbackList,
    # Interview Availability
    RecurringPattern, InterviewAvailabilityBase, InterviewAvailabilityCreate,
    InterviewAvailabilityUpdate, InterviewAvailabilityResponse, InterviewAvailabilityList,
    # Interview Question
    InterviewQuestionBase, InterviewQuestionCreate, InterviewQuestionUpdate,
    InterviewQuestionResponse, InterviewQuestionList,
    # Competency
    CompetencyBase, CompetencyCreate, CompetencyUpdate,
    CompetencyResponse, CompetencyList,
    # Interview Kit
    InterviewKitBase, InterviewKitCreate, InterviewKitUpdate,
    InterviewKitResponse, InterviewKitList,
    # Interview Kit Question
    InterviewKitQuestionBase, InterviewKitQuestionCreate, InterviewKitQuestionUpdate,
    InterviewKitQuestionResponse, InterviewKitQuestionList,
    # Competency Rating
    CompetencyRatingBase, CompetencyRatingCreate, CompetencyRatingUpdate,
    CompetencyRatingResponse, CompetencyRatingList,
    # Interview Guide
    InterviewGuideBase, InterviewGuideCreate, InterviewGuideUpdate,
    InterviewGuideResponse, InterviewGuideList,
    # Composite schemas
    InterviewScheduleWithFeedback, InterviewKitWithQuestions,
)

# Document schemas
from .documents import (
    # Resume
    ResumeBase, ResumeCreate, ResumeUpdate, ResumeResponse, ResumeList,
    # Candidate Document Request
    CandidateDocumentRequestBase, CandidateDocumentRequestCreate,
    CandidateDocumentRequestUpdate, CandidateDocumentRequestResponse,
    CandidateDocumentRequestList,
    # Candidate Document
    CandidateDocumentBase, CandidateDocumentCreate, CandidateDocumentUpdate,
    CandidateDocumentResponse, CandidateDocumentList,
    # Document Operations
    DocumentApprove, DocumentReject, BulkDocumentRequest, DocumentUpload,
)

# Advanced schemas
from .advanced import (
    # LinkedIn Account
    LinkedInAccountBase, LinkedInAccountCreate, LinkedInAccountUpdate,
    LinkedInAccountResponse, LinkedInAccountList,
    # Job Alert
    JobAlertBase, JobAlertCreate, JobAlertUpdate,
    JobAlertResponse, JobAlertList,
    # Saved Job
    SavedJobBase, SavedJobCreate, SavedJobUpdate,
    SavedJobResponse, SavedJobList,
    # Job Offer
    JobOfferBase, JobOfferCreate, JobOfferUpdate,
    JobOfferResponse, JobOfferList,
    # Offer Negotiation
    OfferNegotiationBase, OfferNegotiationCreate, OfferNegotiationUpdate,
    OfferNegotiationResponse, OfferNegotiationList,
    # Talent Pool
    TalentPoolBase, TalentPoolCreate, TalentPoolUpdate,
    TalentPoolResponse, TalentPoolList,
    # Talent Pool Candidate
    TalentPoolCandidateBase, TalentPoolCandidateCreate, TalentPoolCandidateUpdate,
    TalentPoolCandidateResponse, TalentPoolCandidateList,
    # Candidate Source Channel
    CandidateSourceChannelBase, CandidateSourceChannelCreate,
    CandidateSourceChannelUpdate, CandidateSourceChannelResponse,
    CandidateSourceChannelList,
    # Candidate Tag
    CandidateTagBase, CandidateTagCreate, CandidateTagUpdate,
    CandidateTagResponse, CandidateTagList,
    # Employee Referral
    EmployeeReferralBase, EmployeeReferralCreate, EmployeeReferralUpdate,
    EmployeeReferralResponse, EmployeeReferralList,
    # Hiring Team Member
    HiringTeamMemberBase, HiringTeamMemberCreate, HiringTeamMemberUpdate,
    HiringTeamMemberResponse, HiringTeamMemberList,
    # Hiring Approval
    HiringApprovalBase, HiringApprovalCreate, HiringApprovalUpdate,
    HiringApprovalResponse, HiringApprovalList,
    # DEI Goal
    DEIGoalBase, DEIGoalCreate, DEIGoalUpdate,
    DEIGoalResponse, DEIGoalList,
    # Hiring Goal
    HiringGoalBase, HiringGoalCreate, HiringGoalUpdate,
    HiringGoalResponse, HiringGoalList,
    # Communication Template
    CommunicationTemplateBase, CommunicationTemplateCreate,
    CommunicationTemplateUpdate, CommunicationTemplateResponse,
    CommunicationTemplateList,
    # Automation Rule
    AutomationRuleBase, AutomationRuleCreate, AutomationRuleUpdate,
    AutomationRuleResponse, AutomationRuleList,
    # Pipeline Metrics
    PipelineMetricsBase, PipelineMetricsCreate,
    PipelineMetricsResponse, PipelineMetricsList,
    # Scoring Criteria
    ScoringCriteriaBase, ScoringCriteriaCreate, ScoringCriteriaUpdate,
    ScoringCriteriaResponse, ScoringCriteriaList,
    # Candidate Scorecard
    CandidateScorecardBase, CandidateScorecardCreate, CandidateScorecardUpdate,
    CandidateScorecardResponse, CandidateScorecardList,
    # Bulk Operations
    BulkAddToTalentPool, BulkTagCandidates, BulkMoveStage,
)

__all__ = [
    # =========================================================================
    # Core Recruitment Schemas
    # =========================================================================
    # Skill
    "SkillBase", "SkillCreate", "SkillUpdate", "SkillResponse", "SkillList",
    # Stage
    "StageBase", "StageCreate", "StageUpdate", "StageResponse", "StageList",
    # Reject Reason
    "RejectReasonBase", "RejectReasonCreate", "RejectReasonUpdate",
    "RejectReasonResponse", "RejectReasonList",
    # Candidate
    "CandidateBase", "CandidateCreate", "CandidateUpdate", "CandidateMoveStage",
    "CandidateResponse", "CandidateList",
    # Rejected Candidate
    "RejectedCandidateBase", "RejectedCandidateCreate", "RejectedCandidateUpdate",
    "RejectedCandidateResponse", "RejectedCandidateList",
    # Stage Note
    "StageNoteBase", "StageNoteCreate", "StageNoteUpdate",
    "StageNoteResponse", "StageNoteList",
    # Stage Files
    "StageFilesBase", "StageFilesCreate", "StageFilesUpdate",
    "StageFilesResponse", "StageFilesList",
    # Recruitment
    "RecruitmentBase", "RecruitmentCreate", "RecruitmentUpdate",
    "RecruitmentResponse", "RecruitmentList",
    # Recruitment General Settings
    "RecruitmentGeneralSettingBase", "RecruitmentGeneralSettingCreate",
    "RecruitmentGeneralSettingUpdate", "RecruitmentGeneralSettingResponse",
    # Reports
    "HiringReport", "SourceAnalysis",

    # =========================================================================
    # Quiz Integration Schemas
    # =========================================================================
    # Candidate Quiz Attempt
    "CandidateQuizAttemptBase", "CandidateQuizAttemptCreate", "CandidateQuizAttemptUpdate",
    "CandidateQuizAttemptResponse", "CandidateQuizAttemptList",
    # Recruitment Quiz Association
    "RecruitmentQuizAssign", "RecruitmentQuizUnassign",
    "RecruitmentQuizResponse", "RecruitmentQuizList",
    # Bulk Operations
    "BulkInviteCandidatesToQuiz", "BulkQuizInviteResult",
    # Quiz Results Summary
    "CandidateQuizSummary", "RecruitmentQuizSummary",

    # =========================================================================
    # Skill Zone Schemas
    # =========================================================================
    # Skill Zone
    "SkillZoneBase", "SkillZoneCreate", "SkillZoneUpdate",
    "SkillZoneResponse", "SkillZoneList",
    # Skill Zone Candidate
    "SkillZoneCandidateBase", "SkillZoneCandidateCreate", "SkillZoneCandidateUpdate",
    "SkillZoneCandidateResponse", "SkillZoneCandidateList",
    # Candidate Rating
    "CandidateRatingBase", "CandidateRatingCreate", "CandidateRatingUpdate",
    "CandidateRatingResponse", "CandidateRatingList",
    # Bulk Operations
    "BulkAddToSkillZone", "BulkRemoveFromSkillZone", "SkillZoneWithCandidates",

    # =========================================================================
    # Interview Schemas
    # =========================================================================
    # Interview Schedule
    "InterviewScheduleBase", "InterviewScheduleCreate", "InterviewScheduleUpdate",
    "InterviewScheduleResponse", "InterviewScheduleList",
    # Interview Scorecard Template
    "ScorecardCriteria", "InterviewScorecardTemplateBase", "InterviewScorecardTemplateCreate",
    "InterviewScorecardTemplateUpdate", "InterviewScorecardTemplateResponse",
    "InterviewScorecardTemplateList",
    # Interview Feedback
    "InterviewFeedbackBase", "InterviewFeedbackCreate", "InterviewFeedbackUpdate",
    "InterviewFeedbackResponse", "InterviewFeedbackList",
    # Interview Availability
    "RecurringPattern", "InterviewAvailabilityBase", "InterviewAvailabilityCreate",
    "InterviewAvailabilityUpdate", "InterviewAvailabilityResponse", "InterviewAvailabilityList",
    # Interview Question
    "InterviewQuestionBase", "InterviewQuestionCreate", "InterviewQuestionUpdate",
    "InterviewQuestionResponse", "InterviewQuestionList",
    # Competency
    "CompetencyBase", "CompetencyCreate", "CompetencyUpdate",
    "CompetencyResponse", "CompetencyList",
    # Interview Kit
    "InterviewKitBase", "InterviewKitCreate", "InterviewKitUpdate",
    "InterviewKitResponse", "InterviewKitList",
    # Interview Kit Question
    "InterviewKitQuestionBase", "InterviewKitQuestionCreate", "InterviewKitQuestionUpdate",
    "InterviewKitQuestionResponse", "InterviewKitQuestionList",
    # Competency Rating
    "CompetencyRatingBase", "CompetencyRatingCreate", "CompetencyRatingUpdate",
    "CompetencyRatingResponse", "CompetencyRatingList",
    # Interview Guide
    "InterviewGuideBase", "InterviewGuideCreate", "InterviewGuideUpdate",
    "InterviewGuideResponse", "InterviewGuideList",
    # Composite schemas
    "InterviewScheduleWithFeedback", "InterviewKitWithQuestions",

    # =========================================================================
    # Document Schemas
    # =========================================================================
    # Resume
    "ResumeBase", "ResumeCreate", "ResumeUpdate", "ResumeResponse", "ResumeList",
    # Candidate Document Request
    "CandidateDocumentRequestBase", "CandidateDocumentRequestCreate",
    "CandidateDocumentRequestUpdate", "CandidateDocumentRequestResponse",
    "CandidateDocumentRequestList",
    # Candidate Document
    "CandidateDocumentBase", "CandidateDocumentCreate", "CandidateDocumentUpdate",
    "CandidateDocumentResponse", "CandidateDocumentList",
    # Document Operations
    "DocumentApprove", "DocumentReject", "BulkDocumentRequest", "DocumentUpload",

    # =========================================================================
    # Advanced Schemas
    # =========================================================================
    # LinkedIn Account
    "LinkedInAccountBase", "LinkedInAccountCreate", "LinkedInAccountUpdate",
    "LinkedInAccountResponse", "LinkedInAccountList",
    # Job Alert
    "JobAlertBase", "JobAlertCreate", "JobAlertUpdate",
    "JobAlertResponse", "JobAlertList",
    # Saved Job
    "SavedJobBase", "SavedJobCreate", "SavedJobUpdate",
    "SavedJobResponse", "SavedJobList",
    # Job Offer
    "JobOfferBase", "JobOfferCreate", "JobOfferUpdate",
    "JobOfferResponse", "JobOfferList",
    # Offer Negotiation
    "OfferNegotiationBase", "OfferNegotiationCreate", "OfferNegotiationUpdate",
    "OfferNegotiationResponse", "OfferNegotiationList",
    # Talent Pool
    "TalentPoolBase", "TalentPoolCreate", "TalentPoolUpdate",
    "TalentPoolResponse", "TalentPoolList",
    # Talent Pool Candidate
    "TalentPoolCandidateBase", "TalentPoolCandidateCreate", "TalentPoolCandidateUpdate",
    "TalentPoolCandidateResponse", "TalentPoolCandidateList",
    # Candidate Source Channel
    "CandidateSourceChannelBase", "CandidateSourceChannelCreate",
    "CandidateSourceChannelUpdate", "CandidateSourceChannelResponse",
    "CandidateSourceChannelList",
    # Candidate Tag
    "CandidateTagBase", "CandidateTagCreate", "CandidateTagUpdate",
    "CandidateTagResponse", "CandidateTagList",
    # Employee Referral
    "EmployeeReferralBase", "EmployeeReferralCreate", "EmployeeReferralUpdate",
    "EmployeeReferralResponse", "EmployeeReferralList",
    # Hiring Team Member
    "HiringTeamMemberBase", "HiringTeamMemberCreate", "HiringTeamMemberUpdate",
    "HiringTeamMemberResponse", "HiringTeamMemberList",
    # Hiring Approval
    "HiringApprovalBase", "HiringApprovalCreate", "HiringApprovalUpdate",
    "HiringApprovalResponse", "HiringApprovalList",
    # DEI Goal
    "DEIGoalBase", "DEIGoalCreate", "DEIGoalUpdate",
    "DEIGoalResponse", "DEIGoalList",
    # Hiring Goal
    "HiringGoalBase", "HiringGoalCreate", "HiringGoalUpdate",
    "HiringGoalResponse", "HiringGoalList",
    # Communication Template
    "CommunicationTemplateBase", "CommunicationTemplateCreate",
    "CommunicationTemplateUpdate", "CommunicationTemplateResponse",
    "CommunicationTemplateList",
    # Automation Rule
    "AutomationRuleBase", "AutomationRuleCreate", "AutomationRuleUpdate",
    "AutomationRuleResponse", "AutomationRuleList",
    # Pipeline Metrics
    "PipelineMetricsBase", "PipelineMetricsCreate",
    "PipelineMetricsResponse", "PipelineMetricsList",
    # Scoring Criteria
    "ScoringCriteriaBase", "ScoringCriteriaCreate", "ScoringCriteriaUpdate",
    "ScoringCriteriaResponse", "ScoringCriteriaList",
    # Candidate Scorecard
    "CandidateScorecardBase", "CandidateScorecardCreate", "CandidateScorecardUpdate",
    "CandidateScorecardResponse", "CandidateScorecardList",
    # Bulk Operations
    "BulkAddToTalentPool", "BulkTagCandidates", "BulkMoveStage",
]
