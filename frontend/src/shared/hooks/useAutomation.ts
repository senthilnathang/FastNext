'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  automationApi,
  type ServerAction,
  type AutomationRule,
  type ActionListParams,
  type RuleListParams,
  type CreateActionData,
  type CreateRuleData,
  type UpdateRuleData,
} from '@/lib/api/automation';

export const automationKeys = {
  actions: ['automation', 'actions'] as const,
  actionList: (params?: ActionListParams) => [...automationKeys.actions, 'list', params] as const,
  actionDetail: (id: string) => [...automationKeys.actions, 'detail', id] as const,
  rules: ['automation', 'rules'] as const,
  ruleList: (params?: RuleListParams) => [...automationKeys.rules, 'list', params] as const,
  ruleDetail: (id: string) => [...automationKeys.rules, 'detail', id] as const,
};

export function useServerActions(params?: ActionListParams) {
  return useQuery({
    queryKey: automationKeys.actionList(params),
    queryFn: () => automationApi.actions.list(params),
  });
}

export function useServerAction(id: string) {
  return useQuery({
    queryKey: automationKeys.actionDetail(id),
    queryFn: () => automationApi.actions.get(id),
    enabled: !!id,
  });
}

export function useCreateAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateActionData) => automationApi.actions.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationKeys.actions });
    },
  });
}

export function useUpdateAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateActionData> }) =>
      automationApi.actions.update(id, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: automationKeys.actions });
      queryClient.invalidateQueries({ queryKey: automationKeys.actionDetail(id) });
    },
  });
}

export function useDeleteAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => automationApi.actions.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationKeys.actions });
    },
  });
}

export function useAutomationRules(params?: RuleListParams) {
  return useQuery({
    queryKey: automationKeys.ruleList(params),
    queryFn: () => automationApi.rules.list(params),
  });
}

export function useAutomationRule(id: string) {
  return useQuery({
    queryKey: automationKeys.ruleDetail(id),
    queryFn: () => automationApi.rules.get(id),
    enabled: !!id,
  });
}

export function useCreateRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRuleData) => automationApi.rules.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationKeys.rules });
    },
  });
}

export function useUpdateRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRuleData }) =>
      automationApi.rules.update(id, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: automationKeys.rules });
      queryClient.invalidateQueries({ queryKey: automationKeys.ruleDetail(id) });
    },
  });
}

export function useDeleteRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => automationApi.rules.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationKeys.rules });
    },
  });
}
