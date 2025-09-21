"use client"

import * as React from "react"
import { Clock } from "lucide-react"
import { format } from "date-fns"

import { cn } from '@/shared/utils'
import { Button } from "@/shared/components/button"
import { Input } from "@/shared/components/input"
import { Label } from "@/shared/components/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/popover"

interface DateTimeFieldProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
  error?: string
  id?: string
  showSeconds?: boolean
}

export function DateTimeField({
  value,
  onChange,
  label,
  placeholder = "Pick date and time",
  required = false,
  disabled = false,
  className,
  error,
  id,
  showSeconds = false,
}: DateTimeFieldProps) {
  const [open, setOpen] = React.useState(false)
  const [dateValue, setDateValue] = React.useState("")
  const [timeValue, setTimeValue] = React.useState("")

  React.useEffect(() => {
    if (value) {
      setDateValue(format(value, "yyyy-MM-dd"))
      setTimeValue(format(value, showSeconds ? "HH:mm:ss" : "HH:mm"))
    } else {
      setDateValue("")
      setTimeValue("")
    }
  }, [value, showSeconds])

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDateValue = e.target.value
    setDateValue(newDateValue)
    updateDateTime(newDateValue, timeValue)
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTimeValue = e.target.value
    setTimeValue(newTimeValue)
    updateDateTime(dateValue, newTimeValue)
  }

  const updateDateTime = (date: string, time: string) => {
    if (date && time) {
      const dateTime = new Date(`${date}T${time}`)
      if (!isNaN(dateTime.getTime())) {
        onChange?.(dateTime)
      }
    } else if (date && !time) {
      const dateOnly = new Date(date)
      if (!isNaN(dateOnly.getTime())) {
        onChange?.(dateOnly)
      }
    } else if (!date && !time) {
      onChange?.(undefined)
    }
  }

  const handleNow = () => {
    const now = new Date()
    onChange?.(now)
    setOpen(false)
  }

  const formatDisplayValue = () => {
    if (value) {
      return format(value, showSeconds ? "yyyy-MM-dd HH:mm:ss" : "yyyy-MM-dd HH:mm")
    }
    return ""
  }

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
          type="text"
          value={formatDisplayValue()}
          placeholder={placeholder}
          disabled={disabled}
          readOnly
          className={cn(
            "pr-10 cursor-pointer",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500"
          )}
          onClick={() => !disabled && setOpen(true)}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              disabled={disabled}
            >
              <Clock className="h-4 w-4 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-3 space-y-3">
              <div className="text-sm font-medium">Select Date & Time</div>
              
              <div className="space-y-2">
                <Label htmlFor="date-input" className="text-xs text-muted-foreground">
                  Date
                </Label>
                <Input
                  id="date-input"
                  type="date"
                  value={dateValue}
                  onChange={handleDateChange}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="time-input" className="text-xs text-muted-foreground">
                  Time
                </Label>
                <Input
                  id="time-input"
                  type="time"
                  step={showSeconds ? "1" : "60"}
                  value={timeValue}
                  onChange={handleTimeChange}
                  className="w-full"
                />
              </div>

              <div className="flex justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNow}
                >
                  Now
                </Button>
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setOpen(false)}
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