'use client';

import React from 'react';
import { cn } from '@/shared/utils';

interface CompactCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  padding?: 'none' | 'xs' | 'sm' | 'md';
  variant?: 'default' | 'outlined' | 'filled';
  clickable?: boolean;
  onClick?: () => void;
}

export default function CompactCard({
  children,
  title,
  subtitle,
  icon,
  actions,
  className,
  padding = 'sm',
  variant = 'default',
  clickable = false,
  onClick
}: CompactCardProps) {
  const paddingClasses = {
    none: '',
    xs: 'p-2',
    sm: 'p-3',
    md: 'p-4'
  };

  const variantClasses = {
    default: 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700',
    outlined: 'bg-transparent border border-gray-200 dark:border-gray-700',
    filled: 'bg-gray-50 dark:bg-gray-800 border border-transparent'
  };

  const Component = clickable || onClick ? 'button' : 'div';

  return (
    <Component
      className={cn(
        'rounded-lg shadow-sm transition-all duration-200',
        variantClasses[variant],
        paddingClasses[padding],
        (clickable || onClick) && 'hover:shadow-md hover:scale-[1.01] cursor-pointer',
        'text-left w-full',
        className
      )}
      onClick={onClick}
    >
      {(title || subtitle || icon || actions) && (
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            {icon && (
              <div className="flex-shrink-0 text-gray-500 dark:text-gray-400">
                {icon}
              </div>
            )}
            <div className="min-w-0 flex-1">
              {title && (
                <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {actions && (
            <div className="flex-shrink-0 flex items-center space-x-1">
              {actions}
            </div>
          )}
        </div>
      )}

      <div className="text-sm text-gray-700 dark:text-gray-300">
        {children}
      </div>
    </Component>
  );
}
