/**
 * Push Notifications API Client
 * Matches backend API schema
 */

import { apiClient } from "./client";

// Types matching backend

export interface PushSubscription {
  id: number;
  endpoint: string;
  device_name?: string | null;
  is_active: boolean;
  created_at: string;
  last_used_at?: string | null;
}

export interface PushSubscribeRequest {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent?: string | null;
  device_name?: string | null;
}

export interface VapidKeyResponse {
  public_key?: string | null;
  enabled: boolean;
}

export interface TestPushRequest {
  title?: string;
  body?: string;
}

export interface TestPushResponse {
  message: string;
  sent_count: number;
}

// API Functions
export const pushApi = {
  /**
   * Get the VAPID public key for client-side subscription
   */
  getVapidKey: (): Promise<VapidKeyResponse> =>
    apiClient.get("/api/v1/push/vapid-key"),

  /**
   * Subscribe to push notifications
   */
  subscribe: (data: PushSubscribeRequest): Promise<PushSubscription> =>
    apiClient.post("/api/v1/push/subscribe", data),

  /**
   * Unsubscribe from push notifications
   */
  unsubscribe: (endpoint: string): Promise<{ message: string }> =>
    apiClient.post(`/api/v1/push/unsubscribe?endpoint=${encodeURIComponent(endpoint)}`),

  /**
   * List all push subscriptions for the current user
   */
  listSubscriptions: (): Promise<PushSubscription[]> =>
    apiClient.get("/api/v1/push/subscriptions"),

  /**
   * Delete a specific push subscription
   */
  deleteSubscription: (subscriptionId: number): Promise<{ message: string }> =>
    apiClient.delete(`/api/v1/push/subscriptions/${subscriptionId}`),

  /**
   * Send a test push notification to all user's subscriptions
   */
  test: (data?: TestPushRequest): Promise<TestPushResponse> =>
    apiClient.post("/api/v1/push/test", data || {}),
};

export default pushApi;
