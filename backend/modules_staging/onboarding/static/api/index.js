/**
 * Onboarding Module API Client
 * Runtime API client loaded by vue3-sfc-loader
 */

import { requestClient } from '#/api/request';

const BASE = '/onboarding';

// ============== Dashboard ==============

export async function getDashboardApi() {
  return requestClient.get(`${BASE}/dashboard`);
}

export async function getDashboardStatsApi() {
  return requestClient.get(`${BASE}/dashboard/stats`);
}

// ============== Templates ==============

export async function getTemplatesApi(params = {}) {
  return requestClient.get(`${BASE}/templates`, { params });
}

export async function getTemplateApi(id) {
  return requestClient.get(`${BASE}/templates/${id}`);
}

export async function createTemplateApi(data) {
  return requestClient.post(`${BASE}/templates`, data);
}

export async function updateTemplateApi(id, data) {
  return requestClient.put(`${BASE}/templates/${id}`, data);
}

export async function deleteTemplateApi(id) {
  return requestClient.delete(`${BASE}/templates/${id}`);
}

export async function cloneTemplateApi(id) {
  return requestClient.post(`${BASE}/templates/${id}/clone`);
}

// ============== Stages ==============

export async function getStagesApi(params = {}) {
  return requestClient.get(`${BASE}/stages`, { params });
}

export async function getStageApi(id) {
  return requestClient.get(`${BASE}/stages/${id}`);
}

export async function createStageApi(data) {
  return requestClient.post(`${BASE}/stages`, data);
}

export async function updateStageApi(id, data) {
  return requestClient.put(`${BASE}/stages/${id}`, data);
}

// ============== Task Templates ==============

export async function getTaskTemplatesApi(params = {}) {
  return requestClient.get(`${BASE}/task-templates`, { params });
}

export async function getTaskTemplateApi(id) {
  return requestClient.get(`${BASE}/task-templates/${id}`);
}

export async function createTaskTemplateApi(data) {
  return requestClient.post(`${BASE}/task-templates`, data);
}

// ============== Document Types ==============

export async function getDocumentTypesApi(params = {}) {
  return requestClient.get(`${BASE}/document-types`, { params });
}

export async function getDocumentTypeApi(id) {
  return requestClient.get(`${BASE}/document-types/${id}`);
}

export async function createDocumentTypeApi(data) {
  return requestClient.post(`${BASE}/document-types`, data);
}

// ============== Processes ==============

export async function getProcessesApi(params = {}) {
  return requestClient.get(`${BASE}/processes`, { params });
}

export async function getProcessApi(id) {
  return requestClient.get(`${BASE}/processes/${id}`);
}

export async function createProcessApi(data) {
  return requestClient.post(`${BASE}/processes`, data);
}

export async function updateProcessApi(id, data) {
  return requestClient.put(`${BASE}/processes/${id}`, data);
}

export async function deleteProcessApi(id) {
  return requestClient.delete(`${BASE}/processes/${id}`);
}

export async function calculateProgressApi(processId) {
  return requestClient.post(`${BASE}/processes/${processId}/calculate-progress`);
}

export async function moveToStageApi(processId, stageId) {
  return requestClient.post(`${BASE}/processes/${processId}/stages/${stageId}/move`);
}

// ============== Process Stages/Tasks ==============

export async function updateProcessStageApi(stageId, data) {
  return requestClient.patch(`${BASE}/process-stages/${stageId}`, data);
}

export async function updateProcessTaskApi(taskId, data) {
  return requestClient.patch(`${BASE}/process-tasks/${taskId}`, data);
}

// ============== Employees (Legacy) ==============

export async function getEmployeesApi(params = {}) {
  return requestClient.get(`${BASE}/employees`, { params });
}

export async function getEmployeeApi(id) {
  return requestClient.get(`${BASE}/employees/${id}`);
}

export async function createEmployeeApi(data) {
  return requestClient.post(`${BASE}/employees`, data);
}

export async function updateEmployeeApi(id, data) {
  return requestClient.put(`${BASE}/employees/${id}`, data);
}

export async function moveEmployeeToStageApi(employeeId, stageId) {
  return requestClient.post(`${BASE}/employees/${employeeId}/move-stage/${stageId}`);
}

// ============== Tasks ==============

export async function getTasksApi(params = {}) {
  return requestClient.get(`${BASE}/tasks`, { params });
}

export async function getMyTasksApi(params = {}) {
  return requestClient.get(`${BASE}/my-tasks`, { params });
}

export async function getTaskApi(id) {
  return requestClient.get(`${BASE}/tasks/${id}`);
}

export async function createTaskApi(data) {
  return requestClient.post(`${BASE}/tasks`, data);
}

export async function updateTaskApi(id, data) {
  return requestClient.put(`${BASE}/tasks/${id}`, data);
}

export async function completeTaskApi(id, notes = null) {
  return requestClient.post(`${BASE}/tasks/${id}/complete`, { completion_notes: notes });
}

export async function approveTaskApi(id) {
  return requestClient.post(`${BASE}/tasks/${id}/approve`);
}

// ============== Documents ==============

export async function getDocumentsApi(params = {}) {
  return requestClient.get(`${BASE}/documents`, { params });
}

export async function getDocumentApi(id) {
  return requestClient.get(`${BASE}/documents/${id}`);
}

export async function createDocumentApi(data) {
  return requestClient.post(`${BASE}/documents`, data);
}

export async function approveDocumentApi(id) {
  return requestClient.post(`${BASE}/documents/${id}/approve`);
}

export async function rejectDocumentApi(id, reason) {
  return requestClient.post(`${BASE}/documents/${id}/reject`, null, { params: { rejection_reason: reason } });
}

// ============== Verifications ==============

export async function getVerificationRequirementsApi(params = {}) {
  return requestClient.get(`${BASE}/verification-requirements`, { params });
}

export async function createVerificationRequirementApi(data) {
  return requestClient.post(`${BASE}/verification-requirements`, data);
}

export async function updateVerificationRequirementApi(id, data) {
  return requestClient.put(`${BASE}/verification-requirements/${id}`, data);
}

export async function getVerificationsApi(params = {}) {
  return requestClient.get(`${BASE}/verifications`, { params });
}

export async function passVerificationApi(id, data = {}) {
  return requestClient.post(`${BASE}/verifications/${id}/pass`, data);
}

export async function failVerificationApi(id, data = {}) {
  return requestClient.post(`${BASE}/verifications/${id}/fail`, data);
}

// ============== Conversions ==============

export async function getConversionsApi(params = {}) {
  return requestClient.get(`${BASE}/conversions`, { params });
}

export async function getConversionApi(id) {
  return requestClient.get(`${BASE}/conversions/${id}`);
}

export async function checkConversionReadinessApi(id) {
  return requestClient.post(`${BASE}/conversions/${id}/check-readiness`);
}

export async function initiateConversionApi(data) {
  return requestClient.post(`${BASE}/conversions/initiate`, data);
}

export async function completeConversionApi(id, data = {}) {
  return requestClient.post(`${BASE}/conversions/${id}/complete`, data);
}

export async function getConversionLogsApi(id) {
  return requestClient.get(`${BASE}/conversions/${id}/logs`);
}

// ============== Portal ==============

export async function generatePortalTokenApi(candidateId) {
  return requestClient.post(`${BASE}/portal/generate-token`, { candidate_id: candidateId });
}

// ============== Misc ==============

export async function getStageTypesApi() {
  return requestClient.get(`${BASE}/stage-types`);
}

export async function toggleChecklistApi(checklistId) {
  return requestClient.post(`${BASE}/checklists/${checklistId}/toggle`);
}
