/**
 * HRMS Base API Client
 *
 * API functions for HR Settings management including departments, job positions,
 * shifts, work types, employee types, announcements, and approval workflows.
 */

import { requestClient } from '#/api/request';

const BASE_URL = '/hrms_base';

// ============================================================================
// DEPARTMENTS
// ============================================================================

export async function getDepartmentsApi(params = {}) {
  const query = new URLSearchParams();
  if (params.skip !== undefined) query.append('skip', params.skip);
  if (params.limit !== undefined) query.append('limit', params.limit);
  if (params.search) query.append('search', params.search);
  if (params.parent_id !== undefined) query.append('parent_id', params.parent_id);
  if (params.is_active !== undefined) query.append('is_active', params.is_active);

  const queryStr = query.toString();
  return requestClient.get(`${BASE_URL}/departments/${queryStr ? '?' + queryStr : ''}`);
}

export async function getDepartmentTreeApi(parentId = null) {
  const query = parentId !== null ? `?parent_id=${parentId}` : '';
  return requestClient.get(`${BASE_URL}/departments/tree${query}`);
}

export async function getDepartmentApi(id) {
  return requestClient.get(`${BASE_URL}/departments/${id}`);
}

export async function createDepartmentApi(data) {
  return requestClient.post(`${BASE_URL}/departments/`, data);
}

export async function updateDepartmentApi(id, data) {
  return requestClient.put(`${BASE_URL}/departments/${id}`, data);
}

export async function deleteDepartmentApi(id) {
  return requestClient.delete(`${BASE_URL}/departments/${id}`);
}

// ============================================================================
// JOB POSITIONS
// ============================================================================

export async function getJobPositionsApi(params = {}) {
  const query = new URLSearchParams();
  if (params.skip !== undefined) query.append('skip', params.skip);
  if (params.limit !== undefined) query.append('limit', params.limit);
  if (params.search) query.append('search', params.search);
  if (params.department_id !== undefined) query.append('department_id', params.department_id);
  if (params.is_active !== undefined) query.append('is_active', params.is_active);

  const queryStr = query.toString();
  return requestClient.get(`${BASE_URL}/job-positions/${queryStr ? '?' + queryStr : ''}`);
}

export async function getJobPositionApi(id) {
  return requestClient.get(`${BASE_URL}/job-positions/${id}`);
}

export async function createJobPositionApi(data) {
  return requestClient.post(`${BASE_URL}/job-positions/`, data);
}

export async function updateJobPositionApi(id, data) {
  return requestClient.put(`${BASE_URL}/job-positions/${id}`, data);
}

export async function deleteJobPositionApi(id) {
  return requestClient.delete(`${BASE_URL}/job-positions/${id}`);
}

// ============================================================================
// JOB ROLES
// ============================================================================

export async function getJobRolesApi(params = {}) {
  const query = new URLSearchParams();
  if (params.skip !== undefined) query.append('skip', params.skip);
  if (params.limit !== undefined) query.append('limit', params.limit);
  if (params.search) query.append('search', params.search);
  if (params.is_active !== undefined) query.append('is_active', params.is_active);

  const queryStr = query.toString();
  return requestClient.get(`${BASE_URL}/job-roles/${queryStr ? '?' + queryStr : ''}`);
}

export async function getJobRoleApi(id) {
  return requestClient.get(`${BASE_URL}/job-roles/${id}`);
}

export async function createJobRoleApi(data) {
  return requestClient.post(`${BASE_URL}/job-roles/`, data);
}

export async function updateJobRoleApi(id, data) {
  return requestClient.put(`${BASE_URL}/job-roles/${id}`, data);
}

export async function deleteJobRoleApi(id) {
  return requestClient.delete(`${BASE_URL}/job-roles/${id}`);
}

// ============================================================================
// EMPLOYEE TYPES
// ============================================================================

export async function getEmployeeTypesApi(params = {}) {
  const query = new URLSearchParams();
  if (params.skip !== undefined) query.append('skip', params.skip);
  if (params.limit !== undefined) query.append('limit', params.limit);
  if (params.search) query.append('search', params.search);
  if (params.is_active !== undefined) query.append('is_active', params.is_active);

  const queryStr = query.toString();
  return requestClient.get(`${BASE_URL}/employee-types/${queryStr ? '?' + queryStr : ''}`);
}

export async function getEmployeeTypeApi(id) {
  return requestClient.get(`${BASE_URL}/employee-types/${id}`);
}

export async function createEmployeeTypeApi(data) {
  return requestClient.post(`${BASE_URL}/employee-types/`, data);
}

export async function updateEmployeeTypeApi(id, data) {
  return requestClient.put(`${BASE_URL}/employee-types/${id}`, data);
}

export async function deleteEmployeeTypeApi(id) {
  return requestClient.delete(`${BASE_URL}/employee-types/${id}`);
}

// ============================================================================
// SHIFTS
// ============================================================================

export async function getShiftsApi(params = {}) {
  const query = new URLSearchParams();
  if (params.skip !== undefined) query.append('skip', params.skip);
  if (params.limit !== undefined) query.append('limit', params.limit);
  if (params.search) query.append('search', params.search);
  if (params.is_active !== undefined) query.append('is_active', params.is_active);

  const queryStr = query.toString();
  return requestClient.get(`${BASE_URL}/shifts/${queryStr ? '?' + queryStr : ''}`);
}

export async function getShiftApi(id) {
  return requestClient.get(`${BASE_URL}/shifts/${id}`);
}

export async function createShiftApi(data) {
  return requestClient.post(`${BASE_URL}/shifts/`, data);
}

export async function updateShiftApi(id, data) {
  return requestClient.put(`${BASE_URL}/shifts/${id}`, data);
}

export async function deleteShiftApi(id) {
  return requestClient.delete(`${BASE_URL}/shifts/${id}`);
}

// Shift Schedules
export async function getShiftSchedulesApi(params = {}) {
  const query = new URLSearchParams();
  if (params.employee_id) query.append('employee_id', params.employee_id);
  if (params.shift_id) query.append('shift_id', params.shift_id);
  if (params.skip !== undefined) query.append('skip', params.skip);
  if (params.limit !== undefined) query.append('limit', params.limit);

  const queryStr = query.toString();
  return requestClient.get(`${BASE_URL}/shifts/schedules/${queryStr ? '?' + queryStr : ''}`);
}

export async function createShiftScheduleApi(data) {
  return requestClient.post(`${BASE_URL}/shifts/schedules/`, data);
}

export async function updateShiftScheduleApi(id, data) {
  return requestClient.put(`${BASE_URL}/shifts/schedules/${id}`, data);
}

export async function deleteShiftScheduleApi(id) {
  return requestClient.delete(`${BASE_URL}/shifts/schedules/${id}`);
}

// ============================================================================
// WORK TYPES
// ============================================================================

export async function getWorkTypesApi(params = {}) {
  const query = new URLSearchParams();
  if (params.skip !== undefined) query.append('skip', params.skip);
  if (params.limit !== undefined) query.append('limit', params.limit);
  if (params.search) query.append('search', params.search);
  if (params.is_active !== undefined) query.append('is_active', params.is_active);

  const queryStr = query.toString();
  return requestClient.get(`${BASE_URL}/work-types/${queryStr ? '?' + queryStr : ''}`);
}

export async function getWorkTypeApi(id) {
  return requestClient.get(`${BASE_URL}/work-types/${id}`);
}

export async function createWorkTypeApi(data) {
  return requestClient.post(`${BASE_URL}/work-types/`, data);
}

export async function updateWorkTypeApi(id, data) {
  return requestClient.put(`${BASE_URL}/work-types/${id}`, data);
}

export async function deleteWorkTypeApi(id) {
  return requestClient.delete(`${BASE_URL}/work-types/${id}`);
}

// ============================================================================
// ANNOUNCEMENTS
// ============================================================================

export async function getAnnouncementsApi(params = {}) {
  const query = new URLSearchParams();
  if (params.skip !== undefined) query.append('skip', params.skip);
  if (params.limit !== undefined) query.append('limit', params.limit);
  if (params.is_published !== undefined) query.append('is_published', params.is_published);
  if (params.is_active !== undefined) query.append('is_active', params.is_active);

  const queryStr = query.toString();
  return requestClient.get(`${BASE_URL}/announcements/${queryStr ? '?' + queryStr : ''}`);
}

export async function getMyAnnouncementsApi(params = {}) {
  const query = new URLSearchParams();
  if (params.skip !== undefined) query.append('skip', params.skip);
  if (params.limit !== undefined) query.append('limit', params.limit);

  const queryStr = query.toString();
  return requestClient.get(`${BASE_URL}/announcements/for-me${queryStr ? '?' + queryStr : ''}`);
}

export async function getAnnouncementApi(id) {
  return requestClient.get(`${BASE_URL}/announcements/${id}`);
}

export async function createAnnouncementApi(data) {
  return requestClient.post(`${BASE_URL}/announcements/`, data);
}

export async function updateAnnouncementApi(id, data) {
  return requestClient.put(`${BASE_URL}/announcements/${id}`, data);
}

export async function deleteAnnouncementApi(id) {
  return requestClient.delete(`${BASE_URL}/announcements/${id}`);
}

export async function acknowledgeAnnouncementApi(id) {
  return requestClient.post(`${BASE_URL}/announcements/${id}/acknowledge`);
}

export async function getAnnouncementStatsApi(id) {
  return requestClient.get(`${BASE_URL}/announcements/${id}/stats`);
}

// ============================================================================
// APPROVAL WORKFLOWS
// ============================================================================

export async function getApprovalWorkflowsApi(params = {}) {
  const query = new URLSearchParams();
  if (params.skip !== undefined) query.append('skip', params.skip);
  if (params.limit !== undefined) query.append('limit', params.limit);
  if (params.model_name) query.append('model_name', params.model_name);
  if (params.is_active !== undefined) query.append('is_active', params.is_active);

  const queryStr = query.toString();
  return requestClient.get(`${BASE_URL}/approval-workflows/${queryStr ? '?' + queryStr : ''}`);
}

export async function getApprovalWorkflowApi(id) {
  return requestClient.get(`${BASE_URL}/approval-workflows/${id}`);
}

export async function createApprovalWorkflowApi(data) {
  return requestClient.post(`${BASE_URL}/approval-workflows/`, data);
}

export async function updateApprovalWorkflowApi(id, data) {
  return requestClient.put(`${BASE_URL}/approval-workflows/${id}`, data);
}

export async function deleteApprovalWorkflowApi(id) {
  return requestClient.delete(`${BASE_URL}/approval-workflows/${id}`);
}

// Workflow Steps
export async function getWorkflowStepsApi(workflowId) {
  return requestClient.get(`${BASE_URL}/approval-workflows/${workflowId}/levels`);
}

export async function createWorkflowStepApi(workflowId, data) {
  return requestClient.post(`${BASE_URL}/approval-workflows/${workflowId}/levels`, data);
}

export async function updateWorkflowStepApi(workflowId, stepId, data) {
  return requestClient.put(`${BASE_URL}/approval-workflows/${workflowId}/levels/${stepId}`, data);
}

export async function deleteWorkflowStepApi(workflowId, stepId) {
  return requestClient.delete(`${BASE_URL}/approval-workflows/${workflowId}/levels/${stepId}`);
}

// ============================================================================
// STAGE DEFINITIONS
// ============================================================================

export async function getStageDefinitionsApi(params = {}) {
  const query = new URLSearchParams();
  if (params.skip !== undefined) query.append('skip', params.skip);
  if (params.limit !== undefined) query.append('limit', params.limit);
  if (params.model_name) query.append('model_name', params.model_name);
  if (params.is_active !== undefined) query.append('is_active', params.is_active);

  const queryStr = query.toString();
  return requestClient.get(`${BASE_URL}/stage-definitions/${queryStr ? '?' + queryStr : ''}`);
}

export async function getStageDefinitionApi(id) {
  return requestClient.get(`${BASE_URL}/stage-definitions/${id}`);
}

export async function createStageDefinitionApi(data) {
  return requestClient.post(`${BASE_URL}/stage-definitions/`, data);
}

export async function updateStageDefinitionApi(id, data) {
  return requestClient.put(`${BASE_URL}/stage-definitions/${id}`, data);
}

export async function deleteStageDefinitionApi(id) {
  return requestClient.delete(`${BASE_URL}/stage-definitions/${id}`);
}

// ============================================================================
// MAIL TEMPLATES
// ============================================================================

export async function getMailTemplatesApi(params = {}) {
  const query = new URLSearchParams();
  if (params.skip !== undefined) query.append('skip', params.skip);
  if (params.limit !== undefined) query.append('limit', params.limit);
  if (params.model_name) query.append('model_name', params.model_name);
  if (params.is_active !== undefined) query.append('is_active', params.is_active);

  const queryStr = query.toString();
  return requestClient.get(`${BASE_URL}/mail-templates/${queryStr ? '?' + queryStr : ''}`);
}

export async function getMailTemplateApi(id) {
  return requestClient.get(`${BASE_URL}/mail-templates/${id}`);
}

export async function createMailTemplateApi(data) {
  return requestClient.post(`${BASE_URL}/mail-templates/`, data);
}

export async function updateMailTemplateApi(id, data) {
  return requestClient.put(`${BASE_URL}/mail-templates/${id}`, data);
}

export async function deleteMailTemplateApi(id) {
  return requestClient.delete(`${BASE_URL}/mail-templates/${id}`);
}

export async function previewMailTemplateApi(id, data) {
  return requestClient.post(`${BASE_URL}/mail-templates/${id}/preview`, data);
}

// ============================================================================
// USERS (for selectors)
// ============================================================================

export async function getUsersApi(params = {}) {
  const query = new URLSearchParams();
  if (params.skip !== undefined) query.append('skip', params.skip);
  if (params.limit !== undefined) query.append('limit', params.limit);
  if (params.search) query.append('search', params.search);
  if (params.is_active !== undefined) query.append('is_active', params.is_active);

  const queryStr = query.toString();
  return requestClient.get(`/users/${queryStr ? '?' + queryStr : ''}`);
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const ANNOUNCEMENT_PRIORITIES = [
  { value: 'low', label: 'Low', color: 'default' },
  { value: 'normal', label: 'Normal', color: 'blue' },
  { value: 'high', label: 'High', color: 'orange' },
  { value: 'urgent', label: 'Urgent', color: 'red' },
];

export const ANNOUNCEMENT_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'policy', label: 'Policy Update' },
  { value: 'event', label: 'Event' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'maintenance', label: 'Maintenance' },
];

export const APPROVAL_TYPES = [
  { value: 'sequential', label: 'Sequential' },
  { value: 'parallel', label: 'Parallel' },
  { value: 'any_one', label: 'Any One' },
];

export const APPROVER_TYPES = [
  { value: 'user', label: 'Specific User' },
  { value: 'role', label: 'Role' },
  { value: 'manager', label: 'Manager' },
  { value: 'department_head', label: 'Department Head' },
];

export const WORK_LOCATION_TYPES = [
  { value: 'office', label: 'Office', color: 'blue' },
  { value: 'remote', label: 'Remote', color: 'green' },
  { value: 'hybrid', label: 'Hybrid', color: 'purple' },
  { value: 'field', label: 'Field', color: 'orange' },
];

export const DAYS_OF_WEEK = [
  { value: 0, label: 'Monday', short: 'Mon' },
  { value: 1, label: 'Tuesday', short: 'Tue' },
  { value: 2, label: 'Wednesday', short: 'Wed' },
  { value: 3, label: 'Thursday', short: 'Thu' },
  { value: 4, label: 'Friday', short: 'Fri' },
  { value: 5, label: 'Saturday', short: 'Sat' },
  { value: 6, label: 'Sunday', short: 'Sun' },
];

export const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'INR', label: 'INR - Indian Rupee' },
  { value: 'AED', label: 'AED - UAE Dirham' },
  { value: 'SAR', label: 'SAR - Saudi Riyal' },
];

export const COLOR_OPTIONS = [
  '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
  '#13c2c2', '#eb2f96', '#fa8c16', '#a0d911', '#2f54eb',
];

