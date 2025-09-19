'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
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

interface ActivityLog {
  id: number;
  user_id: number | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  entity_name: string | null;
  description: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  ip_address: string | null;
  user_agent: string | null;
  request_method: string | null;
  request_path: string | null;
  status_code: number | null;
  metadata: string | null;
  created_at: string;
}

interface ActivityLogStats {
  total_activities: number;
  activities_by_action: Record<string, number>;
  activities_by_level: Record<string, number>;
  activities_by_entity_type: Record<string, number>;
  unique_users: number;
  date_range: {
    earliest: string | null;
    latest: string | null;
  };
}

interface ActivityLogViewerProps {
  showUserActivitiesOnly?: boolean;
}

const levelColors = {
  info: 'bg-blue-100 text-blue-800 border-blue-200',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  error: 'bg-red-100 text-red-800 border-red-200',
  critical: 'bg-purple-100 text-purple-800 border-purple-200'
};

const levelIcons = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  critical: XCircle
};

const actionColors = {
  create: 'bg-green-100 text-green-800',
  read: 'bg-blue-100 text-blue-800',
  update: 'bg-yellow-100 text-yellow-800',
  delete: 'bg-red-100 text-red-800',
  login: 'bg-purple-100 text-purple-800',
  logout: 'bg-gray-100 text-gray-800'
};

export default function ActivityLogViewer({ showUserActivitiesOnly = false }: ActivityLogViewerProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<ActivityLogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    action: '',
    entity_type: '',
    level: '',
    start_date: '',
    end_date: '',
    days: '30'
  });

  const pageSize = 20;

  const fetchActivityLogs = React.useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      const queryParams = new URLSearchParams({
        skip: ((currentPage - 1) * pageSize).toString(),
        limit: pageSize.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.action && { action: filters.action }),
        ...(filters.entity_type && { entity_type: filters.entity_type }),
        ...(filters.level && { level: filters.level }),
        ...(filters.start_date && { start_date: filters.start_date }),
        ...(filters.end_date && { end_date: filters.end_date })
      });

      const endpoint = showUserActivitiesOnly 
        ? `/api/v1/activity-logs/me?${queryParams}&days=${filters.days}`
        : `/api/v1/activity-logs?${queryParams}`;

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch activity logs');
      
      const data = await response.json();
      setActivities(data);
      
      // Calculate total pages (this is simplified - ideally the API should return total count)
      setTotalPages(Math.max(1, Math.ceil(data.length / pageSize)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters, showUserActivitiesOnly]);

  const fetchStats = React.useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`/api/v1/activity-logs/stats/summary?days=${filters.days}`, {
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
      console.error('Failed to fetch activity stats:', err);
    }
  }, [filters.days]);

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
  }, [filters, currentPage, fetchActivityLogs]);

  const handleRefresh = () => {
    fetchActivityLogs();
    fetchStats();
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const queryParams = new URLSearchParams({
        ...filters,
        format: 'json'
      });

      const response = await fetch(`/api/v1/activity-logs/export?${queryParams}`, {
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
      a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getLevelIcon = (level: string) => {
    const Icon = levelIcons[level as keyof typeof levelIcons] || Info;
    return <Icon className="h-4 w-4" />;
  };

  if (loading && activities.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-300">Loading activity logs...</span>
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
            {showUserActivitiesOnly ? 'My Activity Log' : 'Activity Logs'}
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
              <span className="text-sm font-medium text-gray-700">Total Activities</span>
              <Activity className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {stats.total_activities.toLocaleString()}
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Unique Users</span>
              <User className="h-4 w-4 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-600">
              {stats.unique_users}
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Most Common Action</span>
              <Badge variant="secondary">Action</Badge>
            </div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {Object.entries(stats.activities_by_action).reduce((a, b) => 
                stats.activities_by_action[a[0]] > stats.activities_by_action[b[0]] ? a : b
              )[0] || 'N/A'}
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Critical Events</span>
              <XCircle className="h-4 w-4 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-600">
              {stats.activities_by_level.critical || 0}
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
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="action">Action</Label>
              <select
                id="action"
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
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
                value={filters.level}
                onChange={(e) => setFilters({ ...filters, level: e.target.value })}
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
                value={filters.days}
                onChange={(e) => setFilters({ ...filters, days: e.target.value })}
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
              onClick={() => setFilters({
                search: '',
                action: '',
                entity_type: '',
                level: '',
                start_date: '',
                end_date: '',
                days: '30'
              })}
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
              <h3 className="mt-2 text-sm font-medium text-gray-900">No activities found</h3>
              <p className="mt-1 text-sm text-gray-500">
                No activities match your current filters.
              </p>
            </div>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
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
                          className={actionColors[activity.action as keyof typeof actionColors] || 'bg-gray-100 text-gray-800'}
                        >
                          {activity.action}
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
                      {activity.status_code && (
                        <span>Status: {activity.status_code}</span>
                      )}
                      {activity.request_method && activity.request_path && (
                        <span>{activity.request_method} {activity.request_path}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
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