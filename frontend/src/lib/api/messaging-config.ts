/**
 * Messaging Config API Client
 * Matches backend API schema
 */

import { apiClient } from "./client";

// Types matching backend

export interface MessagingConfig {
  id: number;
  name: string;
  provider: string;
  settings: Record<string, unknown>;
  is_default: boolean;
  is_active: boolean;
  company_id?: number | null;
  created_at: string;
  updated_at?: string | null;
}

export interface CreateMessagingConfigData {
  name: string;
  provider: string;
  settings: Record<string, unknown>;
  is_default?: boolean;
  is_active?: boolean;
}

export interface UpdateMessagingConfigData {
  name?: string;
  provider?: string;
  settings?: Record<string, unknown>;
  is_default?: boolean;
  is_active?: boolean;
}

// API Functions
export const messagingConfigApi = {
  /**
   * List all messaging configs
   */
  list: (): Promise<MessagingConfig[]> =>
    apiClient.get("/api/v1/messaging-config/"),

  /**
   * Get a messaging config by ID
   */
  get: (id: number): Promise<MessagingConfig> =>
    apiClient.get(`/api/v1/messaging-config/${id}`),

  /**
   * Create a new messaging config
   */
  create: (data: CreateMessagingConfigData): Promise<MessagingConfig> =>
    apiClient.post("/api/v1/messaging-config/", data),

  /**
   * Update a messaging config
   */
  update: (id: number, data: UpdateMessagingConfigData): Promise<MessagingConfig> =>
    apiClient.put(`/api/v1/messaging-config/${id}`, data),

  /**
   * Delete a messaging config
   */
  delete: (id: number): Promise<{ message: string }> =>
    apiClient.delete(`/api/v1/messaging-config/${id}`),

  /**
   * Ensure a default messaging config exists
   */
  ensureDefault: (): Promise<MessagingConfig> =>
    apiClient.post("/api/v1/messaging-config/ensure-default"),
};

export default messagingConfigApi;
