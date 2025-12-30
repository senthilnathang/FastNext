/**
 * Opportunities Hook
 * React Query hooks for opportunity CRUD and pipeline operations
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { crmApi } from "@/lib/api/crm";
import type {
  Opportunity,
  OpportunityCreate,
  OpportunityUpdate,
  OpportunityListParams,
  OpportunityMoveStage,
  PaginatedResponse,
} from "@/lib/api/crm";

// Query keys
export const opportunityKeys = {
  all: ["crm", "opportunities"] as const,
  lists: () => [...opportunityKeys.all, "list"] as const,
  list: (params?: OpportunityListParams) => [...opportunityKeys.lists(), params] as const,
  details: () => [...opportunityKeys.all, "detail"] as const,
  detail: (id: number) => [...opportunityKeys.details(), id] as const,
  byPipeline: (pipelineId: number) => [...opportunityKeys.all, "pipeline", pipelineId] as const,
};

/**
 * Hook to fetch paginated opportunities
 */
export function useOpportunities(params?: OpportunityListParams) {
  return useQuery<PaginatedResponse<Opportunity>>({
    queryKey: opportunityKeys.list(params),
    queryFn: () => crmApi.opportunities.list(params),
  });
}

/**
 * Hook to fetch a single opportunity by ID
 */
export function useOpportunity(id: number, options?: { enabled?: boolean }) {
  return useQuery<Opportunity>({
    queryKey: opportunityKeys.detail(id),
    queryFn: () => crmApi.opportunities.get(id),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to fetch opportunities by pipeline (for Kanban view)
 */
export function useOpportunitiesByPipeline(pipelineId: number, options?: { enabled?: boolean }) {
  return useQuery<Opportunity[]>({
    queryKey: opportunityKeys.byPipeline(pipelineId),
    queryFn: () => crmApi.opportunities.getByPipeline(pipelineId),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to create a new opportunity
 */
export function useCreateOpportunity() {
  const queryClient = useQueryClient();

  return useMutation<Opportunity, Error, OpportunityCreate>({
    mutationFn: (data) => crmApi.opportunities.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: opportunityKeys.lists() });
      queryClient.invalidateQueries({ queryKey: opportunityKeys.byPipeline(data.pipeline_id) });
      queryClient.invalidateQueries({ queryKey: ["crm", "pipelines", data.pipeline_id, "stats"] });
    },
  });
}

/**
 * Hook to update an opportunity
 */
export function useUpdateOpportunity() {
  const queryClient = useQueryClient();

  return useMutation<Opportunity, Error, { id: number; data: OpportunityUpdate }>({
    mutationFn: ({ id, data }) => crmApi.opportunities.update(id, data),
    onSuccess: (data) => {
      queryClient.setQueryData(opportunityKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: opportunityKeys.lists() });
      queryClient.invalidateQueries({ queryKey: opportunityKeys.byPipeline(data.pipeline_id) });
    },
  });
}

/**
 * Hook to delete an opportunity
 */
export function useDeleteOpportunity() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: number; pipelineId: number }>({
    mutationFn: ({ id }) => crmApi.opportunities.delete(id),
    onSuccess: (_, { id, pipelineId }) => {
      queryClient.removeQueries({ queryKey: opportunityKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: opportunityKeys.lists() });
      queryClient.invalidateQueries({ queryKey: opportunityKeys.byPipeline(pipelineId) });
    },
  });
}

/**
 * Hook to move opportunity to a different stage (Kanban drag-drop)
 */
export function useMoveOpportunityStage() {
  const queryClient = useQueryClient();

  return useMutation<Opportunity, Error, { id: number; data: OpportunityMoveStage; pipelineId: number }>({
    mutationFn: ({ id, data }) => crmApi.opportunities.moveStage(id, data),
    onSuccess: (data, { pipelineId }) => {
      queryClient.setQueryData(opportunityKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: opportunityKeys.byPipeline(pipelineId) });
      queryClient.invalidateQueries({ queryKey: opportunityKeys.lists() });
    },
    // Optimistic update for smooth Kanban experience
    onMutate: async ({ id, data, pipelineId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: opportunityKeys.byPipeline(pipelineId) });

      // Snapshot current state
      const previousOpportunities = queryClient.getQueryData<Opportunity[]>(
        opportunityKeys.byPipeline(pipelineId)
      );

      // Optimistically update
      if (previousOpportunities) {
        queryClient.setQueryData<Opportunity[]>(
          opportunityKeys.byPipeline(pipelineId),
          previousOpportunities.map((opp) =>
            opp.id === id ? { ...opp, stage_id: data.stage_id } : opp
          )
        );
      }

      return { previousOpportunities };
    },
    onError: (_error, { pipelineId }) => {
      // Rollback on error - invalidate to refetch
      queryClient.invalidateQueries({ queryKey: opportunityKeys.byPipeline(pipelineId) });
    },
  });
}

/**
 * Hook to mark opportunity as won
 */
export function useMarkOpportunityWon() {
  const queryClient = useQueryClient();

  return useMutation<Opportunity, Error, { id: number; pipelineId: number }>({
    mutationFn: ({ id }) => crmApi.opportunities.markWon(id),
    onSuccess: (data, { pipelineId }) => {
      queryClient.setQueryData(opportunityKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: opportunityKeys.lists() });
      queryClient.invalidateQueries({ queryKey: opportunityKeys.byPipeline(pipelineId) });
      queryClient.invalidateQueries({ queryKey: ["crm", "stats"] });
    },
  });
}

/**
 * Hook to mark opportunity as lost
 */
export function useMarkOpportunityLost() {
  const queryClient = useQueryClient();

  return useMutation<Opportunity, Error, { id: number; pipelineId: number; reason?: string }>({
    mutationFn: ({ id, reason }) => crmApi.opportunities.markLost(id, reason),
    onSuccess: (data, { pipelineId }) => {
      queryClient.setQueryData(opportunityKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: opportunityKeys.lists() });
      queryClient.invalidateQueries({ queryKey: opportunityKeys.byPipeline(pipelineId) });
      queryClient.invalidateQueries({ queryKey: ["crm", "stats"] });
    },
  });
}
