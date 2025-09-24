'use client'

import * as React from "react"
import { X, Download, Trash2, Plus } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog"
import { ColumnSelector, type ColumnVisibility, type ColumnDefinition } from "./column-selector"

interface DataTableToolbarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  onSearchClear: () => void
  selectedRowCount: number
  onDeleteSelected?: () => void
  onExport?: () => void
  onAdd?: () => void
  columns: ColumnDefinition[]
  columnVisibility: ColumnVisibility
  onColumnVisibilityChange: (columnVisibility: ColumnVisibility) => void
  filterComponents?: React.ReactNode
  isFiltered?: boolean
  onClearFilters?: () => void
}

export function DataTableToolbar({
  searchValue,
  onSearchChange,
  onSearchClear,
  selectedRowCount,
  onDeleteSelected,
  onExport,
  onAdd,
  columns,
  columnVisibility,
  onColumnVisibilityChange,
  filterComponents,
  isFiltered,
  onClearFilters,
}: DataTableToolbarProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        {/* Search Input */}
        <Input
          placeholder="Search..."
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          className="h-8 w-[150px] lg:w-[250px]"
        />
        
        {/* Filter Components */}
        {filterComponents}

        {/* Clear filters button */}
        {(isFiltered || searchValue) && (
          <Button
            variant="ghost"
            onClick={() => {
              onSearchClear()
              onClearFilters?.()
            }}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-2">
        {/* Add Button */}
        {onAdd && (
          <Button onClick={onAdd} size="sm" className="h-8">
            <Plus className="mr-2 h-4 w-4" />
            Add New
          </Button>
        )}

        {/* Export Button */}
        {onExport && (
          <Button variant="outline" size="sm" onClick={onExport} className="h-8">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        )}

        {/* Delete Selected Button */}
        {selectedRowCount > 0 && onDeleteSelected && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="h-8">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete ({selectedRowCount})
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete {selectedRowCount} selected item{selectedRowCount > 1 ? 's' : ''}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDeleteSelected} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Column Selector */}
        <ColumnSelector
          columns={columns}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={onColumnVisibilityChange}
        />
      </div>
    </div>
  )
}