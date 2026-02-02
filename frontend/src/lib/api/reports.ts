/**
 * Reports API Client
 * Matches backend API schema
 */

import { apiClient } from "./client";

// Types matching backend

export type ReportFormat = "pdf" | "html" | "xlsx" | "csv" | "docx";

export interface Report {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  model_name: string;
  module_name?: string | null;
  output_format: string;
  template_type: string;
  paper_format: string;
  orientation: string;
  supports_multi: boolean;
  is_active: boolean;
  created_at: string;
}

export interface ReportExecution {
  id: number;
  report_code: string;
  model_name?: string | null;
  record_ids: number[];
  output_format: string;
  status: string;
  file_path?: string | null;
  file_size?: number | null;
  duration_ms?: number | null;
  error_message?: string | null;
  created_at: string;
}

export interface ReportSchedule {
  id: number;
  report_id: number;
  name: string;
  cron_expression: string;
  output_format?: string | null;
  email_to?: string | null;
  last_run?: string | null;
  next_run?: string | null;
  last_status?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ReportListParams {
  model_name?: string;
  module_name?: string;
  active_only?: boolean;
  [key: string]: string | number | boolean | undefined;
}

export interface PaginatedReports {
  items: Report[];
  total: number;
}

export interface CreateReportData {
  code: string;
  name: string;
  model_name: string;
  output_format?: string;
  template_type?: string;
  template_content?: string | null;
  template_file?: string | null;
  module_name?: string | null;
  description?: string | null;
  paper_format?: string;
  orientation?: string;
  margin_top?: number;
  margin_bottom?: number;
  margin_left?: number;
  margin_right?: number;
  header_html?: string | null;
  footer_html?: string | null;
  supports_multi?: boolean;
}

export interface UpdateReportData {
  name?: string;
  description?: string | null;
  template_content?: string | null;
  template_file?: string | null;
  output_format?: string;
  paper_format?: string;
  orientation?: string;
  margin_top?: number;
  margin_bottom?: number;
  margin_left?: number;
  margin_right?: number;
  header_html?: string | null;
  footer_html?: string | null;
  supports_multi?: boolean;
  is_active?: boolean;
}

export interface GenerateReportRequest {
  record_ids: number[];
  parameters?: Record<string, unknown>;
  output_format?: string;
}

export interface CreateScheduleData {
  name: string;
  cron_expression: string;
  parameters?: Record<string, unknown>;
  output_format?: string;
  email_to?: string;
  email_subject?: string;
  save_to_path?: string;
}

// API Functions
export const reportsApi = {
  /**
   * List available reports
   */
  list: (params?: ReportListParams): Promise<Report[]> =>
    apiClient.get("/api/v1/base/reports/", params),

  /**
   * Get a report by code
   */
  get: (reportCode: string): Promise<Report> =>
    apiClient.get(`/api/v1/base/reports/${reportCode}`),

  /**
   * Create a new report definition
   */
  create: (data: CreateReportData): Promise<Report> =>
    apiClient.post("/api/v1/base/reports/", data),

  /**
   * Update a report definition
   */
  update: (reportCode: string, data: UpdateReportData): Promise<Report> =>
    apiClient.put(`/api/v1/base/reports/${reportCode}`, data),

  /**
   * Delete a report definition
   */
  delete: (reportCode: string): Promise<void> =>
    apiClient.delete(`/api/v1/base/reports/${reportCode}`),

  /**
   * Render/generate a report for given records
   * Note: Returns a file download (Blob) - handle accordingly
   */
  generate: (reportCode: string, data: GenerateReportRequest): Promise<unknown> =>
    apiClient.post(`/api/v1/base/reports/${reportCode}/render`, data),

  /**
   * Preview a report with sample data
   */
  preview: (reportCode: string, sampleData?: Record<string, unknown>): Promise<{ html: string }> =>
    apiClient.post(`/api/v1/base/reports/${reportCode}/preview`, sampleData),

  /**
   * Get execution history for a report
   */
  getExecutions: (reportCode: string, params?: { limit?: number }): Promise<ReportExecution[]> =>
    apiClient.get(`/api/v1/base/reports/${reportCode}/executions`, params),

  /**
   * Get a specific execution by ID
   */
  getExecution: (executionId: number): Promise<ReportExecution> =>
    apiClient.get(`/api/v1/base/reports/executions/${executionId}`),

  /**
   * Get schedules for a report
   */
  getSchedules: (reportCode: string, params?: { active_only?: boolean }): Promise<ReportSchedule[]> =>
    apiClient.get(`/api/v1/base/reports/${reportCode}/schedules`, params),

  /**
   * Create a schedule for a report
   */
  createSchedule: (reportCode: string, data: CreateScheduleData): Promise<ReportSchedule> =>
    apiClient.post(`/api/v1/base/reports/${reportCode}/schedules`, data),

  /**
   * Delete a schedule
   */
  deleteSchedule: (reportCode: string, scheduleId: number): Promise<void> =>
    apiClient.delete(`/api/v1/base/reports/${reportCode}/schedules/${scheduleId}`),

  /**
   * Get all available reports for a specific model
   */
  getModelReports: (modelName: string): Promise<Report[]> =>
    apiClient.get(`/api/v1/base/reports/model/${modelName}`),
};

export default reportsApi;
