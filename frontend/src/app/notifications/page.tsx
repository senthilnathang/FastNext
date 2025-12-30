"use client";

import {
  Bell,
  Check,
  CheckCheck,
  ExternalLink,
  Search,
  Settings,
  Trash2,
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
  useBulkDelete,
} from "@/modules/notifications/hooks/useNotifications";
import type { Notification, NotificationLevel } from "@/modules/notifications/types";
import { NOTIFICATION_LEVEL_CONFIG } from "@/modules/notifications/types";
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
import { Separator } from "@/shared/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { cn } from "@/shared/utils";

function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
}: {
  notification: Notification;
  onMarkAsRead: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const levelConfig = NOTIFICATION_LEVEL_CONFIG[notification.level] || NOTIFICATION_LEVEL_CONFIG.info;

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return past.toLocaleDateString();
  };

  const getIconSymbol = (level: NotificationLevel) => {
    switch (level) {
      case "success": return "✓";
      case "warning": return "!";
      case "error": return "✕";
      default: return "i";
    }
  };

  return (
    <div
      className={cn(
        "p-4 border-b last:border-b-0 hover:bg-accent/50 transition-colors",
        !notification.is_read && "bg-primary/5"
      )}
    >
      <div className="flex items-start gap-4">
        {/* Level indicator */}
        <div
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full shrink-0 font-bold",
            levelConfig.bgColor
          )}
        >
          <span className={cn("text-sm", levelConfig.color)}>
            {getIconSymbol(notification.level)}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4
              className={cn(
                "text-sm truncate",
                !notification.is_read ? "font-semibold" : "font-medium"
              )}
            >
              {notification.title}
            </h4>
            {!notification.is_read && (
              <div className="w-2 h-2 bg-primary rounded-full shrink-0" />
            )}
            <Badge variant="outline" className="text-xs capitalize">
              {notification.level}
            </Badge>
          </div>
          {notification.description && (
            <p className="text-sm text-muted-foreground mb-2">{notification.description}</p>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{formatTimeAgo(notification.created_at)}</span>
              {notification.actor && (
                <>
                  <span>|</span>
                  <span>from {notification.actor.full_name}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              {notification.link && (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="h-7 px-2 text-xs"
                >
                  <Link href={notification.link}>
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View
                  </Link>
                </Button>
              )}
              {!notification.is_read && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onMarkAsRead(notification.id)}
                  className="h-7 px-2 text-xs"
                  title="Mark as read"
                >
                  <Check className="h-3 w-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(notification.id)}
                className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                title="Delete"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "read">("all");

  // API hooks
  const { data: notificationsData, isLoading } = useNotifications({ filter_type: activeTab });
  const { data: stats } = useNotificationStats();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();

  const notifications = notificationsData?.items || [];

  // Filter notifications by search
  const filteredNotifications = notifications.filter((notification) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        notification.title.toLowerCase().includes(query) ||
        (notification.description?.toLowerCase().includes(query) ?? false)
      );
    }
    return true;
  });

  // Stats
  const notificationStats = {
    total: stats?.all_count || 0,
    unread: stats?.unread_count || 0,
    read: stats?.read_count || 0,
  };

  // Actions
  const handleMarkAsRead = (id: number) => {
    markAsRead.mutate(id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate();
  };

  const handleDelete = (id: number) => {
    deleteNotification.mutate(id);
  };

  if (!user) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">Sign in required</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Please sign in to view your notifications.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            Manage your notifications and stay updated
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/settings/notifications">
              <Settings className="h-4 w-4 mr-2" />
              Preferences
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notificationStats.total}</div>
            <p className="text-xs text-muted-foreground">All notifications</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread</CardTitle>
            <Badge variant="destructive" className="h-5 px-1.5">
              {notificationStats.unread}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notificationStats.unread}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Read</CardTitle>
            <Check className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notificationStats.read}</div>
            <p className="text-xs text-muted-foreground">Already viewed</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>All Notifications</CardTitle>
              <CardDescription>
                View and manage all your notifications in one place
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {notificationStats.unread > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  disabled={markAllAsRead.isPending}
                >
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Mark all read
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "all" | "unread" | "read")}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">
                All ({notificationStats.total})
              </TabsTrigger>
              <TabsTrigger value="unread">
                Unread ({notificationStats.unread})
              </TabsTrigger>
              <TabsTrigger value="read">
                Read ({notificationStats.read})
              </TabsTrigger>
            </TabsList>

            <Separator className="mb-4" />

            <TabsContent value={activeTab} className="m-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No notifications</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-sm">
                    {searchQuery
                      ? "No notifications match your search. Try adjusting your search criteria."
                      : "You're all caught up! We'll notify you when there's something new."}
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="border rounded-lg divide-y">
                    {filteredNotifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onMarkAsRead={handleMarkAsRead}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
