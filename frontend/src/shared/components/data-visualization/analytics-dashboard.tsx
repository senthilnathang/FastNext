'use client';

import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  DollarSign,
  Eye,
  TrendingUp,
  Users,
} from 'lucide-react';
import { forwardRef, useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { cn } from '@/shared/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

export interface KpiData {
  title: string;
  value: number | string;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  format?: 'currency' | 'percentage' | 'number' | 'compact';
  icon?: React.ReactNode;
  description?: string;
}

export interface ChartData {
  [key: string]: any;
}

export interface AnalyticsDashboardProps {
  /** KPI cards data */
  kpis?: KpiData[];
  /** Main chart data */
  chartData?: ChartData[];
  /** Chart type for main visualization */
  chartType?: 'area' | 'bar' | 'line' | 'pie';
  /** Data key for X-axis */
  xAxisKey?: string;
  /** Data keys for Y-axis */
  yAxisKeys?: string[];
  /** Chart height */
  chartHeight?: number;
  /** Show legend */
  showLegend?: boolean;
  /** Show grid */
  showGrid?: boolean;
  /** Color scheme */
  colors?: string[];
  /** Loading state */
  loading?: boolean;
  /** Error state */
  error?: string;
  /** Custom class name */
  className?: string;
  /** Card layout - grid or flex */
  layout?: 'grid' | 'flex';
  /** Show trend indicators */
  showTrends?: boolean;
}

// Default colors
const defaultColors = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--accent))',
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7300',
  '#00ff00',
];

// Utility functions for formatting
const formatters = {
  currency: (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value),
  percentage: (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    }).format(value),
  number: (value: number) =>
    new Intl.NumberFormat('en-US').format(value),
  compactNumber: (value: number) =>
    new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value),
};

// KPI Card Component
function KpiCard({
  kpi,
  showTrends = true,
}: {
  kpi: KpiData;
  showTrends?: boolean;
}) {
  const formatValue = (value: number | string, format?: string) => {
    if (typeof value === 'string') return value;

    switch (format) {
      case 'currency':
        return formatters.currency(value);
      case 'percentage':
        return formatters.percentage(value);
      case 'compact':
        return formatters.compactNumber(value);
      default:
        return formatters.number(value);
    }
  };

  const getChangeIcon = (changeType?: string) => {
    switch (changeType) {
      case 'increase':
        return <ArrowUp className="h-4 w-4 text-green-600" />;
      case 'decrease':
        return <ArrowDown className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getChangeColor = (changeType?: string) => {
    switch (changeType) {
      case 'increase':
        return 'text-green-600';
      case 'decrease':
        return 'text-red-600';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
        {kpi.icon && (
          <div className="h-4 w-4 text-muted-foreground">{kpi.icon}</div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {formatValue(kpi.value, kpi.format)}
        </div>
        {showTrends && kpi.change !== undefined && (
          <div className="flex items-center text-xs mt-1">
            {getChangeIcon(kpi.changeType)}
            <span className={cn('ml-1', getChangeColor(kpi.changeType))}>
              {formatters.percentage(Math.abs(kpi.change))} from last period
            </span>
          </div>
        )}
        {kpi.description && (
          <p className="text-xs text-muted-foreground mt-1">
            {kpi.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Chart Component
function ChartComponent({
  data,
  type,
  xAxisKey,
  yAxisKeys,
  height,
  showLegend,
  showGrid,
  colors,
}: {
  data: ChartData[];
  type: string;
  xAxisKey: string;
  yAxisKeys: string[];
  height: number;
  showLegend: boolean;
  showGrid: boolean;
  colors: string[];
}) {
  const commonProps = {
    data,
    margin: { top: 5, right: 30, left: 20, bottom: 5 },
  };

  const renderChart = () => {
    switch (type) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey={xAxisKey} />
            <YAxis />
            <Tooltip />
            {showLegend && <Legend />}
            {yAxisKeys.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stackId="1"
                stroke={colors[index % colors.length]}
                fill={colors[index % colors.length]}
                fillOpacity={0.6}
              />
            ))}
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey={xAxisKey} />
            <YAxis />
            <Tooltip />
            {showLegend && <Legend />}
            {yAxisKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={colors[index % colors.length]}
              />
            ))}
          </BarChart>
        );

      case 'line':
        return (
          <LineChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey={xAxisKey} />
            <YAxis />
            <Tooltip />
            {showLegend && <Legend />}
            {yAxisKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        );

      case 'pie': {
        const pieData = data.map((item, index) => ({
          ...item,
          fill: colors[index % colors.length],
        }));

        return (
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey={yAxisKeys[0]}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip />
            {showLegend && <Legend />}
          </PieChart>
        );
      }

      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-muted-foreground mb-2">Invalid chart type</div>
              <div className="text-sm text-muted-foreground">
                Please select a valid chart type: area, bar, line, or pie
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      {renderChart()}
    </ResponsiveContainer>
  );
}

const AnalyticsDashboard = forwardRef<HTMLDivElement, AnalyticsDashboardProps>(
  (
    {
      kpis = [],
      chartData = [],
      chartType = 'area',
      xAxisKey = 'date',
      yAxisKeys = ['value'],
      chartHeight = 300,
      showLegend = true,
      showGrid = true,
      colors = defaultColors,
      loading = false,
      error,
      className,
      layout = 'grid',
      showTrends = true,
      ...props
    },
    ref
  ) => {
    // Default KPI data if none provided
    const defaultKpis: KpiData[] = useMemo(
      () => [
        {
          title: 'Total Users',
          value: 2540,
          change: 0.12,
          changeType: 'increase' as const,
          format: 'compact' as const,
          icon: <Users className="h-4 w-4" />,
          description: 'Active users this month',
        },
        {
          title: 'Revenue',
          value: 45200,
          change: 0.08,
          changeType: 'increase' as const,
          format: 'currency' as const,
          icon: <DollarSign className="h-4 w-4" />,
          description: 'Monthly recurring revenue',
        },
        {
          title: 'Conversion Rate',
          value: 0.032,
          change: -0.004,
          changeType: 'decrease' as const,
          format: 'percentage' as const,
          icon: <BarChart3 className="h-4 w-4" />,
          description: 'Visitor to customer conversion',
        },
        {
          title: 'Page Views',
          value: 125000,
          change: 0.15,
          changeType: 'increase' as const,
          format: 'compact' as const,
          icon: <Eye className="h-4 w-4" />,
          description: 'Total page views this week',
        },
      ],
      []
    );

    // Default chart data if none provided
    const defaultChartData = useMemo(
      () => [
        { date: '2024-01', users: 1200, revenue: 35000, views: 95000 },
        { date: '2024-02', users: 1350, revenue: 38000, views: 105000 },
        { date: '2024-03', users: 1580, revenue: 42000, views: 115000 },
        { date: '2024-04', users: 1820, revenue: 39000, views: 108000 },
        { date: '2024-05', users: 2100, revenue: 45000, views: 125000 },
        { date: '2024-06', users: 2540, revenue: 45200, views: 125000 },
      ],
      []
    );

    const displayKpis = kpis.length > 0 ? kpis : defaultKpis;
    const displayChartData =
      chartData.length > 0 ? chartData : defaultChartData;

    if (loading) {
      return (
        <div ref={ref} className={cn('space-y-6', className)} {...props}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index}>
                <CardHeader className="space-y-0 pb-2">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-muted rounded animate-pulse mb-2" />
                  <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <div className="h-6 bg-muted rounded animate-pulse w-1/3" />
            </CardHeader>
            <CardContent>
              <div className="h-[300px] bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        </div>
      );
    }

    if (error) {
      return (
        <div ref={ref} className={cn('space-y-6', className)} {...props}>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-destructive mb-2">
                  Error loading dashboard
                </div>
                <div className="text-sm text-muted-foreground">{error}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    const kpiGridClasses =
      layout === 'grid'
        ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-4'
        : 'flex flex-wrap gap-4';

    return (
      <div ref={ref} className={cn('space-y-6', className)} {...props}>
        {/* KPI Cards */}
        {displayKpis.length > 0 && (
          <div className={kpiGridClasses}>
            {displayKpis.map((kpi, index) => (
              <KpiCard key={index} kpi={kpi} showTrends={showTrends} />
            ))}
          </div>
        )}

        {/* Main Chart */}
        {displayChartData.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Analytics Overview
                </CardTitle>
                <CardDescription>Performance metrics over time</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <ChartComponent
                data={displayChartData}
                type={chartType}
                xAxisKey={xAxisKey}
                yAxisKeys={yAxisKeys}
                height={chartHeight}
                showLegend={showLegend}
                showGrid={showGrid}
                colors={colors}
              />
            </CardContent>
          </Card>
        )}
      </div>
    );
  }
);

AnalyticsDashboard.displayName = 'AnalyticsDashboard';

export { AnalyticsDashboard };
