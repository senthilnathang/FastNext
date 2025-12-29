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
        onItemClick={vi.fn()}
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
        onItemClick={vi.fn()}
        onToggleStar={vi.fn()}
        onTogglePin={vi.fn()}
      />
    );

    expect(screen.getByText('This is a test notification summary')).toBeInTheDocument();
  });

  it('calls onItemClick when clicked', async () => {
    const handleClick = vi.fn();
    const { user } = render(
      <InboxItem
        item={mockItem}
        onItemClick={handleClick}
        onToggleStar={vi.fn()}
        onTogglePin={vi.fn()}
      />
    );

    // Find and click the item
    const title = screen.getByText('Test Notification');
    await user.click(title.closest('[class*="cursor-pointer"]') || title);

    expect(handleClick).toHaveBeenCalledWith(mockItem);
  });

  it('shows starred indicator when starred', () => {
    const starredItem = { ...mockItem, is_starred: true };
    render(
      <InboxItem
        item={starredItem}
        onItemClick={vi.fn()}
        onToggleStar={vi.fn()}
        onTogglePin={vi.fn()}
      />
    );

    // Star button should have active styling
    const starButton = screen.getByTitle('Unstar');
    expect(starButton).toBeInTheDocument();
  });

  it('shows unread styling when unread', () => {
    render(
      <InboxItem
        item={mockItem}
        onItemClick={vi.fn()}
        onToggleStar={vi.fn()}
        onTogglePin={vi.fn()}
      />
    );

    // Title should have bold styling for unread items
    const title = screen.getByText('Test Notification');
    expect(title).toHaveClass('font-semibold');
  });

  it('shows priority badge for high priority items', () => {
    const highPriorityItem = { ...mockItem, priority: 'high' as const };
    render(
      <InboxItem
        item={highPriorityItem}
        onItemClick={vi.fn()}
        onToggleStar={vi.fn()}
        onTogglePin={vi.fn()}
      />
    );

    expect(screen.getByText('high')).toBeInTheDocument();
  });
});
