/**
 * Recruitment Module API Client
 *
 * JavaScript API functions for the Recruitment module.
 * This file is fetched at runtime by vue3-sfc-loader.
 *
 * All endpoints are relative to /recruitment since requestClient adds /api/v1 prefix.
 */

import { requestClient } from '#/api/request';

const BASE_URL = '/recruitment';

// =============================================================================
// SKILLS (recruitment.py - no prefix)
// =============================================================================

export async function getSkillsApi(params = {}) {
  return requestClient.get(`${BASE_URL}/skills`, { params });
}

export async function getSkillApi(id) {
  return requestClient.get(`${BASE_URL}/skills/${id}`);
}

export async function createSkillApi(data) {
  return requestClient.post(`${BASE_URL}/skills`, data);
}

export async function updateSkillApi(id, data) {
  return requestClient.put(`${BASE_URL}/skills/${id}`, data);
}

export async function deleteSkillApi(id) {
  return requestClient.delete(`${BASE_URL}/skills/${id}`);
}

// =============================================================================
// JOBS (recruitment.py - no prefix, routes at /jobs)
// =============================================================================

export async function getJobsApi(params = {}) {
  return requestClient.get(`${BASE_URL}/jobs`, { params });
}

export async function getJobApi(id) {
  return requestClient.get(`${BASE_URL}/jobs/${id}`);
}

export async function createJobApi(data) {
  return requestClient.post(`${BASE_URL}/jobs`, data);
}

export async function updateJobApi(id, data) {
  return requestClient.put(`${BASE_URL}/jobs/${id}`, data);
}

export async function deleteJobApi(id) {
  return requestClient.delete(`${BASE_URL}/jobs/${id}`);
}

export async function publishJobApi(id) {
  return requestClient.post(`${BASE_URL}/jobs/${id}/publish`);
}

export async function closeJobApi(id) {
  return requestClient.post(`${BASE_URL}/jobs/${id}/close`);
}

// =============================================================================
// STAGES (recruitment.py - /jobs/{id}/stages and /stages/{id})
// =============================================================================

export async function getStagesApi(params = {}) {
  return requestClient.get(`${BASE_URL}/stages/`, { params });
}

export async function getStageApi(id) {
  return requestClient.get(`${BASE_URL}/stages/${id}`);
}

export async function createStageApi(data) {
  return requestClient.post(`${BASE_URL}/stages/`, data);
}

export async function updateStageApi(id, data) {
  return requestClient.put(`${BASE_URL}/stages/${id}`, data);
}

export async function deleteStageApi(id) {
  return requestClient.delete(`${BASE_URL}/stages/${id}`);
}

// Get stages for a specific job
export async function getJobStagesApi(jobId) {
  return requestClient.get(`${BASE_URL}/jobs/${jobId}/stages`);
}

// Create stage for a specific job
export async function createJobStageApi(jobId, data) {
  return requestClient.post(`${BASE_URL}/jobs/${jobId}/stages`, data);
}

// =============================================================================
// PIPELINE (recruitment.py - /jobs/{id}/pipeline)
// =============================================================================

export async function getPipelineApi(jobId) {
  return requestClient.get(`${BASE_URL}/jobs/${jobId}/pipeline`);
}

// =============================================================================
// REPORTS (recruitment.py - /reports/hiring)
// =============================================================================

export async function getHiringReportApi(params = {}) {
  return requestClient.get(`${BASE_URL}/reports/hiring`, { params });
}

export async function generateReportApi(params = {}) {
  const mapped = { ...params };
  if (mapped.date_from) { mapped.start_date = mapped.date_from; delete mapped.date_from; }
  if (mapped.date_to) { mapped.end_date = mapped.date_to; delete mapped.date_to; }
  return requestClient.get(`${BASE_URL}/reports/hiring`, { params: mapped });
}

export async function exportReportApi(params = {}) {
  const mapped = { ...params };
  if (mapped.date_from) { mapped.start_date = mapped.date_from; delete mapped.date_from; }
  if (mapped.date_to) { mapped.end_date = mapped.date_to; delete mapped.date_to; }
  return requestClient.get(`${BASE_URL}/reports/hiring`, {
    params: mapped,
    responseType: 'blob',
  });
}

// =============================================================================
// CANDIDATES (candidate.py - prefix /candidates)
// =============================================================================

export async function getCandidatesApi(params = {}) {
  return requestClient.get(`${BASE_URL}/candidates/`, { params });
}

export async function getCandidateApi(id) {
  return requestClient.get(`${BASE_URL}/candidates/${id}`);
}

export async function createCandidateApi(data) {
  return requestClient.post(`${BASE_URL}/candidates/`, data);
}

export async function updateCandidateApi(id, data) {
  return requestClient.put(`${BASE_URL}/candidates/${id}`, data);
}

export async function deleteCandidateApi(id) {
  return requestClient.delete(`${BASE_URL}/candidates/${id}`);
}

// Stage moves
export async function moveCandidateStageApi(candidateId, data) {
  return requestClient.post(`${BASE_URL}/candidates/${candidateId}/move-stage`, data);
}

// Hire / Cancel / Reject
export async function hireCandidateApi(candidateId, data = {}) {
  return requestClient.post(`${BASE_URL}/candidates/${candidateId}/hire`, data);
}

export async function cancelCandidateApi(candidateId, reason) {
  return requestClient.post(`${BASE_URL}/candidates/${candidateId}/cancel`, null, {
    params: { reason },
  });
}

export async function rejectCandidateApi(candidateId, data) {
  return requestClient.post(`${BASE_URL}/candidates/${candidateId}/reject`, data);
}

// =============================================================================
// TAGS (candidate.py - /candidates/tags)
// =============================================================================

export async function getTagsApi() {
  return requestClient.get(`${BASE_URL}/candidates/tags`);
}

export async function getCandidateTagsApi(params = {}) {
  return requestClient.get(`${BASE_URL}/candidates/tags`, { params });
}

export async function getCandidateTagApi(id) {
  return requestClient.get(`${BASE_URL}/candidates/tags/${id}`);
}

export async function createTagApi(data) {
  return requestClient.post(`${BASE_URL}/candidates/tags`, data);
}

export async function createCandidateTagApi(data) {
  return requestClient.post(`${BASE_URL}/candidates/tags`, data);
}

export async function updateTagApi(id, data) {
  return requestClient.put(`${BASE_URL}/candidates/tags/${id}`, data);
}

export async function updateCandidateTagApi(id, data) {
  return requestClient.put(`${BASE_URL}/candidates/tags/${id}`, data);
}

export async function deleteTagApi(id) {
  return requestClient.delete(`${BASE_URL}/candidates/tags/${id}`);
}

export async function deleteCandidateTagApi(id) {
  return requestClient.delete(`${BASE_URL}/candidates/tags/${id}`);
}

export async function assignCandidateTagsApi(data) {
  return requestClient.post(`${BASE_URL}/candidates/tags/assign`, data);
}

// Add/remove tags on a specific candidate
export async function addTagsToCandidateApi(candidateId, data) {
  return requestClient.post(`${BASE_URL}/candidates/${candidateId}/tags`, data);
}

export async function removeTagFromCandidateApi(candidateId, tagId) {
  return requestClient.delete(`${BASE_URL}/candidates/${candidateId}/tags/${tagId}`);
}

// =============================================================================
// SOURCE CHANNELS (candidate.py - /candidates/source-channels)
// =============================================================================

export async function getSourceChannelsApi(params = {}) {
  return requestClient.get(`${BASE_URL}/candidates/source-channels`, { params });
}

export async function getSourceChannelApi(id) {
  return requestClient.get(`${BASE_URL}/candidates/source-channels/${id}`);
}

export async function createSourceChannelApi(data) {
  return requestClient.post(`${BASE_URL}/candidates/source-channels`, data);
}

export async function updateSourceChannelApi(id, data) {
  return requestClient.put(`${BASE_URL}/candidates/source-channels/${id}`, data);
}

export async function deleteSourceChannelApi(id) {
  return requestClient.delete(`${BASE_URL}/candidates/source-channels/${id}`);
}

export async function getSourceStatsApi(params = {}) {
  return requestClient.get(`${BASE_URL}/analytics/pipeline/overview`, { params });
}

// =============================================================================
// CANDIDATE RATINGS (candidate.py - /candidates/{id}/ratings)
// =============================================================================

export async function getCandidateRatingsApi(candidateId) {
  return requestClient.get(`${BASE_URL}/candidates/${candidateId}/ratings`);
}

export async function addCandidateRatingApi(candidateId, data) {
  return requestClient.post(`${BASE_URL}/candidates/${candidateId}/ratings`, data);
}

export async function getCandidateAverageRatingApi(candidateId) {
  return requestClient.get(`${BASE_URL}/candidates/${candidateId}/average-rating`);
}

// =============================================================================
// CANDIDATE NOTES (candidate.py - /candidates/{id}/notes)
// =============================================================================

export async function getCandidateNotesApi(candidateId, params = {}) {
  return requestClient.get(`${BASE_URL}/candidates/${candidateId}/notes`, { params });
}

export async function addCandidateNoteApi(candidateId, data) {
  return requestClient.post(`${BASE_URL}/candidates/${candidateId}/notes`, data);
}

// =============================================================================
// CANDIDATE DOCUMENTS (candidate.py - /candidates/{id}/documents)
// =============================================================================

export async function getCandidateDocumentsApi(candidateId) {
  return requestClient.get(`${BASE_URL}/candidates/${candidateId}/documents`);
}

export async function addCandidateDocumentApi(candidateId, data) {
  return requestClient.post(`${BASE_URL}/candidates/${candidateId}/documents`, data);
}

export async function updateDocumentStatusApi(candidateId, documentId, data) {
  return requestClient.patch(`${BASE_URL}/candidates/${candidateId}/documents/${documentId}/status`, data);
}

// =============================================================================
// CANDIDATE SCORES (candidate.py - /candidates/{id}/scores)
// =============================================================================

export async function getCandidateScoresApi(candidateId) {
  return requestClient.get(`${BASE_URL}/candidates/${candidateId}/scores`);
}

// =============================================================================
// REJECT REASONS (candidate.py - /candidates/reject-reasons)
// =============================================================================

export async function getRejectReasonsApi() {
  return requestClient.get(`${BASE_URL}/candidates/reject-reasons`);
}

export async function createRejectReasonApi(data) {
  return requestClient.post(`${BASE_URL}/candidates/reject-reasons`, data);
}

// =============================================================================
// BULK OPERATIONS (candidate.py - /candidates/bulk/...)
// =============================================================================

export async function bulkMoveStageApi(data) {
  return requestClient.post(`${BASE_URL}/candidates/bulk/move-stage`, data);
}

export async function bulkAddTagsApi(data) {
  return requestClient.post(`${BASE_URL}/candidates/bulk/add-tags`, data);
}

// =============================================================================
// INTERVIEWS (interview.py - prefix /interviews)
// =============================================================================

export async function getInterviewsApi(params = {}) {
  return requestClient.get(`${BASE_URL}/interviews/`, { params });
}

export async function getInterviewApi(id) {
  return requestClient.get(`${BASE_URL}/interviews/${id}`);
}

export async function createInterviewApi(data) {
  return requestClient.post(`${BASE_URL}/interviews/`, data);
}

export async function updateInterviewApi(id, data) {
  return requestClient.put(`${BASE_URL}/interviews/${id}`, data);
}

export async function deleteInterviewApi(id) {
  return requestClient.delete(`${BASE_URL}/interviews/${id}`);
}

// Interview actions
export async function rescheduleInterviewApi(id, data) {
  return requestClient.post(`${BASE_URL}/interviews/${id}/reschedule`, data);
}

export async function completeInterviewApi(id, data = {}) {
  return requestClient.post(`${BASE_URL}/interviews/${id}/complete`, data);
}

export async function cancelInterviewApi(id, data = {}) {
  return requestClient.post(`${BASE_URL}/interviews/${id}/cancel`, data);
}

// Interview stats
export async function getInterviewStatsApi(params = {}) {
  return requestClient.get(`${BASE_URL}/interviews/stats`, { params });
}

// Interview calendar
export async function getInterviewCalendarApi(params = {}) {
  return requestClient.get(`${BASE_URL}/interviews/calendar`, { params });
}

// =============================================================================
// INTERVIEW FEEDBACK (interview.py - /interviews/{id}/feedback)
// =============================================================================

export async function getInterviewFeedbackApi(interviewId) {
  return requestClient.get(`${BASE_URL}/interviews/${interviewId}/feedback`);
}

export async function addInterviewFeedbackApi(interviewId, data) {
  return requestClient.post(`${BASE_URL}/interviews/${interviewId}/feedback`, data);
}

// Standalone interview feedback endpoints
export async function getInterviewFeedbacksApi(params = {}) {
  return requestClient.get(`${BASE_URL}/interviews/feedbacks`, { params });
}

export async function getInterviewFeedbackByIdApi(id) {
  return requestClient.get(`${BASE_URL}/interviews/feedbacks/${id}`);
}

export async function submitInterviewerFeedbackApi(data) {
  // Post feedback to a specific interview
  const interviewId = data.interview_id;
  return requestClient.post(`${BASE_URL}/interviews/${interviewId}/feedback`, data);
}

export async function updateInterviewFeedbackApi(id, data) {
  return requestClient.put(`${BASE_URL}/interviews/feedbacks/${id}`, data);
}

export async function deleteInterviewFeedbackApi(id) {
  return requestClient.delete(`${BASE_URL}/interviews/feedbacks/${id}`);
}

// =============================================================================
// INTERVIEW QUESTIONS (interview.py - /interviews/questions)
// =============================================================================

export async function getInterviewQuestionsApi(params = {}) {
  return requestClient.get(`${BASE_URL}/interviews/questions/`, { params });
}

export async function getInterviewQuestionApi(id) {
  return requestClient.get(`${BASE_URL}/interviews/questions/${id}`);
}

export async function createInterviewQuestionApi(data) {
  return requestClient.post(`${BASE_URL}/interviews/questions`, data);
}

export async function updateInterviewQuestionApi(id, data) {
  return requestClient.put(`${BASE_URL}/interviews/questions/${id}`, data);
}

export async function deleteInterviewQuestionApi(id) {
  return requestClient.delete(`${BASE_URL}/interviews/questions/${id}`);
}

// =============================================================================
// SCORECARD TEMPLATES (interview.py - /interviews/scorecard-templates)
// =============================================================================

export async function getScorecardTemplatesApi(params = {}) {
  return requestClient.get(`${BASE_URL}/interviews/scorecard-templates`, { params });
}

export async function getScorecardTemplateApi(id) {
  return requestClient.get(`${BASE_URL}/interviews/scorecard-templates/${id}`);
}

export async function createScorecardTemplateApi(data) {
  return requestClient.post(`${BASE_URL}/interviews/scorecard-templates`, data);
}

export async function updateScorecardTemplateApi(id, data) {
  return requestClient.put(`${BASE_URL}/interviews/scorecard-templates/${id}`, data);
}

// Standalone scorecard template endpoints (alternate paths from TS)
export async function getInterviewScorecardTemplatesApi(params = {}) {
  return requestClient.get(`${BASE_URL}/interviews/scorecard-templates`, { params });
}

export async function getInterviewScorecardTemplateApi(id) {
  return requestClient.get(`${BASE_URL}/interviews/scorecard-templates/${id}`);
}

export async function createInterviewScorecardTemplateApi(data) {
  return requestClient.post(`${BASE_URL}/interviews/scorecard-templates`, data);
}

export async function updateInterviewScorecardTemplateApi(id, data) {
  return requestClient.put(`${BASE_URL}/interviews/scorecard-templates/${id}`, data);
}

export async function deleteInterviewScorecardTemplateApi(id) {
  return requestClient.delete(`${BASE_URL}/interviews/scorecard-templates/${id}`);
}

// =============================================================================
// CANDIDATE SCORECARDS
// =============================================================================

export async function getCandidateScorecardsApi(params = {}) {
  return requestClient.get(`${BASE_URL}/scoring/candidates/scorecards`, { params });
}

export async function getCandidateScorecardApi(id) {
  return requestClient.get(`${BASE_URL}/scoring/candidates/scorecards/${id}`);
}

export async function createCandidateScorecardApi(data) {
  return requestClient.post(`${BASE_URL}/scoring/candidates/scorecards`, data);
}

export async function updateCandidateScorecardApi(id, data) {
  return requestClient.put(`${BASE_URL}/scoring/candidates/scorecards/${id}`, data);
}

export async function deleteCandidateScorecardApi(id) {
  return requestClient.delete(`${BASE_URL}/scoring/candidates/scorecards/${id}`);
}

// =============================================================================
// COMPETENCIES (interview.py - /interviews/competencies)
// =============================================================================

export async function getCompetenciesApi(params = {}) {
  return requestClient.get(`${BASE_URL}/interviews/competencies`, { params });
}

export async function getCompetencyApi(id) {
  return requestClient.get(`${BASE_URL}/interviews/competencies/${id}`);
}

export async function createCompetencyApi(data) {
  return requestClient.post(`${BASE_URL}/interviews/competencies`, data);
}

export async function updateCompetencyApi(id, data) {
  return requestClient.put(`${BASE_URL}/interviews/competencies/${id}`, data);
}

export async function deleteCompetencyApi(id) {
  return requestClient.delete(`${BASE_URL}/interviews/competencies/${id}`);
}

// Competency ratings
export async function getCompetencyRatingsApi(params = {}) {
  return requestClient.get(`${BASE_URL}/interviews/competency-ratings`, { params });
}

export async function createCompetencyRatingApi(data) {
  return requestClient.post(`${BASE_URL}/interviews/competency-ratings`, data);
}

export async function updateCompetencyRatingApi(id, data) {
  return requestClient.put(`${BASE_URL}/interviews/competency-ratings/${id}`, data);
}

export async function deleteCompetencyRatingApi(id) {
  return requestClient.delete(`${BASE_URL}/interviews/competency-ratings/${id}`);
}

// Add competency rating for a specific interview
export async function addCompetencyRatingApi(interviewId, candidateId, data) {
  return requestClient.post(
    `${BASE_URL}/interviews/${interviewId}/competency-ratings`,
    data,
    { params: { candidate_id: candidateId } },
  );
}

// =============================================================================
// INTERVIEW KITS (interview.py - /interviews/kits)
// =============================================================================

export async function getInterviewKitsApi(params = {}) {
  return requestClient.get(`${BASE_URL}/interviews/kits`, { params });
}

export async function getInterviewKitApi(id, includeQuestions) {
  return requestClient.get(`${BASE_URL}/interviews/kits/${id}`, {
    params: { include_questions: includeQuestions },
  });
}

export async function createInterviewKitApi(data) {
  return requestClient.post(`${BASE_URL}/interviews/kits`, data);
}

export async function updateInterviewKitApi(id, data) {
  return requestClient.put(`${BASE_URL}/interviews/kits/${id}`, data);
}

export async function deleteInterviewKitApi(id) {
  return requestClient.delete(`${BASE_URL}/interviews/kits/${id}`);
}

// Interview kit questions
export async function getInterviewKitQuestionsApi(kitId) {
  return requestClient.get(`${BASE_URL}/interviews/kits/${kitId}/questions`);
}

export async function addInterviewKitQuestionApi(kitId, data) {
  return requestClient.post(`${BASE_URL}/interviews/kits/${kitId}/questions`, data);
}

export async function updateInterviewKitQuestionApi(id, data) {
  return requestClient.put(`${BASE_URL}/interviews/kit-questions/${id}`, data);
}

export async function deleteInterviewKitQuestionApi(id) {
  return requestClient.delete(`${BASE_URL}/interviews/kit-questions/${id}`);
}

// Interview guides
export async function getInterviewGuidesApi(kitId) {
  return requestClient.get(`${BASE_URL}/interviews/guides`, {
    params: { kit_id: kitId },
  });
}

export async function createInterviewGuideApi(data) {
  return requestClient.post(`${BASE_URL}/interviews/guides`, data);
}

export async function updateInterviewGuideApi(id, data) {
  return requestClient.put(`${BASE_URL}/interviews/guides/${id}`, data);
}

export async function deleteInterviewGuideApi(id) {
  return requestClient.delete(`${BASE_URL}/interviews/guides/${id}`);
}

// =============================================================================
// INTERVIEW AVAILABILITY (interview.py - /interviews/availability)
// =============================================================================

export async function getAvailabilityApi(params = {}) {
  return requestClient.get(`${BASE_URL}/interviews/availability`, { params });
}

export async function getInterviewAvailabilityApi(params = {}) {
  return requestClient.get(`${BASE_URL}/interviews/availability`, { params });
}

export async function getInterviewAvailabilitySlotApi(id) {
  return requestClient.get(`${BASE_URL}/interviews/availability/${id}`);
}

export async function createAvailabilityApi(employeeId, data) {
  return requestClient.post(`${BASE_URL}/interviews/availability`, data, {
    params: { employee_id: employeeId },
  });
}

export async function createInterviewAvailabilityApi(data) {
  return requestClient.post(`${BASE_URL}/interviews/availability`, data);
}

export async function updateAvailabilityApi(id, data) {
  return requestClient.put(`${BASE_URL}/interviews/availability/${id}`, data);
}

export async function updateInterviewAvailabilityApi(id, data) {
  return requestClient.put(`${BASE_URL}/interviews/availability/${id}`, data);
}

export async function deleteAvailabilityApi(id) {
  return requestClient.delete(`${BASE_URL}/interviews/availability/${id}`);
}

export async function deleteInterviewAvailabilityApi(id) {
  return requestClient.delete(`${BASE_URL}/interviews/availability/${id}`);
}

// =============================================================================
// JOB OFFERS (job_offer.py - prefix /offers)
// =============================================================================

export async function getJobOffersApi(params = {}) {
  return requestClient.get(`${BASE_URL}/offers/`, { params });
}

export async function getOffersApi(params = {}) {
  return requestClient.get(`${BASE_URL}/offers/`, { params });
}

export async function getJobOfferApi(id) {
  return requestClient.get(`${BASE_URL}/offers/${id}`);
}

export async function getOfferApi(id) {
  return requestClient.get(`${BASE_URL}/offers/${id}`);
}

export async function createJobOfferApi(data) {
  return requestClient.post(`${BASE_URL}/offers/`, data);
}

export async function createOfferApi(data) {
  return requestClient.post(`${BASE_URL}/offers/`, data);
}

export async function updateJobOfferApi(id, data) {
  return requestClient.put(`${BASE_URL}/offers/${id}`, data);
}

export async function updateOfferApi(id, data) {
  return requestClient.put(`${BASE_URL}/offers/${id}`, data);
}

export async function deleteJobOfferApi(id) {
  return requestClient.delete(`${BASE_URL}/offers/${id}`);
}

export async function deleteOfferApi(id) {
  return requestClient.delete(`${BASE_URL}/offers/${id}`);
}

// Offer actions
export async function sendJobOfferApi(id, data = {}) {
  return requestClient.post(`${BASE_URL}/offers/${id}/send`, data);
}

export async function sendOfferApi(id) {
  return requestClient.post(`${BASE_URL}/offers/${id}/send`, {});
}

export async function respondToOfferApi(id, data) {
  return requestClient.post(`${BASE_URL}/offers/${id}/respond`, data);
}

export async function acceptOfferApi(id) {
  return requestClient.post(`${BASE_URL}/offers/${id}/respond`, {
    response: 'accepted',
  });
}

export async function rejectOfferApi(id, reason) {
  return requestClient.post(`${BASE_URL}/offers/${id}/respond`, {
    response: 'declined',
    response_text: reason,
  });
}

export async function withdrawOfferApi(id, reason) {
  return requestClient.post(`${BASE_URL}/offers/${id}/withdraw`, null, {
    params: { reason },
  });
}

export async function submitForApprovalApi(id, data) {
  return requestClient.post(`${BASE_URL}/offers/${id}/submit-for-approval`, data);
}

// Offer stats
export async function getOfferStatsApi(params = {}) {
  return requestClient.get(`${BASE_URL}/offers/stats`, { params });
}

// =============================================================================
// APPROVALS (job_offer.py - /offers/approvals)
// =============================================================================

export async function getApprovalsApi(params = {}) {
  return requestClient.get(`${BASE_URL}/offers/approvals`, { params });
}

export async function makeApprovalDecisionApi(approvalId, data) {
  return requestClient.post(`${BASE_URL}/offers/approvals/${approvalId}/decision`, data);
}

// =============================================================================
// NEGOTIATIONS (job_offer.py - /offers/{id}/negotiations)
// =============================================================================

export async function getOfferNegotiationsApi(offerId) {
  return requestClient.get(`${BASE_URL}/offers/${offerId}/negotiations`);
}

export async function createNegotiationApi(offerId, data) {
  return requestClient.post(`${BASE_URL}/offers/${offerId}/negotiations`, data);
}

export async function respondToNegotiationApi(offerId, negotiationId, data) {
  return requestClient.post(
    `${BASE_URL}/offers/${offerId}/negotiations/${negotiationId}/respond`,
    data,
  );
}

// =============================================================================
// TALENT POOLS (talent_pool.py - prefix /talent-pools)
// =============================================================================

export async function getTalentPoolsApi(params = {}) {
  return requestClient.get(`${BASE_URL}/talent-pools/`, { params });
}

export async function getTalentPoolApi(id) {
  return requestClient.get(`${BASE_URL}/talent-pools/${id}`);
}

export async function createTalentPoolApi(data) {
  return requestClient.post(`${BASE_URL}/talent-pools/`, data);
}

export async function updateTalentPoolApi(id, data) {
  return requestClient.put(`${BASE_URL}/talent-pools/${id}`, data);
}

export async function deleteTalentPoolApi(id) {
  return requestClient.delete(`${BASE_URL}/talent-pools/${id}`);
}

// Pool candidates
export async function getPoolCandidatesApi(poolId, params = {}) {
  return requestClient.get(`${BASE_URL}/talent-pools/${poolId}/candidates`, { params });
}

export async function getTalentPoolCandidatesApi(params = {}) {
  return requestClient.get(`${BASE_URL}/talent-pools/pool-candidates`, { params });
}

export async function addCandidateToPoolApi(poolId, data) {
  return requestClient.post(`${BASE_URL}/talent-pools/${poolId}/candidates`, data);
}

export async function addCandidateToTalentPoolApi(poolId, data) {
  return requestClient.post(`${BASE_URL}/talent-pools/${poolId}/add-candidate/`, data);
}

export async function updatePoolCandidateApi(poolId, candidateId, data) {
  return requestClient.put(`${BASE_URL}/talent-pools/${poolId}/candidates/${candidateId}`, data);
}

export async function updateTalentPoolCandidateApi(id, data) {
  return requestClient.put(`${BASE_URL}/talent-pools/pool-candidates/${id}`, data);
}

export async function removeCandidateFromPoolApi(poolId, candidateId) {
  return requestClient.delete(`${BASE_URL}/talent-pools/${poolId}/candidates/${candidateId}`);
}

export async function removeCandidateFromTalentPoolApi(id) {
  return requestClient.delete(`${BASE_URL}/talent-pools/pool-candidates/${id}`);
}

export async function addCandidatesToPoolBulkApi(poolId, data) {
  return requestClient.post(`${BASE_URL}/talent-pools/${poolId}/candidates/bulk`, data);
}

export async function markCandidateContactedApi(poolId, candidateId) {
  return requestClient.post(`${BASE_URL}/talent-pools/${poolId}/candidates/${candidateId}/contact`);
}

// =============================================================================
// SKILL ZONES (talent_pool.py - /talent-pools/skill-zones)
// =============================================================================

export async function getSkillZonesApi(params = {}) {
  return requestClient.get(`${BASE_URL}/talent-pools/skill-zones`, { params });
}

export async function getSkillZoneApi(id) {
  return requestClient.get(`${BASE_URL}/talent-pools/skill-zones/${id}`);
}

export async function createSkillZoneApi(data) {
  return requestClient.post(`${BASE_URL}/talent-pools/skill-zones`, data);
}

export async function updateSkillZoneApi(id, data) {
  return requestClient.put(`${BASE_URL}/talent-pools/skill-zones/${id}`, data);
}

export async function deleteSkillZoneApi(id) {
  return requestClient.delete(`${BASE_URL}/talent-pools/skill-zones/${id}`);
}

// Skill zone candidates
export async function getSkillZoneCandidatesApi(params = {}) {
  return requestClient.get(`${BASE_URL}/talent-pools/skill-zone-candidates`, { params });
}

export async function addSkillZoneCandidateApi(zoneId, data) {
  return requestClient.post(`${BASE_URL}/talent-pools/skill-zones/${zoneId}/candidates`, data);
}

export async function removeSkillZoneCandidateApi(zoneId, candidateId) {
  return requestClient.delete(`${BASE_URL}/talent-pools/skill-zones/${zoneId}/candidates/${candidateId}`);
}

// =============================================================================
// ANALYTICS (analytics.py - prefix /analytics)
// =============================================================================

export async function getAnalyticsDashboardApi() {
  return requestClient.get(`${BASE_URL}/analytics/dashboard`);
}

export async function getPipelineOverviewApi(params = {}) {
  return requestClient.get(`${BASE_URL}/analytics/pipeline/overview`, { params });
}

export async function getPipelineFunnelApi(params = {}) {
  return requestClient.get(`${BASE_URL}/analytics/pipeline/funnel`, { params });
}

export async function getTimeToHireApi(params = {}) {
  return requestClient.get(`${BASE_URL}/analytics/time-to-hire`, { params });
}

export async function getTimeToHireAnalyticsApi(params = {}) {
  return requestClient.get(`${BASE_URL}/analytics/time-to-hire`, { params });
}

export async function getSourceEffectivenessApi(params = {}) {
  return requestClient.get(`${BASE_URL}/analytics/sources/effectiveness`, { params });
}

// Hiring goals
export async function getHiringGoalsApi(params = {}) {
  return requestClient.get(`${BASE_URL}/analytics/goals`, { params });
}

export async function getHiringGoalApi(id) {
  return requestClient.get(`${BASE_URL}/analytics/goals/${id}`);
}

export async function createHiringGoalApi(data) {
  return requestClient.post(`${BASE_URL}/analytics/goals`, data);
}

export async function updateHiringGoalApi(id, data) {
  return requestClient.put(`${BASE_URL}/analytics/goals/${id}`, data);
}

export async function deleteHiringGoalApi(id) {
  return requestClient.delete(`${BASE_URL}/analytics/goals/${id}`);
}

// =============================================================================
// AUTOMATION (automation.py - prefix /automation)
// =============================================================================

// Automation rules
export async function getAutomationRulesApi(params = {}) {
  return requestClient.get(`${BASE_URL}/automation/rules`, { params });
}

export async function getAutomationRuleApi(id) {
  return requestClient.get(`${BASE_URL}/automation/rules/${id}`);
}

export async function createAutomationRuleApi(data) {
  return requestClient.post(`${BASE_URL}/automation/rules`, data);
}

export async function updateAutomationRuleApi(id, data) {
  return requestClient.put(`${BASE_URL}/automation/rules/${id}`, data);
}

export async function deleteAutomationRuleApi(id) {
  return requestClient.delete(`${BASE_URL}/automation/rules/${id}`);
}

// Automation actions
export async function toggleAutomationRuleApi(id) {
  return requestClient.post(`${BASE_URL}/automation/rules/${id}/toggle`);
}

export async function testAutomationRuleApi(id, candidateId) {
  return requestClient.post(`${BASE_URL}/automation/rules/${id}/test`, null, {
    params: { candidate_id: candidateId },
  });
}

// Automation logs
export async function getAutomationRuleLogsApi(ruleId, params = {}) {
  return requestClient.get(`${BASE_URL}/automation/rules/${ruleId}/logs`, { params });
}

export async function getAllAutomationLogsApi(params = {}) {
  return requestClient.get(`${BASE_URL}/automation/logs`, { params });
}

// Communication templates
export async function getCommunicationTemplatesApi(params = {}) {
  return requestClient.get(`${BASE_URL}/automation/templates`, { params });
}

export async function getCommunicationTemplateApi(id) {
  return requestClient.get(`${BASE_URL}/automation/templates/${id}`);
}

export async function createCommunicationTemplateApi(data) {
  return requestClient.post(`${BASE_URL}/automation/templates`, data);
}

export async function updateCommunicationTemplateApi(id, data) {
  return requestClient.put(`${BASE_URL}/automation/templates/${id}`, data);
}

export async function deleteCommunicationTemplateApi(id) {
  return requestClient.delete(`${BASE_URL}/automation/templates/${id}`);
}

export async function previewCommunicationTemplateApi(id, candidateId) {
  return requestClient.post(`${BASE_URL}/automation/templates/${id}/preview`, null, {
    params: { candidate_id: candidateId },
  });
}

// Trigger types
export async function getTriggerTypesApi() {
  return requestClient.get(`${BASE_URL}/automation/trigger-types`);
}

// =============================================================================
// DEI (dei.py - prefix /dei)
// =============================================================================

// DEI goals
export async function getDEIGoalsApi(params = {}) {
  return requestClient.get(`${BASE_URL}/dei/goals`, { params });
}

export async function getDEIGoalApi(id) {
  return requestClient.get(`${BASE_URL}/dei/goals/${id}`);
}

export async function createDEIGoalApi(data) {
  return requestClient.post(`${BASE_URL}/dei/goals`, data);
}

export async function updateDEIGoalApi(id, data) {
  return requestClient.put(`${BASE_URL}/dei/goals/${id}`, data);
}

export async function deleteDEIGoalApi(id) {
  return requestClient.delete(`${BASE_URL}/dei/goals/${id}`);
}

// DEI metrics and dashboard
export async function getDEIMetricsApi(params = {}) {
  return requestClient.get(`${BASE_URL}/dei/metrics`, { params });
}

export async function getDEIDashboardApi() {
  return requestClient.get(`${BASE_URL}/dei/dashboard`);
}

// EEOC data
export async function getEEOCDataApi() {
  return requestClient.get(`${BASE_URL}/dei/eeoc`);
}

export async function getCandidateEEOCApi(candidateId) {
  return requestClient.get(`${BASE_URL}/dei/eeoc/${candidateId}`);
}

export async function getCandidateEEOCDataApi(candidateId) {
  return requestClient.get(`${BASE_URL}/dei/eeoc/${candidateId}`);
}

export async function submitCandidateEEOCApi(candidateId, data) {
  return requestClient.post(`${BASE_URL}/dei/eeoc/${candidateId}`, null, {
    params: data,
  });
}

export async function submitCandidateEEOCDataApi(candidateId, data) {
  return requestClient.post(`${BASE_URL}/dei/eeoc/${candidateId}`, null, {
    params: data,
  });
}

// =============================================================================
// SCORING & RANKING
// =============================================================================

export async function getScoringCriteriaApi(params = {}) {
  return requestClient.get(`${BASE_URL}/scoring/criteria`, { params });
}

export async function getScoringCriterionApi(id) {
  return requestClient.get(`${BASE_URL}/scoring/criteria/${id}`);
}

export async function createScoringCriteriaApi(data) {
  return requestClient.post(`${BASE_URL}/scoring/criteria`, data);
}

export async function updateScoringCriteriaApi(id, data) {
  return requestClient.put(`${BASE_URL}/scoring/criteria/${id}`, data);
}

export async function deleteScoringCriteriaApi(id) {
  return requestClient.delete(`${BASE_URL}/scoring/criteria/${id}`);
}

export async function getCandidateScoreListApi(candidateId, params = {}) {
  return requestClient.get(`${BASE_URL}/scoring/candidates/${candidateId}/scores`, { params });
}

export async function createCandidateScoreApi(candidateId, data) {
  return requestClient.post(`${BASE_URL}/scoring/candidates/${candidateId}/scores`, data);
}

export async function getCandidateRankingApi(params = {}) {
  return requestClient.get(`${BASE_URL}/scoring/rankings`, { params });
}

export async function getPipelineAnalyticsApi(params = {}) {
  return requestClient.get(`${BASE_URL}/analytics/pipeline/overview`, { params });
}

// =============================================================================
// APPLICATIONS (legacy/alternate path)
// =============================================================================

export async function getApplicationsApi(params = {}) {
  // Applications map to candidates - remap job_id to recruitment_id
  const mappedParams = { ...params };
  if (mappedParams.job_id) {
    mappedParams.recruitment_id = mappedParams.job_id;
    delete mappedParams.job_id;
  }
  return requestClient.get(`${BASE_URL}/candidates/`, { params: mappedParams });
}

export async function getApplicationApi(id) {
  return requestClient.get(`${BASE_URL}/candidates/${id}`);
}

export async function createApplicationApi(data) {
  return requestClient.post(`${BASE_URL}/candidates/`, data);
}

export async function updateApplicationApi(id, data) {
  return requestClient.put(`${BASE_URL}/candidates/${id}`, data);
}

export async function moveApplicationStageApi(id, stageId) {
  return requestClient.post(`${BASE_URL}/candidates/${id}/move-stage`, {
    stage_id: stageId,
  });
}

export async function rejectApplicationApi(id, reason) {
  return requestClient.post(`${BASE_URL}/candidates/${id}/reject`, { reason });
}

export async function deleteApplicationApi(id) {
  return requestClient.delete(`${BASE_URL}/applications/${id}`);
}

export async function getApplicationsPipelineApi(jobId) {
  return requestClient.get(`${BASE_URL}/applications/pipeline`, {
    params: { job_id: jobId },
  });
}

// =============================================================================
// LINKEDIN INTEGRATION
// =============================================================================

export async function getLinkedInAccountsApi(params = {}) {
  return requestClient.get(`${BASE_URL}/linkedin/accounts`, { params });
}

export async function getLinkedInAccountApi(id) {
  return requestClient.get(`${BASE_URL}/linkedin/accounts/${id}`);
}

export async function createLinkedInAccountApi(data) {
  return requestClient.post(`${BASE_URL}/linkedin/accounts`, data);
}

export async function updateLinkedInAccountApi(id, data) {
  return requestClient.put(`${BASE_URL}/linkedin/accounts/${id}`, data);
}

export async function deleteLinkedInAccountApi(id) {
  return requestClient.delete(`${BASE_URL}/linkedin/accounts/${id}`);
}

export async function validateLinkedInAccountApi(id) {
  return requestClient.post(`${BASE_URL}/linkedin/accounts/${id}/validate`);
}

export async function postJobToLinkedInApi(jobId, accountId) {
  return requestClient.post(`${BASE_URL}/linkedin/jobs/${jobId}/post`, null, {
    params: { account_id: accountId },
  });
}

export async function removeJobFromLinkedInApi(jobId) {
  return requestClient.delete(`${BASE_URL}/linkedin/jobs/${jobId}/post`);
}

// =============================================================================
// JOB ALERTS
// =============================================================================

export async function getJobAlertsApi(params = {}) {
  return requestClient.get(`${BASE_URL}/job-alerts/alerts`, { params });
}

export async function getJobAlertApi(id) {
  return requestClient.get(`${BASE_URL}/job-alerts/alerts/${id}`);
}

export async function createJobAlertApi(data) {
  return requestClient.post(`${BASE_URL}/job-alerts/alerts`, data);
}

export async function updateJobAlertApi(id, data) {
  return requestClient.put(`${BASE_URL}/job-alerts/alerts/${id}`, data);
}

export async function deleteJobAlertApi(id) {
  return requestClient.delete(`${BASE_URL}/job-alerts/alerts/${id}`);
}

export async function verifyJobAlertApi(token) {
  return requestClient.post(`${BASE_URL}/job-alerts/alerts/verify/${token}`);
}

export async function unsubscribeJobAlertApi(token) {
  return requestClient.post(`${BASE_URL}/job-alerts/alerts/unsubscribe/${token}`);
}

export async function resendJobAlertVerificationApi(id) {
  return requestClient.post(`${BASE_URL}/job-alerts/alerts/${id}/resend-verification`);
}

export async function getSavedJobsApi(params = {}) {
  return requestClient.get(`${BASE_URL}/job-alerts/saved-jobs`, { params });
}

export async function getSavedJobsByEmailApi(email, params = {}) {
  return requestClient.get(`${BASE_URL}/job-alerts/saved-jobs/by-email/${email}`, { params });
}

export async function saveJobApi(data) {
  return requestClient.post(`${BASE_URL}/job-alerts/saved-jobs`, data);
}

export async function updateSavedJobApi(id, data) {
  return requestClient.put(`${BASE_URL}/job-alerts/saved-jobs/${id}`, data);
}

export async function unsaveJobApi(id) {
  return requestClient.delete(`${BASE_URL}/job-alerts/saved-jobs/${id}`);
}

// =============================================================================
// QUIZ INTEGRATION (recruitment.py - screening questionnaires)
// =============================================================================

export async function getRecruitmentQuizzesApi(recruitmentId) {
  return requestClient.get(`${BASE_URL}/jobs/${recruitmentId}/quizzes`);
}

export async function assignQuizzesToRecruitmentApi(recruitmentId, data) {
  return requestClient.post(`${BASE_URL}/jobs/${recruitmentId}/quizzes`, data);
}

export async function unassignQuizzesFromRecruitmentApi(recruitmentId, data) {
  return requestClient.delete(`${BASE_URL}/jobs/${recruitmentId}/quizzes`, { data });
}

export async function inviteCandidateToQuizApi(candidateId, data) {
  return requestClient.post(`${BASE_URL}/candidates/${candidateId}/quiz-invites`, data);
}

export async function getCandidateQuizAttemptsApi(candidateId, params = {}) {
  return requestClient.get(`${BASE_URL}/candidates/${candidateId}/quiz-attempts`, { params });
}

export async function getCandidateQuizSummaryApi(candidateId) {
  return requestClient.get(`${BASE_URL}/candidates/${candidateId}/quiz-summary`);
}

export async function bulkInviteCandidatesToQuizApi(data) {
  return requestClient.post(`${BASE_URL}/quiz-invites/bulk`, data);
}

export async function getRecruitmentQuizSummaryApi(recruitmentId) {
  return requestClient.get(`${BASE_URL}/jobs/${recruitmentId}/quiz-summary`);
}

// =============================================================================
// SURVEY TEMPLATES & QUESTIONS
// =============================================================================

export async function getSurveyTemplatesApi(params = {}) {
  return requestClient.get(`${BASE_URL}/survey-templates/`, { params });
}

export async function getSurveyTemplateApi(id) {
  return requestClient.get(`${BASE_URL}/survey-templates/${id}`);
}

export async function createSurveyTemplateApi(data) {
  return requestClient.post(`${BASE_URL}/survey-templates/`, data);
}

export async function updateSurveyTemplateApi(id, data) {
  return requestClient.put(`${BASE_URL}/survey-templates/${id}`, data);
}

export async function deleteSurveyTemplateApi(id) {
  return requestClient.delete(`${BASE_URL}/survey-templates/${id}`);
}

export async function getSurveySectionsApi(params = {}) {
  return requestClient.get(`${BASE_URL}/survey-sections/`, { params });
}

export async function getSurveySectionApi(id) {
  return requestClient.get(`${BASE_URL}/survey-sections/${id}`);
}

export async function createSurveySectionApi(data) {
  return requestClient.post(`${BASE_URL}/survey-sections/`, data);
}

export async function updateSurveySectionApi(id, data) {
  return requestClient.put(`${BASE_URL}/survey-sections/${id}`, data);
}

export async function deleteSurveySectionApi(id) {
  return requestClient.delete(`${BASE_URL}/survey-sections/${id}`);
}

// =============================================================================
// CROSS-MODULE: EMPLOYEES
// =============================================================================

export async function getEmployeesApi(params = {}) {
  return requestClient.get('/employee/employees/', { params });
}
