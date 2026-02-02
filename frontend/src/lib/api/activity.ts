/**
 * Activity/Audit Log API Client
 * Matches backend API schema
 */

import { apiClient } from "./client";

// Types matching backend

export interface ActivityLogUser {
  id: number;
  full_name: string;
  avatar_url?: string | null;
}

export interface ActivityLog {
  id: number;
  event_id: string;
  action: string;
  category?: string | null;
  level?: string | null;
  entity_type: string;
  entity_id?: number | null;
  entity_name?: string | null;
  description?: string | null;
  user_id?: number | null;
  company_id?: number | null;
  ip_address?: string | null;
  success: boolean;
  created_at: string;
  user?: ActivityLogUser | null;
}

export interface ActivityListParams {
  entity_type?: string;
  entity_id?: number;
  user_id?: number;
  action?: string;
  category?: string;
  level?: string;
  page?: number;
  page_size?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface PaginatedActivityLogs {
  total: number;
  items: ActivityLog[];
  page: number;
  page_size: number;
}

// API Functions
export const activityApi = {
  /**
   * List activity logs with optional filters
   */
  list: (params?: ActivityListParams): Promise<PaginatedActivityLogs> =>
    apiClient.get("/api/v1/activity-logs", params),

  /**
   * Get a specific activity log entry
   */
  get: (activityId: number): Promise<ActivityLog> =>
    apiClient.get(`/api/v1/activity-logs/${activityId}`),

  /**
   * Get all activities for a specific user
   */
  byUser: (userId: number, params?: { limit?: number; action?: string }): Promise<ActivityLog[]> =>
    apiClient.get(`/api/v1/activity-logs/user/${userId}`, params),

  /**
   * Get all activities for a specific entity
   */
  byEntity: (entityType: string, entityId: number, params?: { limit?: number }): Promise<ActivityLog[]> =>
    apiClient.get(`/api/v1/activity-logs/entity/${entityType}/${entityId}`, params),
};

export default activityApi;
