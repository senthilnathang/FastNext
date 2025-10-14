'use client'

import * as React from "react"
import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu"
import { Settings2 } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/shared/components/ui/dropdown-menu"

export interface ColumnVisibility {
  [key: string]: boolean
}

export interface ColumnDefinition {
  id: string
  label: string
  canHide?: boolean
}

interface ColumnSelectorProps {
  columns: ColumnDefinition[]
  columnVisibility: ColumnVisibility
  onColumnVisibilityChange: (columnVisibility: ColumnVisibility) => void
}

export function ColumnSelector({
  columns,
  columnVisibility,
  onColumnVisibilityChange,
}: ColumnSelectorProps) {
  const hideableColumns = columns.filter(column => column.canHide !== false)

  const handleColumnToggle = (columnId: string, isVisible: boolean) => {
    onColumnVisibilityChange({
      ...columnVisibility,
      [columnId]: isVisible,
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto hidden h-8 lg:flex"
        >
          <Settings2 className="mr-2 h-4 w-4" />
          View
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[150px]">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {hideableColumns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            className="capitalize"
            checked={columnVisibility[column.id] !== false}
            onCheckedChange={(isChecked) =>
              handleColumnToggle(column.id, Boolean(isChecked))
            }
          >
            {column.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
