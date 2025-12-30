"use client";

/**
 * LabelBadge Component
 *
 * A label display badge with color dot, text, optional remove button,
 * size variants, and click handler support.
 */

import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import * as React from "react";

import { cn } from "@/shared/utils";

const labelBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full font-medium transition-colors",
  {
    variants: {
      size: {
        sm: "px-2 py-0.5 text-xs",
        default: "px-2.5 py-1 text-xs",
        lg: "px-3 py-1.5 text-sm",
      },
      variant: {
        default: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        filled: "text-white",
        subtle: "bg-opacity-15 hover:bg-opacity-25",
      },
      interactive: {
        true: "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        false: "",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
      interactive: false,
    },
  }
);

export interface LabelBadgeProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "color">,
    VariantProps<typeof labelBadgeVariants> {
  /** Label text */
  label: string;
  /** Label color (hex or CSS color) */
  color?: string;
  /** Whether to show remove button */
  removable?: boolean;
  /** Callback when remove button is clicked */
  onRemove?: () => void;
  /** Whether the badge is disabled */
  disabled?: boolean;
  /** Icon to display instead of color dot */
  icon?: React.ReactNode;
  /** Whether to show the color dot */
  showColorDot?: boolean;
}

export function LabelBadge({
  label,
  color = "#6b7280",
  size,
  variant = "default",
  interactive,
  removable = false,
  onRemove,
  disabled = false,
  icon,
  showColorDot = true,
  className,
  onClick,
  ...props
}: LabelBadgeProps) {
  const isClickable = Boolean(onClick) || interactive;

  const handleRemove = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!disabled) {
        onRemove?.();
      }
    },
    [disabled, onRemove]
  );

  const handleClick = React.useCallback(
    (e: React.MouseEvent<HTMLSpanElement>) => {
      if (!disabled && onClick) {
        onClick(e);
      }
    },
    [disabled, onClick]
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLSpanElement>) => {
      if (isClickable && !disabled && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        onClick?.(e as unknown as React.MouseEvent<HTMLSpanElement>);
      }
    },
    [isClickable, disabled, onClick]
  );

  // Generate background style for filled/subtle variants
  const getBackgroundStyle = React.useMemo(() => {
    if (variant === "filled") {
      return { backgroundColor: color };
    }
    if (variant === "subtle") {
      return { backgroundColor: `${color}20` };
    }
    return undefined;
  }, [variant, color]);

  // Generate text color for subtle variant
  const getTextColor = React.useMemo(() => {
    if (variant === "subtle") {
      return { color };
    }
    return undefined;
  }, [variant, color]);

  const Wrapper = isClickable ? "button" : "span";

  return (
    <Wrapper
      type={isClickable ? "button" : undefined}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable && !disabled ? 0 : undefined}
      aria-disabled={disabled}
      onClick={handleClick as React.MouseEventHandler<HTMLButtonElement | HTMLSpanElement>}
      onKeyDown={isClickable ? handleKeyDown as React.KeyboardEventHandler<HTMLButtonElement | HTMLSpanElement> : undefined}
      className={cn(
        labelBadgeVariants({ size, variant, interactive: isClickable }),
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      style={{ ...getBackgroundStyle, ...getTextColor }}
      {...props}
    >
      {/* Color dot or icon */}
      {showColorDot && !icon && (
        <span
          className={cn(
            "shrink-0 rounded-full",
            size === "sm" ? "h-2 w-2" : size === "lg" ? "h-3 w-3" : "h-2.5 w-2.5"
          )}
          style={{
            backgroundColor: variant === "filled" ? "currentColor" : color,
          }}
          aria-hidden="true"
        />
      )}
      {icon && <span className="shrink-0">{icon}</span>}

      {/* Label text */}
      <span className="truncate">{label}</span>

      {/* Remove button */}
      {removable && onRemove && (
        <button
          type="button"
          onClick={handleRemove}
          disabled={disabled}
          className={cn(
            "shrink-0 rounded-full p-0.5 transition-colors",
            "hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            disabled && "cursor-not-allowed"
          )}
          aria-label={`Remove ${label} label`}
        >
          <X
            className={cn(
              size === "sm" ? "h-2.5 w-2.5" : size === "lg" ? "h-3.5 w-3.5" : "h-3 w-3"
            )}
          />
        </button>
      )}
    </Wrapper>
  );
}

// Helper component for displaying multiple labels
export interface LabelBadgeGroupProps {
  /** Labels to display */
  labels: Array<{
    id: string;
    label: string;
    color?: string;
  }>;
  /** Maximum number of labels to show before collapsing */
  maxVisible?: number;
  /** Props to pass to each badge */
  badgeProps?: Omit<LabelBadgeProps, "label" | "color">;
  /** Callback when a label is clicked */
  onLabelClick?: (id: string) => void;
  /** Callback when a label is removed */
  onLabelRemove?: (id: string) => void;
  /** CSS class name */
  className?: string;
}

export function LabelBadgeGroup({
  labels,
  maxVisible = 3,
  badgeProps,
  onLabelClick,
  onLabelRemove,
  className,
}: LabelBadgeGroupProps) {
  const visibleLabels = labels.slice(0, maxVisible);
  const hiddenCount = labels.length - maxVisible;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {visibleLabels.map((item) => (
        <LabelBadge
          key={item.id}
          label={item.label}
          color={item.color}
          onClick={onLabelClick ? () => onLabelClick(item.id) : undefined}
          onRemove={onLabelRemove ? () => onLabelRemove(item.id) : undefined}
          removable={Boolean(onLabelRemove)}
          {...badgeProps}
        />
      ))}
      {hiddenCount > 0 && (
        <span className="text-xs text-muted-foreground">+{hiddenCount} more</span>
      )}
    </div>
  );
}

export default LabelBadge;
