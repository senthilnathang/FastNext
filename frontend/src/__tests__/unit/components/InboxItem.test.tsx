/**
 * Tests for InboxItem component
 */

import { describe, it, expect, vi } from 'vitest';
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
  it('renders inbox item with title', () => {
    render(
      <InboxItem
        item={mockItem}
        onClick={vi.fn()}
        onToggleStar={vi.fn()}
        onTogglePin={vi.fn()}
      />
    );

    expect(screen.getByText('Test Notification')).toBeInTheDocument();
  });

  it('renders summary when provided', () => {
    render(
      <InboxItem
        item={mockItem}
        onClick={vi.fn()}
        onToggleStar={vi.fn()}
        onTogglePin={vi.fn()}
      />
    );

    expect(screen.getByText('This is a test notification summary')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    render(
      <InboxItem
        item={mockItem}
        onClick={handleClick}
        onToggleStar={vi.fn()}
        onTogglePin={vi.fn()}
      />
    );

    // Click the main container
    const container = screen.getByText('Test Notification').closest('div[class*="cursor-pointer"]');
    if (container) {
      fireEvent.click(container);
    }

    expect(handleClick).toHaveBeenCalledWith(mockItem);
  });

  it('shows starred indicator when starred', () => {
    const starredItem = { ...mockItem, is_starred: true };
    render(
      <InboxItem
        item={starredItem}
        onClick={vi.fn()}
        onToggleStar={vi.fn()}
        onTogglePin={vi.fn()}
      />
    );

    // Star button should have title "Unstar" when starred
    const starButton = screen.getByTitle('Unstar');
    expect(starButton).toBeInTheDocument();
  });

  it('shows unread styling when unread', () => {
    render(
      <InboxItem
        item={mockItem}
        onClick={vi.fn()}
        onToggleStar={vi.fn()}
        onTogglePin={vi.fn()}
      />
    );

    // Title should have bold styling for unread items
    const title = screen.getByText('Test Notification');
    expect(title).toHaveClass('font-semibold');
  });

  it('shows priority styling for high priority items', () => {
    const highPriorityItem = { ...mockItem, priority: 'high' as const };
    render(
      <InboxItem
        item={highPriorityItem}
        onClick={vi.fn()}
        onToggleStar={vi.fn()}
        onTogglePin={vi.fn()}
      />
    );

    // High priority items have an orange left border
    const container = screen.getByText('Test Notification').closest('div[class*="cursor-pointer"]');
    expect(container).toHaveClass('border-l-orange-500');
  });
});
