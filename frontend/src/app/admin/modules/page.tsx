"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Package,
  Search,
  RefreshCw,
  Download,
  Upload,
  Play,
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Grid,
  List,
  Filter,
  ChevronDown,
  Layers,
  Puzzle,
} from 'lucide-react';
import { modulesApi, type InstalledModule, type ModuleState, type ModuleCategory } from '@/lib/api';

type ViewMode = 'grid' | 'list';

const getStateColor = (state: ModuleState) => {
  switch (state) {
    case 'installed':
      return 'bg-green-500/10 text-green-600 dark:text-green-400';
    case 'to_install':
      return 'bg-primary/10 text-primary';
    case 'to_upgrade':
      return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
    case 'to_remove':
      return 'bg-destructive/10 text-destructive';
    case 'uninstalled':
      return 'bg-muted text-muted-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const getStateIcon = (state: ModuleState) => {
  switch (state) {
    case 'installed':
      return <CheckCircle className="w-4 h-4" />;
    case 'to_install':
      return <Download className="w-4 h-4" />;
    case 'to_upgrade':
      return <Upload className="w-4 h-4" />;
    case 'to_remove':
      return <XCircle className="w-4 h-4" />;
    case 'uninstalled':
      return <AlertCircle className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
};

export default function ModulesPage() {
  const router = useRouter();

  // State
  const [modules, setModules] = useState<InstalledModule[]>([]);
  const [categories, setCategories] = useState<ModuleCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [applying, setApplying] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState<ModuleState | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAppsOnly, setShowAppsOnly] = useState(false);

  // View
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Fetch modules
  const fetchModules = useCallback(async () => {
    try {
      const params: Record<string, unknown> = {};
      if (selectedState !== 'all') params.state = selectedState;
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (showAppsOnly) params.application = true;
      if (searchQuery) params.search = searchQuery;

      const response = await modulesApi.list(params as Parameters<typeof modulesApi.list>[0]);
      setModules(response.items);
    } catch (error) {
      console.error('Failed to fetch modules:', error);
    }
  }, [selectedState, selectedCategory, showAppsOnly, searchQuery]);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const response = await modulesApi.categories.list();
      setCategories(response);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchModules(), fetchCategories()]);
      setLoading(false);
    };
    loadData();
  }, [fetchModules, fetchCategories]);

  // Refresh on filter change
  useEffect(() => {
    if (!loading) {
      fetchModules();
    }
  }, [selectedState, selectedCategory, showAppsOnly, searchQuery]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await modulesApi.refresh();
      await fetchModules();
    } catch (error) {
      console.error('Failed to refresh modules:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleInstall = async (name: string) => {
    try {
      await modulesApi.install(name);
      fetchModules();
    } catch (error) {
      console.error('Failed to install module:', error);
    }
  };

  const handleUninstall = async (name: string) => {
    if (!confirm(`Are you sure you want to uninstall "${name}"?`)) return;
    try {
      await modulesApi.uninstall(name);
      fetchModules();
    } catch (error) {
      console.error('Failed to uninstall module:', error);
    }
  };

  const handleUpgrade = async (name: string) => {
    try {
      await modulesApi.upgrade(name);
      fetchModules();
    } catch (error) {
      console.error('Failed to upgrade module:', error);
    }
  };

  const handleApplyPending = async () => {
    setApplying(true);
    try {
      await modulesApi.applyPending();
      fetchModules();
    } catch (error) {
      console.error('Failed to apply pending operations:', error);
    } finally {
      setApplying(false);
    }
  };

  const pendingOperations = modules.filter((m) =>
    ['to_install', 'to_upgrade', 'to_remove'].includes(m.state)
  );

  const installedCount = modules.filter((m) => m.state === 'installed').length;
  const availableCount = modules.filter((m) => m.state === 'uninstalled').length;

  const renderModuleCard = (module: InstalledModule) => (
    <div
      key={module.name}
      className="bg-card rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => router.push(`/admin/modules/${module.name}`)}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              {module.icon ? (
                <span className="text-2xl">{module.icon}</span>
              ) : module.application ? (
                <Layers className="w-6 h-6 text-primary" />
              ) : (
                <Puzzle className="w-6 h-6 text-primary" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{module.display_name}</h3>
              <p className="text-xs text-muted-foreground">{module.name}</p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${getStateColor(module.state)}`}>
            {getStateIcon(module.state)}
            {module.state.replace('_', ' ')}
          </span>
        </div>

        {module.summary && (
          <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{module.summary}</p>
        )}

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>v{module.version}</span>
            {module.author && (
              <>
                <span>•</span>
                <span>{module.author}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {module.state === 'uninstalled' && (
              <button
                onClick={() => handleInstall(module.name)}
                className="px-3 py-1 text-xs font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded"
              >
                Install
              </button>
            )}
            {module.state === 'installed' && module.latest_version && module.latest_version !== module.version && (
              <button
                onClick={() => handleUpgrade(module.name)}
                className="px-3 py-1 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600 rounded"
              >
                Upgrade
              </button>
            )}
            {module.state === 'installed' && !module.is_core && (
              <button
                onClick={() => handleUninstall(module.name)}
                className="px-3 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 rounded"
              >
                Uninstall
              </button>
            )}
          </div>
        </div>

        {module.depends && module.depends.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              Dependencies: {module.depends.join(', ')}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderModuleRow = (module: InstalledModule) => (
    <tr
      key={module.name}
      className="hover:bg-muted/50 cursor-pointer"
      onClick={() => router.push(`/admin/modules/${module.name}`)}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            {module.icon ? (
              <span className="text-xl">{module.icon}</span>
            ) : module.application ? (
              <Layers className="w-5 h-5 text-primary" />
            ) : (
              <Puzzle className="w-5 h-5 text-primary" />
            )}
          </div>
          <div>
            <p className="font-medium text-foreground">{module.display_name}</p>
            <p className="text-xs text-muted-foreground">{module.name}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">v{module.version}</td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${getStateColor(module.state)}`}>
          {getStateIcon(module.state)}
          {module.state.replace('_', ' ')}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{module.category || '-'}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{module.author || '-'}</td>
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1">
          {module.state === 'uninstalled' && (
            <button
              onClick={() => handleInstall(module.name)}
              className="px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded"
            >
              Install
            </button>
          )}
          {module.state === 'installed' && (
            <button
              onClick={() => router.push(`/admin/modules/${module.name}`)}
              className="px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted rounded"
            >
              Configure
            </button>
          )}
        </div>
      </td>
    </tr>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Modules</h1>
                <p className="text-sm text-muted-foreground">
                  {installedCount} installed, {availableCount} available
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {pendingOperations.length > 0 && (
                <button
                  onClick={handleApplyPending}
                  disabled={applying}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 rounded-lg disabled:opacity-50"
                >
                  {applying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Apply {pendingOperations.length} pending
                    </>
                  )}
                </button>
              )}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg disabled:opacity-50"
                title="Refresh module list"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="bg-card rounded-lg border shadow-sm p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search modules..."
                className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* State filter */}
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value as ModuleState | 'all')}
              className="px-3 py-2 text-sm border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All states</option>
              <option value="installed">Installed</option>
              <option value="uninstalled">Available</option>
              <option value="to_install">To install</option>
              <option value="to_upgrade">To upgrade</option>
              <option value="to_remove">To remove</option>
            </select>

            {/* Category filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-sm border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All categories</option>
              {categories.map((cat) => (
                <option key={cat.name} value={cat.name}>
                  {cat.display_name} ({cat.module_count})
                </option>
              ))}
            </select>

            {/* Apps only toggle */}
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={showAppsOnly}
                onChange={(e) => setShowAppsOnly(e.target.checked)}
                className="w-4 h-4 text-primary rounded border-input focus:ring-primary"
              />
              Apps only
            </label>

            {/* View mode */}
            <div className="flex items-center border rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        {loading ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-card rounded-lg border p-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-muted rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted/50 rounded w-1/2" />
                    </div>
                  </div>
                  <div className="mt-4 h-10 bg-muted/50 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card rounded-lg border">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="p-4 border-b animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-muted rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-1/4" />
                      <div className="h-3 bg-muted/50 rounded w-1/6" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : modules.length === 0 ? (
          <div className="bg-card rounded-lg border p-12 text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No modules found</h3>
            <p className="text-muted-foreground">
              {searchQuery || selectedState !== 'all' || selectedCategory !== 'all'
                ? 'Try adjusting your filters'
                : 'No modules are available'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map(renderModuleCard)}
          </div>
        ) : (
          <div className="bg-card rounded-lg border overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Module</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Version</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">State</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Author</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {modules.map(renderModuleRow)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
