'use client';

/**
 * AttachmentUploader Component
 *
 * Drag-and-drop file upload with progress indication.
 */

import React, { useCallback, useState, useRef } from 'react';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/components/ui/button';
import { Progress } from '@/shared/components/ui/progress';
import { Upload, X, File, Image, FileText } from 'lucide-react';
import { useFileUpload, formatBytes } from '@/shared/hooks/useFileUpload';

export interface Attachment {
  id: number;
  filename: string;
  original_filename?: string;
  mime_type: string;
  size: number;
  url: string;
  thumbnail_url?: string;
  created_at?: string;
}

export interface AttachmentUploaderProps {
  /** Upload action URL */
  action?: string;
  /** Already uploaded attachments */
  value?: Attachment[];
  /** Callback when attachments change */
  onChange?: (attachments: Attachment[]) => void;
  /** Callback when upload completes */
  onUpload?: (attachment: Attachment) => void;
  /** Callback when attachment is removed */
  onRemove?: (index: number, attachment: Attachment) => void;
  /** Callback on error */
  onError?: (error: Error, file: File) => void;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Maximum number of files */
  maxCount?: number;
  /** Accepted file types */
  accept?: string[];
  /** Show as compact button */
  compact?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Enable multiple file selection */
  multiple?: boolean;
  /** Additional form data */
  data?: Record<string, string>;
  /** Additional headers */
  headers?: Record<string, string>;
  /** CSS class name */
  className?: string;
}

export function AttachmentUploader({
  action = '/api/v1/attachments/upload',
  value = [],
  onChange,
  onUpload,
  onRemove,
  onError,
  maxSize = 10 * 1024 * 1024, // 10MB
  maxCount = 10,
  accept,
  compact = false,
  disabled = false,
  multiple = true,
  data = {},
  headers = {},
  className,
}: AttachmentUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<
    { file: File; progress: number; error?: string }[]
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { upload, isUploading, progress, error, validate } = useFileUpload({
    url: action,
    maxSize,
    accept,
    data,
    headers: {
      Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('accessToken') : ''}`,
      ...headers,
    },
  });

  const canUpload = !disabled && value.length < maxCount;
  const remainingSlots = maxCount - value.length;

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files).slice(0, remainingSlots);

      for (const file of fileArray) {
        // Add to uploading list
        setUploadingFiles((prev) => [...prev, { file, progress: 0 }]);

        const result = await upload(file);

        if (result.success && result.data) {
          const attachment = (result.data as { attachment?: Attachment }).attachment || result.data as Attachment;
          const newAttachments = [...value, attachment];
          onChange?.(newAttachments);
          onUpload?.(attachment);
        } else {
          onError?.(new Error(result.error || 'Upload failed'), file);
        }

        // Remove from uploading list
        setUploadingFiles((prev) =>
          prev.filter((f) => f.file !== file),
        );
      }
    },
    [upload, value, onChange, onUpload, onError, remainingSlots],
  );

  const handleRemove = useCallback(
    (index: number) => {
      const attachment = value[index];
      const newAttachments = [...value];
      newAttachments.splice(index, 1);
      onChange?.(newAttachments);
      onRemove?.(index, attachment);
    },
    [value, onChange, onRemove],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (canUpload) {
        setDragOver(true);
      }
    },
    [canUpload],
  );

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (canUpload && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [canUpload, handleFiles],
  );

  const handleClick = useCallback(() => {
    if (canUpload) {
      fileInputRef.current?.click();
    }
  }, [canUpload]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files);
        e.target.value = '';
      }
    },
    [handleFiles],
  );

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    }
    if (mimeType === 'application/pdf') {
      return <FileText className="h-4 w-4" />;
    }
    return <File className="h-4 w-4" />;
  };

  // Hidden file input
  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      className="hidden"
      accept={accept?.join(',')}
      multiple={multiple}
      onChange={handleInputChange}
      disabled={!canUpload}
    />
  );

  // Compact mode: Button only
  if (compact) {
    return (
      <div className={cn('space-y-2', className)}>
        {fileInput}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canUpload}
          onClick={handleClick}
        >
          <Upload className="mr-2 h-4 w-4" />
          Attach
          {value.length > 0 && (
            <span className="ml-1 text-muted-foreground">
              ({value.length})
            </span>
          )}
        </Button>

        {/* Uploaded files list */}
        {value.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {value.map((attachment, index) => (
              <div
                key={attachment.id || index}
                className="flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-1 text-xs"
              >
                {getFileIcon(attachment.mime_type)}
                <span className="max-w-[120px] truncate">
                  {attachment.original_filename || attachment.filename}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="ml-1 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload progress */}
        {uploadingFiles.length > 0 && (
          <div className="space-y-1">
            {uploadingFiles.map((item, index) => (
              <div key={index} className="text-xs">
                <span className="truncate">{item.file.name}</span>
                <Progress value={progress.percentage} className="h-1" />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full mode: Drag and drop area
  return (
    <div className={cn('space-y-4', className)}>
      {fileInput}

      {/* Drop zone */}
      <div
        className={cn(
          'relative rounded-lg border-2 border-dashed p-8 text-center transition-colors',
          dragOver && 'border-primary bg-primary/5',
          !canUpload && 'cursor-not-allowed opacity-50',
          canUpload && 'cursor-pointer hover:border-primary/50',
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="mt-4 text-sm font-medium">
          Drag files here or click to upload
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Max {formatBytes(maxSize)} per file, up to {remainingSlots} more files
        </p>
      </div>

      {/* Upload progress */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((item, index) => (
            <div
              key={index}
              className="rounded-md border bg-muted/50 p-3"
            >
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="truncate">{item.file.name}</span>
                <span className="text-muted-foreground">
                  {progress.percentage}%
                </span>
              </div>
              <Progress value={progress.percentage} />
            </div>
          ))}
        </div>
      )}

      {/* Uploaded files list */}
      {value.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {value.map((attachment, index) => (
            <div
              key={attachment.id || index}
              className="flex items-center justify-between rounded-md border bg-card p-3"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                {getFileIcon(attachment.mime_type)}
                <div className="overflow-hidden">
                  <p className="truncate text-sm font-medium">
                    {attachment.original_filename || attachment.filename}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(attachment.size)}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => handleRemove(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AttachmentUploader;
