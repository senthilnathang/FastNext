"use client";

import {
  Bell,
  Check,
  CheckCheck,
  ExternalLink,
  Filter,
  Search,
  Settings,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/modules/auth";
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
import { Separator } from "@/shared/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { apiClient } from "@/shared/services/api/client";
import { cn } from "@/shared/utils";

interface Notification {
  id: number;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error" | "system";
  channels: string[];
  is_read: boolean;
  is_sent: boolean;
  sent_at: string | null;
  action_url: string | null;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Mock notifications for demonstration
const mockNotifications: Notification[] = [
  {
    id: 1,
    title: "Welcome to FastNext",
    message: "Get started by exploring the dashboard and setting up your profile.",
    type: "info",
    channels: ["in_app", "email"],
    is_read: false,
    is_sent: true,
    sent_at: new Date().toISOString(),
    action_url: "/dashboard",
    data: {},
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    title: "Security Alert",
    message: "A new login was detected from a new device. If this wasn't you, please secure your account.",
    type: "warning",
    channels: ["in_app", "email", "push"],
    is_read: false,
    is_sent: true,
    sent_at: new Date().toISOString(),
    action_url: "/settings?tab=security",
    data: { device: "Chrome on Windows" },
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 3,
    title: "System Maintenance",
    message: "Scheduled maintenance will occur on Sunday at 2:00 AM UTC. Expected downtime: 30 minutes.",
    type: "system",
    channels: ["in_app", "email"],
    is_read: true,
    is_sent: true,
    sent_at: new Date().toISOString(),
    action_url: null,
    data: {},
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 4,
    title: "Project Created Successfully",
    message: "Your new project 'Website Redesign' has been created successfully.",
    type: "success",
    channels: ["in_app"],
    is_read: true,
    is_sent: true,
    sent_at: new Date().toISOString(),
    action_url: "/projects/1",
    data: { projectId: 1 },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 5,
    title: "Error Processing Request",
    message: "There was an error processing your data import. Please try again or contact support.",
    type: "error",
    channels: ["in_app", "email"],
    is_read: true,
    is_sent: true,
    sent_at: new Date().toISOString(),
    action_url: "/admin/data-import",
    data: {},
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
}: {
  notification: Notification;
  onMarkAsRead: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const getTypeStyles = (type: string) => {
    switch (type) {
      case "success":
        return {
          color: "text-green-600 dark:text-green-400",
          bg: "bg-green-100 dark:bg-green-900/30",
          icon: "check",
        };
      case "warning":
        return {
          color: "text-yellow-600 dark:text-yellow-400",
          bg: "bg-yellow-100 dark:bg-yellow-900/30",
          icon: "!",
        };
      case "error":
        return {
          color: "text-red-600 dark:text-red-400",
          bg: "bg-red-100 dark:bg-red-900/30",
          icon: "x",
        };
      case "system":
        return {
          color: "text-purple-600 dark:text-purple-400",
          bg: "bg-purple-100 dark:bg-purple-900/30",
          icon: "*",
        };
      default:
        return {
          color: "text-blue-600 dark:text-blue-400",
          bg: "bg-blue-100 dark:bg-blue-900/30",
          icon: "i",
        };
    }
  };

  const styles = getTypeStyles(notification.type);

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

  return (
    <div
      className={cn(
        "p-4 border-b last:border-b-0 hover:bg-accent/50 transition-colors",
        !notification.is_read && "bg-primary/5"
      )}
    >
      <div className="flex items-start gap-4">
        {/* Type indicator */}
        <div
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full shrink-0 font-bold",
            styles.bg
          )}
        >
          <span className={cn("text-sm", styles.color)}>{styles.icon}</span>
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
              {notification.type}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{formatTimeAgo(notification.created_at)}</span>
              {notification.channels.length > 0 && (
                <>
                  <span>|</span>
                  <span className="capitalize">
                    {notification.channels.join(", ").replace(/_/g, " ")}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              {notification.action_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="h-7 px-2 text-xs"
                >
                  <Link href={notification.action_url}>
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
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("all");

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await apiClient.get("/api/v1/notifications/");
      if (response.data.notifications) {
        setNotifications(response.data.notifications);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      // Keep using mock data on error
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Filter notifications
  const filteredNotifications = notifications.filter((notification) => {
    // Tab filter
    if (activeTab === "unread" && notification.is_read) return false;
    if (activeTab === "read" && !notification.is_read) return false;

    // Type filter
    if (typeFilter !== "all" && notification.type !== typeFilter) return false;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        notification.title.toLowerCase().includes(query) ||
        notification.message.toLowerCase().includes(query)
      );
    }

    return true;
  });

  // Stats
  const stats = {
    total: notifications.length,
    unread: notifications.filter((n) => !n.is_read).length,
    read: notifications.filter((n) => n.is_read).length,
  };

  // Actions
  const markAsRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const deleteNotification = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const deleteAllRead = () => {
    setNotifications((prev) => prev.filter((n) => !n.is_read));
  };

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
            <Link href="/settings?tab=notifications">
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
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All notifications</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread</CardTitle>
            <Badge variant="destructive" className="h-5 px-1.5">
              {stats.unread}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unread}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Read</CardTitle>
            <Check className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.read}</div>
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
              {stats.unread > 0 && (
                <Button variant="outline" size="sm" onClick={markAllAsRead}>
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Mark all read
                </Button>
              )}
              {stats.read > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deleteAllRead}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear read
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
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
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">
                All ({stats.total})
              </TabsTrigger>
              <TabsTrigger value="unread">
                Unread ({stats.unread})
              </TabsTrigger>
              <TabsTrigger value="read">
                Read ({stats.read})
              </TabsTrigger>
            </TabsList>

            <Separator className="mb-4" />

            <TabsContent value={activeTab} className="m-0">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No notifications</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-sm">
                    {searchQuery || typeFilter !== "all"
                      ? "No notifications match your filters. Try adjusting your search or filter criteria."
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
                        onMarkAsRead={markAsRead}
                        onDelete={deleteNotification}
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
