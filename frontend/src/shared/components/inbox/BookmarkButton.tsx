"use client";

/**
 * BookmarkButton Component
 *
 * A bookmark/save toggle button with animated icon,
 * tooltip, and callback on change.
 */

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cva, type VariantProps } from "class-variance-authority";
import { Bookmark, BookmarkCheck } from "lucide-react";
import * as React from "react";

import { cn } from "@/shared/utils";

const bookmarkButtonVariants = cva(
  "inline-flex items-center justify-center rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent/50",
        outline: "border border-input hover:bg-accent hover:text-accent-foreground",
        filled: "bg-secondary hover:bg-secondary/80",
      },
      size: {
        sm: "h-8 w-8",
        default: "h-9 w-9",
        lg: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface BookmarkButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange">,
    VariantProps<typeof bookmarkButtonVariants> {
  /** Whether the item is bookmarked */
  bookmarked?: boolean;
  /** Callback when bookmark state changes */
  onChange?: (bookmarked: boolean) => void;
  /** Tooltip text when not bookmarked */
  tooltipAdd?: string;
  /** Tooltip text when bookmarked */
  tooltipRemove?: string;
  /** Whether to show tooltip */
  showTooltip?: boolean;
  /** Tooltip side */
  tooltipSide?: "top" | "right" | "bottom" | "left";
  /** Tooltip align */
  tooltipAlign?: "start" | "center" | "end";
  /** Color of the bookmark icon when active */
  activeColor?: string;
  /** Whether to animate the icon on toggle */
  animated?: boolean;
  /** Icon size (in pixels or Tailwind class) */
  iconSize?: number | string;
}

export function BookmarkButton({
  bookmarked = false,
  onChange,
  tooltipAdd = "Add to bookmarks",
  tooltipRemove = "Remove from bookmarks",
  showTooltip = true,
  tooltipSide = "top",
  tooltipAlign = "center",
  activeColor,
  animated = true,
  iconSize,
  variant,
  size,
  className,
  disabled,
  ...props
}: BookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = React.useState(bookmarked);
  const [isAnimating, setIsAnimating] = React.useState(false);

  // Sync with controlled prop
  React.useEffect(() => {
    setIsBookmarked(bookmarked);
  }, [bookmarked]);

  const handleClick = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (disabled) return;

      const newState = !isBookmarked;
      setIsBookmarked(newState);

      if (animated) {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 300);
      }

      onChange?.(newState);
      props.onClick?.(e);
    },
    [isBookmarked, disabled, animated, onChange, props]
  );

  // Determine icon size
  const getIconClassName = React.useMemo(() => {
    if (typeof iconSize === "number") {
      return "";
    }
    if (typeof iconSize === "string") {
      return iconSize;
    }
    switch (size) {
      case "sm":
        return "h-4 w-4";
      case "lg":
        return "h-5 w-5";
      default:
        return "h-4 w-4";
    }
  }, [iconSize, size]);

  const iconStyle = typeof iconSize === "number" ? { width: iconSize, height: iconSize } : undefined;

  const Icon = isBookmarked ? BookmarkCheck : Bookmark;
  const tooltipText = isBookmarked ? tooltipRemove : tooltipAdd;

  const buttonContent = (
    <button
      type="button"
      aria-label={tooltipText}
      aria-pressed={isBookmarked}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        bookmarkButtonVariants({ variant, size }),
        className
      )}
      {...props}
    >
      <Icon
        className={cn(
          getIconClassName,
          "transition-all duration-200",
          isAnimating && animated && "scale-125",
          isBookmarked && !activeColor && "fill-current text-yellow-500"
        )}
        style={{
          ...iconStyle,
          ...(isBookmarked && activeColor ? { color: activeColor, fill: activeColor } : {}),
        }}
      />
    </button>
  );

  if (!showTooltip) {
    return buttonContent;
  }

  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          {buttonContent}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={tooltipSide}
            align={tooltipAlign}
            sideOffset={4}
            className={cn(
              "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md",
              "animate-in fade-in-0 zoom-in-95",
              "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
              "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
              "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
            )}
          >
            {tooltipText}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

// Hook for managing bookmark state
export interface UseBookmarkOptions {
  initialBookmarked?: boolean;
  onBookmark?: (id: string) => void;
  onUnbookmark?: (id: string) => void;
}

export function useBookmark(
  id: string,
  options: UseBookmarkOptions = {}
) {
  const { initialBookmarked = false, onBookmark, onUnbookmark } = options;
  const [bookmarked, setBookmarked] = React.useState(initialBookmarked);

  const toggle = React.useCallback(() => {
    setBookmarked((prev) => {
      const newState = !prev;
      if (newState) {
        onBookmark?.(id);
      } else {
        onUnbookmark?.(id);
      }
      return newState;
    });
  }, [id, onBookmark, onUnbookmark]);

  const bookmark = React.useCallback(() => {
    setBookmarked(true);
    onBookmark?.(id);
  }, [id, onBookmark]);

  const unbookmark = React.useCallback(() => {
    setBookmarked(false);
    onUnbookmark?.(id);
  }, [id, onUnbookmark]);

  return {
    bookmarked,
    toggle,
    bookmark,
    unbookmark,
    setBookmarked,
  };
}

export default BookmarkButton;
