"use client"

import * as React from "react"
import { Search, Filter, X, ChevronDown, Calendar, SortAsc, SortDesc } from "lucide-react"

import { cn } from "@/shared/utils"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Badge } from "@/shared/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/components/ui/command"
import { Calendar as CalendarComponent } from "@/shared/components/ui/calendar"
import { format } from "date-fns"

export interface SearchFilter {
  id: string
  type: 'text' | 'select' | 'multiselect' | 'date' | 'daterange' | 'boolean'
  field: string
  label: string
  placeholder?: string
  options?: { value: string; label: string }[]
  value?: any
  operator?: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'between'
}

export interface SortOption {
  field: string
  label: string
  direction: 'asc' | 'desc'
}

export interface SearchState {
  query: string
  filters: SearchFilter[]
  sort: SortOption | null
  page: number
  pageSize: number
}

interface AdvancedSearchProps {
  searchState: SearchState
  onSearchChange: (state: SearchState) => void
  availableFilters: Omit<SearchFilter, 'value'>[]
  availableSorts: Omit<SortOption, 'direction'>[]
  className?: string
  placeholder?: string
  showResultCount?: boolean
  resultCount?: number
  loading?: boolean
}

interface FilterBuilderProps {
  filter: SearchFilter
  onUpdate: (filter: SearchFilter) => void
  onRemove: () => void
}

function FilterBuilder({ filter, onUpdate, onRemove }: FilterBuilderProps) {
  const updateValue = React.useCallback((value: any) => {
    onUpdate({ ...filter, value })
  }, [filter, onUpdate])

  const renderFilterInput = () => {
    switch (filter.type) {
      case 'text':
        return (
          <Input
            placeholder={filter.placeholder || `Search ${filter.label.toLowerCase()}...`}
            value={filter.value || ''}
            onChange={(e) => updateValue(e.target.value)}
            className="w-48"
          />
        )

      case 'select':
        return (
          <Select value={filter.value || ''} onValueChange={updateValue}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={`Select ${filter.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {filter.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'multiselect':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-48 justify-between">
                {filter.value?.length > 0
                  ? `${filter.value.length} selected`
                  : `Select ${filter.label.toLowerCase()}`
                }
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-0">
              <Command>
                <CommandInput placeholder={`Search ${filter.label.toLowerCase()}...`} />
                <CommandList>
                  <CommandEmpty>No options found.</CommandEmpty>
                  <CommandGroup>
                    {filter.options?.map((option) => (
                      <CommandItem
                        key={option.value}
                        onSelect={() => {
                          const currentValues = filter.value || []
                          const newValues = currentValues.includes(option.value)
                            ? currentValues.filter((v: string) => v !== option.value)
                            : [...currentValues, option.value]
                          updateValue(newValues)
                        }}
                      >
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={filter.value?.includes(option.value)}
                            className="rounded border-gray-300"
                            readOnly
                          />
                          <span>{option.label}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )

      case 'date':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-48 justify-start text-left font-normal">
                <Calendar className="mr-2 h-4 w-4" />
                {filter.value ? format(filter.value, "PPP") : `Pick ${filter.label.toLowerCase()}`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={filter.value}
                onSelect={updateValue}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        )

      case 'daterange':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-48 justify-start text-left font-normal">
                <Calendar className="mr-2 h-4 w-4" />
                {filter.value?.from
                  ? `${format(filter.value.from, "LLL dd")} - ${filter.value.to ? format(filter.value.to, "LLL dd") : "..."}`
                  : `Pick date range`
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="range"
                defaultMonth={filter.value?.from}
                selected={filter.value}
                onSelect={updateValue}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        )

      case 'boolean':
        return (
          <Select value={filter.value?.toString() || ''} onValueChange={(value) => updateValue(value === 'true')}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={`Select ${filter.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        )

      default:
        return null
    }
  }

  return (
    <div className="flex items-center space-x-2 p-2 border rounded-lg bg-gray-50 dark:bg-gray-800/50">
      <Label className="text-sm font-medium whitespace-nowrap min-w-0">
        {filter.label}
      </Label>
      {renderFilterInput()}
      <Button variant="ghost" size="sm" onClick={onRemove}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

export function AdvancedSearch({
  searchState,
  onSearchChange,
  availableFilters,
  availableSorts,
  className,
  placeholder = "Search...",
  showResultCount = true,
  resultCount,
  loading = false
}: AdvancedSearchProps) {
  const [showFilters, setShowFilters] = React.useState(false)

  const updateSearchQuery = (query: string) => {
    onSearchChange({ ...searchState, query, page: 1 })
  }

  const addFilter = (filterConfig: Omit<SearchFilter, 'value'>) => {
    const newFilter: SearchFilter = {
      ...filterConfig,
      id: `${filterConfig.field}-${Date.now()}`,
      value: undefined
    }
    onSearchChange({
      ...searchState,
      filters: [...searchState.filters, newFilter],
      page: 1
    })
  }

  const updateFilter = (filterId: string, updatedFilter: SearchFilter) => {
    const newFilters = searchState.filters.map(f =>
      f.id === filterId ? updatedFilter : f
    )
    onSearchChange({ ...searchState, filters: newFilters, page: 1 })
  }

  const removeFilter = (filterId: string) => {
    const newFilters = searchState.filters.filter(f => f.id !== filterId)
    onSearchChange({ ...searchState, filters: newFilters, page: 1 })
  }

  const clearAllFilters = () => {
    onSearchChange({
      ...searchState,
      query: '',
      filters: [],
      sort: null,
      page: 1
    })
  }

  const updateSort = (field: string) => {
    const currentDirection = searchState.sort?.field === field ? searchState.sort.direction : null
    const newDirection = currentDirection === 'asc' ? 'desc' : 'asc'

    const sortOption = availableSorts.find(s => s.field === field)
    if (sortOption) {
      onSearchChange({
        ...searchState,
        sort: { ...sortOption, direction: newDirection },
        page: 1
      })
    }
  }

  const activeFilterCount = searchState.filters.filter(f => f.value !== undefined && f.value !== '').length
  const hasActiveSearch = searchState.query || activeFilterCount > 0 || searchState.sort

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main Search Bar */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
          <Input
            placeholder={placeholder}
            value={searchState.query}
            onChange={(e) => updateSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "shrink-0",
            activeFilterCount > 0 && "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
          )}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        {availableSorts.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="shrink-0">
                {searchState.sort ? (
                  <>
                    {searchState.sort.direction === 'asc' ? (
                      <SortAsc className="h-4 w-4 mr-2" />
                    ) : (
                      <SortDesc className="h-4 w-4 mr-2" />
                    )}
                    {availableSorts.find(s => s.field === searchState.sort?.field)?.label}
                  </>
                ) : (
                  <>
                    <SortAsc className="h-4 w-4 mr-2" />
                    Sort
                  </>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48" align="end">
              <div className="space-y-1">
                {availableSorts.map((sort) => (
                  <Button
                    key={sort.field}
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => updateSort(sort.field)}
                  >
                    {searchState.sort?.field === sort.field ? (
                      searchState.sort.direction === 'asc' ? (
                        <SortAsc className="h-4 w-4 mr-2" />
                      ) : (
                        <SortDesc className="h-4 w-4 mr-2" />
                      )
                    ) : (
                      <SortAsc className="h-4 w-4 mr-2 opacity-50" />
                    )}
                    {sort.label}
                  </Button>
                ))}
                {searchState.sort && (
                  <>
                    <div className="border-t my-1" />
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-red-600 dark:text-red-400"
                      onClick={() => onSearchChange({ ...searchState, sort: null, page: 1 })}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear Sort
                    </Button>
                  </>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Result Count */}
      {showResultCount && resultCount !== undefined && (
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>
            {loading ? 'Searching...' : `${resultCount.toLocaleString()} result${resultCount !== 1 ? 's' : ''} found`}
          </span>
          {hasActiveSearch && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
            >
              <X className="h-4 w-4 mr-1" />
              Clear all
            </Button>
          )}
        </div>
      )}

      {/* Active Filters */}
      {searchState.filters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {searchState.filters.map((filter) => (
            <FilterBuilder
              key={filter.id}
              filter={filter}
              onUpdate={(updatedFilter) => updateFilter(filter.id, updatedFilter)}
              onRemove={() => removeFilter(filter.id)}
            />
          ))}
        </div>
      )}

      {/* Filter Builder Panel */}
      {showFilters && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Add Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {availableFilters.map((filterConfig) => (
                <Button
                  key={filterConfig.field}
                  variant="outline"
                  className="h-auto p-4 justify-start"
                  onClick={() => addFilter(filterConfig)}
                  disabled={searchState.filters.some(f => f.field === filterConfig.field)}
                >
                  <div className="text-left">
                    <div className="font-medium">{filterConfig.label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {filterConfig.type.charAt(0).toUpperCase() + filterConfig.type.slice(1)} filter
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default AdvancedSearch
