'use client';

import React from 'react';
import { PanelLeft, PanelLeftClose } from 'lucide-react';
import { cn } from '@/shared/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/tooltip';

interface SidebarToggleProps {
  isCollapsed: boolean;
  onToggle: () => void;
  className?: string;
  variant?: 'default' | 'minimal' | 'floating';
  size?: 'sm' | 'md' | 'lg';
}

export default function SidebarToggle({
  isCollapsed,
  onToggle,
  className,
  variant = 'default',
  size = 'md'
}: SidebarToggleProps) {
  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5'
  };

  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const variantClasses = {
    default: 'bg-card border border-border shadow-sm hover:shadow-md',
    minimal: 'bg-transparent hover:bg-accent',
    floating: 'bg-card border border-border shadow-lg hover:shadow-xl'
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onToggle}
            className={cn(
              'rounded-lg transition-all duration-200 group flex items-center justify-center',
              'text-muted-foreground hover:text-foreground',
              'focus:outline-none focus:ring-2 focus:ring-primary/20',
              variantClasses[variant],
              sizeClasses[size],
              className
            )}
            title={isCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
          >
            {isCollapsed ? (
              <PanelLeft className={cn(iconSizes[size], 'transition-transform group-hover:scale-110')} />
            ) : (
              <PanelLeftClose className={cn(iconSizes[size], 'transition-transform group-hover:scale-110')} />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <p>{isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Ctrl+B</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}