/**
 * Employee Module API Client
 *
 * JavaScript API functions for the Employee module.
 * This file is fetched at runtime by vue3-sfc-loader.
 */

import { requestClient } from '#/api/request';

const BASE_URL = '/employee';

// =============================================================================
// EMPLOYEES
// =============================================================================

export async function getEmployeesApi(params = {}) {
  return requestClient.get(`${BASE_URL}/list`, { params });
}

export async function getEmployeeApi(employeeId) {
  return requestClient.get(`${BASE_URL}/${employeeId}`);
}

export async function createEmployeeApi(data) {
  return requestClient.post(`${BASE_URL}`, data);
}

export async function updateEmployeeApi(employeeId, data) {
  return requestClient.put(`${BASE_URL}/${employeeId}`, data);
}

export async function deleteEmployeeApi(employeeId) {
  return requestClient.delete(`${BASE_URL}/${employeeId}`);
}
