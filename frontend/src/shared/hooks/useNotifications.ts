'use client';

/**
 * Notifications Hook
 *
 * Provides notification management with TanStack Query integration,
 * real-time updates support, and mutation helpers.
 */

import { useCallback, useEffect, useMemo } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useWebSocketEvent } from './useWebSocket';

// Notification types
export type NotificationType =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'message'
  | 'mention'
  | 'assignment'
  | 'reminder'
  | 'system';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

// Notification interface
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
  expiresAt?: string;
  data?: Record<string, unknown>;
  actionUrl?: string;
  actionLabel?: string;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
}

// API response types
export interface NotificationsResponse {
  items: Notification[];
  total: number;
  page: number;
  pageSize: number;
  unreadCount: number;
}

export interface NotificationFilters {
  type?: NotificationType;
  isRead?: boolean;
  priority?: NotificationPriority;
  page?: number;
  pageSize?: number;
}

// Query keys
export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (filters: NotificationFilters) =>
    [...notificationKeys.lists(), filters] as const,
  unreadCount: () => [...notificationKeys.all, 'unreadCount'] as const,
  detail: (id: string) => [...notificationKeys.all, 'detail', id] as const,
};

// API functions
async function fetchNotifications(
  filters: NotificationFilters = {},
): Promise<NotificationsResponse> {
  const params: Record<string, string | number | boolean | undefined> = {
    page: filters.page ?? 1,
    page_size: filters.pageSize ?? 20,
    type: filters.type,
    is_read: filters.isRead,
    priority: filters.priority,
  };

  return apiClient.get<NotificationsResponse>('/api/v1/notifications', params);
}

async function fetchUnreadCount(): Promise<{ count: number }> {
  return apiClient.get<{ count: number }>('/api/v1/notifications/unread-count');
}

async function markAsRead(id: string): Promise<Notification> {
  return apiClient.patch<Notification>(`/api/v1/notifications/${id}/read`);
}

async function markAllAsRead(): Promise<{ count: number }> {
  return apiClient.post<{ count: number }>('/api/v1/notifications/mark-all-read');
}

async function deleteNotification(id: string): Promise<void> {
  return apiClient.delete(`/api/v1/notifications/${id}`);
}

async function deleteAllNotifications(): Promise<{ count: number }> {
  return apiClient.delete('/api/v1/notifications');
}

// Hook options
export interface UseNotificationsOptions {
  /** Filters for notifications query */
  filters?: NotificationFilters;
  /** Enable real-time updates via WebSocket */
  realtime?: boolean;
  /** Custom query options */
  queryOptions?: Partial<UseQueryOptions<NotificationsResponse>>;
  /** Callback when new notification arrives */
  onNewNotification?: (notification: Notification) => void;
}

// Hook return type
export interface UseNotificationsReturn {
  /** List of notifications */
  notifications: Notification[];
  /** Total count of notifications */
  total: number;
  /** Number of unread notifications */
  unreadCount: number;
  /** Whether notifications are loading */
  isLoading: boolean;
  /** Whether notifications are being fetched */
  isFetching: boolean;
  /** Error if any */
  error: Error | null;
  /** Mark a notification as read */
  markAsRead: (id: string) => Promise<void>;
  /** Mark all notifications as read */
  markAllAsRead: () => Promise<void>;
  /** Delete a notification */
  deleteNotification: (id: string) => Promise<void>;
  /** Delete all notifications */
  deleteAllNotifications: () => Promise<void>;
  /** Refetch notifications */
  refetch: () => void;
  /** Check if marking as read is in progress */
  isMarkingAsRead: boolean;
  /** Check if marking all as read is in progress */
  isMarkingAllAsRead: boolean;
}

/**
 * useNotifications hook
 *
 * Provides notification management with TanStack Query integration.
 *
 * @example
 * ```tsx
 * function NotificationList() {
 *   const {
 *     notifications,
 *     unreadCount,
 *     markAsRead,
 *     markAllAsRead,
 *   } = useNotifications({ realtime: true });
 *
 *   return (
 *     <div>
 *       <span>Unread: {unreadCount}</span>
 *       <button onClick={markAllAsRead}>Mark All Read</button>
 *       {notifications.map((n) => (
 *         <NotificationItem
 *           key={n.id}
 *           notification={n}
 *           onRead={() => markAsRead(n.id)}
 *         />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useNotifications(
  options: UseNotificationsOptions = {},
): UseNotificationsReturn {
  const {
    filters = {},
    realtime = true,
    queryOptions,
    onNewNotification,
  } = options;

  const queryClient = useQueryClient();

  // Fetch notifications
  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: notificationKeys.list(filters),
    queryFn: () => fetchNotifications(filters),
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
    ...queryOptions,
  });

  // Fetch unread count separately for quick updates
  const { data: unreadData } = useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: fetchUnreadCount,
    staleTime: 10 * 1000, // 10 seconds
    refetchOnWindowFocus: true,
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: markAsRead,
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: notificationKeys.lists() });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<NotificationsResponse>(
        notificationKeys.list(filters),
      );

      // Optimistic update
      queryClient.setQueryData<NotificationsResponse>(
        notificationKeys.list(filters),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((n) =>
              n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n,
            ),
            unreadCount: Math.max(0, old.unreadCount - 1),
          };
        },
      );

      // Update unread count
      queryClient.setQueryData<{ count: number }>(
        notificationKeys.unreadCount(),
        (old) => ({
          count: Math.max(0, (old?.count ?? 0) - 1),
        }),
      );

      return { previousData };
    },
    onError: (_err, _id, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(
          notificationKeys.list(filters),
          context.previousData,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: markAllAsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.lists() });

      const previousData = queryClient.getQueryData<NotificationsResponse>(
        notificationKeys.list(filters),
      );

      // Optimistic update - mark all as read
      queryClient.setQueryData<NotificationsResponse>(
        notificationKeys.list(filters),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((n) => ({
              ...n,
              isRead: true,
              readAt: n.readAt || new Date().toISOString(),
            })),
            unreadCount: 0,
          };
        },
      );

      queryClient.setQueryData<{ count: number }>(
        notificationKeys.unreadCount(),
        { count: 0 },
      );

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          notificationKeys.list(filters),
          context.previousData,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });

  // Delete all notifications mutation
  const deleteAllNotificationsMutation = useMutation({
    mutationFn: deleteAllNotifications,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });

  // Real-time updates via WebSocket
  useWebSocketEvent<Notification>(
    'notification:new',
    useCallback(
      (notification) => {
        // Add new notification to the list
        queryClient.setQueryData<NotificationsResponse>(
          notificationKeys.list(filters),
          (old) => {
            if (!old) return old;
            return {
              ...old,
              items: [notification, ...old.items],
              total: old.total + 1,
              unreadCount: old.unreadCount + 1,
            };
          },
        );

        // Update unread count
        queryClient.setQueryData<{ count: number }>(
          notificationKeys.unreadCount(),
          (old) => ({
            count: (old?.count ?? 0) + 1,
          }),
        );

        // Call callback
        onNewNotification?.(notification);
      },
      [queryClient, filters, onNewNotification],
    ),
    [realtime],
  );

  // Handle notification update events
  useWebSocketEvent<Notification>(
    'notification:updated',
    useCallback(
      (notification) => {
        queryClient.setQueryData<NotificationsResponse>(
          notificationKeys.list(filters),
          (old) => {
            if (!old) return old;
            return {
              ...old,
              items: old.items.map((n) =>
                n.id === notification.id ? notification : n,
              ),
            };
          },
        );
      },
      [queryClient, filters],
    ),
    [realtime],
  );

  // Memoized values
  const notifications = useMemo(() => data?.items ?? [], [data]);
  const total = useMemo(() => data?.total ?? 0, [data]);
  const unreadCount = useMemo(
    () => unreadData?.count ?? data?.unreadCount ?? 0,
    [unreadData, data],
  );

  // Return object
  return {
    notifications,
    total,
    unreadCount,
    isLoading,
    isFetching,
    error: error as Error | null,
    markAsRead: async (id: string) => {
      await markAsReadMutation.mutateAsync(id);
    },
    markAllAsRead: async () => {
      await markAllAsReadMutation.mutateAsync();
    },
    deleteNotification: async (id: string) => {
      await deleteNotificationMutation.mutateAsync(id);
    },
    deleteAllNotifications: async () => {
      await deleteAllNotificationsMutation.mutateAsync();
    },
    refetch: () => {
      refetch();
    },
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
  };
}

/**
 * useUnreadNotificationCount hook
 *
 * Lightweight hook to just get the unread count.
 */
export function useUnreadNotificationCount(): {
  count: number;
  isLoading: boolean;
} {
  const { data, isLoading } = useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: fetchUnreadCount,
    staleTime: 10 * 1000,
    refetchOnWindowFocus: true,
  });

  return {
    count: data?.count ?? 0,
    isLoading,
  };
}

export default useNotifications;
