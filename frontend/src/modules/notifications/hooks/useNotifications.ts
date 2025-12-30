import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  BulkDeleteResponse,
  BulkReadResponse,
  Notification,
  NotificationListParams,
  NotificationStats,
  PaginatedNotifications,
} from "../types";

// API base URL
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// Helper function to get auth headers
const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem("access_token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// API functions for notifications (matches backend endpoints)
const notificationsApi = {
  // Get paginated list of notifications
  getNotifications: async (
    params: NotificationListParams = {}
  ): Promise<PaginatedNotifications> => {
    const searchParams = new URLSearchParams();

    if (params.filter_type) {
      searchParams.append("filter_type", params.filter_type);
    }
    if (params.page) {
      searchParams.append("page", params.page.toString());
    }
    if (params.page_size) {
      searchParams.append("page_size", params.page_size.toString());
    }

    const response = await fetch(
      `${API_BASE}/notifications?${searchParams.toString()}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch notifications: ${response.statusText}`);
    }

    return response.json();
  },

  // Get single notification by ID
  getNotification: async (id: number): Promise<Notification> => {
    const response = await fetch(`${API_BASE}/notifications/${id}`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch notification: ${response.statusText}`);
    }

    return response.json();
  },

  // Get notification statistics
  getStats: async (): Promise<NotificationStats> => {
    const response = await fetch(`${API_BASE}/notifications/stats`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch notification stats: ${response.statusText}`
      );
    }

    return response.json();
  },

  // Mark notification as read (using PUT with is_read)
  markAsRead: async (id: number): Promise<Notification> => {
    const response = await fetch(`${API_BASE}/notifications/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify({ is_read: true }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to mark notification as read: ${response.statusText}`
      );
    }

    return response.json();
  },

  // Mark notification as unread
  markAsUnread: async (id: number): Promise<Notification> => {
    const response = await fetch(`${API_BASE}/notifications/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify({ is_read: false }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to mark notification as unread: ${response.statusText}`
      );
    }

    return response.json();
  },

  // Delete notification
  delete: async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE}/notifications/${id}`, {
      method: "DELETE",
      credentials: "include",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete notification: ${response.statusText}`);
    }
  },

  // Bulk mark as read (empty array = mark all)
  bulkMarkAsRead: async (ids?: number[]): Promise<BulkReadResponse> => {
    const response = await fetch(`${API_BASE}/notifications/bulk-read`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify({ notification_ids: ids || [] }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to mark notifications as read: ${response.statusText}`
      );
    }

    return response.json();
  },

  // Bulk delete
  bulkDelete: async (ids: number[]): Promise<BulkDeleteResponse> => {
    const response = await fetch(`${API_BASE}/notifications/bulk-delete`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify({ notification_ids: ids }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to delete notifications: ${response.statusText}`
      );
    }

    return response.json();
  },
};

// Query keys
const NOTIFICATIONS_QUERY_KEY = ["notifications"];
const NOTIFICATION_STATS_KEY = ["notification-stats"];

/**
 * Hook to fetch paginated notifications
 */
export function useNotifications(params: NotificationListParams = {}) {
  return useQuery({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, params],
    queryFn: () => notificationsApi.getNotifications(params),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
}

/**
 * Hook to fetch a single notification
 */
export function useNotification(id: number | null) {
  return useQuery({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, id],
    queryFn: () => notificationsApi.getNotification(id!),
    enabled: id !== null,
  });
}

/**
 * Hook to fetch notification statistics
 */
export function useNotificationStats() {
  return useQuery({
    queryKey: NOTIFICATION_STATS_KEY,
    queryFn: notificationsApi.getStats,
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

/**
 * Hook to get unread notification count
 */
export function useUnreadNotificationCount() {
  const { data } = useNotificationStats();
  return {
    data: data ? { count: data.unread_count } : undefined,
    isLoading: !data,
  };
}

/**
 * Hook to mark notification as read
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationsApi.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_STATS_KEY });
    },
    onError: (error) => {
      console.error("Failed to mark as read:", error);
      toast.error("Failed to mark notification as read");
    },
  });
}

/**
 * Hook to mark notification as unread
 */
export function useMarkAsUnread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationsApi.markAsUnread,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_STATS_KEY });
    },
    onError: (error) => {
      console.error("Failed to mark as unread:", error);
      toast.error("Failed to mark notification as unread");
    },
  });
}

/**
 * Hook to delete notification
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_STATS_KEY });
      toast.success("Notification deleted");
    },
    onError: (error) => {
      console.error("Failed to delete:", error);
      toast.error("Failed to delete notification");
    },
  });
}

/**
 * Hook to mark all notifications as read
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsApi.bulkMarkAsRead(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_STATS_KEY });
      toast.success(`${result.updated_count} notification(s) marked as read`);
    },
    onError: (error) => {
      console.error("Failed to mark all as read:", error);
      toast.error("Failed to mark all notifications as read");
    },
  });
}

/**
 * Hook to bulk delete notifications
 */
export function useBulkDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationsApi.bulkDelete,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_STATS_KEY });
      toast.success(`${result.deleted_count} notification(s) deleted`);
    },
    onError: (error) => {
      console.error("Failed to bulk delete:", error);
      toast.error("Failed to delete notifications");
    },
  });
}

// Export API for direct use if needed
export { notificationsApi };
