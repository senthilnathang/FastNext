'use client'

import React from 'react'
import { Button } from '@/shared/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu'
import { Badge } from '@/shared/components/ui/badge'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

export interface SortOption {
  key: string
  label: string
  defaultOrder?: 'asc' | 'desc'
}

export interface SortControlProps {
  options: SortOption[]
  value?: string
  order?: 'asc' | 'desc'
  onChange: (field: string, order: 'asc' | 'desc') => void
  placeholder?: string
  className?: string
}

export function SortControl({
  options,
  value,
  order = 'asc',
  onChange,
  placeholder = 'Sort by...',
  className
}: SortControlProps) {
  const selectedOption = options.find(option => option.key === value)

  const handleSortChange = (field: string) => {
    if (value === field) {
      // Toggle order if same field
      const newOrder = order === 'asc' ? 'desc' : 'asc'
      onChange(field, newOrder)
    } else {
      // Use default order for new field
      const option = options.find(opt => opt.key === field)
      const defaultOrder = option?.defaultOrder || 'asc'
      onChange(field, defaultOrder)
    }
  }

  const getSortIcon = () => {
    if (!value) return <ArrowUpDown className="h-4 w-4" />
    return order === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          {getSortIcon()}
          <span className="ml-2">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {value && (
            <Badge variant="secondary" className="ml-2">
              {order === 'asc' ? 'A-Z' : 'Z-A'}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[200px]">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.key}
            onClick={() => handleSortChange(option.key)}
            className={value === option.key ? 'bg-accent' : ''}
          >
            <div className="flex items-center justify-between w-full">
              <span>{option.label}</span>
              {value === option.key && (
                <div className="flex items-center space-x-1">
                  {order === 'asc' ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : (
                    <ArrowDown className="h-3 w-3" />
                  )}
                </div>
              )}
            </div>
          </DropdownMenuItem>
        ))}
        {value && (
          <>
            <DropdownMenuItem onClick={() => onChange('', 'asc')} className="text-muted-foreground">
              Clear sorting
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
