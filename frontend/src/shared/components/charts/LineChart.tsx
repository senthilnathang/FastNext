'use client'

/**
 * Line Chart Component
 * Reusable line chart with common configurations
 */
import React, { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import { BaseChart, BaseChartProps } from './BaseChart'

export interface LineChartData {
  name: string
  data: number[]
  smooth?: boolean
  areaStyle?: boolean
  color?: string
}

export interface LineChartProps extends Omit<BaseChartProps, 'option'> {
  data: LineChartData[]
  xAxisData: string[]
  title?: string
  subtitle?: string
  legend?: boolean
  grid?: {
    top?: number | string
    right?: number | string
    bottom?: number | string
    left?: number | string
  }
  yAxis?: {
    name?: string
    min?: number | 'dataMin'
    max?: number | 'dataMax'
  }
  tooltip?: boolean
  zoom?: boolean
  stack?: boolean
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  xAxisData,
  title,
  subtitle,
  legend = true,
  grid,
  yAxis,
  tooltip = true,
  zoom = false,
  stack = false,
  ...baseProps
}) => {
  const option: EChartsOption = useMemo(() => ({
    title: title ? {
      text: title,
      subtext: subtitle,
      left: 'center'
    } : undefined,
    tooltip: tooltip ? {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: '#6a7985'
        }
      }
    } : undefined,
    legend: legend ? {
      data: data.map(d => d.name),
      top: title ? 40 : 10,
      left: 'center'
    } : undefined,
    grid: {
      top: grid?.top || (title ? 80 : legend ? 50 : 20),
      right: grid?.right || 20,
      bottom: grid?.bottom || (zoom ? 80 : 30),
      left: grid?.left || 50,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: xAxisData
    },
    yAxis: {
      type: 'value',
      name: yAxis?.name,
      min: yAxis?.min,
      max: yAxis?.max
    },
    dataZoom: zoom ? [
      {
        type: 'inside',
        start: 0,
        end: 100
      },
      {
        start: 0,
        end: 100
      }
    ] : undefined,
    series: data.map(series => ({
      name: series.name,
      type: 'line',
      smooth: series.smooth !== false,
      data: series.data,
      areaStyle: series.areaStyle ? {} : undefined,
      itemStyle: series.color ? { color: series.color } : undefined,
      stack: stack ? 'Total' : undefined
    }))
  }), [data, xAxisData, title, subtitle, legend, grid, yAxis, tooltip, zoom, stack])

  return <BaseChart option={option} {...baseProps} />
}

LineChart.displayName = 'LineChart'
