/**
 * Record Rules API Client
 * Matches backend API schema
 */

import { apiClient } from "./client";

// Types matching backend

export interface RecordRule {
  id: number;
  name: string;
  model_name: string;
  domain_filter: string;
  groups: number[];
  perm_read: boolean;
  perm_write: boolean;
  perm_create: boolean;
  perm_unlink: boolean;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface CreateRecordRuleData {
  name: string;
  model_name: string;
  domain_filter: string;
  groups?: number[];
  perm_read?: boolean;
  perm_write?: boolean;
  perm_create?: boolean;
  perm_unlink?: boolean;
  is_active?: boolean;
}

export interface UpdateRecordRuleData {
  name?: string;
  model_name?: string;
  domain_filter?: string;
  groups?: number[];
  perm_read?: boolean;
  perm_write?: boolean;
  perm_create?: boolean;
  perm_unlink?: boolean;
  is_active?: boolean;
}

export interface CheckAccessData {
  model_name: string;
  record_id: number;
  operation: string;
}

export interface CheckAccessResponse {
  has_access: boolean;
  reason?: string;
}

// API Functions
export const recordRulesApi = {
  /**
   * List all record rules
   */
  list: (): Promise<RecordRule[]> =>
    apiClient.get("/api/v1/base/record-rules/"),

  /**
   * Get record rules for a specific model
   */
  getForModel: (modelName: string): Promise<RecordRule[]> =>
    apiClient.get(`/api/v1/base/record-rules/for-model/${modelName}`),

  /**
   * Get a specific record rule by ID
   */
  get: (ruleId: number): Promise<RecordRule> =>
    apiClient.get(`/api/v1/base/record-rules/${ruleId}`),

  /**
   * Create a new record rule
   */
  create: (data: CreateRecordRuleData): Promise<RecordRule> =>
    apiClient.post("/api/v1/base/record-rules/", data),

  /**
   * Update a record rule
   */
  update: (ruleId: number, data: UpdateRecordRuleData): Promise<RecordRule> =>
    apiClient.put(`/api/v1/base/record-rules/${ruleId}`, data),

  /**
   * Delete a record rule
   */
  delete: (ruleId: number): Promise<{ message: string }> =>
    apiClient.delete(`/api/v1/base/record-rules/${ruleId}`),

  /**
   * Check access for a specific record
   */
  checkAccess: (data: CheckAccessData): Promise<CheckAccessResponse> =>
    apiClient.post("/api/v1/base/record-rules/check-access", data),
};

export default recordRulesApi;
