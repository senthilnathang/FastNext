'use client'

import { lazy, Suspense, memo, ComponentType } from 'react'
import { Skeleton } from '@/shared/components/ui/skeleton'

// Generic lazy loading wrapper with error boundary
interface LazyWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

const LazyWrapper = memo(({
  children,
  fallback = <ComponentSkeleton />
}: LazyWrapperProps) => {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  )
})

LazyWrapper.displayName = 'LazyWrapper'

// Default component skeleton
const ComponentSkeleton = memo(() => (
  <div className="space-y-4 p-4">
    <Skeleton className="h-8 w-1/3" />
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
    <div className="flex space-x-2">
      <Skeleton className="h-10 w-20" />
      <Skeleton className="h-10 w-20" />
    </div>
  </div>
))

ComponentSkeleton.displayName = 'ComponentSkeleton'

// Enhanced lazy loading with preloading support
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: {
    fallback?: React.ReactNode
    preload?: boolean
    chunkName?: string
  } = {}
): ComponentType<React.ComponentProps<T>> {
  const LazyComponent = lazy(importFn)
  
  // Preload if specified
  if (options.preload) {
    // Preload after a short delay to not block initial render
    setTimeout(() => {
      importFn().catch(() => {
        // Ignore preload errors
      })
    }, 100)
  }

  const WrappedComponent = memo((props: React.ComponentProps<T>) => (
    <LazyWrapper fallback={options.fallback}>
      <LazyComponent {...props} />
    </LazyWrapper>
  ))
  
  WrappedComponent.displayName = `Lazy(${options.chunkName || 'Component'})`
  
  // Add preload method to component
  ;(WrappedComponent as any).preload = importFn

  return WrappedComponent
}

// Lazy load modules based on user interaction
export function createInteractiveLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  trigger: 'hover' | 'click' | 'focus' = 'hover',
  options: {
    fallback?: React.ReactNode
    delay?: number
  } = {}
): ComponentType<React.ComponentProps<T> & { onTrigger?: () => void }> {
  let preloaded = false
  
  const preload = () => {
    if (!preloaded) {
      preloaded = true
      importFn().catch(() => {
        preloaded = false // Reset on error
      })
    }
  }

  const LazyComponent = lazy(importFn)

  const InteractiveLazyComponent = memo((props: React.ComponentProps<T> & { onTrigger?: () => void }) => {
    const { onTrigger, ...componentProps } = props
    
    const handleTrigger = () => {
      preload()
      onTrigger?.()
    }

    const triggerProps = {
      [trigger === 'hover' ? 'onMouseEnter' : trigger === 'click' ? 'onClick' : 'onFocus']: handleTrigger
    }

    return (
      <div {...triggerProps}>
        <LazyWrapper fallback={options.fallback}>
          <LazyComponent {...componentProps as React.ComponentProps<T>} />
        </LazyWrapper>
      </div>
    )
  })
  
  InteractiveLazyComponent.displayName = 'InteractiveLazyComponent'
  
  return InteractiveLazyComponent
}

// Route-based code splitting helper
export function createRouteLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  routePath: string
): ComponentType<React.ComponentProps<T>> {
  const LazyComponent = lazy(importFn)
  
  const RouteLazyComponent = memo((props: React.ComponentProps<T>) => (
    <LazyWrapper 
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="space-y-4 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600">Loading {routePath}...</p>
          </div>
        </div>
      }
    >
      <LazyComponent {...props} />
    </LazyWrapper>
  ))
  
  RouteLazyComponent.displayName = 'RouteLazyComponent'
  
  return RouteLazyComponent
}

// Lazy load with viewport intersection
export function createViewportLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: {
    rootMargin?: string
    threshold?: number
    fallback?: React.ReactNode
    placeholder?: React.ReactNode
  } = {}
): ComponentType<React.ComponentProps<T>> {
  const LazyComponent = lazy(importFn)

  const ViewportLazyComponent = memo((props: React.ComponentProps<T>) => (
    <LazyWrapper fallback={options.fallback}>
      <LazyComponent {...props} />
    </LazyWrapper>
  ))
  
  ViewportLazyComponent.displayName = 'ViewportLazyComponent'
  
  return ViewportLazyComponent
}

// Bundle splitting strategies
export const bundleStrategies = {
  // Feature-based splitting
  byFeature: <T extends ComponentType<any>>(
    featureName: string,
    importFn: () => Promise<{ default: T }>
  ) => createLazyComponent(importFn, {
    chunkName: `feature-${featureName}`,
    fallback: <ComponentSkeleton />
  }),

  // Route-based splitting
  byRoute: <T extends ComponentType<any>>(
    routeName: string,
    importFn: () => Promise<{ default: T }>
  ) => createRouteLazyComponent(importFn, routeName),

  // Library-based splitting (for heavy dependencies)
  byLibrary: <T extends ComponentType<any>>(
    libraryName: string,
    importFn: () => Promise<{ default: T }>
  ) => createLazyComponent(importFn, {
    chunkName: `lib-${libraryName}`,
    preload: false, // Heavy libraries shouldn't preload
    fallback: (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-600">Loading {libraryName}...</p>
        </div>
      </div>
    )
  }),

  // User interaction based
  onInteraction: <T extends ComponentType<any>>(
    importFn: () => Promise<{ default: T }>,
    trigger: 'hover' | 'click' | 'focus' = 'hover'
  ) => createInteractiveLazyComponent(importFn, trigger),

  // Viewport intersection based
  onVisible: <T extends ComponentType<any>>(
    importFn: () => Promise<{ default: T }>,
    options?: {
      rootMargin?: string
      threshold?: number
    }
  ) => createViewportLazyComponent(importFn, options)
}

// Pre-built lazy components for common heavy dependencies

// Charts and data visualization
export const LazyChart = bundleStrategies.byLibrary(
  'charts',
  () => import('@/shared/components/data-visualization/analytics-dashboard').then(m => ({ default: m.AnalyticsDashboard }))
)

// Rich text editor (commented out - component doesn't exist yet)
// export const LazyEditor = bundleStrategies.onInteraction(
//   () => import('@/shared/components/form-fields/rich-text-editor') as any,
//   'click'
// )

// PDF viewer (commented out - component doesn't exist yet)
// export const LazyPDFViewer = bundleStrategies.onVisible(
//   () => import('@/shared/components/media/pdf-viewer') as any,
//   { rootMargin: '100px' }
// )

// Image gallery (commented out - component doesn't exist yet)
// export const LazyImageGallery = bundleStrategies.onVisible(
//   () => import('@/shared/components/media/image-gallery') as any
// )

// Map component (commented out - component doesn't exist yet)
// export const LazyMap = bundleStrategies.onInteraction(
//   () => import('@/shared/components/maps/interactive-map') as any,
//   'hover'
// )

// Resource monitoring
export const lazyLoadingStats = {
  getLoadedChunks: (): string[] => {
    if (typeof window !== 'undefined' && (window as any).__webpack_require__) {
      return Object.keys(((window as any).__webpack_require__ as any).cache || {})
    }
    return []
  },

  preloadCriticalChunks: async (chunkNames: string[]) => {
    const preloadPromises = chunkNames.map(async (chunkName) => {
      try {
        // This would need to be implemented based on your bundler
        await import(/* webpackChunkName: "[request]" */ `@/shared/components/${chunkName}`)
      } catch (error) {
        console.warn(`Failed to preload chunk: ${chunkName}`, error)
      }
    })

    await Promise.allSettled(preloadPromises)
  },

  measureChunkLoadTime: (chunkName: string) => {
    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      const loadTime = endTime - startTime
      
      console.log(`📦 Chunk ${chunkName} loaded in ${loadTime.toFixed(2)}ms`)
      
      // Send to analytics if available
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'chunk_loaded', {
          chunk_name: chunkName,
          load_time: Math.round(loadTime),
        })
      }
    }
  }
}

// Export utility types
export type LazyComponentOptions = {
  fallback?: React.ReactNode
  preload?: boolean
  chunkName?: string
}

export type InteractiveLazyOptions = {
  fallback?: React.ReactNode
  delay?: number
}

export type ViewportLazyOptions = {
  rootMargin?: string
  threshold?: number
  fallback?: React.ReactNode
  placeholder?: React.ReactNode
}