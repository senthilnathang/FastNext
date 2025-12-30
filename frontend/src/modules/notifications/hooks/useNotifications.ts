import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  BulkActionResult,
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

// API functions for notifications
const notificationsApi = {
  // Get paginated list of notifications
  getNotifications: async (
    params: NotificationListParams = {}
  ): Promise<PaginatedNotifications> => {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.append(key, value.toString());
      }
    });

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

  // Get unread count
  getUnreadCount: async (): Promise<{ count: number }> => {
    const response = await fetch(`${API_BASE}/notifications/unread-count`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch unread count: ${response.statusText}`);
    }

    return response.json();
  },

  // Mark notification as read
  markAsRead: async (id: number): Promise<Notification> => {
    const response = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
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
    const response = await fetch(`${API_BASE}/notifications/${id}/unread`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to mark notification as unread: ${response.statusText}`
      );
    }

    return response.json();
  },

  // Archive notification
  archive: async (id: number): Promise<Notification> => {
    const response = await fetch(`${API_BASE}/notifications/${id}/archive`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to archive notification: ${response.statusText}`
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

  // Bulk mark as read
  bulkMarkAsRead: async (ids: number[]): Promise<BulkActionResult> => {
    const response = await fetch(`${API_BASE}/notifications/bulk/read`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify({ ids }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to mark notifications as read: ${response.statusText}`
      );
    }

    return response.json();
  },

  // Bulk mark as unread
  bulkMarkAsUnread: async (ids: number[]): Promise<BulkActionResult> => {
    const response = await fetch(`${API_BASE}/notifications/bulk/unread`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify({ ids }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to mark notifications as unread: ${response.statusText}`
      );
    }

    return response.json();
  },

  // Bulk archive
  bulkArchive: async (ids: number[]): Promise<BulkActionResult> => {
    const response = await fetch(`${API_BASE}/notifications/bulk/archive`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify({ ids }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to archive notifications: ${response.statusText}`
      );
    }

    return response.json();
  },

  // Bulk delete
  bulkDelete: async (ids: number[]): Promise<BulkActionResult> => {
    const response = await fetch(`${API_BASE}/notifications/bulk/delete`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify({ ids }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to delete notifications: ${response.statusText}`
      );
    }

    return response.json();
  },

  // Mark all as read
  markAllAsRead: async (): Promise<BulkActionResult> => {
    const response = await fetch(`${API_BASE}/notifications/mark-all-read`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to mark all notifications as read: ${response.statusText}`
      );
    }

    return response.json();
  },

  // Clear all notifications
  clearAll: async (): Promise<BulkActionResult> => {
    const response = await fetch(`${API_BASE}/notifications/clear-all`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to clear all notifications: ${response.statusText}`
      );
    }

    return response.json();
  },
};

// Query keys
const NOTIFICATIONS_QUERY_KEY = ["notifications"];
const NOTIFICATION_STATS_KEY = ["notification-stats"];
const UNREAD_COUNT_KEY = ["notification-unread-count"];

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
 * Hook to fetch unread notification count
 */
export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: UNREAD_COUNT_KEY,
    queryFn: notificationsApi.getUnreadCount,
    staleTime: 30000,
    refetchInterval: 30000, // More frequent updates for unread count
  });
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
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
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
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
    },
    onError: (error) => {
      console.error("Failed to mark as unread:", error);
      toast.error("Failed to mark notification as unread");
    },
  });
}

/**
 * Hook to archive notification
 */
export function useArchiveNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationsApi.archive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_STATS_KEY });
      toast.success("Notification archived");
    },
    onError: (error) => {
      console.error("Failed to archive:", error);
      toast.error("Failed to archive notification");
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
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
      toast.success("Notification deleted");
    },
    onError: (error) => {
      console.error("Failed to delete:", error);
      toast.error("Failed to delete notification");
    },
  });
}

/**
 * Hook to bulk mark notifications as read
 */
export function useBulkMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationsApi.bulkMarkAsRead,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_STATS_KEY });
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
      toast.success(`${result.success} notification(s) marked as read`);
    },
    onError: (error) => {
      console.error("Failed to bulk mark as read:", error);
      toast.error("Failed to mark notifications as read");
    },
  });
}

/**
 * Hook to bulk archive notifications
 */
export function useBulkArchive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationsApi.bulkArchive,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_STATS_KEY });
      toast.success(`${result.success} notification(s) archived`);
    },
    onError: (error) => {
      console.error("Failed to bulk archive:", error);
      toast.error("Failed to archive notifications");
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
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
      toast.success(`${result.success} notification(s) deleted`);
    },
    onError: (error) => {
      console.error("Failed to bulk delete:", error);
      toast.error("Failed to delete notifications");
    },
  });
}

/**
 * Hook to mark all notifications as read
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationsApi.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_STATS_KEY });
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
      toast.success("All notifications marked as read");
    },
    onError: (error) => {
      console.error("Failed to mark all as read:", error);
      toast.error("Failed to mark all notifications as read");
    },
  });
}

/**
 * Hook to clear all notifications
 */
export function useClearAllNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationsApi.clearAll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_STATS_KEY });
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
      toast.success("All notifications cleared");
    },
    onError: (error) => {
      console.error("Failed to clear all:", error);
      toast.error("Failed to clear all notifications");
    },
  });
}

// Export API for direct use if needed
export { notificationsApi };
