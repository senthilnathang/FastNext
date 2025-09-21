'use client'

import React, { useState } from 'react'
import { Button } from '@/shared/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/card'
import { Badge } from '@/shared/components/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/dropdown-menu'
import { useGenericPermissions } from '@/modules/admin/hooks/useGenericPermissions'
import { Plus, MoreHorizontal, Edit, Trash2, Eye } from 'lucide-react'

export interface KanbanColumn {
  id: string
  title: string
  color?: string
  limit?: number
}

export interface KanbanItem<T = any> {
  id: number
  status: string
  title: string
  description?: string
  data: T
}

export interface GenericKanbanViewProps<T = any> {
  // Data and API
  items: KanbanItem<T>[]
  columns: KanbanColumn[]
  loading?: boolean
  error?: string | null
  
  // Permissions
  resourceName: string
  projectId?: number
  
  // CRUD operations
  onCreateClick?: (columnId: string) => void
  onEditClick?: (item: KanbanItem<T>) => void
  onDeleteClick?: (item: KanbanItem<T>) => void
  onViewClick?: (item: KanbanItem<T>) => void
  onRefresh?: () => void
  onMoveItem?: (itemId: number, newStatus: string) => void
  
  // UI customization
  title?: string
  subtitle?: string
  createButtonText?: string
  emptyStateTitle?: string
  emptyStateDescription?: string
  
  // Card rendering
  renderCard?: (item: KanbanItem<T>) => React.ReactNode
  cardFields?: Array<{
    key: keyof T | string
    label: string
    render?: (value: unknown, item: KanbanItem<T>) => React.ReactNode
  }>
  
  // Custom actions
  customActions?: Array<{
    label: string
    icon?: React.ReactNode
    action: (item: KanbanItem<T>) => void
    requiresPermission?: string
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  }>
}

export function GenericKanbanView<T>({
  items,
  columns,
  loading = false,
  error = null,
  resourceName,
  projectId,
  onCreateClick,
  onEditClick,
  onDeleteClick,
  onViewClick,
  onRefresh,
  onMoveItem,
  title,
  subtitle,
  createButtonText = 'Create New',
  // emptyStateTitle = 'No items found',
  emptyStateDescription = 'Get started by creating your first item',
  renderCard,
  cardFields = [],
  customActions = []
}: GenericKanbanViewProps<T>) {
  const [draggedItem, setDraggedItem] = useState<KanbanItem<T> | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

  const permissions = useGenericPermissions(resourceName, projectId)

  const getColumnItems = (columnId: string) => {
    return items.filter(item => item.status === columnId)
  }

  const handleDragStart = (e: React.DragEvent, item: KanbanItem<T>) => {
    if (!permissions.checkUpdate(resourceName, item.id, projectId)) {
      e.preventDefault()
      return
    }
    setDraggedItem(item)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(columnId)
  }

  const handleDragLeave = () => {
    setDragOverColumn(null)
  }

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    setDragOverColumn(null)
    
    if (draggedItem && draggedItem.status !== columnId) {
      onMoveItem?.(draggedItem.id, columnId)
    }
    setDraggedItem(null)
  }

  const renderDefaultCard = (item: KanbanItem<T>) => {
    return (
      <Card 
        className="cursor-move hover:shadow-md transition-shadow bg-white"
        draggable={permissions.checkUpdate(resourceName, item.id, projectId)}
        onDragStart={(e) => handleDragStart(e, item)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-sm font-medium line-clamp-2">
              {item.title}
            </CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {permissions.checkRead(resourceName, item.id, projectId) && onViewClick && (
                  <DropdownMenuItem onClick={() => onViewClick(item)}>
                    <Eye className="h-3 w-3 mr-2" />
                    View
                  </DropdownMenuItem>
                )}
                {permissions.checkUpdate(resourceName, item.id, projectId) && onEditClick && (
                  <DropdownMenuItem onClick={() => onEditClick(item)}>
                    <Edit className="h-3 w-3 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {customActions.map((action, actionIndex) => {
                  const hasPermission = !action.requiresPermission || 
                    permissions.hasPermission({ action: action.requiresPermission, resource: resourceName })
                  
                  if (!hasPermission) return null
                  
                  return (
                    <DropdownMenuItem
                      key={actionIndex}
                      onClick={() => action.action(item)}
                    >
                      {action.icon}
                      {action.label}
                    </DropdownMenuItem>
                  )
                })}
                {permissions.checkDelete(resourceName, item.id, projectId) && onDeleteClick && (
                  <DropdownMenuItem 
                    onClick={() => onDeleteClick(item)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-3 w-3 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {item.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {item.description}
            </p>
          )}
        </CardHeader>
        
        {cardFields.length > 0 && (
          <CardContent className="pt-0">
            <div className="space-y-1">
              {cardFields.map((field, index) => {
                const value = item.data[field.key as keyof T]
                return (
                  <div key={index} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{field.label}:</span>
                    <span>
                      {field.render ? field.render(value, item) : String(value || '-')}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        )}
      </Card>
    )
  }

  const canCreate = permissions.checkCreate(resourceName, projectId)

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-destructive mb-2">Error loading data</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            {onRefresh && (
              <Button onClick={onRefresh} variant="outline" className="mt-4">
                Try Again
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {title && <h2 className="text-2xl font-bold">{title}</h2>}
          {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
        </div>
        
        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button onClick={onRefresh} variant="outline" size="sm">
              Refresh
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((column) => {
            const columnItems = getColumnItems(column.id)
            const isOverLimit = column.limit && columnItems.length >= column.limit
            
            return (
              <div
                key={column.id}
                className={`flex-shrink-0 w-80 bg-muted/50 rounded-lg p-4 ${
                  dragOverColumn === column.id ? 'bg-muted' : ''
                }`}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{column.title}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {columnItems.length}
                      {column.limit && `/${column.limit}`}
                    </Badge>
                  </div>
                  
                  {canCreate && onCreateClick && !isOverLimit && (
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => onCreateClick(column.id)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="space-y-3 min-h-[200px]">
                  {columnItems.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">{emptyStateDescription}</p>
                      {canCreate && onCreateClick && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="mt-2"
                          onClick={() => onCreateClick(column.id)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {createButtonText}
                        </Button>
                      )}
                    </div>
                  ) : (
                    columnItems.map((item) => (
                      <div key={item.id}>
                        {renderCard ? renderCard(item) : renderDefaultCard(item)}
                      </div>
                    ))
                  )}
                </div>
                
                {isOverLimit && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                    Column limit reached ({column.limit})
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}