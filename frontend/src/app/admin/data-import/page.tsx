'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Badge } from '@/shared/components/ui/badge';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Separator } from '@/shared/components/ui/separator';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { 
  Upload, 
  Database, 
  FileText, 
  AlertCircle, 
  Info,
  Columns,
  Key,
  Settings,
  CheckCircle,
  PlayCircle,
  FileUp,
  Cog
} from 'lucide-react';

import { MultiStepWizard, WizardStep } from '@/shared/components/ui/multi-step-wizard';
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

interface ImportData {
  selectedTable: string;
  file: File | null;
  format: string;
  options: any;
  fieldMappings: any[];
  validationResults: any;
  previewData: any[];
}

export default function DataImportPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [tableSchema, setTableSchema] = useState<TableInfo | null>(null);
  const [tablePermissions, setTablePermissions] = useState<TablePermissions | null>(null);
  const [isLoadingTables, setIsLoadingTables] = useState(true);
  
  // Import wizard data
  const [importData, setImportData] = useState<ImportData>({
    selectedTable: '',
    file: null,
    format: 'csv',
    options: {},
    fieldMappings: [],
    validationResults: null,
    previewData: []
  });

  const steps: WizardStep[] = [
    {
      id: 'table-selection',
      title: 'Choose Table',
      description: 'Select the database table for import',
      icon: <Database className="w-5 h-5" />,
      isValid: !!importData.selectedTable
    },
    {
      id: 'file-format',
      title: 'File & Format',
      description: 'Upload file and configure import settings',
      icon: <FileUp className="w-5 h-5" />,
      isValid: !!importData.file
    },
    {
      id: 'validate',
      title: 'Validate Records',
      description: 'Preview and validate your data',
      icon: <CheckCircle className="w-5 h-5" />,
      isValid: !!importData.validationResults
    },
    {
      id: 'execute',
      title: 'Execute Import',
      description: 'Review and execute the import',
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
    if (importData.selectedTable) {
      fetchTableSchema(importData.selectedTable);
      fetchTablePermissions(importData.selectedTable);
    } else {
      setTableSchema(null);
      setTablePermissions(null);
    }
  }, [importData.selectedTable]);

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

  const mapSqlTypeToImportType = (sqlType: string): 'string' | 'number' | 'boolean' | 'object' | 'url' | 'date' | 'email' => {
    const type = sqlType.toLowerCase();
    if (type.includes('int') || type.includes('serial')) return 'number';
    if (type.includes('decimal') || type.includes('numeric') || type.includes('float') || type.includes('double')) return 'number';
    if (type.includes('bool')) return 'boolean';
    if (type.includes('date') || type.includes('time')) return 'date';
    if (type.includes('json')) return 'object';
    return 'string';
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
    if (!importData.selectedTable) return;

    try {
      setIsLoading(true);
      
      // Use the existing import API
      const formData = new FormData();
      
      // Create a temporary CSV file from the data
      const csvContent = convertDataToCSV(data);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const file = new File([blob], `import_${importData.selectedTable}_${Date.now()}.csv`, { type: 'text/csv' });
      
      formData.append('file', file);
      formData.append('table_name', importData.selectedTable);
      formData.append('import_options', JSON.stringify(options));
      formData.append('field_mappings', JSON.stringify(importData.fieldMappings));
      
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
    } finally {
      setIsLoading(false);
    }
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

  const validateImportData = async () => {
    if (!importData.file || !importData.selectedTable) return;

    setIsLoading(true);
    try {
      // Parse the file first
      const formData = new FormData();
      formData.append('file', importData.file);
      formData.append('import_options', JSON.stringify(importData.options));

      const response = await fetch('/api/v1/data/import/parse', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to parse file');
      }

      const result = await response.json();
      
      setImportData(prev => ({
        ...prev,
        previewData: result.sample_rows || [],
        validationResults: {
          isValid: true,
          totalRows: result.total_rows,
          headers: result.headers,
          format: result.format
        }
      }));

      setCurrentStep(2); // Move to validation step
    } catch (error) {
      setError(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const canGoNext = () => {
    switch (currentStep) {
      case 0: return !!importData.selectedTable;
      case 1: return !!importData.file;
      case 2: return !!importData.validationResults;
      case 3: return true;
      default: return false;
    }
  };

  const handleStepChange = (step: number) => {
    if (step <= currentStep || canGoNext()) {
      setCurrentStep(step);
    }
  };

  const handleNext = async () => {
    if (currentStep === 1 && importData.file) {
      // Auto-validate when moving from step 2 to 3
      await validateImportData();
    } else if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleComplete = async () => {
    try {
      setIsLoading(true);
      await handleImport(importData.previewData, importData.options);
      // Handle success - maybe show success message or redirect
      alert('Import completed successfully!');
    } catch (error) {
      setError(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderTableSelection();
      case 1:
        return renderFileAndFormat();
      case 2:
        return renderValidation();
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
          Choose the database table you want to import data into
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingTables ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <div className="space-y-4">
            <Select 
              value={importData.selectedTable} 
              onValueChange={(value) => setImportData(prev => ({ ...prev, selectedTable: value }))}
            >
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

            {tableSchema && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2 flex items-center space-x-2">
                  <Columns className="h-4 w-4" />
                  <span>Table Information</span>
                </h4>
                <div className="text-sm space-y-1">
                  <p><strong>Columns:</strong> {tableSchema.columns.length}</p>
                  <p><strong>Primary Keys:</strong> {tableSchema.primary_keys.join(', ')}</p>
                  <p><strong>Sample Data:</strong> {tableSchema.sample_data.length} rows</p>
                </div>
              </div>
            )}

            {tablePermissions && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center space-x-2">
                  <Settings className="h-4 w-4" />
                  <span>Import Permissions</span>
                </h4>
                <div className="text-sm space-y-1">
                  <p><strong>Can Import:</strong> {tablePermissions.import_permission.can_import ? 'Yes' : 'No'}</p>
                  <p><strong>Max File Size:</strong> {tablePermissions.import_permission.max_file_size_mb} MB</p>
                  <p><strong>Max Rows:</strong> {tablePermissions.import_permission.max_rows_per_import.toLocaleString()}</p>
                  <p><strong>Allowed Formats:</strong> {tablePermissions.import_permission.allowed_formats.join(', ')}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderFileAndFormat = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="h-5 w-5" />
          <span>File Upload & Format Settings</span>
        </CardTitle>
        <CardDescription>
          Upload your data file and configure import settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload */}
        <div className="space-y-2">
          <Label htmlFor="file-upload">Select File</Label>
          <Input
            id="file-upload"
            type="file"
            accept=".csv,.json,.xlsx,.xls"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              setImportData(prev => ({ ...prev, file }));
            }}
          />
          {importData.file && (
            <div className="text-sm text-muted-foreground">
              Selected: {importData.file.name} ({(importData.file.size / 1024 / 1024).toFixed(2)} MB)
            </div>
          )}
        </div>

        {/* Format Selection */}
        <div className="space-y-2">
          <Label>File Format</Label>
          <Select 
            value={importData.format} 
            onValueChange={(value) => setImportData(prev => ({ ...prev, format: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV (Comma Separated Values)</SelectItem>
              <SelectItem value="json">JSON (JavaScript Object Notation)</SelectItem>
              <SelectItem value="excel">Excel (.xlsx/.xls)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Import Options */}
        <div className="space-y-4">
          <Label>Import Options</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="skip-header"
                checked={importData.options.skipHeader || false}
                onCheckedChange={(checked) => 
                  setImportData(prev => ({ 
                    ...prev, 
                    options: { ...prev.options, skipHeader: checked }
                  }))
                }
              />
              <Label htmlFor="skip-header">Skip header row</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="validate-data"
                checked={importData.options.validateData || true}
                onCheckedChange={(checked) => 
                  setImportData(prev => ({ 
                    ...prev, 
                    options: { ...prev.options, validateData: checked }
                  }))
                }
              />
              <Label htmlFor="validate-data">Validate data types</Label>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderValidation = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5" />
            <span>Data Validation</span>
          </CardTitle>
          <CardDescription>
            Preview and validate your import data
          </CardDescription>
        </CardHeader>
        <CardContent>
          {importData.validationResults ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {importData.validationResults.totalRows}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Rows</div>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {importData.validationResults.headers?.length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Columns</div>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {importData.validationResults.format?.toUpperCase()}
                  </div>
                  <div className="text-sm text-muted-foreground">Format</div>
                </div>
              </div>

              {importData.previewData.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Data Preview (First 5 rows)</h4>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          {importData.validationResults.headers?.map((header: string, index: number) => (
                            <th key={index} className="px-3 py-2 text-left font-medium">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {importData.previewData.slice(0, 5).map((row, index) => (
                          <tr key={index} className="border-t">
                            {importData.validationResults.headers?.map((header: string, colIndex: number) => (
                              <td key={colIndex} className="px-3 py-2">
                                {String(row[header] || '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No validation data available. Please go back and upload a file.</p>
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
          <span>Execute Import</span>
        </CardTitle>
        <CardDescription>
          Review your settings and execute the import
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Target Table</Label>
            <div className="p-3 bg-muted rounded-lg font-medium">
              {importData.selectedTable}
            </div>
          </div>
          <div className="space-y-2">
            <Label>File</Label>
            <div className="p-3 bg-muted rounded-lg">
              {importData.file?.name}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Format</Label>
            <div className="p-3 bg-muted rounded-lg">
              {importData.format.toUpperCase()}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Total Rows</Label>
            <div className="p-3 bg-muted rounded-lg">
              {importData.validationResults?.totalRows || 0}
            </div>
          </div>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Click "Complete Import" to start importing your data. This process may take some time depending on the file size.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Data Import Wizard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Import data into any table with guided steps and validation
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
        nextButtonText={currentStep === 1 ? "Validate Data" : "Next"}
        completeButtonText="Complete Import"
      >
        {renderStepContent()}
      </MultiStepWizard>
    </div>
  );
}