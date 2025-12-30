"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Inbox,
  Bell,
  Settings,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { inboxApi, type InboxItem, type InboxStats, type InboxLabel, type InboxItemType, type InboxStatus, type InboxPriority } from '@/lib/api';
import {
  InboxList,
  InboxFilters,
  InboxStats as InboxStatsComponent,
  LabelManager,
} from '@/components/inbox';

export default function InboxPage() {
  const router = useRouter();

  // State
  const [items, setItems] = useState<InboxItem[]>([]);
  const [stats, setStats] = useState<InboxStats>({
    total: 0,
    unread: 0,
    by_type: {},
    by_priority: {},
    actionable: 0,
    starred: 0,
    pinned: 0,
  });
  const [labels, setLabels] = useState<InboxLabel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [selectedType, setSelectedType] = useState<InboxItemType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<InboxStatus | 'all'>('all');
  const [selectedPriority, setSelectedPriority] = useState<InboxPriority | 'all'>('all');
  const [selectedLabel, setSelectedLabel] = useState<number | undefined>();
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 20;

  // Sidebar state
  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'filters' | 'labels'>('filters');

  // Fetch inbox items
  const fetchItems = useCallback(async () => {
    try {
      const params: Record<string, unknown> = {
        skip: (page - 1) * limit,
        limit,
      };

      if (selectedType !== 'all') params.item_type = selectedType;
      if (selectedStatus !== 'all') params.status = selectedStatus;
      if (selectedPriority !== 'all') params.priority = selectedPriority;
      if (selectedLabel) params.label_id = selectedLabel;
      if (searchQuery) params.search = searchQuery;

      const response = await inboxApi.list(params as Parameters<typeof inboxApi.list>[0]);
      setItems(response.items);
      setTotalItems(response.total);
    } catch (error) {
      console.error('Failed to fetch inbox items:', error);
    }
  }, [page, selectedType, selectedStatus, selectedPriority, selectedLabel, searchQuery]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await inboxApi.stats.get();
      setStats(response);
    } catch (error) {
      console.error('Failed to fetch inbox stats:', error);
    }
  }, []);

  // Fetch labels
  const fetchLabels = useCallback(async () => {
    try {
      const response = await inboxApi.labels.list();
      setLabels(response);
    } catch (error) {
      console.error('Failed to fetch labels:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchItems(), fetchStats(), fetchLabels()]);
      setLoading(false);
    };
    loadData();
  }, [fetchItems, fetchStats, fetchLabels]);

  // Refresh on filter change
  useEffect(() => {
    if (!loading) {
      fetchItems();
    }
  }, [selectedType, selectedStatus, selectedPriority, selectedLabel, searchQuery, page]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchItems(), fetchStats()]);
    setRefreshing(false);
  };

  const handleItemClick = (item: InboxItem) => {
    router.push(`/inbox/${item.id}`);
  };

  const handleMarkRead = async (ids: number[]) => {
    try {
      await inboxApi.bulk.markRead(ids);
      setItems(items.map((item) =>
        ids.includes(item.id) ? { ...item, status: 'read' as InboxStatus } : item
      ));
      fetchStats();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleToggleStar = async (id: number) => {
    try {
      const item = items.find((i) => i.id === id);
      if (!item) return;
      await inboxApi.toggleStar(id);
      setItems(items.map((i) =>
        i.id === id ? { ...i, is_starred: !i.is_starred } : i
      ));
    } catch (error) {
      console.error('Failed to toggle star:', error);
    }
  };

  const handleTogglePin = async (id: number) => {
    try {
      await inboxApi.togglePin(id);
      setItems(items.map((i) =>
        i.id === id ? { ...i, is_pinned: !i.is_pinned } : i
      ));
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };

  const handleArchive = async (ids: number[]) => {
    try {
      await inboxApi.bulk.archive(ids);
      setItems(items.filter((item) => !ids.includes(item.id)));
      fetchStats();
    } catch (error) {
      console.error('Failed to archive:', error);
    }
  };

  const handleDelete = async (ids: number[]) => {
    try {
      await inboxApi.bulk.delete(ids);
      setItems(items.filter((item) => !ids.includes(item.id)));
      fetchStats();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleCreateLabel = async (data: { name: string; color: string; icon?: string; description?: string }) => {
    try {
      const newLabel = await inboxApi.labels.create(data);
      setLabels([...labels, newLabel]);
    } catch (error) {
      console.error('Failed to create label:', error);
    }
  };

  const handleUpdateLabel = async (id: number, data: { name?: string; color?: string; icon?: string; description?: string }) => {
    try {
      const updated = await inboxApi.labels.update(id, data);
      setLabels(labels.map((l) => (l.id === id ? updated : l)));
    } catch (error) {
      console.error('Failed to update label:', error);
    }
  };

  const handleDeleteLabel = async (id: number) => {
    try {
      await inboxApi.labels.delete(id);
      setLabels(labels.filter((l) => l.id !== id));
      if (selectedLabel === id) setSelectedLabel(undefined);
    } catch (error) {
      console.error('Failed to delete label:', error);
    }
  };

  const clearFilters = () => {
    setSelectedType('all');
    setSelectedStatus('all');
    setSelectedPriority('all');
    setSelectedLabel(undefined);
    setSearchQuery('');
    setPage(1);
  };

  const totalPages = Math.ceil(totalItems / limit);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Inbox className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
                <p className="text-sm text-gray-500">
                  {stats.unread > 0 ? `${stats.unread} unread` : 'All caught up!'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className={`p-2 rounded-lg ${showSidebar ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                title="Toggle filters"
              >
                <Filter className="w-5 h-5" />
              </button>
              <button
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <InboxStatsComponent stats={stats} loading={loading} layout="horizontal" />
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <div className="flex gap-6">
          {/* Sidebar */}
          {showSidebar && (
            <div className="w-72 flex-shrink-0">
              <div className="bg-white rounded-lg border shadow-sm sticky top-32">
                {/* Sidebar tabs */}
                <div className="flex border-b">
                  <button
                    onClick={() => setSidebarTab('filters')}
                    className={`flex-1 px-4 py-3 text-sm font-medium ${
                      sidebarTab === 'filters'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Filters
                  </button>
                  <button
                    onClick={() => setSidebarTab('labels')}
                    className={`flex-1 px-4 py-3 text-sm font-medium ${
                      sidebarTab === 'labels'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Labels
                  </button>
                </div>

                <div className="p-4">
                  {sidebarTab === 'filters' ? (
                    <InboxFilters
                      selectedType={selectedType}
                      selectedStatus={selectedStatus}
                      selectedPriority={selectedPriority}
                      selectedLabel={selectedLabel}
                      searchQuery={searchQuery}
                      labels={labels}
                      stats={{
                        total: stats.total,
                        unread: stats.unread,
                        byType: stats.by_type as { [key: string]: number },
                        starred: stats.starred,
                        actionable: stats.actionable,
                      }}
                      onTypeChange={setSelectedType}
                      onStatusChange={setSelectedStatus}
                      onPriorityChange={setSelectedPriority}
                      onLabelChange={setSelectedLabel}
                      onSearchChange={setSearchQuery}
                      onClearFilters={clearFilters}
                      layout="vertical"
                      showSearch={true}
                    />
                  ) : (
                    <LabelManager
                      labels={labels}
                      onCreateLabel={handleCreateLabel}
                      onUpdateLabel={handleUpdateLabel}
                      onDeleteLabel={handleDeleteLabel}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Main list */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-lg border shadow-sm">
              <InboxList
                items={items}
                onItemClick={handleItemClick}
                onMarkRead={handleMarkRead}
                onToggleStar={handleToggleStar}
                onTogglePin={handleTogglePin}
                onArchive={handleArchive}
                onDelete={handleDelete}
                onRefresh={handleRefresh}
                loading={loading || refreshing}
                showBulkActions={true}
                emptyMessage={
                  searchQuery || selectedType !== 'all' || selectedStatus !== 'all'
                    ? 'No items match your filters'
                    : 'Your inbox is empty'
                }
              />

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <div className="text-sm text-gray-500">
                    Showing {(page - 1) * limit + 1}-{Math.min(page * limit, totalItems)} of {totalItems}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page === totalPages}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
