'use client';

import React from 'react';
import { DataTableExport } from './DataTableExport';
import type { ExportColumn, ExportFormat } from '../types';

interface DataTableIntegrationProps<TData extends Record<string, any>> {
  table: any; // React Table instance
  data: TData[];
  tableName?: string;
  allowedFormats?: ExportFormat[];
  className?: string;
}

export function DataTableIntegration<TData extends Record<string, any>>({
  table,
  data,
  tableName,
  allowedFormats = ['csv', 'json', 'excel'],
  className
}: DataTableIntegrationProps<TData>) {
  // Extract column information from React Table
  const columns = table.getAllColumns()
    .filter((col: any) => col.getCanHide() !== false && col.id !== 'select')
    .map((col: any) => ({
      id: col.id,
      label: col.columnDef.header || col.id,
      accessor: col.columnDef.accessorKey || col.id,
      type: col.columnDef.meta?.type || 'string'
    }));

  // Get visible columns
  const visibleColumns = table.getVisibleLeafColumns()
    .filter((col: any) => col.id !== 'select')
    .map((col: any) => col.id);

  // Get selected rows
  const selectedRows = table.getSelectedRowModel().rows.map((row: any) => row.original);

  return (
    <DataTableExport
      data={data}
      columns={columns}
      selectedRows={selectedRows}
      visibleColumns={visibleColumns}
      tableName={tableName}
      allowedFormats={allowedFormats}
      className={className}
    />
  );
}

// Hook for easy integration with existing data tables
export function useDataTableExport<TData extends Record<string, any>>(
  table: any,
  data: TData[],
  tableName?: string
) {
  const ExportComponent = React.useMemo(
    () => {
      const Component = (props: { allowedFormats?: ExportFormat[]; className?: string }) => (
        <DataTableIntegration
          table={table}
          data={data}
          tableName={tableName}
          {...props}
        />
      );
      Component.displayName = 'DataTableExportComponent';
      return Component;
    },
    [table, data, tableName]
  );

  const exportData = React.useCallback(
    (format: ExportFormat = 'csv') => {
      // This would trigger an export with the current table state
      const columns = table.getAllColumns()
        .filter((col: any) => col.getCanHide() !== false && col.id !== 'select')
        .map((col: any) => ({
          id: col.id,
          label: col.columnDef.header || col.id,
          accessor: col.columnDef.accessorKey || col.id,
          type: col.columnDef.meta?.type || 'string'
        }));

      const visibleColumns = table.getVisibleLeafColumns()
        .filter((col: any) => col.id !== 'select')
        .map((col: any) => col.id);

      const selectedRows = table.getSelectedRowModel().rows.map((row: any) => row.original);
      const exportRows = selectedRows.length > 0 ? selectedRows : data;

      // Convert to ExportColumn format
      const exportColumns: ExportColumn[] = columns
        .filter((col: any) => visibleColumns.includes(col.id))
        .map((col: any) => ({
          key: col.accessor,
          label: col.label,
          type: col.type
        }));

      return {
        data: exportRows,
        columns: exportColumns,
        selectedColumns: exportColumns.map(col => col.key)
      };
    },
    [table, data]
  );

  return {
    ExportComponent,
    exportData,
    getSelectedRows: () => table.getSelectedRowModel().rows.map((row: any) => row.original),
    getVisibleColumns: () => table.getVisibleLeafColumns()
      .filter((col: any) => col.id !== 'select')
      .map((col: any) => col.id)
  };
}