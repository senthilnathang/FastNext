"use client";

/**
 * Recent Notifications Widget
 * Shows recent notifications with link to notification center
 */

import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle,
  Info,
  RefreshCw,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/modules/auth";
import type { Notification, NotificationLevel } from "@/modules/notifications/types";
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

const notificationLevelConfig: Record<
  NotificationLevel,
  { icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string }
> = {
  info: { icon: Info, color: "text-blue-500", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  success: { icon: CheckCircle, color: "text-green-500", bgColor: "bg-green-100 dark:bg-green-900/30" },
  warning: { icon: AlertTriangle, color: "text-amber-500", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
  error: { icon: XCircle, color: "text-red-500", bgColor: "bg-red-100 dark:bg-red-900/30" },
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
  const config = notificationLevelConfig[notification.level] || notificationLevelConfig.info;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex items-start space-x-3 p-3 rounded-lg transition-colors hover:bg-accent/50",
        !notification.is_read && "bg-primary/5"
      )}
    >
      <div
        className={cn(
          "flex-shrink-0 p-2 rounded-full",
          config.bgColor
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
            <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
          )}
        </div>
        {notification.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {notification.description}
          </p>
        )}
        <p className="text-xs text-muted-foreground/70 mt-1">
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
      const response = await apiClient.get("/api/v1/notifications/", {
        params: { page_size: maxItems },
      });

      const items = response.data.items || [];
      setNotifications(items.slice(0, maxItems));
      setUnreadCount(response.data.unread_count || 0);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      setError("Failed to load notifications");
      setNotifications([]);
      setUnreadCount(0);
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
            <XCircle className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="ghost" size="sm" onClick={handleRefresh} className="mt-2">
              Try again
            </Button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Bell className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium">No notifications</p>
            <p className="text-xs text-muted-foreground mt-1">
              You're all caught up!
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
            onClick={onViewAll ? handleViewAll : undefined}
            asChild={!onViewAll}
          >
            {onViewAll ? (
              <>
                View all notifications
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            ) : (
              <Link href="/notifications">
                View all notifications
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default RecentNotificationsWidget;
