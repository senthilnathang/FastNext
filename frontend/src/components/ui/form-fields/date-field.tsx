"use client"

import * as React from "react"
import { CalendarDays } from "lucide-react"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateFieldProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
  error?: string
  id?: string
}

export function DateField({
  value,
  onChange,
  label,
  placeholder = "Pick a date",
  required = false,
  disabled = false,
  className,
  error,
  id,
}: DateFieldProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState(
    value ? format(value, "yyyy-MM-dd") : ""
  )

  React.useEffect(() => {
    if (value) {
      setInputValue(format(value, "yyyy-MM-dd"))
    } else {
      setInputValue("")
    }
  }, [value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    
    if (newValue) {
      const date = new Date(newValue)
      if (!isNaN(date.getTime())) {
        onChange?.(date)
      }
    } else {
      onChange?.(undefined)
    }
  }

  // Calendar selection handler for future use
  // const handleCalendarSelect = (date: Date | undefined) => {
  //   onChange?.(date)
  //   setOpen(false)
  // }

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
          type="date"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "pr-10",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500"
          )}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              disabled={disabled}
            >
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-3">
              <div className="space-y-2">
                <div className="text-sm font-medium">Select Date</div>
                <Input
                  type="date"
                  value={inputValue}
                  onChange={handleInputChange}
                  className="w-full"
                />
                <div className="flex justify-end space-x-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (inputValue) {
                        const date = new Date(inputValue)
                        if (!isNaN(date.getTime())) {
                          onChange?.(date)
                        }
                      }
                      setOpen(false)
                    }}
                  >
                    Select
                  </Button>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}