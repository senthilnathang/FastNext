"use client"

import * as React from "react"
import { 
  Users, 
  Shield, 
  Key, 
  Settings, 
  BarChart3, 
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  XCircle,
  Server,
  Activity,
  Zap
} from "lucide-react"

import { cn } from "@/shared/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"

interface QuickAction {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  action: () => void
  variant?: 'default' | 'secondary' | 'destructive'
  disabled?: boolean
}

interface SystemMetric {
  id: string
  name: string
  value: string | number
  status: 'healthy' | 'warning' | 'error'
  description: string
  change?: {
    value: number
    type: 'increase' | 'decrease'
  }
}

interface QuickActionsWidgetProps {
  actions?: QuickAction[]
  className?: string
}

interface SystemStatusWidgetProps {
  metrics?: SystemMetric[]
  loading?: boolean
  className?: string
}

interface RecentStatsWidgetProps {
  stats?: {
    users: { total: number; active: number; new: number }
    roles: { total: number; active: number }
    permissions: { total: number; system: number }
    activity: { today: number; week: number }
  }
  loading?: boolean
  className?: string
}

const defaultQuickActions: QuickAction[] = [
  {
    id: 'create-user',
    title: 'Create User',
    description: 'Add a new user to the system',
    icon: Users,
    action: () => window.location.href = '/admin/users',
    variant: 'default'
  },
  {
    id: 'create-role',
    title: 'Create Role',
    description: 'Define a new user role',
    icon: Shield,
    action: () => window.location.href = '/admin/roles',
    variant: 'secondary'
  },
  {
    id: 'manage-permissions',
    title: 'Manage Permissions',
    description: 'Configure system permissions',
    icon: Key,
    action: () => window.location.href = '/admin/permissions',
    variant: 'secondary'
  },
  {
    id: 'export-data',
    title: 'Export Data',
    description: 'Download system reports',
    icon: Download,
    action: () => console.log('Export data'),
    variant: 'secondary'
  },
  {
    id: 'system-settings',
    title: 'Settings',
    description: 'Configure system settings',
    icon: Settings,
    action: () => window.location.href = '/settings',
    variant: 'secondary'
  },
  {
    id: 'view-analytics',
    title: 'View Analytics',
    description: 'Check system analytics',
    icon: BarChart3,
    action: () => console.log('View analytics'),
    variant: 'secondary'
  }
]

const defaultSystemMetrics: SystemMetric[] = [
  {
    id: 'api-status',
    name: 'API Status',
    value: 'Healthy',
    status: 'healthy',
    description: 'All endpoints responding normally'
  },
  {
    id: 'database',
    name: 'Database',
    value: 'Connected',
    status: 'healthy',
    description: 'Database connections stable'
  },
  {
    id: 'response-time',
    name: 'Avg Response Time',
    value: '145ms',
    status: 'healthy',
    description: 'Average API response time',
    change: { value: -12, type: 'decrease' }
  },
  {
    id: 'error-rate',
    name: 'Error Rate',
    value: '0.1%',
    status: 'healthy',
    description: 'Error rate in last 24h',
    change: { value: -0.3, type: 'decrease' }
  },
  {
    id: 'active-sessions',
    name: 'Active Sessions',
    value: 42,
    status: 'healthy',
    description: 'Currently active user sessions',
    change: { value: 8, type: 'increase' }
  },
  {
    id: 'memory-usage',
    name: 'Memory Usage',
    value: '68%',
    status: 'warning',
    description: 'Server memory utilization'
  }
]

function getStatusIcon(status: SystemMetric['status']) {
  switch (status) {
    case 'healthy':
      return <CheckCircle className="h-4 w-4 text-green-600" />
    case 'warning':
      return <AlertCircle className="h-4 w-4 text-yellow-600" />
    case 'error':
      return <XCircle className="h-4 w-4 text-red-600" />
  }
}

function getStatusColor(status: SystemMetric['status']) {
  switch (status) {
    case 'healthy':
      return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
    case 'warning':
      return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20'
    case 'error':
      return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
  }
}

export function QuickActionsWidget({ actions = defaultQuickActions, className }: QuickActionsWidgetProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg">
          <Zap className="h-5 w-5 mr-2" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => {
            const Icon = action.icon
            return (
              <Button
                key={action.id}
                variant={action.variant || 'secondary'}
                className="h-auto p-4 flex flex-col items-center space-y-2"
                onClick={action.action}
                disabled={action.disabled}
              >
                <Icon className="h-5 w-5" />
                <div className="text-center">
                  <div className="font-medium text-sm">{action.title}</div>
                  <div className="text-xs opacity-70">{action.description}</div>
                </div>
              </Button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export function SystemStatusWidget({ 
  metrics = defaultSystemMetrics, 
  loading = false, 
  className 
}: SystemStatusWidgetProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-lg">
            <Server className="h-5 w-5 mr-2" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3 animate-pulse">
                <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-lg">
            <Server className="h-5 w-5 mr-2" />
            System Status
          </CardTitle>
          <Button variant="ghost" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {metrics.map((metric) => (
            <div
              key={metric.id}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border",
                getStatusColor(metric.status)
              )}
            >
              <div className="flex items-center space-x-3">
                {getStatusIcon(metric.status)}
                <div>
                  <p className="font-medium text-sm">{metric.name}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {metric.description}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-sm">{metric.value}</p>
                {metric.change && (
                  <p className={cn(
                    "text-xs",
                    metric.change.type === 'increase' 
                      ? "text-green-600 dark:text-green-400" 
                      : "text-red-600 dark:text-red-400"
                  )}>
                    {metric.change.type === 'increase' ? '+' : '-'}
                    {Math.abs(metric.change.value)}
                    {typeof metric.value === 'string' && metric.value.includes('%') ? '%' : ''}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function RecentStatsWidget({ 
  stats, 
  loading = false, 
  className 
}: RecentStatsWidgetProps) {
  const defaultStats = {
    users: { total: 1247, active: 1158, new: 23 },
    roles: { total: 12, active: 10 },
    permissions: { total: 45, system: 28 },
    activity: { today: 156, week: 1284 }
  }

  const displayStats = stats || defaultStats

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-lg">
            <BarChart3 className="h-5 w-5 mr-2" />
            Recent Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg">
          <BarChart3 className="h-5 w-5 mr-2" />
          Recent Stats
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Users</span>
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold">{displayStats.users.total.toLocaleString()}</div>
            <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
              <Badge variant="secondary" className="text-xs">
                +{displayStats.users.new} new
              </Badge>
              <span>{displayStats.users.active} active</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Roles</span>
              <Shield className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-2xl font-bold">{displayStats.roles.total}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {displayStats.roles.active} active roles
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Permissions</span>
              <Key className="h-4 w-4 text-orange-600" />
            </div>
            <div className="text-2xl font-bold">{displayStats.permissions.total}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {displayStats.permissions.system} system
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Activity</span>
              <Activity className="h-4 w-4 text-green-600" />
            </div>
            <div className="text-2xl font-bold">{displayStats.activity.today}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {displayStats.activity.week} this week
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}