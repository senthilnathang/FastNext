"use client"

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'

interface SwaggerUINoStrictProps {
  config: any
}

// Component that renders SwaggerUI outside of React.StrictMode to avoid lifecycle warnings
const SwaggerUINoStrict: React.FC<SwaggerUINoStrictProps> = ({ config }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSwaggerUI = useCallback(async () => {
    if (!containerRef.current) return

    try {
      setIsLoading(true)
      setError(null)

      // Import SwaggerUI dynamically
      const SwaggerUI = (await import('swagger-ui')).default

      // Clear container
      containerRef.current.innerHTML = ''

      // Create SwaggerUI instance
      SwaggerUI({
        domNode: containerRef.current,
        ...config,
        onComplete: () => {
          setIsLoading(false)
          if (config.onComplete) {
            config.onComplete()
          }
        },
        onFailure: (error: any) => {
          setIsLoading(false)
          setError('Failed to load API documentation')
          if (config.onFailure) {
            config.onFailure(error)
          }
        }
      })
    } catch (error) {
      setIsLoading(false)
      setError('Failed to load Swagger UI')
      console.error('SwaggerUI loading error:', error)
    }
  }, [config])

  useEffect(() => {
    loadSwaggerUI()
  }, [loadSwaggerUI])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading API Documentation...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    )
  }

  return <div ref={containerRef} className="swagger-ui-container" />
}

export default SwaggerUINoStrict
