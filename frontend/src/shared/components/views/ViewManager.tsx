'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuCheckboxItem } from '@/shared/components/ui/dropdown-menu'
import { Badge } from '@/shared/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/shared/components/ui/sheet'
import { SortControl, GroupControl } from '@/shared/components/ui'
import type { SortOption, GroupOption } from '@/shared/components/ui'
import { 
  LayoutGrid, 
  List, 
  Kanban, 
  Calendar, 
  BarChart3, 
  Search, 
  Filter, 
  SortAsc, 
  SortDesc, 
  Download, 
  Upload, 
  Columns,
  GripVertical,
  Eye,
  EyeOff
} from 'lucide-react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { KanbanView, KanbanColumn } from './KanbanView'
import { GanttView } from './GanttView'
import { CalendarView, CalendarItem } from './CalendarView'

export type ViewType = 'card' | 'list' | 'kanban' | 'gantt' | 'calendar' | 'cohort'

export interface Column<T = any> {
  id: string
  key: keyof T | string
  label: string
  render?: (value: unknown, row: T) => React.ReactNode
  sortable?: boolean
  filterable?: boolean
  searchable?: boolean
  width?: string
  visible?: boolean
  pinned?: boolean
  type?: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'custom'
  filterOptions?: Array<{ label: string; value: any }>
}

export interface ViewConfig {
  id: string
  name: string
  type: ViewType
  columns: Column[]
  filters: Record<string, any>
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  groupBy?: string
  pageSize?: number
}

export interface ViewManagerProps<T = any> {
  // Data
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  error?: string | null
  
  // Views
  views: ViewConfig[]
  activeView: string
  onViewChange: (viewId: string) => void
  onViewSave?: (view: ViewConfig) => void
  onViewDelete?: (viewId: string) => void
  
  // Search & Filtering
  searchQuery?: string
  onSearchChange?: (query: string) => void
  filters?: Record<string, any>
  onFiltersChange?: (filters: Record<string, any>) => void
  
  // Sorting
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  onSortChange?: (field: string, order: 'asc' | 'desc') => void
  sortOptions?: SortOption[]
  
  // Grouping
  groupBy?: string
  onGroupChange?: (field: string) => void
  groupOptions?: GroupOption[]
  
  // Export/Import
  onExport?: (format: 'csv' | 'json' | 'excel') => void
  onImport?: (file: File) => void
  
  // CRUD operations
  onCreateClick?: (columnId?: string) => void
  onEditClick?: (item: T) => void
  onDeleteClick?: (item: T) => void
  onViewClick?: (item: T) => void
  
  // Selection
  selectable?: boolean
  selectedItems?: T[]
  onSelectionChange?: (items: T[]) => void
  
  // Bulk actions
  bulkActions?: Array<{
    label: string
    icon?: React.ReactNode
    action: (items: T[]) => void
  }>
  
  // Customization
  title?: string
  subtitle?: string
  showToolbar?: boolean
  showSearch?: boolean
  showFilters?: boolean
  showExport?: boolean
  showImport?: boolean
  showColumnSelector?: boolean
  showViewSelector?: boolean
  
  // Kanban-specific props
  kanbanColumns?: KanbanColumn[]
  onMoveCard?: (cardId: string | number, sourceColumnId: string, targetColumnId: string) => void
  enableQuickAdd?: boolean
  onQuickAdd?: (columnId: string, title: string) => void
  kanbanGroupByField?: keyof T | string
  kanbanCardTitleField?: keyof T | string
  kanbanCardDescriptionField?: keyof T | string
  kanbanCardFields?: Array<{
    key: keyof T | string
    label: string
    render?: (value: unknown, item: T) => React.ReactNode
    type?: 'text' | 'badge' | 'date' | 'avatar' | 'priority'
  }>
  
  // Gantt-specific props
  ganttIdField?: keyof T | string
  ganttTitleField?: keyof T | string
  ganttStartDateField?: keyof T | string
  ganttEndDateField?: keyof T | string
  ganttProgressField?: keyof T | string
  ganttStatusField?: keyof T | string
  ganttPriorityField?: keyof T | string
  onUpdateDates?: (itemId: string | number, startDate: Date, endDate: Date) => void
  onUpdateProgress?: (itemId: string | number, progress: number) => void
  ganttViewMode?: 'days' | 'weeks' | 'months'
  showWeekends?: boolean
  showProgress?: boolean
  showDependencies?: boolean
  allowResize?: boolean
  allowMove?: boolean
  
  // Calendar-specific props
  calendarIdField?: keyof T | string
  calendarTitleField?: keyof T | string
  calendarDateField?: keyof T | string
  calendarDescriptionField?: keyof T | string
  calendarStatusField?: keyof T | string
  calendarPriorityField?: keyof T | string
  onDateChange?: (itemId: string | number, newDate: Date) => void
  calendarView?: 'month' | 'week'
  calendarShowWeekends?: boolean
  calendarShowToday?: boolean
  calendarAllowDragDrop?: boolean
  calendarEnableQuickAdd?: boolean
  onCalendarQuickAdd?: (date: Date, title: string) => void
}

export function ViewManager<T extends { id: number | string }>({
  data,
  columns: initialColumns,
  loading = false,
  error = null,
  views,
  activeView,
  onViewChange,
  onViewSave,
  onViewDelete,
  searchQuery = '',
  onSearchChange,
  filters = {},
  onFiltersChange,
  sortBy,
  sortOrder = 'asc',
  onSortChange,
  sortOptions = [],
  groupBy,
  onGroupChange,
  groupOptions = [],
  onExport,
  onImport,
  onCreateClick,
  onEditClick,
  onDeleteClick,
  onViewClick,
  selectable = false,
  selectedItems = [],
  onSelectionChange,
  bulkActions = [],
  title,
  subtitle,
  showToolbar = true,
  showSearch = true,
  showFilters = true,
  showExport = true,
  showImport = true,
  showColumnSelector = true,
  showViewSelector = true,
  kanbanColumns = [],
  onMoveCard,
  enableQuickAdd = false,
  onQuickAdd,
  kanbanGroupByField,
  kanbanCardTitleField,
  kanbanCardDescriptionField,
  kanbanCardFields = [],
  ganttIdField,
  ganttTitleField,
  ganttStartDateField,
  ganttEndDateField,
  ganttProgressField,
  ganttStatusField,
  ganttPriorityField,
  onUpdateDates,
  onUpdateProgress,
  ganttViewMode = 'weeks',
  showWeekends = false,
  showProgress = true,
  showDependencies = false,
  allowResize = true,
  allowMove = true,
  calendarIdField,
  calendarTitleField,
  calendarDateField,
  calendarDescriptionField,
  calendarStatusField,
  calendarPriorityField,
  onDateChange,
  calendarView = 'month',
  calendarShowWeekends = true,
  calendarShowToday = true,
  calendarAllowDragDrop = true,
  calendarEnableQuickAdd = false,
  onCalendarQuickAdd
}: ViewManagerProps<T>) {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery)
  const [columnOrder, setColumnOrder] = useState<string[]>(initialColumns.map(col => col.id))
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(initialColumns.filter(col => col.visible !== false).map(col => col.id))
  )
  const [showColumnManager, setShowColumnManager] = useState(false)
  const [showFilterPanel, setShowFilterPanel] = useState(false)

  const currentView = views.find(v => v.id === activeView)
  const currentViewType = currentView?.type || 'list'

  // Ordered and visible columns
  const orderedColumns = useMemo(() => {
    return columnOrder
      .map(id => initialColumns.find(col => col.id === id))
      .filter((col): col is Column<T> => col !== undefined && visibleColumns.has(col.id))
  }, [columnOrder, initialColumns, visibleColumns])

  // Filtered and sorted data
  const processedData = useMemo(() => {
    let result = [...data]

    // Apply search
    if (localSearchQuery) {
      const searchableColumns = orderedColumns.filter(col => col.searchable !== false)
      result = result.filter(item =>
        searchableColumns.some(col => {
          const value = item[col.key as keyof T]
          return String(value || '').toLowerCase().includes(localSearchQuery.toLowerCase())
        })
      )
    }

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        result = result.filter(item => {
          const itemValue = item[key as keyof T]
          if (Array.isArray(value)) {
            return value.includes(itemValue)
          }
          return itemValue === value
        })
      }
    })

    // Apply sorting
    if (sortBy) {
      result.sort((a, b) => {
        const aValue = a[sortBy as keyof T]
        const bValue = b[sortBy as keyof T]
        
        const comparison = String(aValue || '').localeCompare(String(bValue || ''))
        return sortOrder === 'asc' ? comparison : -comparison
      })
    }

    return result
  }, [data, localSearchQuery, filters, sortBy, sortOrder, orderedColumns])

  const handleSearchChange = useCallback((value: string) => {
    setLocalSearchQuery(value)
    onSearchChange?.(value)
  }, [onSearchChange])

  const handleSortChange = useCallback((field: string) => {
    const newOrder = sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc'
    onSortChange?.(field, newOrder)
  }, [sortBy, sortOrder, onSortChange])

  const handleColumnReorder = useCallback((result: DropResult) => {
    if (!result.destination) return

    const newOrder = Array.from(columnOrder)
    const [reorderedColumn] = newOrder.splice(result.source.index, 1)
    newOrder.splice(result.destination.index, 0, reorderedColumn)
    
    setColumnOrder(newOrder)
  }, [columnOrder])

  const handleColumnVisibilityChange = useCallback((columnId: string, visible: boolean) => {
    const newVisible = new Set(visibleColumns)
    if (visible) {
      newVisible.add(columnId)
    } else {
      newVisible.delete(columnId)
    }
    setVisibleColumns(newVisible)
  }, [visibleColumns])

  const handleExport = useCallback((format: 'csv' | 'json' | 'excel') => {
    onExport?.(format)
  }, [onExport])

  const handleImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && onImport) {
      onImport(file)
    }
  }, [onImport])

  const renderViewSelector = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          {currentViewType === 'card' && <LayoutGrid className="h-4 w-4 mr-2" />}
          {currentViewType === 'list' && <List className="h-4 w-4 mr-2" />}
          {currentViewType === 'kanban' && <Kanban className="h-4 w-4 mr-2" />}
          {currentViewType === 'gantt' && <BarChart3 className="h-4 w-4 mr-2" />}
          {currentViewType === 'calendar' && <Calendar className="h-4 w-4 mr-2" />}
          {currentViewType === 'cohort' && <BarChart3 className="h-4 w-4 mr-2" />}
          {currentView?.name || 'Select View'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {views.map(view => (
          <DropdownMenuItem
            key={view.id}
            onClick={() => onViewChange(view.id)}
            className={activeView === view.id ? 'bg-accent' : ''}
          >
            {view.type === 'card' && <LayoutGrid className="h-4 w-4 mr-2" />}
            {view.type === 'list' && <List className="h-4 w-4 mr-2" />}
            {view.type === 'kanban' && <Kanban className="h-4 w-4 mr-2" />}
            {view.type === 'gantt' && <BarChart3 className="h-4 w-4 mr-2" />}
            {view.type === 'calendar' && <Calendar className="h-4 w-4 mr-2" />}
            {view.type === 'cohort' && <BarChart3 className="h-4 w-4 mr-2" />}
            {view.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const renderColumnManager = () => (
    <Sheet open={showColumnManager} onOpenChange={setShowColumnManager}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Columns className="h-4 w-4 mr-2" />
          Columns
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Manage Columns</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-6">
          <DragDropContext onDragEnd={handleColumnReorder}>
            <Droppable droppableId="columns">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                  {columnOrder.map((columnId, index) => {
                    const column = initialColumns.find(col => col.id === columnId)
                    if (!column) return null

                    return (
                      <Draggable key={columnId} draggableId={columnId} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="flex items-center justify-between p-3 bg-background border rounded-lg"
                          >
                            <div className="flex items-center space-x-3">
                              <div {...provided.dragHandleProps}>
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <span className="font-medium">{column.label}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleColumnVisibilityChange(columnId, !visibleColumns.has(columnId))}
                            >
                              {visibleColumns.has(columnId) ? (
                                <Eye className="h-4 w-4" />
                              ) : (
                                <EyeOff className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        )}
                      </Draggable>
                    )
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      </SheetContent>
    </Sheet>
  )

  const renderFilterPanel = () => (
    <DropdownMenu open={showFilterPanel} onOpenChange={setShowFilterPanel}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {Object.keys(filters).length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {Object.keys(filters).length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 p-4">
        <div className="space-y-4">
          {orderedColumns
            .filter(col => col.filterable !== false)
            .map(column => (
              <div key={column.id} className="space-y-2">
                <label className="text-sm font-medium">{column.label}</label>
                {column.type === 'select' && column.filterOptions ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        {filters[column.key as string] || 'Select value...'}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {column.filterOptions.map(option => (
                        <DropdownMenuCheckboxItem
                          key={option.value}
                          checked={filters[column.key as string] === option.value}
                          onCheckedChange={(checked) => {
                            onFiltersChange?.({
                              ...filters,
                              [column.key as string]: checked ? option.value : undefined
                            })
                          }}
                        >
                          {option.label}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Input
                    placeholder={`Filter by ${column.label.toLowerCase()}...`}
                    value={filters[column.key as string] || ''}
                    onChange={(e) => {
                      onFiltersChange?.({
                        ...filters,
                        [column.key as string]: e.target.value || undefined
                      })
                    }}
                  />
                )}
              </div>
            ))}
          <DropdownMenuSeparator />
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onFiltersChange?.({})}
          >
            Clear All Filters
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const renderExportImport = () => (
    <div className="flex items-center space-x-2">
      {showExport && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleExport('csv')}>
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('json')}>
              Export as JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('excel')}>
              Export as Excel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      
      {showImport && (
        <div>
          <input
            type="file"
            id="import-file"
            className="hidden"
            accept=".csv,.json,.xlsx"
            onChange={handleImport}
          />
          <Button variant="outline" size="sm" asChild>
            <label htmlFor="import-file" className="cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </label>
          </Button>
        </div>
      )}
    </div>
  )

  const renderToolbar = () => (
    <div className="flex items-center justify-between space-x-4 mb-6">
      <div className="flex items-center space-x-4">
        {showViewSelector && renderViewSelector()}
        
        {showSearch && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search..."
              value={localSearchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        )}
        
        {showFilters && renderFilterPanel()}
        
        {sortOptions.length > 0 && onSortChange && (
          <SortControl
            options={sortOptions}
            value={sortBy}
            order={sortOrder}
            onChange={onSortChange}
          />
        )}
        
        {groupOptions.length > 0 && onGroupChange && (
          <GroupControl
            options={groupOptions}
            value={groupBy}
            onChange={onGroupChange}
          />
        )}
      </div>
      
      <div className="flex items-center space-x-2">
        {showColumnSelector && renderColumnManager()}
        {(showExport || showImport) && renderExportImport()}
        
        {bulkActions.length > 0 && selectedItems.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Actions ({selectedItems.length})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {bulkActions.map((action, index) => (
                <DropdownMenuItem
                  key={index}
                  onClick={() => action.action(selectedItems)}
                >
                  {action.icon}
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        
        {onCreateClick && (
          <Button onClick={() => onCreateClick()}>
            Create New
          </Button>
        )}
      </div>
    </div>
  )

  const renderCardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {processedData.map((item) => (
        <div key={item.id} className="bg-background border rounded-lg p-4 hover:shadow-md transition-shadow">
          {orderedColumns.slice(0, 3).map((column) => (
            <div key={column.id} className="mb-2">
              <span className="text-sm font-medium text-muted-foreground">{column.label}: </span>
              <span>{column.render ? column.render(item[column.key as keyof T], item) : String(item[column.key as keyof T] || '-')}</span>
            </div>
          ))}
          <div className="flex justify-end space-x-2 mt-4">
            {onViewClick && (
              <Button variant="outline" size="sm" onClick={() => onViewClick(item)}>
                View
              </Button>
            )}
            {onEditClick && (
              <Button variant="outline" size="sm" onClick={() => onEditClick(item)}>
                Edit
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  )

  const renderListView = () => (
    <div className="bg-background border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              {selectable && (
                <th className="w-12 p-4">
                  <input
                    type="checkbox"
                    checked={selectedItems.length === processedData.length && processedData.length > 0}
                    onChange={(e) => {
                      onSelectionChange?.(e.target.checked ? processedData : [])
                    }}
                  />
                </th>
              )}
              {orderedColumns.map((column) => (
                <th key={column.id} className="text-left p-4 font-medium">
                  <div className="flex items-center space-x-2">
                    <span>{column.label}</span>
                    {column.sortable !== false && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSortChange(column.key as string)}
                        className="h-auto p-0"
                      >
                        {sortBy === column.key ? (
                          sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
                        ) : (
                          <SortAsc className="h-4 w-4 opacity-50" />
                        )}
                      </Button>
                    )}
                  </div>
                </th>
              ))}
              <th className="w-32 p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {processedData.map((item) => (
              <tr key={item.id} className="border-t hover:bg-muted/50">
                {selectable && (
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedItems.some(selected => selected.id === item.id)}
                      onChange={(e) => {
                        const newSelection = e.target.checked
                          ? [...selectedItems, item]
                          : selectedItems.filter(selected => selected.id !== item.id)
                        onSelectionChange?.(newSelection)
                      }}
                    />
                  </td>
                )}
                {orderedColumns.map((column) => (
                  <td key={column.id} className="p-4">
                    {column.render ? column.render(item[column.key as keyof T], item) : String(item[column.key as keyof T] || '-')}
                  </td>
                ))}
                <td className="p-4">
                  <div className="flex space-x-2">
                    {onViewClick && (
                      <Button variant="outline" size="sm" onClick={() => onViewClick(item)}>
                        View
                      </Button>
                    )}
                    {onEditClick && (
                      <Button variant="outline" size="sm" onClick={() => onEditClick(item)}>
                        Edit
                      </Button>
                    )}
                    {onDeleteClick && (
                      <Button variant="destructive" size="sm" onClick={() => onDeleteClick(item)}>
                        Delete
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderKanbanView = () => {
    // Default groupBy field if not specified
    const groupByField = kanbanGroupByField || groupBy || 'status'
    
    // Default card title field if not specified
    const cardTitleField = kanbanCardTitleField || 'name' || 'title'
    
    // Use provided kanban columns or auto-generate from data
    let columns = [...kanbanColumns]
    
    // Auto-generate columns if none provided and we have a groupBy field
    if (columns.length === 0 && groupByField) {
      const uniqueGroups = [...new Set(processedData.map(item => String(item[groupByField as keyof T] || 'Unknown')))]
      columns = uniqueGroups.map(group => ({
        id: group,
        title: group.charAt(0).toUpperCase() + group.slice(1).replace(/_/g, ' '),
        count: processedData.filter(item => String(item[groupByField as keyof T]) === group).length
      }))
    }

    return (
      <KanbanView
        data={processedData}
        columns={columns}
        loading={loading}
        error={error}
        groupByField={groupByField}
        cardTitleField={cardTitleField}
        cardDescriptionField={kanbanCardDescriptionField}
        onCreateClick={onCreateClick}
        onEditClick={onEditClick}
        onDeleteClick={onDeleteClick}
        onViewClick={onViewClick}
        onMoveCard={onMoveCard}
        enableQuickAdd={enableQuickAdd}
        onQuickAdd={onQuickAdd}
        cardFields={kanbanCardFields}
        canCreate={true}
        canEdit={true}
        canDelete={true}
        canMove={true}
      />
    )
  }

  const renderGanttView = () => {
    // Default field mappings if not specified
    const idField = ganttIdField || 'id'
    const titleField = ganttTitleField || 'title' || 'name'
    const startDateField = ganttStartDateField || 'start_date' || 'startDate'
    const endDateField = ganttEndDateField || 'end_date' || 'endDate'
    
    // Validate that required date fields exist in data
    const hasRequiredFields = processedData.length === 0 || (
      processedData.some(item => 
        item[startDateField as keyof T] && 
        item[endDateField as keyof T]
      )
    )

    if (!hasRequiredFields) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Gantt chart unavailable</h3>
            <p className="text-muted-foreground">
              Data must include start and end date fields to display as Gantt chart.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Configure ganttStartDateField and ganttEndDateField props.
            </p>
          </div>
        </div>
      )
    }

    return (
      <GanttView
        data={processedData}
        loading={loading}
        error={error}
        idField={idField}
        titleField={titleField}
        startDateField={startDateField}
        endDateField={endDateField}
        progressField={ganttProgressField}
        statusField={ganttStatusField}
        priorityField={ganttPriorityField}
        onCreateClick={onCreateClick ? () => onCreateClick() : undefined}
        onEditClick={onEditClick}
        onDeleteClick={onDeleteClick}
        onViewClick={onViewClick}
        onUpdateDates={onUpdateDates}
        onUpdateProgress={onUpdateProgress}
        viewMode={ganttViewMode}
        showWeekends={showWeekends}
        showProgress={showProgress}
        showDependencies={showDependencies}
        allowResize={allowResize}
        allowMove={allowMove}
        canCreate={true}
        canEdit={true}
        canDelete={true}
      />
    )
  }

  const renderCalendarView = () => {
    // Default field mappings if not specified
    const idField = calendarIdField || 'id'
    const titleField = calendarTitleField || 'title' || 'name'
    const dateField = calendarDateField || 'created_at' || 'date'
    
    // Validate that required date field exists in data
    const hasRequiredFields = processedData.length === 0 || (
      processedData.some(item => 
        item[dateField as keyof T]
      )
    )

    if (!hasRequiredFields) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Calendar view unavailable</h3>
            <p className="text-muted-foreground">
              Data must include a date field to display as calendar.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Configure calendarDateField prop to specify the date field.
            </p>
          </div>
        </div>
      )
    }

    return (
      <CalendarView
        data={processedData}
        loading={loading}
        error={error}
        idField={idField}
        titleField={titleField}
        dateField={dateField}
        descriptionField={calendarDescriptionField}
        statusField={calendarStatusField}
        priorityField={calendarPriorityField}
        onCreateClick={onCreateClick ? (date?: Date) => onCreateClick() : undefined}
        onEditClick={onEditClick}
        onDeleteClick={onDeleteClick}
        onViewClick={onViewClick}
        onDateChange={onDateChange}
        enableQuickAdd={calendarEnableQuickAdd}
        onQuickAdd={onCalendarQuickAdd}
        view={calendarView}
        showWeekends={calendarShowWeekends}
        showToday={calendarShowToday}
        allowDragDrop={calendarAllowDragDrop}
        canCreate={true}
        canEdit={true}
        canDelete={true}
      />
    )
  }

  const renderCurrentView = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-destructive mb-2">Error loading data</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      )
    }

    if (processedData.length === 0) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">No data found</h3>
            <p className="text-muted-foreground mb-4">
              {localSearchQuery || Object.keys(filters).length > 0
                ? 'No items match your search criteria'
                : 'Get started by creating your first item'
              }
            </p>
            {onCreateClick && (
              <Button onClick={() => onCreateClick()}>Create New</Button>
            )}
          </div>
        </div>
      )
    }

    switch (currentViewType) {
      case 'card':
        return renderCardView()
      case 'list':
        return renderListView()
      case 'kanban':
        return renderKanbanView()
      case 'gantt':
        return renderGanttView()
      case 'calendar':
        return renderCalendarView()
      case 'cohort':
        return <div className="text-center py-8 text-muted-foreground">Cohort view coming soon...</div>
      default:
        return renderListView()
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {(title || subtitle) && (
        <div>
          {title && <h1 className="text-2xl font-bold">{title}</h1>}
          {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
        </div>
      )}

      {/* Toolbar */}
      {showToolbar && renderToolbar()}

      {/* Content */}
      {renderCurrentView()}
    </div>
  )
}