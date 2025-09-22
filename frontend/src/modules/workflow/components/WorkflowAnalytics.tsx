'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/card';
import { 
  BarChart3, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Activity
} from 'lucide-react';
import { AnalyticsDashboard, type KpiData } from '@/shared/components/analytics-dashboard';

interface WorkflowAnalyticsProps {
  workflowTypeId?: number;
  timeRange?: string;
}

export default function WorkflowAnalytics({}: WorkflowAnalyticsProps) {
  // Mock data - would come from API
  const analyticsData = {
    totalInstances: 342,
    completedInstances: 298,
    pendingInstances: 44,
    averageCompletionTime: 4.2, // hours
    slaViolations: 12,
    successRate: 87.1,
  };

  const kpiData: KpiData[] = [
    {
      title: 'Total Instances',
      value: analyticsData.totalInstances,
      change: 0.15,
      changeType: 'increase',
      format: 'number',
      icon: <Activity className="h-4 w-4" />,
      description: 'Workflow instances created'
    },
    {
      title: 'Completion Rate',
      value: analyticsData.successRate,
      change: 0.08,
      changeType: 'increase',
      format: 'percentage',
      icon: <CheckCircle className="h-4 w-4" />,
      description: 'Successfully completed workflows'
    },
    {
      title: 'Avg. Completion Time',
      value: `${analyticsData.averageCompletionTime} hrs`,
      change: -0.12,
      changeType: 'decrease',
      format: 'number',
      icon: <Clock className="h-4 w-4" />,
      description: 'Average time to complete'
    },
    {
      title: 'SLA Violations',
      value: analyticsData.slaViolations,
      change: 0.05,
      changeType: 'increase',
      format: 'number',
      icon: <AlertTriangle className="h-4 w-4" />,
      description: 'Workflows exceeding SLA'
    }
  ];

  const performanceData = [
    { date: 'Jan', completed: 45, pending: 8, failed: 2 },
    { date: 'Feb', completed: 52, pending: 12, failed: 1 },
    { date: 'Mar', completed: 48, pending: 6, failed: 3 },
    { date: 'Apr', completed: 61, pending: 9, failed: 2 },
    { date: 'May', completed: 55, pending: 7, failed: 1 },
    { date: 'Jun', completed: 37, pending: 2, failed: 1 },
  ];

  const stateDistribution = [
    { state: 'Completed', count: 298, color: '#10B981' },
    { state: 'In Progress', count: 32, color: '#3B82F6' },
    { state: 'Pending', count: 8, color: '#F59E0B' },
    { state: 'Failed', count: 4, color: '#EF4444' },
  ];

  const bottleneckData = [
    { step: 'Approval', avgTime: 6.2, instances: 45 },
    { step: 'Review', avgTime: 4.8, instances: 67 },
    { step: 'Processing', avgTime: 2.1, instances: 123 },
    { step: 'Validation', avgTime: 1.9, instances: 89 },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Dashboard */}
      <AnalyticsDashboard
        kpis={kpiData}
        chartData={performanceData}
        chartType="line"
        xAxisKey="date"
        yAxisKeys={['completed', 'pending', 'failed']}
        chartHeight={300}
        loading={false}
        showTrends={true}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* State Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Workflow State Distribution</span>
            </CardTitle>
            <CardDescription>Current status of all workflow instances</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stateDistribution.map((item) => (
                <div key={item.state} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium">{item.state}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">{item.count}</span>
                    <div 
                      className="h-2 rounded-full bg-gray-200"
                      style={{ width: '60px' }}
                    >
                      <div 
                        className="h-2 rounded-full"
                        style={{ 
                          backgroundColor: item.color,
                          width: `${(item.count / 342) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bottleneck Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Bottleneck Analysis</span>
            </CardTitle>
            <CardDescription>Steps taking longest time to complete</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bottleneckData.map((item, index) => (
                <div key={item.step} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-red-600">{index + 1}</span>
                    </div>
                    <span className="text-sm font-medium">{item.step}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{item.avgTime}h avg</div>
                    <div className="text-xs text-gray-500">{item.instances} instances</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Recent Activity</span>
          </CardTitle>
          <CardDescription>Latest workflow instance updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                id: 1,
                title: 'Sales Order #SO-001',
                action: 'Completed',
                user: 'John Doe',
                time: '2 minutes ago',
                status: 'success'
              },
              {
                id: 2,
                title: 'Purchase Order #PO-045',
                action: 'Approval Required',
                user: 'Jane Smith',
                time: '15 minutes ago',
                status: 'warning'
              },
              {
                id: 3,
                title: 'Invoice #INV-2024-001',
                action: 'Payment Received',
                user: 'System',
                time: '1 hour ago',
                status: 'success'
              },
              {
                id: 4,
                title: 'Quote #QT-789',
                action: 'Failed Validation',
                user: 'Mike Johnson',
                time: '2 hours ago',
                status: 'error'
              },
            ].map((activity) => (
              <div key={activity.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.status === 'success' ? 'bg-green-500' :
                    activity.status === 'warning' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`} />
                  <div>
                    <div className="text-sm font-medium">{activity.title}</div>
                    <div className="text-xs text-gray-500">{activity.action} by {activity.user}</div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">{activity.time}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}