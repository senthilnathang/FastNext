'use client'

/**
 * System Monitoring Dashboard - Migrated to ECharts
 * Real-time system performance and health monitoring
 */
import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Progress } from '@/shared/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import {
  StatCard,
  ChartCard,
  LineChart,
  GaugeChart,
  AreaChart
} from '@/shared/components/charts'
import {
  Activity,
  Cpu,
  HardDrive,
  MemoryStick,
  Network,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Info
} from 'lucide-react'
import { format, subMinutes } from 'date-fns'

interface SystemMetrics {
  timestamp: string
  cpu: {
    usage: number
    cores: number
    temperature?: number
    processes: number
  }
  memory: {
    used: number
    total: number
    available: number
    usage: number
  }
  disk: {
    used: number
    total: number
    available: number
    usage: number
    iops: number
  }
  network: {
    bytesIn: number
    bytesOut: number
    packetsIn: number
    packetsOut: number
    connections: number
  }
  database: {
    connections: number
    queries: number
    responseTime: number
    size: number
  }
}

interface ServiceStatus {
  name: string
  status: 'healthy' | 'warning' | 'critical' | 'down'
  uptime: number
  responseTime: number
  lastCheck: string
  version?: string
  url?: string
  description: string
}

interface AlertItem {
  id: string
  type: 'info' | 'warning' | 'error' | 'critical'
  title: string
  message: string
  timestamp: string
  source: string
  acknowledged: boolean
  resolved: boolean
}

interface Performance {
  metric: string
  current: number
  threshold: number
  unit: string
  trend: 'up' | 'down' | 'stable'
  status: 'good' | 'warning' | 'critical'
}

// Historical data for charts
interface HistoricalData {
  cpu: number[]
  memory: number[]
  disk: number[]
  network: number[]
  timestamps: string[]
}

export default function SystemMonitoringPageECharts() {
  const [currentMetrics, setCurrentMetrics] = useState<SystemMetrics | null>(null)
  const [historicalData, setHistoricalData] = useState<HistoricalData>({
    cpu: [],
    memory: [],
    disk: [],
    network: [],
    timestamps: []
  })
  const [services, setServices] = useState<ServiceStatus[]>([])
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [performance, setPerformance] = useState<Performance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

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
    }
  }, [])

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
  ]

  const mockAlerts: AlertItem[] = [
    {
      id: '1',
      type: 'critical',
      title: 'High Memory Usage',
      message: 'Memory usage has exceeded 85% for the last 10 minutes',
      timestamp: subMinutes(new Date(), 5).toISOString(),
      source: 'System Monitor',
      acknowledged: false,
      resolved: false
    },
    {
      id: '2',
      type: 'warning',
      title: 'Disk Space Warning',
      message: 'Disk usage is at 75%. Consider cleaning up old logs.',
      timestamp: subMinutes(new Date(), 15).toISOString(),
      source: 'Disk Monitor',
      acknowledged: true,
      resolved: false
    }
  ]

  const mockPerformance: Performance[] = [
    {
      metric: 'API Response Time',
      current: 125,
      threshold: 200,
      unit: 'ms',
      trend: 'up',
      status: 'good'
    },
    {
      metric: 'Database Queries/sec',
      current: 850,
      threshold: 1000,
      unit: 'qps',
      trend: 'stable',
      status: 'good'
    },
    {
      metric: 'Active Connections',
      current: 245,
      threshold: 500,
      unit: 'conn',
      trend: 'down',
      status: 'good'
    },
    {
      metric: 'Error Rate',
      current: 0.5,
      threshold: 1.0,
      unit: '%',
      trend: 'down',
      status: 'good'
    }
  ]

  // Fetch/update metrics
  const updateMetrics = useCallback(() => {
    setIsLoading(true)

    const newMetrics = generateMockMetrics()
    setCurrentMetrics(newMetrics)

    // Update historical data (keep last 20 points)
    setHistoricalData(prev => {
      const maxPoints = 20
      const newTimestamp = format(new Date(), 'HH:mm:ss')

      return {
        cpu: [...prev.cpu.slice(-maxPoints + 1), newMetrics.cpu.usage],
        memory: [...prev.memory.slice(-maxPoints + 1), newMetrics.memory.usage],
        disk: [...prev.disk.slice(-maxPoints + 1), newMetrics.disk.usage],
        network: [...prev.network.slice(-maxPoints + 1), newMetrics.network.bytesIn / 1000000],
        timestamps: [...prev.timestamps.slice(-maxPoints + 1), newTimestamp]
      }
    })

    setServices(mockServices)
    setAlerts(mockAlerts)
    setPerformance(mockPerformance)
    setLastUpdated(new Date())
    setIsLoading(false)
  }, [generateMockMetrics, mockServices, mockAlerts, mockPerformance])

  useEffect(() => {
    updateMetrics()

    if (autoRefresh) {
      const interval = setInterval(updateMetrics, 5000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, updateMetrics])

  const getStatusColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'healthy': return 'text-green-600'
      case 'warning': return 'text-yellow-600'
      case 'critical': return 'text-orange-600'
      case 'down': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />
      case 'warning': return <AlertTriangle className="h-4 w-4" />
      case 'critical': return <AlertCircle className="h-4 w-4" />
      case 'down': return <XCircle className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  const getAlertIcon = (type: AlertItem['type']) => {
    switch (type) {
      case 'critical': return <XCircle className="h-4 w-4 text-red-600" />
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'info': return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  if (!currentMetrics) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Monitoring</h1>
          <p className="text-muted-foreground">
            Real-time system performance and health monitoring
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Last updated: {format(lastUpdated, 'HH:mm:ss')}
          </div>
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
          >
            {autoRefresh ? 'Auto-refresh: ON' : 'Auto-refresh: OFF'}
          </Button>
          <Button onClick={updateMetrics} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Critical Alerts */}
      {alerts.some(a => !a.resolved && a.type === 'critical') && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Critical System Alerts</AlertTitle>
          <AlertDescription>
            {alerts.filter(a => !a.resolved && a.type === 'critical').length} critical issue(s) require immediate attention
          </AlertDescription>
        </Alert>
      )}

      {/* System Metrics Overview - Stats Cards with ECharts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="CPU Usage"
          value={`${currentMetrics.cpu.usage.toFixed(1)}%`}
          change={currentMetrics.cpu.usage > 70 ? -5.2 : 2.1}
          changeLabel="vs last hour"
          icon={<Cpu className="h-4 w-4" />}
          chartData={historicalData.cpu}
          chartType="area"
          color={currentMetrics.cpu.usage > 70 ? '#ef4444' : '#10b981'}
        />
        <StatCard
          title="Memory Usage"
          value={`${currentMetrics.memory.usage.toFixed(1)}%`}
          change={currentMetrics.memory.usage > 80 ? -8.3 : 1.5}
          changeLabel="vs last hour"
          icon={<MemoryStick className="h-4 w-4" />}
          chartData={historicalData.memory}
          chartType="area"
          color={currentMetrics.memory.usage > 80 ? '#ef4444' : '#3b82f6'}
        />
        <StatCard
          title="Disk Usage"
          value={`${currentMetrics.disk.usage.toFixed(1)}%`}
          change={0.3}
          changeLabel="vs last hour"
          icon={<HardDrive className="h-4 w-4" />}
          chartData={historicalData.disk}
          chartType="area"
          color={currentMetrics.disk.usage > 85 ? '#ef4444' : '#f59e0b'}
        />
        <StatCard
          title="Network Traffic"
          value={`${(currentMetrics.network.bytesIn / 1000000).toFixed(2)} MB/s`}
          change={12.5}
          changeLabel="vs last hour"
          icon={<Network className="h-4 w-4" />}
          chartData={historicalData.network}
          chartType="area"
          color="#8b5cf6"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts
            {alerts.filter(a => !a.resolved).length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {alerts.filter(a => !a.resolved).length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Gauge Charts */}
          <div className="grid gap-4 md:grid-cols-3">
            <ChartCard
              title="CPU Usage"
              description={`${currentMetrics.cpu.cores} cores, ${currentMetrics.cpu.processes} processes`}
            >
              <div className="h-[200px] w-full">
                <GaugeChart
                  value={currentMetrics.cpu.usage}
                  min={0}
                  max={100}
                  unit="%"
                  radius="65%"
                  center={['50%', '55%']}
                  color={[
                    [0.6, '#10b981'],
                    [0.8, '#f59e0b'],
                    [1, '#ef4444']
                  ]}
                  className="h-full w-full"
                />
              </div>
            </ChartCard>

            <ChartCard
              title="Memory Usage"
              description={`${currentMetrics.memory.used.toFixed(1)} GB / ${currentMetrics.memory.total} GB`}
            >
              <div className="h-[200px] w-full">
                <GaugeChart
                  value={currentMetrics.memory.usage}
                  min={0}
                  max={100}
                  unit="%"
                  radius="65%"
                  center={['50%', '55%']}
                  color={[
                    [0.7, '#10b981'],
                    [0.85, '#f59e0b'],
                    [1, '#ef4444']
                  ]}
                  className="h-full w-full"
                />
              </div>
            </ChartCard>

            <ChartCard
              title="Disk Usage"
              description={`${currentMetrics.disk.used.toFixed(0)} GB / ${currentMetrics.disk.total} GB`}
            >
              <div className="h-[200px] w-full">
                <GaugeChart
                  value={currentMetrics.disk.usage}
                  min={0}
                  max={100}
                  unit="%"
                  radius="65%"
                  center={['50%', '55%']}
                  color={[
                    [0.75, '#10b981'],
                    [0.9, '#f59e0b'],
                    [1, '#ef4444']
                  ]}
                  className="h-full w-full"
                />
              </div>
            </ChartCard>
          </div>

          {/* Historical Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            <ChartCard
              title="System Resources"
              description="Real-time resource utilization"
            >
              <div className="h-[280px] w-full">
                <LineChart
                  data={[
                    {
                      name: 'CPU',
                      data: historicalData.cpu,
                      smooth: true,
                      color: '#10b981'
                    },
                    {
                      name: 'Memory',
                      data: historicalData.memory,
                      smooth: true,
                      color: '#3b82f6'
                    },
                    {
                      name: 'Disk',
                      data: historicalData.disk,
                      smooth: true,
                      color: '#f59e0b'
                    }
                  ]}
                  xAxisData={historicalData.timestamps}
                  legend={true}
                  yAxis={{ name: 'Usage %', min: 0, max: 100 }}
                  grid={{
                    top: 40,
                    right: 20,
                    bottom: 30,
                    left: 50,
                    containLabel: true
                  }}
                  className="h-full w-full"
                />
              </div>
            </ChartCard>

            <ChartCard
              title="Network Traffic"
              description="Real-time network throughput"
            >
              <div className="h-[280px] w-full">
                <AreaChart
                  data={[
                    {
                      name: 'Incoming',
                      data: historicalData.network,
                      smooth: true,
                      color: '#8b5cf6'
                    }
                  ]}
                  xAxisData={historicalData.timestamps}
                  legend={false}
                  yAxis={{ name: 'MB/s' }}
                  grid={{
                    top: 30,
                    right: 20,
                    bottom: 30,
                    left: 50,
                    containLabel: true
                  }}
                  className="h-full w-full"
                />
              </div>
            </ChartCard>
          </div>
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {service.name}
                  </CardTitle>
                  <div className={getStatusColor(service.status)}>
                    {getStatusIcon(service.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <Badge
                        variant={
                          service.status === 'healthy' ? 'default' :
                          service.status === 'warning' ? 'secondary' : 'destructive'
                        }
                      >
                        {service.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Uptime</span>
                      <span className="font-medium">{service.uptime}%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Response Time</span>
                      <span className="font-medium">{service.responseTime}ms</span>
                    </div>
                    {service.version && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Version</span>
                        <span className="font-medium">{service.version}</span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {service.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4">
            {performance.map((perf, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-sm font-medium">{perf.metric}</CardTitle>
                    <CardDescription>
                      Threshold: {perf.threshold} {perf.unit}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {perf.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-600" />}
                    {perf.trend === 'down' && <TrendingDown className="h-4 w-4 text-red-600" />}
                    <Badge
                      variant={
                        perf.status === 'good' ? 'default' :
                        perf.status === 'warning' ? 'secondary' : 'destructive'
                      }
                    >
                      {perf.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">
                        {perf.current} {perf.unit}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {((perf.current / perf.threshold) * 100).toFixed(0)}% of threshold
                      </span>
                    </div>
                    <Progress
                      value={(perf.current / perf.threshold) * 100}
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          {alerts.map((alert) => (
            <Alert
              key={alert.id}
              variant={alert.type === 'critical' || alert.type === 'error' ? 'destructive' : 'default'}
            >
              {getAlertIcon(alert.type)}
              <AlertTitle className="flex items-center justify-between">
                <span>{alert.title}</span>
                <div className="flex items-center gap-2">
                  {alert.acknowledged && (
                    <Badge variant="outline">Acknowledged</Badge>
                  )}
                  {alert.resolved && (
                    <Badge variant="default">Resolved</Badge>
                  )}
                </div>
              </AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-1">
                  <p>{alert.message}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                    <span>Source: {alert.source}</span>
                    <span>Time: {format(new Date(alert.timestamp), 'PPpp')}</span>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          ))}

          {alerts.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold">No Active Alerts</h3>
                  <p className="text-muted-foreground">
                    All systems are operating normally
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
