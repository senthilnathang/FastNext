import { useQuery } from "@tanstack/react-query";
import { companiesApi } from "@/shared/services/api/companies";
import { companyKeys } from "./useCompanies";

// Get single company by ID
export const useCompany = (id: number) => {
  return useQuery({
    queryKey: companyKeys.detail(id),
    queryFn: () => companiesApi.getCompany(id),
    enabled: !!id && id > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

// Get company by slug
export const useCompanyBySlug = (slug: string) => {
  return useQuery({
    queryKey: companyKeys.bySlug(slug),
    queryFn: () => companiesApi.getCompanyBySlug(slug),
    enabled: !!slug && slug.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

// Get single company member
export const useCompanyMember = (companyId: number, memberId: number) => {
  return useQuery({
    queryKey: companyKeys.member(companyId, memberId),
    queryFn: () => companiesApi.getMember(companyId, memberId),
    enabled: !!companyId && companyId > 0 && !!memberId && memberId > 0,
  });
};
