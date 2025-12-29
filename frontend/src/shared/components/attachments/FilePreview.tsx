'use client';

/**
 * FilePreview Component
 *
 * Preview modal for various file types.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  File,
  FileText,
  FileAudio,
  FileVideo,
} from 'lucide-react';
import { formatBytes } from '@/shared/hooks/useFileUpload';
import { Attachment } from './AttachmentUploader';

export interface FilePreviewProps {
  /** Attachment to preview */
  attachment: Attachment | null;
  /** List of all attachments for navigation */
  attachments?: Attachment[];
  /** Whether preview is open */
  open: boolean;
  /** Callback when preview is closed */
  onClose: () => void;
  /** Callback when navigating to previous/next */
  onNavigate?: (attachment: Attachment, direction: 'prev' | 'next') => void;
  /** Callback when download is clicked */
  onDownload?: (attachment: Attachment) => void;
  /** CSS class name */
  className?: string;
}

export function FilePreview({
  attachment,
  attachments = [],
  open,
  onClose,
  onNavigate,
  onDownload,
  className,
}: FilePreviewProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Reset state when attachment changes
  useEffect(() => {
    setZoom(1);
    setRotation(0);
  }, [attachment?.id]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          handlePrev();
          break;
        case 'ArrowRight':
          handleNext();
          break;
        case '+':
        case '=':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleZoomIn();
          }
          break;
        case '-':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleZoomOut();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, attachments, attachment]);

  const currentIndex = attachment
    ? attachments.findIndex((a) => a.id === attachment.id)
    : -1;

  const canNavigate = attachments.length > 1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < attachments.length - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev && attachments[currentIndex - 1]) {
      onNavigate?.(attachments[currentIndex - 1], 'prev');
    }
  }, [hasPrev, currentIndex, attachments, onNavigate]);

  const handleNext = useCallback(() => {
    if (hasNext && attachments[currentIndex + 1]) {
      onNavigate?.(attachments[currentIndex + 1], 'next');
    }
  }, [hasNext, currentIndex, attachments, onNavigate]);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - 0.25, 0.5));
  }, []);

  const handleRotate = useCallback(() => {
    setRotation((r) => (r + 90) % 360);
  }, []);

  const handleDownload = useCallback(() => {
    if (attachment) {
      if (onDownload) {
        onDownload(attachment);
      } else {
        const link = document.createElement('a');
        link.href = attachment.url;
        link.download = attachment.original_filename || attachment.filename;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  }, [attachment, onDownload]);

  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  if (!attachment) {
    return null;
  }

  const isImage = attachment.mime_type.startsWith('image/');
  const isPdf = attachment.mime_type === 'application/pdf';
  const isVideo = attachment.mime_type.startsWith('video/');
  const isAudio = attachment.mime_type.startsWith('audio/');

  const renderPreview = () => {
    if (isImage) {
      return (
        <div className="flex h-full items-center justify-center overflow-auto p-4">
          <img
            src={attachment.url}
            alt={attachment.original_filename || attachment.filename}
            className="max-h-full max-w-full object-contain transition-transform duration-200"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
            }}
          />
        </div>
      );
    }

    if (isPdf) {
      return (
        <iframe
          src={attachment.url}
          className="h-full w-full border-0"
          title={attachment.original_filename || attachment.filename}
        />
      );
    }

    if (isVideo) {
      return (
        <div className="flex h-full items-center justify-center p-4">
          <video
            src={attachment.url}
            controls
            className="max-h-full max-w-full"
            style={{
              transform: `scale(${zoom})`,
            }}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    if (isAudio) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-4">
          <FileAudio className="h-24 w-24 text-muted-foreground" />
          <audio src={attachment.url} controls className="w-full max-w-md">
            Your browser does not support the audio tag.
          </audio>
        </div>
      );
    }

    // Fallback for unsupported types
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-4">
        <File className="h-24 w-24 text-muted-foreground" />
        <p className="text-center text-muted-foreground">
          Preview not available for this file type.
          <br />
          Click download to view the file.
        </p>
        <Button onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" />
          Download File
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className={cn(
          'flex max-h-[90vh] max-w-[90vw] flex-col p-0',
          className,
        )}
      >
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between border-b px-4 py-3">
          <div className="flex-1 overflow-hidden">
            <DialogTitle className="truncate text-sm font-medium">
              {attachment.original_filename || attachment.filename}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              {formatBytes(attachment.size)} • {attachment.mime_type}
              {canNavigate && (
                <span className="ml-2">
                  {currentIndex + 1} of {attachments.length}
                </span>
              )}
            </p>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-1">
            {isImage && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.5}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="min-w-[3rem] text-center text-xs">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleZoomIn}
                  disabled={zoom >= 3}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleRotate}
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleFullscreen}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Preview area */}
        <div className="relative min-h-[400px] flex-1 bg-muted/20">
          {renderPreview()}

          {/* Navigation arrows */}
          {canNavigate && (
            <>
              <Button
                variant="secondary"
                size="icon"
                className="absolute left-4 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full opacity-75 hover:opacity-100"
                onClick={handlePrev}
                disabled={!hasPrev}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="absolute right-4 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full opacity-75 hover:opacity-100"
                onClick={handleNext}
                disabled={!hasNext}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default FilePreview;
