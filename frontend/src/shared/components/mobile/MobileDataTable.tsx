"use client"

import { useState, useMemo } from 'react'
import { ChevronRight, Search, Filter, MoreVertical, Eye, Edit, Trash } from 'lucide-react'

import { cn } from '@/shared/utils'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Badge } from '@/shared/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { Separator } from '@/shared/components/ui/separator'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/shared/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/shared/components/ui/sheet'

interface MobileDataTableColumn {
  key: string
  label: string
  type?: 'text' | 'number' | 'date' | 'badge' | 'avatar' | 'action'
  sortable?: boolean
  searchable?: boolean
  priority?: 'high' | 'medium' | 'low' // For responsive display
  render?: (value: any, row: any) => React.ReactNode
}

interface MobileDataTableProps {
  data: any[]
  columns: MobileDataTableColumn[]
  searchPlaceholder?: string
  onRowClick?: (row: any) => void
  onEdit?: (row: any) => void
  onDelete?: (row: any) => void
  onView?: (row: any) => void
  className?: string
  loading?: boolean
  emptyMessage?: string
}

export function MobileDataTable({
  data,
  columns,
  searchPlaceholder = "Search...",
  onRowClick,
  onEdit,
  onDelete,
  onView,
  className,
  loading = false,
  emptyMessage = "No data available"
}: MobileDataTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRow, setSelectedRow] = useState<any>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  // Filter and search data
  const filteredData = useMemo(() => {
    if (!searchQuery) return data

    const searchableColumns = columns.filter(col => col.searchable !== false)
    
    return data.filter(row =>
      searchableColumns.some(col => {
        const value = row[col.key]
        return value?.toString().toLowerCase().includes(searchQuery.toLowerCase())
      })
    )
  }, [data, searchQuery, columns])

  // Get columns by priority for responsive display
  const primaryColumns = columns.filter(col => col.priority === 'high' || !col.priority)
  const secondaryColumns = columns.filter(col => col.priority === 'medium')
  const allColumns = columns

  const handleRowClick = (row: any) => {
    if (onRowClick) {
      onRowClick(row)
    } else {
      setSelectedRow(row)
      setDetailsOpen(true)
    }
  }

  const renderCellValue = (column: MobileDataTableColumn, value: any, row: any) => {
    if (column.render) {
      return column.render(value, row)
    }

    switch (column.type) {
      case 'badge':
        return (
          <Badge variant={value === 'active' ? 'default' : 'secondary'}>
            {value}
          </Badge>
        )
      case 'date':
        return value ? new Date(value).toLocaleDateString() : '-'
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : value
      case 'avatar':
        return (
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
              {value?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <span className="truncate">{value}</span>
          </div>
        )
      default:
        return value?.toString() || '-'
    }
  }

  if (loading) {
    return (
      <div className={cn("space-y-3", className)}>
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search and Filter Bar */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {/* Data Cards */}
      <div className="space-y-3">
        {filteredData.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">{emptyMessage}</p>
            </CardContent>
          </Card>
        ) : (
          filteredData.map((row, index) => (
            <Card key={index} className="transition-colors hover:bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => handleRowClick(row)}
                  >
                    {/* Primary Information */}
                    <div className="space-y-1">
                      {primaryColumns.map((column) => {
                        const value = row[column.key]
                        if (!value && value !== 0) return null
                        
                        return (
                          <div key={column.key} className="flex items-center justify-between">
                            <span className="text-sm font-medium truncate">
                              {renderCellValue(column, value, row)}
                            </span>
                          </div>
                        )
                      })}
                      
                      {/* Secondary Information */}
                      {secondaryColumns.length > 0 && (
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          {secondaryColumns.map((column) => {
                            const value = row[column.key]
                            if (!value && value !== 0) return null
                            
                            return (
                              <span key={column.key} className="truncate">
                                {column.label}: {renderCellValue(column, value, row)}
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    {(onView || onEdit || onDelete) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onView && (
                            <DropdownMenuItem onClick={() => onView(row)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </DropdownMenuItem>
                          )}
                          {onEdit && (
                            <DropdownMenuItem onClick={() => onEdit(row)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {onDelete && (
                            <DropdownMenuItem 
                              onClick={() => onDelete(row)}
                              className="text-destructive"
                            >
                              <Trash className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Row Details Sheet */}
      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader>
            <SheetTitle>Details</SheetTitle>
          </SheetHeader>
          {selectedRow && (
            <div className="mt-6 space-y-4">
              {allColumns.map((column) => {
                const value = selectedRow[column.key]
                if (!value && value !== 0) return null
                
                return (
                  <div key={column.key}>
                    <label className="text-sm font-medium text-muted-foreground">
                      {column.label}
                    </label>
                    <div className="mt-1">
                      {renderCellValue(column, value, selectedRow)}
                    </div>
                    <Separator className="mt-2" />
                  </div>
                )
              })}
              
              {/* Action Buttons */}
              {(onEdit || onDelete) && (
                <div className="flex space-x-2 pt-4">
                  {onEdit && (
                    <Button 
                      onClick={() => {
                        onEdit(selectedRow)
                        setDetailsOpen(false)
                      }}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                  {onDelete && (
                    <Button 
                      variant="destructive"
                      onClick={() => {
                        onDelete(selectedRow)
                        setDetailsOpen(false)
                      }}
                      className="flex-1"
                    >
                      <Trash className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

export default MobileDataTable