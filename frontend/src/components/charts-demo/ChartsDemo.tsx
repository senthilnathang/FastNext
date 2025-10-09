'use client'

/**
 * Charts Demo Component
 * Showcases all ECharts components with examples
 */
import React, { useState } from 'react'
import {
  LineChart,
  BarChart,
  PieChart,
  AreaChart,
  GaugeChart,
  StatCard,
  ChartCard
} from '@/shared/components/charts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Button } from '@/shared/components/ui/button'
import { RefreshCw, TrendingUp, Users, DollarSign, Activity } from 'lucide-react'

export const ChartsDemo: React.FC = () => {
  const [loading, setLoading] = useState(false)

  // Sample data
  const lineData = [
    {
      name: 'Sales',
      data: [120, 200, 150, 80, 70, 110, 130, 180, 160, 140, 190, 210],
      smooth: true,
      color: '#3b82f6'
    },
    {
      name: 'Revenue',
      data: [100, 180, 130, 90, 60, 100, 120, 160, 150, 130, 170, 200],
      smooth: true,
      color: '#10b981'
    }
  ]

  const barData = [
    {
      name: 'Product A',
      data: [320, 302, 301, 334, 390, 330, 320],
      color: '#3b82f6'
    },
    {
      name: 'Product B',
      data: [220, 182, 191, 234, 290, 230, 220],
      color: '#10b981'
    },
    {
      name: 'Product C',
      data: [150, 232, 201, 154, 190, 330, 410],
      color: '#f59e0b'
    }
  ]

  const pieData = [
    { name: 'Desktop', value: 1048, color: '#3b82f6' },
    { name: 'Mobile', value: 735, color: '#10b981' },
    { name: 'Tablet', value: 580, color: '#f59e0b' },
    { name: 'Other', value: 484, color: '#ef4444' }
  ]

  const areaData = [
    {
      name: 'Users',
      data: [140, 232, 101, 264, 290, 330, 310, 250, 280, 320, 350, 380],
      smooth: true,
      color: '#8b5cf6'
    }
  ]

  const xAxisData = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const weekData = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const handleRefresh = () => {
    setLoading(true)
    setTimeout(() => setLoading(false), 1500)
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ECharts Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive chart library built with ECharts
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value="$45,231.89"
          change={20.1}
          changeLabel="from last month"
          icon={<DollarSign className="h-4 w-4" />}
          chartData={[120, 200, 150, 80, 70, 110, 130, 180, 160, 140, 190, 210]}
          chartType="area"
          color="#10b981"
        />
        <StatCard
          title="Active Users"
          value="2,350"
          change={15.3}
          changeLabel="from last month"
          icon={<Users className="h-4 w-4" />}
          chartData={[140, 232, 101, 264, 290, 330, 310, 250, 280, 320, 350, 380]}
          chartType="area"
          color="#3b82f6"
        />
        <StatCard
          title="Conversion Rate"
          value="3.2%"
          change={-2.5}
          changeLabel="from last month"
          icon={<TrendingUp className="h-4 w-4" />}
          chartData={[3.5, 3.2, 3.8, 3.1, 2.9, 3.2, 3.4, 3.0, 3.1, 3.3, 3.2, 3.1]}
          chartType="line"
          color="#f59e0b"
        />
        <StatCard
          title="System Health"
          value="98.5%"
          change={0.5}
          changeLabel="uptime"
          icon={<Activity className="h-4 w-4" />}
          chartData={[98, 99, 97, 98, 99, 98, 99, 98, 99, 98, 99, 98]}
          chartType="area"
          color="#8b5cf6"
        />
      </div>

      {/* Chart Tabs */}
      <Tabs defaultValue="line" className="space-y-4">
        <TabsList>
          <TabsTrigger value="line">Line Charts</TabsTrigger>
          <TabsTrigger value="bar">Bar Charts</TabsTrigger>
          <TabsTrigger value="pie">Pie Charts</TabsTrigger>
          <TabsTrigger value="area">Area Charts</TabsTrigger>
          <TabsTrigger value="gauge">Gauge Charts</TabsTrigger>
        </TabsList>

        <TabsContent value="line" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <ChartCard
              title="Sales vs Revenue"
              description="Monthly comparison of sales and revenue"
            >
              <div className="h-[300px]">
                <LineChart
                  data={lineData}
                  xAxisData={xAxisData}
                  legend={true}
                  zoom={true}
                  loading={loading}
                  className="h-full"
                />
              </div>
            </ChartCard>

            <ChartCard
              title="Smooth Line Chart"
              description="Sales trend with smooth curves"
            >
              <div className="h-[300px]">
                <LineChart
                  data={[
                    {
                      name: 'Trend',
                      data: [120, 200, 150, 80, 70, 110, 130, 180, 160, 140, 190, 210],
                      smooth: true,
                      color: '#8b5cf6'
                    }
                  ]}
                  xAxisData={xAxisData}
                  legend={false}
                  loading={loading}
                  className="h-full"
                />
              </div>
            </ChartCard>
          </div>

          <ChartCard
            title="Multi-Line Chart with Zoom"
            description="Interactive line chart with data zoom capability"
          >
            <div className="h-[400px]">
              <LineChart
                data={lineData}
                xAxisData={xAxisData}
                legend={true}
                zoom={true}
                tooltip={true}
                loading={loading}
                className="h-full"
              />
            </div>
          </ChartCard>
        </TabsContent>

        <TabsContent value="bar" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <ChartCard
              title="Product Sales"
              description="Weekly sales by product category"
            >
              <div className="h-[300px]">
                <BarChart
                  data={barData}
                  xAxisData={weekData}
                  legend={true}
                  loading={loading}
                  className="h-full"
                />
              </div>
            </ChartCard>

            <ChartCard
              title="Horizontal Bar Chart"
              description="Product comparison (horizontal)"
            >
              <div className="h-[300px]">
                <BarChart
                  data={[
                    {
                      name: 'Sales',
                      data: [320, 302, 301, 334, 390, 330, 320],
                      color: '#3b82f6'
                    }
                  ]}
                  xAxisData={weekData}
                  legend={false}
                  horizontal={true}
                  loading={loading}
                  className="h-full"
                />
              </div>
            </ChartCard>
          </div>

          <ChartCard
            title="Stacked Bar Chart"
            description="Product sales stacked by category"
          >
            <div className="h-[400px]">
              <BarChart
                data={barData}
                xAxisData={weekData}
                legend={true}
                stack={true}
                showValues={true}
                loading={loading}
                className="h-full"
              />
            </div>
          </ChartCard>
        </TabsContent>

        <TabsContent value="pie" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <ChartCard
              title="Traffic Sources"
              description="Distribution by device type"
            >
              <div className="h-[300px]">
                <PieChart
                  data={pieData}
                  legend={true}
                  loading={loading}
                  className="h-full"
                />
              </div>
            </ChartCard>

            <ChartCard
              title="Donut Chart"
              description="Traffic sources (donut style)"
            >
              <div className="h-[300px]">
                <PieChart
                  data={pieData}
                  legend={true}
                  donut={true}
                  loading={loading}
                  className="h-full"
                />
              </div>
            </ChartCard>

            <ChartCard
              title="Rose Chart"
              description="Traffic sources (rose style)"
            >
              <div className="h-[300px]">
                <PieChart
                  data={pieData}
                  legend={true}
                  roseType={true}
                  loading={loading}
                  className="h-full"
                />
              </div>
            </ChartCard>
          </div>
        </TabsContent>

        <TabsContent value="area" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <ChartCard
              title="User Growth"
              description="Monthly active users"
            >
              <div className="h-[300px]">
                <AreaChart
                  data={areaData}
                  xAxisData={xAxisData}
                  legend={false}
                  loading={loading}
                  className="h-full"
                />
              </div>
            </ChartCard>

            <ChartCard
              title="Stacked Area Chart"
              description="Multiple metrics stacked"
            >
              <div className="h-[300px]">
                <AreaChart
                  data={[
                    {
                      name: 'Email',
                      data: [120, 132, 101, 134, 90, 230, 210],
                      color: '#3b82f6'
                    },
                    {
                      name: 'Direct',
                      data: [220, 182, 191, 234, 290, 330, 310],
                      color: '#10b981'
                    },
                    {
                      name: 'Social',
                      data: [150, 232, 201, 154, 190, 330, 410],
                      color: '#f59e0b'
                    }
                  ]}
                  xAxisData={weekData}
                  legend={true}
                  stack={true}
                  loading={loading}
                  className="h-full"
                />
              </div>
            </ChartCard>
          </div>
        </TabsContent>

        <TabsContent value="gauge" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <ChartCard
              title="CPU Usage"
              description="Current processor utilization"
            >
              <div className="h-[300px]">
                <GaugeChart
                  value={72}
                  min={0}
                  max={100}
                  unit="%"
                  loading={loading}
                  className="h-full"
                />
              </div>
            </ChartCard>

            <ChartCard
              title="Memory Usage"
              description="Current memory consumption"
            >
              <div className="h-[300px]">
                <GaugeChart
                  value={58}
                  min={0}
                  max={100}
                  unit="%"
                  color={[
                    [0.5, '#10b981'],
                    [0.8, '#f59e0b'],
                    [1, '#ef4444']
                  ]}
                  loading={loading}
                  className="h-full"
                />
              </div>
            </ChartCard>

            <ChartCard
              title="Disk Usage"
              description="Current disk space used"
            >
              <div className="h-[300px]">
                <GaugeChart
                  value={85}
                  min={0}
                  max={100}
                  unit="%"
                  color={[
                    [0.3, '#10b981'],
                    [0.7, '#f59e0b'],
                    [1, '#ef4444']
                  ]}
                  loading={loading}
                  className="h-full"
                />
              </div>
            </ChartCard>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

ChartsDemo.displayName = 'ChartsDemo'
