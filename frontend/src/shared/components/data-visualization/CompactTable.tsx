'use client';

import React from 'react';
import { cn } from '@/shared/utils';

interface Column<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  render?: (item: T, value: any) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
}

interface CompactTableProps<T> {
  data: T[];
  columns: Column<T>[];
  className?: string;
  size?: 'xs' | 'sm' | 'md';
  striped?: boolean;
  hover?: boolean;
  bordered?: boolean;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
}

export default function CompactTable<T extends Record<string, any>>({
  data,
  columns,
  className,
  size = 'sm',
  striped = true,
  hover = true,
  bordered = false,
  onRowClick,
  emptyMessage = 'No data available'
}: CompactTableProps<T>) {
  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base'
  };

  const getCellValue = (item: T, column: Column<T>) => {
    const value = typeof column.key === 'string'
      ? item[column.key as keyof T]
      : item[column.key];

    return column.render ? column.render(item, value) : value;
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn('overflow-auto', className)}>
      <table className={cn(
        'w-full',
        sizeClasses[size],
        bordered && 'border border-gray-200 dark:border-gray-700'
      )}>
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
            {columns.map((column, index) => (
              <th
                key={index}
                className={cn(
                  'font-medium text-gray-900 dark:text-gray-100',
                  size === 'xs' ? 'px-2 py-1.5' : 'px-3 py-2',
                  column.align === 'center' && 'text-center',
                  column.align === 'right' && 'text-right',
                  column.sortable && 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
                style={{ width: column.width }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, rowIndex) => (
            <tr
              key={rowIndex}
              className={cn(
                'border-b border-gray-200 dark:border-gray-700 last:border-b-0',
                striped && rowIndex % 2 === 1 && 'bg-gray-50/50 dark:bg-gray-800/25',
                hover && 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
                onRowClick && 'cursor-pointer',
                'transition-colors duration-150'
              )}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((column, colIndex) => (
                <td
                  key={colIndex}
                  className={cn(
                    'text-gray-700 dark:text-gray-300',
                    size === 'xs' ? 'px-2 py-1.5' : 'px-3 py-2',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right'
                  )}
                >
                  {getCellValue(item, column)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
