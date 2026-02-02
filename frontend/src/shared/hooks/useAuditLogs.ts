'use client';

import { useQuery } from '@tanstack/react-query';
import {
  activityApi,
  type ActivityLog,
  type ActivityListParams,
  type PaginatedActivityLogs,
} from '@/lib/api/activity';

export const activityKeys = {
  all: ['activity'] as const,
  lists: () => [...activityKeys.all, 'list'] as const,
  list: (params?: ActivityListParams) => [...activityKeys.lists(), params] as const,
  user: (userId: number, params?: { limit?: number; action?: string }) =>
    [...activityKeys.all, 'user', userId, params] as const,
  entity: (entityType: string, entityId: number, params?: { limit?: number }) =>
    [...activityKeys.all, 'entity', entityType, entityId, params] as const,
};

export function useAuditLogs(params?: ActivityListParams) {
  return useQuery({
    queryKey: activityKeys.list(params),
    queryFn: () => activityApi.list(params),
    staleTime: 60_000,
  });
}

export function useUserActivity(userId: number, params?: { limit?: number; action?: string }) {
  return useQuery({
    queryKey: activityKeys.user(userId, params),
    queryFn: () => activityApi.byUser(userId, params),
    enabled: !!userId,
    staleTime: 60_000,
  });
}

export function useEntityActivity(
  entityType: string,
  entityId: number,
  params?: { limit?: number },
) {
  return useQuery({
    queryKey: activityKeys.entity(entityType, entityId, params),
    queryFn: () => activityApi.byEntity(entityType, entityId, params),
    enabled: !!entityType && !!entityId,
    staleTime: 60_000,
  });
}
