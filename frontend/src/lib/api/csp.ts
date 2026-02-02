/**
 * CSP API Client
 * Handles Content Security Policy reporting and status
 */

import { apiClient } from "./client";

// Types
export interface CSPReport {
  "csp-report": {
    "document-uri": string;
    "violated-directive": string;
    "blocked-uri": string;
    "source-file"?: string;
    "line-number"?: number;
  };
}

export interface CSPStatus {
  enabled: boolean;
  policy: string;
  report_only: boolean;
  report_uri: string;
  violations_count: number;
}

// API Functions
export const cspApi = {
  /**
   * Report a CSP violation
   */
  report: (data: CSPReport): Promise<void> =>
    apiClient.post("/api/v1/csp/csp-report", data),

  /**
   * Get CSP status and current policy
   */
  getStatus: (): Promise<CSPStatus> =>
    apiClient.get("/api/v1/csp/csp-status"),
};

export default cspApi;
