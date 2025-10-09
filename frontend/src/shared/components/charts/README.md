# ECharts Integration

A comprehensive charting library built on Apache ECharts for React, providing powerful, interactive, and customizable data visualizations.

## Features

- 🎨 **Multiple Chart Types**: Line, Bar, Pie, Area, Gauge, and more
- 📊 **Dashboard Widgets**: Pre-built stat cards and chart containers
- 🎯 **TypeScript Support**: Full type safety with TypeScript
- 🌈 **Customizable**: Extensive configuration options
- 📱 **Responsive**: Auto-resizing charts that work on all devices
- ⚡ **Performance**: Optimized rendering with ECharts
- 🎭 **Themes**: Support for custom themes
- 📦 **Tree-shakeable**: Import only what you need

## Installation

ECharts and echarts-for-react are already installed in this project.

```bash
npm install echarts echarts-for-react
```

## Available Components

### Chart Components

#### LineChart
Multi-line chart with smooth curves, data zoom, and tooltips.

```tsx
import { LineChart } from '@/shared/components/charts'

<LineChart
  data={[
    {
      name: 'Sales',
      data: [120, 200, 150, 80, 70, 110, 130],
      smooth: true,
      color: '#3b82f6'
    },
    {
      name: 'Revenue',
      data: [100, 180, 130, 90, 60, 100, 120],
      smooth: true,
      color: '#10b981'
    }
  ]}
  xAxisData={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
  title="Weekly Performance"
  legend={true}
  zoom={true}
/>
```

#### BarChart
Vertical or horizontal bar charts with stacking support.

```tsx
import { BarChart } from '@/shared/components/charts'

<BarChart
  data={[
    {
      name: 'Product A',
      data: [320, 302, 301, 334, 390, 330, 320],
      color: '#3b82f6'
    }
  ]}
  xAxisData={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
  title="Product Sales"
  horizontal={false}
  stack={false}
  showValues={true}
/>
```

#### PieChart
Pie, donut, and rose-type charts.

```tsx
import { PieChart } from '@/shared/components/charts'

<PieChart
  data={[
    { name: 'Desktop', value: 1048, color: '#3b82f6' },
    { name: 'Mobile', value: 735, color: '#10b981' },
    { name: 'Tablet', value: 580, color: '#f59e0b' }
  ]}
  title="Traffic Sources"
  donut={true}
  legend={true}
/>
```

#### AreaChart
Area charts with gradient fills.

```tsx
import { AreaChart } from '@/shared/components/charts'

<AreaChart
  data={[
    {
      name: 'Users',
      data: [140, 232, 101, 264, 290, 330, 310],
      smooth: true,
      color: '#8b5cf6'
    }
  ]}
  xAxisData={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
  title="User Growth"
/>
```

#### GaugeChart
Gauge/speedometer charts for metrics.

```tsx
import { GaugeChart } from '@/shared/components/charts'

<GaugeChart
  value={72}
  min={0}
  max={100}
  unit="%"
  title="CPU Usage"
  color={[
    [0.3, '#67e0e3'],
    [0.7, '#37a2da'],
    [1, '#fd666d']
  ]}
/>
```

### Widget Components

#### StatCard
Dashboard stat card with mini chart.

```tsx
import { StatCard } from '@/shared/components/charts'

<StatCard
  title="Total Revenue"
  value="$45,231.89"
  change={20.1}
  changeLabel="from last month"
  icon={<DollarSign className="h-4 w-4" />}
  chartData={[120, 200, 150, 80, 70, 110, 130]}
  chartType="area"
  color="#10b981"
/>
```

#### ChartCard
Container card for charts with header and footer.

```tsx
import { ChartCard } from '@/shared/components/charts'

<ChartCard
  title="Sales Overview"
  description="Monthly sales performance"
  headerAction={<Button>Export</Button>}
>
  <LineChart {...chartProps} />
</ChartCard>
```

### Complete Dashboard

#### AnalyticsDashboard
Full analytics dashboard with KPIs and charts.

```tsx
import { AnalyticsDashboard } from '@/shared/components/charts'

<AnalyticsDashboard
  kpis={[
    {
      title: 'Total Revenue',
      value: 45231.89,
      change: 20.1,
      format: 'currency',
      chartData: [120, 200, 150, 80, 70, 110, 130]
    },
    {
      title: 'Active Users',
      value: 2350,
      change: 15.3,
      format: 'number',
      chartData: [140, 232, 101, 264, 290, 330, 310]
    }
  ]}
  chartData={[
    { month: 'Jan', sales: 120, revenue: 1500 },
    { month: 'Feb', sales: 200, revenue: 2300 },
    { month: 'Mar', sales: 150, revenue: 1800 }
  ]}
  chartType="area"
  xAxisKey="month"
  yAxisKeys={['sales', 'revenue']}
  chartTitle="Sales & Revenue"
  showLegend={true}
/>
```

## Props Reference

### BaseChart Props
All chart components extend these base props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `option` | `EChartsOption` | required | ECharts configuration object |
| `loading` | `boolean` | `false` | Show loading state |
| `theme` | `string \| object` | - | Theme name or object |
| `renderer` | `'canvas' \| 'svg'` | `'canvas'` | Rendering mode |
| `className` | `string` | - | CSS class name |
| `style` | `React.CSSProperties` | - | Inline styles |
| `onChartReady` | `(chart: any) => void` | - | Callback when chart is ready |

### Chart-Specific Props

See individual component TypeScript types for complete prop definitions.

## Custom Hooks

### useECharts

Low-level hook for custom ECharts integration.

```tsx
import { useECharts } from '@/shared/components/charts'

const MyCustomChart = () => {
  const { chartRef, chartInstance, resize } = useECharts(option, {
    theme: 'dark',
    renderer: 'canvas'
  })

  return <div ref={chartRef} />
}
```

## Theming

ECharts supports custom themes. You can pass a theme name or object:

```tsx
<LineChart
  theme="dark"
  // or
  theme={{
    color: ['#3b82f6', '#10b981', '#f59e0b'],
    backgroundColor: '#1f2937'
  }}
  {...otherProps}
/>
```

## Performance Tips

1. **Use `useMemo`** for chart data to prevent unnecessary re-renders
2. **Enable data zoom** for large datasets
3. **Use `canvas` renderer** for better performance (default)
4. **Use `svg` renderer** for better image quality when exporting

## Migration from Recharts

If you're migrating from Recharts:

1. Replace Recharts imports with ECharts components
2. Update data structure to match ECharts format
3. Replace Recharts-specific props with ECharts equivalents
4. Test responsiveness and interactions

### Example Migration

**Before (Recharts):**
```tsx
<LineChart data={data}>
  <XAxis dataKey="name" />
  <YAxis />
  <CartesianGrid strokeDasharray="3 3" />
  <Tooltip />
  <Legend />
  <Line type="monotone" dataKey="value" stroke="#8884d8" />
</LineChart>
```

**After (ECharts):**
```tsx
<LineChart
  data={[{
    name: 'Value',
    data: data.map(d => d.value),
    smooth: true,
    color: '#8884d8'
  }]}
  xAxisData={data.map(d => d.name)}
  legend={true}
  tooltip={true}
/>
```

## Demo

See the complete demo at `/components/charts-demo/ChartsDemo.tsx` or view in Storybook:

```bash
npm run storybook
```

Navigate to `Charts > ChartsDemo` to see all components in action.

## Examples

### Dashboard Stats Row

```tsx
<div className="grid gap-4 md:grid-cols-4">
  <StatCard
    title="Total Revenue"
    value="$45,231.89"
    change={20.1}
    icon={<DollarSign />}
    chartData={[...]}
  />
  <StatCard
    title="Active Users"
    value="2,350"
    change={15.3}
    icon={<Users />}
    chartData={[...]}
  />
  // ... more stats
</div>
```

### Multi-Chart Dashboard

```tsx
<div className="grid gap-4 md:grid-cols-2">
  <ChartCard title="Sales Trend">
    <LineChart {...lineProps} />
  </ChartCard>
  <ChartCard title="Product Distribution">
    <PieChart {...pieProps} />
  </ChartCard>
</div>
```

## Resources

- [ECharts Documentation](https://echarts.apache.org/en/index.html)
- [ECharts Examples](https://echarts.apache.org/examples/en/index.html)
- [ECharts Configuration](https://echarts.apache.org/en/option.html)

## License

This component library uses Apache ECharts, which is licensed under the Apache License 2.0.
