"use client"

import * as React from "react"
import { 
  Type, 
  Calendar, 
  Clock, 
  Hash, 
  ChevronDown, 
  List, 
  CheckSquare, 
  ToggleLeft, 
  Upload, 
  Image as ImageIcon,
  FileText,
  Search,
  Grid3X3,
  BarChart3
} from "lucide-react"

import { cn } from '@/shared/utils'
import { Button } from "@/shared/components/button"
import { Input } from "@/shared/components/input"
import { Label } from "@/shared/components/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/popover"

export interface WidgetType {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  category: string
  description: string
  properties?: Record<string, unknown>
}

const defaultWidgetTypes: WidgetType[] = [
  // Input Widgets
  {
    id: "text",
    name: "Text Input",
    icon: Type,
    category: "Input",
    description: "Single line text input"
  },
  {
    id: "textarea",
    name: "Text Area",
    icon: FileText,
    category: "Input", 
    description: "Multi-line text input"
  },
  {
    id: "number",
    name: "Number",
    icon: Hash,
    category: "Input",
    description: "Numeric input with validation"
  },
  {
    id: "email",
    name: "Email",
    icon: Type,
    category: "Input",
    description: "Email input with validation"
  },
  {
    id: "password",
    name: "Password",
    icon: Type,
    category: "Input",
    description: "Password input field"
  },
  
  // Date & Time
  {
    id: "date",
    name: "Date",
    icon: Calendar,
    category: "Date & Time",
    description: "Date picker"
  },
  {
    id: "datetime",
    name: "Date & Time",
    icon: Clock,
    category: "Date & Time",
    description: "Date and time picker"
  },
  {
    id: "time",
    name: "Time",
    icon: Clock,
    category: "Date & Time",
    description: "Time picker"
  },
  
  // Selection
  {
    id: "select",
    name: "Dropdown",
    icon: ChevronDown,
    category: "Selection",
    description: "Dropdown selection"
  },
  {
    id: "multiselect",
    name: "Multi-Select",
    icon: List,
    category: "Selection",
    description: "Multiple selection dropdown"
  },
  {
    id: "radio",
    name: "Radio Group",
    icon: CheckSquare,
    category: "Selection",
    description: "Single selection radio buttons"
  },
  {
    id: "checkbox",
    name: "Checkbox",
    icon: CheckSquare,
    category: "Selection",
    description: "Checkbox input"
  },
  {
    id: "switch",
    name: "Switch",
    icon: ToggleLeft,
    category: "Selection",
    description: "Toggle switch"
  },
  
  // File & Media
  {
    id: "file",
    name: "File Upload",
    icon: Upload,
    category: "File & Media",
    description: "File upload component"
  },
  {
    id: "image",
    name: "Image Upload",
    icon: ImageIcon,
    category: "File & Media",
    description: "Image upload with preview"
  },
  
  // Layout & Display
  {
    id: "table",
    name: "Data Table",
    icon: Grid3X3,
    category: "Display",
    description: "Data table with sorting and filtering"
  },
  {
    id: "chart",
    name: "Chart",
    icon: BarChart3,
    category: "Display",
    description: "Chart visualization"
  }
]

interface WidgetSelectorProps {
  value?: WidgetType
  onChange?: (widget: WidgetType) => void
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
  error?: string
  id?: string
  widgetTypes?: WidgetType[]
  searchable?: boolean
  categoryFilter?: boolean
}

export function WidgetSelector({
  value,
  onChange,
  label,
  placeholder = "Select a widget type...",
  required = false,
  disabled = false,
  className,
  error,
  id,
  widgetTypes = defaultWidgetTypes,
  searchable = true,
  categoryFilter = true,
}: WidgetSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null)

  const categories = React.useMemo(() => {
    const categorySet = new Set(widgetTypes.map(widget => widget.category))
    return Array.from(categorySet).sort()
  }, [widgetTypes])

  const filteredWidgets = React.useMemo(() => {
    let filtered = widgetTypes

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(widget =>
        widget.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        widget.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        widget.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(widget => widget.category === selectedCategory)
    }

    return filtered
  }, [widgetTypes, searchTerm, selectedCategory])

  const groupedWidgets = React.useMemo(() => {
    return filteredWidgets.reduce((groups, widget) => {
      const category = widget.category
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(widget)
      return groups
    }, {} as Record<string, WidgetType[]>)
  }, [filteredWidgets])

  const handleSelect = (widget: WidgetType) => {
    onChange?.(widget)
    setOpen(false)
  }

  const handleClearCategory = () => {
    setSelectedCategory(null)
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between",
              !value && "text-muted-foreground",
              error && "border-red-500 focus:border-red-500 focus:ring-red-500"
            )}
            disabled={disabled}
          >
            {value ? (
              <div className="flex items-center gap-2">
                <value.icon className="h-4 w-4" />
                <span>{value.name}</span>
                <span className="text-xs text-muted-foreground">({value.category})</span>
              </div>
            ) : (
              placeholder
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-96 p-0" align="start">
          <div className="flex flex-col max-h-96">
            {/* Search and Filter */}
            <div className="p-3 space-y-2 border-b">
              {searchable && (
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search widgets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              )}
              
              {categoryFilter && (
                <div className="flex flex-wrap gap-1">
                  <Button
                    variant={selectedCategory === null ? "default" : "outline"}
                    size="sm"
                    onClick={handleClearCategory}
                    className="text-xs"
                  >
                    All
                  </Button>
                  {categories.map(category => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(
                        selectedCategory === category ? null : category
                      )}
                      className="text-xs"
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Widget List */}
            <div className="flex-1 overflow-y-auto">
              {Object.keys(groupedWidgets).length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No widgets found
                </div>
              ) : (
                Object.entries(groupedWidgets).map(([category, widgets]) => (
                  <div key={category}>
                    <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50">
                      {category}
                    </div>
                    <div className="p-1">
                      {widgets.map(widget => (
                        <div
                          key={widget.id}
                          className={cn(
                            "flex items-start gap-3 p-2 rounded cursor-pointer hover:bg-muted/50",
                            value?.id === widget.id && "bg-muted"
                          )}
                          onClick={() => handleSelect(widget)}
                        >
                          <widget.icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{widget.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {widget.description}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}