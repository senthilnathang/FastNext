'use client';

import React, { useState, useEffect, memo, useCallback, useMemo } from 'react';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import {
  Activity,
  Filter,
  User,
  AlertCircle,
  Info,
  AlertTriangle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw
} from 'lucide-react';
import { API_CONFIG, getApiUrl } from '@/shared/services/api/config';
import { fetchUserEvents, UserEvent, EventsResponse } from '@/shared/services/api/events';
import { 
  useSearchState, 
  usePaginationState, 
  useStringLiteralState,
  useBooleanFilterState
} from '@/shared/hooks';

// Use UserEvent from events API
type ActivityLog = UserEvent & {
  level: 'info' | 'warning' | 'error' | 'critical';
  created_at: string;
}

interface ActivityLogStats {
  total_events: number;
  events_by_action: Record<string, number>;
  events_by_category: Record<string, number>;
  events_by_day: Record<string, number>;
  unique_sessions: number;
  unique_devices: number;
  most_active_hours: Record<string, number>;
  recent_activity_count: number;
}

interface ActivityLogViewerProps {
  showUserActivitiesOnly?: boolean;
}

// Memoized constants for better performance
const levelColors = {
  info: 'bg-blue-100 text-blue-800 border-blue-200',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  error: 'bg-red-100 text-red-800 border-red-200',
  critical: 'bg-purple-100 text-purple-800 border-purple-200'
} as const;

const levelIcons = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  critical: XCircle
} as const;

const actionColors = {
  create: 'bg-green-100 text-green-800',
  read: 'bg-blue-100 text-blue-800',
  update: 'bg-yellow-100 text-yellow-800',
  delete: 'bg-red-100 text-red-800',
  login: 'bg-purple-100 text-purple-800',
  logout: 'bg-gray-100 text-gray-800'
} as const;

// Memoized activity item component for better performance
const ActivityItem = memo(({ 
  activity, 
  getLevelIcon, 
  formatDate 
}: { 
  activity: ActivityLog
  getLevelIcon: (level: string) => React.ReactElement
  formatDate: (dateString: string) => string
}) => (
  <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0 mt-1">
        <div className={`p-2 rounded-full ${levelColors[activity.level]}`}>
          {getLevelIcon(activity.level)}
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Badge
              variant="secondary"
              className={actionColors[activity.event_action as keyof typeof actionColors] || 'bg-gray-100 text-gray-800'}
            >
              {activity.event_action}
            </Badge>
            <span className="text-sm text-gray-500">{activity.entity_type}</span>
            {activity.entity_name && (
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {activity.entity_name}
              </span>
            )}
          </div>
          <span className="text-sm text-gray-500">
            {formatDate(activity.created_at)}
          </span>
        </div>
        
        <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
          {activity.description}
        </p>
        
        <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
          {activity.ip_address && (
            <span>IP: {activity.ip_address}</span>
          )}
          {activity.user_agent && (
            <span>Device: {activity.device_info || 'Unknown'}</span>
          )}
          {activity.session_id && (
            <span>Session: {activity.session_id.substring(0, 8)}...</span>
          )}
        </div>
      </div>
    </div>
  </div>
));

ActivityItem.displayName = 'ActivityItem';

export default function ActivityLogViewer({ showUserActivitiesOnly = false }: ActivityLogViewerProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<ActivityLogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  
  // URL State Management with nuqs
  const [search, setSearch] = useSearchState();
  const { page: currentPage, setPage: setCurrentPage, limit: pageSize } = usePaginationState(1, 20);
  const [action, setAction] = useStringLiteralState('action', ['', 'create', 'read', 'update', 'delete', 'login', 'logout'] as const, '');
  const [level, setLevel] = useStringLiteralState('level', ['', 'info', 'warning', 'error', 'critical'] as const, '');
  const [days, setDays] = useStringLiteralState('days', ['7', '30', '90', '365'] as const, '30');
  const [showFilters, setShowFilters] = useBooleanFilterState('filters', false);
  
  // Additional local filters not stored in URL
  const [entityType, setEntityType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchActivityLogs = React.useCallback(async () => {
    try {
      setLoading(true);
      
      const filters = {
        page: currentPage,
        per_page: pageSize,
        ...(search && { search }),
        ...(action && { event_action: action }),
        ...(entityType && { entity_type: entityType }),
        ...(level && { event_category: level }),
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
        ...(days && { days: parseInt(days) })
      };

      const response: EventsResponse = await fetchUserEvents(filters);
      
      // Transform events to match ActivityLog interface
      const transformedActivities: ActivityLog[] = response.items.map(event => ({
        ...event,
        level: (event.event_category as 'info' | 'warning' | 'error' | 'critical') || 'info',
        created_at: event.timestamp
      }));
      
      setActivities(transformedActivities);
      setTotalPages(response.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user events');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, search, action, entityType, level, startDate, endDate, days, showUserActivitiesOnly]);

  const fetchStats = React.useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(getApiUrl(`${API_CONFIG.ENDPOINTS.EVENTS.STATS}?days=${days}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch event stats:', err);
    }
  }, [days]);

  useEffect(() => {
    fetchActivityLogs();
    fetchStats();
  }, [fetchActivityLogs, fetchStats]);

  useEffect(() => {
    // Reset to page 1 when filters change
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      fetchActivityLogs();
    }
  }, [search, action, entityType, level, startDate, endDate, days, currentPage, fetchActivityLogs, setCurrentPage]);

  const handleRefresh = () => {
    fetchActivityLogs();
    fetchStats();
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const queryParams = new URLSearchParams({
        ...(search && { search }),
        ...(action && { action }),
        ...(entityType && { entity_type: entityType }),
        ...(level && { level }),
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
        days,
        format: 'json'
      });

      const response = await fetch(getApiUrl(`${API_CONFIG.ENDPOINTS.EVENTS.EXPORT}?${queryParams}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Export failed');
      
      const data = await response.json();
      
      // Download as JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-events-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Export failed. Please try again.');
    }
  };

  // Memoized utility functions
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleString();
  }, []);

  const getLevelIcon = useCallback((level: string) => {
    const Icon = levelIcons[level as keyof typeof levelIcons] || Info;
    return <Icon className="h-4 w-4" />;
  }, []);

  // Memoized computed values
  const mostCommonAction = useMemo(() => {
    if (!stats?.events_by_action || Object.keys(stats.events_by_action).length === 0) {
      return 'N/A';
    }
    return Object.entries(stats.events_by_action).reduce((a, b) => 
      a[1] > b[1] ? a : b
    )[0];
  }, [stats?.events_by_action]);

  const criticalEventsCount = useMemo(() => {
    return stats?.events_by_category?.critical || 0;
  }, [stats?.events_by_category?.critical]);

  if (loading && activities.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-300">Loading user events...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-2">
          <Activity className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
{showUserActivitiesOnly ? 'My Activity Events' : 'User Events'}
          </h1>
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Total Events</span>
              <Activity className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {stats.total_events.toLocaleString()}
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Recent Activity</span>
              <User className="h-4 w-4 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-600">
              {stats.recent_activity_count}
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Most Common Action</span>
              <Badge variant="secondary">Action</Badge>
            </div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {mostCommonAction}
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Critical Events</span>
              <XCircle className="h-4 w-4 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-600">
              {criticalEventsCount}
            </div>
          </Card>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search description..."
                value={search}
                onChange={(e) => setSearch(e.target.value || null)}
              />
            </div>
            
            <div>
              <Label htmlFor="action">Action</Label>
              <select
                id="action"
                value={action}
                onChange={(e) => setAction(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">All Actions</option>
                <option value="create">Create</option>
                <option value="read">Read</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
                <option value="login">Login</option>
                <option value="logout">Logout</option>
              </select>
            </div>
            
            <div>
              <Label htmlFor="level">Level</Label>
              <select
                id="level"
                value={level}
                onChange={(e) => setLevel(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">All Levels</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            
            <div>
              <Label htmlFor="days">Time Range</Label>
              <select
                id="days"
                value={days}
                onChange={(e) => setDays(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-end mt-4 space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch(null);
                setAction('');
                setEntityType('');
                setLevel('');
                setStartDate('');
                setEndDate('');
                setDays('30');
                setCurrentPage(1);
              }}
            >
              Clear Filters
            </Button>
          </div>
        </Card>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Activity Log List */}
      <Card>
        <div className="divide-y divide-gray-200">
          {activities.length === 0 ? (
            <div className="p-8 text-center">
              <Activity className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No events found</h3>
              <p className="mt-1 text-sm text-gray-500">
                No events match your current filters.
              </p>
            </div>
          ) : (
            activities.map((activity) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                getLevelIcon={getLevelIcon}
                formatDate={formatDate}
              />
            ))
          )}
        </div>
      </Card>

      {/* Pagination */}
      {activities.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || loading}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}