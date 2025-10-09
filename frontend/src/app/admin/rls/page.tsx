'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { 
  Shield, 
  UserCheck, 
  AlertTriangle, 
  Lock,
  ArrowRight,
  Database,
  Settings,
  Activity
} from 'lucide-react'

const rlsMenuItems = [
  {
    title: 'Security Policies',
    href: '/admin/rls/policies',
    icon: Shield,
    description: 'Configure row-level security policies and access rules',
    badge: 'Core'
  },
  {
    title: 'Rule Assignments',
    href: '/admin/rls/assignments',
    icon: UserCheck,
    description: 'Assign security policies to users, roles, and entities',
    badge: 'Management'
  },
  {
    title: 'Audit Logs',
    href: '/admin/rls/audit',
    icon: AlertTriangle,
    description: 'Monitor access attempts and security violations',
    badge: 'Monitoring'
  },
  {
    title: 'Organizations',
    href: '/admin/rls/organizations',
    icon: Database,
    description: 'Manage multi-tenant organization security',
    badge: 'Tenant'
  },
  {
    title: 'Context Management',
    href: '/admin/rls/contexts',
    icon: Settings,
    description: 'View and manage security contexts',
    badge: 'Context'
  },
  {
    title: 'Security Dashboard',
    href: '/admin/rls/dashboard',
    icon: Activity,
    description: 'Real-time security metrics and analytics',
    badge: 'Analytics'
  }
]

export default function RLSAdminPage() {
  return (
    <div className="container mx-auto p-8">
      <div className="flex items-center space-x-2 mb-8">
        <Lock className="h-8 w-8 text-blue-600" />
        <h1 className="text-3xl font-bold">Row Level Security</h1>
        <Badge variant="outline">Security Administration</Badge>
      </div>
      
      <div className="mb-6">
        <p className="text-muted-foreground">
          Manage data access policies, security rules, and monitor access patterns across your application.
          Row Level Security (RLS) ensures users can only access data they&apos;re authorized to see.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rlsMenuItems.map((item) => {
          const Icon = item.icon
          
          return (
            <Link key={item.href} href={item.href}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Icon className="h-6 w-6 text-blue-600" />
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {item.badge}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600 dark:text-gray-400 mb-4">
                    {item.description}
                  </CardDescription>
                  <Button variant="ghost" size="sm" className="w-full justify-between">
                    Manage
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Quick Stats Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">Security Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Policies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Security policies configured</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Rule Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Rules assigned to entities</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Access Attempts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Today&apos;s access attempts</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Security Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">100%</div>
              <p className="text-xs text-muted-foreground">Overall security health</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}