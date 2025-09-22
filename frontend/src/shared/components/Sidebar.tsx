'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/shared/utils';
import { useUserRole } from '@/modules/admin/hooks/useUserRole';
import { useAuth } from '@/modules/auth';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/tooltip';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { MenuItem, menuItems } from './menuConfig';
import { filterMenuItems } from './menuUtils';
import { UserMenu } from './UserMenu';

interface SidebarItemProps {
  item: MenuItem;
  level?: number;
  expandedItems: string[];
  onToggleExpanded: (title: string) => void;
  isCollapsed?: boolean;
  isHovered?: boolean;
}

function SidebarItem({ 
  item, 
  level = 0, 
  expandedItems, 
  onToggleExpanded,
  isCollapsed = false,
  isHovered = false
}: SidebarItemProps) {
  const pathname = usePathname();
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedItems.includes(item.title);
  const isActive = item.href ? 
    pathname === item.href || pathname.startsWith(item.href) : false;
  const hasActiveChild = hasChildren && item.children?.some(child => 
    child.href && (pathname === child.href || pathname.startsWith(child.href))
  );

  const handleToggle = () => {
    if (hasChildren) {
      onToggleExpanded(item.title);
    }
  };

  const showText = !isCollapsed || isHovered;

  const ItemContent = () => (
    <>
      <div className="flex items-center justify-center w-5 h-5 flex-shrink-0">
        <item.icon className="w-4 h-4" />
      </div>
      {showText && (
        <>
          <span className="flex-1 text-left ml-2 text-sm font-medium transition-all duration-200">
            {item.title}
          </span>
          {hasChildren && (
            <div className="flex-shrink-0 transition-transform duration-200">
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </div>
          )}
        </>
      )}
    </>
  );

  const itemClasses = cn(
    'group flex items-center w-full text-sm rounded-lg transition-all duration-200',
    'hover:bg-blue-50 dark:hover:bg-gray-800/50',
    'focus:outline-none focus:ring-1 focus:ring-blue-500/30',
    {
      'bg-blue-500 text-white shadow-sm': isActive || hasActiveChild,
      'text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300': !isActive && !hasActiveChild,
      'px-2 py-2': showText,
      'px-2 py-2 justify-center': !showText,
      'ml-3 pl-4': level > 0 && showText,
      'relative': isActive || hasActiveChild
    }
  );

  const renderItem = () => {
    const content = hasChildren ? (
      <button
        onClick={handleToggle}
        className={itemClasses}
      >
        <ItemContent />
      </button>
    ) : (
      <Link href={item.href || '#'} className={itemClasses}>
        <ItemContent />
      </Link>
    );

    if (isCollapsed && !isHovered) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8} className="text-xs">
            <p>{item.title}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <div>
      {renderItem()}

      {hasChildren && isExpanded && showText && (
        <div className="mt-1 space-y-0.5 pl-2">
          {item.children?.map((child) => (
            <SidebarItem 
              key={child.title} 
              item={child} 
              level={level + 1}
              expandedItems={expandedItems}
              onToggleExpanded={onToggleExpanded}
              isCollapsed={isCollapsed}
              isHovered={isHovered}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface SidebarProps {
  className?: string;
  onClose?: () => void;
  showCloseButton?: boolean;
  isCollapsed?: boolean;
}

export default function Sidebar({ 
  className, 
  onClose,
  showCloseButton = false,
  isCollapsed = false
}: SidebarProps) {
  const { canAccessModule, hasPermission } = useUserRole();
  const { user } = useAuth();
  const [expandedItems, setExpandedItems] = useState<string[]>(['Settings', 'Administration']);
  const [isHovered, setIsHovered] = useState(false);
  const [hoverTimer, setHoverTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-expanded-items');
    if (saved) {
      try {
        setExpandedItems(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading sidebar state:', error);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebar-expanded-items', JSON.stringify(expandedItems));
  }, [expandedItems]);

  const handleToggleExpanded = useCallback((itemTitle: string) => {
    setExpandedItems(prev => 
      prev.includes(itemTitle) 
        ? prev.filter(item => item !== itemTitle)
        : [...prev, itemTitle]
    );
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (isCollapsed) {
      if (hoverTimer) {
        clearTimeout(hoverTimer);
      }
      const timer = setTimeout(() => {
        setIsHovered(true);
      }, 200);
      setHoverTimer(timer);
    }
  }, [isCollapsed, hoverTimer]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      setHoverTimer(null);
    }
    setIsHovered(false);
  }, [hoverTimer]);

  const filteredMenuItems = filterMenuItems(menuItems, {
    canAccessModule,
    hasPermission
  });

  const sidebarWidth = isCollapsed ? (isHovered ? 'w-56' : 'w-14') : 'w-56';

  return (
    <TooltipProvider>
      <div 
        className={cn(
          'bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800',
          'flex flex-col h-full transition-all duration-300 ease-in-out',
          'shadow-sm',
          sidebarWidth,
          className
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Compact Header */}
        <div className={cn(
          'flex items-center justify-between border-b border-gray-200/60 dark:border-gray-700/60 h-12',
          isCollapsed && !isHovered ? 'px-3' : 'px-4'
        )}>
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-sm">FN</span>
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full border border-white dark:border-gray-900"></div>
            </div>
            {(!isCollapsed || isHovered) && (
              <div className="min-w-0 flex-1">
                <h1 className="text-sm font-bold text-gray-900 dark:text-white truncate">FastNext</h1>
              </div>
            )}
          </div>
          
          
          {/* Mobile close button */}
          {showCloseButton && onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className={cn(
          'flex-1 overflow-y-auto',
          isCollapsed && !isHovered ? 'p-2' : 'p-3'
        )}>
          <div className="space-y-1">
            {filteredMenuItems.map((item) => (
              <SidebarItem 
                key={item.title} 
                item={item}
                expandedItems={expandedItems}
                onToggleExpanded={handleToggleExpanded}
                isCollapsed={isCollapsed}
                isHovered={isHovered}
              />
            ))}
          </div>
        </nav>

        {/* Enhanced User Menu */}
        {user && (
          <div className={cn(
            'border-t border-gray-200/60 dark:border-gray-700/60',
            isCollapsed && !isHovered ? 'p-2' : 'p-3'
          )}>
            <UserMenu 
              isCollapsed={isCollapsed && !isHovered} 
              className="w-full"
            />
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}