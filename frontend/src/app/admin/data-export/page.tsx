'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Badge } from '@/shared/components/ui/badge';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Separator } from '@/shared/components/ui/separator';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { 
  Download, 
  Database, 
  FileText, 
  AlertCircle, 
  Info,
  Columns,
  Key,
  Settings,
  Search
} from 'lucide-react';

import { DataExport } from '@/shared/components/DataExport';

interface TableInfo {
  table_name: string;
  columns: {
    name: string;
    type: string;
    nullable: boolean;
    primary_key: boolean;
    default?: string;
  }[];
  primary_keys: string[];
  sample_data: Record<string, any>[];
}

interface TablePermissions {
  table_name: string;
  export_permission: {
    can_export: boolean;
    can_preview: boolean;
    max_rows_per_export: number;
    allowed_formats: string[];
    allowed_columns: string[];
  };
}

interface TableData {
  rows: Record<string, any>[];
  total_count: number;
}

export default function DataExportPage() {
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableSchema, setTableSchema] = useState<TableInfo | null>(null);
  const [tablePermissions, setTablePermissions] = useState<TablePermissions | null>(null);
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [isLoadingTables, setIsLoadingTables] = useState(true);
  const [isLoadingSchema, setIsLoadingSchema] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [rowLimit, setRowLimit] = useState<number>(1000);

  // Fetch available tables on component mount
  useEffect(() => {
    fetchAvailableTables();
  }, []);

  // Fetch table schema when table is selected
  useEffect(() => {
    if (selectedTable) {
      fetchTableSchema(selectedTable);
      fetchTablePermissions(selectedTable);
      fetchTableData(selectedTable);
    } else {
      setTableSchema(null);
      setTablePermissions(null);
      setTableData(null);
    }
  }, [selectedTable]);

  const fetchAvailableTables = async () => {
    try {
      const response = await fetch('/api/v1/data/tables/available', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch available tables');
      }

      const data = await response.json();
      setAvailableTables(data.tables || []);
    } catch (err) {
      setError(`Failed to load tables: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoadingTables(false);
    }
  };

  const fetchTableSchema = async (tableName: string) => {
    setIsLoadingSchema(true);
    try {
      const response = await fetch(`/api/v1/data/tables/${tableName}/schema`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch table schema');
      }

      const data = await response.json();
      setTableSchema(data);
    } catch (err) {
      setError(`Failed to load table schema: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoadingSchema(false);
    }
  };

  const fetchTablePermissions = async (tableName: string) => {
    try {
      const response = await fetch(`/api/v1/data/tables/${tableName}/permissions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch table permissions');
      }

      const data = await response.json();
      setTablePermissions(data);
    } catch (err) {
      console.error('Failed to load permissions:', err);
      // Don't set error for permissions as they might not exist
    }
  };

  const fetchTableData = async (tableName: string, limit: number = 1000) => {
    setIsLoadingData(true);
    try {
      // Simulate data fetch - in a real app, you'd have an API endpoint for this
      const response = await fetch(`/api/v1/data/tables/${tableName}/data?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTableData(data);
      } else {
        // If no specific API endpoint, use sample data from schema
        if (tableSchema?.sample_data) {
          setTableData({
            rows: tableSchema.sample_data,
            total_count: tableSchema.sample_data.length
          });
        }
      }
    } catch (err) {
      console.warn('Could not fetch table data, using sample data');
      // Use sample data from schema as fallback
      if (tableSchema?.sample_data) {
        setTableData({
          rows: tableSchema.sample_data,
          total_count: tableSchema.sample_data.length
        });
      }
    } finally {
      setIsLoadingData(false);
    }
  };

  const mapSqlTypeToExportType = (sqlType: string): 'string' | 'number' | 'boolean' | 'object' | 'date' => {
    const type = sqlType.toLowerCase();
    if (type.includes('int') || type.includes('serial')) return 'number';
    if (type.includes('decimal') || type.includes('numeric') || type.includes('float') || type.includes('double')) return 'number';
    if (type.includes('bool')) return 'boolean';
    if (type.includes('date') || type.includes('time')) return 'date';
    if (type.includes('json')) return 'object';
    return 'string';
  };

  const exportColumns = useMemo(() => {
    if (!tableSchema) return [];
    
    const allColumns = tableSchema.columns.map(col => ({
      key: col.name,
      label: col.name,
      type: mapSqlTypeToExportType(col.type),
      required: col.primary_key,
      description: `${col.type}${col.nullable ? ' (nullable)' : ' (required)'}${col.primary_key ? ' (primary key)' : ''}`
    }));

    // Filter by allowed columns if permissions specify them
    if (tablePermissions?.export_permission.allowed_columns?.length) {
      return allColumns.filter(col => 
        tablePermissions.export_permission.allowed_columns.includes(col.key)
      );
    }

    return allColumns;
  }, [tableSchema, tablePermissions]);

  const filteredData = useMemo(() => {
    if (!tableData) return [];
    
    let filtered = tableData.rows;
    
    if (searchTerm) {
      filtered = filtered.filter(row => 
        Object.values(row).some(value => 
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    
    return filtered.slice(0, rowLimit);
  }, [tableData, searchTerm, rowLimit]);

  const handleExport = async (options: any) => {
    if (!selectedTable) return;

    try {
      const exportRequest = {
        table_name: selectedTable,
        export_format: options.format,
        selected_columns: options.columns,
        filters: [],
        export_options: {
          include_headers: options.includeHeaders,
          date_format: options.dateFormat,
          delimiter: options.delimiter,
          encoding: options.encoding
        }
      };

      const response = await fetch('/api/v1/data/export/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(exportRequest)
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Export error:', error);
      throw error;
    }
  };

  const renderTableInfo = () => {
    if (!tableSchema) return null;

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2">
              <Columns className="h-5 w-5" />
              <span>Table Structure</span>
            </CardTitle>
            <CardDescription>
              Schema information for {tableSchema.table_name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Total Columns:</span>
                  <span className="ml-2 font-medium">{tableSchema.columns.length}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Exportable Columns:</span>
                  <span className="ml-2 font-medium">{exportColumns.length}</span>
                </div>
              </div>

              {tablePermissions?.export_permission.allowed_columns?.length && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Only {tablePermissions.export_permission.allowed_columns.length} columns are available for export due to permission restrictions.
                  </AlertDescription>
                </Alert>
              )}

              <Separator />

              <div>
                <h4 className="font-medium mb-2 flex items-center space-x-2">
                  <Key className="h-4 w-4" />
                  <span>Available Columns</span>
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {exportColumns.map((col, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{col.label}</span>
                        {col.required && <Badge variant="outline" className="text-xs">PK</Badge>}
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{col.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {tablePermissions && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Export Permissions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Can Export:</span>
                  <Badge variant={tablePermissions.export_permission.can_export ? "default" : "secondary"}>
                    {tablePermissions.export_permission.can_export ? "Yes" : "No"}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Max Rows:</span>
                  <span className="text-sm font-medium">{tablePermissions.export_permission.max_rows_per_export.toLocaleString()}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Allowed Formats:</span>
                  <div className="flex space-x-1">
                    {tablePermissions.export_permission.allowed_formats.map(format => (
                      <Badge key={format} variant="outline" className="text-xs">{format.toUpperCase()}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderDataPreview = () => {
    if (!tableData || tableData.rows.length === 0) return null;

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Data Preview</span>
          </CardTitle>
          <CardDescription>
            Sample data from {selectedTable} ({tableData.total_count.toLocaleString()} total rows)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Label htmlFor="search">Search Data</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search across all columns..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="limit">Row Limit</Label>
                <Input
                  id="limit"
                  type="number"
                  value={rowLimit}
                  onChange={(e) => setRowLimit(parseInt(e.target.value) || 1000)}
                  className="w-32"
                  min={1}
                  max={tablePermissions?.export_permission.max_rows_per_export || 100000}
                />
              </div>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredData.length} of {tableData.total_count.toLocaleString()} rows
            </div>

            {filteredData.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse border border-gray-200 dark:border-gray-700">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800">
                      {Object.keys(filteredData[0] || {}).map(key => (
                        <th key={key} className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-left font-medium">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.slice(0, 10).map((row, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        {Object.values(row).map((value, colIndex) => (
                          <td key={colIndex} className="border border-gray-200 dark:border-gray-700 px-2 py-1">
                            {String(value || '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {filteredData.length > 10 && (
              <div className="text-sm text-gray-500 text-center">
                ... and {filteredData.length - 10} more rows (showing first 10)
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Data Export</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Export data from any table in multiple formats
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>Select Table</span>
          </CardTitle>
          <CardDescription>
            Choose the database table you want to export data from
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingTables ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Select value={selectedTable} onValueChange={setSelectedTable}>
              <SelectTrigger>
                <SelectValue placeholder="Select a table to export data from..." />
              </SelectTrigger>
              <SelectContent>
                {availableTables.map(table => (
                  <SelectItem key={table} value={table}>
                    {table}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {selectedTable && (
        <>
          {isLoadingSchema ? (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </CardContent>
            </Card>
          ) : (
            renderTableInfo()
          )}

          {isLoadingData ? (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-32 w-full" />
                </div>
              </CardContent>
            </Card>
          ) : (
            renderDataPreview()
          )}

          {tableSchema && tablePermissions?.export_permission.can_export && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Download className="h-5 w-5" />
                  <span>Export Data</span>
                </CardTitle>
                <CardDescription>
                  Configure and export data from {selectedTable}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataExport
                  tableName={selectedTable}
                  columns={exportColumns}
                  data={filteredData}
                  totalRows={tableData?.total_count || 0}
                  onExport={handleExport}
                  maxRows={tablePermissions.export_permission.max_rows_per_export}
                  allowedFormats={tablePermissions.export_permission.allowed_formats as any[]}
                  embedded={true}
                />
              </CardContent>
            </Card>
          )}

          {tablePermissions && !tablePermissions.export_permission.can_export && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You don&apos;t have permission to export data from the &quot;{selectedTable}&quot; table. 
                Please contact your administrator to request export permissions.
              </AlertDescription>
            </Alert>
          )}
        </>
      )}
    </div>
  );
}