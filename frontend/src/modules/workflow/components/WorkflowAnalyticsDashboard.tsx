'use client';

import React, { memo } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/shared/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Activity, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp,
  Zap,
  GitBranch
} from 'lucide-react';

interface WorkflowMetrics {
  totalWorkflows: number;
  activeInstances: number;
  completedToday: number;
  averageCompletionTime: number;
  successRate: number;
  bottlenecks: Array<{
    nodeId: string;
    nodeName: string;
    averageTime: number;
    instanceCount: number;
  }>;
  statusDistribution: Array<{
    status: string;
    count: number;
    color: string;
  }>;
  completionTrend: Array<{
    date: string;
    completed: number;
    failed: number;
  }>;
  performanceByType: Array<{
    workflowType: string;
    avgTime: number;
    successRate: number;
    count: number;
  }>;
}

interface WorkflowAnalyticsDashboardProps {
  metrics: WorkflowMetrics;
  timeRange: '24h' | '7d' | '30d' | '90d';
  onTimeRangeChange: (range: '24h' | '7d' | '30d' | '90d') => void;
}


function WorkflowAnalyticsDashboard({ 
  metrics, 
  timeRange, 
  onTimeRangeChange 
}: WorkflowAnalyticsDashboardProps) {
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Activity className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Workflow Analytics</h2>
        </div>
        
        {/* Time Range Selector */}
        <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
          {(['24h', '7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => onTimeRangeChange(range)}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                timeRange === range
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Workflows</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.totalWorkflows}</p>
              </div>
              <GitBranch className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Instances</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.activeInstances}</p>
              </div>
              <Zap className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed Today</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.completedToday}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Time</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatTime(metrics.averageCompletionTime)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Instance Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="count"
                  >
                    {metrics.statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [value, 'Instances']}
                    labelFormatter={(label) => `Status: ${label}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {metrics.statusDistribution.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="capitalize">{item.status}</span>
                  </div>
                  <span className="font-medium">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Completion Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Completion Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.completionTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value: number, name: string) => [
                      value, 
                      name === 'completed' ? 'Completed' : 'Failed'
                    ]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="completed" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="failed" 
                    stroke="#EF4444" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance by Workflow Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.performanceByType} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis 
                    dataKey="workflowType" 
                    type="category" 
                    tick={{ fontSize: 12 }}
                    width={100}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === 'avgTime' ? formatTime(value) : 
                      name === 'successRate' ? formatPercentage(value) : 
                      value,
                      name === 'avgTime' ? 'Avg Time' :
                      name === 'successRate' ? 'Success Rate' :
                      'Count'
                    ]}
                  />
                  <Bar dataKey="avgTime" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Bottlenecks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance Bottlenecks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.bottlenecks.slice(0, 5).map((bottleneck, index) => (
                <div key={bottleneck.nodeId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        index === 0 ? 'bg-red-500' :
                        index === 1 ? 'bg-orange-500' :
                        index === 2 ? 'bg-yellow-500' :
                        'bg-gray-500'
                      }`}>
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-sm text-gray-900">{bottleneck.nodeName}</p>
                        <p className="text-xs text-gray-600">{bottleneck.instanceCount} instances</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-gray-900">
                      {formatTime(bottleneck.averageTime)}
                    </p>
                    <p className="text-xs text-gray-600">avg time</p>
                  </div>
                </div>
              ))}
              {metrics.bottlenecks.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No bottlenecks detected</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Success Rate Indicator */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <TrendingUp className={`h-6 w-6 ${
                metrics.successRate >= 90 ? 'text-green-500' :
                metrics.successRate >= 70 ? 'text-yellow-500' :
                'text-red-500'
              }`} />
              <div>
                <p className="text-sm font-medium text-gray-600">Overall Success Rate</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatPercentage(metrics.successRate)}
                </p>
              </div>
            </div>
            <div className="w-32 bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-300 ${
                  metrics.successRate >= 90 ? 'bg-green-500' :
                  metrics.successRate >= 70 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${metrics.successRate}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default memo(WorkflowAnalyticsDashboard);