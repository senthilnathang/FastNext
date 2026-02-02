/**
 * Workflows API Client
 * Matches backend API schema
 */

import { apiClient } from "./client";

// Types matching backend

export interface WorkflowState {
  code: string;
  name: string;
  sequence?: number;
  is_start?: boolean;
  is_end?: boolean;
  color?: string | null;
}

export interface Workflow {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  module_name?: string | null;
  model_name: string;
  state_field: string;
  states: WorkflowState[];
  default_state?: string | null;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface WorkflowTransition {
  id: number;
  workflow_id: number;
  name: string;
  code: string;
  from_state: string;
  to_state: string;
  condition_domain: unknown[];
  condition_code?: string | null;
  required_groups: string[];
  action_id?: number | null;
  python_code?: string | null;
  button_name?: string | null;
  button_class: string;
  icon?: string | null;
  confirm_message?: string | null;
  sequence: number;
  is_active: boolean;
  created_at?: string | null;
}

export interface WorkflowListParams {
  module_name?: string;
  model_name?: string;
  active_only?: boolean;
  [key: string]: string | number | boolean | undefined;
}

export type PaginatedWorkflows = Workflow[];

export interface CreateWorkflowData {
  name: string;
  code: string;
  model_name: string;
  states: WorkflowState[];
  state_field?: string;
  default_state?: string | null;
  module_name?: string | null;
  description?: string | null;
}

export interface UpdateWorkflowData {
  name?: string;
  description?: string | null;
  states?: WorkflowState[];
  default_state?: string | null;
  is_active?: boolean;
}

export interface CreateTransitionData {
  name: string;
  code: string;
  from_state: string;
  to_state: string;
  condition_domain?: unknown[];
  condition_code?: string | null;
  required_groups?: string[];
  action_id?: number | null;
  python_code?: string | null;
  button_name?: string | null;
  button_class?: string;
  icon?: string | null;
  confirm_message?: string | null;
  sequence?: number;
}

export interface AvailableTransition {
  id: number;
  code: string;
  name: string;
  from_state: string;
  to_state: string;
  button_name?: string | null;
  button_class: string;
  icon?: string | null;
  confirm_message?: string | null;
}

export interface ExecuteTransitionRequest {
  transition_id: number;
  model_name: string;
  res_id: number;
  note?: string | null;
  context?: Record<string, unknown>;
}

export interface WorkflowActivity {
  id: number;
  workflow_id?: number | null;
  transition_id?: number | null;
  model_name: string;
  res_id: number;
  from_state: string;
  to_state: string;
  transition_code?: string | null;
  user_id?: number | null;
  user_name?: string | null;
  note?: string | null;
  is_automatic: boolean;
  created_at?: string | null;
}

export interface VisualizationData {
  workflow_code: string;
  workflow_name: string;
  model_name: string;
  nodes: Array<Record<string, unknown>>;
  edges: Array<Record<string, unknown>>;
}

// API Functions
export const workflowsApi = {
  /**
   * List all workflow definitions
   */
  list: (params?: WorkflowListParams): Promise<Workflow[]> =>
    apiClient.get("/api/v1/base/workflows/", params),

  /**
   * Get a workflow by code
   */
  get: (code: string): Promise<Workflow> =>
    apiClient.get(`/api/v1/base/workflows/${code}`),

  /**
   * Create a new workflow
   */
  create: (data: CreateWorkflowData): Promise<Workflow> =>
    apiClient.post("/api/v1/base/workflows/", data),

  /**
   * Update a workflow
   */
  update: (code: string, data: UpdateWorkflowData): Promise<Workflow> =>
    apiClient.put(`/api/v1/base/workflows/${code}`, data),

  /**
   * Delete a workflow
   */
  delete: (code: string): Promise<void> =>
    apiClient.delete(`/api/v1/base/workflows/${code}`),

  /**
   * List transitions for a workflow
   */
  listTransitions: (code: string, params?: { from_state?: string; active_only?: boolean }): Promise<WorkflowTransition[]> =>
    apiClient.get(`/api/v1/base/workflows/${code}/transitions`, params),

  /**
   * Add a transition to a workflow
   */
  addTransition: (code: string, data: CreateTransitionData): Promise<WorkflowTransition> =>
    apiClient.post(`/api/v1/base/workflows/${code}/transitions`, data),

  /**
   * Update a transition
   */
  updateTransition: (transitionId: number, data: Partial<CreateTransitionData>): Promise<WorkflowTransition> =>
    apiClient.put(`/api/v1/base/workflows/transitions/${transitionId}`, data),

  /**
   * Delete a transition
   */
  deleteTransition: (transitionId: number): Promise<void> =>
    apiClient.delete(`/api/v1/base/workflows/transitions/${transitionId}`),

  /**
   * Get workflow state for a specific model record
   */
  getModelState: (modelName: string, resId: number): Promise<Record<string, unknown>> =>
    apiClient.get(`/api/v1/base/workflows/state/${modelName}/${resId}`),

  /**
   * Get available transitions for a record
   */
  getAvailableTransitions: (modelName: string, resId: number): Promise<AvailableTransition[]> =>
    apiClient.get(`/api/v1/base/workflows/state/${modelName}/${resId}/available`),

  /**
   * Get state change history for a record
   */
  getHistory: (modelName: string, resId: number): Promise<Array<Record<string, unknown>>> =>
    apiClient.get(`/api/v1/base/workflows/state/${modelName}/${resId}/history`),

  /**
   * Execute a workflow transition
   */
  executeTransition: (data: ExecuteTransitionRequest): Promise<Record<string, unknown>> =>
    apiClient.post("/api/v1/base/workflows/execute", data),

  /**
   * Get workflow visualization data
   */
  getVisualization: (code: string): Promise<VisualizationData> =>
    apiClient.get(`/api/v1/base/workflows/${code}/visualization`),

  /**
   * List workflow activities
   */
  listActivities: (params?: {
    model_name?: string;
    res_id?: number;
    workflow_id?: number;
    user_id?: number;
    limit?: number;
  }): Promise<WorkflowActivity[]> =>
    apiClient.get("/api/v1/base/workflows/activities/", params),

  /**
   * Get the active workflow for a model
   */
  getModelWorkflow: (modelName: string): Promise<Workflow | null> =>
    apiClient.get(`/api/v1/base/workflows/model/${modelName}`),

  /**
   * Get all records in a specific workflow state
   */
  getRecordsInState: (code: string, state: string): Promise<Array<Record<string, unknown>>> =>
    apiClient.get(`/api/v1/base/workflows/${code}/records/${state}`),
};

export default workflowsApi;
