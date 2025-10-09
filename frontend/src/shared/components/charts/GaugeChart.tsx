'use client'

/**
 * Gauge Chart Component
 * Reusable gauge/speedometer chart
 */
import React, { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import { BaseChart, BaseChartProps } from './BaseChart'

export interface GaugeChartProps extends Omit<BaseChartProps, 'option'> {
  value: number
  title?: string
  subtitle?: string
  min?: number
  max?: number
  unit?: string
  splitNumber?: number
  color?: [number, string][]
  radius?: string
  center?: [string, string]
}

export const GaugeChart: React.FC<GaugeChartProps> = ({
  value,
  title,
  subtitle,
  min = 0,
  max = 100,
  unit = '',
  splitNumber = 10,
  color,
  radius = '70%',
  center = ['50%', '55%'],
  ...baseProps
}) => {
  const option: EChartsOption = useMemo(() => ({
    title: title ? {
      text: title,
      subtext: subtitle,
      left: 'center',
      top: 10
    } : undefined,
    series: [
      {
        type: 'gauge',
        radius: radius,
        center: center,
        min: min,
        max: max,
        splitNumber: splitNumber,
        axisLine: {
          lineStyle: {
            width: 30,
            color: color || [
              [0.3, '#67e0e3'],
              [0.7, '#37a2da'],
              [1, '#fd666d']
            ]
          }
        },
        pointer: {
          itemStyle: {
            color: 'auto'
          }
        },
        axisTick: {
          distance: -30,
          length: 8,
          lineStyle: {
            color: '#fff',
            width: 2
          }
        },
        splitLine: {
          distance: -30,
          length: 30,
          lineStyle: {
            color: '#fff',
            width: 4
          }
        },
        axisLabel: {
          color: 'inherit',
          distance: 40,
          fontSize: 14
        },
        detail: {
          valueAnimation: true,
          formatter: `{value}${unit}`,
          color: 'inherit',
          fontSize: 18,
          offsetCenter: [0, '65%']
        },
        data: [
          {
            value: value
          }
        ]
      }
    ]
  }), [value, title, subtitle, min, max, unit, splitNumber, color, radius, center])

  return <BaseChart option={option} {...baseProps} />
}

GaugeChart.displayName = 'GaugeChart'
