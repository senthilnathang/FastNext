"use client"

import * as React from "react"
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { ChevronDown, ChevronUp, Search } from "lucide-react"

import { cn } from "@/shared/utils"
import { Input } from "@/shared/components/ui/input"
import { Button } from "@/shared/components/ui/button"

interface VirtualizedTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  height?: number
  itemHeight?: number
  searchKey?: string
  enableSearch?: boolean
  className?: string
}

interface VirtualizedRowProps<TData> {
  row: any
  columns: ColumnDef<TData, any>[]
  index: number
  style: React.CSSProperties
}

function VirtualizedRow<TData>({ row, index, style }: VirtualizedRowProps<TData>) {
  return (
    <div 
      style={style} 
      className={cn(
        "flex items-center border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors",
        index % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50/50 dark:bg-gray-800/20"
      )}
    >
      {row.getVisibleCells().map((cell: any, cellIndex: number) => (
        <div
          key={cell.id}
          className={cn(
            "flex items-center px-4 py-2 text-sm",
            cellIndex === 0 ? "flex-[2]" : "flex-1",
            "min-w-0" // Prevent overflow
          )}
        >
          <div className="truncate">
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </div>
        </div>
      ))}
    </div>
  )
}

function TableHeader<TData>({ table }: { columns: ColumnDef<TData, any>[], table: any }) {
  const headerGroups = table.getHeaderGroups()

  return (
    <div className="flex items-center bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-700 font-medium text-gray-900 dark:text-gray-100">
      {headerGroups[0]?.headers.map((header: any, index: number) => (
        <div
          key={header.id}
          className={cn(
            "flex items-center px-4 py-3 text-sm font-semibold",
            index === 0 ? "flex-[2]" : "flex-1",
            header.column.getCanSort() && "cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          )}
          onClick={header.column.getToggleSortingHandler()}
        >
          <span className="truncate">
            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
          </span>
          {header.column.getCanSort() && (
            <div className="ml-2 flex flex-col">
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
      ))}
    </div>
  )
}

export function VirtualizedTable<TData, TValue>({
  columns,
  data,
  height = 600,
  itemHeight = 60,
  searchKey,
  enableSearch = true,
  className
}: VirtualizedTableProps<TData, TValue>) {
  const [searchValue, setSearchValue] = React.useState("")
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = React.useState(0)
  
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

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  // Virtual scrolling calculations
  const startIndex = Math.floor(scrollTop / itemHeight)
  const endIndex = Math.min(
    startIndex + Math.ceil(height / itemHeight) + 1,
    filteredData.length
  )
  
  const visibleRows = table.getRowModel().rows.slice(startIndex, endIndex)
  const totalHeight = filteredData.length * itemHeight
  const offsetY = startIndex * itemHeight

  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search */}
      {enableSearch && searchKey && (
        <div className="flex items-center">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder={`Search ${searchKey}...`}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchValue && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchValue("")}
              className="ml-2"
            >
              Clear
            </Button>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <span>
          Showing {filteredData.length.toLocaleString()} of {data.length.toLocaleString()} items
        </span>
        {searchValue && (
          <span>
            Filtered by: &ldquo;{searchValue}&rdquo;
          </span>
        )}
      </div>

      {/* Virtualized Table */}
      <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-900">
        {/* Header */}
        <TableHeader columns={columns} table={table} />
        
        {/* Virtual Container */}
        {filteredData.length > 0 ? (
          <div
            ref={containerRef}
            className="overflow-auto"
            style={{ height }}
            onScroll={handleScroll}
          >
            <div style={{ height: totalHeight, position: 'relative' }}>
              <div style={{ transform: `translateY(${offsetY}px)` }}>
                {visibleRows.map((row, index) => (
                  <VirtualizedRow
                    key={row.id}
                    row={row}
                    columns={columns}
                    index={startIndex + index}
                    style={{
                      height: itemHeight,
                      position: 'absolute',
                      top: index * itemHeight,
                      left: 0,
                      right: 0,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12 text-gray-500 dark:text-gray-400">
            {searchValue ? (
              <div className="text-center">
                <p className="text-lg font-medium">No results found</p>
                <p className="text-sm">Try adjusting your search terms</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-lg font-medium">No data available</p>
                <p className="text-sm">Start by adding some items</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Performance Stats */}
      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
        <span>
          Virtual scrolling enabled - Rendering {visibleRows.length} of {filteredData.length} rows
        </span>
        <span>
          Item height: {itemHeight}px • Viewport: {height}px
        </span>
      </div>
    </div>
  )
}

export default VirtualizedTable