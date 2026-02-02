/**
 * Webhooks API Client
 * Matches backend webhook model schema
 */

import { apiClient } from "./client";

// Types matching backend

export type WebhookEvent = "create" | "update" | "delete" | "workflow_change" | "custom";

export type WebhookAuthType = "none" | "basic" | "bearer" | "signature" | "api_key";

export type WebhookStatus = "pending" | "success" | "failed" | "retrying";

export interface Webhook {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  module_name?: string | null;
  url: string;
  method: string;
  headers?: Record<string, string>;
  content_type: string;
  auth_type: string;
  auth_username?: string | null;
  auth_token?: string | null;
  auth_header_name?: string | null;
  secret_key?: string | null;
  signature_header?: string | null;
  events: string[];
  model_name?: string | null;
  filter_domain?: unknown[];
  payload_template?: string | null;
  include_record: boolean;
  include_changes: boolean;
  max_retries: number;
  retry_delay: number;
  retry_backoff: number;
  timeout: number;
  is_active: boolean;
  company_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface WebhookLog {
  id: number;
  webhook_id: number;
  event_type: string;
  model_name?: string | null;
  res_id?: number | null;
  request_url: string;
  request_method: string;
  request_headers?: Record<string, string> | null;
  request_payload?: Record<string, unknown> | null;
  response_status?: number | null;
  response_headers?: Record<string, string> | null;
  response_body?: string | null;
  duration_ms?: number | null;
  status: string;
  retry_count: number;
  next_retry?: string | null;
  error_message?: string | null;
  created_at?: string | null;
}

export interface WebhookListParams {
  model_name?: string;
  module_name?: string;
  is_active?: boolean;
  [key: string]: string | number | boolean | undefined;
}

export interface PaginatedWebhooks {
  items: Webhook[];
  total: number;
}

export interface CreateWebhookData {
  name: string;
  code: string;
  url: string;
  method?: string;
  description?: string;
  module_name?: string;
  headers?: Record<string, string>;
  content_type?: string;
  auth_type?: WebhookAuthType;
  auth_username?: string;
  auth_password?: string;
  auth_token?: string;
  auth_header_name?: string;
  secret_key?: string;
  signature_header?: string;
  events: string[];
  model_name?: string;
  filter_domain?: unknown[];
  payload_template?: string;
  include_record?: boolean;
  include_changes?: boolean;
  max_retries?: number;
  retry_delay?: number;
  retry_backoff?: number;
  timeout?: number;
  company_id?: number;
}

export interface UpdateWebhookData {
  name?: string;
  url?: string;
  method?: string;
  description?: string;
  headers?: Record<string, string>;
  content_type?: string;
  auth_type?: WebhookAuthType;
  auth_username?: string;
  auth_password?: string;
  auth_token?: string;
  auth_header_name?: string;
  secret_key?: string;
  signature_header?: string;
  events?: string[];
  model_name?: string;
  filter_domain?: unknown[];
  payload_template?: string;
  include_record?: boolean;
  include_changes?: boolean;
  max_retries?: number;
  retry_delay?: number;
  retry_backoff?: number;
  timeout?: number;
  is_active?: boolean;
}

export interface WebhookTestResponse {
  success: boolean;
  status_code?: number;
  response_body?: string;
  duration_ms?: number;
  error?: string;
}

export interface WebhookLogListParams {
  status?: string;
  event_type?: string;
  limit?: number;
  offset?: number;
  [key: string]: string | number | boolean | undefined;
}

// API Functions
export const webhooksApi = {
  /**
   * List all webhooks
   */
  list: (params?: WebhookListParams): Promise<Webhook[]> =>
    apiClient.get("/api/v1/base/webhooks/", params),

  /**
   * Get a webhook by ID
   */
  get: (id: number): Promise<Webhook> =>
    apiClient.get(`/api/v1/base/webhooks/${id}`),

  /**
   * Create a new webhook
   */
  create: (data: CreateWebhookData): Promise<Webhook> =>
    apiClient.post("/api/v1/base/webhooks/", data),

  /**
   * Update a webhook
   */
  update: (id: number, data: UpdateWebhookData): Promise<Webhook> =>
    apiClient.put(`/api/v1/base/webhooks/${id}`, data),

  /**
   * Delete a webhook
   */
  delete: (id: number): Promise<void> =>
    apiClient.delete(`/api/v1/base/webhooks/${id}`),

  /**
   * Test a webhook by sending a test payload
   */
  test: (id: number): Promise<WebhookTestResponse> =>
    apiClient.post(`/api/v1/base/webhooks/${id}/test`),

  /**
   * Get delivery logs for a webhook
   */
  getLogs: (id: number, params?: WebhookLogListParams): Promise<WebhookLog[]> =>
    apiClient.get(`/api/v1/base/webhooks/${id}/logs`, params),
};

export default webhooksApi;
