/**
 * Notification Types and Interfaces
 * Matches backend API schema
 */

// Notification levels (matches backend NotificationLevel enum)
export type NotificationLevel = "info" | "success" | "warning" | "error";

// Actor info returned with notifications
export interface ActorInfo {
  id: number;
  full_name: string;
  avatar_url?: string | null;
}

// Base notification interface (matches backend NotificationResponse)
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

// API request/response types
export interface NotificationListParams {
  filter_type?: "all" | "unread" | "read";
  page?: number;
  page_size?: number;
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

export interface BulkReadRequest {
  notification_ids?: number[];
}

export interface BulkReadResponse {
  message: string;
  updated_count: number;
}

export interface BulkDeleteRequest {
  notification_ids: number[];
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

// Filter state for components
export interface NotificationFiltersState {
  filter_type: "all" | "unread" | "read";
  search: string;
}

// Notification preferences
export interface NotificationPreferences {
  email_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  digest_frequency: "none" | "daily" | "weekly";
  muted_until?: string | null;
  quiet_hours_enabled: boolean;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
}

export interface UpdateNotificationPreferences extends Partial<NotificationPreferences> {}

// Notification level metadata for UI
export const NOTIFICATION_LEVEL_CONFIG: Record<
  NotificationLevel,
  { label: string; icon: string; color: string; bgColor: string }
> = {
  info: {
    label: "Info",
    icon: "Info",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  success: {
    label: "Success",
    icon: "CheckCircle",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
  warning: {
    label: "Warning",
    icon: "AlertTriangle",
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
  },
  error: {
    label: "Error",
    icon: "XCircle",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
  },
};
