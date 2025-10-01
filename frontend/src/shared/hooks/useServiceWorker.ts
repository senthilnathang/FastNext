"use client"

import { useEffect, useState, useCallback } from 'react'

interface ServiceWorkerState {
  isSupported: boolean
  isRegistered: boolean
  isInstalling: boolean
  isWaiting: boolean
  isUpdateAvailable: boolean
  isOnline: boolean
  queuedRequests: number
  registration: ServiceWorkerRegistration | null
}

interface ServiceWorkerActions {
  register: () => Promise<boolean>
  unregister: () => Promise<boolean>
  update: () => Promise<boolean>
  skipWaiting: () => void
  getCacheStatus: () => Promise<any>
  clearCache: () => Promise<boolean>
}

export function useServiceWorker(): ServiceWorkerState & ServiceWorkerActions {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isInstalling: false,
    isWaiting: false,
    isUpdateAvailable: false,
    isOnline: true,
    queuedRequests: 0,
    registration: null
  })

  // Check if service workers are supported
  useEffect(() => {
    setState(prev => ({
      ...prev,
      isSupported: 'serviceWorker' in navigator,
      isOnline: navigator.onLine
    }))
  }, [])

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }))
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }))

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Listen for service worker messages
  useEffect(() => {
    if (!state.isSupported) return

    const handleMessage = (event: MessageEvent) => {
      const { type, data } = event.data

      switch (type) {
        case 'REQUEST_QUEUED':
          setState(prev => ({ ...prev, queuedRequests: data.count }))
          break
        case 'SYNC_COMPLETE':
          setState(prev => ({ ...prev, queuedRequests: 0 }))
          break
        case 'UPDATE_AVAILABLE':
          setState(prev => ({ ...prev, isUpdateAvailable: true }))
          break
      }
    }

    navigator.serviceWorker.addEventListener('message', handleMessage)

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage)
    }
  }, [state.isSupported])

  // Register service worker
  const register = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) {
      console.log('Service workers not supported')
      return false
    }

    try {
      setState(prev => ({ ...prev, isInstalling: true }))

      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      })

      console.log('Service worker registered:', registration)

      // Handle installation states
      const handleStateChange = () => {
        if (registration.installing) {
          setState(prev => ({ ...prev, isInstalling: true, isWaiting: false }))
        } else if (registration.waiting) {
          setState(prev => ({ 
            ...prev, 
            isInstalling: false, 
            isWaiting: true,
            isUpdateAvailable: true 
          }))
        } else if (registration.active) {
          setState(prev => ({ 
            ...prev, 
            isInstalling: false, 
            isWaiting: false,
            isRegistered: true,
            registration 
          }))
        }
      }

      // Listen for state changes
      if (registration.installing) {
        registration.installing.addEventListener('statechange', handleStateChange)
      }
      if (registration.waiting) {
        registration.waiting.addEventListener('statechange', handleStateChange)
      }
      if (registration.active) {
        setState(prev => ({ 
          ...prev, 
          isRegistered: true, 
          isInstalling: false,
          registration 
        }))
      }

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        console.log('Service worker update found')
        handleStateChange()
      })

      return true
    } catch (error) {
      console.error('Service worker registration failed:', error)
      setState(prev => ({ ...prev, isInstalling: false }))
      return false
    }
  }, [state.isSupported])

  // Unregister service worker
  const unregister = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported || !state.registration) {
      return false
    }

    try {
      const result = await state.registration.unregister()
      if (result) {
        setState(prev => ({ 
          ...prev, 
          isRegistered: false, 
          registration: null 
        }))
      }
      return result
    } catch (error) {
      console.error('Service worker unregistration failed:', error)
      return false
    }
  }, [state.isSupported, state.registration])

  // Update service worker
  const update = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported || !state.registration) {
      return false
    }

    try {
      const registration = await state.registration.update()
      console.log('Service worker update triggered:', registration)
      return true
    } catch (error) {
      console.error('Service worker update failed:', error)
      return false
    }
  }, [state.isSupported, state.registration])

  // Skip waiting and activate new service worker
  const skipWaiting = useCallback(() => {
    if (state.registration?.waiting) {
      state.registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      setState(prev => ({ ...prev, isWaiting: false, isUpdateAvailable: false }))
      
      // Reload page after activation
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload()
      })
    }
  }, [state.registration])

  // Get cache status
  const getCacheStatus = useCallback(async (): Promise<any> => {
    if (!state.isSupported || !navigator.serviceWorker.controller) {
      return null
    }

    return new Promise((resolve) => {
      const channel = new MessageChannel()
      
      channel.port1.onmessage = (event) => {
        resolve(event.data)
      }
      
      navigator.serviceWorker.controller?.postMessage(
        { type: 'GET_CACHE_STATUS' },
        [channel.port2]
      )
      
      // Timeout after 5 seconds
      setTimeout(() => resolve(null), 5000)
    })
  }, [state.isSupported])

  // Clear cache
  const clearCache = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported || !navigator.serviceWorker.controller) {
      return false
    }

    return new Promise((resolve) => {
      const channel = new MessageChannel()
      
      channel.port1.onmessage = (event) => {
        resolve(event.data.success || false)
      }
      
      navigator.serviceWorker.controller?.postMessage(
        { type: 'CLEAR_CACHE' },
        [channel.port2]
      )
      
      // Timeout after 10 seconds
      setTimeout(() => resolve(false), 10000)
    })
  }, [state.isSupported])

  // Auto-register service worker on mount
  useEffect(() => {
    if (state.isSupported && !state.isRegistered && !state.isInstalling) {
      register()
    }
  }, [state.isSupported, state.isRegistered, state.isInstalling, register])

  return {
    ...state,
    register,
    unregister,
    update,
    skipWaiting,
    getCacheStatus,
    clearCache
  }
}

// Hook for managing offline queue
export function useOfflineQueue() {
  const [queuedRequests, setQueuedRequests] = useState<number>(0)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const handleMessage = (event: MessageEvent) => {
      const { type, data } = event.data

      switch (type) {
        case 'REQUEST_QUEUED':
          setQueuedRequests(data.count)
          break
        case 'SYNC_COMPLETE':
          setQueuedRequests(0)
          setLastSync(new Date())
          setIsProcessing(false)
          break
        case 'SYNC_STARTED':
          setIsProcessing(true)
          break
      }
    }

    navigator.serviceWorker.addEventListener('message', handleMessage)

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage)
    }
  }, [])

  const forceSync = useCallback(async () => {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready
        await (registration as any).sync.register('user-actions-queue')
        setIsProcessing(true)
      } catch (error) {
        console.error('Background sync registration failed:', error)
      }
    }
  }, [])

  return {
    queuedRequests,
    lastSync,
    isProcessing,
    forceSync
  }
}

// Hook for push notifications
export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)

  useEffect(() => {
    setIsSupported(
      'serviceWorker' in navigator && 
      'PushManager' in window && 
      'Notification' in window
    )
  }, [])

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false

    try {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    } catch (error) {
      console.error('Notification permission request failed:', error)
      return false
    }
  }, [isSupported])

  const subscribe = useCallback(async (vapidKey: string): Promise<PushSubscription | null> => {
    if (!isSupported) return null

    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey
      })

      setSubscription(sub)
      setIsSubscribed(true)
      return sub
    } catch (error) {
      console.error('Push subscription failed:', error)
      return null
    }
  }, [isSupported])

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!subscription) return false

    try {
      const result = await subscription.unsubscribe()
      if (result) {
        setSubscription(null)
        setIsSubscribed(false)
      }
      return result
    } catch (error) {
      console.error('Push unsubscription failed:', error)
      return false
    }
  }, [subscription])

  return {
    isSupported,
    isSubscribed,
    subscription,
    requestPermission,
    subscribe,
    unsubscribe
  }
}