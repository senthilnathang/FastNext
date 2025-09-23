"use client"

import * as React from "react"
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { ChevronDown, ChevronUp, MoreHorizontal, Search } from "lucide-react"

import { cn } from "@/shared/utils"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"

interface MobileTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  enableSearch?: boolean
  renderMobileCard?: (item: TData, index: number) => React.ReactNode
  onRowAction?: (row: TData, action: string) => void
  className?: string
  mobileBreakpoint?: 'sm' | 'md' | 'lg'
  showDesktopTable?: boolean
}

interface MobileCardProps<TData> {
  item: TData
  columns: ColumnDef<TData, any>[]
  index: number
  onAction?: (action: string) => void
}

function DefaultMobileCard<TData>({ item, columns, onAction }: MobileCardProps<TData>) {
  // Extract primary and secondary fields
  const primaryField = columns[0]
  const secondaryFields = columns.slice(1, -1) // Exclude actions column
  const actionsField = columns[columns.length - 1]

  const table = useReactTable({
    data: [item],
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const row = table.getRowModel().rows[0]
  
  if (!row) return null

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          {/* Primary field */}
          <div className="flex-1 min-w-0">
            {primaryField && (
              <div className="font-medium text-gray-900 dark:text-white">
                {flexRender(
                  primaryField.cell,
                  row.getVisibleCells()[0].getContext()
                )}
              </div>
            )}
          </div>
          
          {/* Actions dropdown */}
          {actionsField && actionsField.id === 'actions' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onAction?.('view')}>
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAction?.('edit')}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onAction?.('delete')}
                  className="text-red-600 dark:text-red-400"
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Secondary fields */}
        <div className="space-y-2">
          {secondaryFields.map((column, colIndex) => {
            const cell = row.getVisibleCells()[colIndex + 1]
            if (!cell) return null
            
            const header = typeof column.header === 'string' 
              ? column.header 
              : column.id || `Field ${colIndex + 1}`
            
            return (
              <div key={column.id || colIndex} className="flex justify-between items-center text-sm">
                <span className="text-gray-500 dark:text-gray-400 font-medium">
                  {header}:
                </span>
                <div className="text-gray-900 dark:text-white text-right flex-1 ml-4">
                  {flexRender(column.cell, cell.getContext())}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function DesktopTable<TData, TValue>({ 
  columns, 
  data, 
  searchKey, 
  enableSearch, 
  searchValue,
  onSearchChange 
}: {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  enableSearch?: boolean
  searchValue: string
  onSearchChange: (value: string) => void
}) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <>
      {/* Desktop Search */}
      {enableSearch && searchKey && (
        <div className="flex items-center space-x-2 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder={`Search ${searchKey}...`}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      )}

      {/* Desktop Table */}
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b bg-gray-50 dark:bg-gray-800">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="h-12 px-4 text-left align-middle font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap"
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={cn(
                          "flex items-center space-x-2",
                          header.column.getCanSort() && "cursor-pointer select-none hover:text-gray-600"
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <span>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                        {header.column.getCanSort() && (
                          <div className="flex flex-col">
                            <ChevronUp
                              className={cn(
                                "h-3 w-3 -mb-1",
                                header.column.getIsSorted() === "asc" ? "text-blue-600" : "text-gray-400"
                              )}
                            />
                            <ChevronDown
                              className={cn(
                                "h-3 w-3",
                                header.column.getIsSorted() === "desc" ? "text-blue-600" : "text-gray-400"
                              )}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="p-4 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export function MobileTable<TData, TValue>({
  columns,
  data,
  searchKey,
  enableSearch = true,
  renderMobileCard,
  onRowAction,
  className,
  mobileBreakpoint = 'md',
  showDesktopTable = true
}: MobileTableProps<TData, TValue>) {
  const [searchValue, setSearchValue] = React.useState("")

  // Filter data based on search
  const filteredData = React.useMemo(() => {
    if (!searchValue || !searchKey) return data
    
    return data.filter((item: any) => {
      const searchableValue = item[searchKey]
      if (typeof searchableValue === 'string') {
        return searchableValue.toLowerCase().includes(searchValue.toLowerCase())
      }
      return false
    })
  }, [data, searchValue, searchKey])

  const breakpointClass = {
    sm: 'sm:hidden',
    md: 'md:hidden',
    lg: 'lg:hidden'
  }[mobileBreakpoint]

  const desktopBreakpointClass = {
    sm: 'hidden sm:block',
    md: 'hidden md:block', 
    lg: 'hidden lg:block'
  }[mobileBreakpoint]

  return (
    <div className={cn("space-y-4", className)}>
      {/* Mobile View */}
      <div className={breakpointClass}>
        {/* Mobile Search */}
        {enableSearch && searchKey && (
          <div className="space-y-3 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder={`Search ${searchKey}...`}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>
            
            {searchValue && (
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>{filteredData.length} results found</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchValue("")}
                  className="text-blue-600 dark:text-blue-400"
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Mobile Cards */}
        <div className="space-y-3">
          {filteredData.length > 0 ? (
            filteredData.map((item, index) => (
              <div key={index}>
                {renderMobileCard ? (
                  renderMobileCard(item, index)
                ) : (
                  <DefaultMobileCard
                    item={item}
                    columns={columns}
                    index={index}
                    onAction={(action) => onRowAction?.(item, action)}
                  />
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-500 dark:text-gray-400">
                {searchValue ? (
                  <>
                    <p className="text-lg font-medium mb-2">No results found</p>
                    <p className="text-sm">Try adjusting your search terms</p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-medium mb-2">No data available</p>
                    <p className="text-sm">Start by adding some items</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop View */}
      {showDesktopTable && (
        <div className={desktopBreakpointClass}>
          <DesktopTable
            columns={columns}
            data={filteredData}
            searchKey={searchKey}
            enableSearch={enableSearch}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
          />
        </div>
      )}
    </div>
  )
}

export default MobileTable