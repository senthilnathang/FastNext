'use client'

import React, { useState, useCallback, useMemo, useRef } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu'
import { 
  Plus, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

export interface GanttItem<T = any> {
  id: string | number
  title: string
  description?: string
  startDate: Date
  endDate: Date
  progress?: number
  status?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  assignee?: {
    id: string
    name: string
    avatar?: string
  }
  dependencies?: string[]
  data: T
}

export interface GanttViewProps<T = any> {
  // Data
  data: T[]
  loading?: boolean
  error?: string | null
  
  // Field mapping
  idField: keyof T | string
  titleField: keyof T | string
  startDateField: keyof T | string
  endDateField: keyof T | string
  progressField?: keyof T | string
  statusField?: keyof T | string
  priorityField?: keyof T | string
  
  // CRUD operations
  onCreateClick?: () => void
  onEditClick?: (item: T) => void
  onDeleteClick?: (item: T) => void
  onViewClick?: (item: T) => void
  onUpdateDates?: (itemId: string | number, startDate: Date, endDate: Date) => void
  onUpdateProgress?: (itemId: string | number, progress: number) => void
  
  // Custom rendering
  renderBlock?: (item: GanttItem<T>) => React.ReactNode
  renderSidebarItem?: (item: GanttItem<T>) => React.ReactNode
  
  // View options
  viewMode?: 'days' | 'weeks' | 'months'
  showWeekends?: boolean
  showProgress?: boolean
  showDependencies?: boolean
  allowResize?: boolean
  allowMove?: boolean
  
  // Permissions
  canCreate?: boolean
  canEdit?: boolean
  canDelete?: boolean
  
  // Custom actions
  customActions?: Array<{
    label: string
    icon?: React.ReactNode
    action: (item: T) => void
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  }>
}

const CELL_WIDTH = {
  days: 30,
  weeks: 40,
  months: 60
}

const SIDEBAR_WIDTH = 300
const ROW_HEIGHT = 50

export function GanttView<T extends Record<string, any>>({
  data,
  loading = false,
  error = null,
  idField,
  titleField,
  startDateField,
  endDateField,
  progressField,
  statusField,
  priorityField,
  onCreateClick,
  onEditClick,
  onDeleteClick,
  onViewClick,
  onUpdateDates,
  onUpdateProgress,
  renderBlock,
  renderSidebarItem,
  viewMode = 'weeks',
  showWeekends = false,
  showProgress = true,
  showDependencies = false,
  allowResize = true,
  allowMove = true,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  customActions = []
}: GanttViewProps<T>) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [internalViewMode, setInternalViewMode] = useState<'days' | 'weeks' | 'months'>(viewMode)
  const [dragState, setDragState] = useState<{
    isDragging: boolean
    itemId?: string | number
    startX?: number
    originalStart?: Date
    originalEnd?: Date
  }>({ isDragging: false })

  const containerRef = useRef<HTMLDivElement>(null)
  const cellWidth = CELL_WIDTH[internalViewMode]

  // Convert raw data to GanttItem format
  const ganttItems: GanttItem<T>[] = useMemo(() => {
    return data.map(item => ({
      id: item[idField as keyof T],
      title: String(item[titleField as keyof T] || ''),
      startDate: new Date(item[startDateField as keyof T] as string),
      endDate: new Date(item[endDateField as keyof T] as string),
      progress: progressField ? Number(item[progressField as keyof T]) || 0 : 0,
      status: statusField ? String(item[statusField as keyof T] || '') : undefined,
      priority: priorityField ? (item[priorityField as keyof T] as any) : undefined,
      data: item
    }))
  }, [data, idField, titleField, startDateField, endDateField, progressField, statusField, priorityField])

  // Calculate date range for the timeline
  const dateRange = useMemo(() => {
    if (ganttItems.length === 0) {
      const start = new Date()
      const end = new Date()
      end.setMonth(start.getMonth() + 3)
      return { start, end }
    }

    const allDates = ganttItems.flatMap(item => [item.startDate, item.endDate])
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())))
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())))

    // Add padding
    const start = new Date(minDate)
    start.setDate(start.getDate() - 7)
    const end = new Date(maxDate)
    end.setDate(end.getDate() + 7)

    return { start, end }
  }, [ganttItems])

  // Generate timeline columns
  const timelineColumns = useMemo(() => {
    const columns = []
    const current = new Date(dateRange.start)
    
    while (current <= dateRange.end) {
      if (internalViewMode === 'days') {
        if (showWeekends || (current.getDay() !== 0 && current.getDay() !== 6)) {
          columns.push(new Date(current))
        }
        current.setDate(current.getDate() + 1)
      } else if (internalViewMode === 'weeks') {
        columns.push(new Date(current))
        current.setDate(current.getDate() + 7)
      } else if (internalViewMode === 'months') {
        columns.push(new Date(current))
        current.setMonth(current.getMonth() + 1)
      }
    }
    
    return columns
  }, [dateRange, internalViewMode, showWeekends])

  const formatColumnHeader = useCallback((date: Date) => {
    if (internalViewMode === 'days') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } else if (internalViewMode === 'weeks') {
      const weekEnd = new Date(date)
      weekEnd.setDate(weekEnd.getDate() + 6)
      return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    } else {
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }
  }, [internalViewMode])

  const getItemPosition = useCallback((item: GanttItem<T>) => {
    const startIndex = timelineColumns.findIndex(col => {
      if (internalViewMode === 'days') {
        return col.toDateString() === item.startDate.toDateString()
      } else if (internalViewMode === 'weeks') {
        const weekEnd = new Date(col)
        weekEnd.setDate(weekEnd.getDate() + 6)
        return item.startDate >= col && item.startDate <= weekEnd
      } else {
        return col.getMonth() === item.startDate.getMonth() && col.getFullYear() === item.startDate.getFullYear()
      }
    })

    const endIndex = timelineColumns.findIndex(col => {
      if (internalViewMode === 'days') {
        return col.toDateString() === item.endDate.toDateString()
      } else if (internalViewMode === 'weeks') {
        const weekEnd = new Date(col)
        weekEnd.setDate(weekEnd.getDate() + 6)
        return item.endDate >= col && item.endDate <= weekEnd
      } else {
        return col.getMonth() === item.endDate.getMonth() && col.getFullYear() === item.endDate.getFullYear()
      }
    })

    const left = startIndex >= 0 ? startIndex * cellWidth : 0
    const width = Math.max(cellWidth, (endIndex - startIndex + 1) * cellWidth)

    return { left, width }
  }, [timelineColumns, cellWidth, internalViewMode])

  const handleMouseDown = useCallback((e: React.MouseEvent, item: GanttItem<T>) => {
    if (!allowMove && !allowResize) return

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    setDragState({
      isDragging: true,
      itemId: item.id,
      startX: e.clientX - rect.left,
      originalStart: item.startDate,
      originalEnd: item.endDate
    })

    e.preventDefault()
  }, [allowMove, allowResize])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState.isDragging || !dragState.itemId) return

    // Handle drag logic here
    // This would update the item position temporarily
    e.preventDefault()
  }, [dragState])

  const handleMouseUp = useCallback(() => {
    if (dragState.isDragging && dragState.itemId && onUpdateDates) {
      // Calculate new dates based on final position
      // onUpdateDates(dragState.itemId, newStartDate, newEndDate)
    }

    setDragState({ isDragging: false })
  }, [dragState, onUpdateDates])

  const renderGanttBlock = useCallback((item: GanttItem<T>) => {
    const position = getItemPosition(item)
    
    if (renderBlock) {
      return renderBlock(item)
    }

    const statusColors = {
      'todo': '#94a3b8',
      'in_progress': '#3b82f6',
      'review': '#f59e0b',
      'done': '#10b981'
    }

    const priorityColors = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#ef4444',
      urgent: '#dc2626'
    }

    const statusColor = item.status ? statusColors[item.status as keyof typeof statusColors] || '#94a3b8' : '#94a3b8'
    const priorityColor = item.priority ? priorityColors[item.priority] : '#94a3b8'

    return (
      <div
        className="absolute top-1 bottom-1 rounded-md cursor-pointer group hover:shadow-md transition-all"
        style={{
          left: position.left,
          width: position.width,
          backgroundColor: statusColor,
          minWidth: cellWidth
        }}
        onMouseDown={(e) => handleMouseDown(e, item)}
      >
        {/* Progress bar */}
        {showProgress && item.progress !== undefined && (
          <div
            className="absolute top-0 bottom-0 bg-black bg-opacity-20 rounded-l-md"
            style={{ width: `${item.progress}%` }}
          />
        )}
        
        {/* Content */}
        <div className="flex items-center h-full px-2 text-white text-sm font-medium">
          <span className="truncate">{item.title}</span>
          {item.priority && (
            <div
              className="w-2 h-2 rounded-full ml-2 flex-shrink-0"
              style={{ backgroundColor: priorityColor }}
            />
          )}
        </div>

        {/* Actions */}
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-white hover:bg-white hover:bg-opacity-20">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onViewClick && (
                <DropdownMenuItem onClick={() => onViewClick(item.data)}>
                  <Eye className="h-3 w-3 mr-2" />
                  View
                </DropdownMenuItem>
              )}
              {canEdit && onEditClick && (
                <DropdownMenuItem onClick={() => onEditClick(item.data)}>
                  <Edit className="h-3 w-3 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {customActions.map((action, index) => (
                <DropdownMenuItem
                  key={index}
                  onClick={() => action.action(item.data)}
                >
                  {action.icon}
                  {action.label}
                </DropdownMenuItem>
              ))}
              {canDelete && onDeleteClick && (
                <DropdownMenuItem 
                  onClick={() => onDeleteClick(item.data)}
                  className="text-destructive"
                >
                  <Trash2 className="h-3 w-3 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    )
  }, [getItemPosition, renderBlock, showProgress, cellWidth, handleMouseDown, onViewClick, canEdit, onEditClick, customActions, canDelete, onDeleteClick])

  const renderSidebarBlock = useCallback((item: GanttItem<T>) => {
    if (renderSidebarItem) {
      return renderSidebarItem(item)
    }

    return (
      <div className="flex items-center h-full px-3 border-b border-border">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{item.title}</div>
          {item.status && (
            <Badge variant="secondary" className="text-xs mt-1">
              {item.status}
            </Badge>
          )}
        </div>
        {item.priority && (
          <div className="ml-2">
            <Badge 
              variant={item.priority === 'urgent' || item.priority === 'high' ? 'destructive' : 'secondary'}
              className="text-xs"
            >
              {item.priority}
            </Badge>
          </div>
        )}
      </div>
    )
  }, [renderSidebarItem])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading Gantt chart...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive mb-2">Error loading Gantt chart</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newDate = new Date(currentDate)
                if (internalViewMode === 'days') newDate.setDate(newDate.getDate() - 7)
                else if (internalViewMode === 'weeks') newDate.setDate(newDate.getDate() - 28)
                else newDate.setMonth(newDate.getMonth() - 3)
                setCurrentDate(newDate)
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[100px] text-center">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newDate = new Date(currentDate)
                if (internalViewMode === 'days') newDate.setDate(newDate.getDate() + 7)
                else if (internalViewMode === 'weeks') newDate.setDate(newDate.getDate() + 28)
                else newDate.setMonth(newDate.getMonth() + 3)
                setCurrentDate(newDate)
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1 border rounded-md">
            {(['days', 'weeks', 'months'] as const).map((mode) => (
              <Button
                key={mode}
                variant={internalViewMode === mode ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setInternalViewMode(mode)}
                className="rounded-none first:rounded-l-md last:rounded-r-md"
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {canCreate && onCreateClick && (
          <Button onClick={onCreateClick}>
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        )}
      </div>

      {/* Gantt Chart */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div 
          className="border-r border-border bg-muted/50 overflow-y-auto"
          style={{ width: SIDEBAR_WIDTH }}
        >
          {/* Sidebar Header */}
          <div className="h-12 border-b border-border flex items-center px-3 bg-background font-medium text-sm">
            Tasks ({ganttItems.length})
          </div>
          
          {/* Sidebar Items */}
          <div>
            {ganttItems.map((item, index) => (
              <div
                key={item.id}
                style={{ height: ROW_HEIGHT }}
                className="hover:bg-muted/50 transition-colors"
              >
                {renderSidebarBlock(item)}
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-auto"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Timeline Header */}
          <div className="h-12 border-b border-border bg-background sticky top-0 z-10">
            <div className="flex">
              {timelineColumns.map((date, index) => (
                <div
                  key={index}
                  className="border-r border-border flex items-center justify-center text-xs font-medium bg-background"
                  style={{ width: cellWidth, minWidth: cellWidth }}
                >
                  {formatColumnHeader(date)}
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Grid */}
          <div className="relative">
            {/* Grid Lines */}
            <div className="absolute inset-0">
              {timelineColumns.map((_, index) => (
                <div
                  key={index}
                  className="absolute top-0 bottom-0 border-r border-border border-opacity-50"
                  style={{ left: index * cellWidth }}
                />
              ))}
              {ganttItems.map((_, index) => (
                <div
                  key={index}
                  className="absolute left-0 right-0 border-b border-border border-opacity-50"
                  style={{ top: (index + 1) * ROW_HEIGHT }}
                />
              ))}
            </div>

            {/* Gantt Blocks */}
            {ganttItems.map((item, index) => (
              <div
                key={item.id}
                className="relative"
                style={{ 
                  height: ROW_HEIGHT,
                  top: index * ROW_HEIGHT
                }}
              >
                {renderGanttBlock(item)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}