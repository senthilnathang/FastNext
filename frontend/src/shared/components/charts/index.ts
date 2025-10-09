/**
 * ECharts Components Export
 * Central export for all chart components
 */

// Base components
export { BaseChart } from './BaseChart'
export type { BaseChartProps } from './BaseChart'

// Chart types
export { LineChart } from './LineChart'
export type { LineChartProps, LineChartData } from './LineChart'

export { BarChart } from './BarChart'
export type { BarChartProps, BarChartData } from './BarChart'

export { PieChart } from './PieChart'
export type { PieChartProps, PieChartData } from './PieChart'

export { AreaChart } from './AreaChart'
export type { AreaChartProps } from './AreaChart'

export { GaugeChart } from './GaugeChart'
export type { GaugeChartProps } from './GaugeChart'

// Widgets
export { StatCard } from './widgets/StatCard'
export type { StatCardProps } from './widgets/StatCard'

export { ChartCard } from './widgets/ChartCard'
export type { ChartCardProps } from './widgets/ChartCard'

// Hooks
export { useECharts } from './hooks/useECharts'
export type { UseEChartsOptions } from './hooks/useECharts'

// Dashboard
export { AnalyticsDashboard } from './AnalyticsDashboard'
export type { AnalyticsDashboardProps, KpiData, ChartData } from './AnalyticsDashboard'
