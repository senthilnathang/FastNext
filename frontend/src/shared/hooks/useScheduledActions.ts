'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  scheduledActionsApi,
  type ScheduledAction,
  type ScheduledActionLog,
  type ScheduledActionListParams,
  type CreateScheduledActionData,
  type UpdateScheduledActionData,
} from '@/lib/api/scheduled-actions';

export const scheduledActionKeys = {
  all: ['scheduledActions'] as const,
  lists: () => [...scheduledActionKeys.all, 'list'] as const,
  list: (params?: ScheduledActionListParams) => [...scheduledActionKeys.lists(), params] as const,
  detail: (id: string) => [...scheduledActionKeys.all, 'detail', id] as const,
  logs: (id: string) => [...scheduledActionKeys.all, 'logs', id] as const,
};

export function useScheduledActions(params?: ScheduledActionListParams) {
  return useQuery({
    queryKey: scheduledActionKeys.list(params),
    queryFn: () => scheduledActionsApi.list(params),
  });
}

export function useScheduledAction(id: string) {
  return useQuery({
    queryKey: scheduledActionKeys.detail(id),
    queryFn: () => scheduledActionsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateScheduledAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateScheduledActionData) => scheduledActionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduledActionKeys.lists() });
    },
  });
}

export function useUpdateScheduledAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateScheduledActionData }) =>
      scheduledActionsApi.update(id, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: scheduledActionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: scheduledActionKeys.detail(id) });
    },
  });
}

export function useDeleteScheduledAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => scheduledActionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduledActionKeys.lists() });
    },
  });
}

export function useRunScheduledAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => scheduledActionsApi.run(id),
    onSuccess: (_result, id) => {
      queryClient.invalidateQueries({ queryKey: scheduledActionKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: scheduledActionKeys.logs(id) });
    },
  });
}

export function useScheduledActionLogs(id: string, params?: { limit?: number }) {
  return useQuery({
    queryKey: [...scheduledActionKeys.logs(id), params] as const,
    queryFn: () => scheduledActionsApi.getLogs(id, params),
    enabled: !!id,
  });
}
