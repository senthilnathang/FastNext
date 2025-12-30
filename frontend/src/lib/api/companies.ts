/**
 * Companies API Client
 * Handles company CRUD operations and multi-tenancy switching
 */

import { apiClient } from "./client";
import { setCompanyId, clearCompanyId } from "./multitenancy";

// Types
export type CompanyStatus = "active" | "inactive" | "suspended" | "pending";
export type CompanyPlan = "free" | "starter" | "professional" | "enterprise";

export interface Company {
  id: number;
  uuid: string;
  name: string;
  slug: string;
  legal_name?: string | null;
  description?: string | null;
  logo_url?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  status: CompanyStatus;
  plan: CompanyPlan;
  industry?: string | null;
  size?: string | null;
  timezone?: string | null;
  locale?: string | null;
  currency?: string | null;
  address?: CompanyAddress | null;
  settings?: CompanySettings | null;
  metadata?: Record<string, unknown>;
  owner_id?: number | null;
  parent_company_id?: number | null;
  is_verified: boolean;
  verified_at?: string | null;
  trial_ends_at?: string | null;
  created_at: string;
  updated_at?: string | null;
  member_count?: number;
  owner?: CompanyMember;
}

export interface CompanyAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export interface CompanySettings {
  allow_member_invites?: boolean;
  require_2fa?: boolean;
  session_timeout_minutes?: number;
  password_policy?: "weak" | "medium" | "strong";
  allowed_domains?: string[];
  branding?: {
    primary_color?: string;
    secondary_color?: string;
    logo_url?: string;
    favicon_url?: string;
  };
  features?: Record<string, boolean>;
}

export interface CompanyMember {
  id: number;
  user_id: number;
  company_id: number;
  role: "owner" | "admin" | "member" | "guest";
  title?: string | null;
  department?: string | null;
  is_active: boolean;
  joined_at: string;
  last_active_at?: string | null;
  user?: {
    id: number;
    username: string;
    email: string;
    full_name: string;
    avatar_url?: string;
  };
}

export interface CompanyListParams {
  status?: CompanyStatus;
  plan?: CompanyPlan;
  search?: string;
  is_verified?: boolean;
  owner_id?: number;
  skip?: number;
  limit?: number;
}

export interface CreateCompanyData {
  name: string;
  slug?: string;
  legal_name?: string;
  description?: string;
  logo_url?: string;
  website?: string;
  email?: string;
  phone?: string;
  industry?: string;
  size?: string;
  timezone?: string;
  locale?: string;
  currency?: string;
  address?: CompanyAddress;
  settings?: Partial<CompanySettings>;
  metadata?: Record<string, unknown>;
}

export interface UpdateCompanyData {
  name?: string;
  slug?: string;
  legal_name?: string;
  description?: string;
  logo_url?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: CompanyStatus;
  plan?: CompanyPlan;
  industry?: string | null;
  size?: string | null;
  timezone?: string | null;
  locale?: string | null;
  currency?: string | null;
  address?: CompanyAddress | null;
  settings?: Partial<CompanySettings>;
  metadata?: Record<string, unknown>;
}

export interface PaginatedCompanies {
  items: Company[];
  total: number;
  skip: number;
  limit: number;
}

export interface CompanyStats {
  total_members: number;
  active_members: number;
  storage_used_bytes: number;
  storage_limit_bytes: number;
  api_calls_this_month: number;
  api_limit: number;
}

export interface SwitchCompanyResult {
  success: boolean;
  company: Company;
  token?: string;
}

// API Functions
export const companiesApi = {
  /**
   * Get companies list (for multi-tenant users)
   */
  getCompanies: (params?: CompanyListParams): Promise<PaginatedCompanies> =>
    apiClient.get("/api/v1/companies", params),

  /**
   * Get a single company by ID
   */
  getCompany: (id: number | string): Promise<Company> =>
    apiClient.get(`/api/v1/companies/${id}`),

  /**
   * Get current company (based on context)
   */
  getCurrentCompany: (): Promise<Company> =>
    apiClient.get("/api/v1/companies/current"),

  /**
   * Create a new company
   */
  createCompany: (data: CreateCompanyData): Promise<Company> =>
    apiClient.post("/api/v1/companies", data),

  /**
   * Update a company
   */
  updateCompany: (id: number | string, data: UpdateCompanyData): Promise<Company> =>
    apiClient.patch(`/api/v1/companies/${id}`, data),

  /**
   * Delete a company
   */
  deleteCompany: (id: number | string): Promise<void> =>
    apiClient.delete(`/api/v1/companies/${id}`),

  /**
   * Switch to a different company context
   */
  switchCompany: async (id: number | string): Promise<SwitchCompanyResult> => {
    const result = await apiClient.post<SwitchCompanyResult>(
      `/api/v1/companies/${id}/switch`
    );

    if (result.success) {
      // Update local storage with new company context
      setCompanyId(String(result.company.uuid || result.company.id), {
        persistent: true,
        context: {
          name: result.company.name,
          slug: result.company.slug,
        },
      });

      // If a new token is provided, update it
      if (result.token && typeof window !== "undefined") {
        try {
          localStorage.setItem("access_token", result.token);
        } catch {
          // Ignore storage errors
        }
      }
    }

    return result;
  },

  /**
   * Leave current company context (for users in multiple companies)
   */
  leaveCompanyContext: (): void => {
    clearCompanyId();
  },

  /**
   * Get my companies (companies where user is a member)
   */
  getMyCompanies: (): Promise<Company[]> =>
    apiClient.get("/api/v1/companies/me"),

  // Members
  members: {
    /**
     * List company members
     */
    list: (
      companyId: number | string,
      params?: { role?: string; is_active?: boolean; skip?: number; limit?: number }
    ): Promise<{ items: CompanyMember[]; total: number }> =>
      apiClient.get(`/api/v1/companies/${companyId}/members`, params),

    /**
     * Get a member by ID
     */
    get: (companyId: number | string, memberId: number): Promise<CompanyMember> =>
      apiClient.get(`/api/v1/companies/${companyId}/members/${memberId}`),

    /**
     * Add a member to company
     */
    add: (
      companyId: number | string,
      data: { user_id: number; role?: "admin" | "member" | "guest"; title?: string; department?: string }
    ): Promise<CompanyMember> =>
      apiClient.post(`/api/v1/companies/${companyId}/members`, data),

    /**
     * Update a member
     */
    update: (
      companyId: number | string,
      memberId: number,
      data: { role?: "admin" | "member" | "guest"; title?: string; department?: string; is_active?: boolean }
    ): Promise<CompanyMember> =>
      apiClient.patch(`/api/v1/companies/${companyId}/members/${memberId}`, data),

    /**
     * Remove a member from company
     */
    remove: (companyId: number | string, memberId: number): Promise<void> =>
      apiClient.delete(`/api/v1/companies/${companyId}/members/${memberId}`),

    /**
     * Transfer ownership
     */
    transferOwnership: (
      companyId: number | string,
      newOwnerId: number
    ): Promise<Company> =>
      apiClient.post(`/api/v1/companies/${companyId}/transfer-ownership`, {
        new_owner_id: newOwnerId,
      }),
  },

  // Invitations
  invitations: {
    /**
     * List pending invitations
     */
    list: (companyId: number | string): Promise<CompanyInvitation[]> =>
      apiClient.get(`/api/v1/companies/${companyId}/invitations`),

    /**
     * Send invitation
     */
    send: (
      companyId: number | string,
      data: { email: string; role?: "admin" | "member" | "guest"; message?: string }
    ): Promise<CompanyInvitation> =>
      apiClient.post(`/api/v1/companies/${companyId}/invitations`, data),

    /**
     * Resend invitation
     */
    resend: (companyId: number | string, invitationId: number): Promise<CompanyInvitation> =>
      apiClient.post(`/api/v1/companies/${companyId}/invitations/${invitationId}/resend`),

    /**
     * Cancel invitation
     */
    cancel: (companyId: number | string, invitationId: number): Promise<void> =>
      apiClient.delete(`/api/v1/companies/${companyId}/invitations/${invitationId}`),

    /**
     * Accept invitation (by invited user)
     */
    accept: (token: string): Promise<{ company: Company; member: CompanyMember }> =>
      apiClient.post("/api/v1/companies/invitations/accept", { token }),
  },

  // Stats
  stats: {
    /**
     * Get company statistics
     */
    get: (companyId: number | string): Promise<CompanyStats> =>
      apiClient.get(`/api/v1/companies/${companyId}/stats`),

    /**
     * Get usage statistics
     */
    getUsage: (
      companyId: number | string,
      params?: { from_date?: string; to_date?: string }
    ): Promise<{
      api_calls: number;
      storage_bytes: number;
      active_users: number;
      daily_breakdown: { date: string; api_calls: number; active_users: number }[];
    }> =>
      apiClient.get(`/api/v1/companies/${companyId}/stats/usage`, params),
  },

  // Settings
  settings: {
    /**
     * Get company settings
     */
    get: (companyId: number | string): Promise<CompanySettings> =>
      apiClient.get(`/api/v1/companies/${companyId}/settings`),

    /**
     * Update company settings
     */
    update: (companyId: number | string, data: Partial<CompanySettings>): Promise<CompanySettings> =>
      apiClient.patch(`/api/v1/companies/${companyId}/settings`, data),

    /**
     * Reset settings to defaults
     */
    reset: (companyId: number | string): Promise<CompanySettings> =>
      apiClient.post(`/api/v1/companies/${companyId}/settings/reset`),
  },

  // Verification
  verification: {
    /**
     * Request company verification
     */
    request: (companyId: number | string): Promise<{ request_id: string; status: string }> =>
      apiClient.post(`/api/v1/companies/${companyId}/verify/request`),

    /**
     * Get verification status
     */
    getStatus: (companyId: number | string): Promise<{
      is_verified: boolean;
      verified_at?: string;
      pending_request?: { id: string; submitted_at: string; status: string };
    }> =>
      apiClient.get(`/api/v1/companies/${companyId}/verify/status`),
  },
};

// Additional types
export interface CompanyInvitation {
  id: number;
  company_id: number;
  email: string;
  role: "admin" | "member" | "guest";
  message?: string | null;
  token: string;
  invited_by_id: number;
  status: "pending" | "accepted" | "expired" | "cancelled";
  expires_at: string;
  created_at: string;
  accepted_at?: string | null;
  invited_by?: {
    id: number;
    username: string;
    full_name: string;
  };
}

export default companiesApi;
