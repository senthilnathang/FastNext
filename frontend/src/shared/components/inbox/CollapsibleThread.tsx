"use client";

/**
 * CollapsibleThread Component
 *
 * A collapsible message thread component with expand/collapse toggle,
 * reply count indicator, animated height transition, and thread line visual.
 */

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import { cva, type VariantProps } from "class-variance-authority";
import { ChevronDown, ChevronRight, MessageCircle } from "lucide-react";
import * as React from "react";

import { cn } from "@/shared/utils";

const threadVariants = cva(
  "relative rounded-lg border bg-card text-card-foreground",
  {
    variants: {
      variant: {
        default: "shadow-sm",
        flat: "shadow-none",
        outlined: "border-2",
      },
      size: {
        sm: "text-sm",
        default: "text-base",
        lg: "text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface CollapsibleThreadMessage {
  id: string;
  content: React.ReactNode;
  author?: {
    name: string;
    avatar?: string;
  };
  timestamp?: Date | string;
  metadata?: Record<string, unknown>;
}

export interface CollapsibleThreadProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "content">,
    VariantProps<typeof threadVariants> {
  /** Main thread content (always visible) */
  header: React.ReactNode;
  /** Replies/thread content (collapsible) */
  children: React.ReactNode;
  /** Number of replies in the thread */
  replyCount?: number;
  /** Whether the thread is initially expanded */
  defaultOpen?: boolean;
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Whether to show the thread line visual */
  showThreadLine?: boolean;
  /** Custom trigger content */
  triggerContent?: React.ReactNode;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Whether the thread is disabled */
  disabled?: boolean;
}

export function CollapsibleThread({
  header,
  children,
  replyCount = 0,
  defaultOpen = false,
  open,
  onOpenChange,
  showThreadLine = true,
  triggerContent,
  animationDuration = 200,
  disabled = false,
  variant,
  size,
  className,
  ...props
}: CollapsibleThreadProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = React.useState<number>(0);

  // Use controlled or uncontrolled state
  const isExpanded = open !== undefined ? open : isOpen;

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      if (disabled) return;
      if (open === undefined) {
        setIsOpen(newOpen);
      }
      onOpenChange?.(newOpen);
    },
    [disabled, open, onOpenChange]
  );

  // Measure content height for animation
  React.useEffect(() => {
    if (contentRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContentHeight(entry.contentRect.height);
        }
      });
      resizeObserver.observe(contentRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;

  return (
    <CollapsiblePrimitive.Root
      open={isExpanded}
      onOpenChange={handleOpenChange}
      disabled={disabled}
      className={cn(threadVariants({ variant, size }), className)}
      {...props}
    >
      {/* Header section */}
      <div className="p-4">
        {header}

        {/* Trigger button */}
        {replyCount > 0 && (
          <CollapsiblePrimitive.Trigger
            className={cn(
              "mt-2 flex items-center gap-2 text-sm text-muted-foreground transition-colors",
              "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              disabled && "cursor-not-allowed opacity-50"
            )}
            disabled={disabled}
          >
            <ChevronIcon
              className={cn(
                "h-4 w-4 transition-transform",
                `duration-${animationDuration}`
              )}
            />
            {triggerContent || (
              <span className="flex items-center gap-1.5">
                <MessageCircle className="h-4 w-4" />
                <span>
                  {replyCount} {replyCount === 1 ? "reply" : "replies"}
                </span>
              </span>
            )}
          </CollapsiblePrimitive.Trigger>
        )}
      </div>

      {/* Collapsible content */}
      <CollapsiblePrimitive.Content
        className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down"
        style={
          {
            "--radix-collapsible-content-height": `${contentHeight}px`,
          } as React.CSSProperties
        }
      >
        <div ref={contentRef} className="relative">
          {/* Thread line visual */}
          {showThreadLine && (
            <div
              className="absolute left-6 top-0 h-full w-0.5 bg-border"
              aria-hidden="true"
            />
          )}

          {/* Replies content */}
          <div className={cn("pb-4", showThreadLine && "pl-10 pr-4")}>
            {children}
          </div>
        </div>
      </CollapsiblePrimitive.Content>
    </CollapsiblePrimitive.Root>
  );
}

// Individual thread reply component
export interface ThreadReplyProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether this is the last reply (hides connector line) */
  isLast?: boolean;
  /** Show connector dot */
  showConnector?: boolean;
}

export function ThreadReply({
  children,
  isLast = false,
  showConnector = true,
  className,
  ...props
}: ThreadReplyProps) {
  return (
    <div
      className={cn(
        "relative py-3",
        !isLast && "border-b border-border/50",
        className
      )}
      {...props}
    >
      {/* Connector dot */}
      {showConnector && (
        <div
          className="absolute -left-[1.125rem] top-4 h-2 w-2 rounded-full bg-border"
          aria-hidden="true"
        />
      )}
      {children}
    </div>
  );
}

export default CollapsibleThread;
