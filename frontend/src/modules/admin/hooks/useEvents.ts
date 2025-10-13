import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type {
  EventListResponse,
  EventStatistics,
  EventExportRequest
} from '../types/events'

// API base URL - adjust based on your backend configuration
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

// Events API functions
const eventsApi = {
  // Get events with pagination and filters
  getEvents: async (params: {
    page?: number
    limit?: number
    level?: string
    category?: string
    action?: string
    user_id?: number
    start_date?: string
    end_date?: string
    search_query?: string
  }): Promise<EventListResponse> => {
    const searchParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value.toString())
      }
    })

    const response = await fetch(`${API_BASE}/events?${searchParams.toString()}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch events: ${response.statusText}`)
    }

    return response.json()
  },

  // Get event statistics
  getEventStatistics: async (hours: number = 24): Promise<EventStatistics> => {
    const response = await fetch(`${API_BASE}/events/statistics?hours=${hours}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch event statistics: ${response.statusText}`)
    }

    return response.json()
  },

  // Get specific event by ID
  getEventById: async (eventId: string) => {
    const response = await fetch(`${API_BASE}/events/${eventId}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch event: ${response.statusText}`)
    }

    return response.json()
  },

  // Export events
  exportEvents: async (params: EventExportRequest): Promise<Blob> => {
    const searchParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value.toString())
      }
    })

    const response = await fetch(`${API_BASE}/events/export?${searchParams.toString()}`, {
      credentials: 'include',
      headers: {
        'Accept': params.format === 'csv' ? 'text/csv' : 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to export events: ${response.statusText}`)
    }

    return response.blob()
  },

  // Get logs from file
  getLogsFromFile: async (params: {
    date?: string
    lines?: number
  }) => {
    const searchParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value.toString())
      }
    })

    const response = await fetch(`${API_BASE}/logs?${searchParams.toString()}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch logs: ${response.statusText}`)
    }

    return response.json()
  },

  // Get available event levels
  getEventLevels: async () => {
    const response = await fetch(`${API_BASE}/events/levels`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch event levels: ${response.statusText}`)
    }

    return response.json()
  },

  // Get available event categories
  getEventCategories: async () => {
    const response = await fetch(`${API_BASE}/events/categories`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch event categories: ${response.statusText}`)
    }

    return response.json()
  },

  // Get available event actions
  getEventActions: async () => {
    const response = await fetch(`${API_BASE}/events/actions`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch event actions: ${response.statusText}`)
    }

    return response.json()
  }
}

// React Query hooks
export const useEvents = (params: {
  page?: number
  limit?: number
  level?: string
  category?: string
  action?: string
  user_id?: number
  start_date?: string
  end_date?: string
  search_query?: string
} = {}) => {
  return useQuery({
    queryKey: ['events', params],
    queryFn: () => eventsApi.getEvents(params),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  })
}

export const useEventStatistics = (hours: number = 24) => {
  return useQuery({
    queryKey: ['event-statistics', hours],
    queryFn: () => eventsApi.getEventStatistics(hours),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  })
}

export const useEventById = (eventId: string | null) => {
  return useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventsApi.getEventById(eventId!),
    enabled: !!eventId,
  })
}

export const useLogsFromFile = (params: {
  date?: string
  lines?: number
} = {}) => {
  return useQuery({
    queryKey: ['logs-file', params],
    queryFn: () => eventsApi.getLogsFromFile(params),
    staleTime: 60000, // 1 minute
  })
}

export const useEventLevels = () => {
  return useQuery({
    queryKey: ['event-levels'],
    queryFn: eventsApi.getEventLevels,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useEventCategories = () => {
  return useQuery({
    queryKey: ['event-categories'],
    queryFn: eventsApi.getEventCategories,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useEventActions = () => {
  return useQuery({
    queryKey: ['event-actions'],
    queryFn: eventsApi.getEventActions,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Export events mutation
export const useExportEvents = () => {
  return useMutation({
    mutationFn: eventsApi.exportEvents,
    onSuccess: (blob, variables) => {
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      const filename = `events-${new Date().toISOString().split('T')[0]}.${variables.format}`
      link.setAttribute('download', filename)
      
      document.body.appendChild(link)
      link.click()
      link.remove()
      
      window.URL.revokeObjectURL(url)
      
      toast.success(`Events exported successfully as ${variables.format.toUpperCase()}`)
    },
    onError: (error) => {
      console.error('Export error:', error)
      toast.error('Failed to export events')
    },
  })
}

// Real-time events hook (for future WebSocket implementation)
export const useRealTimeEvents = () => {
  const queryClient = useQueryClient()

  // TODO: Implement WebSocket connection for real-time updates
  // This would invalidate queries when new events arrive
  
  const invalidateEventsQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['events'] })
    queryClient.invalidateQueries({ queryKey: ['event-statistics'] })
  }

  return {
    invalidateEventsQueries
  }
}