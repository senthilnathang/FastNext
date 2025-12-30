/**
 * WebSocket service for real-time updates
 *
 * Provides connection management, automatic reconnection with exponential backoff,
 * event handling, heartbeat/ping-pong, and message queue for offline messages.
 */

import {
  ConnectionState,
  WebSocketConnectionState,
  WebSocketEventType,
  WebSocketMessage,
  WebSocketEventHandler,
  WebSocketOptions,
  QueuedMessage,
  DEFAULT_WEBSOCKET_OPTIONS,
} from '@/shared/types/websocket';

// Re-export types for backwards compatibility
export type {
  WebSocketEventType,
  WebSocketMessage,
  WebSocketEventHandler,
  WebSocketOptions,
  QueuedMessage,
};
export { ConnectionState };

export type WebSocketStateChangeHandler = (state: WebSocketState) => void;

export interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  lastError: string | null;
  reconnectAttempts: number;
  status: ConnectionState;
  latency: number | null;
  lastConnectedAt: Date | null;
  lastDisconnectedAt: Date | null;
  queuedMessageCount: number;
}

interface InternalWebSocketOptions {
  /** Base URL for WebSocket connection (defaults to current host) */
  baseUrl?: string;
  /** Reconnection attempts before giving up (-1 for infinite) */
  maxReconnectAttempts?: number;
  /** Initial reconnect delay in ms */
  reconnectDelay?: number;
  /** Maximum reconnect delay in ms */
  maxReconnectDelay?: number;
  /** Reconnection backoff multiplier */
  reconnectBackoffMultiplier?: number;
  /** Ping interval in ms */
  pingInterval?: number;
  /** Pong timeout in ms */
  pongTimeout?: number;
  /** Enable message queue for offline messages */
  enableMessageQueue?: boolean;
  /** Maximum queue size */
  maxQueueSize?: number;
  /** Queue message expiration time in ms */
  queueMessageTTL?: number;
  /** Debug mode for console logging */
  debug?: boolean;
}

const defaultOptions: Required<InternalWebSocketOptions> = {
  baseUrl: '',
  maxReconnectAttempts: -1, // Infinite retries
  reconnectDelay: 1000,
  maxReconnectDelay: 30000,
  reconnectBackoffMultiplier: 2,
  pingInterval: 30000,
  pongTimeout: 5000,
  enableMessageQueue: true,
  maxQueueSize: 100,
  queueMessageTTL: 300000, // 5 minutes
  debug: process.env.NODE_ENV === 'development',
};

class WebSocketService {
  private ws: WebSocket | null = null;
  private options: Required<InternalWebSocketOptions>;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimer: ReturnType<typeof setTimeout> | null = null;
  private eventHandlers: Map<string, Set<WebSocketEventHandler>> = new Map();
  private stateChangeHandlers: Set<WebSocketStateChangeHandler> = new Set();

  // Message queue for offline messages
  private messageQueue: QueuedMessage[] = [];
  private messageIdCounter = 0;

  // Latency tracking
  private lastPingTime: number | null = null;
  private _latency: number | null = null;

  // State
  private _state: WebSocketState = {
    isConnected: false,
    isConnecting: false,
    isReconnecting: false,
    lastError: null,
    reconnectAttempts: 0,
    status: ConnectionState.DISCONNECTED,
    latency: null,
    lastConnectedAt: null,
    lastDisconnectedAt: null,
    queuedMessageCount: 0,
  };

  constructor(options: InternalWebSocketOptions = {}) {
    this.options = { ...defaultOptions, ...options };

    // Listen for online/offline events to manage queue
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.onOnline());
      window.addEventListener('offline', () => this.onOffline());
    }
  }

  /**
   * Handle coming online - attempt to reconnect and flush queue
   */
  private onOnline(): void {
    this.log('Browser came online');
    if (!this._state.isConnected && !this._state.isConnecting) {
      this.connect().catch((error) => {
        this.log('Failed to connect after coming online', error);
      });
    }
  }

  /**
   * Handle going offline
   */
  private onOffline(): void {
    this.log('Browser went offline');
    this.updateState({
      status: ConnectionState.DISCONNECTED,
      lastError: 'Network offline',
    });
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

  get latency(): number | null {
    return this._latency;
  }

  get connectionStatus(): ConnectionState {
    return this._state.status;
  }

  get queuedMessageCount(): number {
    return this.messageQueue.length;
  }

  get lastConnectedAt(): Date | null {
    return this._state.lastConnectedAt;
  }

  get lastDisconnectedAt(): Date | null {
    return this._state.lastDisconnectedAt;
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
    // Update latency in state
    if (this._latency !== null) {
      updates.latency = this._latency;
    }
    // Update queue count in state
    updates.queuedMessageCount = this.messageQueue.length;

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
      this.updateState({
        lastError: 'No access token available',
        status: ConnectionState.ERROR,
      });
      throw new Error('No access token available');
    }

    this.updateState({
      isConnecting: true,
      lastError: null,
      status: ConnectionState.CONNECTING,
    });

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
          const wasReconnecting = this._state.isReconnecting;
          this.updateState({
            isConnected: true,
            isConnecting: false,
            isReconnecting: false,
            reconnectAttempts: 0,
            status: ConnectionState.CONNECTED,
            lastConnectedAt: new Date(),
          });
          this.reconnectAttempts = 0;
          this.startPingInterval();
          this.log('Connected successfully');

          // Emit reconnected event if this was a reconnection
          if (wasReconnecting) {
            this.emit('connection:reconnected', {}, {
              type: 'connection:reconnected',
              data: {},
              timestamp: new Date().toISOString(),
            });
          }

          // Flush queued messages
          this.flushMessageQueue();

          resolve();
        };

        this.ws.onerror = (event) => {
          clearTimeout(timeout);
          this.updateState({
            lastError: 'Connection error',
            status: ConnectionState.ERROR,
          });
          this.log('Connection error', event);
          reject(new Error('WebSocket connection error'));
        };

        this.ws.onclose = (event) => {
          clearTimeout(timeout);
          this.updateState({
            isConnected: false,
            isConnecting: false,
            status: ConnectionState.DISCONNECTED,
            lastDisconnectedAt: new Date(),
          });
          this.stopPingInterval();
          this.stopPongTimer();
          this.log(`Connection closed: ${event.code} - ${event.reason}`);

          // Emit connection lost event
          this.emit('connection:lost', { code: event.code, reason: event.reason }, {
            type: 'connection:lost',
            data: { code: event.code, reason: event.reason },
            timestamp: new Date().toISOString(),
          });

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
      this.updateState({
        isConnecting: false,
        status: ConnectionState.ERROR,
      });
      throw error;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.clearReconnectTimer();
    this.stopPingInterval();
    this.stopPongTimer();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.updateState({
      isConnected: false,
      isConnecting: false,
      isReconnecting: false,
      reconnectAttempts: 0,
      status: ConnectionState.DISCONNECTED,
      lastDisconnectedAt: new Date(),
    });
    this.reconnectAttempts = 0;
    this.log('Disconnected');
  }

  /**
   * Send a message to the server
   * @param type Message type
   * @param data Message payload
   * @param priority Priority for queued messages (higher = more important)
   * @param queueIfOffline Whether to queue message if offline (default: true)
   */
  send<T = unknown>(type: string, data?: T, priority: number = 0, queueIfOffline: boolean = true): boolean {
    const message = { type, data };

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.log('Cannot send: not connected');

      // Queue message if enabled and not a system message
      if (queueIfOffline && this.options.enableMessageQueue && !type.startsWith('ping') && !type.startsWith('pong')) {
        this.queueMessage(message, priority);
        return true; // Message was queued
      }

      return false;
    }

    this.ws.send(JSON.stringify(message));
    this.log('Sent message', message);
    return true;
  }

  /**
   * Send a ping to keep connection alive
   */
  ping(): boolean {
    this.lastPingTime = Date.now();
    const sent = this.send('ping', undefined, 0, false);
    if (sent) {
      this.startPongTimer();
    }
    return sent;
  }

  /**
   * Queue a message for later sending
   */
  private queueMessage<T = unknown>(message: { type: string; data?: T }, priority: number = 0): void {
    // Clean up expired messages first
    this.cleanupExpiredMessages();

    // Check queue size limit
    if (this.messageQueue.length >= this.options.maxQueueSize) {
      // Remove lowest priority message
      this.messageQueue.sort((a, b) => a.priority - b.priority);
      this.messageQueue.shift();
      this.log('Queue full, removed lowest priority message');
    }

    const queuedMessage: QueuedMessage = {
      id: `msg_${++this.messageIdCounter}_${Date.now()}`,
      message,
      queuedAt: new Date(),
      attempts: 0,
      priority,
      expiresAt: new Date(Date.now() + this.options.queueMessageTTL),
    };

    this.messageQueue.push(queuedMessage);
    this.updateState({}); // Trigger state update for queue count
    this.log('Message queued', queuedMessage);
  }

  /**
   * Flush queued messages
   */
  async flushMessageQueue(): Promise<void> {
    if (this.messageQueue.length === 0) {
      return;
    }

    this.log(`Flushing ${this.messageQueue.length} queued messages`);
    this.cleanupExpiredMessages();

    // Sort by priority (highest first) then by queue time (oldest first)
    const sortedQueue = [...this.messageQueue].sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.queuedAt.getTime() - b.queuedAt.getTime();
    });

    const successfulIds: string[] = [];

    for (const queuedMessage of sortedQueue) {
      if (this.ws?.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify(queuedMessage.message));
          successfulIds.push(queuedMessage.id);
          this.log('Sent queued message', queuedMessage);
        } catch (error) {
          this.log('Failed to send queued message', error);
          queuedMessage.attempts++;
        }
      } else {
        break; // Stop if connection is lost
      }
    }

    // Remove successfully sent messages
    this.messageQueue = this.messageQueue.filter(
      (msg) => !successfulIds.includes(msg.id)
    );
    this.updateState({}); // Trigger state update for queue count
  }

  /**
   * Clear all queued messages
   */
  clearMessageQueue(): void {
    this.messageQueue = [];
    this.updateState({}); // Trigger state update for queue count
    this.log('Message queue cleared');
  }

  /**
   * Get queued messages
   */
  getQueuedMessages(): QueuedMessage[] {
    return [...this.messageQueue];
  }

  /**
   * Clean up expired messages from queue
   */
  private cleanupExpiredMessages(): void {
    const now = Date.now();
    const initialCount = this.messageQueue.length;

    this.messageQueue = this.messageQueue.filter((msg) => {
      if (msg.expiresAt && msg.expiresAt.getTime() < now) {
        return false;
      }
      return true;
    });

    const removed = initialCount - this.messageQueue.length;
    if (removed > 0) {
      this.log(`Removed ${removed} expired messages from queue`);
    }
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

      // Handle pong response - calculate latency
      if (message.type === 'pong' || message.type === 'heartbeat') {
        this.stopPongTimer();
        if (this.lastPingTime !== null) {
          this._latency = Date.now() - this.lastPingTime;
          this.updateState({ latency: this._latency });
          this.log(`Latency: ${this._latency}ms`);
        }
        // Still emit pong event for handlers that want to listen
        this.emit(message.type, message.data, message);
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

  /**
   * Start pong timeout timer
   */
  private startPongTimer(): void {
    this.stopPongTimer();
    this.pongTimer = setTimeout(() => {
      this.log('Pong timeout - connection may be dead');
      // Connection may be dead, trigger reconnect
      if (this.ws) {
        this.ws.close(4000, 'Pong timeout');
      }
    }, this.options.pongTimeout);
  }

  /**
   * Stop pong timeout timer
   */
  private stopPongTimer(): void {
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (
      this.options.maxReconnectAttempts >= 0 &&
      this.reconnectAttempts >= this.options.maxReconnectAttempts
    ) {
      this.updateState({
        lastError: 'Max reconnection attempts reached',
        status: ConnectionState.ERROR,
      });
      this.log('Max reconnection attempts reached');
      return;
    }

    this.clearReconnectTimer();

    // Exponential backoff with jitter
    const baseDelay = this.options.reconnectDelay * Math.pow(this.options.reconnectBackoffMultiplier, this.reconnectAttempts);
    const jitter = Math.random() * 0.3 * baseDelay; // Add up to 30% jitter
    const delay = Math.min(baseDelay + jitter, this.options.maxReconnectDelay);

    this.reconnectAttempts++;
    this.updateState({
      isReconnecting: true,
      reconnectAttempts: this.reconnectAttempts,
      status: ConnectionState.RECONNECTING,
    });

    // Emit reconnecting event
    this.emit('connection:reconnecting', { attempt: this.reconnectAttempts, delay }, {
      type: 'connection:reconnecting',
      data: { attempt: this.reconnectAttempts, delay },
      timestamp: new Date().toISOString(),
    });

    this.log(
      `Scheduling reconnect in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts})`,
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
