'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Badge } from '@/shared/components/ui/badge';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Separator } from '@/shared/components/ui/separator';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { 
  Upload, 
  Database, 
  FileText, 
  AlertCircle, 
  Info,
  Columns,
  Key,
  Settings
} from 'lucide-react';

import { DataImport } from '@/shared/components/DataImport';
import type { ImportFormat } from '@/shared/components/DataImport/types';

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
  import_permission: {
    can_import: boolean;
    can_validate: boolean;
    can_preview: boolean;
    max_file_size_mb: number;
    max_rows_per_import: number;
    allowed_formats: string[];
    requires_approval: boolean;
  };
}

export default function DataImportPage() {
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableSchema, setTableSchema] = useState<TableInfo | null>(null);
  const [tablePermissions, setTablePermissions] = useState<TablePermissions | null>(null);
  const [isLoadingTables, setIsLoadingTables] = useState(true);
  const [isLoadingSchema, setIsLoadingSchema] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available tables on component mount
  useEffect(() => {
    fetchAvailableTables();
  }, []);

  // Fetch table schema when table is selected
  useEffect(() => {
    if (selectedTable) {
      fetchTableSchema(selectedTable);
      fetchTablePermissions(selectedTable);
    } else {
      setTableSchema(null);
      setTablePermissions(null);
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

  const importColumns = useMemo(() => {
    if (!tableSchema) return [];
    
    return tableSchema.columns.map(col => ({
      key: col.name,
      label: col.name,
      type: mapSqlTypeToImportType(col.type),
      required: !col.nullable || col.primary_key,
      description: `${col.type}${col.nullable ? ' (nullable)' : ' (required)'}${col.primary_key ? ' (primary key)' : ''}`
    }));
  }, [tableSchema]);

  const handleImport = async (data: any[], options: any) => {
    if (!selectedTable) return;

    try {
      // Use the existing import API
      const formData = new FormData();
      
      // Create a temporary CSV file from the data
      const csvContent = convertDataToCSV(data);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const file = new File([blob], `import_${selectedTable}_${Date.now()}.csv`, { type: 'text/csv' });
      
      formData.append('file', file);
      formData.append('table_name', selectedTable);
      formData.append('import_options', JSON.stringify(options));
      formData.append('field_mappings', JSON.stringify([]));
      
      const response = await fetch('/api/v1/data/import/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Import failed');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Import error:', error);
      throw error;
    }
  };

  const mapSqlTypeToImportType = (sqlType: string): 'string' | 'number' | 'boolean' | 'object' | 'url' | 'date' | 'email' => {
    const type = sqlType.toLowerCase();
    if (type.includes('int') || type.includes('serial')) return 'number';
    if (type.includes('decimal') || type.includes('numeric') || type.includes('float') || type.includes('double')) return 'number';
    if (type.includes('bool')) return 'boolean';
    if (type.includes('date') || type.includes('time')) return 'date';
    if (type.includes('json')) return 'object';
    return 'string';
  };

  const convertDataToCSV = (data: any[]): string => {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value.replace(/"/g, '""')}"` 
            : value;
        }).join(',')
      )
    ];
    
    return csvRows.join('\n');
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
                  <span className="text-gray-600 dark:text-gray-400">Primary Keys:</span>
                  <span className="ml-2 font-medium">{tableSchema.primary_keys.length}</span>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2 flex items-center space-x-2">
                  <Key className="h-4 w-4" />
                  <span>Column Details</span>
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {tableSchema.columns.map((col, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{col.name}</span>
                        {col.primary_key && <Badge variant="outline" className="text-xs">PK</Badge>}
                        {!col.nullable && <Badge variant="secondary" className="text-xs">Required</Badge>}
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{col.type}</span>
                    </div>
                  ))}
                </div>
              </div>

              {tableSchema.sample_data.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2 flex items-center space-x-2">
                      <FileText className="h-4 w-4" />
                      <span>Sample Data</span>
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse border border-gray-200 dark:border-gray-700">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-800">
                            {Object.keys(tableSchema.sample_data[0] || {}).map(key => (
                              <th key={key} className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-left font-medium">
                                {key}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tableSchema.sample_data.slice(0, 3).map((row, index) => (
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
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {tablePermissions && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Import Permissions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Can Import:</span>
                  <Badge variant={tablePermissions.import_permission.can_import ? "default" : "secondary"}>
                    {tablePermissions.import_permission.can_import ? "Yes" : "No"}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Max File Size:</span>
                  <span className="text-sm font-medium">{tablePermissions.import_permission.max_file_size_mb} MB</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Max Rows:</span>
                  <span className="text-sm font-medium">{tablePermissions.import_permission.max_rows_per_import.toLocaleString()}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Allowed Formats:</span>
                  <div className="flex space-x-1">
                    {tablePermissions.import_permission.allowed_formats.map(format => (
                      <Badge key={format} variant="outline" className="text-xs">{format.toUpperCase()}</Badge>
                    ))}
                  </div>
                </div>

                {tablePermissions.import_permission.requires_approval && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Imports to this table require approval before processing.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Data Import</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Import data into any table with field mapping and validation
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
            Choose the database table you want to import data into
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingTables ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Select value={selectedTable} onValueChange={setSelectedTable}>
              <SelectTrigger>
                <SelectValue placeholder="Select a table to import data into..." />
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

          {tableSchema && tablePermissions?.import_permission.can_import && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Upload className="h-5 w-5" />
                  <span>Import Data</span>
                </CardTitle>
                <CardDescription>
                  Upload and import data into {selectedTable}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataImport
                  tableName={selectedTable}
                  columns={importColumns}
                  onImport={handleImport}
                  maxFileSize={tablePermissions.import_permission.max_file_size_mb * 1024 * 1024}
                  maxRows={tablePermissions.import_permission.max_rows_per_import}
                  allowedFormats={tablePermissions.import_permission.allowed_formats as any[]}
                  permissions={{
                    canImport: tablePermissions.import_permission.can_import,
                    canValidate: tablePermissions.import_permission.can_validate,
                    canPreview: tablePermissions.import_permission.can_preview,
                    requireApproval: tablePermissions.import_permission.requires_approval,
                    maxFileSize: tablePermissions.import_permission.max_file_size_mb,
                    allowedFormats: tablePermissions.import_permission.allowed_formats as ImportFormat[]
                  }}
                  embedded={true}
                />
              </CardContent>
            </Card>
          )}

          {tablePermissions && !tablePermissions.import_permission.can_import && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You don&apos;t have permission to import data into the &quot;{selectedTable}&quot; table. 
                Please contact your administrator to request import permissions.
              </AlertDescription>
            </Alert>
          )}
        </>
      )}
    </div>
  );
}