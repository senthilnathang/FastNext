'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/shared/utils';
import { useUserRole } from '@/modules/admin/hooks/useUserRole';
import { useAuth } from '@/modules/auth';
import { Button } from '@/shared/components/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/tooltip';
import { ChevronDown, ChevronRight, X, LogOut, User, PanelLeftClose, PanelLeft } from 'lucide-react';
import { MenuItem, menuItems } from './menuConfig';
import { filterMenuItems } from './menuUtils';

interface SidebarItemProps {
  item: MenuItem;
  level?: number;
  expandedItems: string[];
  onToggleExpanded: (title: string) => void;
  isCollapsed?: boolean;
}

function SidebarItem({ 
  item, 
  level = 0, 
  expandedItems, 
  onToggleExpanded,
  isCollapsed = false
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

  const ItemContent = () => (
    <>
      <item.icon className="w-5 h-5 flex-shrink-0" />
      {!isCollapsed && (
        <>
          <span className="flex-1 text-left ml-3">{item.title}</span>
          {hasChildren && (
            <div className="flex-shrink-0">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </div>
          )}
        </>
      )}
    </>
  );

  const itemClasses = cn(
    'flex items-center w-full text-sm font-medium rounded-lg transition-colors',
    'hover:bg-gray-100 dark:hover:bg-gray-800',
    {
      'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300': isActive || hasActiveChild,
      'text-gray-700 dark:text-gray-300': !isActive && !hasActiveChild,
      'px-3 py-2': !isCollapsed,
      'px-2 py-2 justify-center': isCollapsed,
      'pl-6': level > 0 && !isCollapsed
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

    if (isCollapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={5}>
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

      {hasChildren && isExpanded && !isCollapsed && (
        <div className="ml-3 mt-1 space-y-1">
          {item.children?.map((child) => (
            <SidebarItem 
              key={child.title} 
              item={child} 
              level={level + 1}
              expandedItems={expandedItems}
              onToggleExpanded={onToggleExpanded}
              isCollapsed={isCollapsed}
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
  onToggleCollapse?: () => void;
}

export default function Sidebar({ 
  className, 
  onClose,
  showCloseButton = false,
  isCollapsed = false,
  onToggleCollapse
}: SidebarProps) {
  const { canAccessModule, hasPermission } = useUserRole();
  const { user, logout } = useAuth();
  const [expandedItems, setExpandedItems] = useState<string[]>(['Settings', 'Administration']);

  const handleToggleExpanded = (itemTitle: string) => {
    setExpandedItems(prev => 
      prev.includes(itemTitle) 
        ? prev.filter(item => item !== itemTitle)
        : [...prev, itemTitle]
    );
  };

  const filteredMenuItems = filterMenuItems(menuItems, {
    canAccessModule,
    hasPermission
  });

  return (
    <TooltipProvider>
      <div className={cn(
        'bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64',
        className
      )}>
        {/* Logo Section */}
        <div className={cn(
          'border-b border-gray-200 dark:border-gray-800 flex items-center justify-between',
          isCollapsed ? 'p-3' : 'p-6'
        )}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">FN</span>
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">FastNext</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Enterprise Platform</p>
              </div>
            )}
          </div>
          
          {/* Toggle button - only show on desktop */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <PanelLeft className="h-5 w-5" />
              ) : (
                <PanelLeftClose className="h-5 w-5" />
              )}
            </button>
          )}
          
          {/* Mobile close button */}
          {showCloseButton && onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className={cn('flex-1 overflow-y-auto', isCollapsed ? 'p-2' : 'p-4')}>
          <div className="space-y-1">
            {filteredMenuItems.map((item) => (
              <SidebarItem 
                key={item.title} 
                item={item}
                expandedItems={expandedItems}
                onToggleExpanded={handleToggleExpanded}
                isCollapsed={isCollapsed}
              />
            ))}
          </div>
        </nav>

        {/* User Section - moved from AppLayout */}
        {user && (
          <div className={cn(
            'border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900',
            isCollapsed ? 'p-2' : 'p-4'
          )}>
            <div className={cn(
              'flex items-center mb-3',
              isCollapsed ? 'justify-center' : 'space-x-3'
            )}>
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user.full_name || user.username}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user.email}
                  </p>
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className={cn(
                isCollapsed ? 'w-full justify-center px-2' : 'w-full justify-start'
              )}
              title={isCollapsed ? 'Logout' : undefined}
            >
              <LogOut className={cn('h-4 w-4', !isCollapsed && 'mr-2')} />
              {!isCollapsed && 'Logout'}
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}