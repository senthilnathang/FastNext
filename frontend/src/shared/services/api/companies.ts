// Companies API Service
import type {
  AddMemberRequest,
  Company,
  CompanyListParams,
  CompanyListResponse,
  CompanyMember,
  CompanyMemberListParams,
  CompanyMemberListResponse,
  CreateCompanyRequest,
  UpdateCompanyRequest,
  UpdateMemberRequest,
} from "@/modules/company/types";
import { apiClient } from "./client";

const COMPANIES_ENDPOINT = "/api/v1/companies";

export const companiesApi = {
  // Get list of companies with pagination and filters
  getCompanies: async (
    params?: CompanyListParams
  ): Promise<CompanyListResponse> => {
    const response = await apiClient.get<CompanyListResponse>(
      COMPANIES_ENDPOINT,
      { params }
    );
    return response.data;
  },

  // Get single company by ID
  getCompany: async (id: number): Promise<Company> => {
    const response = await apiClient.get<Company>(
      `${COMPANIES_ENDPOINT}/${id}`
    );
    return response.data;
  },

  // Get company by slug
  getCompanyBySlug: async (slug: string): Promise<Company> => {
    const response = await apiClient.get<Company>(
      `${COMPANIES_ENDPOINT}/slug/${slug}`
    );
    return response.data;
  },

  // Create new company
  createCompany: async (data: CreateCompanyRequest): Promise<Company> => {
    const response = await apiClient.post<Company>(COMPANIES_ENDPOINT, data);
    return response.data;
  },

  // Update company
  updateCompany: async (
    id: number,
    data: UpdateCompanyRequest
  ): Promise<Company> => {
    const response = await apiClient.put<Company>(
      `${COMPANIES_ENDPOINT}/${id}`,
      data
    );
    return response.data;
  },

  // Delete company
  deleteCompany: async (id: number): Promise<void> => {
    await apiClient.delete(`${COMPANIES_ENDPOINT}/${id}`);
  },

  // Toggle company status (active/inactive)
  toggleCompanyStatus: async (id: number): Promise<Company> => {
    const response = await apiClient.patch<Company>(
      `${COMPANIES_ENDPOINT}/${id}/toggle-status`
    );
    return response.data;
  },

  // Upload company logo
  uploadLogo: async (id: number, file: File): Promise<{ logo_url: string }> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${COMPANIES_ENDPOINT}/${id}/logo`, {
      method: "POST",
      body: formData,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to upload logo");
    }

    return response.json();
  },

  // Delete company logo
  deleteLogo: async (id: number): Promise<void> => {
    await apiClient.delete(`${COMPANIES_ENDPOINT}/${id}/logo`);
  },

  // Company Members
  getMembers: async (
    companyId: number,
    params?: CompanyMemberListParams
  ): Promise<CompanyMemberListResponse> => {
    const response = await apiClient.get<CompanyMemberListResponse>(
      `${COMPANIES_ENDPOINT}/${companyId}/members`,
      { params }
    );
    return response.data;
  },

  // Get single member
  getMember: async (
    companyId: number,
    memberId: number
  ): Promise<CompanyMember> => {
    const response = await apiClient.get<CompanyMember>(
      `${COMPANIES_ENDPOINT}/${companyId}/members/${memberId}`
    );
    return response.data;
  },

  // Add member to company
  addMember: async (
    companyId: number,
    data: AddMemberRequest
  ): Promise<CompanyMember> => {
    const response = await apiClient.post<CompanyMember>(
      `${COMPANIES_ENDPOINT}/${companyId}/members`,
      data
    );
    return response.data;
  },

  // Update member role
  updateMember: async (
    companyId: number,
    memberId: number,
    data: UpdateMemberRequest
  ): Promise<CompanyMember> => {
    const response = await apiClient.put<CompanyMember>(
      `${COMPANIES_ENDPOINT}/${companyId}/members/${memberId}`,
      data
    );
    return response.data;
  },

  // Remove member from company
  removeMember: async (companyId: number, memberId: number): Promise<void> => {
    await apiClient.delete(
      `${COMPANIES_ENDPOINT}/${companyId}/members/${memberId}`
    );
  },

  // Transfer ownership
  transferOwnership: async (
    companyId: number,
    newOwnerId: number
  ): Promise<Company> => {
    const response = await apiClient.post<Company>(
      `${COMPANIES_ENDPOINT}/${companyId}/transfer-ownership`,
      { new_owner_id: newOwnerId }
    );
    return response.data;
  },

  // Update company settings
  updateSettings: async (
    companyId: number,
    settings: Record<string, unknown>
  ): Promise<Company> => {
    const response = await apiClient.patch<Company>(
      `${COMPANIES_ENDPOINT}/${companyId}/settings`,
      settings
    );
    return response.data;
  },
};
