"use client";

import { cva, type VariantProps } from "class-variance-authority";
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  Ban,
  Check,
  CheckCircle,
  Circle,
  Clock,
  Loader2,
  LucideIcon,
  MinusCircle,
  Pause,
  Play,
  RefreshCw,
  Shield,
  XCircle,
  Zap,
} from "lucide-react";
import * as React from "react";

import { cn } from "@/shared/utils";

const statusTagVariants = cva(
  "inline-flex items-center font-medium rounded-full transition-colors",
  {
    variants: {
      variant: {
        // Success states
        active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        success: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        verified: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        published: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",

        // Warning states
        pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
        warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
        review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
        paused: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",

        // Error/Danger states
        inactive: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
        error: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
        failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
        rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
        expired: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
        blocked: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
        cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",

        // Info/Primary states
        info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
        processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
        inProgress: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
        syncing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
        new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",

        // Neutral states
        draft: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400",
        archived: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400",
        disabled: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400",
        unknown: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400",

        // Special states
        premium: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
        beta: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
        urgent: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
        scheduled: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
        secure: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
      },
      size: {
        xs: "px-1.5 py-0.5 text-[10px] gap-1",
        sm: "px-2 py-0.5 text-xs gap-1",
        md: "px-2.5 py-1 text-xs gap-1.5",
        lg: "px-3 py-1.5 text-sm gap-2",
      },
    },
    defaultVariants: {
      variant: "info",
      size: "sm",
    },
  }
);

// Map variants to their default icons
const variantIcons: Partial<
  Record<NonNullable<VariantProps<typeof statusTagVariants>["variant"]>, LucideIcon>
> = {
  active: CheckCircle,
  success: Check,
  completed: CheckCircle,
  approved: CheckCircle,
  verified: Shield,
  published: Play,

  pending: Clock,
  warning: AlertTriangle,
  review: AlertCircle,
  paused: Pause,

  inactive: XCircle,
  error: XCircle,
  failed: XCircle,
  rejected: Ban,
  expired: MinusCircle,
  blocked: Ban,
  cancelled: XCircle,

  info: AlertCircle,
  processing: Loader2,
  inProgress: RefreshCw,
  syncing: RefreshCw,
  new: Zap,

  draft: Circle,
  archived: Archive,
  disabled: MinusCircle,
  unknown: Circle,

  premium: Zap,
  beta: Zap,
  urgent: AlertTriangle,
  scheduled: Clock,
  secure: Shield,
};

// Animated icon variants
const animatedVariants = new Set([
  "processing",
  "syncing",
  "inProgress",
]);

export interface StatusTagProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children">,
    VariantProps<typeof statusTagVariants> {
  /** The status label to display */
  label?: string;
  /** Custom icon to display instead of default */
  icon?: LucideIcon;
  /** Whether to show an icon */
  showIcon?: boolean;
  /** Whether the icon should be animated (spin) */
  animated?: boolean;
  /** Whether to show a pulsing dot indicator */
  showDot?: boolean;
  /** Whether the tag is clickable */
  clickable?: boolean;
}

export function StatusTag({
  variant,
  size,
  label,
  icon,
  showIcon = true,
  animated,
  showDot = false,
  clickable = false,
  className,
  onClick,
  ...props
}: StatusTagProps) {
  // Get the default icon for the variant
  const DefaultIcon =
    variant && variantIcons[variant] ? variantIcons[variant] : Circle;
  const Icon = icon || DefaultIcon;

  // Determine if icon should be animated
  const shouldAnimate =
    animated !== undefined
      ? animated
      : variant && animatedVariants.has(variant);

  // Get icon size based on tag size
  const iconSizeClass = {
    xs: "h-2.5 w-2.5",
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  }[size || "sm"];

  // Get dot size based on tag size
  const dotSizeClass = {
    xs: "h-1.5 w-1.5",
    sm: "h-2 w-2",
    md: "h-2 w-2",
    lg: "h-2.5 w-2.5",
  }[size || "sm"];

  // Generate label from variant if not provided
  const displayLabel =
    label ||
    (variant
      ? variant
          .replace(/([A-Z])/g, " $1")
          .trim()
          .replace(/^./, (str) => str.toUpperCase())
      : "Unknown");

  return (
    <span
      className={cn(
        statusTagVariants({ variant, size }),
        clickable && "cursor-pointer hover:opacity-80",
        className
      )}
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                onClick?.(e as unknown as React.MouseEvent<HTMLSpanElement>);
              }
            }
          : undefined
      }
      {...props}
    >
      {showDot && (
        <span
          className={cn(
            dotSizeClass,
            "rounded-full bg-current animate-pulse"
          )}
        />
      )}
      {showIcon && Icon && (
        <Icon
          className={cn(iconSizeClass, shouldAnimate && "animate-spin")}
        />
      )}
      <span>{displayLabel}</span>
    </span>
  );
}

// Pre-configured status tags for common use cases
export const ActiveTag = (props: Omit<StatusTagProps, "variant">) => (
  <StatusTag variant="active" {...props} />
);

export const InactiveTag = (props: Omit<StatusTagProps, "variant">) => (
  <StatusTag variant="inactive" {...props} />
);

export const PendingTag = (props: Omit<StatusTagProps, "variant">) => (
  <StatusTag variant="pending" {...props} />
);

export const SuccessTag = (props: Omit<StatusTagProps, "variant">) => (
  <StatusTag variant="success" {...props} />
);

export const ErrorTag = (props: Omit<StatusTagProps, "variant">) => (
  <StatusTag variant="error" {...props} />
);

export const WarningTag = (props: Omit<StatusTagProps, "variant">) => (
  <StatusTag variant="warning" {...props} />
);

export const InfoTag = (props: Omit<StatusTagProps, "variant">) => (
  <StatusTag variant="info" {...props} />
);

export const ProcessingTag = (props: Omit<StatusTagProps, "variant">) => (
  <StatusTag variant="processing" {...props} />
);

export const DraftTag = (props: Omit<StatusTagProps, "variant">) => (
  <StatusTag variant="draft" {...props} />
);

export default StatusTag;
