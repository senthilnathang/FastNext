"use client";

import {
  AlertTriangle,
  Bell,
  Check,
  CheckCheck,
  CheckCircle,
  ExternalLink,
  Filter,
  Info,
  Search,
  Settings,
  Trash2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/modules/auth";
import {
  useNotifications,
  useNotificationStats,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
} from "@/modules/notifications/hooks/useNotifications";
import type { Notification, NotificationLevel } from "@/modules/notifications/types";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/utils";

// Level configuration with icons
const LEVEL_CONFIG: Record<
  NotificationLevel,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
    badgeVariant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  info: {
    label: "Info",
    icon: Info,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    badgeVariant: "default",
  },
  success: {
    label: "Success",
    icon: CheckCircle,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    badgeVariant: "secondary",
  },
  warning: {
    label: "Warning",
    icon: AlertTriangle,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    badgeVariant: "outline",
  },
  error: {
    label: "Error",
    icon: XCircle,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    badgeVariant: "destructive",
  },
};

// Format time ago
function formatTimeAgo(date: string): string {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  return past.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
}: {
  notification: Notification;
  onMarkAsRead: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const config = LEVEL_CONFIG[notification.level] || LEVEL_CONFIG.info;
  const IconComponent = config.icon;

  return (
    <div
      className={cn(
        "group p-4 border-b last:border-b-0 hover:bg-accent/50 transition-all",
        !notification.is_read && "bg-primary/5 border-l-2 border-l-primary"
      )}
    >
      <div className="flex gap-4">
        {/* Icon */}
        <div
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full shrink-0 transition-transform group-hover:scale-105",
            config.bgColor
          )}
        >
          <IconComponent className={cn("h-5 w-5", config.color)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4
                  className={cn(
                    "text-sm",
                    !notification.is_read ? "font-semibold" : "font-medium"
                  )}
                >
                  {notification.title}
                </h4>
                {!notification.is_read && (
                  <span className="w-2 h-2 bg-primary rounded-full shrink-0 animate-pulse" />
                )}
              </div>
              {notification.description && (
                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                  {notification.description}
                </p>
              )}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{formatTimeAgo(notification.created_at)}</span>
                <Badge variant={config.badgeVariant} className="text-xs capitalize">
                  {config.label}
                </Badge>
                {notification.actor && (
                  <span className="hidden sm:inline">
                    from {notification.actor.full_name}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              {notification.link && (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="h-8 px-2"
                >
                  <Link href={notification.link}>
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View
                  </Link>
                </Button>
              )}
              {!notification.is_read && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onMarkAsRead(notification.id)}
                  className="h-8 w-8"
                  title="Mark as read"
                >
                  <Check className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(notification.id)}
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  variant = "default",
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "default" | "primary" | "warning";
}) {
  return (
    <Card className={cn(
      "transition-all hover:shadow-md",
      variant === "primary" && "border-primary/50 bg-primary/5",
      variant === "warning" && "border-amber-500/50 bg-amber-500/5"
    )}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={cn(
          "h-4 w-4",
          variant === "primary" && "text-primary",
          variant === "warning" && "text-amber-500",
          variant === "default" && "text-muted-foreground"
        )} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-4 p-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "unread" | "read">("all");

  // API hooks
  const { data: notificationsData, isLoading } = useNotifications({ filter_type: filterType });
  const { data: stats } = useNotificationStats();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();

  const notifications = notificationsData?.items || [];

  // Filter by search
  const filteredNotifications = notifications.filter((notification) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      notification.title.toLowerCase().includes(query) ||
      (notification.description?.toLowerCase().includes(query) ?? false)
    );
  });

  // Stats
  const notificationStats = {
    total: stats?.all_count ?? notificationsData?.total ?? 0,
    unread: stats?.unread_count ?? notificationsData?.unread_count ?? 0,
    read: stats?.read_count ?? 0,
  };

  if (!user) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-md mx-auto">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Sign in required</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Please sign in to view your notifications.
            </p>
            <Button asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated with your latest activity
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/settings?tab=notifications">
            <Settings className="h-4 w-4 mr-2" />
            Preferences
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          title="Total"
          value={notificationStats.total}
          description="All notifications"
          icon={Bell}
        />
        <StatsCard
          title="Unread"
          value={notificationStats.unread}
          description="Require your attention"
          icon={AlertTriangle}
          variant={notificationStats.unread > 0 ? "warning" : "default"}
        />
        <StatsCard
          title="Read"
          value={notificationStats.read}
          description="Already viewed"
          icon={Check}
        />
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>All Notifications</CardTitle>
              <CardDescription>
                View and manage your notifications
              </CardDescription>
            </div>
            {notificationStats.unread > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllAsRead.mutate()}
                disabled={markAllAsRead.isPending}
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark all as read
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 p-4 border-b bg-muted/30">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ({notificationStats.total})</SelectItem>
                <SelectItem value="unread">Unread ({notificationStats.unread})</SelectItem>
                <SelectItem value="read">Read ({notificationStats.read})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notifications List */}
          {isLoading ? (
            <LoadingSkeleton />
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <Bell className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? "No results found" : "All caught up!"}
              </h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                {searchQuery
                  ? "Try adjusting your search or filter criteria."
                  : "You have no notifications right now. Check back later!"}
              </p>
              {searchQuery && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setSearchQuery("")}
                >
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div>
                {filteredNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={(id) => markAsRead.mutate(id)}
                    onDelete={(id) => deleteNotification.mutate(id)}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
