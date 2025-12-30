'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  pushNotificationService,
  PushNotificationState,
  NotificationPayload,
  PushSubscriptionData,
  NotificationPermission,
} from '@/shared/services/pushNotifications';

// ============================================================================
// Types
// ============================================================================

export interface UsePushNotificationsOptions {
  /** VAPID public key for push subscription */
  vapidKey?: string;
  /** Auto-subscribe when permission is granted */
  autoSubscribe?: boolean;
  /** Callback when permission changes */
  onPermissionChange?: (permission: NotificationPermission) => void;
  /** Callback when subscription changes */
  onSubscriptionChange?: (subscribed: boolean) => void;
  /** Callback on error */
  onError?: (error: string) => void;
}

export interface UsePushNotificationsReturn {
  /** Whether push notifications are supported */
  isSupported: boolean;
  /** Current permission state */
  permission: NotificationPermission;
  /** Whether user has granted permission */
  hasPermission: boolean;
  /** Whether permission can be requested */
  canRequestPermission: boolean;
  /** Whether currently subscribed */
  isSubscribed: boolean;
  /** Current subscription */
  subscription: PushSubscription | null;
  /** Subscription data for backend */
  subscriptionData: PushSubscriptionData | null;
  /** Whether an operation is in progress */
  isLoading: boolean;
  /** Last error message */
  error: string | null;
  /** Request notification permission */
  requestPermission: () => Promise<NotificationPermission>;
  /** Subscribe to push notifications */
  subscribe: (vapidKey?: string) => Promise<PushSubscription | null>;
  /** Unsubscribe from push notifications */
  unsubscribe: () => Promise<boolean>;
  /** Show a local notification */
  showNotification: (payload: NotificationPayload) => Promise<boolean>;
  /** Close notifications with optional tag */
  closeNotifications: (tag?: string) => Promise<void>;
  /** Clear error */
  clearError: () => void;
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * React hook for managing push notifications
 */
export function usePushNotifications(
  options: UsePushNotificationsOptions = {},
): UsePushNotificationsReturn {
  const {
    vapidKey,
    autoSubscribe = false,
    onPermissionChange,
    onSubscriptionChange,
    onError,
  } = options;

  const [state, setState] = useState<PushNotificationState>(
    () => pushNotificationService.state,
  );

  // Set VAPID key if provided
  useEffect(() => {
    if (vapidKey) {
      pushNotificationService.setVapidKey(vapidKey);
    }
  }, [vapidKey]);

  // Subscribe to state changes
  useEffect(() => {
    let previousPermission = state.permission;
    let previousSubscribed = state.isSubscribed;

    const unsubscribe = pushNotificationService.onStateChange((newState) => {
      // Trigger callbacks on changes
      if (newState.permission !== previousPermission) {
        onPermissionChange?.(newState.permission);
        previousPermission = newState.permission;
      }
      if (newState.isSubscribed !== previousSubscribed) {
        onSubscriptionChange?.(newState.isSubscribed);
        previousSubscribed = newState.isSubscribed;
      }
      if (newState.error) {
        onError?.(newState.error);
      }

      setState(newState);
    });

    return () => {
      unsubscribe();
    };
  }, [onPermissionChange, onSubscriptionChange, onError]);

  // Auto-subscribe when permission is granted
  useEffect(() => {
    if (
      autoSubscribe &&
      state.isSupported &&
      state.permission === 'granted' &&
      !state.isSubscribed &&
      !state.isLoading &&
      vapidKey
    ) {
      pushNotificationService.subscribe(vapidKey).catch((error) => {
        console.error('Auto-subscribe failed:', error);
      });
    }
  }, [autoSubscribe, vapidKey, state.isSupported, state.permission, state.isSubscribed, state.isLoading]);

  // Memoized callbacks
  const requestPermission = useCallback(async () => {
    return pushNotificationService.requestPermission();
  }, []);

  const subscribe = useCallback(async (key?: string) => {
    return pushNotificationService.subscribe(key || vapidKey);
  }, [vapidKey]);

  const unsubscribe = useCallback(async () => {
    return pushNotificationService.unsubscribe();
  }, []);

  const showNotification = useCallback(async (payload: NotificationPayload) => {
    return pushNotificationService.showNotification(payload);
  }, []);

  const closeNotifications = useCallback(async (tag?: string) => {
    return pushNotificationService.closeNotifications(tag);
  }, []);

  const clearError = useCallback(() => {
    // This will trigger a state update through the state change handler
    // For now, we'll just update local state
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    isSupported: state.isSupported,
    permission: state.permission,
    hasPermission: state.permission === 'granted',
    canRequestPermission: state.permission === 'default',
    isSubscribed: state.isSubscribed,
    subscription: state.subscription,
    subscriptionData: pushNotificationService.getSubscriptionData(),
    isLoading: state.isLoading,
    error: state.error,
    requestPermission,
    subscribe,
    unsubscribe,
    showNotification,
    closeNotifications,
    clearError,
  };
}

// ============================================================================
// Permission Hook
// ============================================================================

/**
 * Lightweight hook for just checking notification permission
 */
export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const supported = 'Notification' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission as NotificationPermission);
    }

    // Listen for permission changes (some browsers support this)
    const handlePermissionChange = () => {
      if ('Notification' in window) {
        setPermission(Notification.permission as NotificationPermission);
      }
    };

    // Check permission periodically as not all browsers support events
    const interval = setInterval(handlePermissionChange, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      return 'denied';
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermission);
      return result as NotificationPermission;
    } catch {
      return 'denied';
    }
  }, [isSupported]);

  return {
    permission,
    isSupported,
    isGranted: permission === 'granted',
    isDenied: permission === 'denied',
    canRequest: permission === 'default',
    requestPermission,
  };
}

// ============================================================================
// Quick Notification Hook
// ============================================================================

/**
 * Simple hook for showing notifications without subscription management
 */
export function useLocalNotification() {
  const { hasPermission, isSupported, requestPermission } = usePushNotifications();

  const notify = useCallback(
    async (title: string, options?: NotificationOptions): Promise<Notification | null> => {
      if (!isSupported) {
        console.warn('Notifications are not supported');
        return null;
      }

      if (!hasPermission) {
        const permission = await requestPermission();
        if (permission !== 'granted') {
          return null;
        }
      }

      try {
        return new Notification(title, options);
      } catch (error) {
        console.error('Failed to show notification:', error);
        return null;
      }
    },
    [isSupported, hasPermission, requestPermission],
  );

  return { notify, isSupported, hasPermission, requestPermission };
}

// Re-export types
export type { NotificationPayload, PushSubscriptionData, NotificationPermission };

export default usePushNotifications;
