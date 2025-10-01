import * as React from "react"
import { Calendar, Clock, User, Shield, Activity, MapPin, Server, AlertTriangle, Copy, ExternalLink } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  ScrollArea
} from "@/shared/components"
import { toast } from "sonner"
import type { EventResponse } from "../types/events"

interface EventDetailDialogProps {
  event: EventResponse | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const EventDetailDialog: React.FC<EventDetailDialogProps> = ({
  event,
  open,
  onOpenChange,
}) => {
  if (!event) return null

  // Helper functions
  const getLevelConfig = (level: string) => {
    const configs = {
      debug: { color: 'bg-gray-500', variant: 'secondary' as const, icon: '🔍' },
      info: { color: 'bg-blue-500', variant: 'default' as const, icon: 'ℹ️' },
      warning: { color: 'bg-yellow-500', variant: 'destructive' as const, icon: '⚠️' },
      error: { color: 'bg-red-500', variant: 'destructive' as const, icon: '❌' },
      critical: { color: 'bg-red-800', variant: 'destructive' as const, icon: '🚨' }
    }
    return configs[level as keyof typeof configs] || configs.info
  }

  const getCategoryIcon = (category: string) => {
    const icons = {
      authentication: '🔐',
      authorization: '🛡️',
      user_management: '👥',
      data_management: '📊',
      system_management: '⚙️',
      security: '🚨',
      workflow: '🔄',
      api: '🌐',
      file_management: '📁',
      configuration: '⚙️'
    }
    return icons[category as keyof typeof icons] || '📋'
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copied to clipboard`)
    }).catch(() => {
      toast.error(`Failed to copy ${label}`)
    })
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
      iso: date.toISOString()
    }
  }

  const formatJson = (obj: any) => {
    if (!obj) return 'null'
    return JSON.stringify(obj, null, 2)
  }

  const timestamp = formatTimestamp(event.timestamp)
  const levelConfig = getLevelConfig(event.level)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{getCategoryIcon(event.category)}</span>
            Event Details
            <Badge variant={levelConfig.variant} className="ml-2">
              {levelConfig.icon} {event.level}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Event ID: {event.eventId || 'N/A'}
            {event.correlationId && (
              <span className="ml-4">
                Correlation ID: {event.correlationId}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="request">Request</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
            <TabsTrigger value="raw">Raw Data</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[60vh]">
            <TabsContent value="overview" className="space-y-4">
              {/* Basic Event Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Event Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{timestamp.date}</span>
                        <Clock className="h-4 w-4 text-muted-foreground ml-2" />
                        <span>{timestamp.time}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(timestamp.iso, 'Timestamp')}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Category & Action</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="capitalize">
                          {event.category.replace('_', ' ')}
                        </Badge>
                        <Badge variant="secondary" className="capitalize">
                          {event.action.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    <p className="mt-1 text-sm bg-muted p-3 rounded-md">
                      {event.description}
                    </p>
                  </div>

                  {/* Risk Assessment */}
                  {(event.riskScore !== null || event.affectedUsersCount !== null) && (
                    <div className="grid grid-cols-2 gap-4">
                      {event.riskScore !== null && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Risk Score</label>
                          <div className="flex items-center gap-2 mt-1">
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                            <Badge variant={event.riskScore > 70 ? "destructive" : event.riskScore > 30 ? "secondary" : "default"}>
                              {event.riskScore}/100
                            </Badge>
                          </div>
                        </div>
                      )}

                      {event.affectedUsersCount !== null && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Affected Users</label>
                          <div className="flex items-center gap-2 mt-1">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{event.affectedUsersCount}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* User Information */}
              {event.user && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      User Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Username</label>
                        <div className="flex items-center gap-2 mt-1">
                          <span>{event.user.username}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(event.user!.username, 'Username')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">User ID</label>
                        <div className="flex items-center gap-2 mt-1">
                          <span>{event.user.id}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(event.user!.id.toString(), 'User ID')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Entity Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Entity Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Type</label>
                      <div className="mt-1">
                        <Badge variant="outline">{event.entity.type}</Badge>
                      </div>
                    </div>
                    {(event.entity.id || event.entity.name) && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          {event.entity.name ? 'Name' : 'ID'}
                        </label>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="truncate">{event.entity.name || event.entity.id}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(
                              event.entity.name || event.entity.id || '', 
                              event.entity.name ? 'Entity Name' : 'Entity ID'
                            )}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Location & System */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Location Information */}
                {event.location && (event.location.country || event.location.city) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Location
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {event.location.country && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Country</label>
                            <div className="mt-1">{event.location.country}</div>
                          </div>
                        )}
                        {event.location.city && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">City</label>
                            <div className="mt-1">{event.location.city}</div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* System Information */}
                {event.system && (event.system.server || event.system.environment || event.system.version) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Server className="h-4 w-4" />
                        System
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {event.system.server && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Server</label>
                            <div className="mt-1">{event.system.server}</div>
                          </div>
                        )}
                        {event.system.environment && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Environment</label>
                            <div className="mt-1">
                              <Badge variant="outline">{event.system.environment}</Badge>
                            </div>
                          </div>
                        )}
                        {event.system.version && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Version</label>
                            <div className="mt-1">{event.system.version}</div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Tags */}
              {event.tags && event.tags.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Tags</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {event.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="request" className="space-y-4">
              {event.request ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Request Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {event.request.method && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Method</label>
                          <div className="mt-1">
                            <Badge variant="outline">{event.request.method}</Badge>
                          </div>
                        </div>
                      )}
                      {event.request.statusCode && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Status Code</label>
                          <div className="mt-1">
                            <Badge variant={event.request.statusCode >= 400 ? "destructive" : "default"}>
                              {event.request.statusCode}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </div>

                    {event.request.path && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Path</label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="bg-muted px-2 py-1 rounded text-sm">
                            {event.request.path}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(event.request!.path!, 'Request Path')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      {event.request.ip && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">IP Address</label>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="bg-muted px-2 py-1 rounded text-sm">
                              {event.request.ip}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(event.request!.ip!, 'IP Address')}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                      {event.request.responseTime && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Response Time</label>
                          <div className="mt-1">
                            <Badge variant="outline">{event.request.responseTime}ms</Badge>
                          </div>
                        </div>
                      )}
                    </div>

                    {event.request.userAgent && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">User Agent</label>
                        <div className="mt-1">
                          <code className="bg-muted px-2 py-1 rounded text-sm block truncate">
                            {event.request.userAgent}
                          </code>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No request information available for this event.
                </div>
              )}
            </TabsContent>

            <TabsContent value="metadata" className="space-y-4">
              {event.metadata ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Event Metadata</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-muted p-4 rounded-md text-sm overflow-auto">
                      {formatJson(event.metadata)}
                    </pre>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No metadata available for this event.
                </div>
              )}
            </TabsContent>

            <TabsContent value="raw" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Raw Event Data
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(formatJson(event), 'Raw Event Data')}
                    >
                      <Copy className="h-3 w-3 mr-2" />
                      Copy All
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted p-4 rounded-md text-sm overflow-auto">
                    {formatJson(event)}
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}