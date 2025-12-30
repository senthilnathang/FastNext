/**
 * CRM Module Types
 */

import type { Opportunity, Pipeline } from "@/lib/api/crm";

// Re-export from API types
export type {
  // Common
  PaginatedResponse,
  ListParams,
  // Leads
  Lead,
  LeadCreate,
  LeadUpdate,
  LeadListParams,
  LeadStatus,
  LeadConvertData,
  LeadConvertResult,
  // Opportunities
  Opportunity,
  OpportunityCreate,
  OpportunityUpdate,
  OpportunityListParams,
  OpportunityMoveStage,
  // Contacts
  Contact,
  ContactCreate,
  ContactUpdate,
  ContactListParams,
  // Accounts
  Account,
  AccountCreate,
  AccountUpdate,
  AccountListParams,
  AccountType,
  // Activities
  Activity,
  ActivityCreate,
  ActivityUpdate,
  ActivityListParams,
  ActivityType,
  ActivityStatus,
  ActivityRelatedType,
  // Pipelines
  Pipeline,
  PipelineCreate,
  PipelineUpdate,
  PipelineListParams,
  // Stages
  Stage,
  StageCreate,
  StageUpdate,
  StageReorder,
  StageType,
  // Stats
  CRMStats,
  PipelineStats,
} from "@/lib/api/crm";

// Module-specific UI types

export interface LeadFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  job_title: string;
  status: string;
  stage_id: number | null;
  probability: number;
  expected_revenue: number | null;
  source: string;
  assigned_to_id: number | null;
  notes: string;
  tags: string[];
}

export interface OpportunityFormData {
  name: string;
  amount: number | null;
  currency: string;
  probability: number;
  expected_close_date: string;
  stage_id: number;
  pipeline_id: number;
  contact_id: number | null;
  account_id: number | null;
  assigned_to_id: number | null;
  source: string;
  description: string;
  tags: string[];
}

export interface ContactFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  mobile: string;
  job_title: string;
  department: string;
  account_id: number | null;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  notes: string;
  tags: string[];
  is_primary: boolean;
}

export interface AccountFormData {
  name: string;
  type: string;
  industry: string;
  website: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  annual_revenue: number | null;
  employee_count: number | null;
  description: string;
  tags: string[];
  parent_account_id: number | null;
  assigned_to_id: number | null;
}

export interface ActivityFormData {
  type: string;
  subject: string;
  description: string;
  status: string;
  due_date: string;
  duration_minutes: number | null;
  related_type: string;
  related_id: number;
  assigned_to_id: number | null;
}

export interface PipelineFormData {
  name: string;
  description: string;
  is_default: boolean;
  is_active: boolean;
}

export interface StageFormData {
  name: string;
  type: string;
  probability: number;
  order: number;
  color: string;
  pipeline_id: number;
}

// UI State types

export type CRMViewMode = "list" | "kanban" | "grid";

export interface CRMFilters {
  search: string;
  status?: string;
  assigned_to_id?: number | null;
  date_range?: {
    start: string;
    end: string;
  };
  tags?: string[];
}

export interface LeadFilters extends CRMFilters {
  status?: string;
  stage_id?: number | null;
  source?: string;
}

export interface OpportunityFilters extends CRMFilters {
  pipeline_id?: number | null;
  stage_id?: number | null;
  status?: "open" | "won" | "lost";
  min_amount?: number;
  max_amount?: number;
}

export interface ContactFilters extends CRMFilters {
  account_id?: number | null;
  is_primary?: boolean;
}

export interface AccountFilters extends CRMFilters {
  type?: string;
  industry?: string;
}

export interface ActivityFilters extends CRMFilters {
  type?: string;
  status?: string;
  related_type?: string;
  related_id?: number;
  due_before?: string;
  due_after?: string;
}

// Kanban types

export interface KanbanColumn {
  id: number;
  name: string;
  type: string;
  color: string;
  items: Opportunity[];
}

export interface KanbanBoard {
  pipeline: Pipeline;
  columns: KanbanColumn[];
}

export interface DragResult {
  draggableId: string;
  source: {
    droppableId: string;
    index: number;
  };
  destination: {
    droppableId: string;
    index: number;
  } | null;
}
