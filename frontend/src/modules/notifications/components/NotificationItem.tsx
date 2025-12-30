"use client";

import React, { memo } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  Archive,
  AtSign,
  Bell,
  Check,
  CheckSquare,
  Clock,
  ExternalLink,
  MessageCircle,
  MoreHorizontal,
  RefreshCw,
  Settings,
  Shield,
  Trash2,
} from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import type { Notification, NotificationPriority, NotificationType } from "../types";

interface NotificationItemProps {
  notification: Notification;
  isSelected?: boolean;
  onSelect?: (id: number) => void;
  onClick?: (notification: Notification) => void;
  onMarkRead?: (id: number) => void;
  onMarkUnread?: (id: number) => void;
  onArchive?: (id: number) => void;
  onDelete?: (id: number) => void;
  showCheckbox?: boolean;
  compact?: boolean;
  className?: string;
}

// Get icon for notification type
const getTypeIcon = (type: NotificationType): React.ElementType => {
  const icons: Record<NotificationType, React.ElementType> = {
    system: Settings,
    message: MessageCircle,
    alert: AlertTriangle,
    reminder: Clock,
    update: RefreshCw,
    mention: AtSign,
    task: CheckSquare,
    security: Shield,
  };
  return icons[type] || Bell;
};

// Get color for notification type
const getTypeColor = (type: NotificationType, priority: NotificationPriority): string => {
  if (priority === "urgent") return "text-red-500";
  if (priority === "high") return "text-orange-500";

  const colors: Record<NotificationType, string> = {
    system: "text-gray-500",
    message: "text-blue-500",
    alert: "text-red-500",
    reminder: "text-yellow-500",
    update: "text-green-500",
    mention: "text-purple-500",
    task: "text-amber-500",
    security: "text-orange-500",
  };
  return colors[type] || "text-gray-500";
};

// Get priority styles
const getPriorityStyles = (priority: NotificationPriority): string => {
  switch (priority) {
    case "urgent":
      return "border-l-4 border-l-red-500";
    case "high":
      return "border-l-4 border-l-orange-500";
    case "normal":
      return "";
    case "low":
      return "border-l-4 border-l-gray-300";
    default:
      return "";
  }
};

const NotificationItem: React.FC<NotificationItemProps> = memo(
  ({
    notification,
    isSelected = false,
    onSelect,
    onClick,
    onMarkRead,
    onMarkUnread,
    onArchive,
    onDelete,
    showCheckbox = false,
    compact = false,
    className = "",
  }) => {
    const [showMenu, setShowMenu] = React.useState(false);
    const menuRef = React.useRef<HTMLDivElement>(null);

    const isUnread = !notification.is_read;
    const Icon = getTypeIcon(notification.type);

    // Close menu on outside click
    React.useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          setShowMenu(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleClick = () => {
      if (onClick) onClick(notification);
      if (onMarkRead && isUnread) onMarkRead(notification.id);
    };

    const handleCheckboxClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect?.(notification.id);
    };

    return (
      <div
        className={`group relative flex items-start p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer ${
          isUnread ? "bg-blue-50/50 dark:bg-blue-900/10" : "bg-white dark:bg-gray-900"
        } ${isSelected ? "bg-blue-100 dark:bg-blue-900/30" : ""} ${getPriorityStyles(
          notification.priority
        )} ${className}`}
        onClick={handleClick}
      >
        {/* Checkbox */}
        {showCheckbox && (
          <div className="mr-3 flex-shrink-0" onClick={handleCheckboxClick}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onSelect?.(notification.id)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Icon */}
        <div
          className={`flex-shrink-0 p-2 rounded-full ${
            isUnread ? "bg-blue-100 dark:bg-blue-900/30" : "bg-gray-100 dark:bg-gray-800"
          }`}
        >
          <Icon
            className={`w-5 h-5 ${getTypeColor(
              notification.type,
              notification.priority
            )}`}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 ml-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {isUnread && (
                  <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                )}
                <h4
                  className={`text-sm truncate ${
                    isUnread
                      ? "font-semibold text-gray-900 dark:text-white"
                      : "font-medium text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {notification.title}
                </h4>
                {notification.priority === "urgent" && (
                  <Badge variant="destructive" className="text-xs">
                    Urgent
                  </Badge>
                )}
                {notification.priority === "high" && (
                  <Badge
                    variant="secondary"
                    className="text-xs bg-orange-100 text-orange-700"
                  >
                    High
                  </Badge>
                )}
              </div>

              {!compact && notification.message && (
                <p
                  className={`text-sm mt-0.5 line-clamp-2 ${
                    isUnread
                      ? "text-gray-700 dark:text-gray-300"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {notification.message}
                </p>
              )}

              {/* Meta info */}
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                <Badge variant="outline" className="text-xs font-normal">
                  {notification.type}
                </Badge>
                <span>
                  {formatDistanceToNow(new Date(notification.created_at), {
                    addSuffix: true,
                  })}
                </span>
                {notification.source_type && (
                  <span className="text-gray-400">
                    via {notification.source_type}
                  </span>
                )}
              </div>
            </div>

            {/* Time */}
            <div className="ml-4 flex-shrink-0 text-xs text-gray-400">
              {formatDistanceToNow(new Date(notification.created_at), {
                addSuffix: false,
              })}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div
          className="ml-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          {notification.action_url && (
            <a
              href={notification.action_url}
              className="p-1 text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              title={notification.action_label || "Open"}
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-lg shadow-lg z-10">
                <div className="py-1">
                  {isUnread && onMarkRead && (
                    <button
                      onClick={() => {
                        onMarkRead(notification.id);
                        setShowMenu(false);
                      }}
                      className="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Mark as read
                    </button>
                  )}
                  {!isUnread && onMarkUnread && (
                    <button
                      onClick={() => {
                        onMarkUnread(notification.id);
                        setShowMenu(false);
                      }}
                      className="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <Bell className="w-4 h-4 mr-2" />
                      Mark as unread
                    </button>
                  )}
                  {onArchive && (
                    <button
                      onClick={() => {
                        onArchive(notification.id);
                        setShowMenu(false);
                      }}
                      className="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <Archive className="w-4 h-4 mr-2" />
                      Archive
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => {
                        onDelete(notification.id);
                        setShowMenu(false);
                      }}
                      className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

NotificationItem.displayName = "NotificationItem";

export default NotificationItem;
