/**
 * Onboarding API Client
 */

import { apiClient } from "@/lib/api/client";
import type {
  OnboardingTemplate,
  OnboardingProcess,
  OnboardingDocument,
  OnboardingVerification,
  OnboardingConversion,
  PaginatedResponse,
  ListParams,
} from "../types";

const BASE = "/api/v1/onboarding";

export const onboardingApi = {
  // Dashboard stats
  stats: () => apiClient.get<Record<string, number>>(`${BASE}/dashboard/stats`),

  // Templates
  templates: {
    list: (params?: ListParams) =>
      apiClient.get<PaginatedResponse<OnboardingTemplate>>(`${BASE}/templates/`, params),
    get: (id: number) => apiClient.get<OnboardingTemplate>(`${BASE}/templates/${id}`),
    create: (data: Partial<OnboardingTemplate>) =>
      apiClient.post<OnboardingTemplate>(`${BASE}/templates/`, data),
    update: (id: number, data: Partial<OnboardingTemplate>) =>
      apiClient.put<OnboardingTemplate>(`${BASE}/templates/${id}`, data),
    delete: (id: number) => apiClient.delete(`${BASE}/templates/${id}`),
  },

  // Processes
  processes: {
    list: (params?: ListParams) =>
      apiClient.get<PaginatedResponse<OnboardingProcess>>(`${BASE}/processes/`, params),
    get: (id: number) => apiClient.get<OnboardingProcess>(`${BASE}/processes/${id}`),
    create: (data: Partial<OnboardingProcess>) =>
      apiClient.post<OnboardingProcess>(`${BASE}/processes/`, data),
    update: (id: number, data: Partial<OnboardingProcess>) =>
      apiClient.put<OnboardingProcess>(`${BASE}/processes/${id}`, data),
    delete: (id: number) => apiClient.delete(`${BASE}/processes/${id}`),
  },

  // Documents
  documents: {
    list: (params?: ListParams) =>
      apiClient.get<PaginatedResponse<OnboardingDocument>>(`${BASE}/documents/`, params),
    create: (data: Partial<OnboardingDocument>) =>
      apiClient.post<OnboardingDocument>(`${BASE}/documents/`, data),
    delete: (id: number) => apiClient.delete(`${BASE}/documents/${id}`),
  },

  // Verifications
  verifications: {
    list: (params?: ListParams) =>
      apiClient.get<PaginatedResponse<OnboardingVerification>>(`${BASE}/verifications/`, params),
    create: (data: Partial<OnboardingVerification>) =>
      apiClient.post<OnboardingVerification>(`${BASE}/verifications/`, data),
    delete: (id: number) => apiClient.delete(`${BASE}/verifications/${id}`),
  },

  // Conversions
  conversions: {
    list: (params?: ListParams) =>
      apiClient.get<PaginatedResponse<OnboardingConversion>>(`${BASE}/conversions/`, params),
    create: (data: Partial<OnboardingConversion>) =>
      apiClient.post<OnboardingConversion>(`${BASE}/conversions/`, data),
    delete: (id: number) => apiClient.delete(`${BASE}/conversions/${id}`),
  },
};
