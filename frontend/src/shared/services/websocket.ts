/**
 * WebSocket service for real-time updates
 *
 * Provides connection management, automatic reconnection,
 * and event handling for real-time inbox updates.
 */

export type WebSocketEventType =
  // Connection events
  | 'connection:established'
  | 'heartbeat'
  | 'pong'
  | 'error'
  // Inbox events
  | 'inbox:new'
  | 'inbox:updated'
  | 'inbox:deleted'
  | 'inbox:bulk_read'
  | 'inbox:bulk_archive'
  // Message events
  | 'message:new'
  | 'message:updated'
  | 'message:deleted'
  | 'message:reaction'
  // Typing events
  | 'typing:start'
  | 'typing:stop'
  // Read receipts
  | 'read:receipt'
  // User presence
  | 'user:online'
  | 'user:offline'
  // Label events
  | 'label:created'
  | 'label:updated'
  | 'label:deleted'
  // Notification events
  | 'notification:new'
  | 'notification:updated'
  // Activity events
  | 'activity:new';

export interface WebSocketMessage<T = unknown> {
  type: WebSocketEventType;
  data: T;
  timestamp?: string;
}

export type WebSocketEventHandler<T = unknown> = (
  data: T,
  message: WebSocketMessage<T>,
) => void;

export type WebSocketStateChangeHandler = (state: WebSocketState) => void;

export interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  lastError: string | null;
  reconnectAttempts: number;
}

export interface WebSocketOptions {
  /** Base URL for WebSocket connection (defaults to current host) */
  baseUrl?: string;
  /** Reconnection attempts before giving up (-1 for infinite) */
  maxReconnectAttempts?: number;
  /** Initial reconnect delay in ms */
  reconnectDelay?: number;
  /** Maximum reconnect delay in ms */
  maxReconnectDelay?: number;
  /** Ping interval in ms */
  pingInterval?: number;
  /** Debug mode for console logging */
  debug?: boolean;
}

const defaultOptions: Required<WebSocketOptions> = {
  baseUrl: '',
  maxReconnectAttempts: -1, // Infinite retries
  reconnectDelay: 1000,
  maxReconnectDelay: 30000,
  pingInterval: 30000,
  debug: process.env.NODE_ENV === 'development',
};

class WebSocketService {
  private ws: WebSocket | null = null;
  private options: Required<WebSocketOptions>;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private eventHandlers: Map<string, Set<WebSocketEventHandler>> = new Map();
  private stateChangeHandlers: Set<WebSocketStateChangeHandler> = new Set();

  // State
  private _state: WebSocketState = {
    isConnected: false,
    isConnecting: false,
    isReconnecting: false,
    lastError: null,
    reconnectAttempts: 0,
  };

  constructor(options: WebSocketOptions = {}) {
    this.options = { ...defaultOptions, ...options };
  }

  // Public getters
  get state(): WebSocketState {
    return { ...this._state };
  }

  get isConnected(): boolean {
    return this._state.isConnected;
  }

  get isConnecting(): boolean {
    return this._state.isConnecting;
  }

  get isReconnecting(): boolean {
    return this._state.isReconnecting;
  }

  get lastError(): string | null {
    return this._state.lastError;
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(handler: WebSocketStateChangeHandler): () => void {
    this.stateChangeHandlers.add(handler);
    return () => {
      this.stateChangeHandlers.delete(handler);
    };
  }

  private updateState(updates: Partial<WebSocketState>): void {
    this._state = { ...this._state, ...updates };
    this.stateChangeHandlers.forEach((handler) => {
      try {
        handler(this._state);
      } catch (error) {
        console.error('Error in state change handler:', error);
      }
    });
  }

  /**
   * Connect to WebSocket server
   */
  async connect(token?: string): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.log('Already connected');
      return;
    }

    if (this._state.isConnecting) {
      this.log('Connection already in progress');
      return;
    }

    // Try to get token from localStorage if not provided
    const accessToken = token || (typeof window !== 'undefined'
      ? localStorage.getItem('accessToken')
      : null);

    if (!accessToken) {
      this.updateState({ lastError: 'No access token available' });
      throw new Error('No access token available');
    }

    this.updateState({ isConnecting: true, lastError: null });

    try {
      const baseUrl = this.options.baseUrl || this.getDefaultBaseUrl();
      const wsUrl = `${baseUrl}/api/v1/ws?token=${encodeURIComponent(accessToken)}`;

      this.log(`Connecting to ${wsUrl}`);

      this.ws = new WebSocket(wsUrl);

      await new Promise<void>((resolve, reject) => {
        if (!this.ws) {
          reject(new Error('WebSocket not initialized'));
          return;
        }

        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        this.ws.onopen = () => {
          clearTimeout(timeout);
          this.updateState({
            isConnected: true,
            isConnecting: false,
            isReconnecting: false,
            reconnectAttempts: 0,
          });
          this.reconnectAttempts = 0;
          this.startPingInterval();
          this.log('Connected successfully');
          resolve();
        };

        this.ws.onerror = (event) => {
          clearTimeout(timeout);
          this.updateState({ lastError: 'Connection error' });
          this.log('Connection error', event);
          reject(new Error('WebSocket connection error'));
        };

        this.ws.onclose = (event) => {
          clearTimeout(timeout);
          this.updateState({
            isConnected: false,
            isConnecting: false,
          });
          this.stopPingInterval();
          this.log(`Connection closed: ${event.code} - ${event.reason}`);

          // Attempt reconnection if not a normal close
          if (event.code !== 1000 && event.code !== 1008) {
            this.scheduleReconnect();
          }
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };
      });
    } catch (error) {
      this.updateState({ isConnecting: false });
      throw error;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.clearReconnectTimer();
    this.stopPingInterval();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.updateState({
      isConnected: false,
      isConnecting: false,
      isReconnecting: false,
      reconnectAttempts: 0,
    });
    this.reconnectAttempts = 0;
    this.log('Disconnected');
  }

  /**
   * Send a message to the server
   */
  send<T = unknown>(type: string, data?: T): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.log('Cannot send: not connected');
      return false;
    }

    const message = { type, data };
    this.ws.send(JSON.stringify(message));
    this.log('Sent message', message);
    return true;
  }

  /**
   * Send a ping to keep connection alive
   */
  ping(): boolean {
    return this.send('ping');
  }

  /**
   * Register an event handler
   */
  on<T = unknown>(
    eventType: WebSocketEventType | '*',
    handler: WebSocketEventHandler<T>,
  ): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }

    const handlers = this.eventHandlers.get(eventType)!;
    handlers.add(handler as WebSocketEventHandler);

    // Return unsubscribe function
    return () => {
      handlers.delete(handler as WebSocketEventHandler);
    };
  }

  /**
   * Remove an event handler
   */
  off<T = unknown>(
    eventType: WebSocketEventType | '*',
    handler: WebSocketEventHandler<T>,
  ): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.delete(handler as WebSocketEventHandler);
    }
  }

  /**
   * Remove all handlers for an event type
   */
  offAll(eventType: WebSocketEventType | '*'): void {
    this.eventHandlers.delete(eventType);
  }

  /**
   * Send typing start indicator
   */
  sendTypingStart(recipientId: number, context?: string): boolean {
    return this.send('typing:start', { recipient_id: recipientId, context });
  }

  /**
   * Send typing stop indicator
   */
  sendTypingStop(recipientId: number): boolean {
    return this.send('typing:stop', { recipient_id: recipientId });
  }

  /**
   * Mark messages as read
   */
  sendReadReceipt(messageIds: number[]): boolean {
    return this.send('read:receipt', { message_ids: messageIds });
  }

  // Private methods

  private getDefaultBaseUrl(): string {
    if (typeof window === 'undefined') {
      return '';
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      this.log('Received message', message);

      // Handle pong response
      if (message.type === 'pong' || message.type === 'heartbeat') {
        return;
      }

      // Emit to specific handlers
      this.emit(message.type, message.data, message);

      // Emit to wildcard handlers
      this.emit('*', message.data, message);
    } catch (error) {
      this.log('Failed to parse message', error);
    }
  }

  private emit<T = unknown>(
    eventType: string,
    data: T,
    message: WebSocketMessage<T>,
  ): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          (handler as WebSocketEventHandler<T>)(data, message);
        } catch (error) {
          console.error(`Error in WebSocket handler for ${eventType}:`, error);
        }
      });
    }
  }

  private startPingInterval(): void {
    this.stopPingInterval();
    this.pingTimer = setInterval(() => {
      this.ping();
    }, this.options.pingInterval);
  }

  private stopPingInterval(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (
      this.options.maxReconnectAttempts >= 0 &&
      this.reconnectAttempts >= this.options.maxReconnectAttempts
    ) {
      this.updateState({ lastError: 'Max reconnection attempts reached' });
      this.log('Max reconnection attempts reached');
      return;
    }

    this.clearReconnectTimer();

    const delay = Math.min(
      this.options.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.options.maxReconnectDelay,
    );

    this.reconnectAttempts++;
    this.updateState({
      isReconnecting: true,
      reconnectAttempts: this.reconnectAttempts,
    });
    this.log(
      `Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`,
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch((error) => {
        this.log('Reconnect failed', error);
      });
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private log(message: string, data?: unknown): void {
    if (this.options.debug) {
      if (data) {
        console.log(`[WebSocket] ${message}`, data);
      } else {
        console.log(`[WebSocket] ${message}`);
      }
    }
  }
}

// Create singleton instance
export const wsService = new WebSocketService();

// Export class for testing or creating additional instances
export { WebSocketService };
