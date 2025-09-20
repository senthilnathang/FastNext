'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Menu, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Sidebar from './Sidebar';
import { getPageTitle } from './menuUtils';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        'fixed inset-y-0 left-0 z-50 transform transition-transform md:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      )}>
        <Sidebar 
          showCloseButton={true}
          onClose={() => setSidebarOpen(false)}
        />
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
                  {getPageTitle(pathname)}
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