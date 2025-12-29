/**
 * Tests for InboxFilters component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../utils/test-utils';
import InboxFilters from '@/components/inbox/InboxFilters';

const defaultProps = {
  selectedType: 'all' as const,
  selectedStatus: 'all' as const,
  selectedPriority: 'all' as const,
  selectedLabel: undefined,
  searchQuery: '',
  labels: [
    { id: 1, name: 'Important', color: '#EF4444' },
    { id: 2, name: 'Work', color: '#3B82F6' },
  ],
  stats: {
    total: 10,
    unread: 5,
    byType: { notification: 3, message: 2 },
    starred: 2,
    actionable: 1,
  },
  onTypeChange: vi.fn(),
  onStatusChange: vi.fn(),
  onPriorityChange: vi.fn(),
  onLabelChange: vi.fn(),
  onSearchChange: vi.fn(),
  onClearFilters: vi.fn(),
};

describe('InboxFilters', () => {
  it('renders filter sections', () => {
    render(<InboxFilters {...defaultProps} />);

    // Check for filter section titles
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Priority')).toBeInTheDocument();
  });

  it('shows search input when enabled', () => {
    render(<InboxFilters {...defaultProps} showSearch={true} />);

    expect(screen.getByPlaceholderText('Search inbox...')).toBeInTheDocument();
  });

  it('calls onSearchChange when typing in search', async () => {
    const handleSearchChange = vi.fn();
    const { user } = render(
      <InboxFilters
        {...defaultProps}
        showSearch={true}
        onSearchChange={handleSearchChange}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search inbox...');
    await user.type(searchInput, 'test');

    expect(handleSearchChange).toHaveBeenCalled();
  });

  it('shows unread count in stats', () => {
    render(<InboxFilters {...defaultProps} />);

    // Should show unread filter option with count
    expect(screen.getByText(/Unread/)).toBeInTheDocument();
  });

  it('shows labels section with available labels', () => {
    render(<InboxFilters {...defaultProps} />);

    expect(screen.getByText('Important')).toBeInTheDocument();
    expect(screen.getByText('Work')).toBeInTheDocument();
  });

  it('calls onClearFilters when clear button clicked', async () => {
    const handleClear = vi.fn();
    const { user } = render(
      <InboxFilters
        {...defaultProps}
        selectedType="notification"
        onClearFilters={handleClear}
      />
    );

    const clearButton = screen.getByText('Clear filters');
    await user.click(clearButton);

    expect(handleClear).toHaveBeenCalled();
  });
});
