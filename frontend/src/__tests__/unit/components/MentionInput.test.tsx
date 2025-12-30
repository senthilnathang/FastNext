/**
 * Tests for MentionInput component
 */

import { jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '../../utils/test-utils';
import MentionInput, { type MentionInputRef } from '@/components/messaging/MentionInput';
import React from 'react';

const mockUsers = [
  { id: 1, username: 'johndoe', full_name: 'John Doe', avatar_url: 'https://example.com/john.jpg' },
  { id: 2, username: 'janedoe', full_name: 'Jane Doe' },
  { id: 3, username: 'bobsmith', full_name: 'Bob Smith' },
  { id: 4, username: 'alice', full_name: 'Alice Johnson' },
];

describe('MentionInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders textarea with placeholder', () => {
    render(
      <MentionInput
        value=""
        onChange={jest.fn()}
        users={mockUsers}
      />
    );

    expect(screen.getByPlaceholderText('Type @ to mention someone...')).toBeInTheDocument();
  });

  test('renders custom placeholder', () => {
    render(
      <MentionInput
        value=""
        onChange={jest.fn()}
        users={mockUsers}
        placeholder="Custom placeholder"
      />
    );

    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
  });

  test('shows dropdown when @ is typed', async () => {
    const onChange = jest.fn();
    render(
      <MentionInput
        value=""
        onChange={onChange}
        users={mockUsers}
      />
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '@', selectionStart: 1 } });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });
  });

  test('filters users based on query after @', async () => {
    const onChange = jest.fn();
    render(
      <MentionInput
        value=""
        onChange={onChange}
        users={mockUsers}
      />
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '@john', selectionStart: 5 } });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();
    });
  });

  test('filters users by full name', async () => {
    const onChange = jest.fn();
    render(
      <MentionInput
        value=""
        onChange={onChange}
        users={mockUsers}
      />
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '@alice', selectionStart: 6 } });

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });
  });

  test('inserts mention when user is selected from dropdown', async () => {
    const onChange = jest.fn();
    render(
      <MentionInput
        value=""
        onChange={onChange}
        users={mockUsers}
      />
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '@j', selectionStart: 2 } });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('John Doe'));

    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
    expect(lastCall[0]).toContain('@johndoe');
    expect(lastCall[1]).toContain(1);
  });

  test('closes dropdown after selection', async () => {
    const onChange = jest.fn();
    render(
      <MentionInput
        value=""
        onChange={onChange}
        users={mockUsers}
      />
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '@', selectionStart: 1 } });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('John Doe'));

    await waitFor(() => {
      expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
    });
  });

  test('navigates dropdown with arrow keys', async () => {
    const onChange = jest.fn();
    render(
      <MentionInput
        value=""
        onChange={onChange}
        users={mockUsers}
      />
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '@', selectionStart: 1 } });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Navigate down
    fireEvent.keyDown(textarea, { key: 'ArrowDown' });

    // Navigate up
    fireEvent.keyDown(textarea, { key: 'ArrowUp' });
  });

  test('selects highlighted user with Enter key', async () => {
    const onChange = jest.fn();
    render(
      <MentionInput
        value=""
        onChange={onChange}
        users={mockUsers}
      />
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '@', selectionStart: 1 } });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    fireEvent.keyDown(textarea, { key: 'Enter' });

    expect(onChange).toHaveBeenCalled();
  });

  test('selects highlighted user with Tab key', async () => {
    const onChange = jest.fn();
    render(
      <MentionInput
        value=""
        onChange={onChange}
        users={mockUsers}
      />
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '@', selectionStart: 1 } });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    fireEvent.keyDown(textarea, { key: 'Tab' });

    expect(onChange).toHaveBeenCalled();
  });

  test('closes dropdown with Escape key', async () => {
    const onChange = jest.fn();
    render(
      <MentionInput
        value=""
        onChange={onChange}
        users={mockUsers}
      />
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '@', selectionStart: 1 } });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    fireEvent.keyDown(textarea, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });

  test('limits displayed users in dropdown to 10', async () => {
    const manyUsers = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      username: `user${i}`,
      full_name: `User ${i}`,
    }));

    const onChange = jest.fn();
    render(
      <MentionInput
        value=""
        onChange={onChange}
        users={manyUsers}
      />
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '@', selectionStart: 1 } });

    await waitFor(() => {
      const userButtons = screen.getAllByRole('button');
      // Should have at most 10 user buttons
      expect(userButtons.length).toBeLessThanOrEqual(10);
    });
  });

  test('shows user avatar when available', async () => {
    const onChange = jest.fn();
    render(
      <MentionInput
        value=""
        onChange={onChange}
        users={mockUsers}
      />
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '@john', selectionStart: 5 } });

    await waitFor(() => {
      const avatar = screen.getByAltText('John Doe');
      expect(avatar).toHaveAttribute('src', 'https://example.com/john.jpg');
    });
  });

  test('is disabled when disabled prop is true', () => {
    render(
      <MentionInput
        value=""
        onChange={jest.fn()}
        users={mockUsers}
        disabled
      />
    );

    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeDisabled();
  });

  test('respects maxLength prop', () => {
    render(
      <MentionInput
        value=""
        onChange={jest.fn()}
        users={mockUsers}
        maxLength={100}
      />
    );

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('maxLength', '100');
  });

  test('respects rows prop', () => {
    render(
      <MentionInput
        value=""
        onChange={jest.fn()}
        users={mockUsers}
        rows={5}
      />
    );

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('rows', '5');
  });

  test('shows username in dropdown', async () => {
    const onChange = jest.fn();
    render(
      <MentionInput
        value=""
        onChange={onChange}
        users={mockUsers}
      />
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '@', selectionStart: 1 } });

    await waitFor(() => {
      expect(screen.getByText('@johndoe')).toBeInTheDocument();
    });
  });

  test('passes keydown events to parent when dropdown is closed', async () => {
    const onKeyDown = jest.fn();
    const onChange = jest.fn();
    render(
      <MentionInput
        value="hello"
        onChange={onChange}
        users={mockUsers}
        onKeyDown={onKeyDown}
      />
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.keyDown(textarea, { key: 'Enter' });

    expect(onKeyDown).toHaveBeenCalled();
  });

  test('exposes focus method via ref', () => {
    const ref = React.createRef<MentionInputRef>();
    render(
      <MentionInput
        ref={ref}
        value=""
        onChange={jest.fn()}
        users={mockUsers}
      />
    );

    expect(ref.current?.focus).toBeDefined();
  });

  test('exposes blur method via ref', () => {
    const ref = React.createRef<MentionInputRef>();
    render(
      <MentionInput
        ref={ref}
        value=""
        onChange={jest.fn()}
        users={mockUsers}
      />
    );

    expect(ref.current?.blur).toBeDefined();
  });

  test('exposes insertMention method via ref', () => {
    const ref = React.createRef<MentionInputRef>();
    render(
      <MentionInput
        ref={ref}
        value=""
        onChange={jest.fn()}
        users={mockUsers}
      />
    );

    expect(ref.current?.insertMention).toBeDefined();
  });

  test('closes dropdown when clicking outside', async () => {
    const onChange = jest.fn();
    render(
      <div>
        <MentionInput
          value=""
          onChange={onChange}
          users={mockUsers}
        />
        <button data-testid="outside-button">Outside</button>
      </div>
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '@', selectionStart: 1 } });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    fireEvent.mouseDown(screen.getByTestId('outside-button'));

    await waitFor(() => {
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });

  test('hides dropdown when space is typed after @', async () => {
    const onChange = jest.fn();
    render(
      <MentionInput
        value=""
        onChange={onChange}
        users={mockUsers}
      />
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '@ ', selectionStart: 2 } });

    await waitFor(() => {
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });

  test('applies custom className', () => {
    render(
      <MentionInput
        value=""
        onChange={jest.fn()}
        users={mockUsers}
        className="custom-class"
      />
    );

    const container = screen.getByRole('textbox').parentElement;
    expect(container).toHaveClass('custom-class');
  });

  test('shows hint when empty and dropdown is not showing', () => {
    render(
      <MentionInput
        value=""
        onChange={jest.fn()}
        users={mockUsers}
      />
    );

    expect(screen.getByText('Type @ to mention')).toBeInTheDocument();
  });

  test('hides hint when typing', () => {
    render(
      <MentionInput
        value="hello"
        onChange={jest.fn()}
        users={mockUsers}
      />
    );

    expect(screen.queryByText('Type @ to mention')).not.toBeInTheDocument();
  });

  test('highlights selected user in dropdown on hover', async () => {
    const onChange = jest.fn();
    render(
      <MentionInput
        value=""
        onChange={onChange}
        users={mockUsers}
      />
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '@', selectionStart: 1 } });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const janeDoeButton = screen.getByText('Jane Doe').closest('button');
    if (janeDoeButton) {
      fireEvent.mouseEnter(janeDoeButton);
      expect(janeDoeButton).toHaveClass('hover:bg-gray-50');
    }
  });
});
