'use client';

/**
 * ImagePreview Component
 *
 * Lightweight image gallery with zoom and navigation.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/components/ui/button';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
} from 'lucide-react';

export interface ImageItem {
  /** Image URL */
  src: string;
  /** Alt text */
  alt?: string;
  /** Thumbnail URL */
  thumbnail?: string;
  /** Caption */
  caption?: string;
}

export interface ImagePreviewProps {
  /** Images to display */
  images: ImageItem[];
  /** Initial index to show */
  initialIndex?: number;
  /** Whether preview is open */
  open: boolean;
  /** Callback when preview is closed */
  onClose: () => void;
  /** Callback when index changes */
  onChange?: (index: number) => void;
  /** Enable zoom controls */
  zoomable?: boolean;
  /** Enable rotation */
  rotatable?: boolean;
  /** Enable download */
  downloadable?: boolean;
  /** CSS class name */
  className?: string;
}

export function ImagePreview({
  images,
  initialIndex = 0,
  open,
  onClose,
  onChange,
  zoomable = true,
  rotatable = true,
  downloadable = true,
  className,
}: ImagePreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Reset state when opening or changing index
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setZoom(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
    }
  }, [open, initialIndex]);

  // Reset zoom/rotation when changing images
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  }, [currentIndex]);

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
          if (zoomable) handleZoomIn();
          break;
        case '-':
          if (zoomable) handleZoomOut();
          break;
        case 'r':
          if (rotatable) handleRotate();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, currentIndex, zoomable, rotatable]);

  const currentImage = images[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      onChange?.(newIndex);
    }
  }, [hasPrev, currentIndex, onChange]);

  const handleNext = useCallback(() => {
    if (hasNext) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      onChange?.(newIndex);
    }
  }, [hasNext, currentIndex, onChange]);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + 0.5, 4));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => {
      const newZoom = Math.max(z - 0.5, 1);
      if (newZoom === 1) {
        setPosition({ x: 0, y: 0 });
      }
      return newZoom;
    });
  }, []);

  const handleRotate = useCallback(() => {
    setRotation((r) => (r + 90) % 360);
  }, []);

  const handleDownload = useCallback(() => {
    if (currentImage) {
      const link = document.createElement('a');
      link.href = currentImage.src;
      link.download = currentImage.alt || 'image';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [currentImage]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoom > 1) {
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
      }
    },
    [zoom, position],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    },
    [isDragging, dragStart],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (zoomable) {
        e.preventDefault();
        if (e.deltaY < 0) {
          handleZoomIn();
        } else {
          handleZoomOut();
        }
      }
    },
    [zoomable, handleZoomIn, handleZoomOut],
  );

  if (!open || !currentImage) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-black/90',
        className,
      )}
      onClick={onClose}
    >
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-4 top-4 z-10 h-10 w-10 text-white hover:bg-white/20"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Toolbar */}
      <div
        className="absolute top-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-lg bg-black/50 px-4 py-2"
        onClick={(e) => e.stopPropagation()}
      >
        {zoomable && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={handleZoomOut}
              disabled={zoom <= 1}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="min-w-[3rem] text-center text-sm text-white">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={handleZoomIn}
              disabled={zoom >= 4}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </>
        )}
        {rotatable && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={handleRotate}
          >
            <RotateCw className="h-4 w-4" />
          </Button>
        )}
        {downloadable && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Image */}
      <div
        className="flex h-full w-full items-center justify-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
      >
        <img
          src={currentImage.src}
          alt={currentImage.alt || ''}
          className="max-h-[85vh] max-w-[85vw] select-none object-contain transition-transform duration-200"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
          }}
          draggable={false}
        />
      </div>

      {/* Caption */}
      {currentImage.caption && (
        <div className="absolute bottom-20 left-1/2 z-10 -translate-x-1/2 rounded-lg bg-black/50 px-4 py-2">
          <p className="text-center text-sm text-white">{currentImage.caption}</p>
        </div>
      )}

      {/* Navigation */}
      {images.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 z-10 h-12 w-12 -translate-y-1/2 text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            disabled={!hasPrev}
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 z-10 h-12 w-12 -translate-y-1/2 text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            disabled={!hasNext}
          >
            <ChevronRight className="h-8 w-8" />
          </Button>

          {/* Thumbnails */}
          <div
            className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2 rounded-lg bg-black/50 p-2"
            onClick={(e) => e.stopPropagation()}
          >
            {images.map((image, index) => (
              <button
                key={index}
                className={cn(
                  'h-12 w-12 overflow-hidden rounded border-2 transition-all',
                  index === currentIndex
                    ? 'border-white'
                    : 'border-transparent opacity-50 hover:opacity-100',
                )}
                onClick={() => {
                  setCurrentIndex(index);
                  onChange?.(index);
                }}
              >
                <img
                  src={image.thumbnail || image.src}
                  alt={image.alt || ''}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </>
      )}

      {/* Counter */}
      {images.length > 1 && (
        <div className="absolute bottom-4 right-4 z-10 rounded bg-black/50 px-3 py-1 text-sm text-white">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );
}

export default ImagePreview;
