/**
 * Auth API Client
 * Matches backend API schema
 */

import { apiClient } from "./client";

// Types matching backend

export interface LoginRequest {
  username: string;
  password: string;
  two_factor_code?: string | null;
}

export interface CompanyInfo {
  id: number;
  name: string;
  code: string;
  is_default: boolean;
}

export interface UserInfo {
  id: number;
  email: string;
  username: string;
  full_name?: string | null;
  avatar_url?: string | null;
  is_superuser: boolean;
  two_factor_enabled: boolean;
  current_company_id?: number | null;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: UserInfo;
  companies: CompanyInfo[];
  permissions: string[];
  requires_2fa: boolean;
}

export interface RefreshTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface TwoFactorSetup {
  secret: string;
  qr_code: string;
  backup_codes: string[];
}

export interface PasswordChange {
  current_password: string;
  new_password: string;
}

export interface SwitchCompanyRequest {
  company_id: number;
}

export interface SwitchCompanyResponse {
  message: string;
  company_id: number;
  permissions: string[];
  role: string | null;
}

export interface PermissionsResponse {
  permissions: string[];
  role: string | null;
  is_superuser: boolean;
}

// API Functions
export const authApi = {
  /**
   * Login with username/email and password
   */
  login: (data: LoginRequest): Promise<LoginResponse> =>
    apiClient.post("/api/v1/auth/login", data),

  /**
   * Refresh access token using refresh token
   */
  refresh: (refreshToken: string): Promise<RefreshTokenResponse> =>
    apiClient.post("/api/v1/auth/refresh", { refresh_token: refreshToken }),

  /**
   * Logout current user
   */
  logout: (): Promise<{ message: string }> =>
    apiClient.post("/api/v1/auth/logout"),

  /**
   * Get current user info
   */
  me: (): Promise<UserInfo> =>
    apiClient.get("/api/v1/auth/me"),

  /**
   * Get current user's permissions for current company
   */
  permissions: (): Promise<PermissionsResponse> =>
    apiClient.get("/api/v1/auth/permissions"),

  /**
   * Switch to a different company
   */
  switchCompany: (data: SwitchCompanyRequest): Promise<SwitchCompanyResponse> =>
    apiClient.post("/api/v1/auth/switch-company", data),

  /**
   * Change current user's password
   */
  changePassword: (data: PasswordChange): Promise<{ message: string }> =>
    apiClient.post("/api/v1/auth/change-password", data),

  /**
   * Set up two-factor authentication
   */
  setup2FA: (): Promise<TwoFactorSetup> =>
    apiClient.post("/api/v1/auth/2fa/setup"),

  /**
   * Verify 2FA code and enable 2FA
   */
  verify2FA: (code: string): Promise<{ message: string }> =>
    apiClient.post("/api/v1/auth/2fa/verify", { code }),

  /**
   * Disable two-factor authentication
   */
  disable2FA: (code: string): Promise<{ message: string }> =>
    apiClient.post("/api/v1/auth/2fa/disable", { code }),
};

export default authApi;
