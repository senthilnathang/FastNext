// Offboarding Module - API Client
// Runtime-loaded by vue3-sfc-loader via #/api/core/offboarding or #/api/offboarding

import { requestClient } from '#/api/request';

const BASE = '/offboarding';

// ============== Templates (Offboarding Processes) ==============

export async function getOffboardingTemplatesApi(params) {
  const query = params ? new URLSearchParams(params).toString() : '';
  return requestClient.get(`${BASE}/templates${query ? '?' + query : ''}`);
}

export async function getOffboardingTemplateApi(id) {
  return requestClient.get(`${BASE}/templates/${id}`);
}

export async function createOffboardingTemplateApi(data) {
  return requestClient.post(`${BASE}/templates`, data);
}

export async function updateOffboardingTemplateApi(id, data) {
  return requestClient.put(`${BASE}/templates/${id}`, data);
}

export async function deleteOffboardingTemplateApi(id) {
  return requestClient.delete(`${BASE}/templates/${id}`);
}

// Alias for Django frontend compatibility
export const getOffboardingsApi = getOffboardingTemplatesApi;
export const createOffboardingApi = createOffboardingTemplateApi;
export const updateOffboardingApi = updateOffboardingTemplateApi;
export const deleteOffboardingApi = deleteOffboardingTemplateApi;

// ============== Stages ==============

export async function getOffboardingStagesApi(params) {
  const query = params ? new URLSearchParams(params).toString() : '';
  return requestClient.get(`${BASE}/stages${query ? '?' + query : ''}`);
}

export async function createOffboardingStageApi(data) {
  return requestClient.post(`${BASE}/stages`, data);
}

export async function updateOffboardingStageApi(id, data) {
  return requestClient.put(`${BASE}/stages/${id}`, data);
}

export async function deleteOffboardingStageApi(id) {
  return requestClient.delete(`${BASE}/stages/${id}`);
}

// ============== Offboarding Employees ==============

export async function getOffboardingEmployeesApi(params) {
  const query = params ? new URLSearchParams(params).toString() : '';
  return requestClient.get(`${BASE}/employees${query ? '?' + query : ''}`);
}

export async function getOffboardingEmployeeApi(id) {
  return requestClient.get(`${BASE}/employees/${id}`);
}

export async function createOffboardingEmployeeApi(data) {
  return requestClient.post(`${BASE}/employees`, data);
}

export async function updateOffboardingEmployeeApi(id, data) {
  return requestClient.put(`${BASE}/employees/${id}`, data);
}

export async function approveOffboardingEmployeeApi(id) {
  return requestClient.post(`${BASE}/employees/${id}/approve`);
}

export async function startOffboardingEmployeeApi(id) {
  return requestClient.post(`${BASE}/employees/${id}/start`);
}

export async function moveOffboardingEmployeeApi(id, stageId) {
  return requestClient.post(`${BASE}/employees/${id}/move-stage/${stageId}`);
}

// Aliases for Django frontend compatibility
export const addOffboardingEmployeeApi = createOffboardingEmployeeApi;
export const removeOffboardingEmployeeApi = async (id) => {
  return requestClient.delete(`${BASE}/employees/${id}`);
};

// ============== Tasks ==============

export async function getOffboardingTasksApi(params) {
  const query = params ? new URLSearchParams(params).toString() : '';
  return requestClient.get(`${BASE}/tasks${query ? '?' + query : ''}`);
}

export async function getOffboardingTaskApi(id) {
  return requestClient.get(`${BASE}/tasks/${id}`);
}

export async function createOffboardingTaskApi(data) {
  return requestClient.post(`${BASE}/tasks`, data);
}

export async function updateOffboardingTaskApi(id, data) {
  return requestClient.put(`${BASE}/tasks/${id}`, data);
}

export async function deleteOffboardingTaskApi(id) {
  return requestClient.delete(`${BASE}/tasks/${id}`);
}

export async function completeOffboardingTaskApi(id, notes) {
  return requestClient.post(`${BASE}/tasks/${id}/complete`, { completion_notes: notes });
}

export async function updateEmployeeTaskStatusApi(taskId, status) {
  return requestClient.post(`${BASE}/tasks/${taskId}/complete`, { status });
}

// ============== Exit Reasons ==============

export async function getExitReasonsApi(params) {
  const query = params ? new URLSearchParams(params).toString() : '';
  return requestClient.get(`${BASE}/exit-reasons${query ? '?' + query : ''}`);
}

export async function createExitReasonApi(data) {
  return requestClient.post(`${BASE}/exit-reasons`, data);
}

export async function deleteExitReasonApi(id) {
  return requestClient.delete(`${BASE}/exit-reasons/${id}`);
}

// ============== Asset Returns ==============

export async function getAssetReturnsApi(employeeId) {
  return requestClient.get(`${BASE}/asset-returns?offboarding_employee_id=${employeeId}`);
}

export async function createAssetReturnApi(data) {
  return requestClient.post(`${BASE}/asset-returns`, data);
}

export async function markAssetReturnedApi(id, condition, notes) {
  return requestClient.post(`${BASE}/asset-returns/${id}/mark-returned`, { condition, condition_notes: notes });
}

// ============== Exit Interviews ==============

export async function getExitInterviewApi(employeeId) {
  return requestClient.get(`${BASE}/exit-interviews/${employeeId}`);
}

export async function updateExitInterviewApi(id, data) {
  return requestClient.put(`${BASE}/exit-interviews/${id}`, data);
}

// ============== FnF Settlements ==============

export async function getFnFSettlementApi(employeeId) {
  return requestClient.get(`${BASE}/fnf-settlements/${employeeId}`);
}

export async function updateFnFSettlementApi(id, data) {
  return requestClient.put(`${BASE}/fnf-settlements/${id}`, data);
}

export async function approveFnFHrApi(id) {
  return requestClient.post(`${BASE}/fnf-settlements/${id}/approve-hr`);
}

export async function approveFnFFinanceApi(id) {
  return requestClient.post(`${BASE}/fnf-settlements/${id}/approve-finance`);
}

export async function markFnFPaidApi(id, data) {
  return requestClient.post(`${BASE}/fnf-settlements/${id}/mark-paid`, data);
}

// ============== Dashboard ==============

export async function getOffboardingDashboardApi() {
  return requestClient.get(`${BASE}/dashboard`);
}

// ============== Resignations ==============

export async function getResignationsApi(params) {
  const query = params ? new URLSearchParams(params).toString() : '';
  return requestClient.get(`${BASE}/resignations${query ? '?' + query : ''}`);
}

export async function getResignationApi(id) {
  return requestClient.get(`${BASE}/resignations/${id}`);
}

export async function createResignationApi(data) {
  return requestClient.post(`${BASE}/resignations`, data);
}

export async function updateResignationApi(id, data) {
  return requestClient.put(`${BASE}/resignations/${id}`, data);
}

export async function deleteResignationApi(id) {
  return requestClient.delete(`${BASE}/resignations/${id}`);
}

export async function approveResignationApi(id, data) {
  return requestClient.post(`${BASE}/resignations/${id}/approve`, data);
}

export async function rejectResignationApi(id, reason) {
  return requestClient.post(`${BASE}/resignations/${id}/reject`, { reason });
}

// ============== Notes ==============

export async function getOffboardingNotesApi(employeeId) {
  return requestClient.get(`${BASE}/notes?offboarding_employee_id=${employeeId}`);
}

export async function createOffboardingNoteApi(data) {
  return requestClient.post(`${BASE}/notes`, data);
}

export async function deleteOffboardingNoteApi(id) {
  return requestClient.delete(`${BASE}/notes/${id}`);
}

// ============== Settings ==============

export async function getOffboardingSettingsApi() {
  return requestClient.get(`${BASE}/settings`);
}

export async function updateOffboardingSettingsApi(data) {
  return requestClient.post(`${BASE}/settings`, data);
}

// ============== Stage Types ==============

export async function getStageTypesApi() {
  return requestClient.get(`${BASE}/stage-types`);
}

// ============== Stats ==============

export async function getOffboardingStatsApi() {
  return requestClient.get(`${BASE}/stats`);
}
