/**
 * Attachments API Client
 * Matches backend API schema
 */

import { apiClient } from "./client";

// Types matching backend

export interface Attachment {
  id: number;
  filename: string;
  original_filename: string;
  mime_type: string;
  size: number;
  human_size: string;
  is_image: boolean;
  is_video: boolean;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  url?: string | null;
  thumbnail_url?: string | null;
  created_at: string;
}

export interface AttachmentUploadResponse {
  attachment: Attachment;
  message: string;
}

export interface AttachmentListParams {
  attachable_type: string;
  attachable_id: number;
  [key: string]: string | number | boolean | undefined;
}

export interface PaginatedAttachments {
  items: Attachment[];
  total: number;
}

export interface DownloadUrlResponse {
  url: string;
  expires_in: number;
  filename: string;
}

export interface BulkDeleteResponse {
  deleted_count: number;
  message: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// API Functions
export const attachmentsApi = {
  /**
   * List attachments for an entity
   */
  list: (params: AttachmentListParams): Promise<Attachment[]> =>
    apiClient.get("/api/v1/attachments/", params),

  /**
   * Get a specific attachment
   */
  get: (attachmentId: number): Promise<Attachment> =>
    apiClient.get(`/api/v1/attachments/${attachmentId}`),

  /**
   * Upload a file attachment (multipart FormData)
   */
  upload: async (
    file: File,
    attachableType: string,
    attachableId: number
  ): Promise<AttachmentUploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("attachable_type", attachableType);
    formData.append("attachable_id", String(attachableId));

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token")
        : null;

    const headers: HeadersInit = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/attachments/upload`, {
      method: "POST",
      headers,
      credentials: "include",
      body: formData,
    });

    if (!response.ok) {
      let detail = "Upload failed";
      try {
        const data = await response.json();
        detail = data.detail || detail;
      } catch {
        // ignore parse error
      }
      throw { detail, status: response.status };
    }

    return response.json();
  },

  /**
   * Get a presigned download URL for an attachment
   */
  download: (
    attachmentId: number,
    expiresIn?: number
  ): Promise<DownloadUrlResponse> =>
    apiClient.get(
      `/api/v1/attachments/${attachmentId}/download`,
      expiresIn ? { expires_in: expiresIn } : undefined
    ),

  /**
   * Delete an attachment
   */
  delete: (attachmentId: number, hardDelete?: boolean): Promise<void> =>
    apiClient.delete(
      `/api/v1/attachments/${attachmentId}${hardDelete ? "?hard_delete=true" : ""}`
    ),

  /**
   * Bulk delete attachments
   */
  bulkDelete: (
    attachmentIds: number[],
    hardDelete?: boolean
  ): Promise<BulkDeleteResponse> =>
    apiClient.post(
      `/api/v1/attachments/bulk-delete${hardDelete ? "?hard_delete=true" : ""}`,
      attachmentIds
    ),
};

export default attachmentsApi;
