"use client"

import * as React from "react"

interface OfflineData<T> {
  data: T
  timestamp: number
  action: 'create' | 'update' | 'delete'
  id: string
  synced: boolean
}

interface UseOfflineSyncOptions<T> {
  key: string
  syncFn?: (items: OfflineData<T>[]) => Promise<void>
  autoSync?: boolean
  syncInterval?: number
}

interface UseOfflineSyncReturn<T> {
  isOnline: boolean
  pendingCount: number
  lastSyncTime: Date | null
  addOfflineAction: (action: 'create' | 'update' | 'delete', data: T, id: string) => void
  syncNow: () => Promise<void>
  clearPending: () => void
  getPendingActions: () => OfflineData<T>[]
}

export function useOfflineSync<T>({
  key,
  syncFn,
  autoSync = true,
  syncInterval = 30000 // 30 seconds
}: UseOfflineSyncOptions<T>): UseOfflineSyncReturn<T> {
  const [isOnline, setIsOnline] = React.useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [pendingActions, setPendingActions] = React.useState<OfflineData<T>[]>([])
  const [lastSyncTime, setLastSyncTime] = React.useState<Date | null>(null)
  const [isSyncing, setIsSyncing] = React.useState(false)

  const storageKey = `offline_${key}`

  // Load pending actions from localStorage on mount
  React.useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        setPendingActions(parsed.actions || [])
        setLastSyncTime(parsed.lastSync ? new Date(parsed.lastSync) : null)
      }
    } catch (error) {
      console.error('Failed to load offline data:', error)
    }
  }, [storageKey])

  // Save pending actions to localStorage
  const saveToStorage = React.useCallback((actions: OfflineData<T>[], syncTime?: Date) => {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(storageKey, JSON.stringify({
        actions,
        lastSync: syncTime?.toISOString() || lastSyncTime?.toISOString()
      }))
    } catch (error) {
      console.error('Failed to save offline data:', error)
    }
  }, [storageKey, lastSyncTime])

  // Monitor online/offline status
  React.useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Add offline action
  const addOfflineAction = React.useCallback((
    action: 'create' | 'update' | 'delete',
    data: T,
    id: string
  ) => {
    const newAction: OfflineData<T> = {
      data,
      timestamp: Date.now(),
      action,
      id,
      synced: false
    }

    setPendingActions(prev => {
      // Remove existing action for the same item if it exists
      const filtered = prev.filter(item => item.id !== id)
      const updated = [...filtered, newAction]
      saveToStorage(updated)
      return updated
    })
  }, [saveToStorage])

  // Sync pending actions
  const syncNow = React.useCallback(async () => {
    if (!syncFn || isSyncing || pendingActions.length === 0) return

    setIsSyncing(true)

    try {
      const unsyncedActions = pendingActions.filter(action => !action.synced)
      
      if (unsyncedActions.length > 0) {
        await syncFn(unsyncedActions)
        
        // Mark as synced
        setPendingActions(prev => {
          const updated = prev.map(action => ({ ...action, synced: true }))
          const syncTime = new Date()
          setLastSyncTime(syncTime)
          saveToStorage(updated, syncTime)
          return updated
        })
      }
    } catch (error) {
      console.error('Sync failed:', error)
      throw error
    } finally {
      setIsSyncing(false)
    }
  }, [syncFn, isSyncing, pendingActions, saveToStorage])

  // Auto sync when online
  React.useEffect(() => {
    if (!autoSync || !isOnline || !syncFn) return

    // Immediate sync when coming online
    if (pendingActions.some(action => !action.synced)) {
      syncNow()
    }

    // Periodic sync
    const interval = setInterval(() => {
      if (pendingActions.some(action => !action.synced)) {
        syncNow()
      }
    }, syncInterval)

    return () => clearInterval(interval)
  }, [autoSync, isOnline, syncFn, pendingActions, syncNow, syncInterval])

  // Clear pending actions
  const clearPending = React.useCallback(() => {
    setPendingActions([])
    saveToStorage([])
  }, [saveToStorage])

  // Get pending actions
  const getPendingActions = React.useCallback(() => {
    return pendingActions.filter(action => !action.synced)
  }, [pendingActions])

  return {
    isOnline,
    pendingCount: pendingActions.filter(action => !action.synced).length,
    lastSyncTime,
    addOfflineAction,
    syncNow,
    clearPending,
    getPendingActions
  }
}

// Hook for managing offline-first data
interface UseOfflineDataOptions<T> {
  key: string
  fetchFn?: () => Promise<T[]>
  syncCreateFn?: (item: T) => Promise<T>
  syncUpdateFn?: (item: T) => Promise<T>
  syncDeleteFn?: (id: string) => Promise<void>
  autoSync?: boolean
}

export function useOfflineData<T extends { id: string }>({
  key,
  fetchFn,
  syncCreateFn,
  syncUpdateFn,
  syncDeleteFn,
  autoSync = true
}: UseOfflineDataOptions<T>) {
  const [data, setData] = React.useState<T[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const syncFn = React.useCallback(async (actions: OfflineData<T>[]) => {
    for (const action of actions) {
      try {
        switch (action.action) {
          case 'create':
            if (syncCreateFn) {
              await syncCreateFn(action.data)
            }
            break
          case 'update':
            if (syncUpdateFn) {
              await syncUpdateFn(action.data)
            }
            break
          case 'delete':
            if (syncDeleteFn) {
              await syncDeleteFn(action.id)
            }
            break
        }
      } catch (error) {
        console.error(`Failed to sync ${action.action} for ${action.id}:`, error)
        throw error
      }
    }
  }, [syncCreateFn, syncUpdateFn, syncDeleteFn])

  const {
    isOnline,
    pendingCount,
    lastSyncTime,
    addOfflineAction,
    syncNow,
    clearPending,
    getPendingActions
  } = useOfflineSync<T>({
    key,
    syncFn,
    autoSync
  })

  // Load initial data
  React.useEffect(() => {
    const loadData = async () => {
      if (!fetchFn) return

      setLoading(true)
      setError(null)

      try {
        const result = await fetchFn()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [fetchFn])

  // CRUD operations
  const create = React.useCallback((item: T) => {
    // Optimistic update
    setData(prev => [...prev, item])
    
    // Add to offline queue
    addOfflineAction('create', item, item.id)
  }, [addOfflineAction])

  const update = React.useCallback((item: T) => {
    // Optimistic update
    setData(prev => prev.map(existing => 
      existing.id === item.id ? item : existing
    ))
    
    // Add to offline queue
    addOfflineAction('update', item, item.id)
  }, [addOfflineAction])

  const remove = React.useCallback((id: string) => {
    // Optimistic update
    const item = data.find(item => item.id === id)
    if (!item) return

    setData(prev => prev.filter(item => item.id !== id))
    
    // Add to offline queue
    addOfflineAction('delete', item, id)
  }, [data, addOfflineAction])

  return {
    data,
    loading,
    error,
    isOnline,
    pendingCount,
    lastSyncTime,
    create,
    update,
    remove,
    syncNow,
    clearPending,
    getPendingActions
  }
}

export default useOfflineSync