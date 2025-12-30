// Company Types and Interfaces

export type CompanyStatus = "active" | "inactive" | "suspended";

export type CompanySize = "startup" | "small" | "medium" | "large" | "enterprise";

export type CompanyIndustry =
  | "technology"
  | "healthcare"
  | "finance"
  | "education"
  | "retail"
  | "manufacturing"
  | "consulting"
  | "media"
  | "real_estate"
  | "other";

export interface CompanySettings {
  allow_member_invites: boolean;
  require_2fa: boolean;
  default_role_id?: number;
  branding_enabled: boolean;
  primary_color?: string;
  timezone?: string;
  locale?: string;
}

export interface CompanyMember {
  id: number;
  user_id: number;
  company_id: number;
  role: string;
  is_owner: boolean;
  email: string;
  full_name?: string;
  avatar_url?: string;
  joined_at: string;
  last_active_at?: string;
}

export interface Company {
  id: number;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  industry?: CompanyIndustry;
  size?: CompanySize;
  status: CompanyStatus;
  settings?: CompanySettings;
  owner_id: number;
  member_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCompanyRequest {
  name: string;
  slug?: string;
  description?: string;
  logo_url?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  industry?: CompanyIndustry;
  size?: CompanySize;
  settings?: Partial<CompanySettings>;
}

export interface UpdateCompanyRequest {
  name?: string;
  slug?: string;
  description?: string;
  logo_url?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  industry?: CompanyIndustry;
  size?: CompanySize;
  status?: CompanyStatus;
  settings?: Partial<CompanySettings>;
}

export interface CompanyListParams {
  skip?: number;
  limit?: number;
  search?: string;
  status?: CompanyStatus;
  industry?: CompanyIndustry;
  size?: CompanySize;
  sort_by?: "name" | "created_at" | "updated_at" | "member_count";
  sort_order?: "asc" | "desc";
}

export interface CompanyListResponse {
  items: Company[];
  total: number;
  skip: number;
  limit: number;
}

export interface AddMemberRequest {
  user_id?: number;
  email?: string;
  role: string;
  send_invitation?: boolean;
}

export interface UpdateMemberRequest {
  role?: string;
}

export interface CompanyMemberListParams {
  skip?: number;
  limit?: number;
  search?: string;
  role?: string;
}

export interface CompanyMemberListResponse {
  items: CompanyMember[];
  total: number;
  skip: number;
  limit: number;
}

// Constants for dropdown options
export const COMPANY_INDUSTRIES: { value: CompanyIndustry; label: string }[] = [
  { value: "technology", label: "Technology" },
  { value: "healthcare", label: "Healthcare" },
  { value: "finance", label: "Finance" },
  { value: "education", label: "Education" },
  { value: "retail", label: "Retail" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "consulting", label: "Consulting" },
  { value: "media", label: "Media & Entertainment" },
  { value: "real_estate", label: "Real Estate" },
  { value: "other", label: "Other" },
];

export const COMPANY_SIZES: { value: CompanySize; label: string }[] = [
  { value: "startup", label: "Startup (1-10)" },
  { value: "small", label: "Small (11-50)" },
  { value: "medium", label: "Medium (51-200)" },
  { value: "large", label: "Large (201-1000)" },
  { value: "enterprise", label: "Enterprise (1000+)" },
];

export const COMPANY_STATUSES: { value: CompanyStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "suspended", label: "Suspended" },
];
