'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu'
import { useGenericPermissions } from '@/modules/admin/hooks/useGenericPermissions'
import { Plus, Search, MoreHorizontal, Edit, Trash2, Eye } from 'lucide-react'

export interface Column<T = any> {
  key: keyof T | string
  label: string
  render?: (value: unknown, row: T) => React.ReactNode
  sortable?: boolean
  searchable?: boolean
  width?: string
}

export interface GenericListViewProps<T = any> {
  // Data and API
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  error?: string | null
  
  // Permissions
  resourceName: string
  projectId?: number
  
  // CRUD operations
  onCreateClick?: () => void
  onEditClick?: (item: T) => void
  onDeleteClick?: (item: T) => void
  onViewClick?: (item: T) => void
  onRefresh?: () => void
  
  // UI customization
  title?: string
  subtitle?: string
  createButtonText?: string
  emptyStateTitle?: string
  emptyStateDescription?: string
  className?: string
  
  // Search and filtering
  searchable?: boolean
  searchPlaceholder?: string
  onSearch?: (query: string) => void
  
  // Pagination
  pagination?: {
    current: number
    total: number
    pageSize: number
    onPageChange: (page: number) => void
  }
  
  // Selection
  selectable?: boolean
  selectedItems?: T[]
  onSelectionChange?: (items: T[]) => void
  
  // Bulk actions
  bulkActions?: Array<{
    label: string
    icon?: React.ReactNode
    action: (items: T[]) => void
    requiresPermission?: string
  }>
  
  // Custom actions
  customActions?: Array<{
    label: string
    icon?: React.ReactNode
    action: (item: T) => void
    requiresPermission?: string
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  }>
}

export function GenericListView<T extends { id: number }>({
  data,
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
  title,
  subtitle,
  createButtonText = 'Create New',
  emptyStateTitle = 'No items found',
  emptyStateDescription = 'Get started by creating your first item',
  className,
  searchable = true,
  searchPlaceholder = 'Search...',
  onSearch,
  pagination,
  selectable = false,
  selectedItems = [],
  onSelectionChange,
  bulkActions = [],
  customActions = []
}: GenericListViewProps<T>) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredData, setFilteredData] = useState(data)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const permissions = useGenericPermissions(resourceName)

  // Filter data based on search query
  useEffect(() => {
    if (!searchQuery) {
      setFilteredData(data)
      return
    }

    const searchableColumns = columns.filter(col => col.searchable !== false)
    const filtered = data.filter(item =>
      searchableColumns.some(col => {
        const value = item[col.key as keyof T]
        return String(value).toLowerCase().includes(searchQuery.toLowerCase())
      })
    )
    setFilteredData(filtered)
  }, [data, searchQuery, columns])

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    onSearch?.(value)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = filteredData.map(item => item.id)
      setSelectedIds(allIds)
      onSelectionChange?.(filteredData)
    } else {
      setSelectedIds([])
      onSelectionChange?.([])
    }
  }

  const handleSelectItem = (item: T, checked: boolean) => {
    const newSelectedIds = checked
      ? [...selectedIds, item.id]
      : selectedIds.filter(id => id !== item.id)
    
    setSelectedIds(newSelectedIds)
    const newSelectedItems = filteredData.filter(item => newSelectedIds.includes(item.id))
    onSelectionChange?.(newSelectedItems)
  }

  const renderValue = (column: Column<T>, item: T) => {
    const value = item[column.key as keyof T]
    
    if (column.render) {
      return column.render(value, item)
    }
    
    if (typeof value === 'boolean') {
      return (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? 'Yes' : 'No'}
        </Badge>
      )
    }
    
    if (value instanceof Date) {
      return value.toLocaleDateString()
    }
    
    return String(value || '-')
  }

  const canCreate = permissions.checkCreate(resourceName, projectId)
  const canEdit = permissions.checkUpdate(resourceName, undefined, projectId)
  const canDelete = permissions.checkDelete(resourceName, undefined, projectId)
  const canView = permissions.checkRead(resourceName, undefined, projectId)

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
    <div className={`space-y-4${className ? ` ${className}` : ''}`}>
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
          
          {canCreate && onCreateClick && (
            <Button onClick={onCreateClick}>
              <Plus className="h-4 w-4 mr-2" />
              {createButtonText}
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      {searchable && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-8"
            />
          </div>
          
          {/* Bulk Actions */}
          {selectable && selectedIds.length > 0 && bulkActions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Actions ({selectedIds.length})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {bulkActions.map((action, index) => {
                  const hasPermission = !action.requiresPermission || 
                    permissions.hasPermission({ action: action.requiresPermission, resource: resourceName })
                  
                  if (!hasPermission) return null
                  
                  return (
                    <DropdownMenuItem
                      key={index}
                      onClick={() => action.action(selectedItems)}
                    >
                      {action.icon}
                      {action.label}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
              </div>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <h3 className="text-lg font-semibold">{emptyStateTitle}</h3>
                <p className="text-muted-foreground mb-4">{emptyStateDescription}</p>
                {canCreate && onCreateClick && (
                  <Button onClick={onCreateClick}>
                    <Plus className="h-4 w-4 mr-2" />
                    {createButtonText}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr>
                    {selectable && (
                      <th className="p-4 text-left">
                        <input
                          type="checkbox"
                          checked={selectedIds.length === filteredData.length && filteredData.length > 0}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="rounded"
                        />
                      </th>
                    )}
                    {columns.map((column, index) => (
                      <th
                        key={index}
                        className="p-4 text-left font-medium"
                        style={{ width: column.width }}
                      >
                        {column.label}
                      </th>
                    ))}
                    {(canEdit || canDelete || canView || customActions.length > 0) && (
                      <th className="p-4 text-left font-medium w-20">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-muted/50">
                      {selectable && (
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(item.id)}
                            onChange={(e) => handleSelectItem(item, e.target.checked)}
                            className="rounded"
                          />
                        </td>
                      )}
                      {columns.map((column, colIndex) => (
                        <td key={colIndex} className="p-4">
                          {renderValue(column, item)}
                        </td>
                      ))}
                      {(canEdit || canDelete || canView || customActions.length > 0) && (
                        <td className="p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canView && onViewClick && (
                                <DropdownMenuItem onClick={() => onViewClick(item)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </DropdownMenuItem>
                              )}
                              {canEdit && onEditClick && (
                                <DropdownMenuItem onClick={() => onEditClick(item)}>
                                  <Edit className="h-4 w-4 mr-2" />
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
                              {canDelete && onDeleteClick && (
                                <DropdownMenuItem 
                                  onClick={() => onDeleteClick(item)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((pagination.current - 1) * pagination.pageSize) + 1} to{' '}
            {Math.min(pagination.current * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total} items
          </p>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.current - 1)}
              disabled={pagination.current <= 1}
            >
              Previous
            </Button>
            
            <span className="text-sm">
              Page {pagination.current} of {Math.ceil(pagination.total / pagination.pageSize)}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.current + 1)}
              disabled={pagination.current >= Math.ceil(pagination.total / pagination.pageSize)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}