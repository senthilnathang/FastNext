'use client';

/**
 * Typing Indicator Hook
 *
 * Provides typing indicator functionality with debounced events,
 * listening for typing events, and WebSocket integration.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { wsService, WebSocketEventType } from '@/shared/services/websocket';

// Typing user information
export interface TypingUser {
  id: string | number;
  name?: string;
  avatar?: string;
  context?: string;
  startedAt: number;
}

// Typing event data from WebSocket
export interface TypingEventData {
  user_id: string | number;
  user_name?: string;
  user_avatar?: string;
  recipient_id?: string | number;
  context?: string;
}

// Hook options for emitting typing events
export interface UseTypingEmitterOptions {
  /** Recipient ID (user or conversation ID) */
  recipientId: string | number;
  /** Context identifier (e.g., 'chat', 'comment') */
  context?: string;
  /** Debounce delay in ms (default: 300ms) */
  debounceMs?: number;
  /** Auto-stop timeout in ms (default: 3000ms) */
  autoStopMs?: number;
  /** Whether emitting is enabled (default: true) */
  enabled?: boolean;
}

export interface UseTypingEmitterReturn {
  /** Whether currently typing */
  isTyping: boolean;
  /** Start/continue typing indicator */
  startTyping: () => void;
  /** Stop typing indicator */
  stopTyping: () => void;
  /** Call this on input change */
  onInput: () => void;
}

/**
 * useTypingEmitter hook
 *
 * Emits typing events with debouncing and auto-stop.
 *
 * @example
 * ```tsx
 * function ChatInput({ recipientId }: { recipientId: string }) {
 *   const { onInput, stopTyping } = useTypingEmitter({
 *     recipientId,
 *     context: 'direct-message',
 *   });
 *
 *   return (
 *     <textarea
 *       onChange={(e) => {
 *         setValue(e.target.value);
 *         onInput();
 *       }}
 *       onBlur={stopTyping}
 *     />
 *   );
 * }
 * ```
 */
export function useTypingEmitter(
  options: UseTypingEmitterOptions,
): UseTypingEmitterReturn {
  const {
    recipientId,
    context,
    debounceMs = 300,
    autoStopMs = 3000,
    enabled = true,
  } = options;

  const [isTyping, setIsTyping] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEmitRef = useRef<number>(0);

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
  }, []);

  // Emit typing start
  const emitTypingStart = useCallback(() => {
    if (!enabled) return;

    const now = Date.now();
    // Throttle emissions to prevent flooding
    if (now - lastEmitRef.current < debounceMs) return;

    lastEmitRef.current = now;
    wsService.sendTypingStart(Number(recipientId), context);
  }, [enabled, recipientId, context, debounceMs]);

  // Emit typing stop
  const emitTypingStop = useCallback(() => {
    if (!enabled) return;
    wsService.sendTypingStop(Number(recipientId));
  }, [enabled, recipientId]);

  // Start typing
  const startTyping = useCallback(() => {
    if (!enabled) return;

    if (!isTyping) {
      setIsTyping(true);
      emitTypingStart();
    }

    // Reset auto-stop timer
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
    }

    autoStopTimerRef.current = setTimeout(() => {
      setIsTyping(false);
      emitTypingStop();
    }, autoStopMs);
  }, [enabled, isTyping, emitTypingStart, emitTypingStop, autoStopMs]);

  // Stop typing
  const stopTyping = useCallback(() => {
    clearTimers();

    if (isTyping) {
      setIsTyping(false);
      emitTypingStop();
    }
  }, [isTyping, emitTypingStop, clearTimers]);

  // Handle input event with debouncing
  const onInput = useCallback(() => {
    if (!enabled) return;

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce the typing start
    debounceTimerRef.current = setTimeout(() => {
      startTyping();
    }, debounceMs);
  }, [enabled, startTyping, debounceMs]);

  // Cleanup on unmount or recipient change
  useEffect(() => {
    return () => {
      clearTimers();
      if (isTyping) {
        emitTypingStop();
      }
    };
  }, [recipientId, clearTimers, isTyping, emitTypingStop]);

  return {
    isTyping,
    startTyping,
    stopTyping,
    onInput,
  };
}

// Hook options for listening to typing events
export interface UseTypingListenerOptions {
  /** Filter by context (optional) */
  context?: string;
  /** Filter by recipient ID (to see who's typing to this recipient) */
  recipientId?: string | number;
  /** Timeout to remove stale typing indicators (default: 5000ms) */
  staleTimeoutMs?: number;
  /** Whether listening is enabled (default: true) */
  enabled?: boolean;
}

export interface UseTypingListenerReturn {
  /** List of users currently typing */
  typingUsers: TypingUser[];
  /** Whether anyone is typing */
  isAnyoneTyping: boolean;
  /** Get typing text (e.g., "John is typing...", "John and Jane are typing...") */
  typingText: string;
  /** Clear all typing indicators */
  clearAll: () => void;
}

/**
 * useTypingListener hook
 *
 * Listens for typing events and maintains a list of typing users.
 *
 * @example
 * ```tsx
 * function TypingIndicator({ conversationId }: { conversationId: string }) {
 *   const { typingUsers, typingText } = useTypingListener({
 *     recipientId: conversationId,
 *   });
 *
 *   if (typingUsers.length === 0) return null;
 *
 *   return (
 *     <div className="typing-indicator">
 *       {typingText}
 *     </div>
 *   );
 * }
 * ```
 */
export function useTypingListener(
  options: UseTypingListenerOptions = {},
): UseTypingListenerReturn {
  const {
    context,
    recipientId,
    staleTimeoutMs = 5000,
    enabled = true,
  } = options;

  const [typingUsers, setTypingUsers] = useState<Map<string | number, TypingUser>>(
    new Map(),
  );
  const staleTimersRef = useRef<Map<string | number, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  // Clear stale timer for a user
  const clearStaleTimer = useCallback((userId: string | number) => {
    const timer = staleTimersRef.current.get(userId);
    if (timer) {
      clearTimeout(timer);
      staleTimersRef.current.delete(userId);
    }
  }, []);

  // Set stale timer for a user
  const setStaleTimer = useCallback(
    (userId: string | number) => {
      clearStaleTimer(userId);

      const timer = setTimeout(() => {
        setTypingUsers((prev) => {
          const next = new Map(prev);
          next.delete(userId);
          return next;
        });
        staleTimersRef.current.delete(userId);
      }, staleTimeoutMs);

      staleTimersRef.current.set(userId, timer);
    },
    [staleTimeoutMs, clearStaleTimer],
  );

  // Handle typing start event
  const handleTypingStart = useCallback(
    (data: TypingEventData) => {
      // Filter by context if specified
      if (context && data.context !== context) return;

      // Filter by recipient if specified
      if (recipientId && data.recipient_id !== recipientId) return;

      const userId = data.user_id;

      setTypingUsers((prev) => {
        const next = new Map(prev);
        next.set(userId, {
          id: userId,
          name: data.user_name,
          avatar: data.user_avatar,
          context: data.context,
          startedAt: Date.now(),
        });
        return next;
      });

      // Set/reset stale timer
      setStaleTimer(userId);
    },
    [context, recipientId, setStaleTimer],
  );

  // Handle typing stop event
  const handleTypingStop = useCallback(
    (data: TypingEventData) => {
      const userId = data.user_id;

      clearStaleTimer(userId);

      setTypingUsers((prev) => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
    },
    [clearStaleTimer],
  );

  // Subscribe to WebSocket events
  useEffect(() => {
    if (!enabled) return;

    const unsubscribeStart = wsService.on<TypingEventData>(
      'typing:start' as WebSocketEventType,
      handleTypingStart,
    );

    const unsubscribeStop = wsService.on<TypingEventData>(
      'typing:stop' as WebSocketEventType,
      handleTypingStop,
    );

    return () => {
      unsubscribeStart();
      unsubscribeStop();
    };
  }, [enabled, handleTypingStart, handleTypingStop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      staleTimersRef.current.forEach((timer) => clearTimeout(timer));
      staleTimersRef.current.clear();
    };
  }, []);

  // Clear all typing indicators
  const clearAll = useCallback(() => {
    staleTimersRef.current.forEach((timer) => clearTimeout(timer));
    staleTimersRef.current.clear();
    setTypingUsers(new Map());
  }, []);

  // Convert map to array
  const typingUsersArray = useMemo(
    () => Array.from(typingUsers.values()),
    [typingUsers],
  );

  // Generate typing text
  const typingText = useMemo(() => {
    const users = typingUsersArray;
    if (users.length === 0) return '';

    const names = users.map((u) => u.name || `User ${u.id}`);

    if (names.length === 1) {
      return `${names[0]} is typing...`;
    }

    if (names.length === 2) {
      return `${names[0]} and ${names[1]} are typing...`;
    }

    return `${names[0]} and ${names.length - 1} others are typing...`;
  }, [typingUsersArray]);

  return {
    typingUsers: typingUsersArray,
    isAnyoneTyping: typingUsersArray.length > 0,
    typingText,
    clearAll,
  };
}

/**
 * useTypingIndicator hook
 *
 * Combined hook for both emitting and listening to typing events.
 *
 * @example
 * ```tsx
 * function Chat({ recipientId }: { recipientId: string }) {
 *   const {
 *     emitter: { onInput, stopTyping },
 *     listener: { typingText, isAnyoneTyping },
 *   } = useTypingIndicator({
 *     recipientId,
 *   });
 *
 *   return (
 *     <div>
 *       {isAnyoneTyping && <div>{typingText}</div>}
 *       <textarea
 *         onChange={(e) => {
 *           setValue(e.target.value);
 *           onInput();
 *         }}
 *         onBlur={stopTyping}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */
export interface UseTypingIndicatorOptions {
  /** Recipient ID for emitting */
  recipientId: string | number;
  /** Context identifier */
  context?: string;
  /** Emitter debounce delay */
  debounceMs?: number;
  /** Emitter auto-stop timeout */
  autoStopMs?: number;
  /** Listener stale timeout */
  staleTimeoutMs?: number;
  /** Whether enabled */
  enabled?: boolean;
}

export interface UseTypingIndicatorReturn {
  /** Emitter interface */
  emitter: UseTypingEmitterReturn;
  /** Listener interface */
  listener: UseTypingListenerReturn;
}

export function useTypingIndicator(
  options: UseTypingIndicatorOptions,
): UseTypingIndicatorReturn {
  const {
    recipientId,
    context,
    debounceMs,
    autoStopMs,
    staleTimeoutMs,
    enabled = true,
  } = options;

  const emitter = useTypingEmitter({
    recipientId,
    context,
    debounceMs,
    autoStopMs,
    enabled,
  });

  const listener = useTypingListener({
    recipientId,
    context,
    staleTimeoutMs,
    enabled,
  });

  return { emitter, listener };
}

export default useTypingIndicator;
