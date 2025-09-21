"use client"

import * as React from "react"
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Grid,
  List,
  MoreHorizontal
} from "lucide-react"

import { cn } from '@/shared/utils'
import { Button } from "@/shared/components/button"
import { Input } from "@/shared/components/input"
import { Badge } from "@/shared/components/badge"
import { Card, CardContent } from "@/shared/components/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/dropdown-menu"

export interface ListItem {
  id: string
  [key: string]: unknown
}

export interface ListColumn {
  key: string
  label: string
  sortable?: boolean
  searchable?: boolean
  render?: (value: unknown, item: ListItem) => React.ReactNode
  width?: string | number
}

export interface ListAction {
  key: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  onClick: (item: ListItem) => void
  variant?: "default" | "destructive"
}

export interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

interface ListViewProps {
  items: ListItem[]
  columns: ListColumn[]
  pagination?: PaginationInfo
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  onSearch?: (query: string) => void
  onSort?: (column: string, direction: "asc" | "desc") => void
  onFilter?: (filters: Record<string, unknown>) => void
  actions?: ListAction[]
  searchable?: boolean
  sortable?: boolean
  filterable?: boolean
  selectable?: boolean
  selectedItems?: string[]
  onSelectionChange?: (selectedIds: string[]) => void
  viewMode?: "list" | "grid" | "cards"
  onViewModeChange?: (mode: "list" | "grid" | "cards") => void
  loading?: boolean
  emptyMessage?: string
  className?: string
  renderItem?: (item: ListItem) => React.ReactNode
  itemsPerPageOptions?: number[]
}

export function ListView({
  items,
  columns,
  pagination,
  onPageChange,
  onPageSizeChange,
  onSearch,
  onSort,
  actions = [],
  searchable = true,
  sortable = true,
  filterable = false,
  selectable = false,
  selectedItems = [],
  onSelectionChange,
  viewMode = "list",
  onViewModeChange,
  loading = false,
  emptyMessage = "No items found",
  className,
  renderItem,
  itemsPerPageOptions = [10, 25, 50, 100],
}: ListViewProps) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [sortColumn, setSortColumn] = React.useState<string | null>(null)
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc")

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    onSearch?.(query)
  }

  const handleSort = (column: string) => {
    if (!sortable) return
    
    const newDirection = sortColumn === column && sortDirection === "asc" ? "desc" : "asc"
    setSortColumn(column)
    setSortDirection(newDirection)
    onSort?.(column, newDirection)
  }

  const handleSelectAll = () => {
    if (!selectable || !onSelectionChange) return
    
    const allSelected = selectedItems.length === items.length
    const newSelection = allSelected ? [] : items.map(item => item.id)
    onSelectionChange(newSelection)
  }

  const handleSelectItem = (itemId: string) => {
    if (!selectable || !onSelectionChange) return
    
    const newSelection = selectedItems.includes(itemId)
      ? selectedItems.filter(id => id !== itemId)
      : [...selectedItems, itemId]
    
    onSelectionChange(newSelection)
  }

  const renderTableView = () => (
    <div className="border rounded-lg">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b bg-muted/50">
            <tr>
              {selectable && (
                <th className="w-12 p-3">
                  <input
                    type="checkbox"
                    checked={selectedItems.length === items.length && items.length > 0}
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                </th>
              )}
              {columns.map(column => (
                <th
                  key={column.key}
                  className={cn(
                    "text-left p-3 font-medium",
                    column.sortable && sortable && "cursor-pointer hover:bg-muted"
                  )}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {column.sortable && sortable && (
                      <div className="flex flex-col">
                        <SortAsc 
                          className={cn(
                            "h-3 w-3",
                            sortColumn === column.key && sortDirection === "asc" 
                              ? "text-primary" 
                              : "text-muted-foreground"
                          )} 
                        />
                        <SortDesc 
                          className={cn(
                            "h-3 w-3",
                            sortColumn === column.key && sortDirection === "desc" 
                              ? "text-primary" 
                              : "text-muted-foreground"
                          )} 
                        />
                      </div>
                    )}
                  </div>
                </th>
              ))}
              {actions.length > 0 && (
                <th className="w-20 p-3">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr 
                key={item.id} 
                className="border-b hover:bg-muted/30 transition-colors"
              >
                {selectable && (
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => handleSelectItem(item.id)}
                      className="rounded"
                    />
                  </td>
                )}
                {columns.map(column => (
                  <td key={column.key} className="p-3">
                    {column.render 
                      ? column.render(item[column.key], item)
                      : String(item[column.key] ?? '')
                    }
                  </td>
                ))}
                {actions.length > 0 && (
                  <td className="p-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {actions.map(action => (
                          <DropdownMenuItem
                            key={action.key}
                            onClick={() => action.onClick(item)}
                            className={action.variant === "destructive" ? "text-red-600" : ""}
                          >
                            {action.icon && <action.icon className="mr-2 h-4 w-4" />}
                            {action.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map((item) => (
        <Card key={item.id} className="p-4">
          <CardContent className="p-0">
            {renderItem ? (
              renderItem(item)
            ) : (
              <div className="space-y-2">
                {columns.slice(0, 3).map(column => (
                  <div key={column.key}>
                    <div className="text-xs text-muted-foreground">{column.label}</div>
                    <div className="text-sm">
                      {column.render 
                        ? column.render(item[column.key], item)
                        : String(item[column.key] ?? '')
                      }
                    </div>
                  </div>
                ))}
              </div>
            )}
            {(selectable || actions.length > 0) && (
              <div className="flex justify-between items-center mt-3 pt-3 border-t">
                {selectable && (
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(item.id)}
                    onChange={() => handleSelectItem(item.id)}
                    className="rounded"
                  />
                )}
                {actions.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {actions.map(action => (
                        <DropdownMenuItem
                          key={action.key}
                          onClick={() => action.onClick(item)}
                          className={action.variant === "destructive" ? "text-red-600" : ""}
                        >
                          {action.icon && <action.icon className="mr-2 h-4 w-4" />}
                          {action.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )

  const renderPagination = () => {
    if (!pagination) return null

    const { page, pageSize, total, totalPages } = pagination
    const startItem = (page - 1) * pageSize + 1
    const endItem = Math.min(page * pageSize, total)

    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            Showing {startItem} to {endItem} of {total} results
          </span>
          {onPageSizeChange && (
            <div className="flex items-center gap-2 ml-4">
              <span>Show</span>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => onPageSizeChange(parseInt(value))}
              >
                <SelectTrigger className="w-16 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {itemsPerPageOptions.map(option => (
                    <SelectItem key={option} value={option.toString()}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>per page</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange?.(1)}
            disabled={page === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange?.(page - 1)}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (page <= 3) {
                pageNum = i + 1
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = page - 2 + i
              }

              return (
                <Button
                  key={pageNum}
                  variant={pageNum === page ? "default" : "outline"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onPageChange?.(pageNum)}
                >
                  {pageNum}
                </Button>
              )
            })}
          </div>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange?.(page + 1)}
            disabled={page === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange?.(totalPages)}
            disabled={page === totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {searchable && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          )}
          
          {filterable && (
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          )}
          
          {selectable && selectedItems.length > 0 && (
            <Badge variant="secondary">
              {selectedItems.length} selected
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onViewModeChange && (
            <div className="flex border rounded-md p-1">
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => onViewModeChange("list")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => onViewModeChange("grid")}
              >
                <Grid className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading...
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <>
          {viewMode === "list" ? renderTableView() : renderGridView()}
        </>
      )}

      {/* Pagination */}
      {pagination && renderPagination()}
    </div>
  )
}