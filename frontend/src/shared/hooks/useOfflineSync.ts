"use client";

import * as React from "react";

// ============================================
// Types and Interfaces
// ============================================

export interface OfflineAction<T = unknown> {
  id: string;
  data: T;
  timestamp: number;
  action: "create" | "update" | "delete";
  synced: boolean;
  retryCount: number;
  error?: string;
  version?: number;
}

export interface SyncProgress {
  total: number;
  completed: number;
  failed: number;
  inProgress: boolean;
  currentItem?: string;
}

export interface ConflictResolution<T> {
  localData: T;
  serverData: T;
  resolvedData: T;
  resolution: "local" | "server" | "merged" | "manual";
  timestamp: number;
}

export interface UseOfflineSyncOptions<T> {
  key: string;
  syncFn?: (items: OfflineAction<T>[]) => Promise<SyncResult<T>[]>;
  autoSync?: boolean;
  syncInterval?: number;
  maxRetries?: number;
  conflictResolver?: (local: T, server: T) => T | Promise<T>;
  onSyncStart?: () => void;
  onSyncComplete?: (results: SyncResult<T>[]) => void;
  onSyncError?: (error: Error) => void;
  onConflict?: (conflict: ConflictResolution<T>) => void;
}

export interface SyncResult<T> {
  id: string;
  success: boolean;
  data?: T;
  error?: string;
  conflict?: boolean;
}

export interface UseOfflineSyncReturn<T> {
  isOnline: boolean;
  pendingCount: number;
  lastSyncTime: Date | null;
  syncProgress: SyncProgress;
  isSyncing: boolean;
  addOfflineAction: (
    action: "create" | "update" | "delete",
    data: T,
    id: string,
    version?: number,
  ) => void;
  syncNow: () => Promise<SyncResult<T>[]>;
  clearPending: () => void;
  clearFailed: () => void;
  getPendingActions: () => OfflineAction<T>[];
  getFailedActions: () => OfflineAction<T>[];
  retryFailed: () => Promise<SyncResult<T>[]>;
  removeAction: (id: string) => void;
  updateAction: (id: string, data: Partial<OfflineAction<T>>) => void;
}

// ============================================
// Storage Keys
// ============================================

const STORAGE_PREFIX = "fastnext_offline_";

// ============================================
// useOfflineSync Hook
// ============================================

export function useOfflineSync<T>({
  key,
  syncFn,
  autoSync = true,
  syncInterval = 30000,
  maxRetries = 3,
  conflictResolver,
  onSyncStart,
  onSyncComplete,
  onSyncError,
  onConflict,
}: UseOfflineSyncOptions<T>): UseOfflineSyncReturn<T> {
  const [isOnline, setIsOnline] = React.useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [pendingActions, setPendingActions] = React.useState<OfflineAction<T>[]>([]);
  const [lastSyncTime, setLastSyncTime] = React.useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [syncProgress, setSyncProgress] = React.useState<SyncProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    inProgress: false,
  });

  const storageKey = `${STORAGE_PREFIX}${key}`;
  const syncLockRef = React.useRef(false);

  // Load pending actions from localStorage on mount
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPendingActions(parsed.actions || []);
        setLastSyncTime(parsed.lastSync ? new Date(parsed.lastSync) : null);
      }
    } catch (error) {
      console.error("[useOfflineSync] Failed to load offline data:", error);
    }
  }, [storageKey]);

  // Save pending actions to localStorage
  const saveToStorage = React.useCallback(
    (actions: OfflineAction<T>[], syncTime?: Date) => {
      if (typeof window === "undefined") return;

      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            actions,
            lastSync: syncTime?.toISOString() || lastSyncTime?.toISOString(),
          }),
        );
      } catch (error) {
        console.error("[useOfflineSync] Failed to save offline data:", error);
      }
    },
    [storageKey, lastSyncTime],
  );

  // Monitor online/offline status
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      setIsOnline(true);
      // Trigger sync when coming back online
      if (autoSync && pendingActions.some((action) => !action.synced)) {
        syncNow();
      }
    };

    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [autoSync, pendingActions]);

  // Listen for service worker sync messages
  React.useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      const { type, data } = event.data || {};

      switch (type) {
        case "SYNC_COMPLETE":
          setIsSyncing(false);
          setSyncProgress((prev) => ({ ...prev, inProgress: false }));
          break;
        case "SYNC_STARTED":
          setIsSyncing(true);
          setSyncProgress((prev) => ({ ...prev, inProgress: true }));
          break;
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, []);

  // Add offline action
  const addOfflineAction = React.useCallback(
    (action: "create" | "update" | "delete", data: T, id: string, version?: number) => {
      const newAction: OfflineAction<T> = {
        id,
        data,
        timestamp: Date.now(),
        action,
        synced: false,
        retryCount: 0,
        version,
      };

      setPendingActions((prev) => {
        // Handle action merging/optimization
        const existingIndex = prev.findIndex((item) => item.id === id);

        if (existingIndex >= 0) {
          const existing = prev[existingIndex];

          // If deleting an item that was just created locally, remove both
          if (action === "delete" && existing.action === "create" && !existing.synced) {
            return prev.filter((_, i) => i !== existingIndex);
          }

          // If updating a created item, keep it as create with new data
          if (action === "update" && existing.action === "create") {
            const updated = [...prev];
            updated[existingIndex] = { ...existing, data, timestamp: Date.now() };
            saveToStorage(updated);
            return updated;
          }

          // Replace existing action with new one
          const filtered = prev.filter((_, i) => i !== existingIndex);
          const updated = [...filtered, newAction];
          saveToStorage(updated);
          return updated;
        }

        const updated = [...prev, newAction];
        saveToStorage(updated);
        return updated;
      });
    },
    [saveToStorage],
  );

  // Sync pending actions with conflict resolution
  const syncNow = React.useCallback(async (): Promise<SyncResult<T>[]> => {
    if (!syncFn || syncLockRef.current) {
      return [];
    }

    const unsyncedActions = pendingActions.filter(
      (action) => !action.synced && action.retryCount < maxRetries,
    );

    if (unsyncedActions.length === 0) {
      return [];
    }

    syncLockRef.current = true;
    setIsSyncing(true);
    onSyncStart?.();

    setSyncProgress({
      total: unsyncedActions.length,
      completed: 0,
      failed: 0,
      inProgress: true,
    });

    try {
      const results = await syncFn(unsyncedActions);
      const syncTime = new Date();

      setPendingActions((prev) => {
        const updated = prev.map((action) => {
          const result = results.find((r) => r.id === action.id);

          if (!result) return action;

          if (result.success) {
            return { ...action, synced: true };
          } else if (result.conflict && conflictResolver && result.data) {
            // Handle conflict
            const resolved = conflictResolver(action.data, result.data as T);

            if (resolved instanceof Promise) {
              resolved.then((resolvedData) => {
                onConflict?.({
                  localData: action.data,
                  serverData: result.data as T,
                  resolvedData,
                  resolution: "merged",
                  timestamp: Date.now(),
                });
              });
            } else {
              onConflict?.({
                localData: action.data,
                serverData: result.data as T,
                resolvedData: resolved,
                resolution: "merged",
                timestamp: Date.now(),
              });
            }

            return { ...action, retryCount: action.retryCount + 1, error: "Conflict resolved" };
          } else {
            return {
              ...action,
              retryCount: action.retryCount + 1,
              error: result.error || "Sync failed",
            };
          }
        });

        setLastSyncTime(syncTime);
        saveToStorage(updated, syncTime);
        return updated;
      });

      const successCount = results.filter((r) => r.success).length;
      const failedCount = results.filter((r) => !r.success).length;

      setSyncProgress({
        total: unsyncedActions.length,
        completed: successCount,
        failed: failedCount,
        inProgress: false,
      });

      onSyncComplete?.(results);
      return results;
    } catch (error) {
      console.error("[useOfflineSync] Sync failed:", error);

      setPendingActions((prev) => {
        const updated = prev.map((action) => {
          if (unsyncedActions.some((a) => a.id === action.id)) {
            return {
              ...action,
              retryCount: action.retryCount + 1,
              error: error instanceof Error ? error.message : "Unknown error",
            };
          }
          return action;
        });

        saveToStorage(updated);
        return updated;
      });

      setSyncProgress((prev) => ({
        ...prev,
        failed: unsyncedActions.length,
        inProgress: false,
      }));

      onSyncError?.(error instanceof Error ? error : new Error("Sync failed"));
      return [];
    } finally {
      setIsSyncing(false);
      syncLockRef.current = false;
    }
  }, [
    syncFn,
    pendingActions,
    maxRetries,
    conflictResolver,
    onSyncStart,
    onSyncComplete,
    onSyncError,
    onConflict,
    saveToStorage,
  ]);

  // Auto sync when online
  React.useEffect(() => {
    if (!autoSync || !isOnline || !syncFn) return;

    // Periodic sync
    const interval = setInterval(() => {
      if (pendingActions.some((action) => !action.synced && action.retryCount < maxRetries)) {
        syncNow();
      }
    }, syncInterval);

    return () => clearInterval(interval);
  }, [autoSync, isOnline, syncFn, pendingActions, syncNow, syncInterval, maxRetries]);

  // Clear all pending actions
  const clearPending = React.useCallback(() => {
    setPendingActions([]);
    saveToStorage([]);
  }, [saveToStorage]);

  // Clear only failed actions
  const clearFailed = React.useCallback(() => {
    setPendingActions((prev) => {
      const updated = prev.filter((action) => action.retryCount < maxRetries);
      saveToStorage(updated);
      return updated;
    });
  }, [maxRetries, saveToStorage]);

  // Get pending actions
  const getPendingActions = React.useCallback(() => {
    return pendingActions.filter((action) => !action.synced && action.retryCount < maxRetries);
  }, [pendingActions, maxRetries]);

  // Get failed actions
  const getFailedActions = React.useCallback(() => {
    return pendingActions.filter((action) => !action.synced && action.retryCount >= maxRetries);
  }, [pendingActions, maxRetries]);

  // Retry failed actions
  const retryFailed = React.useCallback(async (): Promise<SyncResult<T>[]> => {
    setPendingActions((prev) => {
      const updated = prev.map((action) => {
        if (action.retryCount >= maxRetries) {
          return { ...action, retryCount: 0, error: undefined };
        }
        return action;
      });
      saveToStorage(updated);
      return updated;
    });

    // Wait for state update
    await new Promise((resolve) => setTimeout(resolve, 0));

    return syncNow();
  }, [maxRetries, saveToStorage, syncNow]);

  // Remove a specific action
  const removeAction = React.useCallback(
    (id: string) => {
      setPendingActions((prev) => {
        const updated = prev.filter((action) => action.id !== id);
        saveToStorage(updated);
        return updated;
      });
    },
    [saveToStorage],
  );

  // Update a specific action
  const updateAction = React.useCallback(
    (id: string, data: Partial<OfflineAction<T>>) => {
      setPendingActions((prev) => {
        const updated = prev.map((action) => {
          if (action.id === id) {
            return { ...action, ...data };
          }
          return action;
        });
        saveToStorage(updated);
        return updated;
      });
    },
    [saveToStorage],
  );

  return {
    isOnline,
    pendingCount: pendingActions.filter((action) => !action.synced).length,
    lastSyncTime,
    syncProgress,
    isSyncing,
    addOfflineAction,
    syncNow,
    clearPending,
    clearFailed,
    getPendingActions,
    getFailedActions,
    retryFailed,
    removeAction,
    updateAction,
  };
}

// ============================================
// useOfflineData Hook - Enhanced CRUD with offline support
// ============================================

export interface UseOfflineDataOptions<T> {
  key: string;
  fetchFn?: () => Promise<T[]>;
  syncCreateFn?: (item: T) => Promise<T>;
  syncUpdateFn?: (item: T) => Promise<T>;
  syncDeleteFn?: (id: string) => Promise<void>;
  autoSync?: boolean;
  conflictResolver?: (local: T, server: T) => T;
  onOptimisticUpdate?: (data: T[]) => void;
}

export function useOfflineData<T extends { id: string; version?: number }>({
  key,
  fetchFn,
  syncCreateFn,
  syncUpdateFn,
  syncDeleteFn,
  autoSync = true,
  conflictResolver,
  onOptimisticUpdate,
}: UseOfflineDataOptions<T>) {
  const [data, setData] = React.useState<T[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const syncFn = React.useCallback(
    async (actions: OfflineAction<T>[]): Promise<SyncResult<T>[]> => {
      const results: SyncResult<T>[] = [];

      for (const action of actions) {
        try {
          switch (action.action) {
            case "create":
              if (syncCreateFn) {
                const created = await syncCreateFn(action.data);
                results.push({ id: action.id, success: true, data: created });
              }
              break;
            case "update":
              if (syncUpdateFn) {
                const updated = await syncUpdateFn(action.data);
                results.push({ id: action.id, success: true, data: updated });
              }
              break;
            case "delete":
              if (syncDeleteFn) {
                await syncDeleteFn(action.id);
                results.push({ id: action.id, success: true });
              }
              break;
          }
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : "Unknown error";
          const isConflict = errorMessage.includes("conflict") || errorMessage.includes("409");

          results.push({
            id: action.id,
            success: false,
            error: errorMessage,
            conflict: isConflict,
          });
        }
      }

      return results;
    },
    [syncCreateFn, syncUpdateFn, syncDeleteFn],
  );

  const {
    isOnline,
    pendingCount,
    lastSyncTime,
    syncProgress,
    isSyncing,
    addOfflineAction,
    syncNow,
    clearPending,
    clearFailed,
    getPendingActions,
    getFailedActions,
    retryFailed,
    removeAction,
    updateAction,
  } = useOfflineSync<T>({
    key,
    syncFn,
    autoSync,
    conflictResolver,
    onSyncComplete: (results) => {
      // Refresh data after successful sync
      if (results.some((r) => r.success) && fetchFn) {
        fetchFn()
          .then(setData)
          .catch(console.error);
      }
    },
  });

  // Load initial data
  React.useEffect(() => {
    const loadData = async () => {
      if (!fetchFn) return;

      setLoading(true);
      setError(null);

      try {
        const result = await fetchFn();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [fetchFn]);

  // CRUD operations with optimistic updates
  const create = React.useCallback(
    (item: T) => {
      // Optimistic update
      setData((prev) => {
        const updated = [...prev, item];
        onOptimisticUpdate?.(updated);
        return updated;
      });

      // Add to offline queue
      addOfflineAction("create", item, item.id, item.version);
    },
    [addOfflineAction, onOptimisticUpdate],
  );

  const update = React.useCallback(
    (item: T) => {
      // Optimistic update
      setData((prev) => {
        const updated = prev.map((existing) =>
          existing.id === item.id ? item : existing,
        );
        onOptimisticUpdate?.(updated);
        return updated;
      });

      // Add to offline queue with version for conflict detection
      addOfflineAction("update", item, item.id, item.version);
    },
    [addOfflineAction, onOptimisticUpdate],
  );

  const remove = React.useCallback(
    (id: string) => {
      // Optimistic update
      const item = data.find((item) => item.id === id);
      if (!item) return;

      setData((prev) => {
        const updated = prev.filter((item) => item.id !== id);
        onOptimisticUpdate?.(updated);
        return updated;
      });

      // Add to offline queue
      addOfflineAction("delete", item, id, item.version);
    },
    [data, addOfflineAction, onOptimisticUpdate],
  );

  // Revert optimistic update
  const revert = React.useCallback(
    (id: string) => {
      removeAction(id);
      // Refetch data to get correct state
      if (fetchFn) {
        fetchFn()
          .then(setData)
          .catch(console.error);
      }
    },
    [removeAction, fetchFn],
  );

  return {
    data,
    loading,
    error,
    isOnline,
    pendingCount,
    lastSyncTime,
    syncProgress,
    isSyncing,
    create,
    update,
    remove,
    revert,
    syncNow,
    clearPending,
    clearFailed,
    getPendingActions,
    getFailedActions,
    retryFailed,
    updateAction,
  };
}

// ============================================
// useOfflineQueue Hook - For service worker queue
// ============================================

export interface OfflineQueueItem {
  id: number;
  url: string;
  method: string;
  timestamp: number;
  retryCount: number;
}

export interface UseOfflineQueueReturn {
  queuedRequests: number;
  queueItems: OfflineQueueItem[];
  lastSync: Date | null;
  isProcessing: boolean;
  forceSync: () => Promise<void>;
  clearQueue: () => Promise<void>;
}

export function useOfflineQueue(): UseOfflineQueueReturn {
  const [queuedRequests, setQueuedRequests] = React.useState(0);
  const [queueItems, setQueueItems] = React.useState<OfflineQueueItem[]>([]);
  const [lastSync, setLastSync] = React.useState<Date | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      const { type, data } = event.data || {};

      switch (type) {
        case "REQUEST_QUEUED":
          setQueuedRequests(data?.count || 0);
          break;
        case "SYNC_COMPLETE":
          setQueuedRequests(0);
          setQueueItems([]);
          setLastSync(new Date());
          setIsProcessing(false);
          break;
        case "SYNC_STARTED":
          setIsProcessing(true);
          break;
        case "QUEUE_STATUS":
          setQueuedRequests(data?.count || 0);
          setQueueItems(data?.items || []);
          break;
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);

    // Get initial queue status
    if (navigator.serviceWorker.controller) {
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        setQueuedRequests(event.data?.count || 0);
        setQueueItems(event.data?.items || []);
      };
      navigator.serviceWorker.controller.postMessage(
        { type: "GET_QUEUE_STATUS" },
        [channel.port2],
      );
    }

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, []);

  const forceSync = React.useCallback(async () => {
    if (!("serviceWorker" in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;

      if ("sync" in registration) {
        await (registration as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync.register("offline-sync");
        setIsProcessing(true);
      } else {
        // Fallback: send message to service worker
        const channel = new MessageChannel();
        channel.port1.onmessage = () => {
          setIsProcessing(false);
        };
        navigator.serviceWorker.controller?.postMessage(
          { type: "FORCE_SYNC" },
          [channel.port2],
        );
        setIsProcessing(true);
      }
    } catch (error) {
      console.error("[useOfflineQueue] Background sync registration failed:", error);
    }
  }, []);

  const clearQueue = React.useCallback(async () => {
    if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller) return;

    return new Promise<void>((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => {
        setQueuedRequests(0);
        setQueueItems([]);
        resolve();
      };
      navigator.serviceWorker.controller.postMessage(
        { type: "CLEAR_QUEUE" },
        [channel.port2],
      );
    });
  }, []);

  return {
    queuedRequests,
    queueItems,
    lastSync,
    isProcessing,
    forceSync,
    clearQueue,
  };
}

export default useOfflineSync;
