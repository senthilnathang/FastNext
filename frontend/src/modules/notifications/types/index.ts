/**
 * Notification Types and Interfaces
 */

// Notification types
export type NotificationType =
  | "system"
  | "message"
  | "alert"
  | "reminder"
  | "update"
  | "mention"
  | "task"
  | "security";

export type NotificationPriority = "low" | "normal" | "high" | "urgent";

export type NotificationStatus = "unread" | "read" | "archived";

// Base notification interface
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
  source_type?: string | null;
  source_id?: number | null;
  metadata?: Record<string, unknown>;
  is_read: boolean;
  read_at?: string | null;
  expires_at?: string | null;
  created_at: string;
  updated_at?: string | null;
}

// Notification preferences
export interface NotificationChannel {
  enabled: boolean;
  types: NotificationType[];
}

export interface NotificationPreferences {
  id: number;
  user_id: number;
  email_enabled: boolean;
  email_digest: "instant" | "daily" | "weekly" | "never";
  email_types: NotificationType[];
  push_enabled: boolean;
  push_types: NotificationType[];
  in_app_enabled: boolean;
  in_app_types: NotificationType[];
  quiet_hours_enabled: boolean;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  muted_until?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface UpdateNotificationPreferences {
  email_enabled?: boolean;
  email_digest?: "instant" | "daily" | "weekly" | "never";
  email_types?: NotificationType[];
  push_enabled?: boolean;
  push_types?: NotificationType[];
  in_app_enabled?: boolean;
  in_app_types?: NotificationType[];
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  muted_until?: string | null;
}

// API request/response types
export interface NotificationListParams {
  type?: NotificationType;
  status?: NotificationStatus;
  priority?: NotificationPriority;
  is_read?: boolean;
  start_date?: string;
  end_date?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedNotifications {
  items: Notification[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface NotificationStats {
  total: number;
  unread: number;
  by_type: Partial<Record<NotificationType, number>>;
  by_priority: Partial<Record<NotificationPriority, number>>;
}

export interface BulkActionResult {
  success: number;
  failed: number;
  errors?: Array<{ id: number; error: string }>;
}

// Filter state for components
export interface NotificationFiltersState {
  type: NotificationType | "all";
  status: NotificationStatus | "all";
  priority: NotificationPriority | "all";
  dateRange: "all" | "today" | "week" | "month";
  search: string;
}

// Notification type metadata for UI
export const NOTIFICATION_TYPE_CONFIG: Record<
  NotificationType,
  { label: string; icon: string; color: string }
> = {
  system: { label: "System", icon: "Settings", color: "text-gray-500" },
  message: { label: "Message", icon: "MessageCircle", color: "text-blue-500" },
  alert: { label: "Alert", icon: "AlertTriangle", color: "text-red-500" },
  reminder: { label: "Reminder", icon: "Clock", color: "text-yellow-500" },
  update: { label: "Update", icon: "RefreshCw", color: "text-green-500" },
  mention: { label: "Mention", icon: "AtSign", color: "text-purple-500" },
  task: { label: "Task", icon: "CheckSquare", color: "text-amber-500" },
  security: { label: "Security", icon: "Shield", color: "text-orange-500" },
};

export const NOTIFICATION_PRIORITY_CONFIG: Record<
  NotificationPriority,
  { label: string; color: string; bgColor: string }
> = {
  low: { label: "Low", color: "text-gray-400", bgColor: "bg-gray-100" },
  normal: { label: "Normal", color: "text-gray-600", bgColor: "bg-gray-100" },
  high: { label: "High", color: "text-orange-600", bgColor: "bg-orange-100" },
  urgent: { label: "Urgent", color: "text-red-600", bgColor: "bg-red-100" },
};
