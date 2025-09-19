'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Home,
  Settings,
  Users,
  Shield,
  Key,
  ChevronDown,
  ChevronRight,
  User,
  Lock,
  Activity,
  Building2,
  Layers,
  Menu,
  X,
  LogOut,
  Bell
} from 'lucide-react';

interface MenuItem {
  title: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: MenuItem[];
  requiredPermission?: string;
  module?: string;
}

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const { canAccessModule, hasPermission } = useUserRole();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(['settings', 'administration']);

  const menuItems: MenuItem[] = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: Home
    },
    {
      title: 'Projects',
      href: '/projects',
      icon: Building2,
      module: 'projects'
    },
    {
      title: 'Builder',
      href: '/builder',
      icon: Layers,
      module: 'builder'
    },
    {
      title: 'Settings',
      icon: Settings,
      children: [
        {
          title: 'Profile',
          href: '/settings',
          icon: User
        },
        {
          title: 'Security',
          href: '/settings?tab=security',
          icon: Shield
        },
        {
          title: 'Password',
          href: '/settings?tab=password',
          icon: Lock
        },
        {
          title: 'Activity',
          href: '/settings?tab=activity',
          icon: Activity
        }
      ]
    },
    {
      title: 'Administration',
      icon: Shield,
      module: 'administration',
      children: [
        {
          title: 'Users',
          href: '/admin/users',
          icon: Users,
          requiredPermission: 'admin.users'
        },
        {
          title: 'Roles',
          href: '/admin/roles',
          icon: Shield,
          requiredPermission: 'admin.roles'
        },
        {
          title: 'Permissions',
          href: '/admin/permissions',
          icon: Key,
          requiredPermission: 'admin.permissions'
        }
      ]
    }
  ];

  const toggleExpanded = (itemTitle: string) => {
    setExpandedItems(prev => 
      prev.includes(itemTitle) 
        ? prev.filter(item => item !== itemTitle)
        : [...prev, itemTitle]
    );
  };

  const filterMenuItems = (items: MenuItem[]): MenuItem[] => {
    return items.filter(item => {
      if (item.module && !canAccessModule(item.module)) {
        return false;
      }
      
      if (item.requiredPermission && !hasPermission(item.requiredPermission)) {
        return false;
      }

      if (item.children) {
        item.children = filterMenuItems(item.children);
        return item.children.length > 0;
      }

      return true;
    });
  };

  const filteredMenuItems = filterMenuItems([...menuItems]);

  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.title);
    const isActive = item.href ? pathname === item.href || pathname.startsWith(item.href) : false;
    const hasActiveChild = hasChildren && item.children?.some(child => 
      child.href && (pathname === child.href || pathname.startsWith(child.href))
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
      <div key={item.title}>
        {hasChildren ? (
          <button
            onClick={() => toggleExpanded(item.title)}
            className={itemClasses}
          >
            <item.icon className="w-5 h-5 flex-shrink-0 mr-3" />
            <span className="flex-1 text-left">{item.title}</span>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        ) : (
          <Link href={item.href || '#'} className={itemClasses}>
            <item.icon className="w-5 h-5 flex-shrink-0 mr-3" />
            <span>{item.title}</span>
          </Link>
        )}

        {hasChildren && isExpanded && (
          <div className="ml-3 mt-1 space-y-1">
            {item.children?.map(child => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!user) {
    return <div>{children}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-transform md:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      )}>
        {/* Logo */}
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
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 flex-1 overflow-y-auto">
          <div className="space-y-1">
            {filteredMenuItems.map(item => renderMenuItem(item))}
          </div>
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
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
      </div>

      {/* Main content */}
      <div className="md:pl-64">
        {/* Top header */}
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {pathname === '/settings' ? 'Settings' : 
                   pathname === '/admin/users' ? 'User Management' :
                   pathname === '/admin/roles' ? 'Role Management' :
                   pathname === '/admin/permissions' ? 'Permission Management' :
                   pathname === '/dashboard' ? 'Dashboard' :
                   'FastNext Platform'}
                </h2>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}