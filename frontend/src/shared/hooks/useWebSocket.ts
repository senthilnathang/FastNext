'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  wsService,
  WebSocketEventHandler,
  WebSocketEventType,
  WebSocketState,
} from '@/shared/services/websocket';

export interface UseWebSocketOptions {
  /** Auto-connect on mount */
  autoConnect?: boolean;
  /** Token for authentication */
  token?: string;
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
  /** Connect to WebSocket server */
  connect: (token?: string) => Promise<void>;
  /** Disconnect from WebSocket server */
  disconnect: () => void;
  /** Send a message */
  send: <T = unknown>(type: string, data?: T) => boolean;
  /** Send typing start indicator */
  sendTypingStart: (recipientId: number, context?: string) => boolean;
  /** Send typing stop indicator */
  sendTypingStop: (recipientId: number) => boolean;
  /** Send read receipt */
  sendReadReceipt: (messageIds: number[]) => boolean;
}

/**
 * React hook for WebSocket connection management
 */
export function useWebSocket(
  options: UseWebSocketOptions = {},
): UseWebSocketReturn {
  const { autoConnect = false, token } = options;

  const [state, setState] = useState<WebSocketState>(() => wsService.state);

  useEffect(() => {
    // Subscribe to state changes
    const unsubscribe = wsService.onStateChange((newState) => {
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

  const send = useCallback(<T = unknown>(type: string, data?: T) => {
    return wsService.send(type, data);
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

  return {
    state,
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    isReconnecting: state.isReconnecting,
    lastError: state.lastError,
    connect,
    disconnect,
    send,
    sendTypingStart,
    sendTypingStop,
    sendReadReceipt,
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

export default useWebSocket;
