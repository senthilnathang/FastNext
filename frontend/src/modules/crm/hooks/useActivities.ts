/**
 * Activities Hook
 * React Query hooks for activity CRUD operations
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { crmApi } from "@/lib/api/crm";
import type {
  Activity,
  ActivityCreate,
  ActivityUpdate,
  ActivityListParams,
  ActivityRelatedType,
  PaginatedResponse,
} from "@/lib/api/crm";

// Query keys
export const activityKeys = {
  all: ["crm", "activities"] as const,
  lists: () => [...activityKeys.all, "list"] as const,
  list: (params?: ActivityListParams) => [...activityKeys.lists(), params] as const,
  details: () => [...activityKeys.all, "detail"] as const,
  detail: (id: number) => [...activityKeys.details(), id] as const,
  forRecord: (relatedType: ActivityRelatedType, relatedId: number) =>
    [...activityKeys.all, "record", relatedType, relatedId] as const,
};

/**
 * Hook to fetch paginated activities
 */
export function useActivities(params?: ActivityListParams) {
  return useQuery<PaginatedResponse<Activity>>({
    queryKey: activityKeys.list(params),
    queryFn: () => crmApi.activities.list(params),
  });
}

/**
 * Hook to fetch a single activity by ID
 */
export function useActivity(id: number, options?: { enabled?: boolean }) {
  return useQuery<Activity>({
    queryKey: activityKeys.detail(id),
    queryFn: () => crmApi.activities.get(id),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to fetch activities for a specific record (lead, opportunity, contact, account)
 */
export function useActivitiesForRecord(
  relatedType: ActivityRelatedType,
  relatedId: number,
  options?: { enabled?: boolean }
) {
  return useQuery<Activity[]>({
    queryKey: activityKeys.forRecord(relatedType, relatedId),
    queryFn: () => crmApi.activities.getForRecord(relatedType, relatedId),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to create a new activity
 */
export function useCreateActivity() {
  const queryClient = useQueryClient();

  return useMutation<Activity, Error, ActivityCreate>({
    mutationFn: (data) => crmApi.activities.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: activityKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: activityKeys.forRecord(data.related_type, data.related_id),
      });
      // Invalidate CRM stats (activities due today, overdue)
      queryClient.invalidateQueries({ queryKey: ["crm", "stats"] });
    },
  });
}

/**
 * Hook to update an activity
 */
export function useUpdateActivity() {
  const queryClient = useQueryClient();

  return useMutation<
    Activity,
    Error,
    { id: number; data: ActivityUpdate; relatedType: ActivityRelatedType; relatedId: number }
  >({
    mutationFn: ({ id, data }) => crmApi.activities.update(id, data),
    onSuccess: (data, { relatedType, relatedId }) => {
      queryClient.setQueryData(activityKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: activityKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: activityKeys.forRecord(relatedType, relatedId),
      });
    },
  });
}

/**
 * Hook to delete an activity
 */
export function useDeleteActivity() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { id: number; relatedType: ActivityRelatedType; relatedId: number }
  >({
    mutationFn: ({ id }) => crmApi.activities.delete(id),
    onSuccess: (_, { id, relatedType, relatedId }) => {
      queryClient.removeQueries({ queryKey: activityKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: activityKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: activityKeys.forRecord(relatedType, relatedId),
      });
      queryClient.invalidateQueries({ queryKey: ["crm", "stats"] });
    },
  });
}

/**
 * Hook to complete an activity
 */
export function useCompleteActivity() {
  const queryClient = useQueryClient();

  return useMutation<
    Activity,
    Error,
    { id: number; relatedType: ActivityRelatedType; relatedId: number }
  >({
    mutationFn: ({ id }) => crmApi.activities.complete(id),
    onSuccess: (data, { relatedType, relatedId }) => {
      queryClient.setQueryData(activityKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: activityKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: activityKeys.forRecord(relatedType, relatedId),
      });
      queryClient.invalidateQueries({ queryKey: ["crm", "stats"] });
    },
  });
}
