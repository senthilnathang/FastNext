'use client'

/**
 * Stat Card Widget
 * Dashboard card with metric and mini chart
 */
import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { LineChart } from '../LineChart'
import { AreaChart } from '../AreaChart'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

export interface StatCardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon?: React.ReactNode
  chartData?: number[]
  chartType?: 'line' | 'area'
  color?: string
  className?: string
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  changeLabel,
  icon,
  chartData,
  chartType = 'area',
  color = '#3b82f6',
  className
}) => {
  const isPositive = change && change > 0
  const isNegative = change && change < 0
  const isNeutral = change === 0

  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus

  return (
    <Card className={cn('', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="h-4 w-4 text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            <TrendIcon
              className={cn(
                'h-3 w-3 mr-1',
                isPositive && 'text-green-500',
                isNegative && 'text-red-500',
                isNeutral && 'text-gray-500'
              )}
            />
            <span
              className={cn(
                isPositive && 'text-green-600',
                isNegative && 'text-red-600'
              )}
            >
              {change > 0 && '+'}{change}%
            </span>
            {changeLabel && <span className="ml-1">{changeLabel}</span>}
          </div>
        )}
        {chartData && chartData.length > 0 && (
          <div className="mt-4 h-[60px]">
            {chartType === 'area' ? (
              <AreaChart
                data={[{
                  name: title,
                  data: chartData,
                  smooth: true,
                  color: color
                }]}
                xAxisData={chartData.map((_, i) => String(i))}
                legend={false}
                tooltip={false}
                grid={{
                  top: 5,
                  right: 0,
                  bottom: 0,
                  left: 0
                }}
                className="h-full"
              />
            ) : (
              <LineChart
                data={[{
                  name: title,
                  data: chartData,
                  smooth: true,
                  color: color
                }]}
                xAxisData={chartData.map((_, i) => String(i))}
                legend={false}
                tooltip={false}
                grid={{
                  top: 5,
                  right: 0,
                  bottom: 0,
                  left: 0
                }}
                className="h-full"
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

StatCard.displayName = 'StatCard'
