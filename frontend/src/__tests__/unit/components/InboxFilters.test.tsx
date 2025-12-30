/**
 * Tests for InboxFilters component
 */

import { jest } from '@jest/globals';
import { render, screen, fireEvent } from '../../utils/test-utils';
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
  onTypeChange: jest.fn(),
  onStatusChange: jest.fn(),
  onPriorityChange: jest.fn(),
  onLabelChange: jest.fn(),
  onSearchChange: jest.fn(),
  onClearFilters: jest.fn(),
};

describe('InboxFilters', () => {
  test('renders filter dropdowns in horizontal layout', () => {
    render(<InboxFilters {...defaultProps} />);

    // Check for dropdown options (multiple "All" options exist)
    expect(screen.getAllByText('All').length).toBeGreaterThan(0);
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  test('shows search input when enabled', () => {
    render(<InboxFilters {...defaultProps} showSearch={true} />);

    expect(screen.getByPlaceholderText('Search inbox...')).toBeInTheDocument();
  });

  test('calls onSearchChange when typing in search', async () => {
    const handleSearchChange = jest.fn();
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

  test('shows unread count in stats with vertical layout', () => {
    render(<InboxFilters {...defaultProps} layout="vertical" />);

    // Should show unread filter option with count
    expect(screen.getByText(/Unread/)).toBeInTheDocument();
  });

  test('shows labels section in vertical layout', () => {
    render(<InboxFilters {...defaultProps} layout="vertical" />);

    expect(screen.getByText('Important')).toBeInTheDocument();
    expect(screen.getByText('Work')).toBeInTheDocument();
  });

  test('calls onClearFilters when clear button clicked', async () => {
    const handleClear = jest.fn();
    const { user } = render(
      <InboxFilters
        {...defaultProps}
        selectedType="notification"
        onClearFilters={handleClear}
      />
    );

    // Button text is "Clear all" not "Clear filters"
    const clearButton = screen.getByText('Clear all');
    await user.click(clearButton);

    expect(handleClear).toHaveBeenCalled();
  });
});
