/**
 * WebSocket Types and Interfaces
 *
 * Comprehensive type definitions for WebSocket communication,
 * including event types, message payloads, and connection states.
 */

// ============================================================================
// Connection State Types
// ============================================================================

/**
 * Enum representing the different states of a WebSocket connection
 */
export enum ConnectionState {
  /** Initial state, not yet connected */
  DISCONNECTED = 'disconnected',
  /** Attempting to establish connection */
  CONNECTING = 'connecting',
  /** Successfully connected and ready */
  CONNECTED = 'connected',
  /** Attempting to reconnect after disconnection */
  RECONNECTING = 'reconnecting',
  /** Connection error occurred */
  ERROR = 'error',
}

/**
 * Detailed connection state information
 */
export interface WebSocketConnectionState {
  /** Current connection state */
  status: ConnectionState;
  /** Whether the WebSocket is connected */
  isConnected: boolean;
  /** Whether a connection attempt is in progress */
  isConnecting: boolean;
  /** Whether reconnection is in progress */
  isReconnecting: boolean;
  /** Last error message, if any */
  lastError: string | null;
  /** Number of reconnection attempts */
  reconnectAttempts: number;
  /** Time of last successful connection */
  lastConnectedAt: Date | null;
  /** Time of last disconnection */
  lastDisconnectedAt: Date | null;
  /** Latency in milliseconds (from ping-pong) */
  latency: number | null;
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * All supported WebSocket event types
 */
export type WebSocketEventType =
  // Connection lifecycle events
  | 'connection:established'
  | 'connection:lost'
  | 'connection:reconnecting'
  | 'connection:reconnected'
  | 'connection:error'
  // Heartbeat/ping-pong events
  | 'heartbeat'
  | 'ping'
  | 'pong'
  // Error events
  | 'error'
  | 'error:auth'
  | 'error:rate_limit'
  | 'error:validation'
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
  | 'message:delivered'
  // Typing events
  | 'typing:start'
  | 'typing:stop'
  // Read receipts
  | 'read:receipt'
  // User presence
  | 'user:online'
  | 'user:offline'
  | 'user:away'
  | 'user:busy'
  // Label events
  | 'label:created'
  | 'label:updated'
  | 'label:deleted'
  // Notification events
  | 'notification:new'
  | 'notification:updated'
  | 'notification:read'
  | 'notification:dismissed'
  // Activity events
  | 'activity:new'
  // Data sync events
  | 'sync:request'
  | 'sync:response'
  | 'sync:complete'
  // Custom/generic events
  | 'custom';

/**
 * Event categories for easier filtering
 */
export enum WebSocketEventCategory {
  CONNECTION = 'connection',
  HEARTBEAT = 'heartbeat',
  ERROR = 'error',
  INBOX = 'inbox',
  MESSAGE = 'message',
  TYPING = 'typing',
  READ_RECEIPT = 'read_receipt',
  USER_PRESENCE = 'user_presence',
  LABEL = 'label',
  NOTIFICATION = 'notification',
  ACTIVITY = 'activity',
  SYNC = 'sync',
  CUSTOM = 'custom',
}

// ============================================================================
// Message Payload Types
// ============================================================================

/**
 * Base WebSocket message structure
 */
export interface WebSocketMessage<T = unknown> {
  /** Message type identifier */
  type: WebSocketEventType | string;
  /** Message payload data */
  data: T;
  /** ISO timestamp of when the message was sent */
  timestamp?: string;
  /** Unique message ID for deduplication */
  messageId?: string;
  /** Correlation ID for request-response patterns */
  correlationId?: string;
}

/**
 * Outgoing message structure (client to server)
 */
export interface WebSocketOutgoingMessage<T = unknown> {
  type: string;
  data?: T;
  /** Optional request ID for tracking responses */
  requestId?: string;
}

/**
 * Queued message for offline storage
 */
export interface QueuedMessage<T = unknown> {
  /** Unique ID for the queued message */
  id: string;
  /** The message to be sent */
  message: WebSocketOutgoingMessage<T>;
  /** When the message was queued */
  queuedAt: Date;
  /** Number of send attempts */
  attempts: number;
  /** Priority (higher = more important) */
  priority: number;
  /** Optional expiration time */
  expiresAt?: Date;
}

// ============================================================================
// Specific Event Payloads
// ============================================================================

/**
 * Connection established payload
 */
export interface ConnectionEstablishedPayload {
  userId: number;
  sessionId: string;
  serverTime: string;
}

/**
 * Error payload
 */
export interface ErrorPayload {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Typing indicator payload
 */
export interface TypingPayload {
  userId: number;
  recipientId: number;
  context?: string;
  timestamp: string;
}

/**
 * User presence payload
 */
export interface UserPresencePayload {
  userId: number;
  status: 'online' | 'offline' | 'away' | 'busy';
  lastSeen?: string;
}

/**
 * Message payload
 */
export interface MessagePayload {
  id: number;
  senderId: number;
  recipientId?: number;
  channelId?: number;
  content: string;
  attachments?: AttachmentPayload[];
  replyToId?: number;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Attachment payload
 */
export interface AttachmentPayload {
  id: number;
  type: 'image' | 'video' | 'audio' | 'file';
  url: string;
  name: string;
  size: number;
  mimeType: string;
  thumbnail?: string;
}

/**
 * Notification payload
 */
export interface NotificationPayload {
  id: number;
  type: string;
  title: string;
  body: string;
  icon?: string;
  data?: Record<string, unknown>;
  actions?: NotificationAction[];
  createdAt: string;
  readAt?: string;
}

/**
 * Notification action
 */
export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

/**
 * Read receipt payload
 */
export interface ReadReceiptPayload {
  messageIds: number[];
  readBy: number;
  readAt: string;
}

/**
 * Reaction payload
 */
export interface ReactionPayload {
  messageId: number;
  userId: number;
  reaction: string;
  action: 'add' | 'remove';
}

/**
 * Sync request payload
 */
export interface SyncRequestPayload {
  since?: string;
  types?: string[];
}

/**
 * Sync response payload
 */
export interface SyncResponsePayload {
  messages?: MessagePayload[];
  notifications?: NotificationPayload[];
  presence?: UserPresencePayload[];
  lastSyncTime: string;
}

// ============================================================================
// Handler Types
// ============================================================================

/**
 * Event handler function type
 */
export type WebSocketEventHandler<T = unknown> = (
  data: T,
  message: WebSocketMessage<T>,
) => void;

/**
 * State change handler function type
 */
export type WebSocketStateChangeHandler = (
  state: WebSocketConnectionState,
) => void;

/**
 * Error handler function type
 */
export type WebSocketErrorHandler = (error: ErrorPayload) => void;

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * WebSocket connection options
 */
export interface WebSocketOptions {
  /** Base URL for WebSocket connection (defaults to current host) */
  baseUrl?: string;
  /** Authentication token */
  token?: string;
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
  /** Pong timeout in ms (how long to wait for pong response) */
  pongTimeout?: number;
  /** Enable message queue for offline messages */
  enableMessageQueue?: boolean;
  /** Maximum queue size */
  maxQueueSize?: number;
  /** Queue message expiration time in ms */
  queueMessageTTL?: number;
  /** Debug mode for console logging */
  debug?: boolean;
  /** Auto-connect on initialization */
  autoConnect?: boolean;
}

/**
 * Default WebSocket options
 */
export const DEFAULT_WEBSOCKET_OPTIONS: Required<WebSocketOptions> = {
  baseUrl: '',
  token: '',
  maxReconnectAttempts: -1, // Infinite retries
  reconnectDelay: 1000,
  maxReconnectDelay: 30000,
  reconnectBackoffMultiplier: 2,
  pingInterval: 30000,
  pongTimeout: 5000,
  enableMessageQueue: true,
  maxQueueSize: 100,
  queueMessageTTL: 300000, // 5 minutes
  debug: false,
  autoConnect: false,
};

// ============================================================================
// Event Binding Types
// ============================================================================

/**
 * Event binding configuration
 */
export interface EventBinding<T = unknown> {
  /** Event type to listen for */
  eventType: WebSocketEventType | '*';
  /** Handler function */
  handler: WebSocketEventHandler<T>;
  /** Whether this binding should only fire once */
  once?: boolean;
  /** Priority for handler execution order (higher = earlier) */
  priority?: number;
}

/**
 * Event unsubscribe function
 */
export type Unsubscribe = () => void;

// ============================================================================
// Hook Return Types
// ============================================================================

/**
 * useWebSocket hook return type
 */
export interface UseWebSocketReturn {
  /** Current connection state */
  state: WebSocketConnectionState;
  /** Whether WebSocket is connected */
  isConnected: boolean;
  /** Whether WebSocket is connecting */
  isConnecting: boolean;
  /** Whether WebSocket is reconnecting */
  isReconnecting: boolean;
  /** Last error message */
  lastError: string | null;
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
}
