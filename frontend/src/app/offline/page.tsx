"use client"

import { useEffect, useState } from 'react'
import { Wifi, WifiOff, RefreshCw, Home, Database, Settings } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Alert, AlertDescription } from '@/shared/components/ui/alert'

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [queuedActions, setQueuedActions] = useState(0)
  const [cacheStatus, setCacheStatus] = useState<any>(null)

  useEffect(() => {
    // Check online status
    setIsOnline(navigator.onLine)
    setLastUpdate(new Date().toLocaleString())

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Listen for service worker messages
    navigator.serviceWorker?.addEventListener('message', (event) => {
      const { type, data } = event.data
      
      switch (type) {
        case 'REQUEST_QUEUED':
          setQueuedActions(data.count)
          break
        case 'SYNC_COMPLETE':
          setQueuedActions(0)
          break
      }
    })

    // Get cache status
    getCacheStatus()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const getCacheStatus = async () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        const channel = new MessageChannel()
        navigator.serviceWorker.controller.postMessage(
          { type: 'GET_CACHE_STATUS' },
          [channel.port2]
        )
        
        channel.port1.onmessage = (event) => {
          setCacheStatus(event.data)
        }
      } catch (error) {
        console.error('Failed to get cache status:', error)
      }
    }
  }

  const handleRetry = () => {
    if (isOnline) {
      window.location.reload()
    } else {
      // Attempt to reconnect
      fetch('/api/health')
        .then(() => {
          window.location.reload()
        })
        .catch(() => {
          console.log('Still offline')
        })
    }
  }

  const clearCache = async () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        const channel = new MessageChannel()
        navigator.serviceWorker.controller.postMessage(
          { type: 'CLEAR_CACHE' },
          [channel.port2]
        )
        
        channel.port1.onmessage = (event) => {
          if (event.data.success) {
            window.location.reload()
          }
        }
      } catch (error) {
        console.error('Failed to clear cache:', error)
      }
    }
  }

  const offlineFeatures = [
    {
      title: 'Cached Pages',
      description: 'View previously loaded pages',
      icon: Database,
      available: true,
      items: ['Dashboard', 'User Management', 'Settings', 'Workflow Builder']
    },
    {
      title: 'Queued Actions',
      description: 'Actions saved for when you\'re back online',
      icon: RefreshCw,
      available: queuedActions > 0,
      items: queuedActions > 0 ? [`${queuedActions} pending actions`] : ['No pending actions']
    },
    {
      title: 'Local Data',
      description: 'Access to cached data and forms',
      icon: Settings,
      available: true,
      items: ['Form drafts', 'Recent searches', 'User preferences', 'Import templates']
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            {isOnline ? (
              <div className="p-4 bg-green-100 dark:bg-green-900/20 rounded-full">
                <Wifi className="h-12 w-12 text-green-600" />
              </div>
            ) : (
              <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-full">
                <WifiOff className="h-12 w-12 text-red-600" />
              </div>
            )}
          </div>
          
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {isOnline ? 'Connection Restored' : 'You\'re Offline'}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
              {isOnline 
                ? 'Your internet connection has been restored. Click retry to reload the page.'
                : 'No internet connection detected. You can still access cached content and features.'
              }
            </p>
          </div>

          <div className="flex items-center justify-center space-x-4">
            <Badge variant={isOnline ? "default" : "secondary"}>
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
            <span className="text-sm text-gray-500">
              Last update: {lastUpdate}
            </span>
          </div>
        </div>

        {/* Connection Status */}
        <Alert className={isOnline ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}>
          <AlertDescription>
            {isOnline ? (
              <div className="flex items-center space-x-2">
                <Wifi className="h-4 w-4 text-green-600" />
                <span>Connection restored. You can now access all features normally.</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <WifiOff className="h-4 w-4 text-yellow-600" />
                <span>
                  You're currently offline. FastNext will continue to work with cached data and queue actions for when you're back online.
                </span>
              </div>
            )}
          </AlertDescription>
        </Alert>

        {/* Offline Features */}
        <div className="grid gap-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Available Features
          </h2>
          
          {offlineFeatures.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Card key={index} className={feature.available ? '' : 'opacity-60'}>
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      feature.available 
                        ? 'bg-blue-100 dark:bg-blue-900/20' 
                        : 'bg-gray-100 dark:bg-gray-800'
                    }`}>
                      <Icon className={`h-5 w-5 ${
                        feature.available 
                          ? 'text-blue-600 dark:text-blue-400' 
                          : 'text-gray-400'
                      }`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                      <CardDescription>{feature.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {feature.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex items-center space-x-2 text-sm">
                        <div className={`h-1.5 w-1.5 rounded-full ${
                          feature.available ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                        <span className="text-gray-600 dark:text-gray-400">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Cache Status */}
        {cacheStatus && (
          <Card>
            <CardHeader>
              <CardTitle>Cache Status</CardTitle>
              <CardDescription>Information about cached data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Cached Resources:</span>
                  <div className="text-gray-600 dark:text-gray-400">
                    {Object.entries(cacheStatus.caches || {}).map(([name, count]) => (
                      <div key={name} className="flex justify-between">
                        <span>{name.replace('fastnext-', '').replace('-v1.2.0', '')}:</span>
                        <span>{count} items</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Queued Requests:</span>
                  <div className="text-gray-600 dark:text-gray-400">
                    {Object.entries(cacheStatus.queuedRequests || {}).map(([queue, requests]) => (
                      <div key={queue} className="flex justify-between">
                        <span>{queue.replace('-queue', '')}:</span>
                        <span>{(requests as any[]).length} pending</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex space-x-4">
          <Button onClick={handleRetry} className="flex-1">
            <RefreshCw className="h-4 w-4 mr-2" />
            {isOnline ? 'Reload Page' : 'Retry Connection'}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/'}
            className="flex-1"
          >
            <Home className="h-4 w-4 mr-2" />
            Go to Homepage
          </Button>
        </div>

        {/* Advanced Options */}
        <div className="text-center">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearCache}
            className="text-gray-500 hover:text-gray-700"
          >
            Clear Cache & Reload
          </Button>
        </div>
      </div>
    </div>
  )
}