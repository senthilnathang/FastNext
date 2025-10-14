'use client'

import React from 'react'
import { Button } from '@/shared/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu'
import { Badge } from '@/shared/components/ui/badge'
import { Group, X } from 'lucide-react'

export interface GroupOption {
  key: string
  label: string
  icon?: React.ReactNode
}

export interface GroupControlProps {
  options: GroupOption[]
  value?: string
  onChange: (field: string) => void
  placeholder?: string
  className?: string
  allowClear?: boolean
}

export function GroupControl({
  options,
  value,
  onChange,
  placeholder = 'Group by...',
  className,
  allowClear = true
}: GroupControlProps) {
  const selectedOption = options.find(option => option.key === value)

  const handleGroupChange = (field: string) => {
    onChange(field)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Group className="h-4 w-4" />
          <span className="ml-2">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {value && (
            <div className="flex items-center ml-2">
              <Badge variant="secondary">
                Grouped
              </Badge>
              {allowClear && (
                <span
                  className="inline-flex items-center justify-center h-auto p-1 ml-1 rounded hover:bg-destructive hover:text-destructive-foreground cursor-pointer"
                  onClick={handleClear}
                >
                  <X className="h-3 w-3" />
                </span>
              )}
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[200px]">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.key}
            onClick={() => handleGroupChange(option.key)}
            className={value === option.key ? 'bg-accent' : ''}
          >
            <div className="flex items-center space-x-2">
              {option.icon}
              <span>{option.label}</span>
            </div>
          </DropdownMenuItem>
        ))}
        {value && allowClear && (
          <>
            <DropdownMenuItem onClick={() => onChange('')} className="text-muted-foreground">
              Clear grouping
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
