/**
 * Tests for InboxItem component
 */

import { jest } from '@jest/globals';
import { render, screen, fireEvent } from '../../utils/test-utils';
import InboxItem from '@/components/inbox/InboxItem';

const mockItem = {
  id: 1,
  user_id: 1,
  item_type: 'notification' as const,
  title: 'Test Notification',
  summary: 'This is a test notification summary',
  status: 'unread' as const,
  priority: 'normal' as const,
  is_starred: false,
  is_pinned: false,
  is_actionable: false,
  action_completed: false,
  created_at: '2024-01-01T00:00:00Z',
  labels: [],
};

describe('InboxItem', () => {
  test('renders inbox item with title', () => {
    render(
      <InboxItem
        item={mockItem}
        onClick={jest.fn()}
        onToggleStar={jest.fn()}
        onTogglePin={jest.fn()}
      />
    );

    expect(screen.getByText('Test Notification')).toBeInTheDocument();
  });

  test('renders summary when provided', () => {
    render(
      <InboxItem
        item={mockItem}
        onClick={jest.fn()}
        onToggleStar={jest.fn()}
        onTogglePin={jest.fn()}
      />
    );

    expect(screen.getByText('This is a test notification summary')).toBeInTheDocument();
  });

  test('calls onClick when clicked', async () => {
    const handleClick = jest.fn();
    render(
      <InboxItem
        item={mockItem}
        onClick={handleClick}
        onToggleStar={jest.fn()}
        onTogglePin={jest.fn()}
      />
    );

    // Click the main container
    const container = screen.getByText('Test Notification').closest('div[class*="cursor-pointer"]');
    if (container) {
      fireEvent.click(container);
    }

    expect(handleClick).toHaveBeenCalledWith(mockItem);
  });

  test('shows starred indicator when starred', () => {
    const starredItem = { ...mockItem, is_starred: true };
    render(
      <InboxItem
        item={starredItem}
        onClick={jest.fn()}
        onToggleStar={jest.fn()}
        onTogglePin={jest.fn()}
      />
    );

    // Star button should have title "Unstar" when starred
    const starButton = screen.getByTitle('Unstar');
    expect(starButton).toBeInTheDocument();
  });

  test('shows unread styling when unread', () => {
    render(
      <InboxItem
        item={mockItem}
        onClick={jest.fn()}
        onToggleStar={jest.fn()}
        onTogglePin={jest.fn()}
      />
    );

    // Title should have bold styling for unread items
    const title = screen.getByText('Test Notification');
    expect(title).toHaveClass('font-semibold');
  });

  test('shows priority styling for high priority items', () => {
    const highPriorityItem = { ...mockItem, priority: 'high' as const };
    render(
      <InboxItem
        item={highPriorityItem}
        onClick={jest.fn()}
        onToggleStar={jest.fn()}
        onTogglePin={jest.fn()}
      />
    );

    // High priority items have an orange left border
    const container = screen.getByText('Test Notification').closest('div[class*="cursor-pointer"]');
    expect(container).toHaveClass('border-l-orange-500');
  });
});
