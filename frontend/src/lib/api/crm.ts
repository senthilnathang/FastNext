/**
 * CRM Module API Client
 * Handles leads, opportunities, contacts, accounts, activities, and pipelines
 */

import { apiClient } from "./client";

// ============================================================================
// Common Types
// ============================================================================

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

export interface ListParams {
  skip?: number;
  limit?: number;
  search?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

// ============================================================================
// Lead Types
// ============================================================================

export type LeadStatus = "new" | "contacted" | "qualified" | "unqualified" | "lost";

export interface Lead {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  job_title: string | null;
  status: LeadStatus;
  stage_id: number | null;
  probability: number;
  expected_revenue: number | null;
  source: string | null;
  assigned_to_id: number | null;
  assigned_to_name?: string;
  notes: string | null;
  tags: string[];
  company_id: number;
  created_at: string;
  updated_at: string;
}

export interface LeadCreate {
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  job_title?: string | null;
  status?: LeadStatus;
  stage_id?: number | null;
  probability?: number;
  expected_revenue?: number | null;
  source?: string | null;
  assigned_to_id?: number | null;
  notes?: string | null;
  tags?: string[];
}

export interface LeadUpdate {
  name?: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  job_title?: string | null;
  status?: LeadStatus;
  stage_id?: number | null;
  probability?: number;
  expected_revenue?: number | null;
  source?: string | null;
  assigned_to_id?: number | null;
  notes?: string | null;
  tags?: string[];
}

export interface LeadListParams extends ListParams {
  status?: LeadStatus;
  stage_id?: number;
  assigned_to_id?: number;
  source?: string;
}

export interface LeadConvertData {
  create_opportunity?: boolean;
  create_contact?: boolean;
  create_account?: boolean;
  opportunity_name?: string;
  pipeline_id?: number;
}

export interface LeadConvertResult {
  opportunity_id?: number;
  contact_id?: number;
  account_id?: number;
}

// ============================================================================
// Opportunity Types
// ============================================================================

export interface Opportunity {
  id: number;
  name: string;
  amount: number | null;
  currency: string;
  probability: number;
  expected_close_date: string | null;
  stage_id: number;
  stage_name?: string;
  pipeline_id: number;
  pipeline_name?: string;
  contact_id: number | null;
  contact_name?: string;
  account_id: number | null;
  account_name?: string;
  assigned_to_id: number | null;
  assigned_to_name?: string;
  source: string | null;
  description: string | null;
  tags: string[];
  won_at: string | null;
  lost_at: string | null;
  lost_reason: string | null;
  company_id: number;
  created_at: string;
  updated_at: string;
}

export interface OpportunityCreate {
  name: string;
  amount?: number | null;
  currency?: string;
  probability?: number;
  expected_close_date?: string | null;
  stage_id: number;
  pipeline_id: number;
  contact_id?: number | null;
  account_id?: number | null;
  assigned_to_id?: number | null;
  source?: string | null;
  description?: string | null;
  tags?: string[];
}

export interface OpportunityUpdate {
  name?: string;
  amount?: number | null;
  currency?: string;
  probability?: number;
  expected_close_date?: string | null;
  stage_id?: number;
  pipeline_id?: number;
  contact_id?: number | null;
  account_id?: number | null;
  assigned_to_id?: number | null;
  source?: string | null;
  description?: string | null;
  tags?: string[];
  lost_reason?: string | null;
}

export interface OpportunityListParams extends ListParams {
  stage_id?: number;
  pipeline_id?: number;
  contact_id?: number;
  account_id?: number;
  assigned_to_id?: number;
  status?: "open" | "won" | "lost";
  min_amount?: number;
  max_amount?: number;
}

export interface OpportunityMoveStage {
  stage_id: number;
  lost_reason?: string;
}

// ============================================================================
// Contact Types
// ============================================================================

export interface Contact {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  job_title: string | null;
  department: string | null;
  account_id: number | null;
  account_name?: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  notes: string | null;
  tags: string[];
  is_primary: boolean;
  company_id: number;
  created_at: string;
  updated_at: string;
}

export interface ContactCreate {
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  job_title?: string | null;
  department?: string | null;
  account_id?: number | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
  notes?: string | null;
  tags?: string[];
  is_primary?: boolean;
}

export interface ContactUpdate {
  first_name?: string;
  last_name?: string;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  job_title?: string | null;
  department?: string | null;
  account_id?: number | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
  notes?: string | null;
  tags?: string[];
  is_primary?: boolean;
}

export interface ContactListParams extends ListParams {
  account_id?: number;
  is_primary?: boolean;
}

// ============================================================================
// Account Types
// ============================================================================

export type AccountType = "prospect" | "customer" | "partner" | "vendor" | "other";

export interface Account {
  id: number;
  name: string;
  type: AccountType;
  industry: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  annual_revenue: number | null;
  employee_count: number | null;
  description: string | null;
  tags: string[];
  parent_account_id: number | null;
  assigned_to_id: number | null;
  assigned_to_name?: string;
  contacts_count?: number;
  opportunities_count?: number;
  company_id: number;
  created_at: string;
  updated_at: string;
}

export interface AccountCreate {
  name: string;
  type?: AccountType;
  industry?: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
  annual_revenue?: number | null;
  employee_count?: number | null;
  description?: string | null;
  tags?: string[];
  parent_account_id?: number | null;
  assigned_to_id?: number | null;
}

export interface AccountUpdate {
  name?: string;
  type?: AccountType;
  industry?: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
  annual_revenue?: number | null;
  employee_count?: number | null;
  description?: string | null;
  tags?: string[];
  parent_account_id?: number | null;
  assigned_to_id?: number | null;
}

export interface AccountListParams extends ListParams {
  type?: AccountType;
  industry?: string;
  assigned_to_id?: number;
}

// ============================================================================
// Activity Types
// ============================================================================

export type ActivityType = "call" | "email" | "meeting" | "task" | "note";
export type ActivityStatus = "pending" | "completed" | "cancelled";
export type ActivityRelatedType = "lead" | "opportunity" | "contact" | "account";

export interface Activity {
  id: number;
  type: ActivityType;
  subject: string;
  description: string | null;
  status: ActivityStatus;
  due_date: string | null;
  completed_at: string | null;
  duration_minutes: number | null;
  related_type: ActivityRelatedType;
  related_id: number;
  related_name?: string;
  assigned_to_id: number | null;
  assigned_to_name?: string;
  company_id: number;
  created_at: string;
  updated_at: string;
}

export interface ActivityCreate {
  type: ActivityType;
  subject: string;
  description?: string | null;
  status?: ActivityStatus;
  due_date?: string | null;
  duration_minutes?: number | null;
  related_type: ActivityRelatedType;
  related_id: number;
  assigned_to_id?: number | null;
}

export interface ActivityUpdate {
  type?: ActivityType;
  subject?: string;
  description?: string | null;
  status?: ActivityStatus;
  due_date?: string | null;
  completed_at?: string | null;
  duration_minutes?: number | null;
  assigned_to_id?: number | null;
}

export interface ActivityListParams extends ListParams {
  type?: ActivityType;
  status?: ActivityStatus;
  related_type?: ActivityRelatedType;
  related_id?: number;
  assigned_to_id?: number;
  due_before?: string;
  due_after?: string;
}

// ============================================================================
// Pipeline Types
// ============================================================================

export interface Pipeline {
  id: number;
  name: string;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  stages: Stage[];
  company_id: number;
  created_at: string;
  updated_at: string;
}

export interface PipelineCreate {
  name: string;
  description?: string | null;
  is_default?: boolean;
  is_active?: boolean;
}

export interface PipelineUpdate {
  name?: string;
  description?: string | null;
  is_default?: boolean;
  is_active?: boolean;
}

export interface PipelineListParams {
  is_active?: boolean;
}

// ============================================================================
// Stage Types
// ============================================================================

export type StageType = "open" | "won" | "lost";

export interface Stage {
  id: number;
  name: string;
  type: StageType;
  probability: number;
  order: number;
  color: string | null;
  pipeline_id: number;
  opportunities_count?: number;
  company_id: number;
  created_at: string;
  updated_at: string;
}

export interface StageCreate {
  name: string;
  type?: StageType;
  probability?: number;
  order?: number;
  color?: string | null;
  pipeline_id: number;
}

export interface StageUpdate {
  name?: string;
  type?: StageType;
  probability?: number;
  order?: number;
  color?: string | null;
}

export interface StageReorder {
  stage_ids: number[];
}

// ============================================================================
// Dashboard/Stats Types
// ============================================================================

export interface CRMStats {
  total_leads: number;
  leads_by_status: Record<LeadStatus, number>;
  total_opportunities: number;
  open_opportunities: number;
  won_opportunities: number;
  lost_opportunities: number;
  total_revenue: number;
  expected_revenue: number;
  conversion_rate: number;
  avg_deal_size: number;
  total_contacts: number;
  total_accounts: number;
  activities_due_today: number;
  activities_overdue: number;
}

export interface PipelineStats {
  pipeline_id: number;
  pipeline_name: string;
  stages: {
    stage_id: number;
    stage_name: string;
    count: number;
    value: number;
  }[];
  total_value: number;
  total_count: number;
}

// ============================================================================
// API Functions
// ============================================================================

export const crmApi = {
  // Leads
  leads: {
    list: (params?: LeadListParams): Promise<PaginatedResponse<Lead>> =>
      apiClient.get("/api/v1/crm/leads", params),

    get: (id: number): Promise<Lead> =>
      apiClient.get(`/api/v1/crm/leads/${id}`),

    create: (data: LeadCreate): Promise<Lead> =>
      apiClient.post("/api/v1/crm/leads", data),

    update: (id: number, data: LeadUpdate): Promise<Lead> =>
      apiClient.patch(`/api/v1/crm/leads/${id}`, data),

    delete: (id: number): Promise<void> =>
      apiClient.delete(`/api/v1/crm/leads/${id}`),

    convert: (id: number, data: LeadConvertData): Promise<LeadConvertResult> =>
      apiClient.post(`/api/v1/crm/leads/${id}/convert`, data),

    bulkUpdate: (ids: number[], data: LeadUpdate): Promise<Lead[]> =>
      apiClient.patch("/api/v1/crm/leads/bulk", { ids, ...data }),

    bulkDelete: (ids: number[]): Promise<void> =>
      apiClient.delete("/api/v1/crm/leads/bulk"),
  },

  // Opportunities
  opportunities: {
    list: (params?: OpportunityListParams): Promise<PaginatedResponse<Opportunity>> =>
      apiClient.get("/api/v1/crm/opportunities", params),

    get: (id: number): Promise<Opportunity> =>
      apiClient.get(`/api/v1/crm/opportunities/${id}`),

    create: (data: OpportunityCreate): Promise<Opportunity> =>
      apiClient.post("/api/v1/crm/opportunities", data),

    update: (id: number, data: OpportunityUpdate): Promise<Opportunity> =>
      apiClient.patch(`/api/v1/crm/opportunities/${id}`, data),

    delete: (id: number): Promise<void> =>
      apiClient.delete(`/api/v1/crm/opportunities/${id}`),

    moveStage: (id: number, data: OpportunityMoveStage): Promise<Opportunity> =>
      apiClient.post(`/api/v1/crm/opportunities/${id}/move-stage`, data),

    markWon: (id: number): Promise<Opportunity> =>
      apiClient.post(`/api/v1/crm/opportunities/${id}/won`),

    markLost: (id: number, reason?: string): Promise<Opportunity> =>
      apiClient.post(`/api/v1/crm/opportunities/${id}/lost`, { reason }),

    getByPipeline: (pipelineId: number): Promise<Opportunity[]> =>
      apiClient.get(`/api/v1/crm/pipelines/${pipelineId}/opportunities`),
  },

  // Contacts
  contacts: {
    list: (params?: ContactListParams): Promise<PaginatedResponse<Contact>> =>
      apiClient.get("/api/v1/crm/contacts", params),

    get: (id: number): Promise<Contact> =>
      apiClient.get(`/api/v1/crm/contacts/${id}`),

    create: (data: ContactCreate): Promise<Contact> =>
      apiClient.post("/api/v1/crm/contacts", data),

    update: (id: number, data: ContactUpdate): Promise<Contact> =>
      apiClient.patch(`/api/v1/crm/contacts/${id}`, data),

    delete: (id: number): Promise<void> =>
      apiClient.delete(`/api/v1/crm/contacts/${id}`),

    getByAccount: (accountId: number): Promise<Contact[]> =>
      apiClient.get(`/api/v1/crm/accounts/${accountId}/contacts`),
  },

  // Accounts
  accounts: {
    list: (params?: AccountListParams): Promise<PaginatedResponse<Account>> =>
      apiClient.get("/api/v1/crm/accounts", params),

    get: (id: number): Promise<Account> =>
      apiClient.get(`/api/v1/crm/accounts/${id}`),

    create: (data: AccountCreate): Promise<Account> =>
      apiClient.post("/api/v1/crm/accounts", data),

    update: (id: number, data: AccountUpdate): Promise<Account> =>
      apiClient.patch(`/api/v1/crm/accounts/${id}`, data),

    delete: (id: number): Promise<void> =>
      apiClient.delete(`/api/v1/crm/accounts/${id}`),
  },

  // Activities
  activities: {
    list: (params?: ActivityListParams): Promise<PaginatedResponse<Activity>> =>
      apiClient.get("/api/v1/crm/activities", params),

    get: (id: number): Promise<Activity> =>
      apiClient.get(`/api/v1/crm/activities/${id}`),

    create: (data: ActivityCreate): Promise<Activity> =>
      apiClient.post("/api/v1/crm/activities", data),

    update: (id: number, data: ActivityUpdate): Promise<Activity> =>
      apiClient.patch(`/api/v1/crm/activities/${id}`, data),

    delete: (id: number): Promise<void> =>
      apiClient.delete(`/api/v1/crm/activities/${id}`),

    complete: (id: number): Promise<Activity> =>
      apiClient.post(`/api/v1/crm/activities/${id}/complete`),

    getForRecord: (
      relatedType: ActivityRelatedType,
      relatedId: number
    ): Promise<Activity[]> =>
      apiClient.get("/api/v1/crm/activities", { related_type: relatedType, related_id: relatedId }),
  },

  // Pipelines
  pipelines: {
    list: (params?: PipelineListParams): Promise<Pipeline[]> =>
      apiClient.get("/api/v1/crm/pipelines", params),

    get: (id: number): Promise<Pipeline> =>
      apiClient.get(`/api/v1/crm/pipelines/${id}`),

    create: (data: PipelineCreate): Promise<Pipeline> =>
      apiClient.post("/api/v1/crm/pipelines", data),

    update: (id: number, data: PipelineUpdate): Promise<Pipeline> =>
      apiClient.patch(`/api/v1/crm/pipelines/${id}`, data),

    delete: (id: number): Promise<void> =>
      apiClient.delete(`/api/v1/crm/pipelines/${id}`),

    getStats: (id: number): Promise<PipelineStats> =>
      apiClient.get(`/api/v1/crm/pipelines/${id}/stats`),
  },

  // Stages
  stages: {
    list: (pipelineId: number): Promise<Stage[]> =>
      apiClient.get(`/api/v1/crm/pipelines/${pipelineId}/stages`),

    get: (id: number): Promise<Stage> =>
      apiClient.get(`/api/v1/crm/stages/${id}`),

    create: (data: StageCreate): Promise<Stage> =>
      apiClient.post("/api/v1/crm/stages", data),

    update: (id: number, data: StageUpdate): Promise<Stage> =>
      apiClient.patch(`/api/v1/crm/stages/${id}`, data),

    delete: (id: number): Promise<void> =>
      apiClient.delete(`/api/v1/crm/stages/${id}`),

    reorder: (pipelineId: number, data: StageReorder): Promise<Stage[]> =>
      apiClient.post(`/api/v1/crm/pipelines/${pipelineId}/stages/reorder`, data),
  },

  // Dashboard & Stats
  stats: {
    getDashboard: (): Promise<CRMStats> =>
      apiClient.get("/api/v1/crm/stats"),

    getPipelineStats: (): Promise<PipelineStats[]> =>
      apiClient.get("/api/v1/crm/stats/pipelines"),
  },
};

export default crmApi;
