/**
 * Notifications API Client
 * Matches backend API schema
 */

import { apiClient } from "./client";

// Types matching backend
export type NotificationLevel = "info" | "success" | "warning" | "error";

export interface ActorInfo {
  id: number;
  full_name: string;
  avatar_url?: string | null;
}

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  description?: string | null;
  level: NotificationLevel;
  is_read: boolean;
  data: Record<string, unknown>;
  link?: string | null;
  actor_id?: number | null;
  actor?: ActorInfo | null;
  created_at: string;
  updated_at?: string | null;
}

export interface NotificationListParams {
  filter_type?: "all" | "unread" | "read";
  page?: number;
  page_size?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface PaginatedNotifications {
  items: Notification[];
  total: number;
  page: number;
  page_size: number;
  unread_count: number;
}

export interface NotificationStats {
  all_count: number;
  unread_count: number;
  read_count: number;
}

export interface BulkReadResponse {
  message: string;
  updated_count: number;
}

export interface BulkDeleteResponse {
  message: string;
  deleted_count: number;
}

export interface SendNotificationRequest {
  user_ids: number[];
  title: string;
  description?: string;
  level?: NotificationLevel;
  link?: string;
  data?: Record<string, unknown>;
}

export interface SendNotificationResponse {
  message: string;
  recipient_count: number;
}

// API Functions
export const notificationsApi = {
  /**
   * Get notifications with optional filters
   */
  getNotifications: (params?: NotificationListParams): Promise<PaginatedNotifications> =>
    apiClient.get("/api/v1/notifications", params),

  /**
   * Get a single notification by ID
   */
  getNotification: (id: number): Promise<Notification> =>
    apiClient.get(`/api/v1/notifications/${id}`),

  /**
   * Get notification statistics
   */
  getStats: (): Promise<NotificationStats> =>
    apiClient.get("/api/v1/notifications/stats"),

  /**
   * Mark a notification as read
   */
  markAsRead: (id: number): Promise<Notification> =>
    apiClient.put(`/api/v1/notifications/${id}`, { is_read: true }),

  /**
   * Mark a notification as unread
   */
  markAsUnread: (id: number): Promise<Notification> =>
    apiClient.put(`/api/v1/notifications/${id}`, { is_read: false }),

  /**
   * Delete a notification
   */
  deleteNotification: (id: number): Promise<void> =>
    apiClient.delete(`/api/v1/notifications/${id}`),

  /**
   * Bulk mark notifications as read
   * Pass empty array to mark all as read
   */
  bulkMarkAsRead: (ids?: number[]): Promise<BulkReadResponse> =>
    apiClient.post("/api/v1/notifications/bulk-read", { notification_ids: ids || [] }),

  /**
   * Bulk delete notifications
   */
  bulkDelete: (ids: number[]): Promise<BulkDeleteResponse> =>
    apiClient.post("/api/v1/notifications/bulk-delete", { notification_ids: ids }),

  /**
   * Send notifications to users (requires permissions)
   */
  send: (data: SendNotificationRequest): Promise<SendNotificationResponse> =>
    apiClient.post("/api/v1/notifications/send", data),
};

export default notificationsApi;
