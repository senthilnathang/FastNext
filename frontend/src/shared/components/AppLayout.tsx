'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/modules/auth';
import { cn } from '@/shared/utils';
import { Menu, Bell } from 'lucide-react';
import { Button } from '@/shared/components/button';
import Sidebar from './Sidebar';
import SidebarToggle from './SidebarToggle';
import { getPageTitle } from './menuUtils';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-collapsed');
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });

  // Save collapsed state to localStorage
  React.useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Keyboard shortcut for sidebar toggle (Ctrl+B)
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault();
        setSidebarCollapsed(!sidebarCollapsed);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [sidebarCollapsed]);

  if (!user) {
    return <div>{children}</div>;
  }

  const sidebarWidth = sidebarCollapsed ? 'md:pl-14' : 'md:pl-56';

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        'fixed inset-y-0 left-0 z-50 transform transition-all duration-300 ease-in-out md:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      )}>
        <Sidebar 
          showCloseButton={true}
          onClose={() => setSidebarOpen(false)}
          isCollapsed={sidebarCollapsed}
        />
      </div>

      {/* Main content */}
      <div className={cn('transition-all duration-300 ease-in-out', sidebarWidth)}>
        {/* Compact header */}
        <header className="bg-card border-b border-border px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden p-1.5 rounded-lg hover:bg-accent transition-colors"
              >
                <Menu className="h-4 w-4" />
              </button>
              
              {/* Desktop sidebar toggle */}
              <div className="hidden md:block">
                <SidebarToggle
                  isCollapsed={sidebarCollapsed}
                  onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                  variant="minimal"
                  size="sm"
                />
              </div>
              
              <div>
                <h1 className="text-lg font-semibold text-card-foreground">
                  {getPageTitle(pathname)}
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" className="relative p-1.5">
                <Bell className="h-4 w-4" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full"></span>
              </Button>
            </div>
          </div>
        </header>

        {/* Page content - no wrapper container */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}