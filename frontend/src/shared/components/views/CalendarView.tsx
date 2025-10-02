'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Input } from '@/shared/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu'
import { 
  Plus, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon
} from 'lucide-react'

export interface CalendarItem<T = any> {
  id: string | number
  title: string
  description?: string
  date: Date
  status?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  assignee?: {
    id: string
    name: string
    avatar?: string
  }
  data: T
}

export interface CalendarViewProps<T = any> {
  // Data
  data: T[]
  loading?: boolean
  error?: string | null
  
  // Field mapping
  idField: keyof T | string
  titleField: keyof T | string
  dateField: keyof T | string
  descriptionField?: keyof T | string
  statusField?: keyof T | string
  priorityField?: keyof T | string
  
  // CRUD operations
  onCreateClick?: (date?: Date) => void
  onEditClick?: (item: T) => void
  onDeleteClick?: (item: T) => void
  onViewClick?: (item: T) => void
  onDateChange?: (itemId: string | number, newDate: Date) => void
  
  // Quick add functionality
  enableQuickAdd?: boolean
  onQuickAdd?: (date: Date, title: string) => void
  
  // Custom rendering
  renderItem?: (item: CalendarItem<T>, date: Date) => React.ReactNode
  
  // View options
  view?: 'month' | 'week'
  showWeekends?: boolean
  showToday?: boolean
  allowDragDrop?: boolean
  
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

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export function CalendarView<T extends Record<string, any>>({
  data,
  loading = false,
  error = null,
  idField,
  titleField,
  dateField,
  descriptionField,
  statusField,
  priorityField,
  onCreateClick,
  onEditClick,
  onDeleteClick,
  onViewClick,
  onDateChange,
  enableQuickAdd = false,
  onQuickAdd,
  renderItem,
  view = 'month',
  showWeekends = true,
  showToday = true,
  allowDragDrop = true,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  customActions = []
}: CalendarViewProps<T>) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [quickAddStates, setQuickAddStates] = useState<Record<string, boolean>>({})
  const [quickAddValues, setQuickAddValues] = useState<Record<string, string>>({})
  const [draggedItem, setDraggedItem] = useState<CalendarItem<T> | null>(null)

  // Convert raw data to CalendarItem format
  const calendarItems: CalendarItem<T>[] = useMemo(() => {
    return data.map(item => ({
      id: item[idField as keyof T],
      title: String(item[titleField as keyof T] || ''),
      description: descriptionField ? String(item[descriptionField as keyof T] || '') : undefined,
      date: new Date(item[dateField as keyof T] as string),
      status: statusField ? String(item[statusField as keyof T] || '') : undefined,
      priority: priorityField ? (item[priorityField as keyof T] as any) : undefined,
      data: item
    }))
  }, [data, idField, titleField, dateField, descriptionField, statusField, priorityField])

  // Get calendar days for current view
  const calendarDays = useMemo(() => {
    const days = []
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    
    if (view === 'month') {
      // Get the first day of the week containing the first day of the month
      const startDate = new Date(startOfMonth)
      startDate.setDate(startDate.getDate() - startOfMonth.getDay())
      
      // Get 42 days (6 weeks) to fill the calendar grid
      for (let i = 0; i < 42; i++) {
        const date = new Date(startDate)
        date.setDate(startDate.getDate() + i)
        days.push(date)
      }
    } else {
      // Week view: get 7 days starting from the beginning of the week
      const startOfWeek = new Date(currentDate)
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek)
        date.setDate(startOfWeek.getDate() + i)
        days.push(date)
      }
    }
    
    return days
  }, [currentDate, view])

  // Group items by date
  const itemsByDate = useMemo(() => {
    const grouped: Record<string, CalendarItem<T>[]> = {}
    
    calendarItems.forEach(item => {
      const dateKey = item.date.toDateString()
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(item)
    })
    
    return grouped
  }, [calendarItems])

  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }, [])

  const navigateWeek = useCallback((direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setDate(newDate.getDate() - 7)
      } else {
        newDate.setDate(newDate.getDate() + 7)
      }
      return newDate
    })
  }, [])

  const isToday = useCallback((date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }, [])

  const isCurrentMonth = useCallback((date: Date) => {
    return date.getMonth() === currentDate.getMonth()
  }, [currentDate])

  const handleDragStart = useCallback((e: React.DragEvent, item: CalendarItem<T>) => {
    if (!allowDragDrop) return
    setDraggedItem(item)
    e.dataTransfer.effectAllowed = 'move'
  }, [allowDragDrop])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!allowDragDrop || !draggedItem) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [allowDragDrop, draggedItem])

  const handleDrop = useCallback((e: React.DragEvent, date: Date) => {
    if (!allowDragDrop || !draggedItem || !onDateChange) return
    e.preventDefault()
    
    const newDate = new Date(date)
    newDate.setHours(draggedItem.date.getHours(), draggedItem.date.getMinutes())
    
    onDateChange(draggedItem.id, newDate)
    setDraggedItem(null)
  }, [allowDragDrop, draggedItem, onDateChange])

  const handleQuickAdd = useCallback((date: Date) => {
    const dateKey = date.toDateString()
    const title = quickAddValues[dateKey]?.trim()
    if (title && onQuickAdd) {
      onQuickAdd(date, title)
      setQuickAddValues(prev => ({ ...prev, [dateKey]: '' }))
      setQuickAddStates(prev => ({ ...prev, [dateKey]: false }))
    }
  }, [quickAddValues, onQuickAdd])

  const toggleQuickAdd = useCallback((date: Date, show: boolean) => {
    const dateKey = date.toDateString()
    setQuickAddStates(prev => ({ ...prev, [dateKey]: show }))
    if (!show) {
      setQuickAddValues(prev => ({ ...prev, [dateKey]: '' }))
    }
  }, [])

  const renderCalendarItem = useCallback((item: CalendarItem<T>, date: Date) => {
    if (renderItem) {
      return renderItem(item, date)
    }

    const statusColors = {
      'todo': 'bg-gray-100 text-gray-800 border-gray-200',
      'in_progress': 'bg-blue-100 text-blue-800 border-blue-200',
      'review': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'done': 'bg-green-100 text-green-800 border-green-200'
    }

    const priorityColors = {
      low: 'border-l-green-500',
      medium: 'border-l-yellow-500',
      high: 'border-l-orange-500',
      urgent: 'border-l-red-500'
    }

    const statusClass = item.status ? statusColors[item.status as keyof typeof statusColors] || statusColors.todo : statusColors.todo
    const priorityClass = item.priority ? priorityColors[item.priority] : ''

    return (
      <div
        draggable={allowDragDrop && canEdit}
        onDragStart={(e) => handleDragStart(e, item)}
        className={`
          p-2 mb-1 rounded-md text-xs border-l-2 cursor-pointer hover:shadow-sm transition-shadow group
          ${statusClass} ${priorityClass}
        `}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{item.title}</div>
            {item.description && view === 'month' && (
              <div className="text-xs opacity-75 truncate mt-1">{item.description}</div>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
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
  }, [renderItem, allowDragDrop, canEdit, canDelete, view, handleDragStart, onViewClick, onEditClick, onDeleteClick, customActions])

  const renderDay = useCallback((date: Date) => {
    const dateKey = date.toDateString()
    const dayItems = itemsByDate[dateKey] || []
    const isCurrentMonthDay = isCurrentMonth(date)
    const isTodayDate = isToday(date)
    const isWeekend = date.getDay() === 0 || date.getDay() === 6
    const isQuickAddActive = quickAddStates[dateKey]

    return (
      <div
        key={dateKey}
        className={`
          border border-border min-h-[120px] p-2 relative
          ${view === 'week' ? 'min-h-[200px]' : ''}
          ${!showWeekends && isWeekend ? 'hidden' : ''}
          ${!isCurrentMonthDay ? 'bg-muted/30' : 'bg-background'}
          ${isTodayDate && showToday ? 'bg-blue-50 dark:bg-blue-950' : ''}
          hover:bg-muted/50 transition-colors
        `}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, date)}
      >
        {/* Day Header */}
        <div className="flex items-center justify-between mb-2">
          <span 
            className={`
              text-sm font-medium
              ${!isCurrentMonthDay ? 'text-muted-foreground' : ''}
              ${isTodayDate ? 'text-blue-600 font-bold' : ''}
            `}
          >
            {date.getDate()}
          </span>
          
          {canCreate && onCreateClick && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCreateClick(date)}
              className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Items */}
        <div className="space-y-1">
          {dayItems.map(item => (
            <div key={item.id}>
              {renderCalendarItem(item, date)}
            </div>
          ))}
        </div>

        {/* Quick Add */}
        {enableQuickAdd && canCreate && (
          <div className="absolute bottom-2 left-2 right-2">
            {isQuickAddActive ? (
              <div className="flex gap-1">
                <Input
                  placeholder="Add item..."
                  value={quickAddValues[dateKey] || ''}
                  onChange={(e) => setQuickAddValues(prev => ({ 
                    ...prev, 
                    [dateKey]: e.target.value 
                  }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleQuickAdd(date)
                    } else if (e.key === 'Escape') {
                      toggleQuickAdd(date, false)
                    }
                  }}
                  className="text-xs h-6"
                  autoFocus
                />
                <Button 
                  size="sm" 
                  onClick={() => handleQuickAdd(date)}
                  disabled={!quickAddValues[dateKey]?.trim()}
                  className="h-6 px-2 text-xs"
                >
                  Add
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleQuickAdd(date, true)}
                className="w-full h-6 text-xs text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }, [
    itemsByDate, isCurrentMonth, isToday, quickAddStates, showWeekends, showToday, view,
    handleDragOver, handleDrop, canCreate, onCreateClick, renderCalendarItem, enableQuickAdd,
    quickAddValues, handleQuickAdd, toggleQuickAdd
  ])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading calendar...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive mb-2">Error loading calendar</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => view === 'month' ? navigateMonth('prev') : navigateWeek('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <h2 className="text-lg font-semibold min-w-[150px] text-center">
              {view === 'month' 
                ? `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
                : `Week of ${currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
              }
            </h2>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => view === 'month' ? navigateMonth('next') : navigateWeek('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1 border rounded-md">
            {(['month', 'week'] as const).map((viewMode) => (
              <Button
                key={viewMode}
                variant={view === viewMode ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentDate(new Date())} // Reset to current date when changing view
                className="rounded-none first:rounded-l-md last:rounded-r-md"
              >
                {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
        </div>

        {canCreate && onCreateClick && (
          <Button onClick={() => onCreateClick()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        )}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto">
        {/* Week Header */}
        <div className={`grid grid-cols-7 border-b border-border sticky top-0 bg-background z-10`}>
          {WEEKDAYS.map((day, index) => {
            const isWeekendDay = index === 0 || index === 6
            if (!showWeekends && isWeekendDay) return null
            
            return (
              <div 
                key={day} 
                className="p-3 text-center font-medium text-sm border-r border-border last:border-r-0"
              >
                {day}
              </div>
            )
          })}
        </div>

        {/* Calendar Days */}
        <div className={`grid ${view === 'month' ? 'grid-rows-6' : 'grid-rows-1'} h-full`}>
          {view === 'month' ? (
            // Month view: 6 rows of 7 days
            Array.from({ length: 6 }, (_, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 h-full">
                {calendarDays.slice(weekIndex * 7, (weekIndex + 1) * 7).map(renderDay)}
              </div>
            ))
          ) : (
            // Week view: Single row of 7 days
            <div className="grid grid-cols-7 h-full">
              {calendarDays.map(renderDay)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}