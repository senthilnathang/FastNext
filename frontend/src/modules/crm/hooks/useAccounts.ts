/**
 * Accounts Hook
 * React Query hooks for account CRUD operations
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { crmApi } from "@/lib/api/crm";
import type {
  Account,
  AccountCreate,
  AccountUpdate,
  AccountListParams,
  PaginatedResponse,
} from "@/lib/api/crm";

// Query keys
export const accountKeys = {
  all: ["crm", "accounts"] as const,
  lists: () => [...accountKeys.all, "list"] as const,
  list: (params?: AccountListParams) => [...accountKeys.lists(), params] as const,
  details: () => [...accountKeys.all, "detail"] as const,
  detail: (id: number) => [...accountKeys.details(), id] as const,
};

/**
 * Hook to fetch paginated accounts
 */
export function useAccounts(params?: AccountListParams) {
  return useQuery<PaginatedResponse<Account>>({
    queryKey: accountKeys.list(params),
    queryFn: () => crmApi.accounts.list(params),
  });
}

/**
 * Hook to fetch a single account by ID
 */
export function useAccount(id: number, options?: { enabled?: boolean }) {
  return useQuery<Account>({
    queryKey: accountKeys.detail(id),
    queryFn: () => crmApi.accounts.get(id),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to create a new account
 */
export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation<Account, Error, AccountCreate>({
    mutationFn: (data) => crmApi.accounts.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
    },
  });
}

/**
 * Hook to update an account
 */
export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation<Account, Error, { id: number; data: AccountUpdate }>({
    mutationFn: ({ id, data }) => crmApi.accounts.update(id, data),
    onSuccess: (data) => {
      queryClient.setQueryData(accountKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
    },
  });
}

/**
 * Hook to delete an account
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: (id) => crmApi.accounts.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: accountKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
      // Also invalidate contacts that might be linked to this account
      queryClient.invalidateQueries({ queryKey: ["crm", "contacts"] });
    },
  });
}
