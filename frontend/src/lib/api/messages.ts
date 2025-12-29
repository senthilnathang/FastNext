/**
 * Messages API Client
 * Handles message CRUD operations and related functionality
 */

import { apiClient } from "./client";

// Types
export type MessageType = "comment" | "notification" | "system" | "email" | "internal_note" | "activity";
export type MessageLevel = "info" | "success" | "warning" | "error";

export interface Message {
  id: number;
  message_type: MessageType;
  level: MessageLevel;
  subject: string | null;
  body: string;
  body_html: string | null;
  model_name: string | null;
  record_id: number | null;
  parent_id: number | null;
  author_id: number;
  is_pinned: boolean;
  is_read: boolean;
  starred: boolean;
  created_at: string;
  updated_at: string | null;
  author?: {
    id: number;
    username: string;
    full_name: string;
    avatar_url?: string;
  };
  replies?: Message[];
  reactions?: MessageReaction[];
  mentions?: Mention[];
  attachments?: Attachment[];
}

export interface MessageReaction {
  id: number;
  message_id: number;
  user_id: number;
  emoji: string;
  created_at: string;
  user?: {
    id: number;
    username: string;
    full_name: string;
  };
}

export interface Mention {
  id: number;
  message_id: number;
  mentioned_user_id: number;
  start_index: number;
  end_index: number;
  is_read: boolean;
  read_at: string | null;
  mentioned_user?: {
    id: number;
    username: string;
    full_name: string;
  };
}

export interface Attachment {
  id: number;
  filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

export interface MessageListParams {
  model_name?: string;
  record_id?: number;
  message_type?: MessageType;
  author_id?: number;
  parent_id?: number;
  is_read?: boolean;
  starred?: boolean;
  search?: string;
  skip?: number;
  limit?: number;
}

export interface CreateMessageData {
  message_type?: MessageType;
  level?: MessageLevel;
  subject?: string;
  body: string;
  body_html?: string;
  model_name?: string;
  record_id?: number;
  parent_id?: number;
  is_pinned?: boolean;
  mention_user_ids?: number[];
}

export interface UpdateMessageData {
  subject?: string;
  body?: string;
  body_html?: string;
  is_pinned?: boolean;
  is_read?: boolean;
  starred?: boolean;
}

export interface PaginatedMessages {
  items: Message[];
  total: number;
  skip: number;
  limit: number;
}

// API Functions
export const messagesApi = {
  /**
   * List messages with optional filters
   */
  list: (params?: MessageListParams): Promise<PaginatedMessages> =>
    apiClient.get("/api/v1/messages", params),

  /**
   * Get a single message by ID
   */
  get: (id: number): Promise<Message> =>
    apiClient.get(`/api/v1/messages/${id}`),

  /**
   * Create a new message
   */
  create: (data: CreateMessageData): Promise<Message> =>
    apiClient.post("/api/v1/messages", data),

  /**
   * Update a message
   */
  update: (id: number, data: UpdateMessageData): Promise<Message> =>
    apiClient.patch(`/api/v1/messages/${id}`, data),

  /**
   * Delete a message
   */
  delete: (id: number): Promise<void> =>
    apiClient.delete(`/api/v1/messages/${id}`),

  /**
   * Get thread (message with all replies)
   */
  getThread: (id: number): Promise<Message> =>
    apiClient.get(`/api/v1/messages/${id}/thread`),

  /**
   * Get messages for a specific record
   */
  getForRecord: (modelName: string, recordId: number, params?: { limit?: number; skip?: number }): Promise<PaginatedMessages> =>
    apiClient.get(`/api/v1/messages/record/${modelName}/${recordId}`, params),

  /**
   * Mark message as read
   */
  markRead: (id: number): Promise<Message> =>
    apiClient.post(`/api/v1/messages/${id}/read`),

  /**
   * Mark message as unread
   */
  markUnread: (id: number): Promise<Message> =>
    apiClient.post(`/api/v1/messages/${id}/unread`),

  /**
   * Toggle star on message
   */
  toggleStar: (id: number): Promise<Message> =>
    apiClient.post(`/api/v1/messages/${id}/star`),

  /**
   * Pin/unpin a message
   */
  togglePin: (id: number): Promise<Message> =>
    apiClient.post(`/api/v1/messages/${id}/pin`),

  // Reactions
  reactions: {
    /**
     * Add reaction to message
     */
    add: (messageId: number, emoji: string): Promise<MessageReaction> =>
      apiClient.post(`/api/v1/messages/${messageId}/reactions`, { emoji }),

    /**
     * Remove reaction from message
     */
    remove: (messageId: number, emoji: string): Promise<void> =>
      apiClient.delete(`/api/v1/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`),

    /**
     * Get reactions for a message
     */
    list: (messageId: number): Promise<MessageReaction[]> =>
      apiClient.get(`/api/v1/messages/${messageId}/reactions`),
  },

  // Mentions
  mentions: {
    /**
     * Get my mentions
     */
    getMine: (params?: { is_read?: boolean; skip?: number; limit?: number }): Promise<Mention[]> =>
      apiClient.get("/api/v1/mentions/me", params),

    /**
     * Mark mention as read
     */
    markRead: (id: number): Promise<Mention> =>
      apiClient.post(`/api/v1/mentions/${id}/read`),

    /**
     * Get unread mentions count
     */
    getUnreadCount: (): Promise<{ count: number }> =>
      apiClient.get("/api/v1/mentions/unread/count"),
  },
};

export default messagesApi;
