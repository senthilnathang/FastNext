'use client';

import React from 'react';
import { cn } from '@/shared/utils';

interface CompactPageLayoutProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  fullHeight?: boolean;
}

export default function CompactPageLayout({
  children,
  className,
  padding = 'sm',
  title,
  subtitle,
  actions,
  fullHeight = false
}: CompactPageLayoutProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  return (
    <div className={cn(
      'bg-white dark:bg-gray-900',
      fullHeight && 'h-full',
      className
    )}>
      {(title || actions) && (
        <div className="border-b border-gray-200 dark:border-gray-800 px-3 py-2 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            <div>
              {title && (
                <h1 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex items-center space-x-2">
                {actions}
              </div>
            )}
          </div>
        </div>
      )}

      <div className={cn(
        paddingClasses[padding],
        fullHeight && 'h-full overflow-auto'
      )}>
        {children}
      </div>
    </div>
  );
}
