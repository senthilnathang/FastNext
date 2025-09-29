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
  Upload,
  FileText,
  FileSpreadsheet,
  Code,
  Database,
  ChevronDown,
  Settings,
  Users
} from 'lucide-react';

import { DataImport } from '../DataImport';
import type { ImportColumn, ImportFormat, ImportPermission } from '../types';

interface DataTableImportProps<TData extends Record<string, any>> {
  tableName?: string;
  columns: Array<{
    id: string;
    label: string;
    type?: 'string' | 'number' | 'date' | 'boolean' | 'object' | 'email' | 'url';
    required?: boolean;
    unique?: boolean;
  }>;
  onImport?: (data: Record<string, any>[], options: any) => Promise<any>;
  onValidate?: (data: Record<string, any>[], mappings: any[]) => Promise<any>;
  permissions?: ImportPermission;
  className?: string;
  showAdvanced?: boolean;
  allowedFormats?: ImportFormat[];
  maxFileSize?: number;
  maxRows?: number;
}

const formatIcons = {
  csv: FileText,
  json: Code,
  excel: FileSpreadsheet,
  xml: Database
};

export function DataTableImport<TData extends Record<string, any>>({
  tableName,
  columns,
  onImport,
  onValidate,
  permissions,
  className,
  showAdvanced = true,
  allowedFormats = ['csv', 'json', 'excel', 'xml'],
  maxFileSize = 10 * 1024 * 1024, // 10MB
  maxRows = 10000
}: DataTableImportProps<TData>) {
  const importColumns: ImportColumn[] = useMemo(() => {
    return columns.map(col => ({
      key: col.id,
      label: col.label,
      type: col.type || 'string',
      required: col.required,
      unique: col.unique
    }));
  }, [columns]);

  const canImport = permissions?.canImport ?? true;
  const needsApproval = permissions?.requireApproval ?? false;
  const allowedFormatsFiltered = permissions?.allowedFormats || allowedFormats;

  const handleQuickImport = (format: ImportFormat) => {
    // This would open a simplified import dialog for the specific format
    console.log(`Quick import for format: ${format}`);
  };

  if (!canImport) {
    return (
      <Button disabled size="sm" className={className} title="You don't have permission to import data">
        <Upload className="h-4 w-4 mr-2" />
        Import
      </Button>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Quick Import Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="h-8">
            <Upload className="h-4 w-4 mr-2" />
            Import
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-2 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
            Quick Import
            {needsApproval && (
              <Badge variant="outline" className="ml-2 text-xs">
                Requires Approval
              </Badge>
            )}
          </div>
          
          <DropdownMenuSeparator />
          
          {allowedFormatsFiltered.slice(0, 3).map(format => {
            const Icon = formatIcons[format];
            return (
              <DropdownMenuItem
                key={format}
                onClick={() => handleQuickImport(format)}
                className="flex items-center space-x-2"
              >
                <Icon className="h-4 w-4" />
                <span>Import {format.toUpperCase()}</span>
              </DropdownMenuItem>
            );
          })}
          
          {showAdvanced && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <div className="w-full">
                  <DataImport
                    tableName={tableName}
                    columns={importColumns}
                    onImport={onImport}
                    onValidate={onValidate}
                    maxFileSize={permissions?.maxFileSize || maxFileSize}
                    maxRows={permissions?.maxRows || maxRows}
                    allowedFormats={allowedFormatsFiltered}
                    permissions={permissions}
                    embedded={false}
                    className="w-full"
                  />
                </div>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Import Stats */}
      <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
        <span>{columns.length} columns</span>
        {needsApproval && (
          <>
            <span>•</span>
            <span>needs approval</span>
          </>
        )}
      </div>
    </div>
  );
}

// Simplified import button for minimal UI
export function SimpleImportButton<TData extends Record<string, any>>({
  tableName,
  columns,
  onImport,
  format = 'csv',
  permissions,
  className
}: DataTableImportProps<TData> & { format?: ImportFormat }) {
  const importColumns: ImportColumn[] = useMemo(() => {
    return columns.map(col => ({
      key: col.id,
      label: col.label,
      type: col.type || 'string',
      required: col.required,
      unique: col.unique
    }));
  }, [columns]);

  const canImport = permissions?.canImport ?? true;
  const Icon = formatIcons[format];

  return (
    <DataImport
      tableName={tableName}
      columns={importColumns}
      onImport={onImport}
      allowedFormats={[format]}
      permissions={permissions}
      embedded={false}
      className={className}
    />
  );
}

// Integration component for React Table
export function DataTableIntegration<TData extends Record<string, any>>({
  table,
  tableName,
  onImport,
  permissions,
  allowedFormats = ['csv', 'json', 'excel'],
  className
}: {
  table: any; // React Table instance
  tableName?: string;
  onImport?: (data: Record<string, any>[], options: any) => Promise<any>;
  permissions?: ImportPermission;
  allowedFormats?: ImportFormat[];
  className?: string;
}) {
  // Extract column information from React Table
  const columns = table.getAllColumns()
    .filter((col: any) => col.getCanHide() !== false && col.id !== 'select')
    .map((col: any) => ({
      id: col.id,
      label: col.columnDef.header || col.id,
      type: col.columnDef.meta?.type || 'string',
      required: col.columnDef.meta?.required || false,
      unique: col.columnDef.meta?.unique || false
    }));

  return (
    <DataTableImport
      tableName={tableName}
      columns={columns}
      onImport={onImport}
      permissions={permissions}
      allowedFormats={allowedFormats}
      className={className}
    />
  );
}

// Hook for easy integration with existing data tables
export function useDataTableImport<TData extends Record<string, any>>(
  table: any,
  tableName?: string,
  onImport?: (data: Record<string, any>[], options: any) => Promise<any>
) {
  const ImportComponent = React.useMemo(() => {
    const Component = (props: { 
      permissions?: ImportPermission; 
      allowedFormats?: ImportFormat[]; 
      className?: string 
    }) => (
      <DataTableIntegration
        table={table}
        tableName={tableName}
        onImport={onImport}
        {...props}
      />
    );
    Component.displayName = 'DataTableImportComponent';
    return Component;
  }, [table, tableName, onImport]);

  const getImportColumns = React.useCallback(() => {
    return table.getAllColumns()
      .filter((col: any) => col.getCanHide() !== false && col.id !== 'select')
      .map((col: any) => ({
        key: col.id,
        label: col.columnDef.header || col.id,
        type: col.columnDef.meta?.type || 'string',
        required: col.columnDef.meta?.required || false,
        unique: col.columnDef.meta?.unique || false
      }));
  }, [table]);

  return {
    ImportComponent,
    getImportColumns,
    canImport: (permissions?: ImportPermission) => permissions?.canImport ?? true,
    needsApproval: (permissions?: ImportPermission) => permissions?.requireApproval ?? false
  };
}