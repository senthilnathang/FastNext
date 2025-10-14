"use client"

import * as React from "react"
import { Loader2, AlertCircle, RefreshCw } from "lucide-react"

import { cn } from "@/shared/utils"
import { Button } from "@/shared/components/ui/button"
import { useInfiniteScroll, useInfiniteData } from "@/shared/hooks/useInfiniteScroll"

interface InfiniteScrollListProps<T> {
  fetchFn: (page: number, pageSize: number) => Promise<{ data: T[]; hasMore: boolean; total?: number }>
  renderItem: (item: T, index: number) => React.ReactNode
  renderEmpty?: () => React.ReactNode
  renderError?: (error: string, retry: () => void) => React.ReactNode
  pageSize?: number
  className?: string
  itemClassName?: string
  loadingClassName?: string
  enabled?: boolean
  showStats?: boolean
}

export function InfiniteScrollList<T>({
  fetchFn,
  renderItem,
  renderEmpty,
  renderError,
  pageSize = 20,
  className,
  itemClassName,
  loadingClassName,
  enabled = true,
  showStats = true
}: InfiniteScrollListProps<T>) {
  const {
    data,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    error,
    reset,
    total,
    currentPage
  } = useInfiniteData<T>({
    fetchFn,
    pageSize,
    enabled
  })

  const { ref: loadMoreRef, isIntersecting } = useInfiniteScroll({
    hasNextPage,
    isFetching: isFetchingNextPage,
    fetchNextPage,
    threshold: 0.1,
    rootMargin: "100px"
  })

  const defaultRenderEmpty = () => (
    <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
      <div className="text-center">
        <p className="text-lg font-medium mb-2">No items found</p>
        <p className="text-sm">Check back later for new content</p>
      </div>
    </div>
  )

  const defaultRenderError = (errorMessage: string, retry: () => void) => (
    <div className="flex flex-col items-center justify-center py-12 text-red-600 dark:text-red-400">
      <AlertCircle className="h-12 w-12 mb-4" />
      <p className="text-lg font-medium mb-2">Failed to load data</p>
      <p className="text-sm mb-4 text-center max-w-md">{errorMessage}</p>
      <Button onClick={retry} variant="outline" size="sm">
        <RefreshCw className="h-4 w-4 mr-2" />
        Retry
      </Button>
    </div>
  )

  if (error && data.length === 0) {
    return (
      <div className={className}>
        {renderError ? renderError(error, reset) : defaultRenderError(error, reset)}
      </div>
    )
  }

  if (!isFetching && data.length === 0) {
    return (
      <div className={className}>
        {renderEmpty ? renderEmpty() : defaultRenderEmpty()}
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Stats */}
      {showStats && (
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>
            Showing {data.length.toLocaleString()}
            {total !== undefined && ` of ${total.toLocaleString()}`} items
          </span>
          {currentPage > 0 && (
            <span>
              Page {currentPage + 1}
            </span>
          )}
        </div>
      )}

      {/* Initial Loading */}
      {isFetching && data.length === 0 && (
        <div className={cn(
          "flex items-center justify-center py-12",
          loadingClassName
        )}>
          <Loader2 className="h-8 w-8 animate-spin mr-3" />
          <span>Loading...</span>
        </div>
      )}

      {/* Items */}
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className={itemClassName}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>

      {/* Load More Trigger */}
      {hasNextPage && (
        <div
          ref={loadMoreRef}
          className="flex items-center justify-center py-8"
        >
          {isFetchingNextPage ? (
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span>Loading more...</span>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={fetchNextPage}
              disabled={isFetchingNextPage}
            >
              Load More
            </Button>
          )}
        </div>
      )}

      {/* End Message */}
      {!hasNextPage && data.length > 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p className="text-sm">
            {total !== undefined
              ? `All ${total.toLocaleString()} items loaded`
              : "No more items to load"
            }
          </p>
        </div>
      )}

      {/* Error during pagination */}
      {error && data.length > 0 && (
        <div className="text-center py-4">
          <div className="inline-flex items-center space-x-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Failed to load more items</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchNextPage}
              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Debug Info (Development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-400 dark:text-gray-600 border-t pt-4 mt-8">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>Debug Info:</strong><br />
              Items: {data.length}<br />
              Has Next: {hasNextPage.toString()}<br />
              Fetching: {isFetching.toString()}
            </div>
            <div>
              Fetching Next: {isFetchingNextPage.toString()}<br />
              Page: {currentPage + 1}<br />
              Intersecting: {isIntersecting.toString()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InfiniteScrollList
