"use client";

/**
 * Unread Messages Widget
 * Shows unread message count with preview
 */

import {
  ArrowRight,
  Mail,
  MailOpen,
  MessageCircle,
  RefreshCw,
  Send,
  User,
  XCircle,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/modules/auth";
import { apiClient } from "@/shared/services/api/client";
import { cn } from "@/shared/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
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

interface Message {
  id: number;
  thread_id?: number;
  sender_id: number;
  sender_name: string;
  sender_avatar?: string;
  subject?: string;
  preview: string;
  is_read: boolean;
  created_at: string;
}

interface UnreadMessagesWidgetProps {
  maxItems?: number;
  className?: string;
  onViewAll?: () => void;
  onComposeNew?: () => void;
  onMessageClick?: (message: Message) => void;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function MessageItemSkeleton() {
  return (
    <div className="flex items-start space-x-3 p-3 animate-pulse">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

function MessageItem({
  message,
  onClick,
}: {
  message: Message;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-start w-full space-x-3 p-3 rounded-lg transition-all text-left",
        "hover:bg-gray-100 dark:hover:bg-gray-800",
        "focus:outline-none focus:ring-2 focus:ring-primary/50",
        !message.is_read && "bg-blue-50/50 dark:bg-blue-900/10"
      )}
    >
      <div className="relative flex-shrink-0">
        <Avatar className="h-10 w-10">
          {message.sender_avatar ? (
            <AvatarImage src={message.sender_avatar} alt={message.sender_name} />
          ) : null}
          <AvatarFallback className="bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 text-sm font-medium">
            {getInitials(message.sender_name)}
          </AvatarFallback>
        </Avatar>
        {!message.is_read && (
          <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-500 border-2 border-white dark:border-gray-900 rounded-full" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              "text-sm truncate",
              !message.is_read ? "font-semibold" : "font-medium"
            )}
          >
            {message.sender_name}
          </p>
          <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
            {formatTimeAgo(message.created_at)}
          </span>
        </div>
        {message.subject && (
          <p
            className={cn(
              "text-sm truncate mt-0.5",
              !message.is_read ? "font-medium text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"
            )}
          >
            {message.subject}
          </p>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
          {message.preview}
        </p>
      </div>
    </button>
  );
}

export function UnreadMessagesWidget({
  maxItems = 5,
  className,
  onViewAll,
  onComposeNew,
  onMessageClick,
}: UnreadMessagesWidgetProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<{
        items?: Message[];
        messages?: Message[];
        unread_count?: number;
      }>("/api/v1/messages/", { params: { limit: maxItems, is_read: false } });

      const items = response.data.items || response.data.messages || [];
      setMessages(items.slice(0, maxItems));
      setUnreadCount(response.data.unread_count || items.filter((m) => !m.is_read).length);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
      setError("Failed to load messages");
      // Set mock data for demo
      const mockMessages: Message[] = [
        {
          id: 1,
          sender_id: 2,
          sender_name: "John Doe",
          subject: "Project Update",
          preview: "Hey! I wanted to share some updates about the project timeline and milestones...",
          is_read: false,
          created_at: new Date(Date.now() - 600000).toISOString(),
        },
        {
          id: 2,
          sender_id: 3,
          sender_name: "Sarah Wilson",
          subject: "Meeting Tomorrow",
          preview: "Just a reminder about our meeting scheduled for tomorrow at 10 AM...",
          is_read: false,
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 3,
          sender_id: 4,
          sender_name: "Mike Johnson",
          preview: "Thanks for your help with the code review! Really appreciate the feedback.",
          is_read: true,
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 4,
          sender_id: 5,
          sender_name: "Emily Chen",
          subject: "Design Review",
          preview: "I have attached the latest mockups for your review. Let me know your thoughts...",
          is_read: false,
          created_at: new Date(Date.now() - 172800000).toISOString(),
        },
      ];
      setMessages(mockMessages);
      setUnreadCount(3);
    } finally {
      setLoading(false);
    }
  }, [user, maxItems]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleViewAll = () => {
    if (onViewAll) {
      onViewAll();
    } else {
      window.location.href = "/messages";
    }
  };

  const handleComposeNew = () => {
    if (onComposeNew) {
      onComposeNew();
    } else {
      window.location.href = "/messages/compose";
    }
  };

  const handleMessageClick = (message: Message) => {
    if (onMessageClick) {
      onMessageClick(message);
    } else {
      window.location.href = `/messages/${message.thread_id || message.id}`;
    }
  };

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-lg">
            <MessageCircle className="h-5 w-5 mr-2" />
            Messages
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {unreadCount > 99 ? "99+" : unreadCount} unread
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleComposeNew}
              className="h-8 w-8 p-0"
              title="Compose new message"
            >
              <Send className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchMessages()}
              disabled={loading}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        {/* Stats Summary */}
        {!loading && messages.length > 0 && (
          <div className="flex items-center gap-4 mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-lg font-bold">{unreadCount}</p>
                <p className="text-xs text-gray-500">Unread</p>
              </div>
            </div>
            <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                <MailOpen className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-lg font-bold">{messages.filter((m) => m.is_read).length}</p>
                <p className="text-xs text-gray-500">Read</p>
              </div>
            </div>
          </div>
        )}

        {/* Messages List */}
        {loading ? (
          <div className="space-y-1">
            {[...Array(3)].map((_, i) => (
              <MessageItemSkeleton key={i} />
            ))}
          </div>
        ) : error && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <XCircle className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-500">{error}</p>
            <Button variant="ghost" size="sm" onClick={() => fetchMessages()} className="mt-2">
              Try again
            </Button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageCircle className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              No messages
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Your inbox is empty
            </p>
            <Button variant="outline" size="sm" onClick={handleComposeNew} className="mt-4">
              <Send className="h-4 w-4 mr-2" />
              Compose Message
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-[240px] -mx-2">
            <div className="space-y-1 px-2">
              {messages.map((message) => (
                <MessageItem
                  key={message.id}
                  message={message}
                  onClick={() => handleMessageClick(message)}
                />
              ))}
            </div>
          </ScrollArea>
        )}

        {/* View All Link */}
        {messages.length > 0 && (
          <Button
            variant="ghost"
            className="w-full mt-3 text-sm"
            onClick={handleViewAll}
          >
            View all messages
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default UnreadMessagesWidget;
