"use client";

import React from "react";
import {
  AlertTriangle,
  AtSign,
  Bell,
  CheckSquare,
  Clock,
  Filter,
  MessageCircle,
  RefreshCw,
  Search,
  Settings,
  Shield,
  X,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import type {
  NotificationFiltersState,
  NotificationPriority,
  NotificationStats,
  NotificationStatus,
  NotificationType,
} from "../types";

interface NotificationFiltersProps {
  filters: NotificationFiltersState;
  stats?: NotificationStats;
  onFilterChange: (filters: Partial<NotificationFiltersState>) => void;
  onClearFilters: () => void;
  showAdvancedFilters?: boolean;
  layout?: "horizontal" | "vertical";
  className?: string;
}

// Type filter options
const typeFilters: Array<{
  value: NotificationType | "all";
  label: string;
  icon: React.ElementType;
}> = [
  { value: "all", label: "All Types", icon: Bell },
  { value: "system", label: "System", icon: Settings },
  { value: "message", label: "Messages", icon: MessageCircle },
  { value: "alert", label: "Alerts", icon: AlertTriangle },
  { value: "reminder", label: "Reminders", icon: Clock },
  { value: "update", label: "Updates", icon: RefreshCw },
  { value: "mention", label: "Mentions", icon: AtSign },
  { value: "task", label: "Tasks", icon: CheckSquare },
  { value: "security", label: "Security", icon: Shield },
];

// Status filter options
const statusFilters: Array<{ value: NotificationStatus | "all"; label: string }> = [
  { value: "all", label: "All Status" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
  { value: "archived", label: "Archived" },
];

// Priority filter options
const priorityFilters: Array<{
  value: NotificationPriority | "all";
  label: string;
  color: string;
}> = [
  { value: "all", label: "All Priorities", color: "" },
  { value: "urgent", label: "Urgent", color: "text-red-600" },
  { value: "high", label: "High", color: "text-orange-600" },
  { value: "normal", label: "Normal", color: "text-gray-600" },
  { value: "low", label: "Low", color: "text-gray-400" },
];

// Date range filter options
const dateRangeFilters: Array<{ value: string; label: string }> = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
];

const NotificationFilters: React.FC<NotificationFiltersProps> = ({
  filters,
  stats,
  onFilterChange,
  onClearFilters,
  showAdvancedFilters = false,
  layout = "horizontal",
  className = "",
}) => {
  const [showAdvanced, setShowAdvanced] = React.useState(showAdvancedFilters);

  const hasActiveFilters =
    filters.type !== "all" ||
    filters.status !== "all" ||
    filters.priority !== "all" ||
    filters.dateRange !== "all" ||
    filters.search !== "";

  // Vertical layout (sidebar style)
  if (layout === "vertical") {
    return (
      <div className={`space-y-6 ${className}`}>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            placeholder="Search notifications..."
            className="pl-10 pr-10"
          />
          {filters.search && (
            <button
              onClick={() => onFilterChange({ search: "" })}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Type filters */}
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Type
          </h4>
          <div className="space-y-1">
            {typeFilters.map((filter) => {
              const Icon = filter.icon;
              const count =
                filter.value === "all"
                  ? stats?.total
                  : stats?.by_type?.[filter.value as NotificationType];

              return (
                <button
                  key={filter.value}
                  onClick={() =>
                    onFilterChange({ type: filter.value as NotificationType | "all" })
                  }
                  className={`flex items-center justify-between w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                    filters.type === filter.value
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  }`}
                >
                  <div className="flex items-center">
                    <Icon className="w-4 h-4 mr-2" />
                    {filter.label}
                  </div>
                  {count !== undefined && (
                    <span className="text-xs text-gray-400">{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick filters */}
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Quick Filters
          </h4>
          <div className="space-y-1">
            <button
              onClick={() => onFilterChange({ status: "unread" })}
              className={`flex items-center justify-between w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                filters.status === "unread"
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              <div className="flex items-center">
                <Bell className="w-4 h-4 mr-2" />
                Unread
              </div>
              {stats?.unread !== undefined && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  {stats.unread}
                </Badge>
              )}
            </button>

            <button
              onClick={() => onFilterChange({ priority: "urgent" })}
              className={`flex items-center justify-between w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                filters.priority === "urgent"
                  ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              <div className="flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Urgent
              </div>
              {stats?.by_priority?.urgent !== undefined && (
                <span className="text-xs text-gray-400">
                  {stats.by_priority.urgent}
                </span>
              )}
            </button>

            <button
              onClick={() => onFilterChange({ status: "archived" })}
              className={`flex items-center w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                filters.status === "archived"
                  ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              <Clock className="w-4 h-4 mr-2" />
              Archived
            </button>
          </div>
        </div>

        {/* Date range */}
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Date Range
          </h4>
          <div className="space-y-1">
            {dateRangeFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => onFilterChange({ dateRange: filter.value as any })}
                className={`flex items-center w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                  filters.dateRange === filter.value
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="w-full"
          >
            <X className="w-4 h-4 mr-2" />
            Clear Filters
          </Button>
        )}
      </div>
    );
  }

  // Horizontal layout (toolbar style)
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Main filters row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            placeholder="Search notifications..."
            className="pl-10 pr-10"
          />
          {filters.search && (
            <button
              onClick={() => onFilterChange({ search: "" })}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Type dropdown */}
        <select
          value={filters.type}
          onChange={(e) =>
            onFilterChange({ type: e.target.value as NotificationType | "all" })
          }
          className="px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
        >
          {typeFilters.map((filter) => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </select>

        {/* Status dropdown */}
        <select
          value={filters.status}
          onChange={(e) =>
            onFilterChange({ status: e.target.value as NotificationStatus | "all" })
          }
          className="px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
        >
          {statusFilters.map((filter) => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </select>

        {/* Toggle advanced filters */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={showAdvanced ? "bg-gray-100 dark:bg-gray-800" : ""}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Advanced filters row */}
      {showAdvanced && (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          {/* Priority */}
          <div className="flex items-center gap-2">
            <Label className="text-sm text-gray-600 dark:text-gray-400">
              Priority:
            </Label>
            <select
              value={filters.priority}
              onChange={(e) =>
                onFilterChange({
                  priority: e.target.value as NotificationPriority | "all",
                })
              }
              className="px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
            >
              {priorityFilters.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2">
            <Label className="text-sm text-gray-600 dark:text-gray-400">
              Date:
            </Label>
            <select
              value={filters.dateRange}
              onChange={(e) =>
                onFilterChange({ dateRange: e.target.value as any })
              }
              className="px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
            >
              {dateRangeFilters.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationFilters;
