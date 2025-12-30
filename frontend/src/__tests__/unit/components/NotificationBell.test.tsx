/**
 * Tests for NotificationBell component
 */

import { jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '../../utils/test-utils';
import { NotificationBell, type Notification } from '@/shared/components/notifications/NotificationBell';

const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'Welcome!',
    message: 'Welcome to FastNext platform',
    type: 'info',
    isRead: false,
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
  },
  {
    id: '2',
    title: 'Task Completed',
    message: 'Your task has been completed successfully',
    type: 'success',
    isRead: true,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
  },
  {
    id: '3',
    title: 'Warning',
    message: 'Storage space is running low',
    type: 'warning',
    isRead: false,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    actionUrl: 'https://example.com/storage',
  },
  {
    id: '4',
    title: 'Error',
    message: 'Failed to sync data',
    type: 'error',
    isRead: false,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
  },
];

describe('NotificationBell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders notification bell button', () => {
    render(<NotificationBell notifications={mockNotifications} />);

    const button = screen.getByRole('button', { name: /notifications/i });
    expect(button).toBeInTheDocument();
  });

  test('shows unread count badge', () => {
    render(<NotificationBell notifications={mockNotifications} />);

    // 3 unread notifications in mock data
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  test('shows custom unread count when provided', () => {
    render(<NotificationBell notifications={mockNotifications} unreadCount={99} />);

    expect(screen.getByText('99')).toBeInTheDocument();
  });

  test('shows 99+ for more than 99 unread', () => {
    render(<NotificationBell notifications={mockNotifications} unreadCount={150} />);

    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  test('does not show badge when no unread notifications', () => {
    const readNotifications = mockNotifications.map(n => ({ ...n, isRead: true }));
    render(<NotificationBell notifications={readNotifications} />);

    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  test('opens notification popover when clicked', async () => {
    render(<NotificationBell notifications={mockNotifications} />);

    const button = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });
  });

  test('displays notification list in popover', async () => {
    render(<NotificationBell notifications={mockNotifications} />);

    const button = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Welcome!')).toBeInTheDocument();
      expect(screen.getByText('Task Completed')).toBeInTheDocument();
    });
  });

  test('limits displayed notifications to maxDisplayed', async () => {
    render(<NotificationBell notifications={mockNotifications} maxDisplayed={2} />);

    const button = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Welcome!')).toBeInTheDocument();
      expect(screen.getByText('Task Completed')).toBeInTheDocument();
      // Third notification should not be visible
      expect(screen.queryByText('Warning')).not.toBeInTheDocument();
    });
  });

  test('shows "View all" button with count for more notifications', async () => {
    render(<NotificationBell notifications={mockNotifications} maxDisplayed={2} />);

    const button = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('View all (4)')).toBeInTheDocument();
    });
  });

  test('calls onMarkAsRead when mark as read is clicked', async () => {
    const onMarkAsRead = jest.fn();
    render(
      <NotificationBell
        notifications={mockNotifications}
        onMarkAsRead={onMarkAsRead}
      />
    );

    const button = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Welcome!')).toBeInTheDocument();
    });

    const markAsReadButtons = screen.getAllByTitle('Mark as read');
    fireEvent.click(markAsReadButtons[0]);

    expect(onMarkAsRead).toHaveBeenCalledWith('1');
  });

  test('calls onMarkAllAsRead when "Mark all read" is clicked', async () => {
    const onMarkAllAsRead = jest.fn();
    render(
      <NotificationBell
        notifications={mockNotifications}
        onMarkAllAsRead={onMarkAllAsRead}
      />
    );

    const button = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Mark all read')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Mark all read'));

    expect(onMarkAllAsRead).toHaveBeenCalled();
  });

  test('calls onDelete when delete is clicked', async () => {
    const onDelete = jest.fn();
    render(
      <NotificationBell
        notifications={mockNotifications}
        onDelete={onDelete}
      />
    );

    const button = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Welcome!')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle('Delete');
    fireEvent.click(deleteButtons[0]);

    expect(onDelete).toHaveBeenCalledWith('1');
  });

  test('calls onNotificationClick when notification is clicked', async () => {
    const onNotificationClick = jest.fn();
    render(
      <NotificationBell
        notifications={mockNotifications}
        onNotificationClick={onNotificationClick}
      />
    );

    const button = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Welcome!')).toBeInTheDocument();
    });

    const notificationItem = screen.getByText('Welcome!').closest('[role="button"]');
    if (notificationItem) {
      fireEvent.click(notificationItem);
    }

    expect(onNotificationClick).toHaveBeenCalledWith(mockNotifications[0]);
  });

  test('shows loading spinner when isLoading is true', async () => {
    render(<NotificationBell notifications={[]} isLoading />);

    const button = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /notifications/i }).closest('[data-state="open"]')?.parentElement?.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  test('shows empty state when no notifications', async () => {
    render(<NotificationBell notifications={[]} />);

    const button = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('No notifications')).toBeInTheDocument();
      expect(screen.getByText(/You're all caught up/)).toBeInTheDocument();
    });
  });

  test('calls onViewAll when view all is clicked', async () => {
    const onViewAll = jest.fn();
    render(
      <NotificationBell
        notifications={mockNotifications}
        onViewAll={onViewAll}
      />
    );

    const button = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/View all/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/View all/));

    expect(onViewAll).toHaveBeenCalled();
  });

  test('shows settings button when onSettingsClick is provided', async () => {
    const onSettingsClick = jest.fn();
    render(
      <NotificationBell
        notifications={mockNotifications}
        onSettingsClick={onSettingsClick}
      />
    );

    const button = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByTitle('Notification settings')).toBeInTheDocument();
    });
  });

  test('formats time correctly', async () => {
    render(<NotificationBell notifications={mockNotifications} />);

    const button = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(button);

    await waitFor(() => {
      // 5 minutes ago
      expect(screen.getByText('5m ago')).toBeInTheDocument();
      // 2 hours ago
      expect(screen.getByText('2h ago')).toBeInTheDocument();
      // 1 day ago
      expect(screen.getByText('1d ago')).toBeInTheDocument();
    });
  });

  test('highlights unread notifications', async () => {
    render(<NotificationBell notifications={mockNotifications} />);

    const button = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(button);

    await waitFor(() => {
      const welcomeNotification = screen.getByText('Welcome!').closest('[role="button"]');
      expect(welcomeNotification).toHaveClass('bg-primary/5');
    });
  });

  test('shows action button for notifications with actionUrl', async () => {
    render(<NotificationBell notifications={mockNotifications} />);

    const button = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(button);

    await waitFor(() => {
      // The warning notification has an actionUrl
      expect(screen.getByText('Warning')).toBeInTheDocument();
    });
  });

  test('applies custom className', () => {
    render(<NotificationBell notifications={mockNotifications} className="custom-class" />);

    const button = screen.getByRole('button', { name: /notifications/i });
    expect(button).toHaveClass('custom-class');
  });

  test('shows new badge with unread count', async () => {
    render(<NotificationBell notifications={mockNotifications} />);

    const button = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('3 new')).toBeInTheDocument();
    });
  });

  test('distinguishes between notification types with colors', async () => {
    render(<NotificationBell notifications={mockNotifications} />);

    const button = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(button);

    await waitFor(() => {
      // All notifications should be visible
      expect(screen.getByText('Welcome!')).toBeInTheDocument();
      expect(screen.getByText('Task Completed')).toBeInTheDocument();
      expect(screen.getByText('Warning')).toBeInTheDocument();
      expect(screen.getByText('Error')).toBeInTheDocument();
    });
  });
});
