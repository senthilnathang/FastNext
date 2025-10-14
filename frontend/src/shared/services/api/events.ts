/**
 * Events API Service
 * Handles user activity events and system events
 */

import { API_CONFIG, getApiUrl, getAuthHeaders } from './config'

export interface UserEvent {
  id: number
  user_id: number
  event_type: string
  event_category: string
  event_action: string
  entity_type?: string
  entity_id?: number
  entity_name?: string
  description: string
  ip_address?: string
  user_agent?: string
  location?: string
  metadata?: Record<string, any>
  timestamp: string
  session_id?: string
  device_info?: string
}

export interface EventsResponse {
  items: UserEvent[]
  total: number
  page: number
  per_page: number
  pages: number
}

export interface EventStatistics {
  total_events: number
  events_by_category: Record<string, number>
  events_by_action: Record<string, number>
  events_by_day: Record<string, number>
  unique_sessions: number
  unique_devices: number
  most_active_hours: Record<string, number>
  recent_activity_count: number
}

export interface EventFilters {
  search?: string
  event_type?: string
  event_category?: string
  event_action?: string
  start_date?: string
  end_date?: string
  days?: number
  page?: number
  per_page?: number
}

/**
 * Fetch user activity events
 */
export const fetchUserEvents = async (filters: EventFilters = {}): Promise<EventsResponse> => {
  const queryParams = new URLSearchParams()

  // Add filters to query params
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, String(value))
    }
  })

  const url = `${getApiUrl(API_CONFIG.ENDPOINTS.EVENTS.ME)}?${queryParams}`

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch user events: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Fetch all system events (admin only)
 */
export const fetchAllEvents = async (filters: EventFilters = {}): Promise<EventsResponse> => {
  const queryParams = new URLSearchParams()

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, String(value))
    }
  })

  const url = `${getApiUrl(API_CONFIG.ENDPOINTS.EVENTS.LIST)}?${queryParams}`

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch events: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Fetch event statistics
 */
export const fetchEventStatistics = async (days: number = 30): Promise<EventStatistics> => {
  const url = `${getApiUrl(API_CONFIG.ENDPOINTS.EVENTS.STATS)}?days=${days}`

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch event statistics: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Export events
 */
export const exportEvents = async (
  format: 'json' | 'csv' = 'json',
  filters: EventFilters = {}
): Promise<Blob> => {
  const queryParams = new URLSearchParams({ format })

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, String(value))
    }
  })

  const url = `${getApiUrl(API_CONFIG.ENDPOINTS.EVENTS.EXPORT)}?${queryParams}`

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to export events: ${response.statusText}`)
  }

  return response.blob()
}

/**
 * Create a new event (for tracking user actions)
 */
export const createEvent = async (event: Omit<UserEvent, 'id' | 'timestamp'>): Promise<UserEvent> => {
  const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.EVENTS.LIST), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(event),
  })

  if (!response.ok) {
    throw new Error(`Failed to create event: ${response.statusText}`)
  }

  return response.json()
}
