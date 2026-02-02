/**
 * Onboarding Module Types
 */

export interface OnboardingTemplate {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  steps?: OnboardingStep[];
  created_at: string;
  updated_at: string;
}

export interface OnboardingStep {
  id: number;
  template_id: number;
  name: string;
  description?: string;
  order: number;
  is_required: boolean;
}

export interface OnboardingProcess {
  id: number;
  employee_id: number;
  template_id: number;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  start_date?: string;
  end_date?: string;
  progress: number;
  is_active: boolean;
  employee?: { id: number; first_name: string; last_name: string };
  template?: { id: number; name: string };
  created_at: string;
  updated_at: string;
}

export interface OnboardingDocument {
  id: number;
  process_id: number;
  name: string;
  document_type?: string;
  file_url?: string;
  status: "pending" | "submitted" | "verified" | "rejected";
  created_at: string;
  updated_at: string;
}

export interface OnboardingVerification {
  id: number;
  process_id?: number;
  employee_id?: number;
  type: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  result?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OnboardingConversion {
  id: number;
  employee_id?: number;
  conversion_date?: string;
  status: "pending" | "approved" | "rejected";
  notes?: string;
  is_active: boolean;
  employee?: { id: number; first_name: string; last_name: string };
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

export interface ListParams {
  skip?: number;
  limit?: number;
  search?: string;
}
