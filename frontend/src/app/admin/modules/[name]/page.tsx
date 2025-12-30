"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Package,
  Settings,
  Clock,
  Play,
  Pause,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
  Code,
  Database,
  Layers,
  Puzzle,
  ExternalLink,
  Globe,
  User,
  GitBranch,
} from 'lucide-react';
import { modulesApi, type InstalledModule, type ScheduledAction, type ServerAction, type Sequence, type ModuleDependencyTree } from '@/lib/api';

type TabType = 'overview' | 'config' | 'actions' | 'dependencies';

const getStateColor = (state: string) => {
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

export default function ModuleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const moduleName = params.name as string;

  // State
  const [module, setModule] = useState<InstalledModule | null>(null);
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [scheduledActions, setScheduledActions] = useState<ScheduledAction[]>([]);
  const [serverActions, setServerActions] = useState<ServerAction[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [dependencyTree, setDependencyTree] = useState<ModuleDependencyTree | null>(null);
  const [dependents, setDependents] = useState<InstalledModule[]>([]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [saving, setSaving] = useState(false);
  const [runningAction, setRunningAction] = useState<string | null>(null);

  // Fetch module data
  const fetchModule = useCallback(async () => {
    try {
      setLoading(true);
      const response = await modulesApi.get(moduleName);
      setModule(response);
    } catch (error) {
      console.error('Failed to fetch module:', error);
    } finally {
      setLoading(false);
    }
  }, [moduleName]);

  // Fetch config
  const fetchConfig = useCallback(async () => {
    try {
      const response = await modulesApi.config.get(moduleName);
      setConfig(response);
    } catch (error) {
      console.error('Failed to fetch config:', error);
    }
  }, [moduleName]);

  // Fetch actions
  const fetchActions = useCallback(async () => {
    try {
      const [scheduled, server] = await Promise.all([
        modulesApi.actions.getScheduled(moduleName),
        modulesApi.actions.getServer(moduleName),
      ]);
      setScheduledActions(scheduled);
      setServerActions(server);
    } catch (error) {
      console.error('Failed to fetch actions:', error);
    }
  }, [moduleName]);

  // Fetch sequences
  const fetchSequences = useCallback(async () => {
    try {
      const response = await modulesApi.sequences.list(moduleName);
      setSequences(response);
    } catch (error) {
      console.error('Failed to fetch sequences:', error);
    }
  }, [moduleName]);

  // Fetch dependencies
  const fetchDependencies = useCallback(async () => {
    try {
      const [tree, deps] = await Promise.all([
        modulesApi.dependencies.getTree(moduleName),
        modulesApi.dependencies.getDependents(moduleName),
      ]);
      setDependencyTree(tree);
      setDependents(deps);
    } catch (error) {
      console.error('Failed to fetch dependencies:', error);
    }
  }, [moduleName]);

  // Initial load
  useEffect(() => {
    fetchModule();
  }, [fetchModule]);

  // Fetch tab data when tab changes
  useEffect(() => {
    if (!module) return;

    switch (activeTab) {
      case 'config':
        fetchConfig();
        break;
      case 'actions':
        fetchActions();
        fetchSequences();
        break;
      case 'dependencies':
        fetchDependencies();
        break;
    }
  }, [activeTab, module, fetchConfig, fetchActions, fetchSequences, fetchDependencies]);

  const handleInstall = async () => {
    if (!module) return;
    try {
      await modulesApi.install(module.name);
      fetchModule();
    } catch (error) {
      console.error('Failed to install module:', error);
    }
  };

  const handleUpgrade = async () => {
    if (!module) return;
    try {
      await modulesApi.upgrade(module.name);
      fetchModule();
    } catch (error) {
      console.error('Failed to upgrade module:', error);
    }
  };

  const handleUninstall = async () => {
    if (!module) return;
    if (!confirm(`Are you sure you want to uninstall "${module.display_name}"?`)) return;
    try {
      await modulesApi.uninstall(module.name);
      router.push('/admin/modules');
    } catch (error) {
      console.error('Failed to uninstall module:', error);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await modulesApi.config.update(moduleName, config);
    } catch (error) {
      console.error('Failed to save config:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleResetConfig = async () => {
    if (!confirm('Reset all configuration to defaults?')) return;
    try {
      const response = await modulesApi.config.reset(moduleName);
      setConfig(response);
    } catch (error) {
      console.error('Failed to reset config:', error);
    }
  };

  const handleRunAction = async (actionCode: string) => {
    setRunningAction(actionCode);
    try {
      await modulesApi.actions.runScheduled(actionCode);
      fetchActions();
    } catch (error) {
      console.error('Failed to run action:', error);
    } finally {
      setRunningAction(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-muted rounded" />
              <div className="h-8 bg-muted rounded w-48" />
            </div>
            <div className="bg-card rounded-lg border p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-muted rounded-lg" />
                <div className="space-y-2">
                  <div className="h-6 bg-muted rounded w-48" />
                  <div className="h-4 bg-muted/50 rounded w-32" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Module not found</h2>
          <p className="text-muted-foreground mb-4">The module "{moduleName}" does not exist</p>
          <button
            onClick={() => router.push('/admin/modules')}
            className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg"
          >
            Back to Modules
          </button>
        </div>
      </div>
    );
  }

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <FileText className="w-4 h-4" /> },
    { key: 'config', label: 'Configuration', icon: <Settings className="w-4 h-4" /> },
    { key: 'actions', label: 'Actions', icon: <Play className="w-4 h-4" /> },
    { key: 'dependencies', label: 'Dependencies', icon: <GitBranch className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin/modules')}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

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
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-foreground">{module.display_name}</h1>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${getStateColor(module.state)}`}>
                    {module.state.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{module.name} v{module.version}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {module.state === 'uninstalled' && (
                <button
                  onClick={handleInstall}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg"
                >
                  <Download className="w-4 h-4" />
                  Install
                </button>
              )}
              {module.state === 'installed' && module.latest_version && module.latest_version !== module.version && (
                <button
                  onClick={handleUpgrade}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600 rounded-lg"
                >
                  <Upload className="w-4 h-4" />
                  Upgrade to {module.latest_version}
                </button>
              )}
              {module.state === 'installed' && !module.is_core && (
                <button
                  onClick={handleUninstall}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg border border-destructive/20"
                >
                  <Trash2 className="w-4 h-4" />
                  Uninstall
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mt-6 border-b -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px ${
                  activeTab === tab.key
                    ? 'text-primary border-primary'
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Description */}
            {module.description && (
              <div className="bg-card rounded-lg border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-3">Description</h3>
                <p className="text-muted-foreground">{module.description}</p>
              </div>
            )}

            {/* Info grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-card rounded-lg border p-4">
                <div className="text-sm text-muted-foreground mb-1">Version</div>
                <div className="font-medium text-foreground">{module.version}</div>
              </div>
              <div className="bg-card rounded-lg border p-4">
                <div className="text-sm text-muted-foreground mb-1">Category</div>
                <div className="font-medium text-foreground">{module.category || 'Uncategorized'}</div>
              </div>
              <div className="bg-card rounded-lg border p-4">
                <div className="text-sm text-muted-foreground mb-1">Type</div>
                <div className="font-medium text-foreground">
                  {module.application ? 'Application' : 'Module'}
                </div>
              </div>
              <div className="bg-card rounded-lg border p-4">
                <div className="text-sm text-muted-foreground mb-1">Auto Install</div>
                <div className="font-medium text-foreground">
                  {module.auto_install ? 'Yes' : 'No'}
                </div>
              </div>
            </div>

            {/* Author & Website */}
            <div className="bg-card rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Author & Links</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {module.author && (
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Author</div>
                      <div className="text-foreground">{module.author}</div>
                    </div>
                  </div>
                )}
                {module.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Website</div>
                      <a
                        href={module.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80 flex items-center gap-1"
                      >
                        {module.website}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}
                {module.license && (
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">License</div>
                      <div className="text-foreground">{module.license}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Installation dates */}
            {module.state === 'installed' && (
              <div className="bg-card rounded-lg border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Installation Info</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {module.installed_at && (
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">Installed</div>
                        <div className="text-foreground">
                          {format(new Date(module.installed_at), 'PPpp')}
                        </div>
                      </div>
                    </div>
                  )}
                  {module.updated_at && (
                    <div className="flex items-center gap-3">
                      <RefreshCw className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">Last Updated</div>
                        <div className="text-foreground">
                          {format(new Date(module.updated_at), 'PPpp')}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Configuration Tab */}
        {activeTab === 'config' && (
          <div className="bg-card rounded-lg border">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Module Configuration</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResetConfig}
                    className="px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted rounded-lg"
                  >
                    Reset to defaults
                  </button>
                  <button
                    onClick={handleSaveConfig}
                    disabled={saving}
                    className="px-4 py-1.5 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              {Object.keys(config).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Settings className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p>No configuration options available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(config).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-4">
                      <label className="w-1/3 text-sm font-medium text-foreground">{key}</label>
                      <input
                        type="text"
                        value={String(value)}
                        onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
                        className="flex-1 px-3 py-2 text-sm border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions Tab */}
        {activeTab === 'actions' && (
          <div className="space-y-6">
            {/* Scheduled Actions */}
            <div className="bg-card rounded-lg border">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-foreground">Scheduled Actions</h3>
              </div>
              {scheduledActions.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p>No scheduled actions</p>
                </div>
              ) : (
                <div className="divide-y">
                  {scheduledActions.map((action) => (
                    <div key={action.code} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${action.is_active ? 'bg-green-500/10' : 'bg-muted'}`}>
                          {action.is_active ? (
                            <Play className="w-4 h-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <Pause className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{action.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {action.cron_expression || `Every ${action.interval_number} ${action.interval_type}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {action.next_run && (
                          <span className="text-sm text-muted-foreground">
                            Next: {format(new Date(action.next_run), 'PPp')}
                          </span>
                        )}
                        <button
                          onClick={() => handleRunAction(action.code)}
                          disabled={runningAction === action.code}
                          className="px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg disabled:opacity-50"
                        >
                          {runningAction === action.code ? 'Running...' : 'Run now'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Server Actions */}
            <div className="bg-card rounded-lg border">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-foreground">Server Actions</h3>
              </div>
              {serverActions.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <Code className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p>No server actions</p>
                </div>
              ) : (
                <div className="divide-y">
                  {serverActions.map((action) => (
                    <div key={action.code} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${action.is_active ? 'bg-primary/10' : 'bg-muted'}`}>
                          <Code className={`w-4 h-4 ${action.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{action.name}</p>
                          <p className="text-sm text-muted-foreground">{action.action_type}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        action.is_active ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-muted text-muted-foreground'
                      }`}>
                        {action.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sequences */}
            <div className="bg-card rounded-lg border">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-foreground">Sequences</h3>
              </div>
              {sequences.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <Database className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p>No sequences</p>
                </div>
              ) : (
                <div className="divide-y">
                  {sequences.map((seq) => (
                    <div key={seq.code} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">{seq.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Pattern: {seq.prefix || ''}{'{N}'.padStart(seq.padding, '0')}{seq.suffix || ''}
                        </p>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        Next: {seq.next_number}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dependencies Tab */}
        {activeTab === 'dependencies' && (
          <div className="space-y-6">
            {/* Dependencies */}
            <div className="bg-card rounded-lg border">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-foreground">Dependencies</h3>
              </div>
              {!module.depends || module.depends.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p>No dependencies</p>
                </div>
              ) : (
                <div className="divide-y">
                  {module.depends.map((dep) => (
                    <div
                      key={dep}
                      className="p-4 flex items-center justify-between hover:bg-muted/50 cursor-pointer"
                      onClick={() => router.push(`/admin/modules/${dep}`)}
                    >
                      <div className="flex items-center gap-3">
                        <Puzzle className="w-5 h-5 text-muted-foreground" />
                        <span className="font-medium text-foreground">{dep}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dependents */}
            <div className="bg-card rounded-lg border">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-foreground">Dependent Modules</h3>
                <p className="text-sm text-muted-foreground mt-1">Modules that depend on this module</p>
              </div>
              {dependents.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p>No modules depend on this module</p>
                </div>
              ) : (
                <div className="divide-y">
                  {dependents.map((dep) => (
                    <div
                      key={dep.name}
                      className="p-4 flex items-center justify-between hover:bg-muted/50 cursor-pointer"
                      onClick={() => router.push(`/admin/modules/${dep.name}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          {dep.icon ? (
                            <span className="text-lg">{dep.icon}</span>
                          ) : (
                            <Puzzle className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{dep.display_name}</p>
                          <p className="text-sm text-muted-foreground">{dep.name}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
