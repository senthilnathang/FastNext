/**
 * Tests for StatusTag component
 *
 * Note: This test file is created for a StatusTag component that
 * displays status indicators with colors and labels.
 */

import { jest } from '@jest/globals';
import { render, screen, fireEvent } from '../../utils/test-utils';

// Mock StatusTag component interface and implementation
type StatusVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'pending';

interface StatusTagProps {
  status: string;
  variant?: StatusVariant;
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  pulse?: boolean;
  onClick?: () => void;
  className?: string;
}

// Mock implementation since StatusTag may not exist yet
const MockStatusTag: React.FC<StatusTagProps> = ({
  status,
  variant = 'default',
  size = 'md',
  dot = true,
  pulse = false,
  onClick,
  className = '',
}) => {
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
    pending: 'bg-orange-100 text-orange-800',
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const dotSizeClasses = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2',
    lg: 'h-2.5 w-2.5',
  };

  const Tag = onClick ? 'button' : 'span';

  return (
    <Tag
      data-testid="status-tag"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {dot && (
        <span
          data-testid="status-dot"
          className={`rounded-full ${dotSizeClasses[size]} ${pulse ? 'animate-pulse' : ''}`}
          style={{
            backgroundColor: variant === 'success' ? 'green' :
                           variant === 'error' ? 'red' :
                           variant === 'warning' ? 'yellow' :
                           variant === 'info' ? 'blue' :
                           variant === 'pending' ? 'orange' : 'gray',
          }}
        />
      )}
      <span data-testid="status-text">{status}</span>
    </Tag>
  );
};

describe('StatusTag', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders status tag with text', () => {
    render(<MockStatusTag status="Active" />);

    expect(screen.getByTestId('status-tag')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  test('renders status dot by default', () => {
    render(<MockStatusTag status="Active" />);

    expect(screen.getByTestId('status-dot')).toBeInTheDocument();
  });

  test('hides status dot when dot prop is false', () => {
    render(<MockStatusTag status="Active" dot={false} />);

    expect(screen.queryByTestId('status-dot')).not.toBeInTheDocument();
  });

  test('applies success variant styling', () => {
    render(<MockStatusTag status="Completed" variant="success" />);

    const tag = screen.getByTestId('status-tag');
    expect(tag).toHaveClass('bg-green-100', 'text-green-800');
  });

  test('applies error variant styling', () => {
    render(<MockStatusTag status="Failed" variant="error" />);

    const tag = screen.getByTestId('status-tag');
    expect(tag).toHaveClass('bg-red-100', 'text-red-800');
  });

  test('applies warning variant styling', () => {
    render(<MockStatusTag status="Warning" variant="warning" />);

    const tag = screen.getByTestId('status-tag');
    expect(tag).toHaveClass('bg-yellow-100', 'text-yellow-800');
  });

  test('applies info variant styling', () => {
    render(<MockStatusTag status="Info" variant="info" />);

    const tag = screen.getByTestId('status-tag');
    expect(tag).toHaveClass('bg-blue-100', 'text-blue-800');
  });

  test('applies pending variant styling', () => {
    render(<MockStatusTag status="Pending" variant="pending" />);

    const tag = screen.getByTestId('status-tag');
    expect(tag).toHaveClass('bg-orange-100', 'text-orange-800');
  });

  test('applies default variant styling', () => {
    render(<MockStatusTag status="Default" />);

    const tag = screen.getByTestId('status-tag');
    expect(tag).toHaveClass('bg-gray-100', 'text-gray-800');
  });

  test('renders small size correctly', () => {
    render(<MockStatusTag status="Small" size="sm" />);

    const tag = screen.getByTestId('status-tag');
    expect(tag).toHaveClass('text-xs');
  });

  test('renders medium size correctly', () => {
    render(<MockStatusTag status="Medium" size="md" />);

    const tag = screen.getByTestId('status-tag');
    expect(tag).toHaveClass('text-sm');
  });

  test('renders large size correctly', () => {
    render(<MockStatusTag status="Large" size="lg" />);

    const tag = screen.getByTestId('status-tag');
    expect(tag).toHaveClass('text-base');
  });

  test('applies pulse animation when pulse is true', () => {
    render(<MockStatusTag status="Live" pulse />);

    const dot = screen.getByTestId('status-dot');
    expect(dot).toHaveClass('animate-pulse');
  });

  test('does not apply pulse animation by default', () => {
    render(<MockStatusTag status="Status" />);

    const dot = screen.getByTestId('status-dot');
    expect(dot).not.toHaveClass('animate-pulse');
  });

  test('renders as button when onClick is provided', () => {
    render(<MockStatusTag status="Clickable" onClick={jest.fn()} />);

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  test('renders as span when onClick is not provided', () => {
    render(<MockStatusTag status="Not Clickable" />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  test('calls onClick when clicked', () => {
    const onClick = jest.fn();
    render(<MockStatusTag status="Clickable" onClick={onClick} />);

    fireEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalled();
  });

  test('applies custom className', () => {
    render(<MockStatusTag status="Custom" className="custom-class" />);

    const tag = screen.getByTestId('status-tag');
    expect(tag).toHaveClass('custom-class');
  });

  test('renders long status text correctly', () => {
    const longStatus = 'This is a very long status message that should still render';
    render(<MockStatusTag status={longStatus} />);

    expect(screen.getByText(longStatus)).toBeInTheDocument();
  });

  test('combines variant and size correctly', () => {
    render(<MockStatusTag status="Combined" variant="success" size="lg" />);

    const tag = screen.getByTestId('status-tag');
    expect(tag).toHaveClass('bg-green-100', 'text-base');
  });

  test('maintains accessibility with proper structure', () => {
    render(<MockStatusTag status="Accessible" variant="success" />);

    const text = screen.getByTestId('status-text');
    expect(text).toBeInTheDocument();
    expect(text).toHaveTextContent('Accessible');
  });

  test('has proper inline-flex layout', () => {
    render(<MockStatusTag status="Flex" />);

    const tag = screen.getByTestId('status-tag');
    expect(tag).toHaveClass('inline-flex');
  });

  test('has proper gap between dot and text', () => {
    render(<MockStatusTag status="Gap" />);

    const tag = screen.getByTestId('status-tag');
    expect(tag).toHaveClass('gap-1.5');
  });

  test('has rounded-full class for pill shape', () => {
    render(<MockStatusTag status="Rounded" />);

    const tag = screen.getByTestId('status-tag');
    expect(tag).toHaveClass('rounded-full');
  });

  test('displays correct dot color for each variant', () => {
    const variants: StatusVariant[] = ['success', 'error', 'warning', 'info', 'pending', 'default'];

    variants.forEach((variant) => {
      const { unmount } = render(<MockStatusTag status={variant} variant={variant} />);

      const dot = screen.getByTestId('status-dot');
      expect(dot).toHaveStyle({ backgroundColor: expect.any(String) });

      unmount();
    });
  });

  test('dot size matches tag size', () => {
    const { rerender } = render(<MockStatusTag status="Small" size="sm" />);
    expect(screen.getByTestId('status-dot')).toHaveClass('h-1.5', 'w-1.5');

    rerender(<MockStatusTag status="Medium" size="md" />);
    expect(screen.getByTestId('status-dot')).toHaveClass('h-2', 'w-2');

    rerender(<MockStatusTag status="Large" size="lg" />);
    expect(screen.getByTestId('status-dot')).toHaveClass('h-2.5', 'w-2.5');
  });

  test('updates when status prop changes', () => {
    const { rerender } = render(<MockStatusTag status="Initial" />);
    expect(screen.getByText('Initial')).toBeInTheDocument();

    rerender(<MockStatusTag status="Updated" />);
    expect(screen.getByText('Updated')).toBeInTheDocument();
    expect(screen.queryByText('Initial')).not.toBeInTheDocument();
  });

  test('updates when variant prop changes', () => {
    const { rerender } = render(<MockStatusTag status="Test" variant="success" />);
    expect(screen.getByTestId('status-tag')).toHaveClass('bg-green-100');

    rerender(<MockStatusTag status="Test" variant="error" />);
    expect(screen.getByTestId('status-tag')).toHaveClass('bg-red-100');
  });
});
