"use client"

import React, { Component, ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Card } from '@/shared/components/ui/card'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

class SwaggerErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error but suppress SwaggerUI specific warnings
    if (
      error.message?.includes('UNSAFE_componentWillReceiveProps') ||
      error.message?.includes('componentWillReceiveProps') ||
      error.message?.includes('OperationContainer')
    ) {
      // These are known SwaggerUI warnings, reset the error state
      this.setState({ hasError: false, error: undefined })
      return
    }
    
    console.error('SwaggerUI Error:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <Card className="p-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h3 className="text-lg font-semibold mb-2">API Documentation Error</h3>
            <p className="text-sm text-muted-foreground mb-4">
              There was an error loading the API documentation.
            </p>
            <Button onClick={this.handleRetry} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </Card>
        )
      )
    }

    return this.props.children
  }
}

export default SwaggerErrorBoundary