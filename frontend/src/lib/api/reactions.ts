/**
 * Reactions API Client
 * Matches backend API schema
 */

import { apiClient } from "./client";

// Types matching backend

export interface UserInfo {
  id: number;
  full_name?: string | null;
}

export interface Reaction {
  id: number;
  message_id: number;
  user_id: number;
  emoji: string;
  created_at: string;
  user?: UserInfo | null;
}

export interface ReactionSummaryItem {
  emoji: string;
  count: number;
  users: UserInfo[];
  user_reacted: boolean;
}

export interface ReactionSummary {
  message_id: number;
  reactions: ReactionSummaryItem[];
  total_count: number;
}

export interface ToggleReactionResponse {
  action: string; // 'added' or 'removed'
  emoji: string;
  reaction?: Reaction | null;
}

// API Functions
export const reactionsApi = {
  /**
   * Add a reaction to a message (via path param)
   * Returns existing reaction if already reacted with this emoji
   */
  add: (messageId: number, emoji: string): Promise<Reaction> =>
    apiClient.post(`/api/v1/messages/${messageId}/reactions/${emoji}`, {}),

  /**
   * Remove a reaction from a message
   */
  remove: (messageId: number, emoji: string): Promise<{ message: string }> =>
    apiClient.delete(`/api/v1/messages/${messageId}/reactions/${emoji}`),

  /**
   * Toggle a reaction on a message (via request body)
   * Adds if not exists, removes if exists
   */
  toggle: (messageId: number, emoji: string): Promise<ToggleReactionResponse> =>
    apiClient.post(`/api/v1/messages/${messageId}/reactions`, { emoji }),

  /**
   * Get reaction summary for a message
   */
  getSummary: (messageId: number): Promise<ReactionSummary> =>
    apiClient.get(`/api/v1/messages/${messageId}/reactions`),
};

export default reactionsApi;
