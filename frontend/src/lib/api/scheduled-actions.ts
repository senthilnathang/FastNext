/**
 * Scheduled Actions API Client
 * Matches backend API schema
 */

import { apiClient } from "./client";

// Types matching backend

export type IntervalType = "minutes" | "hours" | "days" | "weeks" | "months";

export interface ScheduledAction {
  id: number;
  name: string;
  code: string;
  module_name?: string | null;
  model_name?: string | null;
  method_name: string;
  interval_number: number;
  interval_type: string;
  cron_expression?: string | null;
  next_run?: string | null;
  last_run?: string | null;
  last_run_status?: string | null;
  last_run_duration?: number | null;
  priority: number;
  is_active: boolean;
}

export interface ScheduledActionLog {
  id: number;
  action_code: string;
  started_at: string;
  finished_at?: string | null;
  duration_seconds?: number | null;
  status: string;
  error_message?: string | null;
  records_processed: number;
}

export interface ScheduledActionListParams {
  active_only?: boolean;
  [key: string]: string | number | boolean | undefined;
}

export type PaginatedScheduledActions = ScheduledAction[];

export interface CreateScheduledActionData {
  code: string;
  name: string;
  method_name: string;
  model_name?: string | null;
  module_name?: string | null;
  interval_number?: number;
  interval_type?: string;
  cron_expression?: string | null;
  python_code?: string | null;
  method_args?: unknown[];
  method_kwargs?: Record<string, unknown>;
  priority?: number;
  max_retries?: number;
}

export interface UpdateScheduledActionData {
  name?: string;
  method_name?: string;
  interval_number?: number;
  interval_type?: string;
  cron_expression?: string | null;
  python_code?: string | null;
  priority?: number;
  max_retries?: number;
  is_active?: boolean;
}

export interface RunResult {
  action_code: string;
  status: string;
  result?: unknown;
  error?: string | null;
}

// API Functions
export const scheduledActionsApi = {
  /**
   * List all scheduled actions
   */
  list: (params?: ScheduledActionListParams): Promise<ScheduledAction[]> =>
    apiClient.get("/api/v1/base/scheduled-actions/", params),

  /**
   * List actions that are due for execution
   */
  listDue: (params?: { limit?: number }): Promise<ScheduledAction[]> =>
    apiClient.get("/api/v1/base/scheduled-actions/due", params),

  /**
   * Get a scheduled action by code
   */
  get: (code: string): Promise<ScheduledAction> =>
    apiClient.get(`/api/v1/base/scheduled-actions/${code}`),

  /**
   * Create a new scheduled action
   */
  create: (data: CreateScheduledActionData): Promise<ScheduledAction> =>
    apiClient.post("/api/v1/base/scheduled-actions/", data),

  /**
   * Update a scheduled action
   */
  update: (code: string, data: UpdateScheduledActionData): Promise<ScheduledAction> =>
    apiClient.put(`/api/v1/base/scheduled-actions/${code}`, data),

  /**
   * Delete a scheduled action
   */
  delete: (code: string): Promise<{ status: string; message: string }> =>
    apiClient.delete(`/api/v1/base/scheduled-actions/${code}`),

  /**
   * Manually run a scheduled action
   */
  run: (code: string): Promise<RunResult> =>
    apiClient.post(`/api/v1/base/scheduled-actions/${code}/run`),

  /**
   * Run all due scheduled actions
   */
  runDue: (): Promise<RunResult[]> =>
    apiClient.post("/api/v1/base/scheduled-actions/run-due"),

  /**
   * Get execution history (logs) for a scheduled action
   */
  getLogs: (code: string, params?: { limit?: number }): Promise<ScheduledActionLog[]> =>
    apiClient.get(`/api/v1/base/scheduled-actions/${code}/history`, params),

  /**
   * Delete old execution logs
   */
  cleanupLogs: (params?: { days?: number }): Promise<{ status: string; deleted_count: number }> =>
    apiClient.post("/api/v1/base/scheduled-actions/cleanup-logs", undefined),
};

export default scheduledActionsApi;
