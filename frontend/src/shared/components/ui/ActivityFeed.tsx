"use client"

import * as React from "react"
import { formatDistanceToNow } from "date-fns"
import {
  User,
  Edit,
  Trash2,
  Shield,
  Key,
  UserPlus,
  UserMinus,
  Settings,
  Eye,
  Clock,
  ChevronRight,
  Activity
} from "lucide-react"

import { cn } from "@/shared/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"

export interface ActivityItem {
  id: string
  type: 'user_created' | 'user_updated' | 'user_deleted' | 'role_created' | 'role_updated' | 'role_deleted' |
        'permission_created' | 'permission_updated' | 'permission_deleted' | 'login' | 'logout' | 'profile_updated' | 'settings_changed'
  actor: {
    id: number
    name: string
    username: string
    avatar_url?: string
  }
  target?: {
    id: number
    name: string
    type: 'user' | 'role' | 'permission' | 'setting'
  }
  description: string
  metadata?: Record<string, any>
  timestamp: string
  severity: 'low' | 'medium' | 'high'
}

interface ActivityFeedProps {
  activities?: ActivityItem[]
  loading?: boolean
  showHeader?: boolean
  maxItems?: number
  className?: string
  compact?: boolean
}

const activityIcons = {
  user_created: UserPlus,
  user_updated: Edit,
  user_deleted: UserMinus,
  role_created: Shield,
  role_updated: Edit,
  role_deleted: Trash2,
  permission_created: Key,
  permission_updated: Edit,
  permission_deleted: Trash2,
  login: User,
  logout: User,
  profile_updated: Settings,
  settings_changed: Settings,
} as const

const activityColors = {
  user_created: "text-green-600 bg-green-100 dark:bg-green-900/20",
  user_updated: "text-blue-600 bg-blue-100 dark:bg-blue-900/20",
  user_deleted: "text-red-600 bg-red-100 dark:bg-red-900/20",
  role_created: "text-purple-600 bg-purple-100 dark:bg-purple-900/20",
  role_updated: "text-blue-600 bg-blue-100 dark:bg-blue-900/20",
  role_deleted: "text-red-600 bg-red-100 dark:bg-red-900/20",
  permission_created: "text-orange-600 bg-orange-100 dark:bg-orange-900/20",
  permission_updated: "text-blue-600 bg-blue-100 dark:bg-blue-900/20",
  permission_deleted: "text-red-600 bg-red-100 dark:bg-red-900/20",
  login: "text-green-600 bg-green-100 dark:bg-green-900/20",
  logout: "text-gray-600 bg-gray-100 dark:bg-gray-900/20",
  profile_updated: "text-blue-600 bg-blue-100 dark:bg-blue-900/20",
  settings_changed: "text-blue-600 bg-blue-100 dark:bg-blue-900/20",
} as const

const severityColors = {
  low: "border-l-gray-300",
  medium: "border-l-yellow-400",
  high: "border-l-red-400"
} as const

function ActivityIcon({ type, className }: { type: ActivityItem['type']; className?: string }) {
  const Icon = activityIcons[type] || Activity
  const colorClass = activityColors[type] || "text-gray-600 bg-gray-100"

  return (
    <div className={cn(
      "flex h-8 w-8 items-center justify-center rounded-full",
      colorClass,
      className
    )}>
      <Icon className="h-4 w-4" />
    </div>
  )
}

function ActivityItemComponent({
  activity,
  compact = false
}: {
  activity: ActivityItem
  compact?: boolean
}) {
  return (
    <div className={cn(
      "flex items-start space-x-3 border-l-2 pl-4 py-3",
      severityColors[activity.severity]
    )}>
      <ActivityIcon type={activity.type} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <p className={cn(
            "font-medium text-gray-900 dark:text-white",
            compact ? "text-sm" : "text-sm"
          )}>
            {activity.actor.name}
          </p>
          {activity.severity === 'high' && (
            <Badge variant="destructive" className="text-xs">
              High Priority
            </Badge>
          )}
        </div>

        <p className={cn(
          "text-gray-600 dark:text-gray-400 mt-1",
          compact ? "text-xs" : "text-sm"
        )}>
          {activity.description}
        </p>

        {activity.target && (
          <div className="flex items-center space-x-1 mt-1">
            <span className={cn(
              "text-gray-500 dark:text-gray-500",
              compact ? "text-xs" : "text-xs"
            )}>
              Target:
            </span>
            <Badge variant="outline" className="text-xs">
              {activity.target.name}
            </Badge>
          </div>
        )}

        <div className="flex items-center space-x-2 mt-2">
          <Clock className="h-3 w-3 text-gray-400" />
          <span className={cn(
            "text-gray-500 dark:text-gray-500",
            compact ? "text-xs" : "text-xs"
          )}>
            {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
          </span>
        </div>
      </div>

      {!compact && (
        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
          <Eye className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

// Mock data generator for demo
function generateMockActivities(): ActivityItem[] {
  const actors = [
    { id: 1, name: "John Doe", username: "john", avatar_url: undefined },
    { id: 2, name: "Jane Smith", username: "jane", avatar_url: undefined },
    { id: 3, name: "Admin User", username: "admin", avatar_url: undefined },
    { id: 4, name: "Bob Wilson", username: "bob", avatar_url: undefined },
  ]

  const activities: Omit<ActivityItem, 'id' | 'timestamp'>[] = [
    {
      type: 'user_created',
      actor: actors[2],
      target: { id: 10, name: "Sarah Connor", type: 'user' },
      description: "Created a new user account",
      severity: 'medium'
    },
    {
      type: 'role_updated',
      actor: actors[2],
      target: { id: 5, name: "Moderator", type: 'role' },
      description: "Updated role permissions",
      severity: 'high'
    },
    {
      type: 'login',
      actor: actors[0],
      description: "Logged into the system",
      severity: 'low'
    },
    {
      type: 'permission_created',
      actor: actors[2],
      target: { id: 15, name: "Export Data", type: 'permission' },
      description: "Created new permission for data export",
      severity: 'medium'
    },
    {
      type: 'user_deleted',
      actor: actors[2],
      target: { id: 8, name: "Inactive User", type: 'user' },
      description: "Removed inactive user account",
      severity: 'high'
    },
    {
      type: 'profile_updated',
      actor: actors[1],
      description: "Updated profile information",
      severity: 'low'
    },
    {
      type: 'role_created',
      actor: actors[2],
      target: { id: 6, name: "Content Editor", type: 'role' },
      description: "Created new role for content management",
      severity: 'medium'
    },
    {
      type: 'login',
      actor: actors[3],
      description: "Logged into the system",
      severity: 'low'
    }
  ]

  return activities.map((activity, index) => ({
    ...activity,
    id: `activity-${index}`,
    timestamp: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString() // Last 7 days
  }))
}

export function ActivityFeed({
  activities,
  loading = false,
  showHeader = true,
  maxItems = 10,
  className,
  compact = false
}: ActivityFeedProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)

  // Use mock data if no activities provided
  const mockActivities = React.useMemo(() => generateMockActivities(), [])
  const displayActivities = activities || mockActivities

  // Sort by timestamp (newest first)
  const sortedActivities = React.useMemo(() =>
    [...displayActivities]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, isExpanded ? displayActivities.length : maxItems),
    [displayActivities, isExpanded, maxItems]
  )

  if (loading) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <Activity className="h-5 w-5 mr-2" />
              Recent Activity
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start space-x-3 animate-pulse">
              <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-lg">
              <Activity className="h-5 w-5 mr-2" />
              Recent Activity
            </CardTitle>
            <Badge variant="secondary">
              {displayActivities.length} events
            </Badge>
          </div>
        </CardHeader>
      )}

      <CardContent className={cn("space-y-1", compact ? "p-4" : "")}>
        {sortedActivities.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              No recent activity
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Activity will appear here as users interact with the system
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              {sortedActivities.map((activity) => (
                <div key={activity.id} className="group">
                  <ActivityItemComponent activity={activity} compact={compact} />
                </div>
              ))}
            </div>

            {displayActivities.length > maxItems && (
              <div className="pt-4 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="w-full"
                >
                  {isExpanded ? (
                    <>Show Less</>
                  ) : (
                    <>
                      Show {displayActivities.length - maxItems} More
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default ActivityFeed
