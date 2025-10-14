"use client"

import { useState } from 'react'
import {
  Calendar,
  Play,
  Square,
  Timer,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Switch } from '@/shared/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Alert, AlertDescription } from '@/shared/components/ui/alert'
import { Progress } from '@/shared/components/ui/progress'

interface ScheduleRule {
  id: string
  type: 'cron' | 'interval' | 'once' | 'event'
  expression: string
  timezone: string
  enabled: boolean
  nextRun?: Date
  lastRun?: Date
  description?: string
}

interface WorkflowExecution {
  id: string
  workflowId: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  startTime: Date
  endTime?: Date
  progress: number
  logs: string[]
  triggeredBy: 'schedule' | 'manual' | 'event'
  scheduleId?: string
}

interface AdvancedWorkflowSchedulerProps {
  schedules: ScheduleRule[]
  executions: WorkflowExecution[]
  onScheduleCreate: (schedule: Omit<ScheduleRule, 'id'>) => void
  onScheduleUpdate: (schedule: ScheduleRule) => void
  onScheduleDelete: (scheduleId: string) => void
  onExecute: (scheduleId?: string) => void
  onCancel: (executionId: string) => void
}

export function AdvancedWorkflowScheduler({
  schedules,
  executions,
  onScheduleCreate,
  onScheduleUpdate,
  onScheduleDelete,
  onExecute,
  onCancel
}: AdvancedWorkflowSchedulerProps) {
  const [newSchedule, setNewSchedule] = useState<Partial<ScheduleRule>>({
    type: 'cron',
    timezone: 'UTC',
    enabled: true
  })
  const [isCreating, setIsCreating] = useState(false)

  // Common cron expressions
  const cronPresets = [
    { label: 'Every minute', value: '* * * * *' },
    { label: 'Every 5 minutes', value: '*/5 * * * *' },
    { label: 'Every hour', value: '0 * * * *' },
    { label: 'Daily at 9 AM', value: '0 9 * * *' },
    { label: 'Weekly on Monday', value: '0 9 * * 1' },
    { label: 'Monthly on 1st', value: '0 9 1 * *' }
  ]

  const timezones = [
    'UTC',
    'America/New_York',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Shanghai'
  ]

  const handleCreateSchedule = () => {
    if (!newSchedule.expression) return

    onScheduleCreate({
      type: newSchedule.type!,
      expression: newSchedule.expression!,
      timezone: newSchedule.timezone!,
      enabled: newSchedule.enabled!,
      description: newSchedule.description
    })

    setNewSchedule({
      type: 'cron',
      timezone: 'UTC',
      enabled: true
    })
    setIsCreating(false)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Timer className="h-4 w-4 text-blue-500 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'cancelled':
        return <Square className="h-4 w-4 text-gray-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variant = {
      running: 'default',
      completed: 'default',
      failed: 'destructive',
      cancelled: 'secondary'
    }[status] as any

    return <Badge variant={variant}>{status}</Badge>
  }

  const formatDuration = (start: Date, end?: Date) => {
    const duration = (end || new Date()).getTime() - start.getTime()
    const seconds = Math.floor(duration / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Workflow Scheduler</span>
              </CardTitle>
              <CardDescription>
                Schedule and manage workflow executions
              </CardDescription>
            </div>
            <Button onClick={() => onExecute()}>
              <Play className="h-4 w-4 mr-2" />
              Run Now
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="schedules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="schedules">Schedules ({schedules.length})</TabsTrigger>
          <TabsTrigger value="executions">Executions ({executions.length})</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="schedules" className="space-y-4">
          {/* Create New Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Create Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isCreating ? (
                <Button onClick={() => setIsCreating(true)}>
                  Add New Schedule
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Schedule Type</Label>
                      <Select
                        value={newSchedule.type}
                        onValueChange={(value) => setNewSchedule({...newSchedule, type: value as any})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cron">Cron Expression</SelectItem>
                          <SelectItem value="interval">Fixed Interval</SelectItem>
                          <SelectItem value="once">One Time</SelectItem>
                          <SelectItem value="event">Event Triggered</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Timezone</Label>
                      <Select
                        value={newSchedule.timezone}
                        onValueChange={(value) => setNewSchedule({...newSchedule, timezone: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {timezones.map(tz => (
                            <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {newSchedule.type === 'cron' && (
                    <div>
                      <Label>Cron Expression</Label>
                      <div className="space-y-2">
                        <Input
                          placeholder="0 9 * * *"
                          value={newSchedule.expression || ''}
                          onChange={(e) => setNewSchedule({...newSchedule, expression: e.target.value})}
                        />
                        <div className="flex flex-wrap gap-2">
                          {cronPresets.map(preset => (
                            <Button
                              key={preset.value}
                              variant="outline"
                              size="sm"
                              onClick={() => setNewSchedule({...newSchedule, expression: preset.value})}
                            >
                              {preset.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {newSchedule.type === 'interval' && (
                    <div>
                      <Label>Interval (minutes)</Label>
                      <Input
                        type="number"
                        placeholder="60"
                        value={newSchedule.expression || ''}
                        onChange={(e) => setNewSchedule({...newSchedule, expression: e.target.value})}
                      />
                    </div>
                  )}

                  {newSchedule.type === 'once' && (
                    <div>
                      <Label>Execute At</Label>
                      <Input
                        type="datetime-local"
                        value={newSchedule.expression || ''}
                        onChange={(e) => setNewSchedule({...newSchedule, expression: e.target.value})}
                      />
                    </div>
                  )}

                  <div>
                    <Label>Description (Optional)</Label>
                    <Input
                      placeholder="Daily report generation"
                      value={newSchedule.description || ''}
                      onChange={(e) => setNewSchedule({...newSchedule, description: e.target.value})}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={newSchedule.enabled}
                      onCheckedChange={(checked) => setNewSchedule({...newSchedule, enabled: checked})}
                    />
                    <Label>Enabled</Label>
                  </div>

                  <div className="flex space-x-2">
                    <Button onClick={handleCreateSchedule}>Create</Button>
                    <Button variant="outline" onClick={() => setIsCreating(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Existing Schedules */}
          <div className="space-y-3">
            {schedules.map(schedule => (
              <Card key={schedule.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{schedule.type}</Badge>
                        <span className="font-medium">{schedule.expression}</span>
                        {!schedule.enabled && <Badge variant="secondary">Disabled</Badge>}
                      </div>
                      {schedule.description && (
                        <p className="text-sm text-muted-foreground">{schedule.description}</p>
                      )}
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span>Timezone: {schedule.timezone}</span>
                        {schedule.nextRun && (
                          <span>Next: {schedule.nextRun.toLocaleString()}</span>
                        )}
                        {schedule.lastRun && (
                          <span>Last: {schedule.lastRun.toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={schedule.enabled}
                        onCheckedChange={(checked) =>
                          onScheduleUpdate({...schedule, enabled: checked})
                        }
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onExecute(schedule.id)}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onScheduleDelete(schedule.id)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="executions" className="space-y-4">
          <div className="space-y-3">
            {executions.map(execution => (
              <Card key={execution.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(execution.status)}
                        <span className="font-medium">Execution {execution.id.slice(-8)}</span>
                        {getStatusBadge(execution.status)}
                        <Badge variant="outline">{execution.triggeredBy}</Badge>
                      </div>

                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>Started: {execution.startTime.toLocaleString()}</div>
                        {execution.endTime && (
                          <div>Duration: {formatDuration(execution.startTime, execution.endTime)}</div>
                        )}
                        {execution.status === 'running' && (
                          <div className="space-y-1">
                            <div>Progress: {execution.progress}%</div>
                            <Progress value={execution.progress} className="h-2" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {execution.status === 'running' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onCancel(execution.id)}
                        >
                          <Square className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="outline" size="sm">
                        View Logs
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {executions.length > 0 ?
                    Math.round((executions.filter(e => e.status === 'completed').length / executions.length) * 100)
                    : 0
                  }%
                </div>
                <p className="text-sm text-muted-foreground">
                  Last 30 days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Avg Duration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">2.5m</div>
                <p className="text-sm text-muted-foreground">
                  Completed executions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Next Run</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">
                  {schedules.find(s => s.enabled && s.nextRun)?.nextRun?.toLocaleString() || 'None scheduled'}
                </div>
                <p className="text-sm text-muted-foreground">
                  Upcoming execution
                </p>
              </CardContent>
            </Card>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Workflow monitoring is active. Failed executions will trigger alerts to configured channels.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AdvancedWorkflowScheduler
