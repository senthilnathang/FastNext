// Server-safe performance utilities (no React hooks)

// Performance measurement utilities for server-side and static contexts
export const serverPerformance = {
  /**
   * Measure execution time of a function (server-safe)
   */
  measure: async <T>(name: string, fn: () => Promise<T> | T): Promise<T> => {
    const start = typeof performance !== 'undefined' ? performance.now() : Date.now()
    const result = await fn()
    const end = typeof performance !== 'undefined' ? performance.now() : Date.now()


    return result
  },

  /**
   * Mark performance points for complex operations (server-safe)
   */
  mark: (name: string) => {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(name)
    }
  },

  /**
   * Measure between two marks (server-safe)
   */
  measureBetween: (name: string, startMark: string, endMark: string) => {
    if (typeof performance !== 'undefined' && performance.measure) {
      try {
        performance.measure(name, startMark, endMark)
        const measures = performance.getEntriesByName(name, 'measure')
        if (measures.length > 0) {
          const duration = measures[measures.length - 1].duration
        }
      } catch (error) {
        console.warn('Performance measurement failed:', error)
      }
    }
  }
}

// Resource preloader for server-side use
export const serverResourcePreloader = {
  preloadImage: (src: string): Promise<void> => {
    if (typeof window === 'undefined') return Promise.resolve()

    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve()
      img.onerror = reject
      img.src = src
    })
  },

  preloadScript: (src: string): Promise<void> => {
    if (typeof document === 'undefined') return Promise.resolve()

    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve()
        return
      }

      const script = document.createElement('script')
      script.src = src
      script.onload = () => resolve()
      script.onerror = reject
      document.head.appendChild(script)
    })
  },

  preloadCSS: (href: string): Promise<void> => {
    if (typeof document === 'undefined') return Promise.resolve()

    return new Promise((resolve, reject) => {
      if (document.querySelector(`link[href="${href}"]`)) {
        resolve()
        return
      }

      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = href
      link.onload = () => resolve()
      link.onerror = reject
      document.head.appendChild(link)
    })
  }
}

// Memory monitoring for server-side use
export const serverMemoryMonitor = {
  getUsage: () => {
    if (typeof window === 'undefined' || !('memory' in performance)) {
      return null
    }

    const memory = (performance as any).memory
    return {
      used: Math.round(memory.usedJSHeapSize / 1048576), // MB
      total: Math.round(memory.totalJSHeapSize / 1048576), // MB
      limit: Math.round(memory.jsHeapSizeLimit / 1048576), // MB
    }
  },

  logUsage: (label?: string) => {
    const usage = serverMemoryMonitor.getUsage()
    if (usage) {
    }
  },

  warnIfHigh: (threshold: number = 80) => {
    const usage = serverMemoryMonitor.getUsage()
    if (usage && (usage.used / usage.limit) * 100 > threshold) {
      console.warn(`⚠️  High memory usage: ${usage.used}MB / ${usage.limit}MB (${((usage.used / usage.limit) * 100).toFixed(1)}%)`)
    }
  }
}

// Performance budget enforcement for server-side
export const serverPerformanceBudget = {
  checkLoadTime: (threshold: number = 3000) => {
    if (typeof window === 'undefined' || !window.performance?.timing) {
      return null
    }

    const loadTime = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart

    if (loadTime > threshold) {
      console.warn(`⚠️  Page load time (${loadTime}ms) exceeds budget (${threshold}ms)`)
    } else {
    }

    return loadTime
  },

  checkBundleSize: async (threshold: number = 250 * 1024) => { // 250KB
    if (typeof navigator === 'undefined' || !('connection' in navigator)) {
      return threshold
    }

    const connection = (navigator as any).connection
    if (connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g') {
      console.warn('⚠️  Slow connection detected. Consider reducing bundle size.')
    }

    return threshold
  }
}

// Bundle size analyzer for server-side
export const serverBundleAnalyzer = {
  analyzeComponent: (componentName: string, component: React.ComponentType) => {
    if (typeof window === 'undefined') return

    if (process.env.NODE_ENV === 'development') {
      const componentString = component.toString()
      const size = new Blob([componentString]).size


      // Warn if component is large
      if (size > 50 * 1024) { // 50KB
        console.warn(`⚠️  Component ${componentName} is large (${(size / 1024).toFixed(2)}KB). Consider code splitting.`)
      }
    }
  },

  measureRenderTime: (componentName: string) => {
    return {
      start: () => serverPerformance.mark(`${componentName}-render-start`),
      end: () => {
        serverPerformance.mark(`${componentName}-render-end`)
        serverPerformance.measureBetween(
          `${componentName}-render`,
          `${componentName}-render-start`,
          `${componentName}-render-end`
        )
      }
    }
  }
}

// Utility functions for server-side optimization
export const serverOptimizationUtils = {
  /**
   * Debounce function for server-side use
   */
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void => {
    let timeout: NodeJS.Timeout
    return (...args: Parameters<T>) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func(...args), wait)
    }
  },

  /**
   * Throttle function for server-side use
   */
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void => {
    let lastTime = 0
    return (...args: Parameters<T>) => {
      const now = Date.now()
      if (now - lastTime >= wait) {
        func(...args)
        lastTime = now
      }
    }
  },

  /**
   * Simple memoization for server-side use
   */
  memoize: <T extends (...args: any[]) => any>(
    func: T,
    getKey?: (...args: Parameters<T>) => string
  ): T => {
    const cache = new Map<string, ReturnType<T>>()

    return ((...args: Parameters<T>): ReturnType<T> => {
      const key = getKey ? getKey(...args) : JSON.stringify(args)

      if (cache.has(key)) {
        return cache.get(key)!
      }

      const result = func(...args)
      cache.set(key, result)
      return result
    }) as T
  }
}

// Export types for server-side use
export type ServerPerformanceMeasurement = {
  name: string
  duration: number
  timestamp: number
}

export type ServerMemoryUsage = {
  used: number
  total: number
  limit: number
} | null
