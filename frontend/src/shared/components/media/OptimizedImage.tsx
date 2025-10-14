"use client";

import Image, { type ImageProps } from "next/image";
import * as React from "react";
import { cn } from "@/shared/utils";

interface OptimizedImageProps extends Omit<ImageProps, "src" | "alt"> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  lazy?: boolean;
  showSkeleton?: boolean;
  skeletonClassName?: string;
  containerClassName?: string;
  aspectRatio?: "square" | "16/9" | "4/3" | "3/2" | "auto";
  objectFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
}

const aspectRatios = {
  square: "aspect-square",
  "16/9": "aspect-video",
  "4/3": "aspect-[4/3]",
  "3/2": "aspect-[3/2]",
  auto: "",
};

const ImageSkeleton = React.memo(function ImageSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg",
        className,
      )}
    />
  );
});

export const OptimizedImage = React.memo(function OptimizedImage({
  src,
  alt,
  fallbackSrc = "/images/placeholder.png",
  lazy = true,
  showSkeleton = true,
  skeletonClassName,
  containerClassName,
  aspectRatio = "auto",
  objectFit = "cover",
  className,
  onError,
  onLoad,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);
  const [currentSrc, setCurrentSrc] = React.useState(src);
  const [isInView, setIsInView] = React.useState(!lazy);
  const imgRef = React.useRef<HTMLImageElement>(null);

  // Intersection Observer for lazy loading
  React.useEffect(() => {
    if (!lazy || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: "50px",
      },
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, isInView]);

  const handleLoad = React.useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      setIsLoading(false);
      setHasError(false);
      onLoad?.(event);
    },
    [onLoad],
  );

  const handleError = React.useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      setIsLoading(false);

      if (!hasError && fallbackSrc && currentSrc !== fallbackSrc) {
        setHasError(true);
        setCurrentSrc(fallbackSrc);
        return;
      }

      setHasError(true);
      onError?.(event);
    },
    [hasError, fallbackSrc, currentSrc, onError],
  );

  // Reset state when src changes
  React.useEffect(() => {
    setCurrentSrc(src);
    setHasError(false);
    setIsLoading(true);
  }, [src]);

  const aspectRatioClass =
    aspectRatio !== "auto" ? aspectRatios[aspectRatio] : "";

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        aspectRatioClass,
        containerClassName,
      )}
      ref={imgRef}
    >
      {/* Skeleton Loader */}
      {isLoading && showSkeleton && (
        <ImageSkeleton
          className={cn("absolute inset-0 w-full h-full", skeletonClassName)}
        />
      )}

      {/* Error State */}
      {hasError && currentSrc === fallbackSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <svg
              className="mx-auto h-12 w-12 mb-2"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
            </svg>
            <p className="text-xs">Image unavailable</p>
          </div>
        </div>
      )}

      {/* Actual Image */}
      {isInView && (
        <Image
          src={currentSrc}
          alt={alt}
          className={cn(
            "transition-opacity duration-300",
            isLoading ? "opacity-0" : "opacity-100",
            objectFit === "cover" && "object-cover",
            objectFit === "contain" && "object-contain",
            objectFit === "fill" && "object-fill",
            objectFit === "none" && "object-none",
            objectFit === "scale-down" && "object-scale-down",
            className,
          )}
          onLoad={handleLoad}
          onError={handleError}
          loading={lazy ? "lazy" : "eager"}
          {...props}
        />
      )}

      {/* Loading indicator for large images */}
      {isLoading && !showSkeleton && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
});

// Gallery component for multiple optimized images
interface ImageGalleryProps {
  images: Array<{
    src: string;
    alt: string;
    caption?: string;
  }>;
  columns?: 2 | 3 | 4;
  gap?: "sm" | "md" | "lg";
  aspectRatio?: OptimizedImageProps["aspectRatio"];
  className?: string;
}

export const ImageGallery = React.memo(function ImageGallery({
  images,
  columns = 3,
  gap = "md",
  aspectRatio = "square",
  className,
}: ImageGalleryProps) {
  const gapClasses = {
    sm: "gap-2",
    md: "gap-4",
    lg: "gap-6",
  };

  const columnClasses = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  };

  return (
    <div
      className={cn("grid", columnClasses[columns], gapClasses[gap], className)}
    >
      {images.map((image, index) => (
        <div key={index} className="group">
          <OptimizedImage
            src={image.src}
            alt={image.alt}
            aspectRatio={aspectRatio}
            fill
            className="group-hover:scale-105 transition-transform duration-200"
          />
          {image.caption && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 text-center">
              {image.caption}
            </p>
          )}
        </div>
      ))}
    </div>
  );
});

export default OptimizedImage;
