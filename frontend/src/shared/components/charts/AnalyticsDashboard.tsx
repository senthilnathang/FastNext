'use client'

/**
 * Analytics Dashboard Component
 * Migrated from Recharts to ECharts
 * Complete dashboard with KPIs and multiple chart types
 */
import React, { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import {
  LineChart,
  BarChart,
  AreaChart,
  PieChart,
  StatCard
} from '@/shared/components/charts'
import {
  ArrowDown,
  ArrowUp,
  DollarSign,
  Users,
  TrendingUp,
  Eye
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'

export interface KpiData {
  title: string
  value: number | string
  change?: number
  changeType?: 'increase' | 'decrease' | 'neutral'
  format?: 'currency' | 'percentage' | 'number' | 'compact'
  icon?: React.ReactNode
  description?: string
  chartData?: number[]
}

export interface ChartData {
  [key: string]: any
}

export interface AnalyticsDashboardProps {
  /** KPI cards data */
  kpis?: KpiData[]
  /** Main chart data */
  chartData?: ChartData[]
  /** Chart type for main visualization */
  chartType?: 'area' | 'bar' | 'line' | 'pie'
  /** Data key for X-axis */
  xAxisKey?: string
  /** Data keys for Y-axis (series) */
  yAxisKeys?: string[]
  /** Chart height */
  chartHeight?: number
  /** Show legend */
  showLegend?: boolean
  /** Chart title */
  chartTitle?: string
  /** Chart description */
  chartDescription?: string
  /** Color scheme */
  colors?: string[]
  /** Loading state */
  loading?: boolean
  /** Error state */
  error?: string
  /** Custom class name */
  className?: string
  /** Card layout - grid or flex */
  layout?: 'grid' | 'flex'
  /** Show trend indicators */
  showTrends?: boolean
}

// Default colors
const defaultColors = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316'  // orange
]

// Utility functions for formatting
const formatters = {
  currency: (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value),
  percentage: (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value / 100),
  number: (value: number) =>
    new Intl.NumberFormat('en-US').format(value),
  compact: (value: number) =>
    new Intl.NumberFormat('en-US', {
      notation: 'compact',
      compactDisplay: 'short'
    }).format(value)
}

const formatValue = (value: number | string, format?: KpiData['format']): string => {
  if (typeof value === 'string') return value
  if (!format || format === 'number') return formatters.number(value)
  return formatters[format](value)
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  kpis = [],
  chartData = [],
  chartType = 'area',
  xAxisKey = 'name',
  yAxisKeys = ['value'],
  chartHeight = 400,
  showLegend = true,
  chartTitle = 'Analytics Overview',
  chartDescription,
  colors = defaultColors,
  loading = false,
  error,
  className,
  layout = 'grid',
  showTrends = true
}) => {
  // Prepare chart data
  const xAxisData = useMemo(() =>
    chartData.map(item => item[xAxisKey]),
    [chartData, xAxisKey]
  )

  const seriesData = useMemo(() =>
    yAxisKeys.map((key, index) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim(),
      data: chartData.map(item => item[key] || 0),
      color: colors[index % colors.length]
    })),
    [chartData, yAxisKeys, colors]
  )

  // For pie chart, prepare different data structure
  const pieData = useMemo(() => {
    if (chartType !== 'pie') return []
    return chartData.map((item, index) => ({
      name: item[xAxisKey],
      value: item[yAxisKeys[0]] || 0,
      color: colors[index % colors.length]
    }))
  }, [chartType, chartData, xAxisKey, yAxisKeys, colors])

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-64 text-destructive">
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* KPI Cards */}
      {kpis.length > 0 && (
        <div className={cn(
          layout === 'grid' ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-4' : 'flex flex-wrap gap-4'
        )}>
          {kpis.map((kpi, index) => {
            const IconComponent = kpi.icon || <TrendingUp className="h-4 w-4" />

            return (
              <StatCard
                key={index}
                title={kpi.title}
                value={formatValue(kpi.value, kpi.format)}
                change={showTrends ? kpi.change : undefined}
                changeLabel={kpi.description}
                icon={IconComponent}
                chartData={kpi.chartData}
                chartType="area"
                color={colors[index % colors.length]}
              />
            )
          })}
        </div>
      )}

      {/* Main Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{chartTitle}</CardTitle>
            {chartDescription && <CardDescription>{chartDescription}</CardDescription>}
          </CardHeader>
          <CardContent>
            <div style={{ height: chartHeight }}>
              {chartType === 'area' && (
                <AreaChart
                  data={seriesData}
                  xAxisData={xAxisData}
                  legend={showLegend}
                  loading={loading}
                  zoom={true}
                  className="h-full"
                />
              )}
              {chartType === 'line' && (
                <LineChart
                  data={seriesData}
                  xAxisData={xAxisData}
                  legend={showLegend}
                  loading={loading}
                  zoom={true}
                  className="h-full"
                />
              )}
              {chartType === 'bar' && (
                <BarChart
                  data={seriesData}
                  xAxisData={xAxisData}
                  legend={showLegend}
                  loading={loading}
                  className="h-full"
                />
              )}
              {chartType === 'pie' && (
                <PieChart
                  data={pieData}
                  legend={showLegend}
                  loading={loading}
                  className="h-full"
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

AnalyticsDashboard.displayName = 'AnalyticsDashboard'
