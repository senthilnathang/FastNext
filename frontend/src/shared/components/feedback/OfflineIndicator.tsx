"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useOnlineStatus } from "@/shared/hooks/useOnlineStatus";
import { useOfflineQueue, type SyncProgress } from "@/shared/hooks/useOfflineSync";

// ============================================
// Types
// ============================================

export interface OfflineIndicatorProps {
  /** Custom class name */
  className?: string;
  /** Position of the indicator */
  position?: "top" | "bottom";
  /** Whether to show pending sync count */
  showPendingCount?: boolean;
  /** Whether to show manual sync button */
  showSyncButton?: boolean;
  /** Whether to auto-hide when online with no pending items */
  autoHide?: boolean;
  /** Custom pending count (from useOfflineSync) */
  pendingCount?: number;
  /** Custom sync progress (from useOfflineSync) */
  syncProgress?: SyncProgress;
  /** Custom sync function */
  onSync?: () => Promise<void>;
  /** Callback when status changes */
  onStatusChange?: (isOnline: boolean) => void;
}

// ============================================
// Sub-components
// ============================================

const StatusIcon: React.FC<{ isOnline: boolean; isSyncing: boolean }> = ({
  isOnline,
  isSyncing,
}) => {
  if (isSyncing) {
    return (
      <svg
        className="w-4 h-4 animate-spin"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    );
  }

  if (isOnline) {
    return (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
        />
      </svg>
    );
  }

  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
      />
    </svg>
  );
};

const SyncButton: React.FC<{
  onClick: () => void;
  disabled: boolean;
  isSyncing: boolean;
}> = ({ onClick, disabled, isSyncing }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "ml-3 px-3 py-1 text-xs font-medium rounded-md transition-colors",
      "focus:outline-none focus:ring-2 focus:ring-offset-2",
      disabled
        ? "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400"
        : "bg-white text-gray-700 hover:bg-gray-100 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600",
    )}
    aria-label={isSyncing ? "Syncing..." : "Sync now"}
  >
    {isSyncing ? "Syncing..." : "Sync Now"}
  </button>
);

const ProgressBar: React.FC<{ progress: SyncProgress }> = ({ progress }) => {
  const percentage =
    progress.total > 0
      ? Math.round((progress.completed / progress.total) * 100)
      : 0;

  return (
    <div className="w-full mt-2">
      <div className="flex justify-between text-xs mb-1">
        <span>
          Syncing {progress.completed} of {progress.total}
        </span>
        <span>{percentage}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
        <div
          className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {progress.failed > 0 && (
        <div className="text-xs text-red-500 mt-1">
          {progress.failed} item(s) failed to sync
        </div>
      )}
    </div>
  );
};

// ============================================
// Main Component
// ============================================

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  className,
  position = "bottom",
  showPendingCount = true,
  showSyncButton = true,
  autoHide = true,
  pendingCount: externalPendingCount,
  syncProgress: externalSyncProgress,
  onSync,
  onStatusChange,
}) => {
  const isOnline = useOnlineStatus();
  const {
    queuedRequests,
    isProcessing,
    forceSync,
  } = useOfflineQueue();

  const [isVisible, setIsVisible] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);

  // Use external values if provided, otherwise use queue values
  const pendingCount = externalPendingCount ?? queuedRequests;
  const syncProgress = externalSyncProgress;
  const syncInProgress = syncProgress?.inProgress || isProcessing || isSyncing;

  // Handle visibility
  React.useEffect(() => {
    if (autoHide) {
      // Show when offline or when there are pending items
      setIsVisible(!isOnline || pendingCount > 0);
    } else {
      setIsVisible(true);
    }
  }, [isOnline, pendingCount, autoHide]);

  // Notify status change
  React.useEffect(() => {
    onStatusChange?.(isOnline);
  }, [isOnline, onStatusChange]);

  // Handle sync
  const handleSync = React.useCallback(async () => {
    if (syncInProgress || !isOnline) return;

    setIsSyncing(true);

    try {
      if (onSync) {
        await onSync();
      } else {
        await forceSync();
      }
    } catch (error) {
      console.error("[OfflineIndicator] Sync failed:", error);
    } finally {
      setIsSyncing(false);
    }
  }, [syncInProgress, isOnline, onSync, forceSync]);

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  const statusText = isOnline
    ? pendingCount > 0
      ? `Online - ${pendingCount} pending change${pendingCount !== 1 ? "s" : ""}`
      : "Online"
    : `Offline${pendingCount > 0 ? ` - ${pendingCount} pending change${pendingCount !== 1 ? "s" : ""}` : ""}`;

  return (
    <div
      className={cn(
        "fixed left-0 right-0 z-50 transition-transform duration-300",
        position === "top" ? "top-0" : "bottom-0",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div
        className={cn(
          "mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8",
          isOnline
            ? pendingCount > 0
              ? "bg-yellow-50 dark:bg-yellow-900/20"
              : "bg-green-50 dark:bg-green-900/20"
            : "bg-red-50 dark:bg-red-900/20",
        )}
      >
        <div className="flex flex-wrap items-center justify-between">
          <div className="flex items-center flex-1 min-w-0">
            <span
              className={cn(
                "flex p-2 rounded-lg",
                isOnline
                  ? pendingCount > 0
                    ? "bg-yellow-100 dark:bg-yellow-800"
                    : "bg-green-100 dark:bg-green-800"
                  : "bg-red-100 dark:bg-red-800",
              )}
            >
              <StatusIcon isOnline={isOnline} isSyncing={syncInProgress} />
            </span>

            <p
              className={cn(
                "ml-3 font-medium truncate",
                isOnline
                  ? pendingCount > 0
                    ? "text-yellow-700 dark:text-yellow-200"
                    : "text-green-700 dark:text-green-200"
                  : "text-red-700 dark:text-red-200",
              )}
            >
              <span className="md:hidden">
                {isOnline ? (pendingCount > 0 ? "Syncing..." : "Online") : "Offline"}
              </span>
              <span className="hidden md:inline">{statusText}</span>
            </p>
          </div>

          {showSyncButton && isOnline && pendingCount > 0 && (
            <div className="flex-shrink-0 order-3 mt-2 w-full sm:order-2 sm:mt-0 sm:w-auto">
              <SyncButton
                onClick={handleSync}
                disabled={syncInProgress}
                isSyncing={syncInProgress}
              />
            </div>
          )}
        </div>

        {syncProgress && syncProgress.inProgress && showPendingCount && (
          <ProgressBar progress={syncProgress} />
        )}
      </div>
    </div>
  );
};

// ============================================
// Compact Indicator (for use in headers/navbars)
// ============================================

export interface CompactOfflineIndicatorProps {
  className?: string;
  pendingCount?: number;
  onClick?: () => void;
}

export const CompactOfflineIndicator: React.FC<CompactOfflineIndicatorProps> = ({
  className,
  pendingCount: externalPendingCount,
  onClick,
}) => {
  const isOnline = useOnlineStatus();
  const { queuedRequests } = useOfflineQueue();

  const pendingCount = externalPendingCount ?? queuedRequests;

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative inline-flex items-center justify-center p-2 rounded-full transition-colors",
        isOnline
          ? "text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
          : "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20",
        className,
      )}
      aria-label={isOnline ? "Online" : "Offline"}
    >
      <StatusIcon isOnline={isOnline} isSyncing={false} />

      {pendingCount > 0 && (
        <span
          className={cn(
            "absolute -top-1 -right-1 flex items-center justify-center",
            "min-w-[18px] h-[18px] px-1 text-xs font-bold rounded-full",
            "bg-yellow-500 text-white",
          )}
        >
          {pendingCount > 99 ? "99+" : pendingCount}
        </span>
      )}
    </button>
  );
};

// ============================================
// Toast-style Offline Notification
// ============================================

export interface OfflineToastProps {
  className?: string;
  duration?: number;
  onDismiss?: () => void;
}

export const OfflineToast: React.FC<OfflineToastProps> = ({
  className,
  duration = 5000,
  onDismiss,
}) => {
  const isOnline = useOnlineStatus();
  const [show, setShow] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Show toast on status change
    if (isOnline) {
      setMessage("You are back online");
    } else {
      setMessage("You are offline. Changes will sync when connection is restored.");
    }

    setShow(true);

    // Auto-hide after duration
    if (duration > 0) {
      timeoutRef.current = setTimeout(() => {
        setShow(false);
        onDismiss?.();
      }, duration);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isOnline, duration, onDismiss]);

  if (!show) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 max-w-sm",
        "rounded-lg shadow-lg p-4 animate-in slide-in-from-bottom-5",
        isOnline
          ? "bg-green-50 border border-green-200 dark:bg-green-900/40 dark:border-green-800"
          : "bg-red-50 border border-red-200 dark:bg-red-900/40 dark:border-red-800",
        className,
      )}
      role="alert"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <StatusIcon isOnline={isOnline} isSyncing={false} />
        </div>
        <div className="ml-3 flex-1">
          <p
            className={cn(
              "text-sm font-medium",
              isOnline
                ? "text-green-800 dark:text-green-200"
                : "text-red-800 dark:text-red-200",
            )}
          >
            {isOnline ? "Connection Restored" : "Connection Lost"}
          </p>
          <p
            className={cn(
              "mt-1 text-sm",
              isOnline
                ? "text-green-700 dark:text-green-300"
                : "text-red-700 dark:text-red-300",
            )}
          >
            {message}
          </p>
        </div>
        <button
          onClick={() => {
            setShow(false);
            onDismiss?.();
          }}
          className={cn(
            "flex-shrink-0 ml-4 inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2",
            isOnline
              ? "text-green-500 hover:bg-green-100 focus:ring-green-600 dark:hover:bg-green-800"
              : "text-red-500 hover:bg-red-100 focus:ring-red-600 dark:hover:bg-red-800",
          )}
          aria-label="Dismiss"
        >
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default OfflineIndicator;
