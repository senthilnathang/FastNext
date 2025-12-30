/**
 * Tests for useNotifications hook
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Create mock functions
const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPatch = jest.fn();
const mockDelete = jest.fn();

// Mock dependencies
jest.mock('@/lib/api/client', () => ({
  apiClient: {
    get: mockGet,
    post: mockPost,
    patch: mockPatch,
    delete: mockDelete,
  },
}));

jest.mock('@/shared/hooks/useWebSocket', () => ({
  useWebSocketEvent: jest.fn(),
}));

import { useNotifications, useUnreadNotificationCount, type Notification } from '@/shared/hooks/useNotifications';

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'info',
    title: 'Welcome',
    message: 'Welcome to the platform',
    priority: 'normal',
    isRead: false,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    type: 'success',
    title: 'Task Completed',
    message: 'Your task has been completed',
    priority: 'low',
    isRead: true,
    createdAt: '2024-01-01T01:00:00Z',
  },
  {
    id: '3',
    type: 'warning',
    title: 'Warning',
    message: 'Storage running low',
    priority: 'high',
    isRead: false,
    createdAt: '2024-01-01T02:00:00Z',
  },
];

const mockNotificationsResponse = {
  items: mockNotifications,
  total: 3,
  page: 1,
  pageSize: 20,
  unreadCount: 2,
};

// Create wrapper with QueryClientProvider
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    );
  };
}

describe('useNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue(mockNotificationsResponse);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('fetches notifications on mount', async () => {
    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.notifications).toHaveLength(3);
    expect(mockGet).toHaveBeenCalledWith('/api/v1/notifications', expect.any(Object));
  });

  test('returns notifications list', async () => {
    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.notifications).toEqual(mockNotifications);
    expect(result.current.total).toBe(3);
  });

  test('returns unread count', async () => {
    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.unreadCount).toBe(2);
  });

  test('applies filters when provided', async () => {
    const filters = { type: 'info' as const, isRead: false };

    renderHook(() => useNotifications({ filters }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/api/v1/notifications',
        expect.objectContaining({
          type: 'info',
          is_read: false,
        })
      );
    });
  });

  test('marks notification as read', async () => {
    mockPatch.mockResolvedValue({
      ...mockNotifications[0],
      isRead: true,
    });

    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.markAsRead('1');
    });

    expect(mockPatch).toHaveBeenCalledWith('/api/v1/notifications/1/read');
  });

  test('marks all notifications as read', async () => {
    mockPost.mockResolvedValue({ count: 2 });

    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.markAllAsRead();
    });

    expect(mockPost).toHaveBeenCalledWith('/api/v1/notifications/mark-all-read');
  });

  test('deletes notification', async () => {
    mockDelete.mockResolvedValue(undefined);

    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.deleteNotification('1');
    });

    expect(mockDelete).toHaveBeenCalledWith('/api/v1/notifications/1');
  });

  test('deletes all notifications', async () => {
    mockDelete.mockResolvedValue({ count: 3 });

    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.deleteAllNotifications();
    });

    expect(mockDelete).toHaveBeenCalledWith('/api/v1/notifications');
  });

  test('handles error state', async () => {
    const error = new Error('Failed to fetch');
    mockGet.mockRejectedValue(error);

    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });

  test('refetches notifications when refetch is called', async () => {
    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const initialCallCount = mockGet.mock.calls.length;

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(mockGet.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });

  test('tracks isMarkingAsRead state', async () => {
    let resolvePromise: (value: unknown) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockPatch.mockReturnValue(promise);

    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.markAsRead('1');
    });

    expect(result.current.isMarkingAsRead).toBe(true);

    await act(async () => {
      resolvePromise!({ ...mockNotifications[0], isRead: true });
    });

    await waitFor(() => {
      expect(result.current.isMarkingAsRead).toBe(false);
    });
  });

  test('tracks isMarkingAllAsRead state', async () => {
    let resolvePromise: (value: unknown) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockPost.mockReturnValue(promise);

    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.markAllAsRead();
    });

    expect(result.current.isMarkingAllAsRead).toBe(true);

    await act(async () => {
      resolvePromise!({ count: 2 });
    });

    await waitFor(() => {
      expect(result.current.isMarkingAllAsRead).toBe(false);
    });
  });

  test('applies pagination filters', async () => {
    const filters = { page: 2, pageSize: 10 };

    renderHook(() => useNotifications({ filters }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/api/v1/notifications',
        expect.objectContaining({
          page: 2,
          page_size: 10,
        })
      );
    });
  });

  test('applies priority filter', async () => {
    const filters = { priority: 'high' as const };

    renderHook(() => useNotifications({ filters }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/api/v1/notifications',
        expect.objectContaining({
          priority: 'high',
        })
      );
    });
  });
});

describe('useUnreadNotificationCount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue({ count: 5 });
  });

  test('fetches unread count', async () => {
    const { result } = renderHook(() => useUnreadNotificationCount(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.count).toBe(5);
    expect(mockGet).toHaveBeenCalledWith('/api/v1/notifications/unread-count');
  });

  test('returns 0 when no data', async () => {
    mockGet.mockResolvedValue(null);

    const { result } = renderHook(() => useUnreadNotificationCount(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.count).toBe(0);
  });

  test('tracks loading state', async () => {
    const { result } = renderHook(() => useUnreadNotificationCount(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });
});
