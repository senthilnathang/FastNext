'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  SortAsc,
  SortDesc,
  MoreVertical,
  Edit
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { cn } from '@/shared/utils';

export interface ListViewColumn<T = any> {
  key: string;
  title: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface ListViewAction<T = any> {
  key: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: (item: T) => void;
  variant?: 'default' | 'destructive' | 'secondary';
  show?: (item: T) => boolean;
}

export interface ListViewProps<T = any> {
  data: T[];
  columns: ListViewColumn<T>[];
  actions?: ListViewAction<T>[];
  loading?: boolean;
  searchable?: boolean;
  searchKey?: string;
  pageSize?: number;
  showPagination?: boolean;
  emptyMessage?: string;
  className?: string;
  variant?: 'table' | 'cards' | 'list';
  onItemClick?: (item: T) => void;
  renderItem?: (item: T, index: number) => React.ReactNode;
}

export function EnhancedListView<T extends Record<string, any>>({
  data,
  columns,
  actions = [],
  loading = false,
  searchable = true,
  searchKey = 'name',
  pageSize = 10,
  showPagination = true,
  emptyMessage = 'No data available',
  className,
  variant = 'table',
  onItemClick,
  renderItem
}: ListViewProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Filter and search data
  const filteredData = useMemo(() => {
    let filtered = data;

    if (searchTerm && searchKey) {
      filtered = filtered.filter(item => {
        const value = item[searchKey];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(searchTerm.toLowerCase());
        }
        return false;
      });
    }

    // Sort data
    if (sortKey) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];

        if (aVal === bVal) return 0;

        const comparison = aVal < bVal ? -1 : 1;
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [data, searchTerm, searchKey, sortKey, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const renderValue = (column: ListViewColumn<T>, item: T) => {
    const value = item[column.key];

    if (column.render) {
      return column.render(value, item);
    }

    if (typeof value === 'boolean') {
      return (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? 'Yes' : 'No'}
        </Badge>
      );
    }

    if (Array.isArray(value)) {
      return (
        <div className="flex gap-1 flex-wrap">
          {value.slice(0, 3).map((item, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {String(item)}
            </Badge>
          ))}
          {value.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{value.length - 3}
            </Badge>
          )}
        </div>
      );
    }

    if (value === null || value === undefined) {
      return <span className="text-gray-400">-</span>;
    }

    return String(value);
  };

  const renderActions = (item: T) => {
    const visibleActions = actions.filter(action =>
      !action.show || action.show(item)
    );

    if (visibleActions.length === 0) return null;

    if (visibleActions.length === 1) {
      const action = visibleActions[0];
      const Icon = action.icon || Edit;
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => action.onClick(item)}
          className={cn(
            'h-8 w-8 p-0',
            action.variant === 'destructive' && 'text-red-600 hover:text-red-700'
          )}
        >
          <Icon className="h-4 w-4" />
        </Button>
      );
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {visibleActions.map((action) => {
            const Icon = action.icon || Edit;
            return (
              <DropdownMenuItem
                key={action.key}
                onClick={() => action.onClick(item)}
                className={cn(
                  action.variant === 'destructive' && 'text-red-600 focus:text-red-700'
                )}
              >
                <Icon className="h-4 w-4 mr-2" />
                {action.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'cards' && renderItem) {
    return (
      <div className={cn('space-y-4', className)}>
        {searchable && (
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        )}

        <div className="grid gap-4">
          {paginatedData.map((item, index) => (
            <div key={index} onClick={() => onItemClick?.(item)}>
              {renderItem(item, index)}
            </div>
          ))}
        </div>

        {showPagination && totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {startIndex + 1} to {Math.min(startIndex + pageSize, filteredData.length)} of {filteredData.length} results
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      {searchable && (
        <CardHeader>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent className="p-0">
        {filteredData.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">{emptyMessage}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className={cn(
                        'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                        column.sortable && 'cursor-pointer hover:text-gray-700',
                        column.align === 'center' && 'text-center',
                        column.align === 'right' && 'text-right'
                      )}
                      style={{ width: column.width }}
                      onClick={() => column.sortable && handleSort(column.key)}
                    >
                      <div className="flex items-center space-x-1">
                        <span>{column.title}</span>
                        {column.sortable && (
                          <div className="flex flex-col">
                            <SortAsc className={cn(
                              'h-3 w-3',
                              sortKey === column.key && sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-400'
                            )} />
                            <SortDesc className={cn(
                              'h-3 w-3 -mt-1',
                              sortKey === column.key && sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-400'
                            )} />
                          </div>
                        )}
                      </div>
                    </th>
                  ))}
                  {actions.length > 0 && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedData.map((item, index) => (
                  <tr
                    key={index}
                    className={cn(
                      'hover:bg-gray-50 transition-colors',
                      onItemClick && 'cursor-pointer'
                    )}
                    onClick={() => onItemClick?.(item)}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={cn(
                          'px-6 py-4 whitespace-nowrap text-sm text-gray-900',
                          column.align === 'center' && 'text-center',
                          column.align === 'right' && 'text-right'
                        )}
                      >
                        {renderValue(column, item)}
                      </td>
                    ))}
                    {actions.length > 0 && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {renderActions(item)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showPagination && totalPages > 1 && (
          <div className="flex items-center justify-between p-6 border-t">
            <div className="text-sm text-gray-500">
              Showing {startIndex + 1} to {Math.min(startIndex + pageSize, filteredData.length)} of {filteredData.length} results
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
