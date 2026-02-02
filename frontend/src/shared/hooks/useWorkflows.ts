'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  workflowsApi,
  type Workflow,
  type WorkflowTransition,
  type WorkflowListParams,
  type CreateWorkflowData,
  type UpdateWorkflowData,
  type CreateTransitionData,
} from '@/lib/api/workflows';

export const workflowKeys = {
  all: ['workflows'] as const,
  lists: () => [...workflowKeys.all, 'list'] as const,
  list: (params?: WorkflowListParams) => [...workflowKeys.lists(), params] as const,
  detail: (id: string) => [...workflowKeys.all, 'detail', id] as const,
};

export function useWorkflows(params?: WorkflowListParams) {
  return useQuery({
    queryKey: workflowKeys.list(params),
    queryFn: () => workflowsApi.list(params),
  });
}

export function useWorkflow(id: string) {
  return useQuery({
    queryKey: workflowKeys.detail(id),
    queryFn: () => workflowsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWorkflowData) => workflowsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
    },
  });
}

export function useUpdateWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWorkflowData }) =>
      workflowsApi.update(id, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workflowKeys.detail(id) });
    },
  });
}

export function useDeleteWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => workflowsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
    },
  });
}

export function useAddTransition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workflowCode, data }: { workflowCode: string; data: CreateTransitionData }) =>
      workflowsApi.addTransition(workflowCode, data),
    onSuccess: (_result, { workflowCode }) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.detail(workflowCode) });
    },
  });
}

export function useModelWorkflowState(modelName: string, recordId: number) {
  return useQuery({
    queryKey: [...workflowKeys.all, 'modelState', modelName, recordId] as const,
    queryFn: () => workflowsApi.getModelState(modelName, recordId),
    enabled: !!modelName && !!recordId,
  });
}
