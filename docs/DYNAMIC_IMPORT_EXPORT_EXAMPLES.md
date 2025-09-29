# Dynamic Import/Export Usage Examples

This guide provides comprehensive examples for using the Dynamic Import/Export system in FastNext.

## Table of Contents

1. [Basic Usage Examples](#basic-usage-examples)
2. [API Integration Examples](#api-integration-examples)
3. [Frontend Component Examples](#frontend-component-examples)
4. [Advanced Use Cases](#advanced-use-cases)
5. [Troubleshooting Examples](#troubleshooting-examples)

## Basic Usage Examples

### 1. User Workflow - Data Import

**Scenario**: Import customer data into the `customers` table

**Steps**:
1. Navigate to `/settings/data-import`
2. Select "customers" from the table dropdown
3. Review table schema (id, name, email, phone, created_at)
4. Upload `customers.csv` file
5. Map fields automatically or manually adjust
6. Validate data and review errors
7. Import data

**Example Data File** (`customers.csv`):
```csv
name,email,phone,company
John Doe,john@example.com,555-0123,Acme Corp
Jane Smith,jane@example.com,555-0124,TechCorp
Bob Johnson,bob@example.com,555-0125,StartupInc
```

**Expected Result**:
- 3 rows processed
- Automatic field mapping: name→name, email→email, phone→phone
- ID and created_at fields handled automatically
- Data imported successfully with validation

### 2. User Workflow - Data Export

**Scenario**: Export product data with filtering

**Steps**:
1. Navigate to `/settings/data-export`
2. Select "products" from the table dropdown
3. Review table schema and data preview
4. Search for "electronics" products
5. Select columns: name, price, category, stock
6. Choose CSV format
7. Export and download

**Expected Result**:
- Filtered data showing only electronics products
- CSV file with selected columns
- Proper formatting with headers
- File downloaded with timestamp in filename

## API Integration Examples

### 1. Table Discovery Integration

```typescript
// Complete table discovery workflow
async function discoverAndSetupTable(tableName: string) {
  try {
    // Step 1: Get available tables
    const tablesResponse = await fetch('/api/v1/data/tables/available');
    const { tables } = await tablesResponse.json();
    
    if (!tables.includes(tableName)) {
      throw new Error(`Table ${tableName} not available`);
    }
    
    // Step 2: Get table schema
    const schemaResponse = await fetch(`/api/v1/data/tables/${tableName}/schema`);
    const schema = await schemaResponse.json();
    
    // Step 3: Get permissions
    const permissionsResponse = await fetch(`/api/v1/data/tables/${tableName}/permissions`);
    const permissions = await permissionsResponse.json();
    
    // Step 4: Configure components
    const importColumns = schema.columns.map(col => ({
      key: col.name,
      label: col.name,
      type: mapSqlType(col.type),
      required: !col.nullable || col.primary_key
    }));
    
    return {
      schema,
      permissions,
      importColumns,
      canImport: permissions.import_permission.can_import,
      canExport: permissions.export_permission.can_export
    };
    
  } catch (error) {
    console.error('Failed to setup table:', error);
    throw error;
  }
}

// Usage
const tableConfig = await discoverAndSetupTable('users');
console.log('Table configured:', tableConfig);
```

### 2. Dynamic Import with Validation

```typescript
// Complete import workflow with dynamic configuration
async function dynamicImport(tableName: string, file: File) {
  try {
    // Step 1: Get table configuration
    const config = await discoverAndSetupTable(tableName);
    
    if (!config.canImport) {
      throw new Error('Import not permitted for this table');
    }
    
    // Step 2: Create form data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('table_name', tableName);
    formData.append('import_options', JSON.stringify({
      format: 'csv',
      has_headers: true,
      skip_empty_rows: true
    }));
    formData.append('field_mappings', JSON.stringify([]));
    formData.append('requires_approval', String(config.permissions.import_permission.requires_approval));
    
    // Step 3: Upload and create import job
    const uploadResponse = await fetch('/api/v1/data/import/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: formData
    });
    
    if (!uploadResponse.ok) {
      throw new Error('Upload failed');
    }
    
    const importJob = await uploadResponse.json();
    
    // Step 4: Validate data
    const validateResponse = await fetch(`/api/v1/data/import/${importJob.job_id}/validate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    });
    
    const validationResult = await validateResponse.json();
    
    if (!validationResult.isValid) {
      console.warn('Validation errors:', validationResult.errors);
      return { success: false, errors: validationResult.errors };
    }
    
    // Step 5: Start import
    const startResponse = await fetch(`/api/v1/data/import/${importJob.job_id}/start`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    });
    
    const startResult = await startResponse.json();
    
    // Step 6: Monitor progress
    const finalResult = await monitorImportProgress(importJob.job_id);
    
    return { success: true, result: finalResult };
    
  } catch (error) {
    console.error('Import failed:', error);
    return { success: false, error: error.message };
  }
}

// Monitor import progress
async function monitorImportProgress(jobId: string) {
  return new Promise((resolve, reject) => {
    const checkProgress = async () => {
      try {
        const response = await fetch(`/api/v1/data/import/${jobId}/status`);
        const status = await response.json();
        
        if (status.status === 'COMPLETED') {
          resolve(status);
        } else if (status.status === 'FAILED') {
          reject(new Error(status.error_message));
        } else {
          // Still processing, check again in 2 seconds
          setTimeout(checkProgress, 2000);
        }
      } catch (error) {
        reject(error);
      }
    };
    
    checkProgress();
  });
}
```

### 3. Dynamic Export with Filtering

```typescript
// Complete export workflow with dynamic table selection
async function dynamicExport(tableName: string, exportOptions: ExportOptions) {
  try {
    // Step 1: Get table configuration
    const config = await discoverAndSetupTable(tableName);
    
    if (!config.canExport) {
      throw new Error('Export not permitted for this table');
    }
    
    // Step 2: Validate export options against permissions
    const maxRows = config.permissions.export_permission.max_rows_per_export;
    if (exportOptions.estimatedRows > maxRows) {
      throw new Error(`Export exceeds maximum allowed rows (${maxRows})`);
    }
    
    const allowedFormats = config.permissions.export_permission.allowed_formats;
    if (!allowedFormats.includes(exportOptions.format)) {
      throw new Error(`Format ${exportOptions.format} not allowed`);
    }
    
    // Step 3: Filter columns by permissions
    const allowedColumns = config.permissions.export_permission.allowed_columns;
    if (allowedColumns.length > 0) {
      exportOptions.selected_columns = exportOptions.selected_columns.filter(col => 
        allowedColumns.includes(col)
      );
    }
    
    // Step 4: Create export job
    const exportRequest = {
      table_name: tableName,
      export_format: exportOptions.format,
      selected_columns: exportOptions.selected_columns,
      filters: exportOptions.filters || [],
      export_options: {
        include_headers: exportOptions.includeHeaders ?? true,
        date_format: exportOptions.dateFormat ?? 'iso',
        delimiter: exportOptions.delimiter ?? ',',
        encoding: exportOptions.encoding ?? 'utf-8'
      }
    };
    
    const createResponse = await fetch('/api/v1/data/export/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify(exportRequest)
    });
    
    if (!createResponse.ok) {
      throw new Error('Export creation failed');
    }
    
    const exportJob = await createResponse.json();
    
    // Step 5: Monitor export progress
    const finalResult = await monitorExportProgress(exportJob.job_id);
    
    // Step 6: Get download URL
    const downloadResponse = await fetch(`/api/v1/data/export/${exportJob.job_id}/download`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    });
    
    if (!downloadResponse.ok) {
      throw new Error('Download failed');
    }
    
    return {
      success: true,
      downloadUrl: downloadResponse.url,
      filename: finalResult.filename,
      fileSize: finalResult.file_size
    };
    
  } catch (error) {
    console.error('Export failed:', error);
    return { success: false, error: error.message };
  }
}

interface ExportOptions {
  format: 'csv' | 'json' | 'excel' | 'xml' | 'yaml';
  selected_columns: string[];
  filters?: Array<{
    column: string;
    operator: string;
    value: any;
  }>;
  includeHeaders?: boolean;
  dateFormat?: string;
  delimiter?: string;
  encoding?: string;
  estimatedRows: number;
}
```

## Frontend Component Examples

### 1. Custom Table Selector Component

```typescript
// Reusable table selector with schema preview
interface TableSelectorProps {
  onTableSelect: (table: string, schema: TableSchema) => void;
  allowedTables?: string[];
  showSchema?: boolean;
}

export function TableSelector({ onTableSelect, allowedTables, showSchema = true }: TableSelectorProps) {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [schema, setSchema] = useState<TableSchema | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTables();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      fetchSchema(selectedTable);
    }
  }, [selectedTable]);

  const fetchTables = async () => {
    try {
      const response = await fetch('/api/v1/data/tables/available');
      const data = await response.json();
      let availableTables = data.tables;
      
      if (allowedTables) {
        availableTables = availableTables.filter(table => allowedTables.includes(table));
      }
      
      setTables(availableTables);
    } catch (error) {
      console.error('Failed to fetch tables:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchema = async (tableName: string) => {
    try {
      const response = await fetch(`/api/v1/data/tables/${tableName}/schema`);
      const schemaData = await response.json();
      setSchema(schemaData);
      onTableSelect(tableName, schemaData);
    } catch (error) {
      console.error('Failed to fetch schema:', error);
    }
  };

  const handleTableChange = (tableName: string) => {
    setSelectedTable(tableName);
  };

  if (loading) {
    return <Skeleton className="h-10 w-full" />;
  }

  return (
    <div className="space-y-4">
      <Select value={selectedTable} onValueChange={handleTableChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select a table..." />
        </SelectTrigger>
        <SelectContent>
          {tables.map(table => (
            <SelectItem key={table} value={table}>
              {table}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showSchema && schema && (
        <Card>
          <CardHeader>
            <CardTitle>Table Schema: {schema.table_name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {schema.columns.map(col => (
                <div key={col.name} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="font-medium">{col.name}</span>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{col.type}</Badge>
                    {col.primary_key && <Badge variant="default">PK</Badge>}
                    {!col.nullable && <Badge variant="secondary">Required</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Usage
<TableSelector
  onTableSelect={(table, schema) => {
    setSelectedTable(table);
    setTableSchema(schema);
  }}
  allowedTables={['users', 'products', 'orders']}
  showSchema={true}
/>
```

### 2. Permission-Aware Import Component

```typescript
// Import component that adapts to user permissions
interface PermissionAwareImportProps {
  tableName: string;
  onImportComplete: (result: ImportResult) => void;
}

export function PermissionAwareImport({ tableName, onImportComplete }: PermissionAwareImportProps) {
  const [permissions, setPermissions] = useState<ImportPermissions | null>(null);
  const [schema, setSchema] = useState<TableSchema | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tableName) {
      fetchTableInfo();
    }
  }, [tableName]);

  const fetchTableInfo = async () => {
    try {
      const [schemaResponse, permissionsResponse] = await Promise.all([
        fetch(`/api/v1/data/tables/${tableName}/schema`),
        fetch(`/api/v1/data/tables/${tableName}/permissions`)
      ]);

      const schemaData = await schemaResponse.json();
      const permissionsData = await permissionsResponse.json();

      setSchema(schemaData);
      setPermissions(permissionsData.import_permission);
    } catch (error) {
      console.error('Failed to fetch table info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (data: any[], options: ImportOptions) => {
    if (!permissions?.can_import) {
      throw new Error('Import not permitted');
    }

    if (data.length > permissions.max_rows_per_import) {
      throw new Error(`Too many rows. Maximum allowed: ${permissions.max_rows_per_import}`);
    }

    // Proceed with import...
    const result = await dynamicImport(tableName, options.file);
    onImportComplete(result);
  };

  if (loading) {
    return <div>Loading permissions...</div>;
  }

  if (!permissions?.can_import) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to import data into this table.
        </AlertDescription>
      </Alert>
    );
  }

  const columns = schema?.columns.map(col => ({
    key: col.name,
    label: col.name,
    type: mapSqlType(col.type),
    required: !col.nullable || col.primary_key
  })) || [];

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Import Limits: {permissions.max_file_size_mb}MB max file size, 
          {permissions.max_rows_per_import.toLocaleString()} max rows
        </AlertDescription>
      </Alert>

      <DataImport
        tableName={tableName}
        columns={columns}
        onImport={handleImport}
        maxFileSize={permissions.max_file_size_mb * 1024 * 1024}
        maxRows={permissions.max_rows_per_import}
        allowedFormats={permissions.allowed_formats}
        permissions={{
          canImport: permissions.can_import,
          canValidate: permissions.can_validate,
          canPreview: permissions.can_preview,
          requireApproval: permissions.requires_approval
        }}
      />
    </div>
  );
}
```

## Advanced Use Cases

### 1. Bulk Table Operations

```typescript
// Process multiple tables simultaneously
async function bulkTableOperation(
  tables: string[],
  operation: 'import' | 'export',
  options: any
) {
  const results = [];
  
  for (const tableName of tables) {
    try {
      console.log(`Processing ${operation} for table: ${tableName}`);
      
      const config = await discoverAndSetupTable(tableName);
      
      if (operation === 'import' && config.canImport) {
        const result = await dynamicImport(tableName, options.file);
        results.push({ table: tableName, success: true, result });
      } else if (operation === 'export' && config.canExport) {
        const result = await dynamicExport(tableName, options);
        results.push({ table: tableName, success: true, result });
      } else {
        results.push({ 
          table: tableName, 
          success: false, 
          error: `${operation} not permitted` 
        });
      }
    } catch (error) {
      results.push({ 
        table: tableName, 
        success: false, 
        error: error.message 
      });
    }
  }
  
  return results;
}

// Usage
const bulkResults = await bulkTableOperation(
  ['users', 'products', 'orders'],
  'export',
  { format: 'csv', selected_columns: ['id', 'name', 'created_at'] }
);

console.log('Bulk operation results:', bulkResults);
```

### 2. Smart Field Mapping

```typescript
// Intelligent field mapping based on column names and types
function smartFieldMapping(sourceHeaders: string[], targetColumns: TableColumn[]): FieldMapping[] {
  const mappings: FieldMapping[] = [];
  
  for (const header of sourceHeaders) {
    const bestMatch = findBestColumnMatch(header, targetColumns);
    if (bestMatch) {
      mappings.push({
        sourceColumn: header,
        targetColumn: bestMatch.name,
        transform: determineTransform(header, bestMatch),
        confidence: calculateMatchConfidence(header, bestMatch)
      });
    }
  }
  
  return mappings.sort((a, b) => b.confidence - a.confidence);
}

function findBestColumnMatch(header: string, columns: TableColumn[]): TableColumn | null {
  const headerLower = header.toLowerCase();
  
  // Exact match
  const exactMatch = columns.find(col => col.name.toLowerCase() === headerLower);
  if (exactMatch) return exactMatch;
  
  // Partial match
  const partialMatch = columns.find(col => 
    col.name.toLowerCase().includes(headerLower) || 
    headerLower.includes(col.name.toLowerCase())
  );
  if (partialMatch) return partialMatch;
  
  // Semantic match
  const semanticMatches = {
    'email': ['email', 'email_address', 'mail'],
    'phone': ['phone', 'telephone', 'mobile', 'contact'],
    'name': ['name', 'title', 'label', 'first_name', 'last_name'],
    'id': ['id', 'identifier', 'key']
  };
  
  for (const [key, variations] of Object.entries(semanticMatches)) {
    if (variations.some(v => headerLower.includes(v) || v.includes(headerLower))) {
      const match = columns.find(col => col.name.toLowerCase().includes(key));
      if (match) return match;
    }
  }
  
  return null;
}

function determineTransform(header: string, column: TableColumn): string {
  const headerLower = header.toLowerCase();
  const columnType = column.type.toLowerCase();
  
  if (columnType.includes('int') && !headerLower.includes('id')) {
    return 'number';
  }
  
  if (headerLower.includes('email')) {
    return 'lower';
  }
  
  if (headerLower.includes('date') || headerLower.includes('time')) {
    return 'date';
  }
  
  if (headerLower.includes('name') || headerLower.includes('title')) {
    return 'trim';
  }
  
  return 'none';
}

function calculateMatchConfidence(header: string, column: TableColumn): number {
  const headerLower = header.toLowerCase();
  const columnLower = column.name.toLowerCase();
  
  if (headerLower === columnLower) return 1.0;
  if (headerLower.includes(columnLower) || columnLower.includes(headerLower)) return 0.8;
  
  // Add more sophisticated matching logic here
  return 0.5;
}
```

### 3. Real-time Progress Tracking

```typescript
// Real-time progress tracking with WebSocket
class ImportProgressTracker {
  private socket: WebSocket | null = null;
  private callbacks: Map<string, (progress: ProgressUpdate) => void> = new Map();

  connect() {
    this.socket = new WebSocket(`ws://localhost:8000/api/v1/data/progress`);
    
    this.socket.onmessage = (event) => {
      const update: ProgressUpdate = JSON.parse(event.data);
      const callback = this.callbacks.get(update.job_id);
      if (callback) {
        callback(update);
      }
    };
  }

  trackJob(jobId: string, callback: (progress: ProgressUpdate) => void) {
    this.callbacks.set(jobId, callback);
  }

  stopTracking(jobId: string) {
    this.callbacks.delete(jobId);
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

// Usage
const tracker = new ImportProgressTracker();
tracker.connect();

tracker.trackJob('import-job-123', (progress) => {
  console.log(`Import progress: ${progress.percentage}%`);
  console.log(`Processed: ${progress.processed_rows}/${progress.total_rows}`);
  
  if (progress.status === 'completed') {
    console.log('Import completed successfully!');
    tracker.stopTracking('import-job-123');
  }
});
```

## Troubleshooting Examples

### 1. Permission Issues

```typescript
// Debug permission issues
async function debugPermissions(tableName: string) {
  try {
    const response = await fetch(`/api/v1/data/tables/${tableName}/permissions`);
    const permissions = await response.json();
    
    console.log('Permission Debug:', {
      table: tableName,
      canImport: permissions.import_permission.can_import,
      canExport: permissions.export_permission.can_export,
      maxFileSize: permissions.import_permission.max_file_size_mb,
      maxRows: permissions.export_permission.max_rows_per_export,
      allowedFormats: permissions.import_permission.allowed_formats,
      requiresApproval: permissions.import_permission.requires_approval
    });
    
    // Check for common issues
    if (!permissions.import_permission.can_import) {
      console.warn('❌ Import not permitted - contact administrator');
    }
    
    if (permissions.import_permission.max_file_size_mb < 10) {
      console.warn('⚠️ Low file size limit - consider requesting increase');
    }
    
    if (permissions.import_permission.requires_approval) {
      console.info('ℹ️ Imports require approval - factor in approval time');
    }
    
    return permissions;
  } catch (error) {
    console.error('Permission check failed:', error);
    throw error;
  }
}
```

### 2. Schema Validation Issues

```typescript
// Debug schema validation problems
async function debugSchemaValidation(tableName: string, sampleData: any[]) {
  try {
    const schema = await fetch(`/api/v1/data/tables/${tableName}/schema`).then(r => r.json());
    
    console.log('Schema Debug:', {
      table: tableName,
      columns: schema.columns.length,
      primaryKeys: schema.primary_keys,
      requiredFields: schema.columns.filter(col => !col.nullable).map(col => col.name)
    });
    
    // Validate sample data against schema
    const issues = [];
    
    for (const row of sampleData.slice(0, 3)) {
      for (const column of schema.columns) {
        const value = row[column.name];
        
        // Check required fields
        if (!column.nullable && (value === null || value === undefined || value === '')) {
          issues.push(`Missing required field: ${column.name}`);
        }
        
        // Check data types
        if (value !== null && value !== undefined && value !== '') {
          const typeIssue = validateDataType(value, column.type);
          if (typeIssue) {
            issues.push(`Type mismatch in ${column.name}: ${typeIssue}`);
          }
        }
      }
    }
    
    if (issues.length > 0) {
      console.warn('Schema validation issues:', issues);
    } else {
      console.log('✅ Schema validation passed');
    }
    
    return { schema, issues };
  } catch (error) {
    console.error('Schema validation failed:', error);
    throw error;
  }
}

function validateDataType(value: any, sqlType: string): string | null {
  const type = sqlType.toLowerCase();
  
  if (type.includes('int') && isNaN(Number(value))) {
    return `Expected integer, got: ${typeof value}`;
  }
  
  if (type.includes('bool') && typeof value !== 'boolean' && !['true', 'false', '1', '0'].includes(String(value).toLowerCase())) {
    return `Expected boolean, got: ${typeof value}`;
  }
  
  if (type.includes('date') && isNaN(Date.parse(value))) {
    return `Expected date, got invalid date: ${value}`;
  }
  
  return null;
}
```

### 3. API Connectivity Issues

```typescript
// Debug API connectivity and response issues
async function debugApiConnectivity() {
  const endpoints = [
    '/api/v1/data/tables/available',
    '/api/v1/data/health',
    '/api/health'
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      const start = Date.now();
      const response = await fetch(endpoint);
      const duration = Date.now() - start;
      
      results.push({
        endpoint,
        status: response.status,
        ok: response.ok,
        duration: `${duration}ms`,
        contentType: response.headers.get('content-type')
      });
      
      if (response.ok) {
        console.log(`✅ ${endpoint} - ${response.status} (${duration}ms)`);
      } else {
        console.warn(`⚠️ ${endpoint} - ${response.status} (${duration}ms)`);
      }
    } catch (error) {
      results.push({
        endpoint,
        error: error.message,
        available: false
      });
      console.error(`❌ ${endpoint} - ${error.message}`);
    }
  }
  
  return results;
}

// Usage
await debugApiConnectivity();
```

These examples provide comprehensive guidance for implementing and troubleshooting the Dynamic Import/Export system in various scenarios.