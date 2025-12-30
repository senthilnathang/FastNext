"use client";

/**
 * Recent Notifications Widget
 * Shows recent notifications with link to notification center
 */

import {
  AlertCircle,
  ArrowRight,
  Bell,
  CheckCircle,
  Clock,
  Info,
  MessageCircle,
  RefreshCw,
  Shield,
  XCircle,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/modules/auth";
import type { Notification, NotificationType } from "@/modules/notifications/types";
import { apiClient } from "@/shared/services/api/client";
import { cn } from "@/shared/utils";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { ScrollArea } from "../ui/scroll-area";
import { Skeleton } from "../ui/skeleton";

interface RecentNotificationsWidgetProps {
  maxItems?: number;
  className?: string;
  onViewAll?: () => void;
}

const notificationTypeConfig: Record<
  NotificationType,
  { icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  system: { icon: Info, color: "text-gray-500" },
  message: { icon: MessageCircle, color: "text-blue-500" },
  alert: { icon: AlertCircle, color: "text-red-500" },
  reminder: { icon: Clock, color: "text-yellow-500" },
  update: { icon: RefreshCw, color: "text-green-500" },
  mention: { icon: MessageCircle, color: "text-purple-500" },
  task: { icon: CheckCircle, color: "text-amber-500" },
  security: { icon: Shield, color: "text-orange-500" },
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function NotificationItemSkeleton() {
  return (
    <div className="flex items-start space-x-3 p-3 animate-pulse">
      <Skeleton className="h-8 w-8 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

function NotificationItem({ notification }: { notification: Notification }) {
  const config = notificationTypeConfig[notification.type] || notificationTypeConfig.system;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex items-start space-x-3 p-3 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50",
        !notification.is_read && "bg-blue-50/50 dark:bg-blue-900/10"
      )}
    >
      <div
        className={cn(
          "flex-shrink-0 p-2 rounded-full",
          !notification.is_read
            ? "bg-blue-100 dark:bg-blue-900/30"
            : "bg-gray-100 dark:bg-gray-800"
        )}
      >
        <Icon className={cn("h-4 w-4", config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              "text-sm truncate",
              !notification.is_read ? "font-medium" : "font-normal"
            )}
          >
            {notification.title}
          </p>
          {!notification.is_read && (
            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
          {notification.message}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {formatTimeAgo(notification.created_at)}
        </p>
      </div>
    </div>
  );
}

export function RecentNotificationsWidget({
  maxItems = 5,
  className,
  onViewAll,
}: RecentNotificationsWidgetProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    try {
      const [notificationsRes, unreadRes] = await Promise.all([
        apiClient.get<{ items?: Notification[]; notifications?: Notification[] }>(
          "/api/v1/notifications/",
          { params: { limit: maxItems } }
        ),
        apiClient.get<{ unread_count: number }>("/api/v1/notifications/unread-count"),
      ]);

      const items = notificationsRes.data.items || notificationsRes.data.notifications || [];
      setNotifications(items.slice(0, maxItems));
      setUnreadCount(unreadRes.data.unread_count);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      setError("Failed to load notifications");
      // Set mock data for demo
      setNotifications([
        {
          id: 1,
          user_id: 1,
          type: "system",
          priority: "normal",
          status: "unread",
          title: "System Update",
          message: "A new version is available",
          is_read: false,
          created_at: new Date().toISOString(),
        },
        {
          id: 2,
          user_id: 1,
          type: "security",
          priority: "high",
          status: "unread",
          title: "Security Alert",
          message: "New login from unknown device",
          is_read: false,
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 3,
          user_id: 1,
          type: "message",
          priority: "normal",
          status: "read",
          title: "New Message",
          message: "You have a new message from John",
          is_read: true,
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
      ] as Notification[]);
      setUnreadCount(2);
    } finally {
      setLoading(false);
    }
  }, [user, maxItems]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleViewAll = () => {
    if (onViewAll) {
      onViewAll();
    } else {
      window.location.href = "/notifications";
    }
  };

  const handleRefresh = () => {
    fetchNotifications();
  };

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-lg">
            <Bell className="h-5 w-5 mr-2" />
            Recent Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        {loading ? (
          <div className="space-y-1">
            {[...Array(3)].map((_, i) => (
              <NotificationItemSkeleton key={i} />
            ))}
          </div>
        ) : error && notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <XCircle className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-500">{error}</p>
            <Button variant="ghost" size="sm" onClick={handleRefresh} className="mt-2">
              Try again
            </Button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Bell className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              No notifications
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              You&apos;re all caught up!
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[280px] -mx-2">
            <div className="space-y-1 px-2">
              {notifications.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} />
              ))}
            </div>
          </ScrollArea>
        )}

        {notifications.length > 0 && (
          <Button
            variant="ghost"
            className="w-full mt-3 text-sm"
            onClick={handleViewAll}
          >
            View all notifications
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default RecentNotificationsWidget;
