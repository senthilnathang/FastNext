"use client";

import {
  Bell,
  Check,
  ExternalLink,
  Settings,
  Trash2,
} from "lucide-react";
import * as React from "react";
import { useCallback, useEffect, useState } from "react";

import { cn } from "@/shared/utils";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";

export interface Notification {
  id: string | number;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error" | "system";
  isRead: boolean;
  createdAt: string | Date;
  actionUrl?: string;
  data?: Record<string, unknown>;
}

export interface NotificationBellProps {
  notifications?: Notification[];
  unreadCount?: number;
  maxDisplayed?: number;
  onMarkAsRead?: (notificationId: string | number) => void;
  onMarkAllAsRead?: () => void;
  onDelete?: (notificationId: string | number) => void;
  onNotificationClick?: (notification: Notification) => void;
  onViewAll?: () => void;
  onSettingsClick?: () => void;
  isLoading?: boolean;
  className?: string;
  notificationCenterUrl?: string;
}

const typeColors: Record<Notification["type"], string> = {
  info: "text-blue-600 dark:text-blue-400",
  success: "text-green-600 dark:text-green-400",
  warning: "text-yellow-600 dark:text-yellow-400",
  error: "text-red-600 dark:text-red-400",
  system: "text-purple-600 dark:text-purple-400",
};

const typeIcons: Record<Notification["type"], string> = {
  info: "i",
  success: "check",
  warning: "!",
  error: "x",
  system: "*",
};

function formatTimeAgo(date: string | Date): string {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "Just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  return past.toLocaleDateString();
}

function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  onClick,
}: {
  notification: Notification;
  onMarkAsRead?: (id: string | number) => void;
  onDelete?: (id: string | number) => void;
  onClick?: (notification: Notification) => void;
}) {
  const handleClick = () => {
    onClick?.(notification);
    if (!notification.isRead) {
      onMarkAsRead?.(notification.id);
    }
  };

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkAsRead?.(notification.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(notification.id);
  };

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (notification.actionUrl) {
      window.open(notification.actionUrl, "_blank");
    }
  };

  return (
    <div
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      role="button"
      tabIndex={0}
      className={cn(
        "p-3 border-b last:border-b-0 cursor-pointer transition-colors",
        "hover:bg-accent/50",
        !notification.isRead && "bg-primary/5"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Type indicator */}
        <div
          className={cn(
            "flex items-center justify-center w-6 h-6 rounded-full shrink-0 text-xs font-bold",
            typeColors[notification.type],
            "bg-current/10"
          )}
        >
          <span className={typeColors[notification.type]}>
            {typeIcons[notification.type]}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4
              className={cn(
                "text-sm truncate",
                !notification.isRead ? "font-semibold" : "font-medium"
              )}
            >
              {notification.title}
            </h4>
            {!notification.isRead && (
              <div className="w-2 h-2 bg-primary rounded-full shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {notification.message}
          </p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              {formatTimeAgo(notification.createdAt)}
            </span>
            <div className="flex items-center gap-1">
              {notification.actionUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleActionClick}
                  className="h-6 px-2 text-xs"
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
              {!notification.isRead && onMarkAsRead && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAsRead}
                  className="h-6 px-2 text-xs"
                  title="Mark as read"
                >
                  <Check className="h-3 w-3" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="h-6 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  title="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function NotificationBell({
  notifications = [],
  unreadCount,
  maxDisplayed = 5,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onNotificationClick,
  onViewAll,
  onSettingsClick,
  isLoading = false,
  className,
  notificationCenterUrl = "/notifications",
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);

  // Calculate unread count if not provided
  const displayUnreadCount =
    unreadCount ?? notifications.filter((n) => !n.isRead).length;

  // Limit displayed notifications
  const displayedNotifications = notifications.slice(0, maxDisplayed);
  const hasMoreNotifications = notifications.length > maxDisplayed;

  const handleViewAll = useCallback(() => {
    setOpen(false);
    if (onViewAll) {
      onViewAll();
    } else if (notificationCenterUrl) {
      window.location.href = notificationCenterUrl;
    }
  }, [onViewAll, notificationCenterUrl]);

  const handleSettingsClick = useCallback(() => {
    setOpen(false);
    onSettingsClick?.();
  }, [onSettingsClick]);

  const handleNotificationClick = useCallback(
    (notification: Notification) => {
      onNotificationClick?.(notification);
    },
    [onNotificationClick]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative", className)}
          aria-label={`Notifications${displayUnreadCount > 0 ? ` (${displayUnreadCount} unread)` : ""}`}
        >
          <Bell className="h-5 w-5" />
          {displayUnreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs"
            >
              {displayUnreadCount > 99 ? "99+" : displayUnreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {displayUnreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {displayUnreadCount} new
              </Badge>
            )}
          </div>
          {displayUnreadCount > 0 && onMarkAllAsRead && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMarkAllAsRead()}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              Mark all read
            </Button>
          )}
        </div>

        {/* Notifications list */}
        <ScrollArea className="max-h-[360px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
            </div>
          ) : displayedNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4">
              <Bell className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                No notifications
              </p>
              <p className="text-xs text-muted-foreground/70 text-center mt-1">
                You're all caught up! We'll notify you when there's something new.
              </p>
            </div>
          ) : (
            <div>
              {displayedNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={onMarkAsRead}
                  onDelete={onDelete}
                  onClick={handleNotificationClick}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {(displayedNotifications.length > 0 || onSettingsClick) && (
          <>
            <Separator />
            <div className="flex items-center justify-between p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleViewAll}
                className="flex-1 text-xs"
              >
                {hasMoreNotifications
                  ? `View all (${notifications.length})`
                  : "View all notifications"}
              </Button>
              {onSettingsClick && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSettingsClick}
                  className="h-8 w-8"
                  title="Notification settings"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default NotificationBell;
