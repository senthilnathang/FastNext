'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { DataTable } from '@/shared/components/ui/data-table';
import { DatePickerWithRange } from '@/shared/components/ui/date-range-picker';
import { 
  FileText, 
  Search, 
  Filter, 
  Download, 
  Eye,
  Clock,
  User,
  Settings,
  Activity,
  AlertTriangle,
  Shield,
  Database,
  Server,
  Globe,
  Lock,
  RefreshCw,
  BarChart3,
  TrendingUp,
  MapPin,
  Smartphone,
  Monitor,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';
import { format, subDays, subHours, subMinutes } from 'date-fns';
import { DateRange } from 'react-day-picker';

interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  category: 'authentication' | 'authorization' | 'data' | 'system' | 'security' | 'user_management' | 'configuration';
  severity: 'info' | 'warning' | 'error' | 'critical';
  userId?: string;
  userName?: string;
  targetResource?: string;
  targetId?: string;
  changes?: Record<string, { old: any; new: any }>;
  metadata: {
    ipAddress: string;
    userAgent: string;
    sessionId: string;
    location?: string;
    deviceType: 'desktop' | 'mobile' | 'tablet' | 'api';
  };
  result: 'success' | 'failure' | 'partial';
  details?: string;
  riskScore?: number;
}

interface AuditStats {
  totalLogs: number;
  categoryCounts: Record<string, number>;
  severityCounts: Record<string, number>;
  topUsers: Array<{ userId: string; userName: string; count: number }>;
  topActions: Array<{ action: string; count: number }>;
  recentTrends: Array<{ timestamp: string; count: number }>;
  securityAlerts: number;
  riskDistribution: Record<string, number>;
}

export default function AuditLogsPage() {
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [resultFilter, setResultFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date()
  });
  const [activeTab, setActiveTab] = useState('logs');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Mock audit logs data - in real app, this would come from API
  const mockAuditLogs: AuditLog[] = useMemo(() => [
    {
      id: '1',
      timestamp: subMinutes(new Date(), 5).toISOString(),
      action: 'user_login',
      category: 'authentication',
      severity: 'info',
      userId: 'user_123',
      userName: 'john.doe@example.com',
      targetResource: 'auth_service',
      changes: {},
      metadata: {
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        sessionId: 'sess_abc123',
        location: 'New York, US',
        deviceType: 'desktop'
      },
      result: 'success',
      details: 'User successfully authenticated',
      riskScore: 1
    },
    {
      id: '2',
      timestamp: subMinutes(new Date(), 15).toISOString(),
      action: 'user_permission_update',
      category: 'user_management',
      severity: 'warning',
      userId: 'admin_456',
      userName: 'admin@example.com',
      targetResource: 'user',
      targetId: 'user_789',
      changes: {
        permissions: {
          old: ['read', 'write'],
          new: ['read', 'write', 'admin']
        }
      },
      metadata: {
        ipAddress: '10.0.0.50',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        sessionId: 'sess_def456',
        location: 'London, UK',
        deviceType: 'desktop'
      },
      result: 'success',
      details: 'User permissions elevated to admin level',
      riskScore: 7
    },
    {
      id: '3',
      timestamp: subHours(new Date(), 1).toISOString(),
      action: 'failed_login_attempt',
      category: 'security',
      severity: 'error',
      userId: 'unknown',
      targetResource: 'auth_service',
      changes: {},
      metadata: {
        ipAddress: '203.0.113.45',
        userAgent: 'curl/7.68.0',
        sessionId: 'sess_failed',
        location: 'Unknown',
        deviceType: 'api'
      },
      result: 'failure',
      details: 'Multiple failed login attempts detected',
      riskScore: 9
    },
    {
      id: '4',
      timestamp: subHours(new Date(), 2).toISOString(),
      action: 'data_export',
      category: 'data',
      severity: 'warning',
      userId: 'user_789',
      userName: 'jane.smith@example.com',
      targetResource: 'user_data',
      targetId: 'export_batch_001',
      changes: {},
      metadata: {
        ipAddress: '172.16.0.100',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
        sessionId: 'sess_mobile_123',
        location: 'San Francisco, US',
        deviceType: 'mobile'
      },
      result: 'success',
      details: 'Exported 1,500 user records',
      riskScore: 5
    },
    {
      id: '5',
      timestamp: subDays(new Date(), 1).toISOString(),
      action: 'system_configuration_change',
      category: 'configuration',
      severity: 'critical',
      userId: 'admin_456',
      userName: 'admin@example.com',
      targetResource: 'system_config',
      targetId: 'security_settings',
      changes: {
        max_login_attempts: {
          old: 5,
          new: 3
        },
        session_timeout: {
          old: 3600,
          new: 1800
        }
      },
      metadata: {
        ipAddress: '10.0.0.50',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        sessionId: 'sess_def456',
        location: 'London, UK',
        deviceType: 'desktop'
      },
      result: 'success',
      details: 'Updated security configuration settings',
      riskScore: 6
    }
  ], []);

  const mockStats: AuditStats = {
    totalLogs: mockAuditLogs.length,
    categoryCounts: {
      authentication: 125,
      authorization: 89,
      data: 67,
      system: 45,
      security: 23,
      user_management: 156,
      configuration: 34
    },
    severityCounts: {
      info: 298,
      warning: 123,
      error: 45,
      critical: 12
    },
    topUsers: [
      { userId: 'admin_456', userName: 'admin@example.com', count: 89 },
      { userId: 'user_123', userName: 'john.doe@example.com', count: 67 },
      { userId: 'user_789', userName: 'jane.smith@example.com', count: 45 }
    ],
    topActions: [
      { action: 'user_login', count: 234 },
      { action: 'data_access', count: 156 },
      { action: 'permission_change', count: 89 },
      { action: 'configuration_update', count: 67 }
    ],
    recentTrends: Array.from({ length: 24 }, (_, i) => ({
      timestamp: subHours(new Date(), 23 - i).toISOString(),
      count: Math.floor(Math.random() * 50) + 10
    })),
    securityAlerts: 5,
    riskDistribution: {
      low: 345,
      medium: 123,
      high: 45,
      critical: 8
    }
  };

  // Filter logs based on current filters
  const filteredLogs = useMemo(() => {
    return mockAuditLogs.filter(log => {
      const matchesSearch = !searchTerm || 
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || log.category === categoryFilter;
      const matchesSeverity = severityFilter === 'all' || log.severity === severityFilter;
      const matchesUser = userFilter === 'all' || log.userId === userFilter;
      const matchesResult = resultFilter === 'all' || log.result === resultFilter;
      
      const matchesDateRange = !dateRange?.from || !dateRange?.to ||
        (new Date(log.timestamp) >= dateRange.from && new Date(log.timestamp) <= dateRange.to);

      return matchesSearch && matchesCategory && matchesSeverity && 
             matchesUser && matchesResult && matchesDateRange;
    });
  }, [mockAuditLogs, searchTerm, categoryFilter, severityFilter, userFilter, resultFilter, dateRange]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'info': return 'text-blue-600 bg-blue-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      case 'critical': return 'text-red-800 bg-red-200';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'authentication': return <Lock className="h-4 w-4" />;
      case 'authorization': return <Shield className="h-4 w-4" />;
      case 'data': return <Database className="h-4 w-4" />;
      case 'system': return <Server className="h-4 w-4" />;
      case 'security': return <AlertTriangle className="h-4 w-4" />;
      case 'user_management': return <User className="h-4 w-4" />;
      case 'configuration': return <Settings className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failure': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'partial': return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default: return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRiskColor = (riskScore?: number) => {
    if (!riskScore) return 'text-gray-600 bg-gray-100';
    if (riskScore <= 3) return 'text-green-600 bg-green-100';
    if (riskScore <= 6) return 'text-yellow-600 bg-yellow-100';
    if (riskScore <= 8) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getRiskLevel = (riskScore?: number) => {
    if (!riskScore) return 'Unknown';
    if (riskScore <= 3) return 'Low';
    if (riskScore <= 6) return 'Medium';
    if (riskScore <= 8) return 'High';
    return 'Critical';
  };

  const exportLogs = useCallback(() => {
    const csvContent = [
      ['Timestamp', 'Action', 'Category', 'Severity', 'User', 'IP Address', 'Result', 'Details'].join(','),
      ...filteredLogs.map(log => [
        log.timestamp,
        log.action,
        log.category,
        log.severity,
        log.userName || log.userId || 'Unknown',
        log.metadata.ipAddress,
        log.result,
        `"${log.details?.replace(/"/g, '""') || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredLogs]);

  const columns = [
    {
      accessorKey: 'timestamp',
      header: 'Time',
      cell: ({ row }: any) => {
        const timestamp = row.original.timestamp;
        return (
          <div className="text-sm">
            <div>{format(new Date(timestamp), 'MMM dd, HH:mm')}</div>
            <div className="text-xs text-gray-500">{format(new Date(timestamp), 'yyyy')}</div>
          </div>
        );
      },
    },
    {
      accessorKey: 'action',
      header: 'Action',
      cell: ({ row }: any) => {
        const log = row.original;
        return (
          <div className="flex items-center space-x-2">
            {getCategoryIcon(log.category)}
            <span className="font-medium">{log.action.replace(/_/g, ' ')}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }: any) => {
        const category = row.original.category;
        return (
          <Badge variant="outline" className="capitalize">
            {category.replace(/_/g, ' ')}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'severity',
      header: 'Severity',
      cell: ({ row }: any) => {
        const severity = row.original.severity;
        return (
          <Badge className={getSeverityColor(severity)}>
            {severity.toUpperCase()}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'userName',
      header: 'User',
      cell: ({ row }: any) => {
        const log = row.original;
        return (
          <div className="text-sm">
            <div className="font-medium">{log.userName || 'Unknown'}</div>
            <div className="text-xs text-gray-500">{log.userId}</div>
          </div>
        );
      },
    },
    {
      accessorKey: 'metadata.ipAddress',
      header: 'IP Address',
      cell: ({ row }: any) => {
        const metadata = row.original.metadata;
        return (
          <div className="text-sm">
            <div>{metadata.ipAddress}</div>
            <div className="text-xs text-gray-500">{metadata.location}</div>
          </div>
        );
      },
    },
    {
      accessorKey: 'result',
      header: 'Result',
      cell: ({ row }: any) => {
        const result = row.original.result;
        return (
          <div className="flex items-center space-x-2">
            {getResultIcon(result)}
            <span className="capitalize">{result}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'riskScore',
      header: 'Risk',
      cell: ({ row }: any) => {
        const riskScore = row.original.riskScore;
        return (
          <Badge className={getRiskColor(riskScore)}>
            {getRiskLevel(riskScore)}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }: any) => {
        const log = row.original;
        return (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setSelectedLog(log)}
          >
            <Eye className="h-4 w-4" />
          </Button>
        );
      },
      enableSorting: false,
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-gray-600">Track and monitor all system activities</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={exportLogs}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="logs">Audit Logs</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="alerts">Security Alerts</TabsTrigger>
        </TabsList>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockStats.totalLogs}</div>
                <p className="text-xs text-muted-foreground">
                  Last 24 hours
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Security Events</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{mockStats.severityCounts.error + mockStats.severityCounts.critical}</div>
                <p className="text-xs text-muted-foreground">
                  Requires attention
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockStats.topUsers.length}</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="inline h-3 w-3 mr-1" />
                  +12% from yesterday
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Risk Score</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">Medium</div>
                <p className="text-xs text-muted-foreground">
                  Average risk level
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filter Logs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="authentication">Authentication</SelectItem>
                    <SelectItem value="authorization">Authorization</SelectItem>
                    <SelectItem value="data">Data</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="user_management">User Management</SelectItem>
                    <SelectItem value="configuration">Configuration</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={resultFilter} onValueChange={setResultFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Result" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Results</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failure">Failure</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}>
                  <Filter className="h-4 w-4 mr-2" />
                  Advanced
                </Button>
              </div>

              {showAdvancedFilters && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                  <div>
                    <Label>Date Range</Label>
                    <DatePickerWithRange 
                      date={dateRange}
                      onDateChange={setDateRange}
                    />
                  </div>
                  
                  <div>
                    <Label>User</Label>
                    <Select value={userFilter} onValueChange={setUserFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by user" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        {mockStats.topUsers.map((user) => (
                          <SelectItem key={user.userId} value={user.userId}>
                            {user.userName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Risk Level</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Risk level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Levels</SelectItem>
                        <SelectItem value="low">Low Risk</SelectItem>
                        <SelectItem value="medium">Medium Risk</SelectItem>
                        <SelectItem value="high">High Risk</SelectItem>
                        <SelectItem value="critical">Critical Risk</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Logs Table */}
          <Card>
            <CardHeader>
              <CardTitle>Audit Logs ({filteredLogs.length})</CardTitle>
              <CardDescription>System activity and security events</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={columns}
                data={filteredLogs}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Activity by Category */}
            <Card>
              <CardHeader>
                <CardTitle>Activity by Category</CardTitle>
                <CardDescription>Distribution of audit events by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(mockStats.categoryCounts).map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getCategoryIcon(category)}
                        <span className="font-medium capitalize">{category.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">{count}</span>
                        <div className="w-20 h-2 bg-gray-200 rounded">
                          <div 
                            className="h-full bg-blue-500 rounded" 
                            style={{ width: `${(count / Math.max(...Object.values(mockStats.categoryCounts))) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Users */}
            <Card>
              <CardHeader>
                <CardTitle>Most Active Users</CardTitle>
                <CardDescription>Users with the most audit log entries</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockStats.topUsers.map((user, index) => (
                    <div key={user.userId} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-sm font-medium">{index + 1}</span>
                        </div>
                        <div>
                          <div className="font-medium">{user.userName}</div>
                          <div className="text-sm text-gray-500">{user.userId}</div>
                        </div>
                      </div>
                      <Badge variant="secondary">{user.count} events</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
              <CardDescription>Audit log activity over the last 24 hours</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-gray-500">
                Timeline chart placeholder - implement with chart library
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Alerts Tab */}
        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Alerts</CardTitle>
              <CardDescription>High-priority security events requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredLogs
                  .filter(log => log.severity === 'error' || log.severity === 'critical')
                  .map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg bg-red-50">
                      <div className="flex items-center space-x-3">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <div>
                          <div className="font-medium">{log.action.replace(/_/g, ' ')}</div>
                          <div className="text-sm text-gray-600">{log.details}</div>
                          <div className="text-xs text-gray-500">
                            {format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm')} • {log.metadata.ipAddress}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getSeverityColor(log.severity)}>
                          {log.severity.toUpperCase()}
                        </Badge>
                        <Button size="sm" variant="outline" onClick={() => setSelectedLog(log)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Log Detail Dialog */}
      {selectedLog && (
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Audit Log Details</DialogTitle>
              <DialogDescription>
                Detailed information about this audit event
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Event Information</Label>
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{format(new Date(selectedLog.timestamp), 'MMM dd, yyyy HH:mm:ss')}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getCategoryIcon(selectedLog.category)}
                        <span className="text-sm font-medium">{selectedLog.action.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getSeverityColor(selectedLog.severity)}>
                          {selectedLog.severity.toUpperCase()}
                        </Badge>
                        <Badge className={getRiskColor(selectedLog.riskScore)}>
                          Risk: {getRiskLevel(selectedLog.riskScore)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">User Information</Label>
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{selectedLog.userName || 'Unknown User'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">User ID: {selectedLog.userId || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Session & Device</Label>
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center space-x-2">
                        <Globe className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{selectedLog.metadata.ipAddress}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{selectedLog.metadata.location || 'Unknown Location'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {selectedLog.metadata.deviceType === 'mobile' ? (
                          <Smartphone className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Monitor className="h-4 w-4 text-gray-400" />
                        )}
                        <span className="text-sm capitalize">{selectedLog.metadata.deviceType}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">Session: {selectedLog.metadata.sessionId}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Result</Label>
                    <div className="flex items-center space-x-2 mt-2">
                      {getResultIcon(selectedLog.result)}
                      <span className="capitalize">{selectedLog.result}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Details */}
              {selectedLog.details && (
                <div>
                  <Label className="text-sm font-medium">Details</Label>
                  <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                    {selectedLog.details}
                  </div>
                </div>
              )}

              {/* Changes */}
              {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Changes Made</Label>
                  <div className="mt-2 space-y-2">
                    {Object.entries(selectedLog.changes).map(([field, change]) => (
                      <div key={field} className="flex items-center justify-between p-3 bg-yellow-50 rounded">
                        <span className="font-medium">{field}</span>
                        <div className="flex items-center space-x-2 text-sm">
                          <span className="text-red-600">
                            {typeof change.old === 'object' ? JSON.stringify(change.old) : String(change.old)}
                          </span>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                          <span className="text-green-600">
                            {typeof change.new === 'object' ? JSON.stringify(change.new) : String(change.new)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* User Agent */}
              <div>
                <Label className="text-sm font-medium">User Agent</Label>
                <div className="mt-2 p-3 bg-gray-50 rounded text-xs font-mono">
                  {selectedLog.metadata.userAgent}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}