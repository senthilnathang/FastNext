/**
 * CRM Module Hooks
 */

// Leads
export {
  leadKeys,
  useLeads,
  useLead,
  useCreateLead,
  useUpdateLead,
  useDeleteLead,
  useConvertLead,
  useBulkUpdateLeads,
  useBulkDeleteLeads,
} from "./useLeads";

// Opportunities
export {
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
} from "./useOpportunities";

// Pipelines & Stages
export {
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
} from "./usePipelines";

// Contacts
export {
  contactKeys,
  useContacts,
  useContact,
  useContactsByAccount,
  useCreateContact,
  useUpdateContact,
  useDeleteContact,
} from "./useContacts";

// Accounts
export {
  accountKeys,
  useAccounts,
  useAccount,
  useCreateAccount,
  useUpdateAccount,
  useDeleteAccount,
} from "./useAccounts";

// Activities
export {
  activityKeys,
  useActivities,
  useActivity,
  useActivitiesForRecord,
  useCreateActivity,
  useUpdateActivity,
  useDeleteActivity,
  useCompleteActivity,
} from "./useActivities";

// Stats
export {
  crmStatsKeys,
  useCRMStats,
  usePipelineStats as useAllPipelinesStats,
} from "./useCRMStats";
