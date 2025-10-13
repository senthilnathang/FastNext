"use client"

import * as React from "react"
import { ViewManager, ViewConfig, Column } from '@/shared/components/views'
import { AlertTriangle, RefreshCw, Calendar, Clock, AlertCircle, Info } from "lucide-react"

import {
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert,
  AlertDescription
} from "@/shared/components"
import type { SortOption, GroupOption } from '@/shared/components/ui'

// Import event hooks and types
import { useEvents, useEventStatistics, useExportEvents } from "@/modules/admin/hooks/useEvents"
import type { EventResponse } from "@/modules/admin/types/events"

// Import dialogs
import { EventDetailDialog } from "@/modules/admin/components/EventDetailDialog"

type EventsPageProps = Record<string, never>

const EventsPage: React.FC<EventsPageProps> = () => {
  // ViewManager state
  const [activeView, setActiveView] = React.useState('events-list')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [filters, setFilters] = React.useState<Record<string, any>>({})
  const [sortBy, setSortBy] = React.useState<string>('timestamp')
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc')
  const [groupBy, setGroupBy] = React.useState<string>('')
  const [selectedItems, setSelectedItems] = React.useState<EventResponse[]>([])
  
  // State
  const [selectedEvent, setSelectedEvent] = React.useState<EventResponse | null>(null)
  const [timeRange, setTimeRange] = React.useState<number>(24) // Hours
  const [autoRefresh, setAutoRefresh] = React.useState<boolean>(false)
  const [refreshInterval] = React.useState<number>(30) // Seconds

  // Queries
  const { 
    data: eventsData, 
    isLoading: eventsLoading, 
    error: eventsError,
    refetch: refetchEvents 
  } = useEvents()
  
   const { mutate: exportEvents } = useExportEvents()

  // Level configuration
  const getLevelConfig = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return { variant: 'destructive' as const, icon: <AlertTriangle className="h-3 w-3" /> }
      case 'warning':
        return { variant: 'secondary' as const, icon: <AlertCircle className="h-3 w-3" /> }
      case 'info':
        return { variant: 'default' as const, icon: <Info className="h-3 w-3" /> }
      case 'debug':
        return { variant: 'outline' as const, icon: <Clock className="h-3 w-3" /> }
      default:
        return { variant: 'default' as const, icon: <Info className="h-3 w-3" /> }
    }
  }

  // Category icon helper
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'authentication': return '🔐'
      case 'user_management': return '👥'
      case 'system': return '⚙️'
      case 'api': return '🔌'
      case 'database': return '🗄️'
      default: return '📄'
    }
  }

  // Define columns for the ViewManager
  const columns: Column[] = React.useMemo(() => [
    {
      id: 'timestamp',
      key: 'timestamp',
      label: 'Time',
      sortable: true,
      render: (value) => {
        const date = new Date(value as string)
        return (
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              <div className="font-medium">{date.toLocaleDateString()}</div>
              <div className="text-muted-foreground">{date.toLocaleTimeString()}</div>
            </div>
          </div>
        )
      },
    },
    {
      id: 'level',
      key: 'level',
      label: 'Level',
      sortable: true,
      filterable: true,
      type: 'select',
      filterOptions: [
        { label: 'Info', value: 'info' },
        { label: 'Warning', value: 'warning' },
        { label: 'Error', value: 'error' },
        { label: 'Debug', value: 'debug' }
      ],
      render: (value) => {
        const level = value as string
        const config = getLevelConfig(level)
        return (
          <Badge variant={config.variant} className="capitalize">
            {config.icon} {level}
          </Badge>
        )
      },
    },
    {
      id: 'category',
      key: 'category',
      label: 'Category',
      sortable: true,
      filterable: true,
      type: 'select',
      filterOptions: [
        { label: 'Authentication', value: 'authentication' },
        { label: 'User Management', value: 'user_management' },
        { label: 'System', value: 'system' },
        { label: 'API', value: 'api' },
        { label: 'Database', value: 'database' }
      ],
      render: (value) => {
        const category = value as string
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
      id: 'action',
      key: 'action',
      label: 'Action',
      sortable: true,
      searchable: true,
      render: (value) => (
        <Badge variant="outline" className="capitalize">
          {(value as string).replace('_', ' ')}
        </Badge>
      ),
    },
    {
      id: 'description',
      key: 'description',
      label: 'Description',
      searchable: true,
      render: (value) => (
        <div className="max-w-md">
          <p className="text-sm font-medium truncate" title={value as string}>
            {value as string}
          </p>
        </div>
      ),
    },
    {
      id: 'user',
      key: 'user',
      label: 'User',
      sortable: true,
      render: (value) => {
        const user = value as EventResponse['user']
        return user ? (
          <div className="text-sm">
            <div className="font-medium">{user.username}</div>
            <div className="text-muted-foreground">ID: {user.id}</div>
          </div>
        ) : (
          <span className="text-muted-foreground">System</span>
        )
      },
    }
  ], [])

  // Define sort options
  const sortOptions: SortOption[] = React.useMemo(() => [
    {
      key: 'timestamp',
      label: 'Time',
      defaultOrder: 'desc'
    },
    {
      key: 'level',
      label: 'Level',
      defaultOrder: 'desc'
    },
    {
      key: 'category',
      label: 'Category',
      defaultOrder: 'asc'
    },
    {
      key: 'action',
      label: 'Action',
      defaultOrder: 'asc'
    }
  ], [])

  // Define group options
  const groupOptions: GroupOption[] = React.useMemo(() => [
    {
      key: 'level',
      label: 'Level',
      icon: <AlertTriangle className="h-4 w-4" />
    },
    {
      key: 'category',
      label: 'Category',
      icon: <Info className="h-4 w-4" />
    }
  ], [])

  // Define available views
  const views: ViewConfig[] = React.useMemo(() => [
    {
      id: 'events-card',
      name: 'Card View',
      type: 'card',
      columns,
      filters: {},
      sortBy: 'timestamp',
      sortOrder: 'desc'
    },
    {
      id: 'events-list',
      name: 'List View',
      type: 'list',
      columns,
      filters: {},
      sortBy: 'timestamp',
      sortOrder: 'desc'
    },
    {
      id: 'events-kanban',
      name: 'Kanban Board',
      type: 'kanban',
      columns,
      filters: {},
      groupBy: 'level'
    }
  ], [columns])

  // Auto-refresh effect
  React.useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      refetchEvents()
    }, refreshInterval * 1000)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, refetchEvents])

  // Prepare data
  const events = React.useMemo(() => {
    return (eventsData?.data || []).map((event, index) => ({
      ...event,
      id: (event as any).id || `event-${index}` // Ensure each event has an id
    }))
  }, [eventsData])

  // Handle actions
  const handleViewEvent = (event: EventResponse) => {
    setSelectedEvent(event)
  }

  const handleExport = (format: string) => {
    exportEvents({ format: format as "json" | "csv" })
  }

  const handleImport = () => {
    console.log('Import events')
    // TODO: Implement import
  }

  const bulkActions = [
    {
      label: 'Mark as Reviewed',
      action: (items: EventResponse[]) => {
        console.log('Mark as reviewed:', items)
        // TODO: Implement bulk review
      },
      variant: 'default' as const
    }
  ]

  if (eventsError) {
    return (
      <div className="container mx-auto py-6">
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
    <div className="container mx-auto py-6 space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>System Events</CardTitle>
              <p className="text-sm text-muted-foreground">
                Monitor and analyze system events and activities
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={timeRange.toString()}
                onValueChange={(value) => setTimeRange(Number(value))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Last 1 hour</SelectItem>
                  <SelectItem value="6">Last 6 hours</SelectItem>
                  <SelectItem value="24">Last 24 hours</SelectItem>
                  <SelectItem value="168">Last 7 days</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
                {autoRefresh ? 'Stop' : 'Auto'} Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchEvents()}
                disabled={eventsLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${eventsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold">{events.length}</div>
              <div className="text-sm text-muted-foreground">Total Events</div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {events.filter(e => e.level === 'error').length}
              </div>
              <div className="text-sm text-muted-foreground">Errors</div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {events.filter(e => e.level === 'warning').length}
              </div>
              <div className="text-sm text-muted-foreground">Warnings</div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {events.filter(e => e.level === 'info').length}
              </div>
              <div className="text-sm text-muted-foreground">Info</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events Management with ViewManager */}
      <ViewManager
        title="Events Management"
        subtitle="View and analyze system events with advanced filtering and search capabilities"
        data={events as any}
        columns={columns as any}
        views={views as any}
        activeView={activeView}
        onViewChange={setActiveView}
        loading={eventsLoading}
        error={eventsError ? (eventsError as any).message || String(eventsError) : null}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filters}
        onFiltersChange={setFilters}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={(field, order) => {
          setSortBy(field)
          setSortOrder(order)
        }}
        sortOptions={sortOptions}
        groupBy={groupBy}
        onGroupChange={setGroupBy}
        groupOptions={groupOptions}
        onExport={handleExport}
        onImport={handleImport}
        onViewClick={handleViewEvent as any}
        selectable={true}
        selectedItems={selectedItems as any}
        onSelectionChange={setSelectedItems as any}
        bulkActions={bulkActions as any}
        showToolbar={true}
        showSearch={true}
        showFilters={true}
        showExport={true}
        showImport={true}
      />

      {/* Event Detail Dialog */}
      {selectedEvent && (
        <EventDetailDialog
          event={selectedEvent}
          open={!!selectedEvent}
          onOpenChange={(open) => !open && setSelectedEvent(null)}
        />
      )}
    </div>
  )
}

export default EventsPage