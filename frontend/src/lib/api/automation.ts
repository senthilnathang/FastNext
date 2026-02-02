/**
 * Automation API Client
 * Matches backend API schema
 */

import { apiClient } from "./client";

// Types matching backend

export type ActionType = "python_code" | "method_call" | "update_record" | "webhook";

export interface ServerAction {
  id: number;
  name: string;
  code: string;
  model_name: string;
  module_name?: string | null;
  action_type: string;
  sequence: number;
  is_active: boolean;
}

export interface CreateActionData {
  code: string;
  name: string;
  model_name: string;
  action_type?: string;
  module_name?: string | null;
  python_code?: string | null;
  method_name?: string | null;
  method_args?: unknown[];
  update_values?: Record<string, unknown>;
  webhook_url?: string | null;
  webhook_method?: string;
  webhook_payload?: Record<string, unknown>;
  sequence?: number;
}

export interface AutomationRule {
  id: number;
  name: string;
  code: string;
  model_name: string;
  module_name?: string | null;
  trigger: string;
  domain: Array<Record<string, unknown>>;
  action_id?: number | null;
  action_code?: string | null;
  sequence: number;
  is_active: boolean;
}

export interface CreateRuleData {
  code: string;
  name: string;
  model_name: string;
  trigger?: string;
  domain?: Array<Record<string, unknown>>;
  action_id?: number | null;
  action_code?: string | null;
  python_code?: string | null;
  module_name?: string | null;
  time_field?: string | null;
  time_delta?: number;
  sequence?: number;
}

export interface UpdateRuleData {
  name?: string;
  trigger?: string;
  domain?: Array<Record<string, unknown>>;
  action_id?: number | null;
  action_code?: string | null;
  python_code?: string | null;
  time_field?: string | null;
  time_delta?: number;
  sequence?: number;
  is_active?: boolean;
}

export interface ActionListParams {
  model_name?: string;
  active_only?: boolean;
  [key: string]: string | number | boolean | undefined;
}

export interface RuleListParams {
  model_name?: string;
  trigger?: string;
  active_only?: boolean;
  [key: string]: string | number | boolean | undefined;
}

export type PaginatedActions = ServerAction[];

export type PaginatedRules = AutomationRule[];

export interface TriggerResult {
  rule: string;
  status: string;
  records_count: number;
  error?: string | null;
}

// API Functions
export const automationApi = {
  actions: {
    /**
     * List all server actions
     */
    list: (params?: ActionListParams): Promise<ServerAction[]> =>
      apiClient.get("/api/v1/base/automation/actions/", params),

    /**
     * Get a server action by code
     */
    get: (code: string): Promise<ServerAction> =>
      apiClient.get(`/api/v1/base/automation/actions/${code}`),

    /**
     * Create a new server action
     */
    create: (data: CreateActionData): Promise<ServerAction> =>
      apiClient.post("/api/v1/base/automation/actions/", data),

    /**
     * Update a server action
     */
    update: (code: string, data: Partial<CreateActionData>): Promise<ServerAction> =>
      apiClient.put(`/api/v1/base/automation/actions/${code}`, data),

    /**
     * Delete a server action
     */
    delete: (code: string): Promise<{ status: string; message: string }> =>
      apiClient.delete(`/api/v1/base/automation/actions/${code}`),
  },

  rules: {
    /**
     * List all automation rules
     */
    list: (params?: RuleListParams): Promise<AutomationRule[]> =>
      apiClient.get("/api/v1/base/automation/rules/", params),

    /**
     * Get an automation rule by code
     */
    get: (code: string): Promise<AutomationRule> =>
      apiClient.get(`/api/v1/base/automation/rules/${code}`),

    /**
     * Create a new automation rule
     */
    create: (data: CreateRuleData): Promise<AutomationRule> =>
      apiClient.post("/api/v1/base/automation/rules/", data),

    /**
     * Update an automation rule
     */
    update: (code: string, data: UpdateRuleData): Promise<AutomationRule> =>
      apiClient.put(`/api/v1/base/automation/rules/${code}`, data),

    /**
     * Delete an automation rule
     */
    delete: (code: string): Promise<{ status: string; message: string }> =>
      apiClient.delete(`/api/v1/base/automation/rules/${code}`),
  },

  /**
   * Manually trigger all time-based automation rules
   */
  triggerTimeBased: (): Promise<TriggerResult[]> =>
    apiClient.post("/api/v1/base/automation/trigger/time-based"),
};

export default automationApi;
