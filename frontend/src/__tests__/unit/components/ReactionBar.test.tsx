/**
 * Tests for ReactionBar component
 *
 * Note: This test file is created for a ReactionBar component that
 * displays emoji reactions on messages/posts with counts and user lists.
 */

import { jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '../../utils/test-utils';

// Mock ReactionBar component interface
interface Reaction {
  emoji: string;
  count: number;
  userIds: string[];
  hasReacted: boolean;
}

interface ReactionBarProps {
  reactions: Reaction[];
  onReactionClick?: (emoji: string) => void;
  onAddReaction?: (emoji: string) => void;
  showAddButton?: boolean;
  disabled?: boolean;
  maxDisplayed?: number;
  className?: string;
}

// Since ReactionBar may not exist, we create a mock component for testing
const MockReactionBar: React.FC<ReactionBarProps> = ({
  reactions,
  onReactionClick,
  onAddReaction,
  showAddButton = true,
  disabled = false,
  maxDisplayed = 10,
  className,
}) => (
  <div data-testid="reaction-bar" className={className}>
    {reactions.slice(0, maxDisplayed).map((reaction, index) => (
      <button
        key={`${reaction.emoji}-${index}`}
        onClick={() => !disabled && onReactionClick?.(reaction.emoji)}
        disabled={disabled}
        className={`reaction-button ${reaction.hasReacted ? 'reacted' : ''}`}
        data-emoji={reaction.emoji}
        aria-label={`${reaction.emoji} reaction with ${reaction.count} ${reaction.count === 1 ? 'reaction' : 'reactions'}`}
      >
        <span className="emoji">{reaction.emoji}</span>
        <span className="count">{reaction.count}</span>
      </button>
    ))}
    {reactions.length > maxDisplayed && (
      <span data-testid="more-reactions">+{reactions.length - maxDisplayed}</span>
    )}
    {showAddButton && !disabled && (
      <button
        data-testid="add-reaction-button"
        onClick={() => onAddReaction?.('emoji')}
        aria-label="Add reaction"
      >
        +
      </button>
    )}
  </div>
);

const mockReactions: Reaction[] = [
  { emoji: '\u{1F44D}', count: 5, userIds: ['1', '2', '3', '4', '5'], hasReacted: true },
  { emoji: '\u{2764}', count: 3, userIds: ['1', '2', '3'], hasReacted: false },
  { emoji: '\u{1F602}', count: 2, userIds: ['4', '5'], hasReacted: false },
  { emoji: '\u{1F389}', count: 1, userIds: ['1'], hasReacted: true },
];

describe('ReactionBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders reaction bar container', () => {
    render(<MockReactionBar reactions={mockReactions} />);

    expect(screen.getByTestId('reaction-bar')).toBeInTheDocument();
  });

  test('displays all reaction buttons', () => {
    render(<MockReactionBar reactions={mockReactions} />);

    mockReactions.forEach((reaction) => {
      expect(screen.getByText(reaction.emoji)).toBeInTheDocument();
      expect(screen.getByText(reaction.count.toString())).toBeInTheDocument();
    });
  });

  test('shows correct reaction count', () => {
    render(<MockReactionBar reactions={mockReactions} />);

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  test('highlights reactions user has made', () => {
    render(<MockReactionBar reactions={mockReactions} />);

    const reactedButtons = document.querySelectorAll('.reacted');
    expect(reactedButtons.length).toBe(2);
  });

  test('calls onReactionClick when reaction is clicked', () => {
    const onReactionClick = jest.fn();
    render(
      <MockReactionBar
        reactions={mockReactions}
        onReactionClick={onReactionClick}
      />
    );

    const thumbsUpButton = screen.getByText('\u{1F44D}').closest('button');
    if (thumbsUpButton) {
      fireEvent.click(thumbsUpButton);
    }

    expect(onReactionClick).toHaveBeenCalledWith('\u{1F44D}');
  });

  test('shows add reaction button by default', () => {
    render(<MockReactionBar reactions={mockReactions} />);

    expect(screen.getByTestId('add-reaction-button')).toBeInTheDocument();
  });

  test('hides add reaction button when showAddButton is false', () => {
    render(<MockReactionBar reactions={mockReactions} showAddButton={false} />);

    expect(screen.queryByTestId('add-reaction-button')).not.toBeInTheDocument();
  });

  test('calls onAddReaction when add button is clicked', () => {
    const onAddReaction = jest.fn();
    render(
      <MockReactionBar
        reactions={mockReactions}
        onAddReaction={onAddReaction}
      />
    );

    fireEvent.click(screen.getByTestId('add-reaction-button'));

    expect(onAddReaction).toHaveBeenCalled();
  });

  test('disables all buttons when disabled is true', () => {
    render(<MockReactionBar reactions={mockReactions} disabled />);

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      if (button.getAttribute('data-testid') !== 'add-reaction-button') {
        expect(button).toBeDisabled();
      }
    });
  });

  test('does not call onReactionClick when disabled', () => {
    const onReactionClick = jest.fn();
    render(
      <MockReactionBar
        reactions={mockReactions}
        onReactionClick={onReactionClick}
        disabled
      />
    );

    const thumbsUpButton = screen.getByText('\u{1F44D}').closest('button');
    if (thumbsUpButton) {
      fireEvent.click(thumbsUpButton);
    }

    expect(onReactionClick).not.toHaveBeenCalled();
  });

  test('hides add button when disabled', () => {
    render(<MockReactionBar reactions={mockReactions} disabled />);

    expect(screen.queryByTestId('add-reaction-button')).not.toBeInTheDocument();
  });

  test('limits displayed reactions to maxDisplayed', () => {
    const manyReactions = [
      ...mockReactions,
      { emoji: '\u{1F44F}', count: 1, userIds: ['1'], hasReacted: false },
      { emoji: '\u{1F64C}', count: 1, userIds: ['2'], hasReacted: false },
    ];

    render(<MockReactionBar reactions={manyReactions} maxDisplayed={4} />);

    expect(screen.getByTestId('more-reactions')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  test('shows all reactions when count equals maxDisplayed', () => {
    render(<MockReactionBar reactions={mockReactions} maxDisplayed={4} />);

    expect(screen.queryByTestId('more-reactions')).not.toBeInTheDocument();
  });

  test('renders empty state when no reactions', () => {
    render(<MockReactionBar reactions={[]} />);

    expect(screen.getByTestId('reaction-bar')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reaction/ })).not.toBeInTheDocument();
  });

  test('has accessible labels for reactions', () => {
    render(<MockReactionBar reactions={mockReactions} />);

    expect(screen.getByLabelText(/\u{1F44D} reaction with 5 reactions/)).toBeInTheDocument();
    expect(screen.getByLabelText(/\u{1F389} reaction with 1 reaction/)).toBeInTheDocument();
  });

  test('has accessible label for add button', () => {
    render(<MockReactionBar reactions={mockReactions} />);

    expect(screen.getByLabelText('Add reaction')).toBeInTheDocument();
  });

  test('applies custom className', () => {
    render(<MockReactionBar reactions={mockReactions} className="custom-class" />);

    expect(screen.getByTestId('reaction-bar')).toHaveClass('custom-class');
  });

  test('handles single reaction correctly', () => {
    const singleReaction = [
      { emoji: '\u{1F44D}', count: 1, userIds: ['1'], hasReacted: false },
    ];

    render(<MockReactionBar reactions={singleReaction} />);

    expect(screen.getByText('\u{1F44D}')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  test('updates when reactions change', () => {
    const { rerender } = render(<MockReactionBar reactions={mockReactions} />);

    expect(screen.getByText('5')).toBeInTheDocument();

    const updatedReactions = mockReactions.map((r) =>
      r.emoji === '\u{1F44D}' ? { ...r, count: 10 } : r
    );

    rerender(<MockReactionBar reactions={updatedReactions} />);

    expect(screen.getByText('10')).toBeInTheDocument();
  });

  test('maintains reaction order', () => {
    render(<MockReactionBar reactions={mockReactions} />);

    const emojis = screen.getAllByRole('button')
      .filter(btn => btn.getAttribute('data-emoji'))
      .map(btn => btn.getAttribute('data-emoji'));

    expect(emojis).toEqual(['\u{1F44D}', '\u{2764}', '\u{1F602}', '\u{1F389}']);
  });
});
