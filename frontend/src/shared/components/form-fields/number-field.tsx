"use client"

import * as React from "react"
import { Minus, Plus } from "lucide-react"

import { cn } from '@/shared/utils'
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"

interface NumberFieldProps {
  value?: number
  onChange?: (value: number | undefined) => void
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
  error?: string
  id?: string
  min?: number
  max?: number
  step?: number
  type?: "integer" | "float"
  showControls?: boolean
  precision?: number
}

export function NumberField({
  value,
  onChange,
  label,
  placeholder = "Enter number",
  required = false,
  disabled = false,
  className,
  error,
  id,
  min,
  max,
  step = 1,
  type = "integer",
  showControls = true,
  precision = 2,
}: NumberFieldProps) {
  const [inputValue, setInputValue] = React.useState("")

  React.useEffect(() => {
    if (value !== undefined) {
      setInputValue(value.toString())
    } else {
      setInputValue("")
    }
  }, [value])

  const parseValue = (val: string): number | undefined => {
    if (!val.trim()) return undefined
    
    const parsed = type === "integer" ? parseInt(val, 10) : parseFloat(val)
    
    if (isNaN(parsed)) return undefined
    
    // Apply min/max constraints
    if (min !== undefined && parsed < min) return min
    if (max !== undefined && parsed > max) return max
    
    // Apply precision for float
    if (type === "float" && precision !== undefined) {
      return Number(parsed.toFixed(precision))
    }
    
    return parsed
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    
    const parsed = parseValue(newValue)
    onChange?.(parsed)
  }

  const handleIncrement = () => {
    const currentValue = value ?? 0
    const newValue = currentValue + step
    const constrainedValue = parseValue(newValue.toString())
    onChange?.(constrainedValue)
  }

  const handleDecrement = () => {
    const currentValue = value ?? 0
    const newValue = currentValue - step
    const constrainedValue = parseValue(newValue.toString())
    onChange?.(constrainedValue)
  }

  const canIncrement = !disabled && (max === undefined || (value ?? 0) < max)
  const canDecrement = !disabled && (min === undefined || (value ?? 0) > min)

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <div className="relative">
        <Input
          id={id}
          type="number"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          className={cn(
            showControls && "pr-16",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500"
          )}
        />
        
        {showControls && (
          <div className="absolute right-1 top-1 bottom-1 flex flex-col">
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-6 p-0 rounded-none rounded-tr-sm hover:bg-muted"
              onClick={handleIncrement}
              disabled={!canIncrement}
              tabIndex={-1}
            >
              <Plus className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-6 p-0 rounded-none rounded-br-sm hover:bg-muted"
              onClick={handleDecrement}
              disabled={!canDecrement}
              tabIndex={-1}
            >
              <Minus className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
      
      {(min !== undefined || max !== undefined) && (
        <div className="text-xs text-muted-foreground">
          {min !== undefined && max !== undefined && `Range: ${min} - ${max}`}
          {min !== undefined && max === undefined && `Min: ${min}`}
          {min === undefined && max !== undefined && `Max: ${max}`}
        </div>
      )}
      
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}