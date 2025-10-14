'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/modules/auth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/shared/components';
import {
  Database,
  Shield
} from 'lucide-react';

interface ConfigurationItem {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
}

const configurationItems: ConfigurationItem[] = [
  {
    title: 'Data Import/Export Config',
    description: 'Configure data import and export settings, file formats, and processing options',
    href: '/configuration/data-import-export',
    icon: Database,
    permission: 'admin.data_config'
  },
  {
    title: 'Permissions Config',
    description: 'Manage system permissions, roles, and access control settings',
    href: '/configuration/permissions',
    icon: Shield,
    permission: 'admin.permissions'
  }
];

export default function ConfigurationPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {configurationItems.map((item) => (
          <Link key={item.title} href={item.href}>
            <Card className="h-full hover:shadow-lg transition-all duration-200 border hover:border-primary/50 cursor-pointer group">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
                    {item.title}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">
                  {item.description}
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-500">Active Configs</p>
                <p className="text-lg font-bold">2</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-500">Security Level</p>
                <p className="text-lg font-bold text-green-600">High</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
