/**
 * Security API Client
 * Matches backend API schema
 */

import { apiClient } from "./client";

// Types matching backend

export interface SecuritySettings {
  login_notification: boolean;
  suspicious_activity_alerts: boolean;
  two_factor_enabled: boolean;
  last_password_change?: string | null;
  updated_at?: string | null;
}

export interface SecurityOverview {
  two_factor_enabled: boolean;
  login_notification: boolean;
  suspicious_activity_alerts: boolean;
  recent_violations: SecurityViolation[];
  recommendations: string[];
}

export interface TwoFactorSetupResponse {
  secret: string;
  qr_code_url: string;
  backup_codes: string[];
}

export interface SecurityViolation {
  id?: number;
  type: string;
  details: string;
  url?: string | null;
  created_at?: string;
}

export interface ReportViolationData {
  type: string;
  details: string;
  url?: string;
}

export interface UpdateSecuritySettingsData {
  login_notification?: boolean;
  suspicious_activity_alerts?: boolean;
}

export interface VerifyCodeData {
  code: string;
}

// API Functions
export const securityApi = {
  /**
   * Report security violations
   */
  reportViolation: (data: ReportViolationData): Promise<SecurityViolation> =>
    apiClient.post("/api/v1/security/violations", data),

  /**
   * Get current user security settings
   */
  getSettings: (): Promise<SecuritySettings> =>
    apiClient.get("/api/v1/security/settings"),

  /**
   * Update security settings
   */
  updateSettings: (data: UpdateSecuritySettingsData): Promise<SecuritySettings> =>
    apiClient.put("/api/v1/security/settings", data),

  /**
   * Setup two-factor authentication
   */
  setup2FA: (): Promise<TwoFactorSetupResponse> =>
    apiClient.post("/api/v1/security/2fa/setup"),

  /**
   * Verify 2FA code
   */
  verify2FA: (data: VerifyCodeData): Promise<{ message: string }> =>
    apiClient.post("/api/v1/security/2fa/verify", data),

  /**
   * Disable 2FA
   */
  disable2FA: (data: VerifyCodeData): Promise<{ message: string }> =>
    apiClient.post("/api/v1/security/2fa/disable", data),

  /**
   * Get security overview with recommendations
   */
  getOverview: (): Promise<SecurityOverview> =>
    apiClient.get("/api/v1/security/overview"),
};

export default securityApi;
