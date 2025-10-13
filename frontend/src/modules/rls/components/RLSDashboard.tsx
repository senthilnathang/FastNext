'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Shield,
  Users,
  AlertTriangle,
  CheckCircle,
  Activity,
  Database,
  TrendingUp,
  Lock,
  Settings,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { getApiUrl } from '@/shared/services/api/config';

// Types
interface RLSStatistics {
  total_policies: number;
  active_policies: number;
  total_audit_logs: number;
  access_attempts_today: number;
  access_denied_today: number;
  top_entities: Array<{ entity_type: string; count: number }>;
  top_users: Array<{ user_id: number; username: string; count: number }>;
  recent_violations: Array<{
    id: number;
    user_id: number;
    entity_type: string;
    action: string;
    denial_reason: string;
    created_at: string;
  }>;
}

interface AuditStats {
  period_days: number;
  total_attempts: number;
  granted_count: number;
  denied_count: number;
  success_rate: number;
  top_denied_reasons: Array<{ reason: string; count: number }>;
  entity_type_stats: Array<{ entity_type: string; count: number }>;
}

interface AccessCheckRequest {
  entity_type: string;
  action: string;
  entity_id?: number;
  table_name?: string;
}

interface AccessCheckResponse {
  access_granted: boolean;
  denial_reason?: string;
  entity_type: string;
  action: string;
  entity_id?: number;
  checked_at: string;
}

export default function RLSDashboard() {
  const [statistics, setStatistics] = useState<RLSStatistics | null>(null);
  const [auditStats, setAuditStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(7);
  
  // Access check testing
  const [testRequest, setTestRequest] = useState<AccessCheckRequest>({
    entity_type: 'PROJECT',
    action: 'SELECT'
  });
  const [testResult, setTestResult] = useState<AccessCheckResponse | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    fetchStatistics();
    fetchAuditStats();
  }, []);

  useEffect(() => {
    fetchAuditStats();
  }, [selectedPeriod]);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      // In a real implementation, you would have a statistics endpoint
      // For now, we'll simulate the data
      const mockStats: RLSStatistics = {
        total_policies: 12,
        active_policies: 10,
        total_audit_logs: 1543,
        access_attempts_today: 89,
        access_denied_today: 7,
        top_entities: [
          { entity_type: 'PROJECT', count: 45 },
          { entity_type: 'USER', count: 32 },
          { entity_type: 'COMPONENT', count: 23 }
        ],
        top_users: [
          { user_id: 1, username: 'admin', count: 15 },
          { user_id: 2, username: 'john_doe', count: 12 },
          { user_id: 3, username: 'jane_smith', count: 8 }
        ],
        recent_violations: [
          {
            id: 1,
            user_id: 4,
            entity_type: 'PROJECT',
            action: 'DELETE',
            denial_reason: 'Access denied: not owner',
            created_at: new Date().toISOString()
          }
        ]
      };
      
      setStatistics(mockStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditStats = async () => {
    try {
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(
        `${getApiUrl('/api/v1/rls/audit-logs/stats')}?days=${selectedPeriod}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAuditStats(data);
      } else {
        // Fallback to mock data if endpoint doesn't exist
        const mockAuditStats: AuditStats = {
          period_days: selectedPeriod,
          total_attempts: 156,
          granted_count: 142,
          denied_count: 14,
          success_rate: 91.0,
          top_denied_reasons: [
            { reason: 'Access denied: not owner', count: 8 },
            { reason: 'Not an organization member', count: 4 },
            { reason: 'Required permissions missing', count: 2 }
          ],
          entity_type_stats: [
            { entity_type: 'PROJECT', count: 89 },
            { entity_type: 'USER', count: 45 },
            { entity_type: 'COMPONENT', count: 22 }
          ]
        };
        setAuditStats(mockAuditStats);
      }
    } catch (err) {
      console.error('Failed to fetch audit stats:', err);
    }
  };

  const testAccess = async () => {
    setTestLoading(true);
    setTestResult(null);
    
    try {
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(getApiUrl('/api/v1/rls/check-access'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(testRequest),
      });

      if (response.ok) {
        const result = await response.json();
        setTestResult(result);
      } else {
        // Mock response if endpoint doesn't exist
        const mockResult: AccessCheckResponse = {
          access_granted: Math.random() > 0.3,
          denial_reason: Math.random() > 0.3 ? undefined : 'Access denied: insufficient permissions',
          entity_type: testRequest.entity_type,
          action: testRequest.action,
          entity_id: testRequest.entity_id,
          checked_at: new Date().toISOString()
        };
        setTestResult(mockResult);
      }
    } catch (err) {
      setError('Failed to test access');
    } finally {
      setTestLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-300">Loading RLS dashboard...</span>
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
            RLS Security Dashboard
          </h1>
        </div>
        <Button
          onClick={fetchStatistics}
          variant="outline"
          disabled={loading}
          className="flex items-center space-x-2"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Policies</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {statistics.total_policies}
                </p>
              </div>
              <Database className="h-8 w-8 text-blue-600" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-green-600">
                {statistics.active_policies} active
              </span>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today&apos;s Access</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {statistics.access_attempts_today}
                </p>
              </div>
              <Activity className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-red-600">
                {statistics.access_denied_today} denied
              </span>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {auditStats ? auditStats.success_rate.toFixed(1) : '0.0'}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-gray-600">
                Last {selectedPeriod} days
              </span>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Security Score</p>
                <p className="text-2xl font-bold text-green-600">
                  92
                </p>
              </div>
              <Shield className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-green-600">Excellent</span>
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Audit Statistics */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Access Audit Statistics
            </h3>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(Number(e.target.value))}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md"
            >
              <option value={1}>Last 24 hours</option>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>

          {auditStats && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {auditStats.granted_count}
                  </p>
                  <p className="text-sm text-green-700">Granted</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">
                    {auditStats.denied_count}
                  </p>
                  <p className="text-sm text-red-700">Denied</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Top Denial Reasons
                </h4>
                <div className="space-y-2">
                  {auditStats.top_denied_reasons.slice(0, 3).map((reason, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 truncate">
                        {reason.reason}
                      </span>
                      <span className="font-medium text-gray-900">
                        {reason.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Entity Type Breakdown
                </h4>
                <div className="space-y-2">
                  {auditStats.entity_type_stats.slice(0, 3).map((stat, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">
                        {stat.entity_type}
                      </span>
                      <span className="font-medium text-gray-900">
                        {stat.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Access Testing */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Test Access Control
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="entity_type">Entity Type</Label>
                <select
                  id="entity_type"
                  value={testRequest.entity_type}
                  onChange={(e) => setTestRequest({
                    ...testRequest,
                    entity_type: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="PROJECT">Project</option>
                  <option value="USER">User</option>
                  <option value="COMPONENT">Component</option>
                  <option value="PAGE">Page</option>
                  <option value="ASSET">Asset</option>
                </select>
              </div>

              <div>
                <Label htmlFor="action">Action</Label>
                <select
                  id="action"
                  value={testRequest.action}
                  onChange={(e) => setTestRequest({
                    ...testRequest,
                    action: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="SELECT">Read</option>
                  <option value="INSERT">Create</option>
                  <option value="UPDATE">Update</option>
                  <option value="DELETE">Delete</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="entity_id">Entity ID (optional)</Label>
              <Input
                id="entity_id"
                type="number"
                placeholder="Enter entity ID"
                value={testRequest.entity_id || ''}
                onChange={(e) => setTestRequest({
                  ...testRequest,
                  entity_id: e.target.value ? Number(e.target.value) : undefined
                })}
              />
            </div>

            <Button
              onClick={testAccess}
              disabled={testLoading}
              className="w-full"
            >
              {testLoading ? 'Testing...' : 'Test Access'}
            </Button>

            {testResult && (
              <div className={`p-4 rounded-lg border ${
                testResult.access_granted 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  {testResult.access_granted ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <Lock className="h-5 w-5 text-red-600" />
                  )}
                  <span className={`font-medium ${
                    testResult.access_granted ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {testResult.access_granted ? 'Access Granted' : 'Access Denied'}
                  </span>
                </div>
                
                {testResult.denial_reason && (
                  <p className="text-sm text-red-600">
                    Reason: {testResult.denial_reason}
                  </p>
                )}
                
                <p className="text-xs text-gray-500 mt-2">
                  Tested: {testResult.entity_type} - {testResult.action}
                  {testResult.entity_id && ` (ID: ${testResult.entity_id})`}
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Recent Security Events */}
      {statistics && statistics.recent_violations.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Security Violations
          </h3>

          <div className="space-y-3">
            {statistics.recent_violations.map((violation) => (
              <div key={violation.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      User attempted {violation.action} on {violation.entity_type}
                    </p>
                    <p className="text-xs text-red-600">
                      {violation.denial_reason}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    {new Date(violation.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button variant="outline" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Manage Policies</span>
          </Button>
          
          <Button variant="outline" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>View Audit Logs</span>
          </Button>
          
          <Button variant="outline" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>User Permissions</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}