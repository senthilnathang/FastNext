"use client";

import {
  AlertTriangle,
  Bell,
  Check,
  CheckCheck,
  CheckCircle,
  ExternalLink,
  Info,
  Settings,
  Trash2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/modules/auth";
import { apiClient } from "@/shared/services/api/client";
import { cn } from "@/shared/utils";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";

type NotificationLevel = "info" | "success" | "warning" | "error";

interface Notification {
  id: number;
  title: string;
  description?: string | null;
  level: NotificationLevel;
  is_read: boolean;
  link?: string | null;
  data: Record<string, unknown>;
  actor_id?: number | null;
  created_at: string;
  updated_at?: string | null;
}

interface NotificationCenterProps {
  trigger?: React.ReactNode;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// Format time ago
function formatTimeAgo(date: string): string {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return past.toLocaleDateString();
}

// Level configuration
const LEVEL_CONFIG: Record<
  NotificationLevel,
  {
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
  }
> = {
  info: {
    icon: Info,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  success: {
    icon: CheckCircle,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
  },
  error: {
    icon: XCircle,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
  },
};

function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  onClose,
}: {
  notification: Notification;
  onMarkAsRead: (id: number) => void;
  onDelete: (id: number) => void;
  onClose: () => void;
}) {
  const config = LEVEL_CONFIG[notification.level] || LEVEL_CONFIG.info;
  const IconComponent = config.icon;

  return (
    <div
      className={cn(
        "p-4 hover:bg-accent/50 transition-colors border-b last:border-b-0",
        !notification.is_read && "bg-primary/5"
      )}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div
          className={cn(
            "flex items-center justify-center w-9 h-9 rounded-full shrink-0",
            config.bgColor
          )}
        >
          <IconComponent className={cn("h-4 w-4", config.color)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h4
                  className={cn(
                    "text-sm truncate",
                    !notification.is_read ? "font-semibold" : "font-medium"
                  )}
                >
                  {notification.title}
                </h4>
                {!notification.is_read && (
                  <span className="w-2 h-2 bg-primary rounded-full shrink-0" />
                )}
              </div>
              {notification.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                  {notification.description}
                </p>
              )}
              <span className="text-xs text-muted-foreground">
                {formatTimeAgo(notification.created_at)}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-0.5 shrink-0">
              {notification.link && (
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  className="h-7 w-7"
                  onClick={onClose}
                >
                  <Link href={notification.link}>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              )}
              {!notification.is_read && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onMarkAsRead(notification.id)}
                  className="h-7 w-7"
                  title="Mark as read"
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(notification.id)}
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function NotificationCenter({
  trigger,
  className,
  open: externalOpen,
  onOpenChange,
}: NotificationCenterProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await apiClient.get("/api/v1/notifications/");
      setNotifications(response.data.items || []);
      if (response.data.unread_count !== undefined) {
        setUnreadCount(response.data.unread_count);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;

    try {
      const response = await apiClient.get("/api/v1/notifications/stats");
      setUnreadCount(response.data.unread_count || 0);
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  }, [user]);

  // Mark as read
  const markAsRead = async (notificationId: number) => {
    try {
      await apiClient.put(`/api/v1/notifications/${notificationId}`, {
        is_read: true,
      });
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
      if (unreadIds.length === 0) return;

      await apiClient.post("/api/v1/notifications/bulk-read", {
        notification_ids: unreadIds,
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId: number) => {
    try {
      await apiClient.delete(`/api/v1/notifications/${notificationId}`);
      const deletedNotification = notifications.find((n) => n.id === notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      if (deletedNotification && !deletedNotification.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  // Load data when component mounts or user changes
  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [user, fetchNotifications, fetchUnreadCount]);

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [user, fetchUnreadCount]);

  // Refetch notifications when sheet opens
  useEffect(() => {
    if (isOpen && user) {
      fetchNotifications();
    }
  }, [isOpen, user, fetchNotifications]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button
            variant="ghost"
            size="icon"
            className={cn("relative", className)}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center px-1 text-xs"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-[400px] p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Bell className="h-5 w-5" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {unreadCount} new
                </Badge>
              )}
            </SheetTitle>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-8 text-xs"
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mb-3" />
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-base font-medium mb-1">All caught up!</h3>
              <p className="text-sm text-muted-foreground text-center">
                No new notifications. We'll let you know when something arrives.
              </p>
            </div>
          ) : (
            <div>
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onDelete={deleteNotification}
                  onClose={() => setIsOpen(false)}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        <Separator />
        <div className="p-3 flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            size="sm"
            asChild
            onClick={() => setIsOpen(false)}
          >
            <Link href="/notifications">
              View all notifications
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            asChild
            onClick={() => setIsOpen(false)}
          >
            <Link href="/settings?tab=notifications">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
