import React from 'react';
import {
  Inbox,
  Bell,
  MessageCircle,
  AtSign,
  Activity,
  CheckSquare,
  ThumbsUp,
  Star,
  Archive,
  Clock,
  AlertCircle,
  Search,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import type { InboxItemType, InboxStatus, InboxPriority, Label } from '@/lib/api/inbox';

interface InboxFiltersProps {
  selectedType?: InboxItemType | 'all';
  selectedStatus?: InboxStatus | 'all';
  selectedPriority?: InboxPriority | 'all';
  selectedLabel?: number;
  searchQuery?: string;
  labels?: Label[];
  stats?: {
    total?: number;
    unread?: number;
    byType?: { [key: string]: number };
    starred?: number;
    actionable?: number;
  };
  onTypeChange?: (type: InboxItemType | 'all') => void;
  onStatusChange?: (status: InboxStatus | 'all') => void;
  onPriorityChange?: (priority: InboxPriority | 'all') => void;
  onLabelChange?: (labelId: number | undefined) => void;
  onSearchChange?: (query: string) => void;
  onClearFilters?: () => void;
  showSearch?: boolean;
  showAdvanced?: boolean;
  layout?: 'horizontal' | 'vertical';
  className?: string;
}

const typeFilters = [
  { value: 'all' as const, label: 'All', icon: Inbox },
  { value: 'notification' as InboxItemType, label: 'Notifications', icon: Bell },
  { value: 'message' as InboxItemType, label: 'Messages', icon: MessageCircle },
  { value: 'mention' as InboxItemType, label: 'Mentions', icon: AtSign },
  { value: 'activity' as InboxItemType, label: 'Activity', icon: Activity },
  { value: 'task' as InboxItemType, label: 'Tasks', icon: CheckSquare },
  { value: 'approval' as InboxItemType, label: 'Approvals', icon: ThumbsUp },
];

const statusFilters = [
  { value: 'all' as const, label: 'All' },
  { value: 'unread' as InboxStatus, label: 'Unread' },
  { value: 'read' as InboxStatus, label: 'Read' },
  { value: 'archived' as InboxStatus, label: 'Archived' },
];

const priorityFilters = [
  { value: 'all' as const, label: 'All priorities' },
  { value: 'urgent' as InboxPriority, label: 'Urgent', color: 'text-red-600' },
  { value: 'high' as InboxPriority, label: 'High', color: 'text-orange-600' },
  { value: 'normal' as InboxPriority, label: 'Normal', color: 'text-gray-600' },
  { value: 'low' as InboxPriority, label: 'Low', color: 'text-gray-400' },
];

const InboxFilters: React.FC<InboxFiltersProps> = ({
  selectedType = 'all',
  selectedStatus = 'all',
  selectedPriority = 'all',
  selectedLabel,
  searchQuery = '',
  labels = [],
  stats,
  onTypeChange,
  onStatusChange,
  onPriorityChange,
  onLabelChange,
  onSearchChange,
  onClearFilters,
  showSearch = true,
  showAdvanced = false,
  layout = 'horizontal',
  className = '',
}) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(showAdvanced);

  const hasActiveFilters =
    selectedType !== 'all' ||
    selectedStatus !== 'all' ||
    selectedPriority !== 'all' ||
    selectedLabel !== undefined ||
    searchQuery !== '';

  if (layout === 'vertical') {
    return (
      <div className={`space-y-6 ${className}`}>
        {/* Search */}
        {showSearch && onSearchChange && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search inbox..."
              className="w-full pl-10 pr-10 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Type filters */}
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Type</h4>
          <div className="space-y-1">
            {typeFilters.map((filter) => {
              const Icon = filter.icon;
              const count = filter.value === 'all'
                ? stats?.total
                : stats?.byType?.[filter.value];

              return (
                <button
                  key={filter.value}
                  onClick={() => onTypeChange?.(filter.value)}
                  className={`flex items-center justify-between w-full px-3 py-2 text-sm rounded-lg ${
                    selectedType === filter.value
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
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
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Quick Filters</h4>
          <div className="space-y-1">
            <button
              onClick={() => onStatusChange?.('unread')}
              className={`flex items-center justify-between w-full px-3 py-2 text-sm rounded-lg ${
                selectedStatus === 'unread'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Unread
              </div>
              {stats?.unread !== undefined && (
                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                  {stats.unread}
                </span>
              )}
            </button>

            <button
              onClick={() => onTypeChange?.('task' as InboxItemType)}
              className={`flex items-center justify-between w-full px-3 py-2 text-sm rounded-lg ${
                selectedType === 'task'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                Action Required
              </div>
              {stats?.actionable !== undefined && (
                <span className="text-xs text-gray-400">{stats.actionable}</span>
              )}
            </button>

            <button
              className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <Star className="w-4 h-4 mr-2" />
              Starred
              {stats?.starred !== undefined && (
                <span className="ml-auto text-xs text-gray-400">{stats.starred}</span>
              )}
            </button>

            <button
              onClick={() => onStatusChange?.('archived')}
              className={`flex items-center w-full px-3 py-2 text-sm rounded-lg ${
                selectedStatus === 'archived'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Archive className="w-4 h-4 mr-2" />
              Archived
            </button>
          </div>
        </div>

        {/* Labels */}
        {labels.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Labels</h4>
            <div className="space-y-1">
              {labels.map((label) => (
                <button
                  key={label.id}
                  onClick={() => onLabelChange?.(selectedLabel === label.id ? undefined : label.id)}
                  className={`flex items-center w-full px-3 py-2 text-sm rounded-lg ${
                    selectedLabel === label.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: label.color }}
                  />
                  {label.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Horizontal layout
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Search and filters row */}
      <div className="flex flex-wrap items-center gap-3">
        {showSearch && onSearchChange && (
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search inbox..."
              className="w-full pl-10 pr-10 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Type dropdown */}
        {onTypeChange && (
          <select
            value={selectedType}
            onChange={(e) => onTypeChange(e.target.value as InboxItemType | 'all')}
            className="px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {typeFilters.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        )}

        {/* Status dropdown */}
        {onStatusChange && (
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value as InboxStatus | 'all')}
            className="px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {statusFilters.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        )}

        {/* Toggle advanced filters */}
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className={`px-3 py-2 text-sm border rounded-lg flex items-center gap-2 ${
            showAdvancedFilters ? 'bg-gray-100' : 'hover:bg-gray-50'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
        </button>

        {/* Clear filters */}
        {hasActiveFilters && onClearFilters && (
          <button
            onClick={onClearFilters}
            className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Advanced filters row */}
      {showAdvancedFilters && (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-lg">
          {/* Priority */}
          {onPriorityChange && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Priority:</span>
              <select
                value={selectedPriority}
                onChange={(e) => onPriorityChange(e.target.value as InboxPriority | 'all')}
                className="px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {priorityFilters.map((filter) => (
                  <option key={filter.value} value={filter.value}>
                    {filter.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Labels */}
          {labels.length > 0 && onLabelChange && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Label:</span>
              <select
                value={selectedLabel || ''}
                onChange={(e) => onLabelChange(e.target.value ? Number(e.target.value) : undefined)}
                className="px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All labels</option>
                {labels.map((label) => (
                  <option key={label.id} value={label.id}>
                    {label.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InboxFilters;
