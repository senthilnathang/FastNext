/**
 * Accessible Button Component - WCAG 2.1 AAA compliant
 */

import React, { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { announceToScreenReader, generateId } from '../../utils/accessibility';

const buttonVariants = cva(
  [
    // Base styles
    'inline-flex items-center justify-center rounded-md text-sm font-medium',
    'transition-colors focus-visible:outline-none focus-visible:ring-2',
    'focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',

    // High contrast support
    'border border-transparent',

    // Focus management
    'relative',

    // Touch targets (44px minimum)
    'min-h-[44px] min-w-[44px]',

    // Motion preferences
    'transition-all duration-200',
  ],
  {
    variants: {
      variant: {
        default: [
          'bg-primary text-primary-foreground shadow hover:bg-primary/90',
          'focus-visible:bg-primary/90',
        ],
        destructive: [
          'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
          'focus-visible:bg-destructive/90',
        ],
        outline: [
          'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
          'focus-visible:bg-accent focus-visible:text-accent-foreground',
        ],
        secondary: [
          'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
          'focus-visible:bg-secondary/80',
        ],
        ghost: [
          'hover:bg-accent hover:text-accent-foreground',
          'focus-visible:bg-accent focus-visible:text-accent-foreground',
        ],
        link: [
          'text-primary underline-offset-4 hover:underline',
          'focus-visible:text-primary focus-visible:underline',
        ],
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface AccessibleButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  children: ReactNode;
  loading?: boolean;
  loadingText?: string;
  pressed?: boolean;
  expanded?: boolean;
  controls?: string;
  describedBy?: string;
  labelledBy?: string;
  announceOnClick?: string;
}

const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  (
    {
      className,
      variant,
      size,
      children,
      loading = false,
      loadingText = 'Loading...',
      pressed,
      expanded,
      controls,
      describedBy,
      labelledBy,
      announceOnClick,
      disabled,
      onClick,
      ...props
    },
    ref
  ) => {
    const buttonId = generateId('button');
    const isDisabled = disabled || loading;

    // Handle click with screen reader announcement
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (announceOnClick) {
        announceToScreenReader(announceOnClick);
      }
      onClick?.(event);
    };

    // Determine ARIA attributes
    const ariaProps: Record<string, any> = {};

    if (pressed !== undefined) {
      ariaProps['aria-pressed'] = pressed;
    }

    if (expanded !== undefined) {
      ariaProps['aria-expanded'] = expanded;
    }

    if (controls) {
      ariaProps['aria-controls'] = controls;
    }

    if (describedBy) {
      ariaProps['aria-describedby'] = describedBy;
    }

    if (labelledBy) {
      ariaProps['aria-labelledby'] = labelledBy;
    }

    // Loading state
    if (loading) {
      ariaProps['aria-disabled'] = true;
      ariaProps['aria-describedby'] = `${buttonId}-loading`;
    }

    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={isDisabled}
        onClick={handleClick}
        id={buttonId}
        {...ariaProps}
        {...props}
      >
        {loading ? (
          <>
            <span className="sr-only" id={`${buttonId}-loading`}>
              {loadingText}
            </span>
            <svg
              className="mr-2 h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span aria-hidden="true">{children}</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

AccessibleButton.displayName = 'AccessibleButton';

export { AccessibleButton, buttonVariants };