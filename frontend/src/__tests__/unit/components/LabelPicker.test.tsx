/**
 * Tests for LabelPicker component
 */

import { jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '../../utils/test-utils';
import { LabelPicker, type Label, LABEL_COLORS } from '@/shared/components/inbox/LabelPicker';

const mockLabels: Label[] = [
  { id: '1', name: 'Bug', color: '#ef4444', description: 'Bug reports' },
  { id: '2', name: 'Feature', color: '#3b82f6', description: 'Feature requests' },
  { id: '3', name: 'Documentation', color: '#22c55e' },
  { id: '4', name: 'High Priority', color: '#f97316' },
];

describe('LabelPicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders label picker trigger button', () => {
    render(<LabelPicker labels={mockLabels} />);

    const button = screen.getByRole('button', { name: /labels/i });
    expect(button).toBeInTheDocument();
  });

  test('renders custom trigger when provided', () => {
    render(
      <LabelPicker
        labels={mockLabels}
        trigger={<button data-testid="custom-trigger">Select Label</button>}
      />
    );

    expect(screen.getByTestId('custom-trigger')).toBeInTheDocument();
  });

  test('opens label picker popover when clicked', async () => {
    render(<LabelPicker labels={mockLabels} />);

    const button = screen.getByRole('button', { name: /labels/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search labels...')).toBeInTheDocument();
    });
  });

  test('displays all labels in the dropdown', async () => {
    render(<LabelPicker labels={mockLabels} />);

    const button = screen.getByRole('button', { name: /labels/i });
    fireEvent.click(button);

    await waitFor(() => {
      mockLabels.forEach((label) => {
        expect(screen.getByText(label.name)).toBeInTheDocument();
      });
    });
  });

  test('shows selected count badge', async () => {
    render(<LabelPicker labels={mockLabels} selectedIds={['1', '2']} />);

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  test('toggles label selection in multi-select mode', async () => {
    const onSelectionChange = jest.fn();
    render(
      <LabelPicker
        labels={mockLabels}
        selectedIds={[]}
        multiSelect
        onSelectionChange={onSelectionChange}
      />
    );

    const button = screen.getByRole('button', { name: /labels/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Bug')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Bug'));

    expect(onSelectionChange).toHaveBeenCalledWith(['1']);
  });

  test('deselects label when clicked again in multi-select mode', async () => {
    const onSelectionChange = jest.fn();
    render(
      <LabelPicker
        labels={mockLabels}
        selectedIds={['1']}
        multiSelect
        onSelectionChange={onSelectionChange}
      />
    );

    const button = screen.getByRole('button', { name: /labels/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Bug')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Bug'));

    expect(onSelectionChange).toHaveBeenCalledWith([]);
  });

  test('closes popover after selection in single-select mode', async () => {
    const onSelectionChange = jest.fn();
    render(
      <LabelPicker
        labels={mockLabels}
        selectedIds={[]}
        multiSelect={false}
        onSelectionChange={onSelectionChange}
      />
    );

    const button = screen.getByRole('button', { name: /labels/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Bug')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Bug'));

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Search labels...')).not.toBeInTheDocument();
    });
  });

  test('filters labels by search query', async () => {
    render(<LabelPicker labels={mockLabels} />);

    const button = screen.getByRole('button', { name: /labels/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search labels...')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search labels...');
    fireEvent.change(searchInput, { target: { value: 'bug' } });

    await waitFor(() => {
      expect(screen.getByText('Bug')).toBeInTheDocument();
      expect(screen.queryByText('Feature')).not.toBeInTheDocument();
    });
  });

  test('filters labels by description', async () => {
    render(<LabelPicker labels={mockLabels} />);

    const button = screen.getByRole('button', { name: /labels/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search labels...')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search labels...');
    fireEvent.change(searchInput, { target: { value: 'requests' } });

    await waitFor(() => {
      expect(screen.getByText('Feature')).toBeInTheDocument();
    });
  });

  test('shows "No labels found" for no search results', async () => {
    render(<LabelPicker labels={mockLabels} />);

    const button = screen.getByRole('button', { name: /labels/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search labels...')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search labels...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.getByText('No labels found')).toBeInTheDocument();
    });
  });

  test('shows create new label button when allowCreate is true', async () => {
    render(
      <LabelPicker
        labels={mockLabels}
        allowCreate
        onCreateLabel={jest.fn()}
      />
    );

    const button = screen.getByRole('button', { name: /labels/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Create new label')).toBeInTheDocument();
    });
  });

  test('opens create form when create button is clicked', async () => {
    render(
      <LabelPicker
        labels={mockLabels}
        allowCreate
        onCreateLabel={jest.fn()}
      />
    );

    const button = screen.getByRole('button', { name: /labels/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Create new label')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create new label'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Label name')).toBeInTheDocument();
      expect(screen.getByText('Choose a color')).toBeInTheDocument();
    });
  });

  test('displays color picker options', async () => {
    render(
      <LabelPicker
        labels={mockLabels}
        allowCreate
        onCreateLabel={jest.fn()}
      />
    );

    const button = screen.getByRole('button', { name: /labels/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Create new label')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create new label'));

    await waitFor(() => {
      // Should have color buttons
      LABEL_COLORS.forEach((color) => {
        expect(screen.getByTitle(color.name)).toBeInTheDocument();
      });
    });
  });

  test('calls onCreateLabel with new label data', async () => {
    const onCreateLabel = jest.fn();
    render(
      <LabelPicker
        labels={mockLabels}
        allowCreate
        onCreateLabel={onCreateLabel}
      />
    );

    const button = screen.getByRole('button', { name: /labels/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Create new label')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create new label'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Label name')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Label name'), {
      target: { value: 'New Label' },
    });

    fireEvent.click(screen.getByText('Create'));

    expect(onCreateLabel).toHaveBeenCalledWith({
      name: 'New Label',
      color: expect.any(String),
    });
  });

  test('disables create button when name is empty', async () => {
    render(
      <LabelPicker
        labels={mockLabels}
        allowCreate
        onCreateLabel={jest.fn()}
      />
    );

    const button = screen.getByRole('button', { name: /labels/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Create new label')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create new label'));

    await waitFor(() => {
      expect(screen.getByText('Create')).toBeDisabled();
    });
  });

  test('cancels create mode when Cancel is clicked', async () => {
    render(
      <LabelPicker
        labels={mockLabels}
        allowCreate
        onCreateLabel={jest.fn()}
      />
    );

    const button = screen.getByRole('button', { name: /labels/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Create new label')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create new label'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Label name')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(screen.getByText('Create new label')).toBeInTheDocument();
      expect(screen.queryByPlaceholderText('Label name')).not.toBeInTheDocument();
    });
  });

  test('shows check mark for selected labels', async () => {
    render(<LabelPicker labels={mockLabels} selectedIds={['1']} />);

    const button = screen.getByRole('button', { name: /labels/i });
    fireEvent.click(button);

    await waitFor(() => {
      const bugRow = screen.getByText('Bug').closest('button');
      expect(bugRow?.querySelector('svg')).toBeInTheDocument();
    });
  });

  test('displays label color indicator', async () => {
    render(<LabelPicker labels={mockLabels} />);

    const button = screen.getByRole('button', { name: /labels/i });
    fireEvent.click(button);

    await waitFor(() => {
      const bugRow = screen.getByText('Bug').closest('button');
      const colorIndicator = bugRow?.querySelector('span[style*="background-color"]');
      expect(colorIndicator).toBeInTheDocument();
    });
  });

  test('is disabled when disabled prop is true', () => {
    render(<LabelPicker labels={mockLabels} disabled />);

    const button = screen.getByRole('button', { name: /labels/i });
    expect(button).toBeDisabled();
  });

  test('resets state when popover closes', async () => {
    render(
      <LabelPicker
        labels={mockLabels}
        allowCreate
        onCreateLabel={jest.fn()}
      />
    );

    const button = screen.getByRole('button', { name: /labels/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search labels...')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search labels...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    fireEvent.click(screen.getByText('Create new label'));

    // Close popover
    fireEvent.click(button);

    // Reopen
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search labels...')).toHaveValue('');
      expect(screen.getByText('Create new label')).toBeInTheDocument();
    });
  });

  test('applies custom className', () => {
    render(<LabelPicker labels={mockLabels} className="custom-class" />);

    const button = screen.getByRole('button', { name: /labels/i });
    expect(button).toHaveClass('custom-class');
  });

  test('supports custom searchPlaceholder', async () => {
    render(<LabelPicker labels={mockLabels} searchPlaceholder="Find labels..." />);

    const button = screen.getByRole('button', { name: /labels/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Find labels...')).toBeInTheDocument();
    });
  });

  test('supports different alignments', () => {
    const { rerender } = render(<LabelPicker labels={mockLabels} align="start" />);
    expect(screen.getByRole('button', { name: /labels/i })).toBeInTheDocument();

    rerender(<LabelPicker labels={mockLabels} align="center" />);
    expect(screen.getByRole('button', { name: /labels/i })).toBeInTheDocument();

    rerender(<LabelPicker labels={mockLabels} align="end" />);
    expect(screen.getByRole('button', { name: /labels/i })).toBeInTheDocument();
  });

  test('supports different sides', () => {
    const { rerender } = render(<LabelPicker labels={mockLabels} side="top" />);
    expect(screen.getByRole('button', { name: /labels/i })).toBeInTheDocument();

    rerender(<LabelPicker labels={mockLabels} side="bottom" />);
    expect(screen.getByRole('button', { name: /labels/i })).toBeInTheDocument();
  });

  test('handles empty labels array', async () => {
    render(<LabelPicker labels={[]} />);

    const button = screen.getByRole('button', { name: /labels/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('No labels found')).toBeInTheDocument();
    });
  });
});
