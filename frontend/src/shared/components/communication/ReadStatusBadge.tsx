"use client";

import * as React from "react";
import { useMemo } from "react";
import { Check, CheckCheck, Clock, AlertCircle } from "lucide-react";

import { cn } from "@/shared/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";

export type MessageStatus = "sending" | "sent" | "delivered" | "read" | "failed";

export interface ReadStatusBadgeProps {
  status: MessageStatus;
  timestamp?: Date;
  readAt?: Date;
  deliveredAt?: Date;
  showTimestamp?: boolean;
  showTooltip?: boolean;
  size?: "xs" | "sm" | "md";
  className?: string;
}

const sizeStyles = {
  xs: {
    icon: "h-3 w-3",
    text: "text-[10px]",
    container: "gap-0.5",
  },
  sm: {
    icon: "h-3.5 w-3.5",
    text: "text-xs",
    container: "gap-1",
  },
  md: {
    icon: "h-4 w-4",
    text: "text-sm",
    container: "gap-1.5",
  },
};

const statusConfig = {
  sending: {
    icon: Clock,
    label: "Sending...",
    color: "text-muted-foreground",
  },
  sent: {
    icon: Check,
    label: "Sent",
    color: "text-muted-foreground",
  },
  delivered: {
    icon: CheckCheck,
    label: "Delivered",
    color: "text-muted-foreground",
  },
  read: {
    icon: CheckCheck,
    label: "Read",
    color: "text-primary",
  },
  failed: {
    icon: AlertCircle,
    label: "Failed to send",
    color: "text-destructive",
  },
};

export const ReadStatusBadge: React.FC<ReadStatusBadgeProps> = ({
  status,
  timestamp,
  readAt,
  deliveredAt,
  showTimestamp = true,
  showTooltip = true,
  size = "sm",
  className,
}) => {
  const styles = sizeStyles[size];
  const config = statusConfig[status];
  const IconComponent = config.icon;

  // Format timestamp
  const formattedTime = useMemo(() => {
    if (!timestamp) return null;

    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      });
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isYesterday) {
      return "Yesterday";
    }

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  }, [timestamp]);

  // Build tooltip content
  const tooltipContent = useMemo(() => {
    const lines: string[] = [];

    if (timestamp) {
      lines.push(`Sent: ${new Date(timestamp).toLocaleString()}`);
    }
    if (deliveredAt) {
      lines.push(`Delivered: ${new Date(deliveredAt).toLocaleString()}`);
    }
    if (readAt) {
      lines.push(`Read: ${new Date(readAt).toLocaleString()}`);
    }
    if (status === "failed") {
      lines.push("Message failed to send. Tap to retry.");
    }

    return lines.join("\n");
  }, [timestamp, deliveredAt, readAt, status]);

  const badge = (
    <div
      className={cn(
        "inline-flex items-center",
        styles.container,
        className
      )}
    >
      {showTimestamp && formattedTime && (
        <span className={cn(styles.text, "text-muted-foreground")}>
          {formattedTime}
        </span>
      )}
      <IconComponent
        className={cn(
          styles.icon,
          config.color,
          status === "sending" && "animate-pulse"
        )}
      />
    </div>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p className="whitespace-pre-line">{tooltipContent || config.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Compact read receipts for group messages
export interface GroupReadReceiptsProps {
  totalRecipients: number;
  readBy: Array<{
    id: string;
    name: string;
    avatar?: string;
  }>;
  showCount?: boolean;
  maxAvatars?: number;
  size?: "xs" | "sm" | "md";
  className?: string;
}

export const GroupReadReceipts: React.FC<GroupReadReceiptsProps> = ({
  totalRecipients,
  readBy,
  showCount = true,
  maxAvatars = 3,
  size = "sm",
  className,
}) => {
  const styles = sizeStyles[size];
  const visibleReaders = readBy.slice(0, maxAvatars);
  const remainingCount = readBy.length - maxAvatars;
  const unreadCount = totalRecipients - readBy.length;

  const allRead = readBy.length === totalRecipients;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center",
              styles.container,
              className
            )}
          >
            {allRead ? (
              <CheckCheck className={cn(styles.icon, "text-primary")} />
            ) : readBy.length > 0 ? (
              <CheckCheck className={cn(styles.icon, "text-muted-foreground")} />
            ) : (
              <Check className={cn(styles.icon, "text-muted-foreground")} />
            )}
            {showCount && (
              <span className={cn(styles.text, "text-muted-foreground")}>
                {readBy.length}/{totalRecipients}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-xs">
          {allRead ? (
            <p>Read by everyone</p>
          ) : (
            <div>
              <p className="font-medium mb-1">
                Read by {readBy.length} of {totalRecipients}
              </p>
              {visibleReaders.length > 0 && (
                <p className="text-muted-foreground">
                  {visibleReaders.map((r) => r.name).join(", ")}
                  {remainingCount > 0 && ` and ${remainingCount} more`}
                </p>
              )}
              {unreadCount > 0 && (
                <p className="text-muted-foreground mt-1">
                  {unreadCount} haven&apos;t read yet
                </p>
              )}
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Simple inline status text
export interface StatusTextProps {
  status: MessageStatus;
  timestamp?: Date;
  className?: string;
}

export const StatusText: React.FC<StatusTextProps> = ({
  status,
  timestamp,
  className,
}) => {
  const config = statusConfig[status];

  const timeText = useMemo(() => {
    if (!timestamp) return null;

    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  }, [timestamp]);

  return (
    <span className={cn("text-xs", config.color, className)}>
      {config.label}
      {timeText && ` ${timeText}`}
    </span>
  );
};

export default ReadStatusBadge;
