"use client"

import * as React from "react"
import { cn } from "@/shared/utils"

interface ResponsiveDashboardProps {
  children: React.ReactNode
  className?: string
  gap?: 'sm' | 'md' | 'lg'
  columns?: {
    mobile: number
    tablet: number
    desktop: number
    wide: number
  }
}

interface ResponsiveWidgetProps {
  children: React.ReactNode
  className?: string
  span?: {
    mobile?: number
    tablet?: number
    desktop?: number
    wide?: number
  }
  priority?: 'high' | 'medium' | 'low' // For mobile stacking order
}

const defaultColumns = {
  mobile: 1,
  tablet: 2,
  desktop: 3,
  wide: 4
}

const gapClasses = {
  sm: 'gap-3',
  md: 'gap-4 md:gap-6',
  lg: 'gap-6 md:gap-8'
}

export function ResponsiveDashboard({
  children,
  className,
  gap = 'md',
  columns = defaultColumns
}: ResponsiveDashboardProps) {
  const gridClasses = cn(
    "grid w-full",
    gapClasses[gap],
    // Mobile (always single column for now, can be customized)
    "grid-cols-1",
    // Tablet
    `sm:grid-cols-${columns.tablet}`,
    // Desktop
    `lg:grid-cols-${columns.desktop}`,
    // Wide screens
    `xl:grid-cols-${columns.wide}`,
    className
  )

  return (
    <div className={gridClasses}>
      {children}
    </div>
  )
}

export function ResponsiveWidget({
  children,
  className,
  span = {},
  priority = 'medium'
}: ResponsiveWidgetProps) {
  const {
    mobile = 1,
    tablet = 1,
    desktop = 1,
    wide = 1
  } = span

  const spanClasses = cn(
    // Mobile span
    mobile > 1 && `col-span-${mobile}`,
    // Tablet span
    tablet > 1 && `sm:col-span-${tablet}`,
    // Desktop span
    desktop > 1 && `lg:col-span-${desktop}`,
    // Wide span
    wide > 1 && `xl:col-span-${wide}`,
    // Priority-based ordering for mobile
    priority === 'high' && 'order-1',
    priority === 'medium' && 'order-2',
    priority === 'low' && 'order-3',
    // Reset order for larger screens
    'sm:order-none',
    className
  )

  return (
    <div className={spanClasses}>
      {children}
    </div>
  )
}

// Pre-configured dashboard layouts
export function TwoColumnDashboard({
  leftColumn,
  rightColumn,
  className,
  gap = 'md'
}: {
  leftColumn: React.ReactNode
  rightColumn: React.ReactNode
  className?: string
  gap?: 'sm' | 'md' | 'lg'
}) {
  return (
    <div className={cn(
      "grid grid-cols-1 lg:grid-cols-3",
      gapClasses[gap],
      className
    )}>
      <div className="lg:col-span-2 space-y-4">
        {leftColumn}
      </div>
      <div className="space-y-4">
        {rightColumn}
      </div>
    </div>
  )
}

export function ThreeColumnDashboard({
  leftColumn,
  centerColumn,
  rightColumn,
  className,
  gap = 'md'
}: {
  leftColumn: React.ReactNode
  centerColumn: React.ReactNode
  rightColumn: React.ReactNode
  className?: string
  gap?: 'sm' | 'md' | 'lg'
}) {
  return (
    <div className={cn(
      "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4",
      gapClasses[gap],
      className
    )}>
      <div className="space-y-4">
        {leftColumn}
      </div>
      <div className="md:col-span-1 xl:col-span-2 space-y-4">
        {centerColumn}
      </div>
      <div className="space-y-4">
        {rightColumn}
      </div>
    </div>
  )
}

// Widget size presets
export function FullWidthWidget({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <ResponsiveWidget
      span={{ mobile: 1, tablet: 2, desktop: 3, wide: 4 }}
      className={className}
    >
      {children}
    </ResponsiveWidget>
  )
}

export function HalfWidthWidget({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <ResponsiveWidget
      span={{ mobile: 1, tablet: 1, desktop: 1, wide: 2 }}
      className={className}
    >
      {children}
    </ResponsiveWidget>
  )
}

export function QuarterWidthWidget({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <ResponsiveWidget
      span={{ mobile: 1, tablet: 1, desktop: 1, wide: 1 }}
      className={className}
    >
      {children}
    </ResponsiveWidget>
  )
}

// Hook for responsive breakpoint detection
export function useResponsiveBreakpoint() {
  const [breakpoint, setBreakpoint] = React.useState<'mobile' | 'tablet' | 'desktop' | 'wide'>('mobile')

  React.useEffect(() => {
    const checkBreakpoint = () => {
      const width = window.innerWidth
      if (width >= 1280) {
        setBreakpoint('wide')
      } else if (width >= 1024) {
        setBreakpoint('desktop')
      } else if (width >= 640) {
        setBreakpoint('tablet')
      } else {
        setBreakpoint('mobile')
      }
    }

    checkBreakpoint()
    window.addEventListener('resize', checkBreakpoint)
    return () => window.removeEventListener('resize', checkBreakpoint)
  }, [])

  return {
    breakpoint,
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop',
    isWide: breakpoint === 'wide',
    isMobileOrTablet: breakpoint === 'mobile' || breakpoint === 'tablet'
  }
}

export default ResponsiveDashboard
