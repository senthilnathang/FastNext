"use client";

/**
 * FilePreview Component (Inbox variant)
 *
 * A file preview modal with image zoom, PDF preview,
 * download button, file info display, and navigation for multiple files.
 */

import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  File,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  Maximize2,
  Minimize2,
  RotateCw,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import * as React from "react";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils";

export interface PreviewFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size?: number;
  createdAt?: Date | string;
  metadata?: Record<string, unknown>;
}

export interface InboxFilePreviewProps {
  /** File to preview */
  file: PreviewFile | null;
  /** List of all files for navigation */
  files?: PreviewFile[];
  /** Whether preview is open */
  open: boolean;
  /** Callback when preview is closed */
  onClose: () => void;
  /** Callback when navigating to another file */
  onNavigate?: (file: PreviewFile, direction: "prev" | "next") => void;
  /** Callback when download is clicked */
  onDownload?: (file: PreviewFile) => void;
  /** CSS class name */
  className?: string;
}

// Format file size to human readable
function formatFileSize(bytes?: number): string {
  if (!bytes) return "Unknown size";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// Get file type category
function getFileCategory(type: string): "image" | "pdf" | "video" | "audio" | "document" | "other" {
  if (type.startsWith("image/")) return "image";
  if (type === "application/pdf") return "pdf";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  if (
    type.includes("document") ||
    type.includes("text") ||
    type.includes("spreadsheet") ||
    type.includes("presentation")
  ) {
    return "document";
  }
  return "other";
}

// Get file icon based on type
function getFileIcon(type: string) {
  const category = getFileCategory(type);
  switch (category) {
    case "image":
      return FileImage;
    case "video":
      return FileVideo;
    case "audio":
      return FileAudio;
    case "pdf":
    case "document":
      return FileText;
    default:
      return File;
  }
}

export function InboxFilePreview({
  file,
  files = [],
  open,
  onClose,
  onNavigate,
  onDownload,
  className,
}: InboxFilePreviewProps) {
  const [zoom, setZoom] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Reset state when file changes
  React.useEffect(() => {
    setZoom(1);
    setRotation(0);
    setImageError(false);
  }, [file?.id]);

  // Handle keyboard navigation
  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          handlePrev();
          break;
        case "ArrowRight":
          handleNext();
          break;
        case "+":
        case "=":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleZoomIn();
          }
          break;
        case "-":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleZoomOut();
          }
          break;
        case "r":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleRotate();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, files, file]);

  // Handle fullscreen changes
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const currentIndex = file ? files.findIndex((f) => f.id === file.id) : -1;
  const canNavigate = files.length > 1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < files.length - 1;

  const handlePrev = React.useCallback(() => {
    if (hasPrev && files[currentIndex - 1]) {
      onNavigate?.(files[currentIndex - 1], "prev");
    }
  }, [hasPrev, currentIndex, files, onNavigate]);

  const handleNext = React.useCallback(() => {
    if (hasNext && files[currentIndex + 1]) {
      onNavigate?.(files[currentIndex + 1], "next");
    }
  }, [hasNext, currentIndex, files, onNavigate]);

  const handleZoomIn = React.useCallback(() => {
    setZoom((z) => Math.min(z + 0.25, 4));
  }, []);

  const handleZoomOut = React.useCallback(() => {
    setZoom((z) => Math.max(z - 0.25, 0.25));
  }, []);

  const handleRotate = React.useCallback(() => {
    setRotation((r) => (r + 90) % 360);
  }, []);

  const handleResetZoom = React.useCallback(() => {
    setZoom(1);
    setRotation(0);
  }, []);

  const handleDownload = React.useCallback(() => {
    if (file) {
      if (onDownload) {
        onDownload(file);
      } else {
        const link = document.createElement("a");
        link.href = file.url;
        link.download = file.name;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  }, [file, onDownload]);

  const handleFullscreen = React.useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
  }, []);

  if (!file) {
    return null;
  }

  const category = getFileCategory(file.type);
  const FileIcon = getFileIcon(file.type);

  const renderPreview = () => {
    if (category === "image" && !imageError) {
      return (
        <div className="flex h-full items-center justify-center overflow-auto p-4">
          <img
            src={file.url}
            alt={file.name}
            className="max-h-full max-w-full object-contain transition-transform duration-200"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
            }}
            onError={() => setImageError(true)}
            draggable={false}
          />
        </div>
      );
    }

    if (category === "pdf") {
      return (
        <iframe
          src={file.url}
          className="h-full w-full border-0"
          title={file.name}
        />
      );
    }

    if (category === "video") {
      return (
        <div className="flex h-full items-center justify-center p-4">
          <video
            src={file.url}
            controls
            className="max-h-full max-w-full"
            style={{ transform: `scale(${zoom})` }}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    if (category === "audio") {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-6 p-4">
          <FileAudio className="h-24 w-24 text-muted-foreground" />
          <audio src={file.url} controls className="w-full max-w-md">
            Your browser does not support the audio tag.
          </audio>
        </div>
      );
    }

    // Fallback for unsupported types
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <FileIcon className="h-24 w-24 text-muted-foreground" />
        <div>
          <p className="font-medium">{file.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Preview not available for this file type.
          </p>
          <p className="text-sm text-muted-foreground">
            Click download to view the file.
          </p>
        </div>
        <Button onClick={handleDownload} className="mt-4">
          <Download className="mr-2 h-4 w-4" />
          Download File
        </Button>
      </div>
    );
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/80",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          )}
        />
        <DialogPrimitive.Content
          ref={containerRef}
          className={cn(
            "fixed inset-4 z-50 flex flex-col overflow-hidden rounded-lg border bg-background shadow-lg",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            isFullscreen && "inset-0 rounded-none",
            className
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <FileIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <DialogPrimitive.Title className="truncate text-sm font-medium">
                  {file.name}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)} {file.type && ` - ${file.type}`}
                  {canNavigate && (
                    <span className="ml-2">
                      {currentIndex + 1} of {files.length}
                    </span>
                  )}
                </DialogPrimitive.Description>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-1">
              {category === "image" && !imageError && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleZoomOut}
                    disabled={zoom <= 0.25}
                    title="Zoom out (Ctrl+-)"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <button
                    type="button"
                    onClick={handleResetZoom}
                    className="min-w-[3rem] rounded px-1 py-0.5 text-center text-xs hover:bg-accent"
                    title="Reset zoom"
                  >
                    {Math.round(zoom * 100)}%
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleZoomIn}
                    disabled={zoom >= 4}
                    title="Zoom in (Ctrl++)"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleRotate}
                    title="Rotate (Ctrl+R)"
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                  <div className="mx-1 h-6 w-px bg-border" />
                </>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleFullscreen}
                title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleDownload}
                title="Download"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onClose}
                title="Close (Esc)"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Preview area */}
          <div className="relative flex-1 bg-muted/30">
            {renderPreview()}

            {/* Navigation arrows */}
            {canNavigate && (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  className={cn(
                    "absolute left-4 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full shadow-md",
                    "opacity-75 transition-opacity hover:opacity-100",
                    !hasPrev && "invisible"
                  )}
                  onClick={handlePrev}
                  disabled={!hasPrev}
                  title="Previous (Left arrow)"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className={cn(
                    "absolute right-4 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full shadow-md",
                    "opacity-75 transition-opacity hover:opacity-100",
                    !hasNext && "invisible"
                  )}
                  onClick={handleNext}
                  disabled={!hasNext}
                  title="Next (Right arrow)"
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}
          </div>

          {/* File info footer (optional, for additional metadata) */}
          {file.createdAt && (
            <div className="border-t px-4 py-2 text-xs text-muted-foreground">
              Created:{" "}
              {typeof file.createdAt === "string"
                ? file.createdAt
                : file.createdAt.toLocaleString()}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export default InboxFilePreview;
