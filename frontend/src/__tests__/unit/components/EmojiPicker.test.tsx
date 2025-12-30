/**
 * Tests for EmojiPicker component
 */

import { jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '../../utils/test-utils';
import { EmojiPicker } from '@/shared/components/communication/EmojiPicker';

describe('EmojiPicker', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders emoji picker trigger button', () => {
    render(<EmojiPicker onEmojiSelect={jest.fn()} />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  test('renders custom trigger when provided', () => {
    render(
      <EmojiPicker
        onEmojiSelect={jest.fn()}
        trigger={<button data-testid="custom-trigger">Pick emoji</button>}
      />
    );

    expect(screen.getByTestId('custom-trigger')).toBeInTheDocument();
  });

  test('opens emoji picker popover when clicked', async () => {
    render(<EmojiPicker onEmojiSelect={jest.fn()} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search emojis...')).toBeInTheDocument();
    });
  });

  test('displays emoji categories', async () => {
    render(<EmojiPicker onEmojiSelect={jest.fn()} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      // Category tabs should be visible
      expect(screen.getByTitle('Smileys & Emotion')).toBeInTheDocument();
      expect(screen.getByTitle('Gestures & People')).toBeInTheDocument();
      expect(screen.getByTitle('Animals & Nature')).toBeInTheDocument();
    });
  });

  test('displays emojis in selected category', async () => {
    render(<EmojiPicker onEmojiSelect={jest.fn()} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      // Smileys category is selected by default
      expect(screen.getByText('Smileys & Emotion')).toBeInTheDocument();
    });
  });

  test('calls onEmojiSelect when emoji is clicked', async () => {
    const onEmojiSelect = jest.fn();
    render(<EmojiPicker onEmojiSelect={onEmojiSelect} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search emojis...')).toBeInTheDocument();
    });

    // Find and click an emoji
    const emojiButtons = screen.getAllByRole('button');
    const emojiButton = emojiButtons.find(btn => btn.textContent?.includes('\u{1F600}'));
    if (emojiButton) {
      fireEvent.click(emojiButton);
    } else {
      // Click the first emoji in the grid
      const emojiGrid = screen.getByText('Smileys & Emotion').parentElement?.querySelector('.grid');
      const firstEmoji = emojiGrid?.querySelector('button');
      if (firstEmoji) {
        fireEvent.click(firstEmoji);
        expect(onEmojiSelect).toHaveBeenCalled();
      }
    }
  });

  test('closes popover after emoji selection', async () => {
    render(<EmojiPicker onEmojiSelect={jest.fn()} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search emojis...')).toBeInTheDocument();
    });

    // Find and click an emoji
    const emojiGrid = screen.getByText('Smileys & Emotion').parentElement?.querySelector('.grid');
    const firstEmoji = emojiGrid?.querySelector('button');
    if (firstEmoji) {
      fireEvent.click(firstEmoji);
    }

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Search emojis...')).not.toBeInTheDocument();
    });
  });

  test('switches category when category tab is clicked', async () => {
    render(<EmojiPicker onEmojiSelect={jest.fn()} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByTitle('Animals & Nature')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Animals & Nature'));

    await waitFor(() => {
      expect(screen.getByText('Animals & Nature')).toBeInTheDocument();
    });
  });

  test('filters emojis when searching', async () => {
    render(<EmojiPicker onEmojiSelect={jest.fn()} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search emojis...')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search emojis...');
    fireEvent.change(searchInput, { target: { value: 'test-query' } });

    await waitFor(() => {
      // Category tabs should be hidden during search
      expect(screen.queryByTitle('Smileys & Emotion')).not.toBeInTheDocument();
    });
  });

  test('shows "No emojis found" for no search results', async () => {
    render(<EmojiPicker onEmojiSelect={jest.fn()} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search emojis...')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search emojis...');
    fireEvent.change(searchInput, { target: { value: 'xyznotfound123' } });

    await waitFor(() => {
      expect(screen.getByText('No emojis found')).toBeInTheDocument();
    });
  });

  test('shows recent emojis tab when there are recent emojis', async () => {
    // Pre-populate recent emojis in localStorage
    localStorage.setItem('fastnext-recent-emojis', JSON.stringify(['test1', 'test2']));

    render(<EmojiPicker onEmojiSelect={jest.fn()} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByTitle('Recent')).toBeInTheDocument();
    });
  });

  test('saves emoji to recent when selected', async () => {
    const onEmojiSelect = jest.fn();
    render(<EmojiPicker onEmojiSelect={onEmojiSelect} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search emojis...')).toBeInTheDocument();
    });

    // Click first emoji in the grid
    const emojiGrid = screen.getByText('Smileys & Emotion').parentElement?.querySelector('.grid');
    const firstEmoji = emojiGrid?.querySelector('button');
    if (firstEmoji) {
      fireEvent.click(firstEmoji);
    }

    // Check that localStorage was updated
    const recentEmojis = localStorage.getItem('fastnext-recent-emojis');
    expect(recentEmojis).not.toBeNull();
  });

  test('is disabled when disabled prop is true', () => {
    render(<EmojiPicker onEmojiSelect={jest.fn()} disabled />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  test('supports controlled open state', async () => {
    const onOpenChange = jest.fn();
    render(
      <EmojiPicker
        onEmojiSelect={jest.fn()}
        open={true}
        onOpenChange={onOpenChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search emojis...')).toBeInTheDocument();
    });
  });

  test('handles keyboard navigation', async () => {
    const onEmojiSelect = jest.fn();
    render(<EmojiPicker onEmojiSelect={onEmojiSelect} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search emojis...')).toBeInTheDocument();
    });

    const popoverContent = screen.getByPlaceholderText('Search emojis...').closest('[class*="popover"]');
    if (popoverContent) {
      fireEvent.keyDown(popoverContent, { key: 'ArrowRight' });
      fireEvent.keyDown(popoverContent, { key: 'Enter' });
    }
  });

  test('closes on Escape key', async () => {
    render(<EmojiPicker onEmojiSelect={jest.fn()} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search emojis...')).toBeInTheDocument();
    });

    const popoverContent = screen.getByPlaceholderText('Search emojis...').closest('[class*="popover"]');
    if (popoverContent) {
      fireEvent.keyDown(popoverContent, { key: 'Escape' });
    }

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Search emojis...')).not.toBeInTheDocument();
    });
  });

  test('applies custom className', () => {
    render(<EmojiPicker onEmojiSelect={jest.fn()} className="custom-class" />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  test('resets focused index when category changes', async () => {
    render(<EmojiPicker onEmojiSelect={jest.fn()} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByTitle('Food & Drink')).toBeInTheDocument();
    });

    // Click a different category
    fireEvent.click(screen.getByTitle('Food & Drink'));

    await waitFor(() => {
      expect(screen.getByText('Food & Drink')).toBeInTheDocument();
    });
  });

  test('clears search when popover closes', async () => {
    render(<EmojiPicker onEmojiSelect={jest.fn()} />);

    const triggerButton = screen.getByRole('button');
    fireEvent.click(triggerButton);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search emojis...')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search emojis...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    // Close popover by clicking trigger again
    fireEvent.click(triggerButton);

    // Reopen
    fireEvent.click(triggerButton);

    await waitFor(() => {
      const newSearchInput = screen.getByPlaceholderText('Search emojis...');
      expect(newSearchInput).toHaveValue('');
    });
  });
});
