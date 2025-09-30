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
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { 
  Download, 
  Database, 
  FileText, 
  AlertCircle, 
  Info,
  Columns,
  Key,
  Settings,
  Search,
  CheckCircle,
  PlayCircle,
  FileDown,
  Filter
} from 'lucide-react';

import { MultiStepWizard, WizardStep } from '@/shared/components/ui/multi-step-wizard';
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
  }, [exportData.selectedTable]);

  // Auto-select all columns when schema is loaded
  useEffect(() => {
    if (tableSchema && exportData.selectedColumns.length === 0) {
      const allColumns = tableSchema.columns.map(col => col.name);
      setExportData(prev => ({ ...prev, selectedColumns: allColumns }));
    }
  }, [tableSchema]);

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
    setIsLoading(true);
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
      setIsLoading(false);
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
    setIsLoading(true);
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
        setExportData(prev => ({ 
          ...prev, 
          previewData: data.rows || [],
          totalRows: data.total_count || 0
        }));
      } else {
        // If no specific API endpoint, use sample data from schema
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
      console.warn('Could not fetch table data, using sample data');
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
        filters: exportData.filters,
        export_options: {
          row_limit: exportData.rowLimit,
          search_term: exportData.searchTerm,
          ...exportData.options
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
      
      // Start polling for export completion
      await pollExportStatus(result.job_id);
      
    } catch (error) {
      setError(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
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
          // Download the file
          window.location.href = `/api/v1/data/export/${jobId}/download`;
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filter & Preview Data</span>
          </CardTitle>
          <CardDescription>
            Apply filters and preview your export data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {filteredData.length}
              </div>
              <div className="text-sm text-muted-foreground">Filtered Rows</div>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {exportData.selectedColumns.length}
              </div>
              <div className="text-sm text-muted-foreground">Selected Columns</div>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {exportData.exportFormat.toUpperCase()}
              </div>
              <div className="text-sm text-muted-foreground">Export Format</div>
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
              Search: "{exportData.searchTerm}"
            </div>
          </div>
        )}

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Click "Complete Export" to start exporting your data. The file will be downloaded automatically when ready.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Data Export Wizard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Export data from any table with guided steps and filtering
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

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
  );
}