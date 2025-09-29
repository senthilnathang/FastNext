'use client';

import React, { useMemo } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  Download,
  FileText,
  FileSpreadsheet,
  Code,
  Database,
  ChevronDown,
  Settings
} from 'lucide-react';

import { DataExport } from '../DataExport';
import { exportToCSV, exportToJSON, exportToExcel } from '../utils/exportUtils';
import type { ExportColumn, ExportFormat } from '../types';

interface DataTableExportProps<TData extends Record<string, any>> {
  data: TData[];
  columns: Array<{
    id: string;
    label: string;
    accessor?: string;
    type?: 'string' | 'number' | 'date' | 'boolean' | 'object';
  }>;
  selectedRows?: TData[];
  visibleColumns?: string[];
  tableName?: string;
  className?: string;
  showAdvanced?: boolean;
  allowedFormats?: ExportFormat[];
}

const formatIcons = {
  csv: FileText,
  json: Code,
  excel: FileSpreadsheet,
  xml: Database,
  yaml: FileText
};

export function DataTableExport<TData extends Record<string, any>>({
  data,
  columns,
  selectedRows = [],
  visibleColumns,
  tableName,
  className,
  showAdvanced = true,
  allowedFormats = ['csv', 'json', 'excel']
}: DataTableExportProps<TData>) {
  const exportColumns: ExportColumn[] = useMemo(() => {
    const filteredColumns = visibleColumns 
      ? columns.filter(col => visibleColumns.includes(col.id))
      : columns;

    return filteredColumns.map(col => ({
      key: col.accessor || col.id,
      label: col.label,
      type: col.type || 'string'
    }));
  }, [columns, visibleColumns]);

  const exportData = selectedRows.length > 0 ? selectedRows : data;
  const hasData = exportData.length > 0;
  const hasSelection = selectedRows.length > 0;

  const handleQuickExport = (format: ExportFormat) => {
    if (!hasData) return;

    const selectedColumns = exportColumns.map(col => col.key);
    const fileName = `${tableName || 'export'}_${Date.now()}.${format}`;
    
    const options = {
      format,
      columns: selectedColumns,
      filters: [],
      includeHeaders: true,
      fileName
    };

    switch (format) {
      case 'csv':
        exportToCSV(exportData, exportColumns, selectedColumns, options);
        break;
      case 'json':
        exportToJSON(exportData, exportColumns, selectedColumns, options);
        break;
      case 'excel':
        exportToExcel(exportData, exportColumns, selectedColumns, options);
        break;
    }
  };

  const quickExportFormats = allowedFormats.slice(0, 3); // Show max 3 formats in quick export

  if (!hasData) {
    return (
      <Button disabled size="sm" className={className}>
        <Download className="h-4 w-4 mr-2" />
        Export
      </Button>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Quick Export Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="h-8">
            <Download className="h-4 w-4 mr-2" />
            Export
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-2 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
            Quick Export
            {hasSelection && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {selectedRows.length} selected
              </Badge>
            )}
          </div>
          
          <DropdownMenuSeparator />
          
          {quickExportFormats.map(format => {
            const Icon = formatIcons[format];
            return (
              <DropdownMenuItem
                key={format}
                onClick={() => handleQuickExport(format)}
                className="flex items-center space-x-2"
              >
                <Icon className="h-4 w-4" />
                <span>Export as {format.toUpperCase()}</span>
              </DropdownMenuItem>
            );
          })}
          
          {showAdvanced && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <div className="w-full">
                  <DataExport
                    tableName={tableName}
                    columns={exportColumns}
                    data={exportData}
                    totalRows={exportData.length}
                    allowedFormats={allowedFormats}
                    embedded={false}
                    className="w-full"
                  />
                </div>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Export Stats */}
      <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
        <span>{exportData.length.toLocaleString()} rows</span>
        <span>•</span>
        <span>{exportColumns.length} columns</span>
      </div>
    </div>
  );
}

// Simplified export button for minimal UI
export function SimpleExportButton<TData extends Record<string, any>>({
  data,
  columns,
  selectedRows = [],
  visibleColumns,
  tableName,
  format = 'csv',
  className
}: DataTableExportProps<TData> & { format?: ExportFormat }) {
  const exportColumns: ExportColumn[] = useMemo(() => {
    const filteredColumns = visibleColumns 
      ? columns.filter(col => visibleColumns.includes(col.id))
      : columns;

    return filteredColumns.map(col => ({
      key: col.accessor || col.id,
      label: col.label,
      type: col.type || 'string'
    }));
  }, [columns, visibleColumns]);

  const exportData = selectedRows.length > 0 ? selectedRows : data;
  const hasData = exportData.length > 0;

  const handleExport = () => {
    if (!hasData) return;

    const selectedColumns = exportColumns.map(col => col.key);
    const fileName = `${tableName || 'export'}_${Date.now()}.${format}`;
    
    const options = {
      format,
      columns: selectedColumns,
      filters: [],
      includeHeaders: true,
      fileName
    };

    switch (format) {
      case 'csv':
        exportToCSV(exportData, exportColumns, selectedColumns, options);
        break;
      case 'json':
        exportToJSON(exportData, exportColumns, selectedColumns, options);
        break;
      case 'excel':
        exportToExcel(exportData, exportColumns, selectedColumns, options);
        break;
    }
  };

  const Icon = formatIcons[format];

  return (
    <Button 
      onClick={handleExport} 
      disabled={!hasData} 
      size="sm" 
      variant="outline"
      className={className}
    >
      <Icon className="h-4 w-4 mr-2" />
      Export {format.toUpperCase()}
    </Button>
  );
}