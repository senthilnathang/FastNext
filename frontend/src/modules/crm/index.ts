/**
 * CRM Module
 * Exports all CRM module functionality
 */

// Components
export { LeadsList, OpportunityKanban } from "./components";

// Hooks
export {
  // Leads
  leadKeys,
  useLeads,
  useLead,
  useCreateLead,
  useUpdateLead,
  useDeleteLead,
  useConvertLead,
  useBulkUpdateLeads,
  useBulkDeleteLeads,
  // Opportunities
  opportunityKeys,
  useOpportunities,
  useOpportunity,
  useOpportunitiesByPipeline,
  useCreateOpportunity,
  useUpdateOpportunity,
  useDeleteOpportunity,
  useMoveOpportunityStage,
  useMarkOpportunityWon,
  useMarkOpportunityLost,
  // Pipelines & Stages
  pipelineKeys,
  stageKeys,
  usePipelines,
  usePipeline,
  usePipelineStats,
  useAllPipelineStats,
  useCreatePipeline,
  useUpdatePipeline,
  useDeletePipeline,
  useStages,
  useStage,
  useCreateStage,
  useUpdateStage,
  useDeleteStage,
  useReorderStages,
  // Contacts
  contactKeys,
  useContacts,
  useContact,
  useContactsByAccount,
  useCreateContact,
  useUpdateContact,
  useDeleteContact,
  // Accounts
  accountKeys,
  useAccounts,
  useAccount,
  useCreateAccount,
  useUpdateAccount,
  useDeleteAccount,
  // Activities
  activityKeys,
  useActivities,
  useActivity,
  useActivitiesForRecord,
  useCreateActivity,
  useUpdateActivity,
  useDeleteActivity,
  useCompleteActivity,
  // Stats
  crmStatsKeys,
  useCRMStats,
  useAllPipelinesStats,
} from "./hooks";

// Types (re-export from main types)
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
  LeadFormData,
  LeadFilters,
  // Opportunities
  Opportunity,
  OpportunityCreate,
  OpportunityUpdate,
  OpportunityListParams,
  OpportunityMoveStage,
  OpportunityFormData,
  OpportunityFilters,
  // Contacts
  Contact,
  ContactCreate,
  ContactUpdate,
  ContactListParams,
  ContactFormData,
  ContactFilters,
  // Accounts
  Account,
  AccountCreate,
  AccountUpdate,
  AccountListParams,
  AccountType,
  AccountFormData,
  AccountFilters,
  // Activities
  Activity,
  ActivityCreate,
  ActivityUpdate,
  ActivityListParams,
  ActivityType,
  ActivityStatus,
  ActivityRelatedType,
  ActivityFormData,
  ActivityFilters,
  // Pipelines
  Pipeline,
  PipelineCreate,
  PipelineUpdate,
  PipelineListParams,
  PipelineFormData,
  // Stages
  Stage,
  StageCreate,
  StageUpdate,
  StageReorder,
  StageType,
  StageFormData,
  // Stats
  CRMStats,
  PipelineStats,
  // UI
  CRMViewMode,
  CRMFilters,
  KanbanColumn,
  KanbanBoard,
  DragResult,
} from "./types";
