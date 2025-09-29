'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { 
  Settings, 
  User, 
  Shield, 
  Activity, 
  Upload, 
  Download, 
  Database 
} from 'lucide-react';

const settingsNav = [
  {
    title: 'General',
    href: '/settings',
    icon: Settings,
    description: 'General settings and preferences'
  },
  {
    title: 'Profile',
    href: '/settings/profile',
    icon: User,
    description: 'Personal information and account settings'
  },
  {
    title: 'Security',
    href: '/settings/security',
    icon: Shield,
    description: 'Password, authentication and security settings'
  },
  {
    title: 'Activity',
    href: '/settings/activity',
    icon: Activity,
    description: 'Activity logs and audit trails'
  },
  {
    title: 'Data Import',
    href: '/settings/data-import',
    icon: Upload,
    description: 'Import data into database tables',
    badge: 'New'
  },
  {
    title: 'Data Export',
    href: '/settings/data-export',
    icon: Download,
    description: 'Export data from database tables',
    badge: 'New'
  }
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  return (
    <div className="flex min-h-screen">
      {/* Sidebar Navigation */}
      <div className="w-80 p-6 border-r border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
        <div className="space-y-2">
          <div className="flex items-center space-x-2 mb-6">
            <Database className="h-6 w-6" />
            <h2 className="text-xl font-semibold">Settings</h2>
          </div>
          
          <nav className="space-y-2">
            {settingsNav.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={`w-full justify-start h-auto p-4 ${
                      isActive ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3 w-full">
                      <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                        isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'
                      }`} />
                      <div className="flex-1 text-left">
                        <div className="flex items-center space-x-2">
                          <span className={`font-medium ${
                            isActive ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-gray-100'
                          }`}>
                            {item.title}
                          </span>
                          {item.badge && (
                            <Badge variant="secondary" className="text-xs">
                              {item.badge}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </Button>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1">
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  );
}