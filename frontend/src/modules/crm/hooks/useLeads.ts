/**
 * Leads Hook
 * React Query hooks for lead CRUD operations
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { crmApi } from "@/lib/api/crm";
import type {
  Lead,
  LeadCreate,
  LeadUpdate,
  LeadListParams,
  LeadConvertData,
  LeadConvertResult,
  PaginatedResponse,
} from "@/lib/api/crm";

// Query keys
export const leadKeys = {
  all: ["crm", "leads"] as const,
  lists: () => [...leadKeys.all, "list"] as const,
  list: (params?: LeadListParams) => [...leadKeys.lists(), params] as const,
  details: () => [...leadKeys.all, "detail"] as const,
  detail: (id: number) => [...leadKeys.details(), id] as const,
};

/**
 * Hook to fetch paginated leads
 */
export function useLeads(params?: LeadListParams) {
  return useQuery<PaginatedResponse<Lead>>({
    queryKey: leadKeys.list(params),
    queryFn: () => crmApi.leads.list(params),
  });
}

/**
 * Hook to fetch a single lead by ID
 */
export function useLead(id: number, options?: { enabled?: boolean }) {
  return useQuery<Lead>({
    queryKey: leadKeys.detail(id),
    queryFn: () => crmApi.leads.get(id),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to create a new lead
 */
export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation<Lead, Error, LeadCreate>({
    mutationFn: (data) => crmApi.leads.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
    },
  });
}

/**
 * Hook to update a lead
 */
export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation<Lead, Error, { id: number; data: LeadUpdate }>({
    mutationFn: ({ id, data }) => crmApi.leads.update(id, data),
    onSuccess: (data) => {
      queryClient.setQueryData(leadKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
    },
  });
}

/**
 * Hook to delete a lead
 */
export function useDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: (id) => crmApi.leads.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: leadKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
    },
  });
}

/**
 * Hook to convert a lead to opportunity/contact/account
 */
export function useConvertLead() {
  const queryClient = useQueryClient();

  return useMutation<LeadConvertResult, Error, { id: number; data: LeadConvertData }>({
    mutationFn: ({ id, data }) => crmApi.leads.convert(id, data),
    onSuccess: (_, { id }) => {
      queryClient.removeQueries({ queryKey: leadKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
      // Also invalidate opportunities if created
      queryClient.invalidateQueries({ queryKey: ["crm", "opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["crm", "contacts"] });
      queryClient.invalidateQueries({ queryKey: ["crm", "accounts"] });
    },
  });
}

/**
 * Hook to bulk update leads
 */
export function useBulkUpdateLeads() {
  const queryClient = useQueryClient();

  return useMutation<Lead[], Error, { ids: number[]; data: LeadUpdate }>({
    mutationFn: ({ ids, data }) => crmApi.leads.bulkUpdate(ids, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadKeys.all });
    },
  });
}

/**
 * Hook to bulk delete leads
 */
export function useBulkDeleteLeads() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number[]>({
    mutationFn: () => crmApi.leads.bulkDelete([]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadKeys.all });
    },
  });
}
