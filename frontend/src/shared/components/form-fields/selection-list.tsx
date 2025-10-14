"use client"

import * as React from "react"
import { Check, X } from "lucide-react"

import { cn } from '@/shared/utils'
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Checkbox } from "@/shared/components/ui/checkbox"

interface SelectionOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectionListProps {
  options: SelectionOption[]
  value?: string[]
  onChange?: (value: string[]) => void
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
  error?: string
  id?: string
  multiple?: boolean
  searchable?: boolean
  maxSelections?: number
  showSelectAll?: boolean
}

export function SelectionList({
  options,
  value = [],
  onChange,
  label,
  placeholder = "Search options...",
  required = false,
  disabled = false,
  className,
  error,
  id,
  multiple = true,
  searchable = true,
  maxSelections,
  showSelectAll = true,
}: SelectionListProps) {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedValues, setSelectedValues] = React.useState<string[]>(value)

  React.useEffect(() => {
    setSelectedValues(value)
  }, [value])

  const filteredOptions = React.useMemo(() => {
    if (!searchTerm) return options
    return options.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      option.value.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [options, searchTerm])

  const handleToggle = (optionValue: string) => {
    if (disabled) return

    let newValues: string[]

    if (multiple) {
      if (selectedValues.includes(optionValue)) {
        newValues = selectedValues.filter(v => v !== optionValue)
      } else {
        if (maxSelections && selectedValues.length >= maxSelections) {
          return
        }
        newValues = [...selectedValues, optionValue]
      }
    } else {
      newValues = selectedValues.includes(optionValue) ? [] : [optionValue]
    }

    setSelectedValues(newValues)
    onChange?.(newValues)
  }

  const handleSelectAll = () => {
    if (disabled) return

    const allValues = filteredOptions
      .filter(option => !option.disabled)
      .map(option => option.value)

    const newValues = selectedValues.length === allValues.length ? [] : allValues
    setSelectedValues(newValues)
    onChange?.(newValues)
  }

  const handleRemove = (optionValue: string) => {
    const newValues = selectedValues.filter(v => v !== optionValue)
    setSelectedValues(newValues)
    onChange?.(newValues)
  }

  const getSelectedOptions = () => {
    return options.filter(option => selectedValues.includes(option.value))
  }

  const isAllSelected = filteredOptions
    .filter(option => !option.disabled)
    .every(option => selectedValues.includes(option.value))

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}

      {/* Selected Items Display */}
      {selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-1 p-2 border rounded-md bg-muted/30">
          {getSelectedOptions().map(option => (
            <Badge
              key={option.value}
              variant="secondary"
              className="flex items-center gap-1"
            >
              {option.label}
              {!disabled && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-3 w-3 p-0 hover:bg-transparent"
                  onClick={() => handleRemove(option.value)}
                >
                  <X className="h-2 w-2" />
                </Button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Search Input */}
      {searchable && (
        <Input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={disabled}
          className="w-full"
        />
      )}

      {/* Options List */}
      <div className="border rounded-md max-h-60 overflow-y-auto">
        {/* Select All Option */}
        {multiple && showSelectAll && filteredOptions.length > 1 && (
          <div className="border-b p-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={handleSelectAll}
                disabled={disabled}
              />
              <label className="text-sm font-medium cursor-pointer">
                Select All ({filteredOptions.filter(o => !o.disabled).length})
              </label>
            </div>
          </div>
        )}

        {/* Options */}
        <div className="p-1">
          {filteredOptions.length === 0 ? (
            <div className="p-2 text-sm text-muted-foreground text-center">
              No options found
            </div>
          ) : (
            filteredOptions.map(option => {
              const isSelected = selectedValues.includes(option.value)
              const isDisabled = disabled || option.disabled
              const isMaxReached = Boolean(maxSelections &&
                selectedValues.length >= maxSelections &&
                !isSelected)

              return (
                <div
                  key={option.value}
                  className={cn(
                    "flex items-center space-x-2 p-2 rounded cursor-pointer hover:bg-muted/50",
                    isDisabled && "opacity-50 cursor-not-allowed",
                    isMaxReached && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={() => !isDisabled && !isMaxReached && handleToggle(option.value)}
                >
                  {multiple ? (
                    <Checkbox
                      checked={isSelected}
                      disabled={isDisabled || isMaxReached}
                      onCheckedChange={() => handleToggle(option.value)}
                    />
                  ) : (
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2",
                      isSelected ? "bg-primary border-primary" : "border-muted-foreground"
                    )}>
                      {isSelected && <Check className="w-2 h-2 text-white m-0.5" />}
                    </div>
                  )}
                  <label className="text-sm cursor-pointer flex-1">
                    {option.label}
                  </label>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Helper Text */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          {selectedValues.length} selected
          {maxSelections && ` (max ${maxSelections})`}
        </span>
        {searchable && searchTerm && (
          <span>{filteredOptions.length} of {options.length} shown</span>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}
