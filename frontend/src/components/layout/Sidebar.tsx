'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, X, LogOut, User } from 'lucide-react';
import { MenuItem, menuItems } from './menuConfig';
import { filterMenuItems } from './menuUtils';

interface SidebarItemProps {
  item: MenuItem;
  level?: number;
  expandedItems: string[];
  onToggleExpanded: (title: string) => void;
}

function SidebarItem({ 
  item, 
  level = 0, 
  expandedItems, 
  onToggleExpanded 
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
      <item.icon className="w-5 h-5 flex-shrink-0 mr-3" />
      <span className="flex-1 text-left">{item.title}</span>
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
  );

  const itemClasses = cn(
    'flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors',
    'hover:bg-gray-100 dark:hover:bg-gray-800',
    {
      'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300': isActive || hasActiveChild,
      'text-gray-700 dark:text-gray-300': !isActive && !hasActiveChild,
      'pl-6': level > 0
    }
  );

  return (
    <div>
      {hasChildren ? (
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
      )}

      {hasChildren && isExpanded && (
        <div className="ml-3 mt-1 space-y-1">
          {item.children?.map((child) => (
            <SidebarItem 
              key={child.title} 
              item={child} 
              level={level + 1}
              expandedItems={expandedItems}
              onToggleExpanded={onToggleExpanded}
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
}

export default function Sidebar({ 
  className, 
  onClose,
  showCloseButton = false 
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
    <div className={cn(
      'w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full',
      className
    )}>
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">FN</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">FastNext</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Enterprise Platform</p>
            </div>
          </div>
          {showCloseButton && onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 flex-1 overflow-y-auto">
        <div className="space-y-1">
          {filteredMenuItems.map((item) => (
            <SidebarItem 
              key={item.title} 
              item={item}
              expandedItems={expandedItems}
              onToggleExpanded={handleToggleExpanded}
            />
          ))}
        </div>
      </nav>

      {/* User Section - moved from AppLayout */}
      {user && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user.full_name || user.username}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user.email}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="w-full justify-start"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      )}
    </div>
  );
}