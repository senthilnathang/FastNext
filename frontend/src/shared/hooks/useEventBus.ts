'use client';

/**
 * Event Bus Hook
 *
 * Provides a type-safe cross-component event bus for pub/sub communication.
 * Supports subscribing to events, emitting events, and automatic cleanup.
 */

import { useCallback, useEffect, useRef } from 'react';

// Event handler type
type EventHandler<T = unknown> = (data: T) => void;

// Event subscription
interface EventSubscription {
  id: string;
  handler: EventHandler;
}

// Event bus class (singleton)
class EventBus {
  private static instance: EventBus;
  private handlers: Map<string, Set<EventSubscription>> = new Map();
  private subscriptionCounter = 0;

  private constructor() {}

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Subscribe to an event
   */
  subscribe<T = unknown>(
    event: string,
    handler: EventHandler<T>,
  ): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }

    const subscriptionId = `${event}_${++this.subscriptionCounter}`;
    const subscription: EventSubscription = {
      id: subscriptionId,
      handler: handler as EventHandler,
    };

    this.handlers.get(event)!.add(subscription);

    // Return unsubscribe function
    return () => {
      const eventHandlers = this.handlers.get(event);
      if (eventHandlers) {
        eventHandlers.delete(subscription);
        if (eventHandlers.size === 0) {
          this.handlers.delete(event);
        }
      }
    };
  }

  /**
   * Emit an event
   */
  emit<T = unknown>(event: string, data?: T): void {
    const eventHandlers = this.handlers.get(event);
    if (!eventHandlers) return;

    eventHandlers.forEach((subscription) => {
      try {
        subscription.handler(data);
      } catch (error) {
        console.error(`Error in event handler for "${event}":`, error);
      }
    });
  }

  /**
   * Subscribe to multiple events
   */
  subscribeMany<T = unknown>(
    events: string[],
    handler: EventHandler<T>,
  ): () => void {
    const unsubscribes = events.map((event) => this.subscribe(event, handler));
    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }

  /**
   * Subscribe with pattern matching (supports * wildcard)
   */
  subscribePattern<T = unknown>(
    pattern: string,
    handler: EventHandler<T>,
  ): () => void {
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$',
    );

    // Subscribe to all matching events
    const checkAndSubscribe = (event: string) => {
      if (regex.test(event)) {
        return this.subscribe(event, handler);
      }
      return null;
    };

    // Track existing subscriptions
    const unsubscribes: (() => void)[] = [];
    this.handlers.forEach((_, event) => {
      const unsub = checkAndSubscribe(event);
      if (unsub) unsubscribes.push(unsub);
    });

    // Store pattern handler for future events
    const patternKey = `__pattern__${pattern}`;
    if (!this.handlers.has(patternKey)) {
      this.handlers.set(patternKey, new Set());
    }

    const subscription: EventSubscription = {
      id: `pattern_${++this.subscriptionCounter}`,
      handler: handler as EventHandler,
    };
    this.handlers.get(patternKey)!.add(subscription);

    return () => {
      unsubscribes.forEach((unsub) => unsub());
      const patternHandlers = this.handlers.get(patternKey);
      if (patternHandlers) {
        patternHandlers.delete(subscription);
        if (patternHandlers.size === 0) {
          this.handlers.delete(patternKey);
        }
      }
    };
  }

  /**
   * Check if event has subscribers
   */
  hasSubscribers(event: string): boolean {
    const eventHandlers = this.handlers.get(event);
    return eventHandlers ? eventHandlers.size > 0 : false;
  }

  /**
   * Get subscriber count for an event
   */
  getSubscriberCount(event: string): number {
    const eventHandlers = this.handlers.get(event);
    return eventHandlers ? eventHandlers.size : 0;
  }

  /**
   * Clear all handlers for an event
   */
  clear(event: string): void {
    this.handlers.delete(event);
  }

  /**
   * Clear all handlers
   */
  clearAll(): void {
    this.handlers.clear();
    this.subscriptionCounter = 0;
  }

  /**
   * Get all registered events
   */
  getEvents(): string[] {
    return Array.from(this.handlers.keys()).filter(
      (key) => !key.startsWith('__pattern__'),
    );
  }
}

// Global event bus instance
const eventBus = EventBus.getInstance();

// Common event types for type safety
export interface EventBusEvents {
  // User events
  'user:login': { userId: string };
  'user:logout': void;
  'user:updated': { userId: string; changes: Record<string, unknown> };

  // Navigation events
  'navigation:change': { path: string; params?: Record<string, string> };
  'navigation:back': void;

  // Notification events
  'notification:show': { type: 'info' | 'success' | 'warning' | 'error'; message: string };
  'notification:clear': void;

  // Modal events
  'modal:open': { id: string; data?: unknown };
  'modal:close': { id: string };
  'modal:closeAll': void;

  // Data events
  'data:refresh': { entity: string; id?: string };
  'data:invalidate': { queryKey: string[] };

  // Form events
  'form:submit': { formId: string; data: unknown };
  'form:reset': { formId: string };
  'form:validate': { formId: string };

  // Theme events
  'theme:change': { theme: 'light' | 'dark' | 'system' };

  // Custom events - extend this interface in your app
  [key: string]: unknown;
}

// Type-safe emit function
export type TypedEmit = <K extends keyof EventBusEvents>(
  event: K,
  data?: EventBusEvents[K],
) => void;

// Type-safe subscribe function
export type TypedSubscribe = <K extends keyof EventBusEvents>(
  event: K,
  handler: EventHandler<EventBusEvents[K]>,
) => () => void;

// Hook return type
export interface UseEventBusReturn {
  /** Subscribe to an event (auto-cleanup on unmount) */
  subscribe: TypedSubscribe;
  /** Subscribe without auto-cleanup */
  subscribeManual: TypedSubscribe;
  /** Emit an event */
  emit: TypedEmit;
  /** Subscribe to multiple events */
  subscribeMany: <K extends keyof EventBusEvents>(
    events: K[],
    handler: EventHandler<EventBusEvents[K]>,
  ) => () => void;
  /** Check if event has subscribers */
  hasSubscribers: (event: keyof EventBusEvents) => boolean;
  /** Get subscriber count */
  getSubscriberCount: (event: keyof EventBusEvents) => number;
  /** Get all registered events */
  getEvents: () => string[];
}

/**
 * useEventBus hook
 *
 * Provides type-safe cross-component event communication.
 *
 * @example
 * ```tsx
 * // Component A - Emitting events
 * function UserProfile() {
 *   const { emit } = useEventBus();
 *
 *   const handleUpdate = () => {
 *     updateUser(data);
 *     emit('user:updated', { userId: user.id, changes: data });
 *   };
 *
 *   return <button onClick={handleUpdate}>Update</button>;
 * }
 *
 * // Component B - Subscribing to events
 * function UserAvatar() {
 *   const { subscribe } = useEventBus();
 *   const [user, setUser] = useState(null);
 *
 *   useEffect(() => {
 *     return subscribe('user:updated', ({ userId, changes }) => {
 *       if (userId === currentUserId) {
 *         setUser(prev => ({ ...prev, ...changes }));
 *       }
 *     });
 *   }, [subscribe]);
 *
 *   return <Avatar user={user} />;
 * }
 * ```
 */
export function useEventBus(): UseEventBusReturn {
  // Track subscriptions for cleanup
  const subscriptionsRef = useRef<(() => void)[]>([]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      subscriptionsRef.current.forEach((unsub) => unsub());
      subscriptionsRef.current = [];
    };
  }, []);

  // Subscribe with auto-cleanup
  const subscribe = useCallback(<K extends keyof EventBusEvents>(
    event: K,
    handler: EventHandler<EventBusEvents[K]>,
  ): (() => void) => {
    const unsubscribe = eventBus.subscribe(event as string, handler);
    subscriptionsRef.current.push(unsubscribe);

    return () => {
      unsubscribe();
      subscriptionsRef.current = subscriptionsRef.current.filter(
        (unsub) => unsub !== unsubscribe,
      );
    };
  }, []) as TypedSubscribe;

  // Subscribe without auto-cleanup
  const subscribeManual = useCallback(<K extends keyof EventBusEvents>(
    event: K,
    handler: EventHandler<EventBusEvents[K]>,
  ): (() => void) => {
    return eventBus.subscribe(event as string, handler);
  }, []) as TypedSubscribe;

  // Emit event
  const emit = useCallback(<K extends keyof EventBusEvents>(
    event: K,
    data?: EventBusEvents[K],
  ): void => {
    eventBus.emit(event as string, data);
  }, []) as TypedEmit;

  // Subscribe to multiple events
  const subscribeMany = useCallback(<K extends keyof EventBusEvents>(
    events: K[],
    handler: EventHandler<EventBusEvents[K]>,
  ): (() => void) => {
    const unsubscribe = eventBus.subscribeMany(events as string[], handler);
    subscriptionsRef.current.push(unsubscribe);

    return () => {
      unsubscribe();
      subscriptionsRef.current = subscriptionsRef.current.filter(
        (unsub) => unsub !== unsubscribe,
      );
    };
  }, []);

  // Check if event has subscribers
  const hasSubscribers = useCallback(
    (event: keyof EventBusEvents): boolean => {
      return eventBus.hasSubscribers(event as string);
    },
    [],
  );

  // Get subscriber count
  const getSubscriberCount = useCallback(
    (event: keyof EventBusEvents): number => {
      return eventBus.getSubscriberCount(event as string);
    },
    [],
  );

  // Get all events
  const getEvents = useCallback((): string[] => {
    return eventBus.getEvents();
  }, []);

  return {
    subscribe,
    subscribeManual,
    emit,
    subscribeMany,
    hasSubscribers,
    getSubscriberCount,
    getEvents,
  };
}

/**
 * useEventBusEvent hook
 *
 * Subscribe to a single event with automatic cleanup.
 *
 * @example
 * ```tsx
 * function NotificationHandler() {
 *   useEventBusEvent('notification:show', ({ type, message }) => {
 *     toast[type](message);
 *   });
 *
 *   return null;
 * }
 * ```
 */
export function useEventBusEvent<K extends keyof EventBusEvents>(
  event: K,
  handler: EventHandler<EventBusEvents[K]>,
  deps: React.DependencyList = [],
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    return eventBus.subscribe(event as string, (data) => {
      handlerRef.current(data as EventBusEvents[K]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, ...deps]);
}

/**
 * useEventBusEmitter hook
 *
 * Get just the emit function for components that only emit events.
 */
export function useEventBusEmitter(): TypedEmit {
  return useCallback(<K extends keyof EventBusEvents>(
    event: K,
    data?: EventBusEvents[K],
  ): void => {
    eventBus.emit(event as string, data);
  }, []) as TypedEmit;
}

// Export the event bus instance for advanced usage
export { eventBus };

export default useEventBus;
