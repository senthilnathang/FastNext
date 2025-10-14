'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card } from '@/shared/components/ui/card';

import { 
  Shield, 
  Search, 
  Filter, 
  Download, 
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Database,
  Lock,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { getApiUrl } from '@/shared/services/api/config';

// Types
interface RLSAuditLog {
  id: number;
  request_id?: string;
  session_id?: string;
  user_id?: number;
  policy_id?: number;
  entity_type: string;
  entity_id?: number;
  action: string;
  access_granted: boolean;
  denial_reason?: string;
  table_name?: string;
  applied_conditions?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  request_method?: string;
  request_path?: string;
  created_at: string;
}

interface FilterOptions {
  user_id?: number;
  entity_type?: string;
  action?: string;
  access_granted?: boolean;
  from_date?: string;
  to_date?: string;
  search?: string;
}

export default function RLSAuditViewer() {
  const [auditLogs, setAuditLogs] = useState<RLSAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<RLSAuditLog | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(50);

  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      const params = new URLSearchParams();
      params.append('skip', ((currentPage - 1) * pageSize).toString());
      params.append('limit', pageSize.toString());
      
      // Add filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await fetch(`${getApiUrl('/api/v1/rls/audit-logs')}?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAuditLogs(data);
        // Calculate total pages (assuming the API returns total count)
        // setTotalPages(Math.ceil(data.total / pageSize));
        setTotalPages(10); // Mock pagination
      } else {
        // Mock data if API doesn't exist
        const mockLogs: RLSAuditLog[] = Array.from({ length: 20 }, (_, i) => ({
          id: i + 1,
          request_id: `req_${Date.now()}_${i}`,
          session_id: `session_${i % 5}`,
          user_id: (i % 3) + 1,
          policy_id: (i % 4) + 1,
          entity_type: ['PROJECT', 'USER', 'COMPONENT'][i % 3],
          entity_id: i + 100,
          action: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'][i % 4],
          access_granted: Math.random() > 0.2,
          denial_reason: Math.random() > 0.2 ? undefined : 'Access denied: insufficient permissions',
          table_name: ['projects', 'users', 'components'][i % 3],
          ip_address: `192.168.1.${(i % 254) + 1}`,
          user_agent: 'Mozilla/5.0 (compatible)',
          request_method: ['GET', 'POST', 'PUT', 'DELETE'][i % 4],
          request_path: `/api/v1/${['projects', 'users', 'components'][i % 3]}`,
          created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
        }));
        setAuditLogs(mockLogs);
        setTotalPages(5);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, filters, setLoading, setAuditLogs, setTotalPages, setError]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  const exportLogs = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });

      // In a real implementation, this would download a file
      // For now, we'll just show an alert
      alert('Export functionality would download the filtered audit logs as CSV/JSON');

    } catch {
      setError('Failed to export audit logs');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusIcon = (accessGranted: boolean) => {
    return accessGranted ? (
      <CheckCircle className="h-5 w-5 text-green-600" />
    ) : (
      <Lock className="h-5 w-5 text-red-600" />
    );
  };

  const getActionColor = (action: string) => {
    switch (action.toUpperCase()) {
      case 'SELECT': return 'bg-blue-100 text-blue-800';
      case 'INSERT': return 'bg-green-100 text-green-800';
      case 'UPDATE': return 'bg-orange-100 text-orange-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && auditLogs.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-300">Loading audit logs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            RLS Audit Logs
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </Button>
          <Button
            variant="outline"
            onClick={exportLogs}
            className="flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
          <Button
            variant="outline"
            onClick={fetchAuditLogs}
            disabled={loading}
            className="flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search logs..."
                  value={filters.search || ''}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="user-filter">User ID</Label>
              <Input
                id="user-filter"
                type="number"
                placeholder="User ID"
                value={filters.user_id || ''}
                onChange={(e) => handleFilterChange('user_id', e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>

            <div>
              <Label htmlFor="entity-filter">Entity Type</Label>
              <select
                id="entity-filter"
                value={filters.entity_type || ''}
                onChange={(e) => handleFilterChange('entity_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Types</option>
                <option value="PROJECT">Project</option>
                <option value="USER">User</option>
                <option value="COMPONENT">Component</option>
                <option value="PAGE">Page</option>
                <option value="ASSET">Asset</option>
              </select>
            </div>

            <div>
              <Label htmlFor="action-filter">Action</Label>
              <select
                id="action-filter"
                value={filters.action || ''}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Actions</option>
                <option value="SELECT">Read</option>
                <option value="INSERT">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
              </select>
            </div>

            <div>
              <Label htmlFor="status-filter">Access Status</Label>
              <select
                id="status-filter"
                value={filters.access_granted === undefined ? '' : filters.access_granted.toString()}
                onChange={(e) => handleFilterChange('access_granted', e.target.value === '' ? undefined : e.target.value === 'true')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
                <option value="true">Granted</option>
                <option value="false">Denied</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={clearFilters}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <Label htmlFor="from-date">From Date</Label>
              <Input
                id="from-date"
                type="datetime-local"
                value={filters.from_date || ''}
                onChange={(e) => handleFilterChange('from_date', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="to-date">To Date</Label>
              <Input
                id="to-date"
                type="datetime-local"
                value={filters.to_date || ''}
                onChange={(e) => handleFilterChange('to_date', e.target.value)}
              />
            </div>
          </div>
        </Card>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* Audit Logs Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {auditLogs.map((log) => (
                <tr 
                  key={log.id} 
                  className={`hover:bg-gray-50 cursor-pointer ${
                    !log.access_granted ? 'bg-red-50' : ''
                  }`}
                  onClick={() => setSelectedLog(log)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(log.access_granted)}
                      <span className={`ml-2 text-sm font-medium ${
                        log.access_granted ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {log.access_granted ? 'Granted' : 'Denied'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">
                        {log.user_id || 'Anonymous'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {log.entity_type}
                      {log.entity_id && (
                        <span className="text-gray-500 ml-1">#{log.entity_id}</span>
                      )}
                    </div>
                    {log.table_name && (
                      <div className="text-xs text-gray-500">{log.table_name}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">
                        {formatDate(log.created_at)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {log.request_method} {log.request_path}
                    </div>
                    {log.ip_address && (
                      <div className="text-xs text-gray-500">{log.ip_address}</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {auditLogs.length === 0 && !loading && (
          <div className="text-center py-8">
            <Database className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No audit logs found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your filters or check back later.
            </p>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages || loading}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Audit Log Details
                </h2>
                <Button
                  variant="ghost"
                  onClick={() => setSelectedLog(null)}
                >
                  ×
                </Button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Status</Label>
                    <div className="flex items-center mt-1">
                      {getStatusIcon(selectedLog.access_granted)}
                      <span className={`ml-2 font-medium ${
                        selectedLog.access_granted ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {selectedLog.access_granted ? 'Access Granted' : 'Access Denied'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <Label>Timestamp</Label>
                    <p className="text-sm text-gray-900 mt-1">
                      {formatDate(selectedLog.created_at)}
                    </p>
                  </div>

                  <div>
                    <Label>User ID</Label>
                    <p className="text-sm text-gray-900 mt-1">
                      {selectedLog.user_id || 'Anonymous'}
                    </p>
                  </div>

                  <div>
                    <Label>Action</Label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 ${getActionColor(selectedLog.action)}`}>
                      {selectedLog.action}
                    </span>
                  </div>

                  <div>
                    <Label>Entity Type</Label>
                    <p className="text-sm text-gray-900 mt-1">{selectedLog.entity_type}</p>
                  </div>

                  <div>
                    <Label>Entity ID</Label>
                    <p className="text-sm text-gray-900 mt-1">
                      {selectedLog.entity_id || 'N/A'}
                    </p>
                  </div>

                  <div>
                    <Label>Table Name</Label>
                    <p className="text-sm text-gray-900 mt-1">
                      {selectedLog.table_name || 'N/A'}
                    </p>
                  </div>

                  <div>
                    <Label>Policy ID</Label>
                    <p className="text-sm text-gray-900 mt-1">
                      {selectedLog.policy_id || 'N/A'}
                    </p>
                  </div>
                </div>

                {selectedLog.denial_reason && (
                  <div>
                    <Label>Denial Reason</Label>
                    <div className="mt-1 p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-700">{selectedLog.denial_reason}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Request Method</Label>
                    <p className="text-sm text-gray-900 mt-1">
                      {selectedLog.request_method || 'N/A'}
                    </p>
                  </div>

                  <div>
                    <Label>Request Path</Label>
                    <p className="text-sm text-gray-900 mt-1 break-all">
                      {selectedLog.request_path || 'N/A'}
                    </p>
                  </div>

                  <div>
                    <Label>IP Address</Label>
                    <p className="text-sm text-gray-900 mt-1">
                      {selectedLog.ip_address || 'N/A'}
                    </p>
                  </div>

                  <div>
                    <Label>Session ID</Label>
                    <p className="text-sm text-gray-900 mt-1 break-all">
                      {selectedLog.session_id || 'N/A'}
                    </p>
                  </div>
                </div>

                {selectedLog.user_agent && (
                  <div>
                    <Label>User Agent</Label>
                    <p className="text-sm text-gray-900 mt-1 break-all">
                      {selectedLog.user_agent}
                    </p>
                  </div>
                )}

                {selectedLog.applied_conditions && (
                  <div>
                    <Label>Applied Conditions</Label>
                    <pre className="mt-1 text-xs bg-gray-100 p-3 rounded-md overflow-x-auto">
                      {JSON.stringify(selectedLog.applied_conditions, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t mt-6">
                <Button onClick={() => setSelectedLog(null)}>
                  Close
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}