/**
 * Pipelines Hook
 * React Query hooks for pipeline and stage operations
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { crmApi } from "@/lib/api/crm";
import type {
  Pipeline,
  PipelineCreate,
  PipelineUpdate,
  PipelineListParams,
  PipelineStats,
  Stage,
  StageCreate,
  StageUpdate,
  StageReorder,
} from "@/lib/api/crm";

// Query keys
export const pipelineKeys = {
  all: ["crm", "pipelines"] as const,
  list: (params?: PipelineListParams) => [...pipelineKeys.all, "list", params] as const,
  detail: (id: number) => [...pipelineKeys.all, "detail", id] as const,
  stats: (id: number) => [...pipelineKeys.all, id, "stats"] as const,
  allStats: () => [...pipelineKeys.all, "stats"] as const,
};

export const stageKeys = {
  all: ["crm", "stages"] as const,
  byPipeline: (pipelineId: number) => [...stageKeys.all, "pipeline", pipelineId] as const,
  detail: (id: number) => [...stageKeys.all, "detail", id] as const,
};

/**
 * Hook to fetch all pipelines
 */
export function usePipelines(params?: PipelineListParams) {
  return useQuery<Pipeline[]>({
    queryKey: pipelineKeys.list(params),
    queryFn: () => crmApi.pipelines.list(params),
  });
}

/**
 * Hook to fetch a single pipeline by ID
 */
export function usePipeline(id: number, options?: { enabled?: boolean }) {
  return useQuery<Pipeline>({
    queryKey: pipelineKeys.detail(id),
    queryFn: () => crmApi.pipelines.get(id),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to fetch pipeline stats
 */
export function usePipelineStats(id: number, options?: { enabled?: boolean }) {
  return useQuery<PipelineStats>({
    queryKey: pipelineKeys.stats(id),
    queryFn: () => crmApi.pipelines.getStats(id),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to fetch all pipeline stats
 */
export function useAllPipelineStats() {
  return useQuery<PipelineStats[]>({
    queryKey: pipelineKeys.allStats(),
    queryFn: () => crmApi.stats.getPipelineStats(),
  });
}

/**
 * Hook to create a new pipeline
 */
export function useCreatePipeline() {
  const queryClient = useQueryClient();

  return useMutation<Pipeline, Error, PipelineCreate>({
    mutationFn: (data) => crmApi.pipelines.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pipelineKeys.all });
    },
  });
}

/**
 * Hook to update a pipeline
 */
export function useUpdatePipeline() {
  const queryClient = useQueryClient();

  return useMutation<Pipeline, Error, { id: number; data: PipelineUpdate }>({
    mutationFn: ({ id, data }) => crmApi.pipelines.update(id, data),
    onSuccess: (data) => {
      queryClient.setQueryData(pipelineKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: pipelineKeys.all });
    },
  });
}

/**
 * Hook to delete a pipeline
 */
export function useDeletePipeline() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: (id) => crmApi.pipelines.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: pipelineKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: pipelineKeys.all });
    },
  });
}

// Stage hooks

/**
 * Hook to fetch stages for a pipeline
 */
export function useStages(pipelineId: number, options?: { enabled?: boolean }) {
  return useQuery<Stage[]>({
    queryKey: stageKeys.byPipeline(pipelineId),
    queryFn: () => crmApi.stages.list(pipelineId),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to fetch a single stage
 */
export function useStage(id: number, options?: { enabled?: boolean }) {
  return useQuery<Stage>({
    queryKey: stageKeys.detail(id),
    queryFn: () => crmApi.stages.get(id),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to create a new stage
 */
export function useCreateStage() {
  const queryClient = useQueryClient();

  return useMutation<Stage, Error, StageCreate>({
    mutationFn: (data) => crmApi.stages.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: stageKeys.byPipeline(data.pipeline_id) });
      queryClient.invalidateQueries({ queryKey: pipelineKeys.detail(data.pipeline_id) });
    },
  });
}

/**
 * Hook to update a stage
 */
export function useUpdateStage() {
  const queryClient = useQueryClient();

  return useMutation<Stage, Error, { id: number; data: StageUpdate; pipelineId: number }>({
    mutationFn: ({ id, data }) => crmApi.stages.update(id, data),
    onSuccess: (data, { pipelineId }) => {
      queryClient.setQueryData(stageKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: stageKeys.byPipeline(pipelineId) });
      queryClient.invalidateQueries({ queryKey: pipelineKeys.detail(pipelineId) });
    },
  });
}

/**
 * Hook to delete a stage
 */
export function useDeleteStage() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: number; pipelineId: number }>({
    mutationFn: ({ id }) => crmApi.stages.delete(id),
    onSuccess: (_, { id, pipelineId }) => {
      queryClient.removeQueries({ queryKey: stageKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: stageKeys.byPipeline(pipelineId) });
      queryClient.invalidateQueries({ queryKey: pipelineKeys.detail(pipelineId) });
    },
  });
}

/**
 * Hook to reorder stages in a pipeline
 */
export function useReorderStages() {
  const queryClient = useQueryClient();

  return useMutation<Stage[], Error, { pipelineId: number; data: StageReorder }>({
    mutationFn: ({ pipelineId, data }) => crmApi.stages.reorder(pipelineId, data),
    onSuccess: (_, { pipelineId }) => {
      queryClient.invalidateQueries({ queryKey: stageKeys.byPipeline(pipelineId) });
      queryClient.invalidateQueries({ queryKey: pipelineKeys.detail(pipelineId) });
    },
    // Optimistic update for smooth drag-drop
    onMutate: async ({ pipelineId, data }) => {
      await queryClient.cancelQueries({ queryKey: stageKeys.byPipeline(pipelineId) });

      const previousStages = queryClient.getQueryData<Stage[]>(stageKeys.byPipeline(pipelineId));

      if (previousStages) {
        const reorderedStages = data.stage_ids
          .map((id, index) => {
            const stage = previousStages.find((s) => s.id === id);
            return stage ? { ...stage, order: index } : null;
          })
          .filter(Boolean) as Stage[];

        queryClient.setQueryData(stageKeys.byPipeline(pipelineId), reorderedStages);
      }

      return { previousStages };
    },
    onError: (_error, { pipelineId }) => {
      // Rollback on error - invalidate to refetch
      queryClient.invalidateQueries({ queryKey: stageKeys.byPipeline(pipelineId) });
    },
  });
}
