"use client";

import React, { useCallback, useMemo, useState } from "react";
import {
  Archive,
  Bell,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Settings,
  Trash2,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import {
  usePaginationState,
  useSearchState,
  useStringLiteralState,
} from "@/shared/hooks";
import NotificationFilters from "./NotificationFilters";
import NotificationItem from "./NotificationItem";
import {
  useArchiveNotification,
  useBulkArchive,
  useBulkDelete,
  useBulkMarkAsRead,
  useDeleteNotification,
  useMarkAllAsRead,
  useMarkAsRead,
  useMarkAsUnread,
  useNotifications,
  useNotificationStats,
} from "../hooks/useNotifications";
import type {
  Notification,
  NotificationFiltersState,
  NotificationListParams,
  NotificationPriority,
  NotificationStatus,
  NotificationType,
} from "../types";

interface NotificationListProps {
  onNotificationClick?: (notification: Notification) => void;
  onSettingsClick?: () => void;
  showFilters?: boolean;
  showBulkActions?: boolean;
  pageSize?: number;
  emptyMessage?: string;
  className?: string;
}

const NotificationList: React.FC<NotificationListProps> = ({
  onNotificationClick,
  onSettingsClick,
  showFilters = true,
  showBulkActions = true,
  pageSize = 20,
  emptyMessage = "No notifications yet",
  className = "",
}) => {
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // URL state for filters
  const [search, setSearch] = useSearchState();
  const {
    page: currentPage,
    setPage: setCurrentPage,
    limit,
  } = usePaginationState(1, pageSize);
  const [type, setType] = useStringLiteralState(
    "type",
    [
      "all",
      "system",
      "message",
      "alert",
      "reminder",
      "update",
      "mention",
      "task",
      "security",
    ] as const,
    "all"
  );
  const [status, setStatus] = useStringLiteralState(
    "status",
    ["all", "unread", "read", "archived"] as const,
    "all"
  );
  const [priority, setPriority] = useStringLiteralState(
    "priority",
    ["all", "low", "normal", "high", "urgent"] as const,
    "all"
  );
  const [dateRange, setDateRange] = useStringLiteralState(
    "dateRange",
    ["all", "today", "week", "month"] as const,
    "all"
  );

  // Build query params
  const queryParams: NotificationListParams = useMemo(() => {
    const params: NotificationListParams = {
      page: currentPage,
      limit,
    };

    if (search) params.search = search;
    if (type !== "all") params.type = type as NotificationType;
    if (status !== "all") params.status = status as NotificationStatus;
    if (priority !== "all") params.priority = priority as NotificationPriority;

    // Handle date range
    if (dateRange !== "all") {
      const now = new Date();
      let startDate: Date;

      switch (dateRange) {
        case "today":
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case "week":
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case "month":
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        default:
          startDate = now;
      }
      params.start_date = startDate.toISOString();
    }

    return params;
  }, [currentPage, limit, search, type, status, priority, dateRange]);

  // Fetch data
  const {
    data: notificationsData,
    isLoading,
    error,
    refetch,
  } = useNotifications(queryParams);
  const { data: stats } = useNotificationStats();

  // Mutations
  const markAsRead = useMarkAsRead();
  const markAsUnread = useMarkAsUnread();
  const archiveNotification = useArchiveNotification();
  const deleteNotification = useDeleteNotification();
  const bulkMarkAsRead = useBulkMarkAsRead();
  const bulkArchive = useBulkArchive();
  const bulkDelete = useBulkDelete();
  const markAllAsRead = useMarkAllAsRead();

  const notifications = notificationsData?.items || [];
  const totalPages = notificationsData?.pages || 1;

  // Selection helpers
  const hasSelection = selectedIds.size > 0;
  const allSelected =
    notifications.length > 0 && selectedIds.size === notifications.length;

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
      setSelectAll(false);
    } else {
      setSelectedIds(new Set(notifications.map((n) => n.id)));
      setSelectAll(true);
    }
  }, [allSelected, notifications]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectAll(false);
  }, []);

  // Bulk action handlers
  const handleBulkMarkRead = useCallback(() => {
    if (selectedIds.size > 0) {
      bulkMarkAsRead.mutate(Array.from(selectedIds));
      clearSelection();
    }
  }, [selectedIds, bulkMarkAsRead, clearSelection]);

  const handleBulkArchive = useCallback(() => {
    if (selectedIds.size > 0) {
      bulkArchive.mutate(Array.from(selectedIds));
      clearSelection();
    }
  }, [selectedIds, bulkArchive, clearSelection]);

  const handleBulkDelete = useCallback(() => {
    if (selectedIds.size > 0) {
      bulkDelete.mutate(Array.from(selectedIds));
      clearSelection();
    }
  }, [selectedIds, bulkDelete, clearSelection]);

  // Filter state for component
  const filtersState: NotificationFiltersState = useMemo(
    () => ({
      type: type as NotificationType | "all",
      status: status as NotificationStatus | "all",
      priority: priority as NotificationPriority | "all",
      dateRange: dateRange as "all" | "today" | "week" | "month",
      search: search || "",
    }),
    [type, status, priority, dateRange, search]
  );

  const handleFilterChange = useCallback(
    (updates: Partial<NotificationFiltersState>) => {
      if (updates.type !== undefined) setType(updates.type);
      if (updates.status !== undefined) setStatus(updates.status);
      if (updates.priority !== undefined) setPriority(updates.priority);
      if (updates.dateRange !== undefined) setDateRange(updates.dateRange);
      if (updates.search !== undefined) setSearch(updates.search || null);

      // Reset to first page when filters change
      if (currentPage !== 1) {
        setCurrentPage(1);
      }
    },
    [
      setType,
      setStatus,
      setPriority,
      setDateRange,
      setSearch,
      currentPage,
      setCurrentPage,
    ]
  );

  const handleClearFilters = useCallback(() => {
    setType("all");
    setStatus("all");
    setPriority("all");
    setDateRange("all");
    setSearch(null);
    setCurrentPage(1);
  }, [setType, setStatus, setPriority, setDateRange, setSearch, setCurrentPage]);

  // Loading skeleton
  if (isLoading && notifications.length === 0) {
    return (
      <div className={className}>
        {/* Loading skeleton */}
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-4 border-b animate-pulse">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
              </div>
              <div className="w-16 h-3 bg-gray-100 dark:bg-gray-800 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`p-8 text-center ${className}`}>
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
          <Bell className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Failed to load notifications
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          {error instanceof Error ? error.message : "An error occurred"}
        </p>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Bell className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Notifications
          </h1>
          {stats?.unread !== undefined && stats.unread > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">
              {stats.unread} unread
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending || !stats?.unread}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all read
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          {onSettingsClick && (
            <Button variant="outline" size="sm" onClick={onSettingsClick}>
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <NotificationFilters
          filters={filtersState}
          stats={stats}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
        />
      )}

      {/* List */}
      <Card>
        {/* Bulk actions toolbar */}
        {showBulkActions && notifications.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />

              {hasSelection ? (
                <>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedIds.size} selected
                  </span>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={handleBulkMarkRead}
                      disabled={bulkMarkAsRead.isPending}
                      className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleBulkArchive}
                      disabled={bulkArchive.isPending}
                      className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                      title="Archive"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      disabled={bulkDelete.isPending}
                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                <span className="text-sm text-gray-500">Select all</span>
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {emptyMessage}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-sm">
              When you receive notifications, they will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y dark:divide-gray-800">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                isSelected={selectedIds.has(notification.id)}
                onSelect={toggleSelect}
                onClick={onNotificationClick}
                onMarkRead={(id) => markAsRead.mutate(id)}
                onMarkUnread={(id) => markAsUnread.mutate(id)}
                onArchive={(id) => archiveNotification.mutate(id)}
                onDelete={(id) => deleteNotification.mutate(id)}
                showCheckbox={showBulkActions}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Pagination */}
      {notifications.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages || isLoading}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Loading indicator for refetch */}
      {isLoading && notifications.length > 0 && (
        <div className="flex items-center justify-center py-4">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default NotificationList;
