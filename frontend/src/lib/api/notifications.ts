/**
 * Notifications API Client
 * Handles notification CRUD operations and management
 */

import { apiClient } from "./client";

// Types
export type NotificationType = "info" | "success" | "warning" | "error" | "system";
export type NotificationPriority = "low" | "normal" | "high" | "urgent";
export type NotificationStatus = "unread" | "read" | "archived";

export interface Notification {
  id: number;
  user_id: number;
  type: NotificationType;
  priority: NotificationPriority;
  status: NotificationStatus;
  title: string;
  message: string;
  message_html?: string | null;
  icon?: string | null;
  icon_color?: string | null;
  action_url?: string | null;
  action_label?: string | null;
  model_name?: string | null;
  record_id?: number | null;
  source_type?: string | null;
  source_id?: number | null;
  is_pinned: boolean;
  expires_at?: string | null;
  read_at?: string | null;
  archived_at?: string | null;
  created_at: string;
  updated_at?: string | null;
  metadata?: Record<string, unknown>;
}

export interface NotificationListParams {
  type?: NotificationType;
  priority?: NotificationPriority;
  status?: NotificationStatus;
  is_pinned?: boolean;
  model_name?: string;
  record_id?: number;
  search?: string;
  skip?: number;
  limit?: number;
  from_date?: string;
  to_date?: string;
}

export interface CreateNotificationData {
  type?: NotificationType;
  priority?: NotificationPriority;
  title: string;
  message: string;
  message_html?: string;
  icon?: string;
  icon_color?: string;
  action_url?: string;
  action_label?: string;
  model_name?: string;
  record_id?: number;
  expires_at?: string;
  metadata?: Record<string, unknown>;
}

export interface PaginatedNotifications {
  items: Notification[];
  total: number;
  skip: number;
  limit: number;
}

export interface NotificationStats {
  total: number;
  unread: number;
  by_type: { [key in NotificationType]?: number };
  by_priority: { [key in NotificationPriority]?: number };
}

export interface UnreadCountResponse {
  count: number;
  by_type?: { [key in NotificationType]?: number };
}

export interface BulkActionResult {
  success: number;
  failed: number;
  errors?: { id: number; error: string }[];
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
   * Get unread notification count
   */
  getUnreadCount: (): Promise<UnreadCountResponse> =>
    apiClient.get("/api/v1/notifications/unread/count"),

  /**
   * Mark a notification as read
   */
  markAsRead: (id: number): Promise<Notification> =>
    apiClient.post(`/api/v1/notifications/${id}/read`),

  /**
   * Mark a notification as unread
   */
  markAsUnread: (id: number): Promise<Notification> =>
    apiClient.post(`/api/v1/notifications/${id}/unread`),

  /**
   * Mark all notifications as read
   */
  markAllAsRead: (params?: { type?: NotificationType }): Promise<BulkActionResult> =>
    apiClient.post("/api/v1/notifications/read-all", params),

  /**
   * Delete a notification
   */
  deleteNotification: (id: number): Promise<void> =>
    apiClient.delete(`/api/v1/notifications/${id}`),

  /**
   * Archive a notification
   */
  archive: (id: number): Promise<Notification> =>
    apiClient.post(`/api/v1/notifications/${id}/archive`),

  /**
   * Unarchive a notification
   */
  unarchive: (id: number): Promise<Notification> =>
    apiClient.post(`/api/v1/notifications/${id}/unarchive`),

  /**
   * Toggle pin on notification
   */
  togglePin: (id: number): Promise<Notification> =>
    apiClient.post(`/api/v1/notifications/${id}/pin`),

  /**
   * Create a new notification (admin/system use)
   */
  create: (data: CreateNotificationData): Promise<Notification> =>
    apiClient.post("/api/v1/notifications", data),

  // Bulk operations
  bulk: {
    /**
     * Mark multiple notifications as read
     */
    markRead: (ids: number[]): Promise<BulkActionResult> =>
      apiClient.post("/api/v1/notifications/bulk/read", { ids }),

    /**
     * Mark multiple notifications as unread
     */
    markUnread: (ids: number[]): Promise<BulkActionResult> =>
      apiClient.post("/api/v1/notifications/bulk/unread", { ids }),

    /**
     * Archive multiple notifications
     */
    archive: (ids: number[]): Promise<BulkActionResult> =>
      apiClient.post("/api/v1/notifications/bulk/archive", { ids }),

    /**
     * Delete multiple notifications
     */
    delete: (ids: number[]): Promise<BulkActionResult> =>
      apiClient.post("/api/v1/notifications/bulk/delete", { ids }),
  },

  // Stats
  stats: {
    /**
     * Get notification statistics
     */
    get: (): Promise<NotificationStats> =>
      apiClient.get("/api/v1/notifications/stats"),

    /**
     * Get counts by type
     */
    getByType: (): Promise<{ [key in NotificationType]?: number }> =>
      apiClient.get("/api/v1/notifications/stats/by-type"),

    /**
     * Get counts by priority
     */
    getByPriority: (): Promise<{ [key in NotificationPriority]?: number }> =>
      apiClient.get("/api/v1/notifications/stats/by-priority"),
  },

  // Preferences
  preferences: {
    /**
     * Get notification preferences
     */
    get: (): Promise<NotificationPreferences> =>
      apiClient.get("/api/v1/notifications/preferences"),

    /**
     * Update notification preferences
     */
    update: (data: Partial<NotificationPreferences>): Promise<NotificationPreferences> =>
      apiClient.patch("/api/v1/notifications/preferences", data),
  },
};

// Additional types
export interface NotificationPreferences {
  email_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  digest_frequency: "realtime" | "hourly" | "daily" | "weekly";
  quiet_hours_enabled: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  muted_types: NotificationType[];
  muted_sources: string[];
}

export default notificationsApi;
