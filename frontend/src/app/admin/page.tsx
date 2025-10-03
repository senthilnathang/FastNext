'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { 
  Shield, 
  Users, 
  Key, 
  Upload, 
  Download, 
  Settings,
  ArrowRight,
  Activity,
  FileText,
  Server,
  Database
} from 'lucide-react';

const adminMenuItems = [
  {
    title: 'User Management',
    href: '/admin/users',
    icon: Users,
    description: 'Manage user accounts and access'
  },
  {
    title: 'Advanced User Management',
    href: '/admin/advanced-user-management',
    icon: Users,
    description: 'Advanced user administration and analytics',
    badge: 'Enhanced'
  },
  {
    title: 'Role Management',
    href: '/admin/roles',
    icon: Key,
    description: 'Configure user roles and permissions'
  },
  {
    title: 'Permissions',
    href: '/admin/permissions',
    icon: Shield,
    description: 'Define and manage system permissions'
  },
  {
    title: 'Audit Logs',
    href: '/admin/audit-logs',
    icon: FileText,
    description: 'Track and monitor all system activities',
    badge: 'New'
  },
  {
    title: 'System Monitoring',
    href: '/admin/system-monitoring',
    icon: Server,
    description: 'Real-time system performance and health monitoring',
    badge: 'New'
  },
  {
    title: 'Configuration Management',
    href: '/admin/configuration',
    icon: Settings,
    description: 'Manage system configuration and settings',
    badge: 'New'
  },
  {
    title: 'Data Import',
    href: '/admin/data-import',
    icon: Upload,
    description: 'Import data into database tables'
  },
  {
    title: 'Data Export',
    href: '/admin/data-export',
    icon: Download,
    description: 'Export data from database tables'
  }
];

export default function AdminPage() {
  console.log('AdminPage rendered with menu items:', adminMenuItems.map(item => item.title));
  
  return (
    <div className="container mx-auto p-8">
      <div className="flex items-center space-x-2 mb-8">
        <Settings className="h-8 w-8" />
        <h1 className="text-3xl font-bold">Administration</h1>
        <Badge variant="outline">{adminMenuItems.length} menu items</Badge>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminMenuItems.map((item) => {
          const Icon = item.icon;
          
          return (
            <Link key={item.href} href={item.href}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Icon className="h-6 w-6 text-blue-600" />
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                    </div>
                    {item.badge && (
                      <Badge variant="secondary" className="text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600 dark:text-gray-400 mb-4">
                    {item.description}
                  </CardDescription>
                  <Button variant="ghost" size="sm" className="w-full justify-between">
                    Access
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}