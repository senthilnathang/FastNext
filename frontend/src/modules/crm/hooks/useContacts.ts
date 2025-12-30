/**
 * Contacts Hook
 * React Query hooks for contact CRUD operations
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { crmApi } from "@/lib/api/crm";
import type {
  Contact,
  ContactCreate,
  ContactUpdate,
  ContactListParams,
  PaginatedResponse,
} from "@/lib/api/crm";

// Query keys
export const contactKeys = {
  all: ["crm", "contacts"] as const,
  lists: () => [...contactKeys.all, "list"] as const,
  list: (params?: ContactListParams) => [...contactKeys.lists(), params] as const,
  details: () => [...contactKeys.all, "detail"] as const,
  detail: (id: number) => [...contactKeys.details(), id] as const,
  byAccount: (accountId: number) => [...contactKeys.all, "account", accountId] as const,
};

/**
 * Hook to fetch paginated contacts
 */
export function useContacts(params?: ContactListParams) {
  return useQuery<PaginatedResponse<Contact>>({
    queryKey: contactKeys.list(params),
    queryFn: () => crmApi.contacts.list(params),
  });
}

/**
 * Hook to fetch a single contact by ID
 */
export function useContact(id: number, options?: { enabled?: boolean }) {
  return useQuery<Contact>({
    queryKey: contactKeys.detail(id),
    queryFn: () => crmApi.contacts.get(id),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to fetch contacts by account
 */
export function useContactsByAccount(accountId: number, options?: { enabled?: boolean }) {
  return useQuery<Contact[]>({
    queryKey: contactKeys.byAccount(accountId),
    queryFn: () => crmApi.contacts.getByAccount(accountId),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to create a new contact
 */
export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation<Contact, Error, ContactCreate>({
    mutationFn: (data) => crmApi.contacts.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
      if (data.account_id) {
        queryClient.invalidateQueries({ queryKey: contactKeys.byAccount(data.account_id) });
      }
    },
  });
}

/**
 * Hook to update a contact
 */
export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation<Contact, Error, { id: number; data: ContactUpdate; previousAccountId?: number }>({
    mutationFn: ({ id, data }) => crmApi.contacts.update(id, data),
    onSuccess: (data, { previousAccountId }) => {
      queryClient.setQueryData(contactKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
      if (data.account_id) {
        queryClient.invalidateQueries({ queryKey: contactKeys.byAccount(data.account_id) });
      }
      if (previousAccountId && previousAccountId !== data.account_id) {
        queryClient.invalidateQueries({ queryKey: contactKeys.byAccount(previousAccountId) });
      }
    },
  });
}

/**
 * Hook to delete a contact
 */
export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: number; accountId?: number }>({
    mutationFn: ({ id }) => crmApi.contacts.delete(id),
    onSuccess: (_, { id, accountId }) => {
      queryClient.removeQueries({ queryKey: contactKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
      if (accountId) {
        queryClient.invalidateQueries({ queryKey: contactKeys.byAccount(accountId) });
      }
    },
  });
}
