/**
 * Employee API Client
 */

import { apiClient } from "@/lib/api/client";
import type {
  Employee,
  EmployeeCreate,
  EmployeeUpdate,
  EmployeeDocument,
  EmployeeNote,
  BonusPoint,
  DisciplinaryAction,
  Policy,
  EmployeeReport,
  EmployeeSetting,
  PaginatedResponse,
  ListParams,
} from "../types";

const BASE = "/api/v1/employee";

export const employeeApi = {
  // Employee CRUD
  list: (params?: ListParams) =>
    apiClient.get<PaginatedResponse<Employee>>(`${BASE}/list/`, params),
  get: (id: number) =>
    apiClient.get<Employee>(`${BASE}/list/${id}`),
  create: (data: EmployeeCreate) =>
    apiClient.post<Employee>(`${BASE}/list/`, data),
  update: (id: number, data: EmployeeUpdate) =>
    apiClient.put<Employee>(`${BASE}/list/${id}`, data),
  delete: (id: number) =>
    apiClient.delete(`${BASE}/list/${id}`),

  // Documents
  documents: {
    list: (params?: ListParams) =>
      apiClient.get<PaginatedResponse<EmployeeDocument>>(`${BASE}/documents/`, params),
    get: (id: number) =>
      apiClient.get<EmployeeDocument>(`${BASE}/documents/${id}`),
    create: (data: Partial<EmployeeDocument>) =>
      apiClient.post<EmployeeDocument>(`${BASE}/documents/`, data),
    update: (id: number, data: Partial<EmployeeDocument>) =>
      apiClient.put<EmployeeDocument>(`${BASE}/documents/${id}`, data),
    delete: (id: number) =>
      apiClient.delete(`${BASE}/documents/${id}`),
  },

  // Notes
  notes: {
    list: (params?: ListParams) =>
      apiClient.get<PaginatedResponse<EmployeeNote>>(`${BASE}/notes/`, params),
    get: (id: number) =>
      apiClient.get<EmployeeNote>(`${BASE}/notes/${id}`),
    create: (data: Partial<EmployeeNote>) =>
      apiClient.post<EmployeeNote>(`${BASE}/notes/`, data),
    update: (id: number, data: Partial<EmployeeNote>) =>
      apiClient.put<EmployeeNote>(`${BASE}/notes/${id}`, data),
    delete: (id: number) =>
      apiClient.delete(`${BASE}/notes/${id}`),
  },

  // Bonus Points
  bonusPoints: {
    list: (params?: ListParams) =>
      apiClient.get<PaginatedResponse<BonusPoint>>(`${BASE}/bonus-points/`, params),
    get: (id: number) =>
      apiClient.get<BonusPoint>(`${BASE}/bonus-points/${id}`),
    create: (data: Partial<BonusPoint>) =>
      apiClient.post<BonusPoint>(`${BASE}/bonus-points/`, data),
    update: (id: number, data: Partial<BonusPoint>) =>
      apiClient.put<BonusPoint>(`${BASE}/bonus-points/${id}`, data),
    delete: (id: number) =>
      apiClient.delete(`${BASE}/bonus-points/${id}`),
  },

  // Disciplinary Actions
  disciplinaryActions: {
    list: (params?: ListParams) =>
      apiClient.get<PaginatedResponse<DisciplinaryAction>>(`${BASE}/disciplinary-actions/`, params),
    get: (id: number) =>
      apiClient.get<DisciplinaryAction>(`${BASE}/disciplinary-actions/${id}`),
    create: (data: Partial<DisciplinaryAction>) =>
      apiClient.post<DisciplinaryAction>(`${BASE}/disciplinary-actions/`, data),
    update: (id: number, data: Partial<DisciplinaryAction>) =>
      apiClient.put<DisciplinaryAction>(`${BASE}/disciplinary-actions/${id}`, data),
    delete: (id: number) =>
      apiClient.delete(`${BASE}/disciplinary-actions/${id}`),
  },

  // Policies
  policies: {
    list: (params?: ListParams) =>
      apiClient.get<PaginatedResponse<Policy>>(`${BASE}/policies/`, params),
    get: (id: number) =>
      apiClient.get<Policy>(`${BASE}/policies/${id}`),
    create: (data: Partial<Policy>) =>
      apiClient.post<Policy>(`${BASE}/policies/`, data),
    update: (id: number, data: Partial<Policy>) =>
      apiClient.put<Policy>(`${BASE}/policies/${id}`, data),
    delete: (id: number) =>
      apiClient.delete(`${BASE}/policies/${id}`),
  },

  // Reports
  reports: {
    list: (params?: ListParams) =>
      apiClient.get<PaginatedResponse<EmployeeReport>>(`${BASE}/reports/`, params),
    get: (id: number) =>
      apiClient.get<EmployeeReport>(`${BASE}/reports/${id}`),
    create: (data: Partial<EmployeeReport>) =>
      apiClient.post<EmployeeReport>(`${BASE}/reports/`, data),
    delete: (id: number) =>
      apiClient.delete(`${BASE}/reports/${id}`),
  },

  // Settings
  settings: {
    list: (params?: ListParams) =>
      apiClient.get<PaginatedResponse<EmployeeSetting>>(`${BASE}/settings/`, params),
    get: (id: number) =>
      apiClient.get<EmployeeSetting>(`${BASE}/settings/${id}`),
    update: (id: number, data: Partial<EmployeeSetting>) =>
      apiClient.put<EmployeeSetting>(`${BASE}/settings/${id}`, data),
  },
};
