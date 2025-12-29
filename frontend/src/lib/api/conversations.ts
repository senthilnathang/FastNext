/**
 * Conversations API Client
 * Handles conversation/chat CRUD operations
 */

import { apiClient } from "./client";
import type { Message } from "./messages";

// Types
export type ConversationType = "direct" | "group" | "channel";

export interface Conversation {
  id: number;
  name: string | null;
  description: string | null;
  conversation_type: ConversationType;
  is_archived: boolean;
  is_muted: boolean;
  avatar_url: string | null;
  created_by_id: number;
  created_at: string;
  updated_at: string | null;
  last_message_at: string | null;
  message_count: number;
  participants?: ConversationParticipant[];
  last_message?: Message;
  unread_count?: number;
}

export interface ConversationParticipant {
  id: number;
  conversation_id: number;
  user_id: number;
  role: "owner" | "admin" | "member";
  is_muted: boolean;
  last_read_at: string | null;
  joined_at: string;
  user?: {
    id: number;
    username: string;
    full_name: string;
    avatar_url?: string;
    is_online?: boolean;
  };
}

export interface ConversationMessage {
  id: number;
  conversation_id: number;
  message_id: number;
  message?: Message;
  created_at: string;
}

export interface ConversationListParams {
  conversation_type?: ConversationType;
  is_archived?: boolean;
  search?: string;
  skip?: number;
  limit?: number;
}

export interface CreateConversationData {
  name?: string;
  description?: string;
  conversation_type: ConversationType;
  participant_ids: number[];
  avatar_url?: string;
}

export interface UpdateConversationData {
  name?: string;
  description?: string;
  is_archived?: boolean;
  is_muted?: boolean;
  avatar_url?: string;
}

export interface SendMessageData {
  body: string;
  body_html?: string;
  parent_id?: number;
  mention_user_ids?: number[];
}

export interface PaginatedConversations {
  items: Conversation[];
  total: number;
  skip: number;
  limit: number;
}

export interface PaginatedConversationMessages {
  items: ConversationMessage[];
  total: number;
  skip: number;
  limit: number;
}

// API Functions
export const conversationsApi = {
  /**
   * List conversations for current user
   */
  list: (params?: ConversationListParams): Promise<PaginatedConversations> =>
    apiClient.get("/api/v1/conversations", params),

  /**
   * Get a single conversation by ID
   */
  get: (id: number): Promise<Conversation> =>
    apiClient.get(`/api/v1/conversations/${id}`),

  /**
   * Create a new conversation
   */
  create: (data: CreateConversationData): Promise<Conversation> =>
    apiClient.post("/api/v1/conversations", data),

  /**
   * Update a conversation
   */
  update: (id: number, data: UpdateConversationData): Promise<Conversation> =>
    apiClient.patch(`/api/v1/conversations/${id}`, data),

  /**
   * Delete a conversation
   */
  delete: (id: number): Promise<void> =>
    apiClient.delete(`/api/v1/conversations/${id}`),

  /**
   * Get or create a direct message conversation with a user
   */
  getOrCreateDirect: (userId: number): Promise<Conversation> =>
    apiClient.post("/api/v1/conversations/direct", { user_id: userId }),

  /**
   * Leave a conversation
   */
  leave: (id: number): Promise<void> =>
    apiClient.post(`/api/v1/conversations/${id}/leave`),

  /**
   * Archive a conversation
   */
  archive: (id: number): Promise<Conversation> =>
    apiClient.post(`/api/v1/conversations/${id}/archive`),

  /**
   * Unarchive a conversation
   */
  unarchive: (id: number): Promise<Conversation> =>
    apiClient.post(`/api/v1/conversations/${id}/unarchive`),

  /**
   * Mute a conversation
   */
  mute: (id: number): Promise<Conversation> =>
    apiClient.post(`/api/v1/conversations/${id}/mute`),

  /**
   * Unmute a conversation
   */
  unmute: (id: number): Promise<Conversation> =>
    apiClient.post(`/api/v1/conversations/${id}/unmute`),

  // Messages
  messages: {
    /**
     * Get messages in a conversation
     */
    list: (conversationId: number, params?: { skip?: number; limit?: number; before_id?: number }): Promise<PaginatedConversationMessages> =>
      apiClient.get(`/api/v1/conversations/${conversationId}/messages`, params),

    /**
     * Send a message to a conversation
     */
    send: (conversationId: number, data: SendMessageData): Promise<ConversationMessage> =>
      apiClient.post(`/api/v1/conversations/${conversationId}/messages`, data),

    /**
     * Mark all messages as read
     */
    markAllRead: (conversationId: number): Promise<void> =>
      apiClient.post(`/api/v1/conversations/${conversationId}/read`),
  },

  // Participants
  participants: {
    /**
     * List participants in a conversation
     */
    list: (conversationId: number): Promise<ConversationParticipant[]> =>
      apiClient.get(`/api/v1/conversations/${conversationId}/participants`),

    /**
     * Add participants to a conversation
     */
    add: (conversationId: number, userIds: number[]): Promise<ConversationParticipant[]> =>
      apiClient.post(`/api/v1/conversations/${conversationId}/participants`, { user_ids: userIds }),

    /**
     * Remove a participant from a conversation
     */
    remove: (conversationId: number, userId: number): Promise<void> =>
      apiClient.delete(`/api/v1/conversations/${conversationId}/participants/${userId}`),

    /**
     * Update participant role
     */
    updateRole: (conversationId: number, userId: number, role: "admin" | "member"): Promise<ConversationParticipant> =>
      apiClient.patch(`/api/v1/conversations/${conversationId}/participants/${userId}`, { role }),
  },

  // Typing indicators (for real-time features)
  typing: {
    /**
     * Send typing indicator
     */
    start: (conversationId: number): Promise<void> =>
      apiClient.post(`/api/v1/conversations/${conversationId}/typing`),

    /**
     * Stop typing indicator
     */
    stop: (conversationId: number): Promise<void> =>
      apiClient.delete(`/api/v1/conversations/${conversationId}/typing`),
  },

  // Stats
  stats: {
    /**
     * Get unread counts for all conversations
     */
    getUnreadCounts: (): Promise<{ [conversationId: number]: number }> =>
      apiClient.get("/api/v1/conversations/stats/unread"),

    /**
     * Get total unread count
     */
    getTotalUnread: (): Promise<{ count: number }> =>
      apiClient.get("/api/v1/conversations/stats/unread/total"),
  },
};

export default conversationsApi;
