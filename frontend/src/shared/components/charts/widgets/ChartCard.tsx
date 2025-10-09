'use client'

/**
 * Chart Card Widget
 * Dashboard card wrapper for charts
 */
import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { cn } from '@/shared/lib/utils'

export interface ChartCardProps {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
  headerAction?: React.ReactNode
  footer?: React.ReactNode
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  description,
  children,
  className,
  headerAction,
  footer
}) => {
  return (
    <Card className={cn('', className)}>
      {(title || description || headerAction) && (
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="space-y-1">
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {headerAction}
        </CardHeader>
      )}
      <CardContent className="pb-4">
        {children}
      </CardContent>
      {footer && (
        <div className="px-6 pb-4">
          {footer}
        </div>
      )}
    </Card>
  )
}

ChartCard.displayName = 'ChartCard'
