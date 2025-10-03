'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert';
import { 
  Server, 
  Activity, 
  Cpu, 
  HardDrive, 
  MemoryStick,
  Network,
  Database,
  Globe,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Zap,
  Thermometer,
  Wifi,
  Users,
  FileText,
  Shield,
  Settings,
  Download,
  Eye,
  BarChart3,
  PieChart,
  LineChart,
  Monitor,
  Smartphone,
  ChevronUp,
  ChevronDown,
  Calendar,
  Timer,
  Cloud,
  AlertCircle,
  Info
} from 'lucide-react';
import { format, subMinutes, subHours, subDays } from 'date-fns';
import { getSecurityStatistics } from '@/lib/monitoring/security-monitor';

interface SystemMetrics {
  timestamp: string;
  cpu: {
    usage: number;
    cores: number;
    temperature?: number;
    processes: number;
  };
  memory: {
    used: number;
    total: number;
    available: number;
    usage: number;
  };
  disk: {
    used: number;
    total: number;
    available: number;
    usage: number;
    iops: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
    connections: number;
  };
  database: {
    connections: number;
    queries: number;
    responseTime: number;
    size: number;
  };
}

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'warning' | 'critical' | 'down';
  uptime: number;
  responseTime: number;
  lastCheck: string;
  version?: string;
  url?: string;
  description: string;
}

interface AlertItem {
  id: string;
  type: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  source: string;
  acknowledged: boolean;
  resolved: boolean;
}

interface Performance {
  metric: string;
  current: number;
  threshold: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  status: 'good' | 'warning' | 'critical';
}

export default function SystemMonitoringPage() {
  const [currentMetrics, setCurrentMetrics] = useState<SystemMetrics | null>(null);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [performance, setPerformance] = useState<Performance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data generation
  const generateMockMetrics = useCallback((): SystemMetrics => {
    return {
      timestamp: new Date().toISOString(),
      cpu: {
        usage: Math.random() * 100,
        cores: 8,
        temperature: 45 + Math.random() * 20,
        processes: 150 + Math.floor(Math.random() * 50)
      },
      memory: {
        used: 6.5 + Math.random() * 2,
        total: 16,
        available: 9.5 - Math.random() * 2,
        usage: (6.5 + Math.random() * 2) / 16 * 100
      },
      disk: {
        used: 450 + Math.random() * 50,
        total: 1000,
        available: 550 - Math.random() * 50,
        usage: (450 + Math.random() * 50) / 1000 * 100,
        iops: Math.floor(Math.random() * 1000) + 500
      },
      network: {
        bytesIn: Math.floor(Math.random() * 1000000) + 500000,
        bytesOut: Math.floor(Math.random() * 800000) + 300000,
        packetsIn: Math.floor(Math.random() * 10000) + 5000,
        packetsOut: Math.floor(Math.random() * 8000) + 3000,
        connections: Math.floor(Math.random() * 500) + 100
      },
      database: {
        connections: Math.floor(Math.random() * 50) + 10,
        queries: Math.floor(Math.random() * 1000) + 500,
        responseTime: Math.random() * 100 + 10,
        size: 2.5 + Math.random() * 0.5
      }
    };
  }, []);

  const mockServices: ServiceStatus[] = [
    {
      name: 'Web Server',
      status: 'healthy',
      uptime: 99.9,
      responseTime: 45,
      lastCheck: new Date().toISOString(),
      version: '2.4.1',
      url: 'https://api.example.com',
      description: 'Main application server'
    },
    {
      name: 'Database',
      status: 'healthy',
      uptime: 99.8,
      responseTime: 12,
      lastCheck: new Date().toISOString(),
      version: '14.2',
      description: 'PostgreSQL database server'
    },
    {
      name: 'Cache Server',
      status: 'warning',
      uptime: 98.5,
      responseTime: 8,
      lastCheck: new Date().toISOString(),
      version: '6.2',
      description: 'Redis cache server'
    },
    {
      name: 'Authentication Service',
      status: 'healthy',
      uptime: 99.9,
      responseTime: 25,
      lastCheck: new Date().toISOString(),
      version: '1.0.5',
      description: 'OAuth authentication provider'
    },
    {
      name: 'File Storage',
      status: 'critical',
      uptime: 95.2,
      responseTime: 150,
      lastCheck: subMinutes(new Date(), 5).toISOString(),
      version: '2.1.0',
      description: 'Object storage service'
    }
  ];

  const mockAlerts: AlertItem[] = [
    {
      id: '1',
      type: 'critical',
      title: 'High Memory Usage',
      message: 'Memory usage has exceeded 90% for more than 5 minutes',
      timestamp: subMinutes(new Date(), 2).toISOString(),
      source: 'System Monitor',
      acknowledged: false,
      resolved: false
    },
    {
      id: '2',
      type: 'warning',
      title: 'Database Connection Pool',
      message: 'Database connection pool utilization is at 85%',
      timestamp: subMinutes(new Date(), 10).toISOString(),
      source: 'Database Monitor',
      acknowledged: true,
      resolved: false
    },
    {
      id: '3',
      type: 'error',
      title: 'Failed Login Attempts',
      message: 'Multiple failed login attempts detected from IP 192.168.1.100',
      timestamp: subMinutes(new Date(), 15).toISOString(),
      source: 'Security Monitor',
      acknowledged: false,
      resolved: true
    },
    {
      id: '4',
      type: 'info',
      title: 'System Update Available',
      message: 'A new system update is available for installation',
      timestamp: subHours(new Date(), 2).toISOString(),
      source: 'Update Manager',
      acknowledged: true,
      resolved: false
    }
  ];

  const mockPerformance: Performance[] = [
    {
      metric: 'Response Time',
      current: 145,
      threshold: 200,
      unit: 'ms',
      trend: 'up',
      status: 'good'
    },
    {
      metric: 'Throughput',
      current: 1250,
      threshold: 1000,
      unit: 'req/min',
      trend: 'up',
      status: 'good'
    },
    {
      metric: 'Error Rate',
      current: 0.5,
      threshold: 1.0,
      unit: '%',
      trend: 'down',
      status: 'good'
    },
    {
      metric: 'CPU Usage',
      current: 75,
      threshold: 80,
      unit: '%',
      trend: 'up',
      status: 'warning'
    }
  ];

  // Fetch system metrics
  const fetchMetrics = useCallback(async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const metrics = generateMockMetrics();
      setCurrentMetrics(metrics);
      setServices(mockServices);
      setAlerts(mockAlerts);
      setPerformance(mockPerformance);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setIsLoading(false);
    }
  }, [generateMockMetrics]);

  // Auto-refresh effect
  useEffect(() => {
    fetchMetrics();
    
    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [fetchMetrics, autoRefresh]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': case 'good': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'error': case 'critical': return 'text-red-600 bg-red-100';
      case 'down': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': case 'good': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'error': case 'critical': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'down': return <XCircle className="h-4 w-4 text-gray-600" />;
      default: return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'info': return <Info className="h-4 w-4 text-blue-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'critical': return <XCircle className="h-4 w-4 text-red-800" />;
      default: return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <div className="h-4 w-4" />;
    }
  };

  const formatBytes = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  };

  const formatUptime = (uptime: number): string => {
    return `${uptime.toFixed(2)}%`;
  };

  if (isLoading && !currentMetrics) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading system metrics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Monitoring</h1>
          <p className="text-gray-600">
            Real-time system performance and health monitoring
          </p>
          <p className="text-sm text-gray-500">
            Last updated: {format(lastUpdated, 'MMM dd, yyyy HH:mm:ss')}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-50 text-green-700' : ''}
          >
            <Zap className={`h-4 w-4 mr-2 ${autoRefresh ? 'text-green-600' : ''}`} />
            Auto Refresh {autoRefresh ? 'On' : 'Off'}
          </Button>
          <Button variant="outline" onClick={fetchMetrics} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Critical Alerts */}
          {alerts.filter(alert => alert.type === 'critical' && !alert.resolved).length > 0 && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertTitle className="text-red-800">Critical Alerts</AlertTitle>
              <AlertDescription className="text-red-700">
                {alerts.filter(alert => alert.type === 'critical' && !alert.resolved).length} critical 
                issue(s) require immediate attention.
              </AlertDescription>
            </Alert>
          )}

          {/* System Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* CPU */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {currentMetrics?.cpu.usage.toFixed(1)}%
                </div>
                <div className="space-y-2">
                  <Progress value={currentMetrics?.cpu.usage} className="h-2" />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{currentMetrics?.cpu.cores} cores</span>
                    <span>{currentMetrics?.cpu.temperature?.toFixed(1)}°C</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Memory */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                <MemoryStick className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {currentMetrics?.memory.usage.toFixed(1)}%
                </div>
                <div className="space-y-2">
                  <Progress value={currentMetrics?.memory.usage} className="h-2" />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{currentMetrics?.memory.used.toFixed(1)} GB used</span>
                    <span>{currentMetrics?.memory.total} GB total</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Disk */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Disk Usage</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {currentMetrics?.disk.usage.toFixed(1)}%
                </div>
                <div className="space-y-2">
                  <Progress value={currentMetrics?.disk.usage} className="h-2" />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{currentMetrics?.disk.used} GB used</span>
                    <span>{currentMetrics?.disk.iops} IOPS</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Network */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Network Activity</CardTitle>
                <Network className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {currentMetrics?.network.connections}
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-500">Active Connections</div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>↓ {formatBytes(currentMetrics?.network.bytesIn || 0)}</span>
                    <span>↑ {formatBytes(currentMetrics?.network.bytesOut || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Service Status */}
          <Card>
            <CardHeader>
              <CardTitle>Service Status</CardTitle>
              <CardDescription>Current status of all system services</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map((service, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(service.status)}
                      <div>
                        <div className="font-medium">{service.name}</div>
                        <div className="text-sm text-gray-500">{service.description}</div>
                        <div className="text-xs text-gray-400">
                          {service.responseTime}ms • {formatUptime(service.uptime)} uptime
                        </div>
                      </div>
                    </div>
                    <Badge className={getStatusColor(service.status)}>
                      {service.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Alerts */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Alerts</CardTitle>
              <CardDescription>Latest system alerts and notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getAlertIcon(alert.type)}
                      <div>
                        <div className="font-medium">{alert.title}</div>
                        <div className="text-sm text-gray-600">{alert.message}</div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(alert.timestamp), 'MMM dd, HH:mm')} • {alert.source}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {alert.acknowledged && (
                        <Badge variant="outline" className="text-xs">Acknowledged</Badge>
                      )}
                      {alert.resolved && (
                        <Badge variant="outline" className="text-green-600 bg-green-100 text-xs">Resolved</Badge>
                      )}
                      <Badge className={getStatusColor(alert.type)}>
                        {alert.type.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {services.map((service, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      {getStatusIcon(service.status)}
                      <span>{service.name}</span>
                    </CardTitle>
                    <Badge className={getStatusColor(service.status)}>
                      {service.status}
                    </Badge>
                  </div>
                  <CardDescription>{service.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Response Time</Label>
                      <div className="text-lg font-semibold">{service.responseTime}ms</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Uptime</Label>
                      <div className="text-lg font-semibold">{formatUptime(service.uptime)}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Version</Label>
                      <div className="text-sm">{service.version || 'N/A'}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Last Check</Label>
                      <div className="text-sm">{format(new Date(service.lastCheck), 'HH:mm:ss')}</div>
                    </div>
                  </div>
                  {service.url && (
                    <div>
                      <Label className="text-sm font-medium">Endpoint</Label>
                      <div className="text-sm text-blue-600">{service.url}</div>
                    </div>
                  )}
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4 mr-2" />
                      View Logs
                    </Button>
                    <Button size="sm" variant="outline">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Restart
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {performance.map((perf, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{perf.metric}</CardTitle>
                  {getTrendIcon(perf.trend)}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {perf.current}{perf.unit}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Threshold: {perf.threshold}{perf.unit}</span>
                    <Badge className={getStatusColor(perf.status)}>
                      {perf.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Performance Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>CPU & Memory Usage</CardTitle>
                <CardDescription>Real-time system resource utilization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  Line chart placeholder - implement with chart library
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Network Traffic</CardTitle>
                <CardDescription>Incoming and outgoing network data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  Area chart placeholder - implement with chart library
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Database Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Database Performance</CardTitle>
              <CardDescription>Database metrics and query performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">{currentMetrics?.database.connections}</div>
                  <div className="text-sm text-gray-500">Active Connections</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{currentMetrics?.database.queries}</div>
                  <div className="text-sm text-gray-500">Queries/sec</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{currentMetrics?.database.responseTime.toFixed(1)}ms</div>
                  <div className="text-sm text-gray-500">Avg Response Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{currentMetrics?.database.size.toFixed(1)}GB</div>
                  <div className="text-sm text-gray-500">Database Size</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Alerts</CardTitle>
              <CardDescription>All system alerts and notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getAlertIcon(alert.type)}
                      <div>
                        <div className="font-medium">{alert.title}</div>
                        <div className="text-sm text-gray-600">{alert.message}</div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(alert.timestamp), 'MMM dd, yyyy HH:mm')} • {alert.source}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {!alert.acknowledged && (
                        <Button size="sm" variant="outline">
                          Acknowledge
                        </Button>
                      )}
                      {!alert.resolved && (
                        <Button size="sm" variant="outline">
                          Resolve
                        </Button>
                      )}
                      <Badge className={getStatusColor(alert.type)}>
                        {alert.type.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Security Events</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">23</div>
                <p className="text-xs text-muted-foreground">
                  Last 24 hours
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed Logins</CardTitle>
                <XCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">8</div>
                <p className="text-xs text-muted-foreground">
                  Blocked attempts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">156</div>
                <p className="text-xs text-muted-foreground">
                  Current users
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Security Dashboard</CardTitle>
              <CardDescription>Integrated security monitoring from security-monitor.ts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500">
                Security monitoring data will be displayed here using the existing security-monitor.ts module
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}