/**
 * Custom hook for ECharts integration
 * Handles chart initialization, updates, and cleanup
 */
import { useEffect, useRef, useCallback } from 'react'
import * as echarts from 'echarts/core'
import type { EChartsOption } from 'echarts'
import type { EChartsType } from 'echarts/core'

// Import required ECharts components
import {
  LineChart,
  BarChart,
  PieChart,
  GaugeChart,
  ScatterChart,
  RadarChart,
  FunnelChart
} from 'echarts/charts'

import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  ToolboxComponent,
  MarkLineComponent,
  MarkPointComponent,
  MarkAreaComponent
} from 'echarts/components'

import { CanvasRenderer, SVGRenderer } from 'echarts/renderers'

// Register components
echarts.use([
  LineChart,
  BarChart,
  PieChart,
  GaugeChart,
  ScatterChart,
  RadarChart,
  FunnelChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  ToolboxComponent,
  MarkLineComponent,
  MarkPointComponent,
  MarkAreaComponent,
  CanvasRenderer,
  SVGRenderer
])

export interface UseEChartsOptions {
  theme?: string | object
  renderer?: 'canvas' | 'svg'
  devicePixelRatio?: number
  width?: number | string
  height?: number | string
  locale?: string
}

export function useECharts(
  option: EChartsOption,
  options?: UseEChartsOptions
) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<EChartsType | null>(null)

  // Initialize chart
  useEffect(() => {
    if (!chartRef.current) return

    // Create chart instance
    chartInstance.current = echarts.init(chartRef.current, options?.theme, {
      renderer: options?.renderer || 'canvas',
      devicePixelRatio: options?.devicePixelRatio,
      width: options?.width,
      height: options?.height,
      locale: options?.locale || 'EN'
    })

    return () => {
      chartInstance.current?.dispose()
      chartInstance.current = null
    }
  }, [options?.theme, options?.renderer, options?.devicePixelRatio, options?.width, options?.height, options?.locale])

  // Update chart option
  useEffect(() => {
    if (chartInstance.current && option) {
      chartInstance.current.setOption(option, true)
    }
  }, [option])

  // Handle resize
  const resize = useCallback(() => {
    chartInstance.current?.resize()
  }, [])

  // Handle window resize
  useEffect(() => {
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
    }
  }, [resize])

  return {
    chartRef,
    chartInstance: chartInstance.current,
    resize
  }
}
