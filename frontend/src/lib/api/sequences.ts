/**
 * Sequences API Client
 * Matches backend API schema
 */

import { apiClient } from "./client";

// Types matching backend

export interface Sequence {
  id: number;
  code: string;
  name: string;
  prefix: string;
  suffix: string;
  padding: number;
  number_next: number;
  number_increment: number;
  reset_period?: string | null;
  company_id?: number | null;
  is_active: boolean;
}

export interface SequenceListParams {
  company_id?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface PaginatedSequences {
  items: Sequence[];
  total: number;
}

export interface CreateSequenceData {
  code: string;
  name: string;
  prefix?: string;
  suffix?: string;
  padding?: number;
  number_increment?: number;
  reset_period?: string;
  company_id?: number;
  module_name?: string;
}

export interface UpdateSequenceData {
  name?: string;
  prefix?: string;
  suffix?: string;
  padding?: number;
  number_increment?: number;
  reset_period?: string;
  is_active?: boolean;
}

export interface SequenceNextResponse {
  code: string;
  number: string;
}

// API Functions
export const sequencesApi = {
  /**
   * List all sequences
   */
  list: (params?: SequenceListParams): Promise<Sequence[]> =>
    apiClient.get("/api/v1/base/sequences/", params),

  /**
   * Get a sequence by code
   */
  get: (code: string, params?: { company_id?: number }): Promise<Sequence> =>
    apiClient.get(`/api/v1/base/sequences/${code}`, params),

  /**
   * Create a new sequence
   */
  create: (data: CreateSequenceData): Promise<Sequence> =>
    apiClient.post("/api/v1/base/sequences/", data),

  /**
   * Update a sequence
   */
  update: (code: string, data: UpdateSequenceData, params?: { company_id?: number }): Promise<Sequence> =>
    apiClient.put(`/api/v1/base/sequences/${code}`, data),

  /**
   * Delete a sequence
   */
  delete: (code: string, params?: { company_id?: number }): Promise<{ status: string; message: string }> =>
    apiClient.delete(`/api/v1/base/sequences/${code}`),

  /**
   * Get the next number in a sequence (consumes it)
   */
  getNext: (code: string, params?: { company_id?: number }): Promise<SequenceNextResponse> =>
    apiClient.post(`/api/v1/base/sequences/${code}/next`),

  /**
   * Preview the next N sequence numbers without consuming them
   */
  preview: (code: string, params?: { company_id?: number; count?: number }): Promise<string[]> =>
    apiClient.get(`/api/v1/base/sequences/${code}/preview`, params),
};

export default sequencesApi;
