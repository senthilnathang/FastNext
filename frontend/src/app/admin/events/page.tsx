"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Download, Filter, Calendar, Activity, AlertTriangle, Shield, UserCheck, Eye, RefreshCw } from "lucide-react"

import { 
  Button,
  DataTable,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  AdvancedSearch,
  type SearchState,
  type SearchFilter,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert,
  AlertDescription
} from "@/shared/components"
import { useAdvancedSearch } from "@/shared/hooks/useAdvancedSearch"

// Import event hooks and types
import { useEvents, useEventStatistics, useExportEvents } from "@/modules/admin/hooks/useEvents"
import type { EventResponse, EventStatistics as EventStatsType } from "@/modules/admin/types/events"

// Import dialogs
import { EventDetailDialog } from "@/modules/admin/components/EventDetailDialog"

type EventsPageProps = Record<string, never>

const EventsPage: React.FC<EventsPageProps> = () => {
  // State
  const [selectedEvent, setSelectedEvent] = React.useState<EventResponse | null>(null)
  const [timeRange, setTimeRange] = React.useState<number>(24) // Hours
  const [autoRefresh, setAutoRefresh] = React.useState<boolean>(false)
  const [refreshInterval, setRefreshInterval] = React.useState<number>(30) // Seconds

  // Queries
  const { 
    data: eventsData, 
    isLoading: eventsLoading, 
    error: eventsError,
    refetch: refetchEvents
  } = useEvents({
    page: 1,
    limit: 100
  })

  const {
    data: statisticsData,
    isLoading: statsLoading,
    refetch: refetchStats
  } = useEventStatistics(timeRange)

  // Export mutation
  const exportEventsMutation = useExportEvents()

  // Advanced search setup
  const availableFilters: Omit<SearchFilter, 'value'>[] = [
    {
      id: 'level',
      field: 'level',
      label: 'Level',
      type: 'select',
      options: [
        { value: 'debug', label: 'Debug' },
        { value: 'info', label: 'Info' },
        { value: 'warning', label: 'Warning' },
        { value: 'error', label: 'Error' },
        { value: 'critical', label: 'Critical' }
      ]
    },
    {
      id: 'category',
      field: 'category',
      label: 'Category',
      type: 'select',
      options: [
        { value: 'authentication', label: 'Authentication' },
        { value: 'authorization', label: 'Authorization' },
        { value: 'user_management', label: 'User Management' },
        { value: 'data_management', label: 'Data Management' },
        { value: 'system_management', label: 'System Management' },
        { value: 'security', label: 'Security' },
        { value: 'workflow', label: 'Workflow' },
        { value: 'api', label: 'API' },
        { value: 'file_management', label: 'File Management' },
        { value: 'configuration', label: 'Configuration' }
      ]
    },
    {
      id: 'action',
      field: 'action',
      label: 'Action',
      type: 'select',
      options: [
        { value: 'create', label: 'Create' },
        { value: 'read', label: 'Read' },
        { value: 'update', label: 'Update' },
        { value: 'delete', label: 'Delete' },
        { value: 'login', label: 'Login' },
        { value: 'logout', label: 'Logout' },
        { value: 'export', label: 'Export' },
        { value: 'import', label: 'Import' },
        { value: 'security_event', label: 'Security Event' },
        { value: 'api_call', label: 'API Call' }
      ]
    },
    {
      id: 'user_id',
      field: 'user_id',
      label: 'User ID',
      type: 'text'
    },
    {
      id: 'date_range',
      field: 'timestamp',
      label: 'Date Range',
      type: 'daterange'
    },
    {
      id: 'risk_score',
      field: 'riskScore',
      label: 'Risk Score',
      type: 'select',
      options: [
        { value: 'low', label: 'Low (0-30)' },
        { value: 'medium', label: 'Medium (31-70)' },
        { value: 'high', label: 'High (71-100)' }
      ]
    }
  ]

  const availableSorts = [
    { field: 'timestamp', label: 'Timestamp' },
    { field: 'level', label: 'Level' },
    { field: 'category', label: 'Category' },
    { field: 'action', label: 'Action' },
    { field: 'riskScore', label: 'Risk Score' }
  ]

  const {
    searchState,
    updateSearchState,
    hasActiveSearch
  } = useAdvancedSearch({
    initialPageSize: 50,
    onSearch: (state: SearchState) => {
      console.log('Event search state changed:', state)
      // TODO: Implement API call with search parameters
    }
  })

  // Auto-refresh effect
  React.useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      refetchEvents()
      refetchStats()
    }, refreshInterval * 1000)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, refetchEvents, refetchStats])

  // Event level configuration
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

  // Category icons
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

  // Export handlers
  const handleExportEvents = (format: 'json' | 'csv') => {
    exportEventsMutation.mutate({
      format,
      ...searchState // Include current filters in export
    })
  }

  // Table columns
  const columns: ColumnDef<EventResponse>[] = React.useMemo(() => [
    {
      accessorKey: "timestamp",
      header: "Time",
      cell: ({ row }) => {
        const timestamp = row.getValue("timestamp") as string
        const date = new Date(timestamp)
        return (
          <div className="text-sm">
            <div className="font-medium">{date.toLocaleDateString()}</div>
            <div className="text-muted-foreground">{date.toLocaleTimeString()}</div>
          </div>
        )
      },
    },
    {
      accessorKey: "level",
      header: "Level",
      cell: ({ row }) => {
        const level = row.getValue("level") as string
        const config = getLevelConfig(level)
        return (
          <Badge variant={config.variant} className="capitalize">
            {config.icon} {level}
          </Badge>
        )
      },
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => {
        const category = row.getValue("category") as string
        const icon = getCategoryIcon(category)
        return (
          <div className="flex items-center gap-2">
            <span>{icon}</span>
            <span className="capitalize text-sm">
              {category.replace('_', ' ')}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => {
        const action = row.getValue("action") as string
        return (
          <Badge variant="outline" className="capitalize">
            {action.replace('_', ' ')}
          </Badge>
        )
      },
    },
    {
      accessorKey: "user",
      header: "User",
      cell: ({ row }) => {
        const user = row.getValue("user") as EventResponse['user']
        return user ? (
          <div className="text-sm">
            <div className="font-medium">{user.username}</div>
            <div className="text-muted-foreground">ID: {user.id}</div>
          </div>
        ) : (
          <span className="text-muted-foreground">System</span>
        )
      },
    },
    {
      accessorKey: "entity",
      header: "Entity",
      cell: ({ row }) => {
        const entity = row.getValue("entity") as EventResponse['entity']
        return (
          <div className="text-sm">
            <div className="font-medium">{entity.type}</div>
            {entity.name && (
              <div className="text-muted-foreground truncate max-w-[150px]">
                {entity.name}
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "riskScore",
      header: "Risk",
      cell: ({ row }) => {
        const riskScore = row.getValue("riskScore") as number | null
        if (!riskScore) return <span className="text-muted-foreground">-</span>
        
        let variant: "default" | "secondary" | "destructive" = "default"
        if (riskScore > 70) variant = "destructive"
        else if (riskScore > 30) variant = "secondary"
        
        return (
          <Badge variant={variant}>
            {riskScore}/100
          </Badge>
        )
      },
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => {
        const description = row.getValue("description") as string
        return (
          <div className="max-w-[300px] text-sm truncate" title={description}>
            {description}
          </div>
        )
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const event = row.original
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedEvent(event)}
          >
            <Eye className="h-4 w-4" />
          </Button>
        )
      },
    },
  ], [])

  // Prepare data
  const events = React.useMemo(() => eventsData?.data || [], [eventsData])
  
  // Filter events based on search state
  const filteredEvents = React.useMemo(() => {
    if (!hasActiveSearch()) return events
    
    return events.filter(event => {
      // Apply search query
      if (searchState.query) {
        const query = searchState.query.toLowerCase()
        if (!(
          event.description.toLowerCase().includes(query) ||
          event.user?.username?.toLowerCase().includes(query) ||
          event.entity.type.toLowerCase().includes(query) ||
          event.entity.name?.toLowerCase().includes(query)
        )) {
          return false
        }
      }
      
      // Apply filters
      for (const filter of searchState.filters) {
        if (filter.value === undefined || filter.value === '') continue
        
        switch (filter.field) {
          case 'level':
            if (event.level !== filter.value) return false
            break
          case 'category':
            if (event.category !== filter.value) return false
            break
          case 'action':
            if (event.action !== filter.value) return false
            break
          case 'user_id':
            if (event.user?.id !== parseInt(filter.value as string)) return false
            break
          case 'riskScore':
            if (filter.value === 'low' && (event.riskScore || 0) > 30) return false
            if (filter.value === 'medium' && ((event.riskScore || 0) <= 30 || (event.riskScore || 0) > 70)) return false
            if (filter.value === 'high' && (event.riskScore || 0) <= 70) return false
            break
          case 'timestamp':
            if (filter.value?.from) {
              const eventDate = new Date(event.timestamp)
              const fromDate = new Date(filter.value.from)
              const toDate = filter.value.to ? new Date(filter.value.to) : new Date()
              if (eventDate < fromDate || eventDate > toDate) return false
            }
            break
        }
      }
      
      return true
    })
  }, [events, searchState, hasActiveSearch])

  // Statistics component
  const EventStatistics = ({ stats }: { stats: EventStatsType | undefined }) => {
    if (!stats) return null

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totals.events}</div>
            <p className="text-xs text-muted-foreground">
              Last {stats.timeRange.hours} hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totals.users}</div>
            <p className="text-xs text-muted-foreground">
              Unique users with events
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Critical Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.byLevel.critical || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Requires attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {Math.round(((stats.byLevel.error || 0) + (stats.byLevel.critical || 0)) / stats.totals.events * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Errors + Critical
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Handle errors
  if (eventsError) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load events: {eventsError.message}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Event Logs</h1>
            <p className="text-sm text-muted-foreground">
              Monitor system events, user activities, and security alerts in real-time.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Time Range Selector */}
            <Select value={timeRange.toString()} onValueChange={(value) => setTimeRange(parseInt(value))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last Hour</SelectItem>
                <SelectItem value="24">Last 24h</SelectItem>
                <SelectItem value="168">Last Week</SelectItem>
              </SelectContent>
            </Select>

            {/* Auto Refresh Toggle */}
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
              Auto Refresh
            </Button>

            {/* Export Dropdown */}
            <Select onValueChange={handleExportEvents}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Export" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">Export JSON</SelectItem>
                <SelectItem value="csv">Export CSV</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Statistics */}
        <EventStatistics stats={statisticsData} />

        {/* Search and Filters */}
        <AdvancedSearch
          searchState={searchState}
          onSearchChange={updateSearchState}
          availableFilters={availableFilters}
          availableSorts={availableSorts}
          placeholder="Search events by description, user, entity..."
          resultCount={filteredEvents.length}
          loading={eventsLoading}
        />

        {/* Events Table */}
        <Tabs defaultValue="events" className="w-full">
          <TabsList>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="events" className="space-y-4">
            <DataTable 
              columns={columns} 
              data={filteredEvents} 
              searchKey="description"
              enableSearch={false}
              loading={eventsLoading}
            />
          </TabsContent>
          
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Level Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Events by Level</CardTitle>
                </CardHeader>
                <CardContent>
                  {statisticsData && (
                    <div className="space-y-2">
                      {Object.entries(statisticsData.byLevel).map(([level, count]) => (
                        <div key={level} className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Badge variant={getLevelConfig(level).variant} className="w-16 justify-center">
                              {level}
                            </Badge>
                          </div>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Category Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Events by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  {statisticsData && (
                    <div className="space-y-2">
                      {Object.entries(statisticsData.byCategory).map(([category, count]) => (
                        <div key={category} className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span>{getCategoryIcon(category)}</span>
                            <span className="text-sm capitalize">
                              {category.replace('_', ' ')}
                            </span>
                          </div>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Users */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Active Users</CardTitle>
                </CardHeader>
                <CardContent>
                  {statisticsData?.topUsers && (
                    <div className="space-y-2">
                      {statisticsData.topUsers.slice(0, 10).map((user) => (
                        <div key={user.username} className="flex justify-between items-center">
                          <span className="text-sm">{user.username}</span>
                          <Badge variant="outline">{user.eventCount} events</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Critical Events */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Critical Events</CardTitle>
                </CardHeader>
                <CardContent>
                  {statisticsData?.criticalEvents && (
                    <div className="space-y-2">
                      {statisticsData.criticalEvents.slice(0, 5).map((event) => (
                        <div key={event.eventId} className="border-l-4 border-red-500 pl-3 py-2">
                          <div className="text-sm font-medium">{event.description}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(event.timestamp).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Event Detail Dialog */}
      <EventDetailDialog
        event={selectedEvent}
        open={!!selectedEvent}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
      />
    </div>
  )
}

export default EventsPage