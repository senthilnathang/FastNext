'use client';

/**
 * File Upload Hook
 *
 * Provides file upload functionality with progress tracking and validation.
 *
 * Usage:
 * ```tsx
 * import { useFileUpload } from '@/shared/hooks/useFileUpload';
 *
 * const { upload, progress, isUploading, error } = useFileUpload({
 *   url: '/api/upload',
 *   maxSize: 5 * 1024 * 1024, // 5MB
 *   accept: ['image/*', '.pdf'],
 * });
 *
 * const result = await upload(file);
 * ```
 */

import { useCallback, useRef, useState } from 'react';

export interface FileUploadOptions {
  /** Upload endpoint URL */
  url: string;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Accepted file types (MIME types or extensions) */
  accept?: string[];
  /** Additional form data fields */
  data?: Record<string, string>;
  /** Request headers */
  headers?: Record<string, string>;
  /** Field name for the file */
  fieldName?: string;
  /** Whether to include credentials */
  withCredentials?: boolean;
}

export interface UploadProgress {
  /** Bytes uploaded */
  loaded: number;
  /** Total bytes */
  total: number;
  /** Progress percentage (0-100) */
  percentage: number;
}

export interface UploadResult {
  /** Whether upload was successful */
  success: boolean;
  /** Response data */
  data?: unknown;
  /** Error message if failed */
  error?: string;
  /** File that was uploaded */
  file: File;
}

export interface FileValidationError {
  type: 'size' | 'type' | 'custom';
  message: string;
  file: File;
}

export interface UseFileUploadReturn {
  /** Upload a file */
  upload: (file: File) => Promise<UploadResult>;
  /** Upload multiple files */
  uploadMultiple: (files: File[]) => Promise<UploadResult[]>;
  /** Current upload progress */
  progress: UploadProgress;
  /** Whether upload is in progress */
  isUploading: boolean;
  /** Current error */
  error: string | null;
  /** Validate a file */
  validate: (file: File) => FileValidationError | null;
  /** Abort current upload */
  abort: () => void;
  /** Reset state */
  reset: () => void;
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Get file extension
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

/**
 * Check if file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Get image dimensions
 */
export function getImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    if (!isImageFile(file)) {
      reject(new Error('Not an image file'));
      return;
    }

    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      reject(new Error('Failed to load image'));
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Create file preview URL
 */
export function createPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Revoke file preview URL
 */
export function revokePreviewUrl(url: string): void {
  URL.revokeObjectURL(url);
}

/**
 * File upload hook
 */
export function useFileUpload(options: FileUploadOptions): UseFileUploadReturn {
  const {
    url,
    maxSize,
    accept,
    data = {},
    headers = {},
    fieldName = 'file',
    withCredentials = false,
  } = options;

  const [progress, setProgress] = useState<UploadProgress>({
    loaded: 0,
    total: 0,
    percentage: 0,
  });

  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const xhrRef = useRef<XMLHttpRequest | null>(null);

  /**
   * Validate file
   */
  const validate = useCallback(
    (file: File): FileValidationError | null => {
      // Size check
      if (maxSize && file.size > maxSize) {
        return {
          type: 'size',
          message: `File size exceeds ${formatBytes(maxSize)}`,
          file,
        };
      }

      // Type check
      if (accept && accept.length > 0) {
        const isValid = accept.some((type) => {
          if (type.startsWith('.')) {
            return file.name.toLowerCase().endsWith(type.toLowerCase());
          }
          if (type.endsWith('/*')) {
            const category = type.replace('/*', '');
            return file.type.startsWith(category);
          }
          return file.type === type;
        });

        if (!isValid) {
          return {
            type: 'type',
            message: `Invalid file type. Accepted: ${accept.join(', ')}`,
            file,
          };
        }
      }

      return null;
    },
    [maxSize, accept],
  );

  /**
   * Upload a single file
   */
  const upload = useCallback(
    async (file: File): Promise<UploadResult> => {
      // Validate
      const validationError = validate(file);
      if (validationError) {
        setError(validationError.message);
        return {
          success: false,
          error: validationError.message,
          file,
        };
      }

      setIsUploading(true);
      setError(null);
      setProgress({ loaded: 0, total: file.size, percentage: 0 });

      return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;

        // Progress handler
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setProgress({
              loaded: event.loaded,
              total: event.total,
              percentage: Math.round((event.loaded / event.total) * 100),
            });
          }
        };

        // Complete handler
        xhr.onload = () => {
          setIsUploading(false);
          xhrRef.current = null;

          if (xhr.status >= 200 && xhr.status < 300) {
            let responseData;
            try {
              responseData = JSON.parse(xhr.responseText);
            } catch {
              responseData = xhr.responseText;
            }

            resolve({
              success: true,
              data: responseData,
              file,
            });
          } else {
            const errorMsg = `Upload failed: ${xhr.statusText}`;
            setError(errorMsg);
            resolve({
              success: false,
              error: errorMsg,
              file,
            });
          }
        };

        // Error handler
        xhr.onerror = () => {
          setIsUploading(false);
          xhrRef.current = null;
          const errorMsg = 'Network error during upload';
          setError(errorMsg);
          resolve({
            success: false,
            error: errorMsg,
            file,
          });
        };

        // Abort handler
        xhr.onabort = () => {
          setIsUploading(false);
          xhrRef.current = null;
          const errorMsg = 'Upload aborted';
          setError(errorMsg);
          resolve({
            success: false,
            error: errorMsg,
            file,
          });
        };

        // Build form data
        const formData = new FormData();
        formData.append(fieldName, file);

        // Add additional data
        Object.entries(data).forEach(([key, value]) => {
          formData.append(key, value);
        });

        // Send request
        xhr.open('POST', url, true);
        xhr.withCredentials = withCredentials;

        // Set headers
        Object.entries(headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });

        xhr.send(formData);
      });
    },
    [url, data, headers, fieldName, withCredentials, validate],
  );

  /**
   * Upload multiple files
   */
  const uploadMultiple = useCallback(
    async (files: File[]): Promise<UploadResult[]> => {
      const results: UploadResult[] = [];

      for (const file of files) {
        const result = await upload(file);
        results.push(result);
      }

      return results;
    },
    [upload],
  );

  /**
   * Abort current upload
   */
  const abort = useCallback(() => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
  }, []);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    abort();
    setProgress({ loaded: 0, total: 0, percentage: 0 });
    setIsUploading(false);
    setError(null);
  }, [abort]);

  return {
    upload,
    uploadMultiple,
    progress,
    isUploading,
    error,
    validate,
    abort,
    reset,
  };
}

export default useFileUpload;
