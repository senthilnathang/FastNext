"use client";

import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "@/shared/utils";
import { Spinner } from "../ui/spinner";

export interface LoadingOverlayProps {
  /** Whether the overlay is visible */
  isVisible: boolean;
  /** Optional loading message to display */
  message?: string;
  /** Optional sub-message for additional context */
  subMessage?: string;
  /** Whether to use backdrop blur effect */
  blur?: boolean;
  /** Custom spinner size */
  spinnerSize?: "small" | "medium" | "large";
  /** Custom z-index for the overlay */
  zIndex?: number;
  /** Whether to render using a portal (default: true) */
  usePortal?: boolean;
  /** Custom class name for the overlay */
  className?: string;
  /** Background opacity (0-100) */
  opacity?: number;
  /** Whether to prevent body scroll when visible */
  preventScroll?: boolean;
}

export function LoadingOverlay({
  isVisible,
  message,
  subMessage,
  blur = true,
  spinnerSize = "large",
  zIndex = 9999,
  usePortal = true,
  className,
  opacity = 80,
  preventScroll = true,
}: LoadingOverlayProps) {
  const [mounted, setMounted] = React.useState(false);

  // Handle mounting for portal
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Handle body scroll prevention
  React.useEffect(() => {
    if (!preventScroll || !isVisible) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    // Calculate scrollbar width to prevent layout shift
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isVisible, preventScroll]);

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  const overlayContent = (
    <div
      className={cn(
        "fixed inset-0 flex flex-col items-center justify-center",
        "transition-opacity duration-200",
        blur && "backdrop-blur-sm",
        className
      )}
      style={{
        zIndex,
        backgroundColor: `rgba(var(--background), ${opacity / 100})`,
      }}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={message || "Loading"}
    >
      {/* Backdrop with proper background color */}
      <div
        className={cn(
          "absolute inset-0",
          blur ? "backdrop-blur-sm" : ""
        )}
        style={{
          backgroundColor:
            opacity > 0
              ? `hsl(var(--background) / ${opacity / 100})`
              : "transparent",
        }}
      />

      {/* Content container */}
      <div className="relative z-10 flex flex-col items-center justify-center space-y-4">
        {/* Spinner */}
        <div className="relative">
          <Spinner size={spinnerSize} show={true} />
        </div>

        {/* Loading message */}
        {message && (
          <div className="text-center space-y-1">
            <p className="text-lg font-medium text-foreground animate-pulse">
              {message}
            </p>
            {subMessage && (
              <p className="text-sm text-muted-foreground">{subMessage}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Render with or without portal
  if (usePortal && mounted && typeof document !== "undefined") {
    return createPortal(overlayContent, document.body);
  }

  return overlayContent;
}

/**
 * Hook to manage loading overlay state
 */
export function useLoadingOverlay(initialState = false) {
  const [isLoading, setIsLoading] = React.useState(initialState);
  const [message, setMessage] = React.useState<string | undefined>(undefined);
  const [subMessage, setSubMessage] = React.useState<string | undefined>(
    undefined
  );

  const show = React.useCallback(
    (loadingMessage?: string, loadingSubMessage?: string) => {
      setMessage(loadingMessage);
      setSubMessage(loadingSubMessage);
      setIsLoading(true);
    },
    []
  );

  const hide = React.useCallback(() => {
    setIsLoading(false);
    // Delay clearing messages to allow for fade out animation
    setTimeout(() => {
      setMessage(undefined);
      setSubMessage(undefined);
    }, 200);
  }, []);

  const updateMessage = React.useCallback(
    (newMessage?: string, newSubMessage?: string) => {
      setMessage(newMessage);
      if (newSubMessage !== undefined) {
        setSubMessage(newSubMessage);
      }
    },
    []
  );

  const LoadingOverlayComponent = React.useCallback(
    (props: Omit<LoadingOverlayProps, "isVisible" | "message" | "subMessage">) => (
      <LoadingOverlay
        isVisible={isLoading}
        message={message}
        subMessage={subMessage}
        {...props}
      />
    ),
    [isLoading, message, subMessage]
  );

  return {
    isLoading,
    show,
    hide,
    updateMessage,
    LoadingOverlay: LoadingOverlayComponent,
  };
}

export default LoadingOverlay;
