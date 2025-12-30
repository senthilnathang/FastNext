import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { companiesApi } from "@/shared/services/api/companies";
import type {
  AddMemberRequest,
  Company,
  CompanyListParams,
  CompanyMemberListParams,
  CreateCompanyRequest,
  UpdateCompanyRequest,
  UpdateMemberRequest,
} from "../types";

// Query keys for companies
export const companyKeys = {
  all: ["companies"] as const,
  lists: () => [...companyKeys.all, "list"] as const,
  list: (params?: CompanyListParams) => [...companyKeys.lists(), params] as const,
  details: () => [...companyKeys.all, "detail"] as const,
  detail: (id: number) => [...companyKeys.details(), id] as const,
  bySlug: (slug: string) => [...companyKeys.all, "slug", slug] as const,
  members: (companyId: number) =>
    [...companyKeys.detail(companyId), "members"] as const,
  memberList: (companyId: number, params?: CompanyMemberListParams) =>
    [...companyKeys.members(companyId), params] as const,
  member: (companyId: number, memberId: number) =>
    [...companyKeys.members(companyId), memberId] as const,
};

// List companies hook
export const useCompanies = (params?: CompanyListParams) => {
  return useQuery({
    queryKey: companyKeys.list(params),
    queryFn: () => companiesApi.getCompanies(params),
    placeholderData: (previousData) => previousData,
  });
};

// Create company mutation
export const useCreateCompany = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCompanyRequest) => companiesApi.createCompany(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
    },
    onError: (error) => {
      console.error("Failed to create company:", error);
    },
  });
};

// Update company mutation
export const useUpdateCompany = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCompanyRequest }) =>
      companiesApi.updateCompany(id, data),
    onSuccess: (updatedCompany, { id }) => {
      queryClient.setQueryData(companyKeys.detail(id), updatedCompany);
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
    },
    onError: (error) => {
      console.error("Failed to update company:", error);
    },
  });
};

// Delete company mutation
export const useDeleteCompany = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => companiesApi.deleteCompany(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: companyKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
    },
    onError: (error) => {
      console.error("Failed to delete company:", error);
    },
  });
};

// Toggle company status mutation
export const useToggleCompanyStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => companiesApi.toggleCompanyStatus(id),
    onSuccess: (updatedCompany, id) => {
      queryClient.setQueryData(companyKeys.detail(id), updatedCompany);
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
    },
    onError: (error) => {
      console.error("Failed to toggle company status:", error);
    },
  });
};

// Upload logo mutation
export const useUploadCompanyLogo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) =>
      companiesApi.uploadLogo(id, file),
    onSuccess: (result, { id }) => {
      queryClient.setQueryData(
        companyKeys.detail(id),
        (old: Company | undefined) =>
          old ? { ...old, logo_url: result.logo_url } : old
      );
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
    },
    onError: (error) => {
      console.error("Failed to upload logo:", error);
    },
  });
};

// Delete logo mutation
export const useDeleteCompanyLogo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => companiesApi.deleteLogo(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData(
        companyKeys.detail(id),
        (old: Company | undefined) =>
          old ? { ...old, logo_url: undefined } : old
      );
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
    },
    onError: (error) => {
      console.error("Failed to delete logo:", error);
    },
  });
};

// Company Members hooks
export const useCompanyMembers = (
  companyId: number,
  params?: CompanyMemberListParams
) => {
  return useQuery({
    queryKey: companyKeys.memberList(companyId, params),
    queryFn: () => companiesApi.getMembers(companyId, params),
    enabled: !!companyId && companyId > 0,
    placeholderData: (previousData) => previousData,
  });
};

export const useAddCompanyMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      companyId,
      data,
    }: {
      companyId: number;
      data: AddMemberRequest;
    }) => companiesApi.addMember(companyId, data),
    onSuccess: (_, { companyId }) => {
      queryClient.invalidateQueries({
        queryKey: companyKeys.members(companyId),
      });
      queryClient.invalidateQueries({ queryKey: companyKeys.detail(companyId) });
    },
    onError: (error) => {
      console.error("Failed to add member:", error);
    },
  });
};

export const useUpdateCompanyMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      companyId,
      memberId,
      data,
    }: {
      companyId: number;
      memberId: number;
      data: UpdateMemberRequest;
    }) => companiesApi.updateMember(companyId, memberId, data),
    onSuccess: (updatedMember, { companyId, memberId }) => {
      queryClient.setQueryData(
        companyKeys.member(companyId, memberId),
        updatedMember
      );
      queryClient.invalidateQueries({
        queryKey: companyKeys.members(companyId),
      });
    },
    onError: (error) => {
      console.error("Failed to update member:", error);
    },
  });
};

export const useRemoveCompanyMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      companyId,
      memberId,
    }: {
      companyId: number;
      memberId: number;
    }) => companiesApi.removeMember(companyId, memberId),
    onSuccess: (_, { companyId, memberId }) => {
      queryClient.removeQueries({
        queryKey: companyKeys.member(companyId, memberId),
      });
      queryClient.invalidateQueries({
        queryKey: companyKeys.members(companyId),
      });
      queryClient.invalidateQueries({ queryKey: companyKeys.detail(companyId) });
    },
    onError: (error) => {
      console.error("Failed to remove member:", error);
    },
  });
};

// Transfer ownership mutation
export const useTransferOwnership = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      companyId,
      newOwnerId,
    }: {
      companyId: number;
      newOwnerId: number;
    }) => companiesApi.transferOwnership(companyId, newOwnerId),
    onSuccess: (updatedCompany, { companyId }) => {
      queryClient.setQueryData(companyKeys.detail(companyId), updatedCompany);
      queryClient.invalidateQueries({
        queryKey: companyKeys.members(companyId),
      });
    },
    onError: (error) => {
      console.error("Failed to transfer ownership:", error);
    },
  });
};

// Update settings mutation
export const useUpdateCompanySettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      companyId,
      settings,
    }: {
      companyId: number;
      settings: Record<string, unknown>;
    }) => companiesApi.updateSettings(companyId, settings),
    onSuccess: (updatedCompany, { companyId }) => {
      queryClient.setQueryData(companyKeys.detail(companyId), updatedCompany);
    },
    onError: (error) => {
      console.error("Failed to update settings:", error);
    },
  });
};

// Utility hook for optimistic updates
export const useOptimisticCompanyUpdate = () => {
  const queryClient = useQueryClient();

  return {
    updateCompanyOptimistically: (id: number, updates: Partial<Company>) => {
      queryClient.setQueryData(
        companyKeys.detail(id),
        (old: Company | undefined) => (old ? { ...old, ...updates } : old)
      );
    },

    revertCompanyUpdate: (id: number) => {
      queryClient.invalidateQueries({ queryKey: companyKeys.detail(id) });
    },
  };
};
