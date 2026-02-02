'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  rbacApi,
  type MenuItem,
  type ContentType,
  type AccessRule,
  type AccessRuleListParams,
  type AccessRuleCreateData,
  type AccessRuleUpdateData,
} from '@/lib/api/rbac';

export const rbacKeys = {
  menus: ['rbac', 'menus'] as const,
  menuTree: ['rbac', 'menus', 'tree'] as const,
  menuFlat: ['rbac', 'menus', 'flat'] as const,
  accessible: ['rbac', 'menus', 'accessible'] as const,
  accessibleCodes: ['rbac', 'menus', 'accessible', 'codes'] as const,
  contentTypes: ['rbac', 'contentTypes'] as const,
  accessRules: ['rbac', 'accessRules'] as const,
  accessRuleList: (params?: AccessRuleListParams) => [...rbacKeys.accessRules, 'list', params] as const,
  accessRuleDetail: (id: number) => [...rbacKeys.accessRules, 'detail', id] as const,
};

export function useMenuTree() {
  return useQuery({
    queryKey: rbacKeys.menuTree,
    queryFn: () => rbacApi.getMenuTree(),
  });
}

export function useMenuFlat() {
  return useQuery({
    queryKey: rbacKeys.menuFlat,
    queryFn: () => rbacApi.getMenuFlat(),
  });
}

export function useAccessibleMenus() {
  return useQuery({
    queryKey: rbacKeys.accessible,
    queryFn: () => rbacApi.getAccessibleMenus(),
  });
}

export function useAccessibleMenuCodes() {
  return useQuery({
    queryKey: rbacKeys.accessibleCodes,
    queryFn: () => rbacApi.getAccessibleMenuCodes(),
  });
}

export function useContentTypes() {
  return useQuery({
    queryKey: rbacKeys.contentTypes,
    queryFn: () => rbacApi.getContentTypes(),
  });
}

export function useAccessRules(params?: AccessRuleListParams) {
  return useQuery({
    queryKey: rbacKeys.accessRuleList(params),
    queryFn: () => rbacApi.listAccessRules(params),
  });
}

export function useAccessRule(id: number) {
  return useQuery({
    queryKey: rbacKeys.accessRuleDetail(id),
    queryFn: () => rbacApi.getAccessRule(id),
    enabled: !!id,
  });
}

export function useCreateAccessRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AccessRuleCreateData) => rbacApi.createAccessRule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rbacKeys.accessRules });
    },
  });
}

export function useUpdateAccessRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: AccessRuleUpdateData }) =>
      rbacApi.updateAccessRule(id, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: rbacKeys.accessRules });
      queryClient.invalidateQueries({ queryKey: rbacKeys.accessRuleDetail(id) });
    },
  });
}

export function useDeleteAccessRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => rbacApi.deleteAccessRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rbacKeys.accessRules });
    },
  });
}
