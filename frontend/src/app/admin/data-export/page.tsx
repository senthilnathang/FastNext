'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Badge } from '@/shared/components/ui/badge';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { 
  Database, 
  AlertCircle, 
  Info,
  Columns,
  Settings,
  PlayCircle,
  FileDown,
  Filter
} from 'lucide-react';

import { MultiStepWizard, WizardStep } from '@/shared/components/ui/multi-step-wizard';
import { useDataImportExportConfig } from '@/shared/hooks/useDataImportExportConfig';

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

interface ExportData {
  selectedTable: string;
  selectedColumns: string[];
  exportFormat: string;
  options: any;
  filters: any[];
  rowLimit: number;
  searchTerm: string;
  previewData: any[];
  totalRows: number;
}

export default function DataExportPage() {
  const { config: exportConfig } = useDataImportExportConfig();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [tableSchema, setTableSchema] = useState<TableInfo | null>(null);
  const [tablePermissions, setTablePermissions] = useState<TablePermissions | null>(null);
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [isLoadingTables, setIsLoadingTables] = useState(true);
  
  // Export wizard data
  const [exportData, setExportData] = useState<ExportData>({
    selectedTable: '',
    selectedColumns: [],
    exportFormat: 'csv',
    options: {},
    filters: [],
    rowLimit: 1000,
    searchTerm: '',
    previewData: [],
    totalRows: 0
  });

  const steps: WizardStep[] = [
    {
      id: 'table-selection',
      title: 'Choose Table',
      description: 'Select the database table for export',
      icon: <Database className="w-5 h-5" />,
      isValid: !!exportData.selectedTable
    },
    {
      id: 'fields-format',
      title: 'Fields & Format',
      description: 'Select columns and export format',
      icon: <FileDown className="w-5 h-5" />,
      isValid: exportData.selectedColumns.length > 0 && !!exportData.exportFormat
    },
    {
      id: 'filter-records',
      title: 'Filter Records',
      description: 'Filter and preview your data',
      icon: <Filter className="w-5 h-5" />,
      isValid: true // Optional step
    },
    {
      id: 'execute',
      title: 'Execute Export',
      description: 'Review and execute the export',
      icon: <PlayCircle className="w-5 h-5" />,
      isValid: true
    }
  ];

  // Fetch available tables on component mount
  useEffect(() => {
    fetchAvailableTables();
  }, []);



  // Auto-select all columns when schema is loaded
  useEffect(() => {
    if (tableSchema && exportData.selectedColumns.length === 0) {
      const allColumns = tableSchema.columns.map(col => col.name);
      setExportData(prev => ({ ...prev, selectedColumns: allColumns }));
    }
  }, [tableSchema, exportData.selectedColumns.length]);

  const getDemoTableSchema = (tableName: string): TableInfo => {
    // Demo schema data for fallback when authentication fails
    const demoSchemas: Record<string, TableInfo> = {
      users: {
        table_name: 'users',
        columns: [
          { name: 'id', type: 'integer', nullable: false, primary_key: true },
          { name: 'email', type: 'varchar', nullable: false, primary_key: false },
          { name: 'first_name', type: 'varchar', nullable: true, primary_key: false },
          { name: 'last_name', type: 'varchar', nullable: true, primary_key: false },
          { name: 'created_at', type: 'timestamp', nullable: false, primary_key: false },
          { name: 'is_active', type: 'boolean', nullable: false, primary_key: false }
        ],
        primary_keys: ['id'],
        sample_data: [
          { id: 1, email: 'john@example.com', first_name: 'John', last_name: 'Doe', created_at: '2023-01-01', is_active: true },
          { id: 2, email: 'jane@example.com', first_name: 'Jane', last_name: 'Smith', created_at: '2023-01-02', is_active: true }
        ]
      },
      products: {
        table_name: 'products',
        columns: [
          { name: 'id', type: 'integer', nullable: false, primary_key: true },
          { name: 'name', type: 'varchar', nullable: false, primary_key: false },
          { name: 'price', type: 'decimal', nullable: false, primary_key: false },
          { name: 'category', type: 'varchar', nullable: true, primary_key: false },
          { name: 'in_stock', type: 'boolean', nullable: false, primary_key: false }
        ],
        primary_keys: ['id'],
        sample_data: [
          { id: 1, name: 'Laptop', price: 999.99, category: 'Electronics', in_stock: true },
          { id: 2, name: 'Book', price: 19.99, category: 'Education', in_stock: false }
        ]
      },
      orders: {
        table_name: 'orders',
        columns: [
          { name: 'id', type: 'integer', nullable: false, primary_key: true },
          { name: 'user_id', type: 'integer', nullable: false, primary_key: false },
          { name: 'product_id', type: 'integer', nullable: false, primary_key: false },
          { name: 'quantity', type: 'integer', nullable: false, primary_key: false },
          { name: 'order_date', type: 'timestamp', nullable: false, primary_key: false },
          { name: 'status', type: 'varchar', nullable: false, primary_key: false }
        ],
        primary_keys: ['id'],
        sample_data: [
          { id: 1, user_id: 1, product_id: 1, quantity: 1, order_date: '2023-01-01', status: 'completed' },
          { id: 2, user_id: 2, product_id: 2, quantity: 2, order_date: '2023-01-02', status: 'pending' }
        ]
      },
      customers: {
        table_name: 'customers',
        columns: [
          { name: 'id', type: 'integer', nullable: false, primary_key: true },
          { name: 'name', type: 'varchar', nullable: false, primary_key: false },
          { name: 'email', type: 'varchar', nullable: false, primary_key: false },
          { name: 'phone', type: 'varchar', nullable: true, primary_key: false },
          { name: 'address', type: 'text', nullable: true, primary_key: false }
        ],
        primary_keys: ['id'],
        sample_data: [
          { id: 1, name: 'John Doe', email: 'john@example.com', phone: '555-0101', address: '123 Main St' },
          { id: 2, name: 'Jane Smith', email: 'jane@example.com', phone: '555-0102', address: '456 Oak Ave' }
        ]
      }
    };

    return demoSchemas[tableName] || demoSchemas.users;
  };

  const fetchTableSchema = useCallback(async (tableName: string) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');

      if (!token) {
        console.warn('No access token found - using demo schema');
        setTableSchema(getDemoTableSchema(tableName));
        return;
      }

      const response = await fetch(`/api/v1/data/tables/${tableName}/schema`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to fetch table schema (${response.status}):`, errorText);

        // For auth errors, use demo schema
        if (response.status === 401 || response.status === 403) {
          setTableSchema(getDemoTableSchema(tableName));
          return;
        }

        throw new Error(`Failed to fetch table schema (${response.status})`);
      }

      const data = await response.json();
      setTableSchema(data);
    } catch (err) {
      console.error('Failed to load table schema:', err);
      setTableSchema(getDemoTableSchema(tableName));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchTablePermissions = useCallback(async (tableName: string) => {
    try {
      const token = localStorage.getItem('access_token');

      if (!token) {
        console.warn('No access token found - using default permissions');
        setTablePermissions({
          table_name: tableName,
          export_permission: {
            can_export: true,
            can_preview: true,
            max_rows_per_export: 100000,
            allowed_formats: ['csv', 'json', 'excel', 'xml'],
            allowed_columns: []
          }
        });
        return;
      }

      const response = await fetch(`/api/v1/data/tables/${tableName}/permissions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to fetch table permissions (${response.status}):`, errorText);

        // For auth errors, use default permissions
        if (response.status === 401 || response.status === 403) {
          setTablePermissions({
            table_name: tableName,
            export_permission: {
              can_export: true,
              can_preview: true,
              max_rows_per_export: 100000,
              allowed_formats: ['csv', 'json', 'excel', 'xml'],
              allowed_columns: []
            }
          });
          return;
        }

        throw new Error(`Failed to fetch table permissions (${response.status})`);
      }

      const data = await response.json();
      setTablePermissions(data);
    } catch (err) {
      console.error('Failed to load table permissions:', err);
      setTablePermissions({
        table_name: tableName,
        export_permission: {
          can_export: true,
          can_preview: true,
          max_rows_per_export: 100000,
          allowed_formats: ['csv', 'json', 'excel', 'xml'],
          allowed_columns: []
        }
      });
    }
  }, []);

  const fetchAvailableTables = async () => {
    try {
      const token = localStorage.getItem('access_token');

      if (!token) {
        console.warn('No access token found - showing demo tables');
        setAvailableTables(['users', 'products', 'orders', 'customers']);
        return;
      }

      const response = await fetch('/api/v1/data/tables/available', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to fetch available tables (${response.status}):`, errorText);

        // For auth errors, show demo tables
        if (response.status === 401 || response.status === 403) {
          setAvailableTables(['users', 'products', 'orders', 'customers']);
          return;
        }

        throw new Error(`Failed to fetch available tables (${response.status})`);
      }

      const data = await response.json();
      setAvailableTables(data.tables || []);
    } catch (err) {
      console.error('Failed to load tables:', err);
      setError(`Failed to load tables: ${err instanceof Error ? err.message : 'Unknown error'}`);
       // Set fallback tables for demo
       setAvailableTables(['users', 'products', 'orders', 'customers']);
      } finally {
        setIsLoading(false);
      }
    };

  const fetchTableData = useCallback(async (tableName: string, limit: number = 1000) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/v1/data/tables/${tableName}/data?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTableData(data);
        setExportData(prev => ({
          ...prev,
          previewData: data.data || [],
          totalRows: data.total_rows || 0
        }));
      } else {
        // If API endpoint fails, use sample data from schema as fallback
        if (tableSchema?.sample_data) {
          const fallbackData = {
            rows: tableSchema.sample_data,
            total_count: tableSchema.sample_data.length
          };
          setTableData(fallbackData);
          setExportData(prev => ({
            ...prev,
            previewData: fallbackData.rows,
            totalRows: fallbackData.total_count
          }));
        }
      }
    } catch (err) {
      console.warn('Could not fetch table data, using sample data:', err);
      // Use sample data from schema as fallback
      if (tableSchema?.sample_data) {
        const fallbackData = {
          rows: tableSchema.sample_data,
          total_count: tableSchema.sample_data.length
        };
        setTableData(fallbackData);
        setExportData(prev => ({
          ...prev,
          previewData: fallbackData.rows,
          totalRows: fallbackData.total_count
        }));
      }
    } finally {
      setIsLoading(false);
    }
  }, [tableSchema]);

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
    if (!tableData || !tableData.rows) return [];
    
    let filtered = tableData.rows;
    
    // Apply search filter
    if (exportData.searchTerm) {
      filtered = filtered.filter(row => 
        Object.values(row).some(value => 
          String(value).toLowerCase().includes(exportData.searchTerm.toLowerCase())
        )
      );
    }
    
    // Apply row limit
    return filtered.slice(0, exportData.rowLimit);
  }, [tableData, exportData.searchTerm, exportData.rowLimit]);

  const handleExport = async () => {
    try {
      setIsLoading(true);
      
      const exportRequest = {
        table_name: exportData.selectedTable,
        export_format: exportData.exportFormat,
        selected_columns: exportData.selectedColumns,
        filters: exportData.filters.map(filter => ({
          column: filter.column || '',
          operator: filter.operator || 'equals',
          value: filter.value || '',
          label: filter.label || ''
        })),
        export_options: {
          format: exportData.exportFormat,
          include_headers: exportData.options.includeHeaders !== false,
          filename: `${exportData.selectedTable}_export_${Date.now()}`,
          date_format: "iso",
          delimiter: ",",
          encoding: "utf-8",
          pretty_print: false,
          sheet_name: "Data",
          auto_fit_columns: true,
          freeze_headers: true,
          // Custom options for search and limit
          row_limit: exportData.rowLimit,
          search_term: exportData.searchTerm
        }
      };

      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Authentication token not found - please log in again');
      }

      const response = await fetch('/api/v1/data/export/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(exportRequest)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || response.statusText || 'Export failed';
        
        if (response.status === 401) {
          throw new Error('Authentication failed - please log in again');
        } else if (response.status === 403) {
          throw new Error(`Access denied: ${errorMessage}`);
        } else if (response.status === 400) {
          throw new Error(`Invalid request: ${errorMessage}`);
        } else {
          throw new Error(`Export failed: ${errorMessage}`);
        }
      }

      const result = await response.json();
      
      // Start polling for export completion
      await pollExportStatus(result.job_id);
      
    } catch (error) {
      setError(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadExportFile = async (jobId: string) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Fetch the file with proper authentication
      const response = await fetch(`/api/v1/data/export/${jobId}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed - please log in again');
        } else if (response.status === 403) {
          throw new Error('Access denied - insufficient permissions');
        } else {
          throw new Error(`Download failed: ${response.statusText}`);
        }
      }

      // Get the filename from the response headers
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `export_${jobId}.csv`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }

      // Convert response to blob
      const blob = await response.blob();

      // Create download link and trigger download in new tab
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.target = '_blank'; // Open in new tab
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      window.URL.revokeObjectURL(url);
      
      console.log(`Downloaded file: ${filename}`);
      
    } catch (error) {
      console.error('Download failed:', error);
      setError(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const pollExportStatus = async (jobId: string) => {
    const maxAttempts = 30;
    let attempts = 0;
    
    const poll = async () => {
      try {
        const response = await fetch(`/api/v1/data/export/${jobId}/status`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });
        
        if (!response.ok) throw new Error('Failed to check export status');
        
        const job = await response.json();
        
        if (job.status === 'completed') {
          // Download the file in new tab with proper authentication
          await downloadExportFile(jobId);
          alert('Export completed and download started!');
          return;
        } else if (job.status === 'failed') {
          throw new Error(job.error_message || 'Export failed');
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 2000); // Poll every 2 seconds
        } else {
          throw new Error('Export timeout');
        }
      } catch (error) {
        setError(`Export monitoring failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
    
    poll();
  };

  const canGoNext = () => {
    switch (currentStep) {
      case 0: return !!exportData.selectedTable;
      case 1: return exportData.selectedColumns.length > 0 && !!exportData.exportFormat;
      case 2: return true; // Filter step is optional
      case 3: return true;
      default: return false;
    }
  };

  const handleStepChange = (step: number) => {
    if (step <= currentStep || canGoNext()) {
      setCurrentStep(step);
    }
  };

  const handleComplete = async () => {
    await handleExport();
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderTableSelection();
      case 1:
        return renderFieldsAndFormat();
      case 2:
        return renderFilterRecords();
      case 3:
        return renderExecution();
      default:
        return null;
    }
  };

  const renderTableSelection = () => (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-green-50 dark:from-gray-800 dark:to-green-950">
      <CardHeader className="pb-6">
        <CardTitle className="flex items-center space-x-3 text-2xl">
          <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
            <Database className="h-6 w-6 text-green-600" />
          </div>
          <span>Select Source Table</span>
        </CardTitle>
        <CardDescription className="text-base">
          Choose the database table you want to export data from
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingTables ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <div className="space-y-4">
            <Select 
              value={exportData.selectedTable} 
              onValueChange={(value) => setExportData(prev => ({ ...prev, selectedTable: value }))}
            >
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

            {tableSchema && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2 flex items-center space-x-2">
                  <Columns className="h-4 w-4" />
                  <span>Table Information</span>
                </h4>
                <div className="text-sm space-y-1">
                  <p><strong>Columns:</strong> {tableSchema.columns.length}</p>
                  <p><strong>Primary Keys:</strong> {tableSchema.primary_keys.join(', ')}</p>
                  <p><strong>Available Data:</strong> {exportData.totalRows} rows</p>
                </div>
              </div>
            )}

            {tablePermissions && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center space-x-2">
                  <Settings className="h-4 w-4" />
                  <span>Export Permissions</span>
                </h4>
                <div className="text-sm space-y-1">
                  <p><strong>Can Export:</strong> {tablePermissions.export_permission.can_export ? 'Yes' : 'No'}</p>
                  <p><strong>Max Rows:</strong> {tablePermissions.export_permission.max_rows_per_export.toLocaleString()}</p>
                  <p><strong>Allowed Formats:</strong> {tablePermissions.export_permission.allowed_formats.join(', ')}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderFieldsAndFormat = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Columns className="h-5 w-5" />
            <span>Select Columns</span>
          </CardTitle>
          <CardDescription>
            Choose which columns to include in your export
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExportData(prev => ({ 
                  ...prev, 
                  selectedColumns: exportColumns.map(col => col.key) 
                }))}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExportData(prev => ({ ...prev, selectedColumns: [] }))}
              >
                Clear All
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              {exportData.selectedColumns.length} of {exportColumns.length} columns selected
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 max-h-64 overflow-y-auto">
            {exportColumns.map((column) => (
              <div key={column.key} className="flex items-center space-x-2">
                <Checkbox
                  id={column.key}
                  checked={exportData.selectedColumns.includes(column.key)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setExportData(prev => ({
                        ...prev,
                        selectedColumns: [...prev.selectedColumns, column.key]
                      }));
                    } else {
                      setExportData(prev => ({
                        ...prev,
                        selectedColumns: prev.selectedColumns.filter(col => col !== column.key)
                      }));
                    }
                  }}
                />
                <Label htmlFor={column.key} className="text-sm">
                  <span className="font-medium">{column.label}</span>
                  {column.required && <Badge variant="outline" className="ml-2 text-xs">Required</Badge>}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileDown className="h-5 w-5" />
            <span>Export Format</span>
          </CardTitle>
          <CardDescription>
            Choose the format for your exported data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>File Format</Label>
            <Select 
              value={exportData.exportFormat} 
              onValueChange={(value) => setExportData(prev => ({ ...prev, exportFormat: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV (Comma Separated Values)</SelectItem>
                <SelectItem value="json">JSON (JavaScript Object Notation)</SelectItem>
                <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                <SelectItem value="xml">XML (Extensible Markup Language)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <Label>Export Options</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="include-headers"
                  checked={exportData.options.includeHeaders !== false}
                  onCheckedChange={(checked) => 
                    setExportData(prev => ({ 
                      ...prev, 
                      options: { ...prev.options, includeHeaders: checked }
                    }))
                  }
                />
                <Label htmlFor="include-headers">Include column headers</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="compress-file"
                  checked={exportData.options.compress || false}
                  onCheckedChange={(checked) => 
                    setExportData(prev => ({ 
                      ...prev, 
                      options: { ...prev.options, compress: checked }
                    }))
                  }
                />
                <Label htmlFor="compress-file">Compress file (.zip)</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderFilterRecords = () => (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-purple-950">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center space-x-3 text-2xl">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Filter className="h-6 w-6 text-purple-600" />
            </div>
            <span>Filter & Preview Data</span>
          </CardTitle>
          <CardDescription className="text-base">
            Apply filters and preview your export data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Filters */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search-term">Search Term</Label>
              <Input
                id="search-term"
                placeholder="Search across all columns..."
                value={exportData.searchTerm}
                onChange={(e) => setExportData(prev => ({ ...prev, searchTerm: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="row-limit">Row Limit</Label>
              <Input
                id="row-limit"
                type="number"
                placeholder="Maximum rows to export..."
                value={exportData.rowLimit}
                onChange={(e) => setExportData(prev => ({ ...prev, rowLimit: parseInt(e.target.value) || 1000 }))}
              />
            </div>
          </div>

          {/* Preview Stats */}
          <div className="grid grid-cols-3 gap-6">
            <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Database className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-blue-600">
                  {filteredData.length}
                </div>
              </div>
              <div className="text-sm font-medium text-blue-800 dark:text-blue-200">Filtered Rows</div>
            </div>
            <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 rounded-xl border border-green-200 dark:border-green-800 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <Columns className="h-5 w-5 text-green-600" />
                </div>
                <div className="text-3xl font-bold text-green-600">
                  {exportData.selectedColumns.length}
                </div>
              </div>
              <div className="text-sm font-medium text-green-800 dark:text-green-200">Selected Columns</div>
            </div>
            <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 rounded-xl border border-purple-200 dark:border-purple-800 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <FileDown className="h-5 w-5 text-purple-600" />
                </div>
                <div className="text-lg font-bold text-purple-600">
                  {exportData.exportFormat.toUpperCase()}
                </div>
              </div>
              <div className="text-sm font-medium text-purple-800 dark:text-purple-200">Export Format</div>
            </div>
          </div>

          {/* Data Preview */}
          {filteredData.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Data Preview (First 5 rows)</h4>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      {exportData.selectedColumns.map((column, index) => (
                        <th key={index} className="px-3 py-2 text-left font-medium">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.slice(0, 5).map((row, index) => (
                      <tr key={index} className="border-t">
                        {exportData.selectedColumns.map((column, colIndex) => (
                          <td key={colIndex} className="px-3 py-2">
                            {String(row[column] || '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderExecution = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <PlayCircle className="h-5 w-5" />
          <span>Execute Export</span>
        </CardTitle>
        <CardDescription>
          Review your settings and execute the export
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Source Table</Label>
            <div className="p-3 bg-muted rounded-lg font-medium">
              {exportData.selectedTable}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Export Format</Label>
            <div className="p-3 bg-muted rounded-lg">
              {exportData.exportFormat.toUpperCase()}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Selected Columns</Label>
            <div className="p-3 bg-muted rounded-lg">
              {exportData.selectedColumns.length} columns
            </div>
          </div>
          <div className="space-y-2">
            <Label>Estimated Rows</Label>
            <div className="p-3 bg-muted rounded-lg">
              {filteredData.length} rows
            </div>
          </div>
        </div>

        {exportData.searchTerm && (
          <div className="space-y-2">
            <Label>Applied Filters</Label>
            <div className="p-3 bg-muted rounded-lg">
              Search: &quot;{exportData.searchTerm}&quot;
            </div>
          </div>
        )}

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Click &quot;Complete Export&quot; to start exporting your data. The file will be downloaded automatically when ready.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
   );

  // Fetch table schema when table is selected
  useEffect(() => {
    if (exportData.selectedTable) {
      fetchTableSchema(exportData.selectedTable);
      fetchTablePermissions(exportData.selectedTable);
      fetchTableData(exportData.selectedTable);
      // Auto-select all columns when table changes
      setExportData(prev => ({ ...prev, selectedColumns: [] }));
    } else {
      setTableSchema(null);
      setTablePermissions(null);
      setTableData(null);
    }
  }, [exportData.selectedTable, fetchTableData, fetchTablePermissions, fetchTableSchema]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-green-950 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl mb-4">
            <FileDown className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            Data Export Wizard
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mt-2 max-w-2xl mx-auto">
            Export data from any table with guided steps, smart filtering, and multiple format options
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="shadow-lg border-0 bg-red-50 dark:bg-red-950">
            <AlertCircle className="h-5 w-5" />
            <AlertDescription className="text-red-800 dark:text-red-200 font-medium">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl p-8">
          <MultiStepWizard
            steps={steps}
            currentStep={currentStep}
            onStepChange={handleStepChange}
            onComplete={handleComplete}
            isLoading={isLoading}
            canGoNext={canGoNext()}
            completeButtonText="Complete Export"
          >
            {renderStepContent()}
          </MultiStepWizard>
        </div>
      </div>
    </div>
  );
}