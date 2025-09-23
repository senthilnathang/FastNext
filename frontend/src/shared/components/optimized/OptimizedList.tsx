'use client'

import React, { memo, useMemo, useCallback, useState, useRef, useEffect } from 'react'
import { useVirtualScroll, useIntersectionObserver } from '@/shared/utils/performance'

// Virtualized list component for large datasets
interface OptimizedListProps<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  keyExtractor: (item: T, index: number) => string | number
  loadingComponent?: React.ReactNode
  emptyComponent?: React.ReactNode
  onEndReached?: () => void
  onEndReachedThreshold?: number
  className?: string
  overscan?: number
}

function OptimizedListInner<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  keyExtractor,
  loadingComponent,
  emptyComponent,
  onEndReached,
  onEndReachedThreshold = 0.8,
  className = '',
  overscan = 5
}: OptimizedListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isNearEnd, setIsNearEnd] = useState(false)

  const {
    totalHeight,
    handleScroll,
    startIndex,
    endIndex
  } = useVirtualScroll(items, itemHeight, containerHeight)

  // Add overscan items for smoother scrolling
  const overscanStart = Math.max(0, startIndex - overscan)
  const overscanEnd = Math.min(items.length, endIndex + overscan)
  const overscanItems = items.slice(overscanStart, overscanEnd)

  // Memoized rendered items to prevent unnecessary re-renders
  const renderedItems = useMemo(() => {
    return overscanItems.map((item, index) => {
      const actualIndex = overscanStart + index
      return (
        <div
          key={keyExtractor(item, actualIndex)}
          style={{
            height: itemHeight,
            position: 'absolute',
            top: actualIndex * itemHeight,
            left: 0,
            right: 0,
          }}
        >
          {renderItem(item, actualIndex)}
        </div>
      )
    })
  }, [overscanItems, overscanStart, itemHeight, renderItem, keyExtractor])

  // Handle infinite scrolling
  const optimizedHandleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    handleScroll(e)
    
    const element = e.currentTarget
    const scrollRatio = element.scrollTop / (element.scrollHeight - element.clientHeight)
    
    if (scrollRatio >= onEndReachedThreshold && !isNearEnd) {
      setIsNearEnd(true)
      onEndReached?.()
    } else if (scrollRatio < onEndReachedThreshold && isNearEnd) {
      setIsNearEnd(false)
    }
  }, [handleScroll, onEndReached, onEndReachedThreshold, isNearEnd])

  if (items.length === 0) {
    return emptyComponent || <div className="text-center p-4 text-gray-500">No items found</div>
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={optimizedHandleScroll}
    >
      <div
        style={{
          height: totalHeight,
          position: 'relative',
        }}
      >
        {renderedItems}
      </div>
      {isNearEnd && loadingComponent}
    </div>
  )
}

// Memoized version to prevent unnecessary re-renders
export const OptimizedList = memo(OptimizedListInner) as <T>(
  props: OptimizedListProps<T>
) => React.ReactElement

// Lazy loading wrapper component
interface LazyComponentProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  rootMargin?: string
  threshold?: number
  once?: boolean
}

export const LazyComponent = memo(({
  children,
  fallback = <div className="h-32 bg-gray-100 animate-pulse rounded" />,
  rootMargin = '50px',
  threshold = 0.1,
  once = true
}: LazyComponentProps) => {
  const [ref, isIntersecting] = useIntersectionObserver({
    rootMargin,
    threshold,
  })
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    if (isIntersecting && !hasLoaded) {
      setHasLoaded(true)
    }
  }, [isIntersecting, hasLoaded])

  const shouldRender = once ? hasLoaded : isIntersecting

  return (
    <div ref={ref}>
      {shouldRender ? children : fallback}
    </div>
  )
})

LazyComponent.displayName = 'LazyComponent'

// Optimized grid component for large datasets
interface OptimizedGridProps<T> {
  items: T[]
  itemWidth: number
  itemHeight: number
  containerWidth: number
  containerHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  keyExtractor: (item: T, index: number) => string | number
  gap?: number
  className?: string
}

export const OptimizedGrid = memo(<T,>({
  items,
  itemWidth,
  itemHeight,
  containerWidth,
  containerHeight,
  renderItem,
  keyExtractor,
  gap = 8,
  className = ''
}: OptimizedGridProps<T>) => {
  const [scrollTop, setScrollTop] = useState(0)
  
  const itemsPerRow = Math.floor((containerWidth + gap) / (itemWidth + gap))
  const rowHeight = itemHeight + gap
  const totalRows = Math.ceil(items.length / itemsPerRow)
  
  const startRow = Math.floor(scrollTop / rowHeight)
  const endRow = Math.min(
    startRow + Math.ceil(containerHeight / rowHeight) + 1,
    totalRows
  )
  
  const visibleItems = []
  
  for (let row = startRow; row < endRow; row++) {
    for (let col = 0; col < itemsPerRow; col++) {
      const index = row * itemsPerRow + col
      if (index < items.length) {
        visibleItems.push({
          item: items[index],
          index,
          x: col * (itemWidth + gap),
          y: row * rowHeight
        })
      }
    }
  }
  
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])
  
  return (
    <div
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight, width: containerWidth }}
      onScroll={handleScroll}
    >
      <div
        style={{
          height: totalRows * rowHeight,
          position: 'relative',
        }}
      >
        {visibleItems.map(({ item, index, x, y }) => (
          <div
            key={keyExtractor(item, index)}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: itemWidth,
              height: itemHeight,
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  )
})

OptimizedGrid.displayName = 'OptimizedGrid'

// Memoized table component for better performance
interface OptimizedTableProps<T> {
  data: T[]
  columns: Array<{
    key: keyof T
    header: string
    render?: (value: any, item: T, index: number) => React.ReactNode
    width?: string | number
    sortable?: boolean
  }>
  keyExtractor: (item: T, index: number) => string | number
  onSort?: (key: keyof T, direction: 'asc' | 'desc') => void
  sortKey?: keyof T
  sortDirection?: 'asc' | 'desc'
  className?: string
  rowClassName?: (item: T, index: number) => string
  onRowClick?: (item: T, index: number) => void
}

export const OptimizedTable = memo(<T,>({
  data,
  columns,
  keyExtractor,
  onSort,
  sortKey,
  sortDirection,
  className = '',
  rowClassName,
  onRowClick
}: OptimizedTableProps<T>) => {
  const handleSort = useCallback((key: keyof T) => {
    if (!onSort) return
    
    const newDirection = sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc'
    onSort(key, newDirection)
  }, [onSort, sortKey, sortDirection])

  const memoizedRows = useMemo(() => {
    return data.map((item, index) => (
      <tr
        key={keyExtractor(item, index)}
        className={`hover:bg-gray-50 ${rowClassName?.(item, index) || ''} ${
          onRowClick ? 'cursor-pointer' : ''
        }`}
        onClick={() => onRowClick?.(item, index)}
      >
        {columns.map((column) => (
          <td
            key={String(column.key)}
            className="px-4 py-2 border-b"
            style={{ width: column.width }}
          >
            {column.render
              ? column.render(item[column.key], item, index)
              : String(item[column.key] || '')
            }
          </td>
        ))}
      </tr>
    ))
  }, [data, columns, keyExtractor, rowClassName, onRowClick])

  return (
    <div className={`overflow-auto ${className}`}>
      <table className="w-full">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className={`px-4 py-2 text-left font-medium text-gray-900 ${
                  column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                }`}
                style={{ width: column.width }}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                <div className="flex items-center space-x-1">
                  <span>{column.header}</span>
                  {column.sortable && sortKey === column.key && (
                    <span className="text-xs">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {memoizedRows}
        </tbody>
      </table>
    </div>
  )
})

OptimizedTable.displayName = 'OptimizedTable'