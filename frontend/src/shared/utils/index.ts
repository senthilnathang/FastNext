'use client'

// Shared Utilities
export { cn } from './utils'

// Performance and optimization utilities
export * from './performance'
export * from './performance-server'

// Re-export commonly used utilities for optimization
export type {
  PerformanceMeasurement,
  VirtualScrollResult,
  PerformanceConfig
} from './performance'

export type {
  ServerPerformanceMeasurement,
  ServerMemoryUsage
} from './performance-server'

// Performance monitoring shortcuts (client-side)
export {
  performance as perfUtils,
  memoryMonitor,
  performanceBudget,
  bundleAnalyzer,
  resourcePreloader
} from './performance'

// Server-safe performance utilities
export {
  serverPerformance,
  serverMemoryMonitor,
  serverPerformanceBudget,
  serverBundleAnalyzer,
  serverResourcePreloader,
  serverOptimizationUtils
} from './performance-server'

export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const formatRelativeTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000)

  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`
  
  return formatDate(d)
}

export const capitalizeFirst = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void => {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9)
}