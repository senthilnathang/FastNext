import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  NotificationPreferences,
  UpdateNotificationPreferences,
} from "../types";

// API base URL
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// API functions for notification preferences
const preferencesApi = {
  // Get current user's notification preferences
  getPreferences: async (): Promise<NotificationPreferences> => {
    const token = localStorage.getItem("access_token");
    const response = await fetch(`${API_BASE}/notifications/preferences`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch notification preferences: ${response.statusText}`
      );
    }

    return response.json();
  },

  // Update notification preferences
  updatePreferences: async (
    data: UpdateNotificationPreferences
  ): Promise<NotificationPreferences> => {
    const token = localStorage.getItem("access_token");
    const response = await fetch(`${API_BASE}/notifications/preferences`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to update notification preferences: ${response.statusText}`
      );
    }

    return response.json();
  },

  // Mute all notifications temporarily
  muteNotifications: async (until: string): Promise<NotificationPreferences> => {
    const token = localStorage.getItem("access_token");
    const response = await fetch(`${API_BASE}/notifications/preferences/mute`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ muted_until: until }),
    });

    if (!response.ok) {
      throw new Error(`Failed to mute notifications: ${response.statusText}`);
    }

    return response.json();
  },

  // Unmute notifications
  unmuteNotifications: async (): Promise<NotificationPreferences> => {
    const token = localStorage.getItem("access_token");
    const response = await fetch(
      `${API_BASE}/notifications/preferences/unmute`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to unmute notifications: ${response.statusText}`);
    }

    return response.json();
  },

  // Test email notification
  testEmailNotification: async (): Promise<{ success: boolean; message: string }> => {
    const token = localStorage.getItem("access_token");
    const response = await fetch(
      `${API_BASE}/notifications/preferences/test-email`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to send test notification: ${response.statusText}`
      );
    }

    return response.json();
  },

  // Test push notification
  testPushNotification: async (): Promise<{ success: boolean; message: string }> => {
    const token = localStorage.getItem("access_token");
    const response = await fetch(
      `${API_BASE}/notifications/preferences/test-push`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to send test push notification: ${response.statusText}`
      );
    }

    return response.json();
  },
};

// Query key for caching
const PREFERENCES_QUERY_KEY = ["notification-preferences"];

/**
 * Hook to fetch notification preferences
 */
export function useNotificationPreferences() {
  return useQuery({
    queryKey: PREFERENCES_QUERY_KEY,
    queryFn: preferencesApi.getPreferences,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to update notification preferences
 */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: preferencesApi.updatePreferences,
    onSuccess: (data) => {
      queryClient.setQueryData(PREFERENCES_QUERY_KEY, data);
      toast.success("Notification preferences updated");
    },
    onError: (error) => {
      console.error("Failed to update preferences:", error);
      toast.error("Failed to update notification preferences");
    },
  });
}

/**
 * Hook to mute notifications
 */
export function useMuteNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: preferencesApi.muteNotifications,
    onSuccess: (data) => {
      queryClient.setQueryData(PREFERENCES_QUERY_KEY, data);
      toast.success("Notifications muted");
    },
    onError: (error) => {
      console.error("Failed to mute notifications:", error);
      toast.error("Failed to mute notifications");
    },
  });
}

/**
 * Hook to unmute notifications
 */
export function useUnmuteNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: preferencesApi.unmuteNotifications,
    onSuccess: (data) => {
      queryClient.setQueryData(PREFERENCES_QUERY_KEY, data);
      toast.success("Notifications unmuted");
    },
    onError: (error) => {
      console.error("Failed to unmute notifications:", error);
      toast.error("Failed to unmute notifications");
    },
  });
}

/**
 * Hook to send test email notification
 */
export function useTestEmailNotification() {
  return useMutation({
    mutationFn: preferencesApi.testEmailNotification,
    onSuccess: (data) => {
      toast.success(data.message || "Test email sent successfully");
    },
    onError: (error) => {
      console.error("Failed to send test email:", error);
      toast.error("Failed to send test email notification");
    },
  });
}

/**
 * Hook to send test push notification
 */
export function useTestPushNotification() {
  return useMutation({
    mutationFn: preferencesApi.testPushNotification,
    onSuccess: (data) => {
      toast.success(data.message || "Test push notification sent successfully");
    },
    onError: (error) => {
      console.error("Failed to send test push:", error);
      toast.error("Failed to send test push notification");
    },
  });
}

// Export API for direct use if needed
export { preferencesApi };
