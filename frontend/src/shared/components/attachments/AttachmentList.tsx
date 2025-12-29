'use client';

/**
 * AttachmentList Component
 *
 * Displays a list of attachments with preview and download options.
 */

import React, { useCallback, useState } from 'react';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/components/ui/button';
import {
  Download,
  Eye,
  Trash2,
  File,
  Image,
  FileText,
  FileSpreadsheet,
  FileVideo,
  FileAudio,
  Archive,
  ExternalLink,
} from 'lucide-react';
import { formatBytes } from '@/shared/hooks/useFileUpload';
import { Attachment } from './AttachmentUploader';

export interface AttachmentListProps {
  /** List of attachments */
  attachments: Attachment[];
  /** Callback when attachment is removed */
  onRemove?: (index: number, attachment: Attachment) => void;
  /** Callback when attachment is previewed */
  onPreview?: (attachment: Attachment) => void;
  /** Callback when attachment is downloaded */
  onDownload?: (attachment: Attachment) => void;
  /** Enable remove functionality */
  removable?: boolean;
  /** Enable preview functionality */
  previewable?: boolean;
  /** Enable download functionality */
  downloadable?: boolean;
  /** Display mode */
  variant?: 'list' | 'grid' | 'compact';
  /** Show file size */
  showSize?: boolean;
  /** Show file type icon */
  showIcon?: boolean;
  /** CSS class name */
  className?: string;
}

/**
 * Get icon for file type
 */
function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) {
    return <Image className="h-5 w-5 text-blue-500" />;
  }
  if (mimeType === 'application/pdf') {
    return <FileText className="h-5 w-5 text-red-500" />;
  }
  if (
    mimeType.includes('spreadsheet') ||
    mimeType.includes('excel') ||
    mimeType === 'text/csv'
  ) {
    return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
  }
  if (mimeType.startsWith('video/')) {
    return <FileVideo className="h-5 w-5 text-purple-500" />;
  }
  if (mimeType.startsWith('audio/')) {
    return <FileAudio className="h-5 w-5 text-orange-500" />;
  }
  if (
    mimeType.includes('zip') ||
    mimeType.includes('tar') ||
    mimeType.includes('rar') ||
    mimeType.includes('7z')
  ) {
    return <Archive className="h-5 w-5 text-yellow-600" />;
  }
  return <File className="h-5 w-5 text-gray-500" />;
}

/**
 * Check if file type supports preview
 */
function isPreviewable(mimeType: string): boolean {
  return (
    mimeType.startsWith('image/') ||
    mimeType === 'application/pdf' ||
    mimeType.startsWith('video/') ||
    mimeType.startsWith('audio/')
  );
}

export function AttachmentList({
  attachments,
  onRemove,
  onPreview,
  onDownload,
  removable = true,
  previewable = true,
  downloadable = true,
  variant = 'list',
  showSize = true,
  showIcon = true,
  className,
}: AttachmentListProps) {
  const handleRemove = useCallback(
    (index: number, attachment: Attachment) => {
      onRemove?.(index, attachment);
    },
    [onRemove],
  );

  const handlePreview = useCallback(
    (attachment: Attachment) => {
      if (previewable && isPreviewable(attachment.mime_type)) {
        onPreview?.(attachment);
      }
    },
    [onPreview, previewable],
  );

  const handleDownload = useCallback(
    (attachment: Attachment) => {
      if (onDownload) {
        onDownload(attachment);
      } else {
        // Default download behavior
        const link = document.createElement('a');
        link.href = attachment.url;
        link.download = attachment.original_filename || attachment.filename;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    },
    [onDownload],
  );

  if (attachments.length === 0) {
    return null;
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className={cn('flex flex-wrap gap-2', className)}>
        {attachments.map((attachment, index) => (
          <div
            key={attachment.id || index}
            className="flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-1 text-xs"
          >
            {showIcon && getFileIcon(attachment.mime_type)}
            <span className="max-w-[120px] truncate">
              {attachment.original_filename || attachment.filename}
            </span>
            {downloadable && (
              <button
                type="button"
                onClick={() => handleDownload(attachment)}
                className="ml-1 text-muted-foreground hover:text-primary"
              >
                <Download className="h-3 w-3" />
              </button>
            )}
            {removable && (
              <button
                type="button"
                onClick={() => handleRemove(index, attachment)}
                className="ml-1 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Grid variant
  if (variant === 'grid') {
    return (
      <div
        className={cn(
          'grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
          className,
        )}
      >
        {attachments.map((attachment, index) => (
          <div
            key={attachment.id || index}
            className="group relative overflow-hidden rounded-lg border bg-card"
          >
            {/* Thumbnail or Icon */}
            <div className="flex aspect-square items-center justify-center bg-muted/50">
              {attachment.thumbnail_url ? (
                <img
                  src={attachment.thumbnail_url}
                  alt={attachment.original_filename || attachment.filename}
                  className="h-full w-full object-cover"
                />
              ) : attachment.mime_type.startsWith('image/') ? (
                <img
                  src={attachment.url}
                  alt={attachment.original_filename || attachment.filename}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2">
                  {getFileIcon(attachment.mime_type)}
                  <span className="text-xs text-muted-foreground uppercase">
                    {attachment.mime_type.split('/')[1]?.slice(0, 4)}
                  </span>
                </div>
              )}
            </div>

            {/* File info */}
            <div className="p-2">
              <p className="truncate text-sm font-medium">
                {attachment.original_filename || attachment.filename}
              </p>
              {showSize && (
                <p className="text-xs text-muted-foreground">
                  {formatBytes(attachment.size)}
                </p>
              )}
            </div>

            {/* Hover actions */}
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              {previewable && isPreviewable(attachment.mime_type) && (
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8"
                  onClick={() => handlePreview(attachment)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              {downloadable && (
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8"
                  onClick={() => handleDownload(attachment)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
              {removable && (
                <Button
                  size="icon"
                  variant="destructive"
                  className="h-8 w-8"
                  onClick={() => handleRemove(index, attachment)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // List variant (default)
  return (
    <div className={cn('space-y-2', className)}>
      {attachments.map((attachment, index) => (
        <div
          key={attachment.id || index}
          className="flex items-center justify-between rounded-md border bg-card p-3"
        >
          <div className="flex items-center gap-3 overflow-hidden">
            {showIcon && getFileIcon(attachment.mime_type)}
            <div className="overflow-hidden">
              <p className="truncate text-sm font-medium">
                {attachment.original_filename || attachment.filename}
              </p>
              {showSize && (
                <p className="text-xs text-muted-foreground">
                  {formatBytes(attachment.size)}
                  {attachment.created_at && (
                    <span className="ml-2">
                      {new Date(attachment.created_at).toLocaleDateString()}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {previewable && isPreviewable(attachment.mime_type) && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handlePreview(attachment)}
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            {downloadable && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleDownload(attachment)}
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            {removable && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => handleRemove(index, attachment)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default AttachmentList;
