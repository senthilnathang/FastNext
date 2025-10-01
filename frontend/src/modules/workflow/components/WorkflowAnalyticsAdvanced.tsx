"use client"

import { useState, useMemo } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Filter,
  Download,
  Calendar,
  Users,
  Zap
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Progress } from '@/shared/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
// DatePickerWithRange import removed - component doesn't exist

interface WorkflowMetrics {
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  averageDuration: number
  totalDuration: number
  activeWorkflows: number
  queuedExecutions: number
}

interface WorkflowExecution {
  id: string
  workflowId: string
  workflowName: string
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'queued'
  startTime: Date
  endTime?: Date
  duration?: number
  triggeredBy: string
  user?: string
  errorMessage?: string
}

interface WorkflowPerformance {
  workflowId: string
  workflowName: string
  executions: number
  successRate: number
  averageDuration: number
  lastExecuted: Date
  trend: 'up' | 'down' | 'stable'
}

interface WorkflowAnalyticsAdvancedProps {
  metrics: WorkflowMetrics
  executions: WorkflowExecution[]
  performance: WorkflowPerformance[]
  timeRange: 'today' | 'week' | 'month' | 'quarter'
  onTimeRangeChange: (range: string) => void
  onExport: () => void
}

export function WorkflowAnalyticsAdvanced({
  metrics,
  executions,
  performance,
  timeRange,
  onTimeRangeChange,
  onExport
}: WorkflowAnalyticsAdvancedProps) {
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  // Calculate derived metrics
  const derivedMetrics = useMemo(() => {
    const successRate = metrics.totalExecutions > 0 
      ? (metrics.successfulExecutions / metrics.totalExecutions) * 100 
      : 0

    const failureRate = metrics.totalExecutions > 0
      ? (metrics.failedExecutions / metrics.totalExecutions) * 100
      : 0

    const avgExecutionsPerDay = metrics.totalExecutions / 30 // Assuming 30-day period

    return {
      successRate,
      failureRate,
      avgExecutionsPerDay
    }
  }, [metrics])

  // Filter executions based on selected filters
  const filteredExecutions = useMemo(() => {
    return executions.filter(execution => {
      if (selectedWorkflow !== 'all' && execution.workflowId !== selectedWorkflow) {
        return false
      }
      if (selectedStatus !== 'all' && execution.status !== selectedStatus) {
        return false
      }
      return true
    })
  }, [executions, selectedWorkflow, selectedStatus])

  // Group executions by hour for timeline view
  const executionTimeline = useMemo(() => {
    const timeline: Record<string, number> = {}
    const now = new Date()
    
    // Initialize last 24 hours
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000)
      timeline[hour.toISOString().slice(0, 13)] = 0
    }

    // Count executions per hour
    filteredExecutions.forEach(execution => {
      const hourKey = execution.startTime.toISOString().slice(0, 13)
      if (timeline[hourKey] !== undefined) {
        timeline[hourKey]++
      }
    })

    return Object.entries(timeline).map(([hour, count]) => ({
      hour: new Date(hour + ':00:00').toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        hour12: true 
      }),
      count
    }))
  }, [filteredExecutions])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-500" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default',
      failed: 'destructive',
      running: 'default',
      cancelled: 'secondary',
      queued: 'outline'
    }[status] as any

    return <Badge variant={variants}>{status}</Badge>
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down':
        return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
      default:
        return <div className="h-4 w-4 bg-gray-300 rounded-full" />
    }
  }

  const formatDuration = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Workflow Analytics</h2>
          <p className="text-muted-foreground">
            Performance insights and execution metrics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={onTimeRangeChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={onExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center space-x-2">
              <Zap className="h-5 w-5 text-blue-500" />
              <span>Total Executions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.totalExecutions.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground">
              {derivedMetrics.avgExecutionsPerDay.toFixed(1)} per day avg
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Success Rate</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{derivedMetrics.successRate.toFixed(1)}%</div>
            <Progress value={derivedMetrics.successRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <span>Avg Duration</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatDuration(metrics.averageDuration)}</div>
            <p className="text-sm text-muted-foreground">
              Total: {formatDuration(metrics.totalDuration)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center space-x-2">
              <Users className="h-5 w-5 text-purple-500" />
              <span>Active Workflows</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.activeWorkflows}</div>
            <p className="text-sm text-muted-foreground">
              {metrics.queuedExecutions} queued
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="executions">Recent Executions</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Execution Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Successful</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{metrics.successfulExecutions}</div>
                      <div className="text-sm text-muted-foreground">
                        {derivedMetrics.successRate.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span>Failed</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{metrics.failedExecutions}</div>
                      <div className="text-sm text-muted-foreground">
                        {derivedMetrics.failureRate.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-yellow-500" />
                      <span>Queued</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{metrics.queuedExecutions}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Workflows */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Workflows</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {performance.slice(0, 5).map(workflow => (
                    <div key={workflow.workflowId} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium truncate">{workflow.workflowName}</div>
                        <div className="text-sm text-muted-foreground">
                          {workflow.executions} executions
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getTrendIcon(workflow.trend)}
                        <span className="text-sm font-medium">
                          {workflow.successRate.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Performance Metrics</CardTitle>
              <CardDescription>
                Detailed performance analysis for each workflow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performance.map(workflow => (
                  <div key={workflow.workflowId} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{workflow.workflowName}</h4>
                        <p className="text-sm text-muted-foreground">
                          Last executed: {workflow.lastExecuted.toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getTrendIcon(workflow.trend)}
                        <Badge variant="outline">
                          {workflow.successRate.toFixed(1)}% success
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Executions</span>
                        <div className="font-medium">{workflow.executions}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Avg Duration</span>
                        <div className="font-medium">{formatDuration(workflow.averageDuration)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Success Rate</span>
                        <div className="font-medium">{workflow.successRate.toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="executions" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center space-x-4">
            <Select value={selectedWorkflow} onValueChange={setSelectedWorkflow}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Workflows" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workflows</SelectItem>
                {performance.map(workflow => (
                  <SelectItem key={workflow.workflowId} value={workflow.workflowId}>
                    {workflow.workflowName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="queued">Queued</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Executions List */}
          <Card>
            <CardContent className="p-0">
              <div className="space-y-0">
                {filteredExecutions.slice(0, 20).map((execution, index) => (
                  <div 
                    key={execution.id} 
                    className={`p-4 ${index !== filteredExecutions.length - 1 ? 'border-b' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(execution.status)}
                          <span className="font-medium">{execution.workflowName}</span>
                          {getStatusBadge(execution.status)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Started: {execution.startTime.toLocaleString()}
                          {execution.duration && ` • Duration: ${formatDuration(execution.duration)}`}
                          {execution.user && ` • By: ${execution.user}`}
                        </div>
                        {execution.errorMessage && (
                          <div className="text-sm text-red-600">
                            Error: {execution.errorMessage}
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {execution.triggeredBy}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Execution Timeline (Last 24 Hours)</CardTitle>
              <CardDescription>
                Number of workflow executions per hour
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {executionTimeline.map((point, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="w-16 text-sm text-muted-foreground">
                      {point.hour}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="bg-blue-500 h-4 rounded"
                          style={{ 
                            width: `${Math.max((point.count / Math.max(...executionTimeline.map(p => p.count))) * 100, 2)}%` 
                          }}
                        />
                        <span className="text-sm font-medium">{point.count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default WorkflowAnalyticsAdvanced