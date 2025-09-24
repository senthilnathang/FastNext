'use client'

import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import { Checkbox } from "@/shared/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/enhanced-table"
import { DataTablePagination } from "@/shared/components/ui/data-table-pagination"
import { DataTableToolbar } from "@/shared/components/ui/data-table-toolbar"
import type { ColumnDefinition, ColumnVisibility } from "@/shared/components/ui/column-selector"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchableColumns?: string[]
  filterableColumns?: {
    id: string
    title: string
    options: Array<{ label: string; value: string; icon?: React.ComponentType<any> }>
  }[]
  enableRowSelection?: boolean
  enableSorting?: boolean
  enableFiltering?: boolean
  enableColumnVisibility?: boolean
  onRowSelectionChange?: (selectedRows: TData[]) => void
  onDeleteSelected?: (selectedRows: TData[]) => void
  onExport?: (data: TData[]) => void
  onAdd?: () => void
  pageSize?: number
  isLoading?: boolean
  emptyMessage?: string
  columnDefinitions?: ColumnDefinition[]
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchableColumns = [], // TODO: Implement searchable columns functionality
  filterableColumns = [], // TODO: Implement filterable columns functionality
  enableRowSelection = true,
  enableSorting = true,
  enableFiltering = true,
  enableColumnVisibility = true,
  onRowSelectionChange,
  onDeleteSelected,
  onExport,
  onAdd,
  pageSize = 10,
  isLoading = false,
  emptyMessage = "No results.",
  columnDefinitions,
}: DataTableProps<TData, TValue>) {
  // Suppress unused variable warnings for future implementation
  void searchableColumns;
  void filterableColumns;
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")

  // Create enhanced columns with selection if enabled
  const enhancedColumns = React.useMemo(() => {
    const baseColumns = [...columns]
    
    if (enableRowSelection) {
      baseColumns.unshift({
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
            className="translate-y-[2px]"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            className="translate-y-[2px]"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      })
    }
    
    return baseColumns
  }, [columns, enableRowSelection])

  const table = useReactTable({
    data,
    columns: enhancedColumns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      globalFilter,
    },
    enableRowSelection,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize,
      },
    },
  })

  // Handle row selection changes
  React.useEffect(() => {
    if (onRowSelectionChange) {
      const selectedRows = table.getFilteredSelectedRowModel().rows.map(row => row.original)
      onRowSelectionChange(selectedRows)
    }
  }, [rowSelection, onRowSelectionChange, table])

  // Generate column definitions for column selector
  const generatedColumnDefinitions: ColumnDefinition[] = React.useMemo(() => {
    if (columnDefinitions) return columnDefinitions
    
    return enhancedColumns
      .filter(col => col.id !== 'select')
      .map(col => ({
        id: col.id || 'unknown',
        label: typeof col.header === 'string' ? col.header : col.id || 'unknown',
        canHide: col.enableHiding !== false,
      }))
  }, [enhancedColumns, columnDefinitions])

  const selectedRowCount = table.getFilteredSelectedRowModel().rows.length
  const isFiltered = columnFilters.length > 0 || globalFilter.length > 0

  const handleDeleteSelected = () => {
    if (onDeleteSelected) {
      const selectedRows = table.getFilteredSelectedRowModel().rows.map(row => row.original)
      onDeleteSelected(selectedRows)
      setRowSelection({})
    }
  }

  const handleExport = () => {
    if (onExport) {
      onExport(data)
    }
  }

  const handleClearFilters = () => {
    setColumnFilters([])
    setGlobalFilter("")
  }

  return (
    <div className="w-full space-y-4">
      {(enableFiltering || enableColumnVisibility || onAdd || onExport || onDeleteSelected) && (
        <DataTableToolbar
          searchValue={globalFilter}
          onSearchChange={setGlobalFilter}
          onSearchClear={() => setGlobalFilter("")}
          selectedRowCount={selectedRowCount}
          onDeleteSelected={selectedRowCount > 0 ? handleDeleteSelected : undefined}
          onExport={onExport ? handleExport : undefined}
          onAdd={onAdd}
          columns={generatedColumnDefinitions}
          columnVisibility={columnVisibility as ColumnVisibility}
          onColumnVisibilityChange={(visibility) => setColumnVisibility(visibility)}
          isFiltered={isFiltered}
          onClearFilters={handleClearFilters}
        />
      )}
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    sortable={header.column.getCanSort() && enableSorting}
                    sortDirection={
                      header.column.getIsSorted() === 'asc'
                        ? 'asc'
                        : header.column.getIsSorted() === 'desc'
                        ? 'desc'
                        : null
                    }
                    onSort={() => header.column.toggleSorting()}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: pageSize }).map((_, index) => (
                <TableRow key={index} isLoading>
                  {enhancedColumns.map((column, cellIndex) => (
                    <TableCell key={cellIndex}>
                      <div className="h-4 bg-muted animate-pulse rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  isSelected={row.getIsSelected()}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={enhancedColumns.length}
                  className="h-24 text-center"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <DataTablePagination
        totalItems={table.getFilteredRowModel().rows.length}
        pageSize={table.getState().pagination.pageSize}
        pageIndex={table.getState().pagination.pageIndex}
        pageCount={table.getPageCount()}
        onPageChange={(page) => table.setPageIndex(page)}
        onPageSizeChange={(size) => table.setPageSize(size)}
        selectedRowCount={selectedRowCount}
        totalRowCount={table.getFilteredRowModel().rows.length}
      />
    </div>
  )
}