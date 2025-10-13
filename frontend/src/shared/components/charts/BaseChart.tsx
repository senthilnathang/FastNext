'use client'

/**
 * Base Chart Component
 * Wrapper around ECharts with common functionality
 */
import React, { useEffect } from 'react'
import type { EChartsOption } from 'echarts'
import { useECharts } from './hooks/useECharts'
import { cn } from '@/shared/lib/utils'

export interface BaseChartProps {
  option: EChartsOption
  className?: string
  style?: React.CSSProperties
  loading?: boolean
  theme?: string | object
  renderer?: 'canvas' | 'svg'
  onChartReady?: (chart: any) => void
}

export const BaseChart: React.FC<BaseChartProps> = ({
  option,
  className,
  style,
  loading = false,
  theme,
  renderer = 'canvas',
  onChartReady
}) => {
  const { chartRef, chartInstance } = useECharts(option, {
    theme,
    renderer
  })

  // Show/hide loading
  useEffect(() => {
    if (chartInstance) {
      if (loading) {
        chartInstance.showLoading()
      } else {
        chartInstance.hideLoading()
      }
    }
  }, [loading, chartInstance])

  // Call onChartReady when chart is ready
  useEffect(() => {
    if (chartInstance && onChartReady) {
      onChartReady(chartInstance)
    }
  }, [chartInstance, onChartReady])

  return (
    <div
      ref={chartRef}
      className={cn('w-full h-full', className)}
      style={style}
    />
  )
}

BaseChart.displayName = 'BaseChart'
