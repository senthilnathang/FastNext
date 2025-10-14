"use client";

import { Maximize2, Minimize2, Minus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils";

interface WindowControlsProps {
  className?: string;
  variant?: "default" | "compact";
  showClose?: boolean;
  showMinimize?: boolean;
  showMaximize?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
}

export function WindowControls({
  className,
  variant = "default",
  showClose = true,
  showMinimize = true,
  showMaximize = true,
  onMinimize,
  onMaximize,
  onClose,
}: WindowControlsProps) {
  const [isMaximized, setIsMaximized] = useState(false);

  // Check if browser supports fullscreen API
  const supportsFullscreen = document?.documentElement.requestFullscreen;

  const handleMinimize = () => {
    if (typeof window !== "undefined") {
      // Since true minimize isn't possible in browsers, we'll blur the window
      window.blur();
    }
    onMinimize?.();
  };

  const handleMaximize = async () => {
    if (typeof document !== "undefined" && supportsFullscreen) {
      try {
        if (!isMaximized) {
          await document.documentElement.requestFullscreen();
          setIsMaximized(true);
        } else {
          await document.exitFullscreen();
          setIsMaximized(false);
        }
      } catch (error) {
        console.warn("Fullscreen not supported or blocked:", error);
      }
    }
    onMaximize?.();
  };

  const handleClose = () => {
    if (typeof window !== "undefined") {
      // In most browsers, this will prompt the user to confirm
      window.close();
    }
    onClose?.();
  };

  // Listen for fullscreen changes
  useEffect(() => {
    if (typeof document !== "undefined") {
      const handleFullscreenChange = () => {
        setIsMaximized(!!document.fullscreenElement);
      };

      document.addEventListener("fullscreenchange", handleFullscreenChange);
      return () =>
        document.removeEventListener(
          "fullscreenchange",
          handleFullscreenChange,
        );
    }
  }, []);

  const buttonSize = variant === "compact" ? "sm" : "sm";
  const iconSize = variant === "compact" ? "w-3 h-3" : "w-4 h-4";

  return (
    <div
      className={cn(
        "flex items-center gap-1",
        "hidden lg:flex", // Only show on large screens (1024px+)
        className,
      )}
    >
      {showMinimize && (
        <Button
          variant="ghost"
          size={buttonSize}
          onClick={handleMinimize}
          className={cn(
            "hover:bg-blue-100 dark:hover:bg-blue-900/20 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400",
            "transition-colors duration-200",
          )}
          title="Minimize"
        >
          <Minus className={iconSize} />
        </Button>
      )}

      {showMaximize && (
        <Button
          variant="ghost"
          size={buttonSize}
          onClick={handleMaximize}
          className={cn(
            "hover:bg-green-100 dark:hover:bg-green-900/20 text-muted-foreground hover:text-green-600 dark:hover:text-green-400",
            "transition-colors duration-200",
          )}
          title={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? (
            <Minimize2 className={iconSize} />
          ) : (
            <Maximize2 className={iconSize} />
          )}
        </Button>
      )}

      {showClose && (
        <Button
          variant="ghost"
          size={buttonSize}
          onClick={handleClose}
          className={cn(
            "hover:bg-red-100 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 dark:hover:text-red-400",
            "transition-colors duration-200",
          )}
          title="Close"
        >
          <X className={iconSize} />
        </Button>
      )}
    </div>
  );
}

export default WindowControls;
