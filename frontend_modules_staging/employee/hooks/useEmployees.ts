/**
 * Employee Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { employeeApi } from "../api/employeeApi";
import type {
  Employee,
  EmployeeCreate,
  EmployeeUpdate,
  ListParams,
} from "../types";

// Query key factory
export const employeeKeys = {
  all: ["employee"] as const,
  lists: () => [...employeeKeys.all, "list"] as const,
  list: (params?: ListParams) => [...employeeKeys.lists(), params] as const,
  details: () => [...employeeKeys.all, "detail"] as const,
  detail: (id: number) => [...employeeKeys.details(), id] as const,
  documents: (params?: ListParams) => [...employeeKeys.all, "documents", params] as const,
  notes: (params?: ListParams) => [...employeeKeys.all, "notes", params] as const,
  bonusPoints: (params?: ListParams) => [...employeeKeys.all, "bonus-points", params] as const,
  disciplinaryActions: (params?: ListParams) => [...employeeKeys.all, "disciplinary-actions", params] as const,
  policies: (params?: ListParams) => [...employeeKeys.all, "policies", params] as const,
  reports: (params?: ListParams) => [...employeeKeys.all, "reports", params] as const,
  settings: (params?: ListParams) => [...employeeKeys.all, "settings", params] as const,
};

// Employee list
export function useEmployees(params?: ListParams) {
  return useQuery({
    queryKey: employeeKeys.list(params),
    queryFn: () => employeeApi.list(params),
  });
}

// Employee detail
export function useEmployee(id: number) {
  return useQuery({
    queryKey: employeeKeys.detail(id),
    queryFn: () => employeeApi.get(id),
    enabled: id > 0,
  });
}

// Create employee
export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: EmployeeCreate) => employeeApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
    },
  });
}

// Update employee
export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: EmployeeUpdate }) =>
      employeeApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(id) });
    },
  });
}

// Delete employee
export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => employeeApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
    },
  });
}

// Documents
export function useEmployeeDocuments(params?: ListParams) {
  return useQuery({
    queryKey: employeeKeys.documents(params),
    queryFn: () => employeeApi.documents.list(params),
  });
}

// Notes
export function useEmployeeNotes(params?: ListParams) {
  return useQuery({
    queryKey: employeeKeys.notes(params),
    queryFn: () => employeeApi.notes.list(params),
  });
}

// Bonus Points
export function useBonusPoints(params?: ListParams) {
  return useQuery({
    queryKey: employeeKeys.bonusPoints(params),
    queryFn: () => employeeApi.bonusPoints.list(params),
  });
}

// Disciplinary Actions
export function useDisciplinaryActions(params?: ListParams) {
  return useQuery({
    queryKey: employeeKeys.disciplinaryActions(params),
    queryFn: () => employeeApi.disciplinaryActions.list(params),
  });
}

// Policies
export function usePolicies(params?: ListParams) {
  return useQuery({
    queryKey: employeeKeys.policies(params),
    queryFn: () => employeeApi.policies.list(params),
  });
}

// Reports
export function useEmployeeReports(params?: ListParams) {
  return useQuery({
    queryKey: employeeKeys.reports(params),
    queryFn: () => employeeApi.reports.list(params),
  });
}

// Settings
export function useEmployeeSettings(params?: ListParams) {
  return useQuery({
    queryKey: employeeKeys.settings(params),
    queryFn: () => employeeApi.settings.list(params),
  });
}

// CRUD mutations for sub-entities
export function useCreateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof employeeApi.documents.create>[0]) =>
      employeeApi.documents.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.documents() });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => employeeApi.documents.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.documents() });
    },
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof employeeApi.notes.create>[0]) =>
      employeeApi.notes.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.notes() });
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => employeeApi.notes.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.notes() });
    },
  });
}
