'use client';

import { FileX, Search, Database, AlertCircle, Plus, RefreshCw } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/shared/utils';
import { Button } from '../ui/button';

export type EmptyStateVariant = 'default' | 'search' | 'error' | 'loading' | 'no-data';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  icon?: React.ReactNode;
  loading?: boolean;
}

export interface EnhancedEmptyStateProps {
  /** Title of the empty state */
  title: string;
  /** Description text */
  description?: string;
  /** Custom icon component */
  icon?: React.ReactNode;
  /** Predefined variant for common empty states */
  variant?: EmptyStateVariant;
  /** Action buttons */
  actions?: EmptyStateAction[];
  /** Custom children to render below description */
  children?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show a background illustration */
  showBackground?: boolean;
}

const variantConfig: Record<EmptyStateVariant, {
  icon: React.ReactNode;
  title: string;
  description: string;
}> = {
  default: {
    icon: <FileX className="h-12 w-12 text-muted-foreground" />,
    title: 'No items found',
    description: 'There are no items to display at the moment.',
  },
  search: {
    icon: <Search className="h-12 w-12 text-muted-foreground" />,
    title: 'No search results',
    description: 'Try adjusting your search criteria or filters.',
  },
  error: {
    icon: <AlertCircle className="h-12 w-12 text-destructive" />,
    title: 'Something went wrong',
    description: 'We encountered an error while loading your data.',
  },
  loading: {
    icon: <RefreshCw className="h-12 w-12 text-muted-foreground animate-spin" />,
    title: 'Loading...',
    description: 'Please wait while we fetch your data.',
  },
  'no-data': {
    icon: <Database className="h-12 w-12 text-muted-foreground" />,
    title: 'No data available',
    description: 'Get started by adding your first item.',
  },
};

const sizeConfig = {
  sm: {
    container: 'gap-4 px-6 py-8',
    icon: 'h-8 w-8',
    title: 'text-base',
    description: 'text-sm',
  },
  md: {
    container: 'gap-6 px-8 py-12',
    icon: 'h-12 w-12',
    title: 'text-lg',
    description: 'text-sm',
  },
  lg: {
    container: 'gap-8 px-12 py-16',
    icon: 'h-16 w-16',
    title: 'text-xl',
    description: 'text-base',
  },
};

function EnhancedEmptyState({
  title,
  description,
  icon,
  variant = 'default',
  actions = [],
  children,
  className,
  size = 'md',
  showBackground = false,
  ...props
}: EnhancedEmptyStateProps): React.JSX.Element {
  const config = variantConfig[variant];
  const sizeClasses = sizeConfig[size];

  const displayTitle = title || config.title;
  const displayDescription = description || config.description;
  const displayIcon = icon || config.icon;

  // Clone the icon with appropriate size classes
  const resizedIcon = React.isValidElement(displayIcon)
    ? React.cloneElement(displayIcon as React.ReactElement<any>, {
        className: cn(sizeClasses.icon, (displayIcon as React.ReactElement<any>).props.className),
      })
    : displayIcon;

  return (
    <div
      role="region"
      aria-label={displayTitle}
      className={cn(
        'flex h-full min-h-[400px] flex-col items-center justify-center text-center',
        sizeClasses.container,
        showBackground && 'bg-muted/20 rounded-lg border border-dashed',
        className
      )}
      {...props}
    >
      {/* Background Pattern */}
      {showBackground && (
        <div className="absolute inset-0 opacity-5">
          <svg
            className="h-full w-full"
            fill="currentColor"
            viewBox="0 0 60 60"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g>
              <circle cx="30" cy="30" r="2" />
              <circle cx="10" cy="10" r="1" />
              <circle cx="50" cy="10" r="1" />
              <circle cx="10" cy="50" r="1" />
              <circle cx="50" cy="50" r="1" />
            </g>
          </svg>
        </div>
      )}

      {/* Icon */}
      <div className="relative z-10 flex items-center justify-center">
        {resizedIcon}
      </div>

      {/* Content */}
      <div className="relative z-10 space-y-2 max-w-sm">
        <h3 className={cn('font-semibold text-foreground', sizeClasses.title)}>
          {displayTitle}
        </h3>
        {displayDescription && (
          <p className={cn('text-muted-foreground', sizeClasses.description)}>
            {displayDescription}
          </p>
        )}
      </div>

      {/* Custom children */}
      {children && (
        <div className="relative z-10 mt-4">
          {children}
        </div>
      )}

      {/* Actions */}
      {actions.length > 0 && (
        <div className="relative z-10 flex flex-col sm:flex-row gap-2 mt-6">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || 'default'}
              onClick={action.onClick}
              disabled={action.loading}
              className="flex items-center gap-2"
            >
              {action.loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                action.icon
              )}
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

// Preset components for common use cases
function EmptySearch({
  searchTerm,
  onClear,
  title,
  ...props
}: Omit<EnhancedEmptyStateProps, 'variant'> & {
  searchTerm?: string;
  onClear?: () => void;
}) {
  const actions: EmptyStateAction[] = [];
  
  if (onClear) {
    actions.push({
      label: 'Clear search',
      onClick: onClear,
      variant: 'outline',
    });
  }

  return (
    <EnhancedEmptyState
      variant="search"
      title={title || (searchTerm ? `No results for "${searchTerm}"` : 'No results found')}
      actions={actions}
      {...props}
    />
  );
}

function EmptyData({
  onCreate,
  createLabel = 'Add item',
  ...props
}: Omit<EnhancedEmptyStateProps, 'variant'> & {
  onCreate?: () => void;
  createLabel?: string;
}) {
  const actions: EmptyStateAction[] = [];
  
  if (onCreate) {
    actions.push({
      label: createLabel,
      onClick: onCreate,
      icon: <Plus className="h-4 w-4" />,
    });
  }

  return (
    <EnhancedEmptyState
      variant="no-data"
      actions={actions}
      showBackground
      {...props}
    />
  );
}

function EmptyError({
  onRetry,
  retryLabel = 'Try again',
  ...props
}: Omit<EnhancedEmptyStateProps, 'variant'> & {
  onRetry?: () => void;
  retryLabel?: string;
}) {
  const actions: EmptyStateAction[] = [];
  
  if (onRetry) {
    actions.push({
      label: retryLabel,
      onClick: onRetry,
      icon: <RefreshCw className="h-4 w-4" />,
    });
  }

  return (
    <EnhancedEmptyState
      variant="error"
      actions={actions}
      {...props}
    />
  );
}

function EmptyLoading({
  ...props
}: Omit<EnhancedEmptyStateProps, 'variant'>) {
  return (
    <EnhancedEmptyState
      variant="loading"
      {...props}
    />
  );
}

export {
  EnhancedEmptyState,
  EmptySearch,
  EmptyData,
  EmptyError,
  EmptyLoading,
};