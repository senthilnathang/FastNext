'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  wsService,
  WebSocketEventHandler,
  WebSocketEventType,
  WebSocketState,
  ConnectionState,
  QueuedMessage,
} from '@/shared/services/websocket';
import type { Unsubscribe } from '@/shared/types/websocket';

export interface UseWebSocketOptions {
  /** Auto-connect on mount */
  autoConnect?: boolean;
  /** Token for authentication */
  token?: string;
  /** Callback when connection is established */
  onConnect?: () => void;
  /** Callback when connection is lost */
  onDisconnect?: (reason?: string) => void;
  /** Callback when reconnecting */
  onReconnecting?: (attempt: number) => void;
  /** Callback when reconnected */
  onReconnected?: () => void;
  /** Callback on error */
  onError?: (error: string) => void;
}

export interface UseWebSocketReturn {
  /** Current connection state */
  state: WebSocketState;
  /** Whether WebSocket is connected */
  isConnected: boolean;
  /** Whether WebSocket is connecting */
  isConnecting: boolean;
  /** Whether WebSocket is reconnecting */
  isReconnecting: boolean;
  /** Last error message */
  lastError: string | null;
  /** Current connection status */
  connectionStatus: ConnectionState;
  /** Current latency in ms */
  latency: number | null;
  /** Number of queued messages */
  queuedMessageCount: number;
  /** Connect to WebSocket server */
  connect: (token?: string) => Promise<void>;
  /** Disconnect from WebSocket server */
  disconnect: () => void;
  /** Send a message */
  send: <T = unknown>(type: string, data?: T, priority?: number) => boolean;
  /** Subscribe to an event */
  on: <T = unknown>(
    eventType: WebSocketEventType | '*',
    handler: WebSocketEventHandler<T>,
  ) => Unsubscribe;
  /** Subscribe to an event (fires once) */
  once: <T = unknown>(
    eventType: WebSocketEventType | '*',
    handler: WebSocketEventHandler<T>,
  ) => Unsubscribe;
  /** Unsubscribe from an event */
  off: <T = unknown>(
    eventType: WebSocketEventType | '*',
    handler: WebSocketEventHandler<T>,
  ) => void;
  /** Send typing start indicator */
  sendTypingStart: (recipientId: number, context?: string) => boolean;
  /** Send typing stop indicator */
  sendTypingStop: (recipientId: number) => boolean;
  /** Send read receipt */
  sendReadReceipt: (messageIds: number[]) => boolean;
  /** Flush queued messages */
  flushQueue: () => Promise<void>;
  /** Clear message queue */
  clearQueue: () => void;
  /** Get queued messages */
  getQueuedMessages: () => QueuedMessage[];
}

/**
 * React hook for WebSocket connection management
 */
export function useWebSocket(
  options: UseWebSocketOptions = {},
): UseWebSocketReturn {
  const {
    autoConnect = false,
    token,
    onConnect,
    onDisconnect,
    onReconnecting,
    onReconnected,
    onError,
  } = options;

  const [state, setState] = useState<WebSocketState>(() => wsService.state);
  const previousStateRef = useRef<WebSocketState>(wsService.state);

  // Store callbacks in refs to avoid re-subscribing
  const callbacksRef = useRef({ onConnect, onDisconnect, onReconnecting, onReconnected, onError });
  callbacksRef.current = { onConnect, onDisconnect, onReconnecting, onReconnected, onError };

  useEffect(() => {
    // Subscribe to state changes
    const unsubscribe = wsService.onStateChange((newState) => {
      const prevState = previousStateRef.current;

      // Trigger callbacks based on state transitions
      if (!prevState.isConnected && newState.isConnected) {
        callbacksRef.current.onConnect?.();
      }
      if (prevState.isConnected && !newState.isConnected) {
        callbacksRef.current.onDisconnect?.(newState.lastError || undefined);
      }
      if (!prevState.isReconnecting && newState.isReconnecting) {
        callbacksRef.current.onReconnecting?.(newState.reconnectAttempts);
      }
      if (prevState.isReconnecting && newState.isConnected) {
        callbacksRef.current.onReconnected?.();
      }
      if (newState.lastError && newState.lastError !== prevState.lastError) {
        callbacksRef.current.onError?.(newState.lastError);
      }

      previousStateRef.current = newState;
      setState(newState);
    });

    // Auto-connect if enabled
    if (autoConnect && !wsService.isConnected && !wsService.isConnecting) {
      wsService.connect(token).catch((error) => {
        console.error('WebSocket auto-connect failed:', error);
      });
    }

    return () => {
      unsubscribe();
    };
  }, [autoConnect, token]);

  const connect = useCallback(async (connectToken?: string) => {
    await wsService.connect(connectToken || token);
  }, [token]);

  const disconnect = useCallback(() => {
    wsService.disconnect();
  }, []);

  const send = useCallback(<T = unknown>(type: string, data?: T, priority: number = 0) => {
    return wsService.send(type, data, priority);
  }, []);

  const on = useCallback(<T = unknown>(
    eventType: WebSocketEventType | '*',
    handler: WebSocketEventHandler<T>,
  ): Unsubscribe => {
    return wsService.on(eventType, handler);
  }, []);

  const once = useCallback(<T = unknown>(
    eventType: WebSocketEventType | '*',
    handler: WebSocketEventHandler<T>,
  ): Unsubscribe => {
    const wrappedHandler: WebSocketEventHandler<T> = (data, message) => {
      unsubscribe();
      handler(data, message);
    };
    const unsubscribe = wsService.on(eventType, wrappedHandler);
    return unsubscribe;
  }, []);

  const off = useCallback(<T = unknown>(
    eventType: WebSocketEventType | '*',
    handler: WebSocketEventHandler<T>,
  ) => {
    wsService.off(eventType, handler);
  }, []);

  const sendTypingStart = useCallback(
    (recipientId: number, context?: string) => {
      return wsService.sendTypingStart(recipientId, context);
    },
    [],
  );

  const sendTypingStop = useCallback((recipientId: number) => {
    return wsService.sendTypingStop(recipientId);
  }, []);

  const sendReadReceipt = useCallback((messageIds: number[]) => {
    return wsService.sendReadReceipt(messageIds);
  }, []);

  const flushQueue = useCallback(async () => {
    await wsService.flushMessageQueue();
  }, []);

  const clearQueue = useCallback(() => {
    wsService.clearMessageQueue();
  }, []);

  const getQueuedMessages = useCallback(() => {
    return wsService.getQueuedMessages();
  }, []);

  return {
    state,
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    isReconnecting: state.isReconnecting,
    lastError: state.lastError,
    connectionStatus: state.status,
    latency: state.latency,
    queuedMessageCount: state.queuedMessageCount,
    connect,
    disconnect,
    send,
    on,
    once,
    off,
    sendTypingStart,
    sendTypingStop,
    sendReadReceipt,
    flushQueue,
    clearQueue,
    getQueuedMessages,
  };
}

/**
 * Hook for subscribing to specific WebSocket events
 */
export function useWebSocketEvent<T = unknown>(
  eventType: WebSocketEventType | '*',
  handler: WebSocketEventHandler<T>,
  deps: React.DependencyList = [],
): void {
  useEffect(() => {
    const unsubscribe = wsService.on(eventType, handler);
    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventType, ...deps]);
}

/**
 * Hook for typing indicators
 */
export function useTypingIndicator(recipientId: number) {
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  const startTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      wsService.sendTypingStart(recipientId);
    }

    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Set new timeout to stop typing after 3 seconds of inactivity
    const timeout = setTimeout(() => {
      setIsTyping(false);
      wsService.sendTypingStop(recipientId);
    }, 3000);

    setTypingTimeout(timeout);
  }, [isTyping, recipientId, typingTimeout]);

  const stopTyping = useCallback(() => {
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      setTypingTimeout(null);
    }
    if (isTyping) {
      setIsTyping(false);
      wsService.sendTypingStop(recipientId);
    }
  }, [isTyping, recipientId, typingTimeout]);

  useEffect(() => {
    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    };
  }, [typingTimeout]);

  return {
    isTyping,
    startTyping,
    stopTyping,
  };
}

/**
 * Hook for monitoring connection status
 */
export function useConnectionStatus() {
  const [status, setStatus] = useState<ConnectionState>(() => wsService.connectionStatus);
  const [latency, setLatency] = useState<number | null>(() => wsService.latency);
  const [lastConnected, setLastConnected] = useState<Date | null>(() => wsService.lastConnectedAt);

  useEffect(() => {
    const unsubscribe = wsService.onStateChange((state) => {
      setStatus(state.status);
      setLatency(state.latency);
      setLastConnected(state.lastConnectedAt);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    status,
    latency,
    lastConnected,
    isOnline: status === ConnectionState.CONNECTED,
    isOffline: status === ConnectionState.DISCONNECTED,
    isConnecting: status === ConnectionState.CONNECTING,
    isReconnecting: status === ConnectionState.RECONNECTING,
    hasError: status === ConnectionState.ERROR,
  };
}

/**
 * Hook for managing message queue
 */
export function useMessageQueue() {
  const [queuedCount, setQueuedCount] = useState(() => wsService.queuedMessageCount);
  const [messages, setMessages] = useState<QueuedMessage[]>(() => wsService.getQueuedMessages());

  useEffect(() => {
    const unsubscribe = wsService.onStateChange((state) => {
      setQueuedCount(state.queuedMessageCount);
      setMessages(wsService.getQueuedMessages());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const flush = useCallback(async () => {
    await wsService.flushMessageQueue();
  }, []);

  const clear = useCallback(() => {
    wsService.clearMessageQueue();
  }, []);

  return {
    queuedCount,
    messages,
    flush,
    clear,
    hasQueuedMessages: queuedCount > 0,
  };
}

// Re-export types and enums for convenience
export { ConnectionState };
export type { WebSocketEventType, WebSocketEventHandler, QueuedMessage };

export default useWebSocket;
