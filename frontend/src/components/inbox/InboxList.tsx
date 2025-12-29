import React, { useState } from 'react';
import {
  Inbox,
  Check,
  Archive,
  Trash2,
  Star,
  Tag,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import type { InboxItem as InboxItemType } from '@/lib/api/inbox';
import InboxItem from './InboxItem';

interface InboxListProps {
  items: InboxItemType[];
  onItemClick?: (item: InboxItemType) => void;
  onMarkRead?: (ids: number[]) => void;
  onToggleStar?: (id: number) => void;
  onTogglePin?: (id: number) => void;
  onArchive?: (ids: number[]) => void;
  onDelete?: (ids: number[]) => void;
  onRefresh?: () => void;
  loading?: boolean;
  showBulkActions?: boolean;
  emptyMessage?: string;
  className?: string;
}

const InboxList: React.FC<InboxListProps> = ({
  items,
  onItemClick,
  onMarkRead,
  onToggleStar,
  onTogglePin,
  onArchive,
  onDelete,
  onRefresh,
  loading = false,
  showBulkActions = true,
  emptyMessage = 'Your inbox is empty',
  className = '',
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const hasSelection = selectedIds.size > 0;
  const allSelected = items.length > 0 && selectedIds.size === items.length;

  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
    setSelectAll(newSelected.size === items.length);
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
      setSelectAll(false);
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
      setSelectAll(true);
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectAll(false);
  };

  const handleBulkMarkRead = () => {
    if (onMarkRead && selectedIds.size > 0) {
      onMarkRead(Array.from(selectedIds));
      clearSelection();
    }
  };

  const handleBulkArchive = () => {
    if (onArchive && selectedIds.size > 0) {
      onArchive(Array.from(selectedIds));
      clearSelection();
    }
  };

  const handleBulkDelete = () => {
    if (onDelete && selectedIds.size > 0) {
      onDelete(Array.from(selectedIds));
      clearSelection();
    }
  };

  if (loading && items.length === 0) {
    return (
      <div className={`${className}`}>
        {/* Loading skeleton */}
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-4 border-b animate-pulse">
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 bg-gray-200 rounded" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
              <div className="w-16 h-3 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-16 ${className}`}>
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Inbox className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-500 text-center">{emptyMessage}</p>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="mt-4 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
          >
            Refresh
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Toolbar */}
      {showBulkActions && (
        <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />

            {hasSelection ? (
              <>
                <span className="text-sm text-gray-600">
                  {selectedIds.size} selected
                </span>
                <div className="flex items-center gap-1 ml-2">
                  {onMarkRead && (
                    <button
                      onClick={handleBulkMarkRead}
                      className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  {onArchive && (
                    <button
                      onClick={handleBulkArchive}
                      className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
                      title="Archive"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={handleBulkDelete}
                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </>
            ) : (
              <span className="text-sm text-gray-500">Select all</span>
            )}
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      )}

      {/* Items */}
      <div className="divide-y">
        {items.map((item) => (
          <InboxItem
            key={item.id}
            item={item}
            isSelected={selectedIds.has(item.id)}
            onSelect={toggleSelect}
            onClick={onItemClick}
            onMarkRead={onMarkRead ? (id) => onMarkRead([id]) : undefined}
            onToggleStar={onToggleStar}
            onTogglePin={onTogglePin}
            onArchive={onArchive ? (id) => onArchive([id]) : undefined}
            onDelete={onDelete ? (id) => onDelete([id]) : undefined}
            showCheckbox={showBulkActions}
          />
        ))}
      </div>

      {/* Load more indicator */}
      {loading && items.length > 0 && (
        <div className="flex items-center justify-center py-4">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default InboxList;
