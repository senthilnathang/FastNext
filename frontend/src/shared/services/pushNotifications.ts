/**
 * Push Notifications Service
 *
 * Provides comprehensive push notification functionality including:
 * - Permission management
 * - VAPID key support
 * - Subscription management
 * - Local notification display
 * - Backend subscription sync
 */

// ============================================================================
// Types
// ============================================================================

export type NotificationPermission = 'default' | 'granted' | 'denied';

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  expirationTime?: number | null;
}

export interface PushNotificationOptions {
  /** VAPID public key for push subscription */
  vapidPublicKey?: string;
  /** API endpoint for registering subscriptions */
  subscriptionEndpoint?: string;
  /** API endpoint for unregistering subscriptions */
  unsubscribeEndpoint?: string;
  /** Whether to automatically request permission */
  autoRequestPermission?: boolean;
  /** Default notification options */
  defaultNotificationOptions?: NotificationOptions;
  /** Enable debug logging */
  debug?: boolean;
}

export interface NotificationPayload {
  title: string;
  body?: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
  timestamp?: number;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  subscription: PushSubscription | null;
  isLoading: boolean;
  error: string | null;
}

export type PushNotificationStateChangeHandler = (state: PushNotificationState) => void;

// ============================================================================
// Default Options
// ============================================================================

const defaultOptions: Required<PushNotificationOptions> = {
  vapidPublicKey: '',
  subscriptionEndpoint: '/api/v1/push/subscribe',
  unsubscribeEndpoint: '/api/v1/push/unsubscribe',
  autoRequestPermission: false,
  defaultNotificationOptions: {
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
  },
  debug: process.env.NODE_ENV === 'development',
};

// ============================================================================
// Push Notification Service
// ============================================================================

class PushNotificationService {
  private options: Required<PushNotificationOptions>;
  private _state: PushNotificationState = {
    isSupported: false,
    permission: 'default',
    isSubscribed: false,
    subscription: null,
    isLoading: false,
    error: null,
  };
  private stateChangeHandlers: Set<PushNotificationStateChangeHandler> = new Set();
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

  constructor(options: PushNotificationOptions = {}) {
    this.options = { ...defaultOptions, ...options };
    this.initializeSupport();
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  private initializeSupport(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const isSupported =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;

    this.updateState({
      isSupported,
      permission: isSupported ? (Notification.permission as NotificationPermission) : 'denied',
    });

    if (isSupported) {
      // Check for existing subscription
      this.checkExistingSubscription();
    }
  }

  private async checkExistingSubscription(): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.ready;
      this.serviceWorkerRegistration = registration;

      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        this.updateState({
          isSubscribed: true,
          subscription,
        });
        this.log('Existing push subscription found');
      }
    } catch (error) {
      this.log('Error checking existing subscription', error);
    }
  }

  // ============================================================================
  // Public Getters
  // ============================================================================

  get state(): PushNotificationState {
    return { ...this._state };
  }

  get isSupported(): boolean {
    return this._state.isSupported;
  }

  get permission(): NotificationPermission {
    return this._state.permission;
  }

  get isSubscribed(): boolean {
    return this._state.isSubscribed;
  }

  get subscription(): PushSubscription | null {
    return this._state.subscription;
  }

  // ============================================================================
  // State Management
  // ============================================================================

  onStateChange(handler: PushNotificationStateChangeHandler): () => void {
    this.stateChangeHandlers.add(handler);
    return () => {
      this.stateChangeHandlers.delete(handler);
    };
  }

  private updateState(updates: Partial<PushNotificationState>): void {
    this._state = { ...this._state, ...updates };
    this.stateChangeHandlers.forEach((handler) => {
      try {
        handler(this._state);
      } catch (error) {
        console.error('Error in push notification state change handler:', error);
      }
    });
  }

  // ============================================================================
  // Permission Management
  // ============================================================================

  /**
   * Request notification permission from the user
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this._state.isSupported) {
      this.updateState({ error: 'Push notifications are not supported' });
      return 'denied';
    }

    this.updateState({ isLoading: true, error: null });

    try {
      const permission = await Notification.requestPermission();
      this.updateState({
        permission: permission as NotificationPermission,
        isLoading: false,
      });
      this.log(`Permission ${permission}`);
      return permission as NotificationPermission;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Permission request failed';
      this.updateState({ error: errorMessage, isLoading: false });
      this.log('Permission request failed', error);
      return 'denied';
    }
  }

  /**
   * Check if permission is granted
   */
  hasPermission(): boolean {
    return this._state.permission === 'granted';
  }

  /**
   * Check if permission can be requested (not denied)
   */
  canRequestPermission(): boolean {
    return this._state.permission === 'default';
  }

  // ============================================================================
  // Subscription Management
  // ============================================================================

  /**
   * Subscribe to push notifications
   */
  async subscribe(vapidKey?: string): Promise<PushSubscription | null> {
    if (!this._state.isSupported) {
      this.updateState({ error: 'Push notifications are not supported' });
      return null;
    }

    if (!this.hasPermission()) {
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        return null;
      }
    }

    this.updateState({ isLoading: true, error: null });

    try {
      const registration = this.serviceWorkerRegistration || await navigator.serviceWorker.ready;
      this.serviceWorkerRegistration = registration;

      const publicKey = vapidKey || this.options.vapidPublicKey;
      if (!publicKey) {
        throw new Error('VAPID public key is required for push subscription');
      }

      const applicationServerKey = this.urlBase64ToUint8Array(publicKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      this.updateState({
        isSubscribed: true,
        subscription,
        isLoading: false,
      });

      // Sync subscription with backend
      await this.syncSubscriptionWithBackend(subscription);

      this.log('Successfully subscribed to push notifications');
      return subscription;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Subscription failed';
      this.updateState({ error: errorMessage, isLoading: false });
      this.log('Subscription failed', error);
      return null;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    if (!this._state.subscription) {
      return true;
    }

    this.updateState({ isLoading: true, error: null });

    try {
      // Notify backend before unsubscribing
      await this.removeSubscriptionFromBackend(this._state.subscription);

      const result = await this._state.subscription.unsubscribe();

      if (result) {
        this.updateState({
          isSubscribed: false,
          subscription: null,
          isLoading: false,
        });
        this.log('Successfully unsubscribed from push notifications');
      } else {
        this.updateState({ isLoading: false });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unsubscribe failed';
      this.updateState({ error: errorMessage, isLoading: false });
      this.log('Unsubscribe failed', error);
      return false;
    }
  }

  /**
   * Get subscription data for backend
   */
  getSubscriptionData(): PushSubscriptionData | null {
    if (!this._state.subscription) {
      return null;
    }

    const subscriptionJson = this._state.subscription.toJSON();

    return {
      endpoint: this._state.subscription.endpoint,
      keys: {
        p256dh: subscriptionJson.keys?.p256dh || '',
        auth: subscriptionJson.keys?.auth || '',
      },
      expirationTime: this._state.subscription.expirationTime,
    };
  }

  // ============================================================================
  // Backend Synchronization
  // ============================================================================

  /**
   * Sync subscription with backend
   */
  private async syncSubscriptionWithBackend(subscription: PushSubscription): Promise<void> {
    if (!this.options.subscriptionEndpoint) {
      return;
    }

    try {
      const subscriptionData = subscription.toJSON();

      const response = await fetch(this.options.subscriptionEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAccessToken()}`,
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: subscriptionData.keys,
          expirationTime: subscription.expirationTime,
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend sync failed: ${response.status}`);
      }

      this.log('Subscription synced with backend');
    } catch (error) {
      this.log('Failed to sync subscription with backend', error);
      // Don't throw - subscription still works locally
    }
  }

  /**
   * Remove subscription from backend
   */
  private async removeSubscriptionFromBackend(subscription: PushSubscription): Promise<void> {
    if (!this.options.unsubscribeEndpoint) {
      return;
    }

    try {
      const response = await fetch(this.options.unsubscribeEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAccessToken()}`,
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend unsubscribe failed: ${response.status}`);
      }

      this.log('Subscription removed from backend');
    } catch (error) {
      this.log('Failed to remove subscription from backend', error);
    }
  }

  private getAccessToken(): string {
    if (typeof window === 'undefined') {
      return '';
    }
    return localStorage.getItem('accessToken') || '';
  }

  // ============================================================================
  // Local Notifications
  // ============================================================================

  /**
   * Show a local notification
   */
  async showNotification(payload: NotificationPayload): Promise<boolean> {
    if (!this._state.isSupported || !this.hasPermission()) {
      this.log('Cannot show notification: not supported or no permission');
      return false;
    }

    try {
      const registration = this.serviceWorkerRegistration || await navigator.serviceWorker.ready;

      const options: NotificationOptions = {
        body: payload.body,
        icon: payload.icon || this.options.defaultNotificationOptions.icon,
        badge: payload.badge || this.options.defaultNotificationOptions.badge,
        image: payload.image,
        tag: payload.tag,
        data: payload.data,
        actions: payload.actions,
        requireInteraction: payload.requireInteraction,
        silent: payload.silent,
        vibrate: payload.vibrate || this.options.defaultNotificationOptions.vibrate,
        timestamp: payload.timestamp,
      };

      await registration.showNotification(payload.title, options);
      this.log('Notification shown', payload);
      return true;
    } catch (error) {
      this.log('Failed to show notification', error);
      return false;
    }
  }

  /**
   * Close all notifications with a specific tag
   */
  async closeNotifications(tag?: string): Promise<void> {
    try {
      const registration = this.serviceWorkerRegistration || await navigator.serviceWorker.ready;
      const notifications = await registration.getNotifications({ tag });

      notifications.forEach((notification) => {
        notification.close();
      });

      this.log(`Closed ${notifications.length} notifications`);
    } catch (error) {
      this.log('Failed to close notifications', error);
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Convert VAPID public key from base64 to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }

  /**
   * Set VAPID public key
   */
  setVapidKey(key: string): void {
    this.options.vapidPublicKey = key;
  }

  /**
   * Update options
   */
  updateOptions(options: Partial<PushNotificationOptions>): void {
    this.options = { ...this.options, ...options };
  }

  private log(message: string, data?: unknown): void {
    if (this.options.debug) {
      if (data) {
        console.log(`[PushNotifications] ${message}`, data);
      } else {
        console.log(`[PushNotifications] ${message}`);
      }
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const pushNotificationService = new PushNotificationService();

// Export class for testing or creating additional instances
export { PushNotificationService };
