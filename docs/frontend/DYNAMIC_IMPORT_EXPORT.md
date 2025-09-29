# Dynamic Import/Export Frontend Guide

## Overview

FastNext includes dynamic import/export pages in the settings section that allow users to work with any database table without hardcoded configurations.

## Pages Structure

```
src/app/settings/
├── data-import/
│   └── page.tsx           # Dynamic import page
├── data-export/
│   └── page.tsx           # Dynamic export page  
└── layout.tsx             # Updated settings navigation
```

## Features

### 🔍 Dynamic Table Discovery
- Automatically fetches all available database tables
- Real-time schema detection with column types and constraints
- Permission-based access control for each table
- Sample data preview for better understanding

### 📥 Data Import Page (`/settings/data-import`)

#### Key Components
- **Table Selection Dropdown**: Choose from all available database tables
- **Schema Visualization**: Display table structure, columns, and data types  
- **Permission Display**: Show user's import permissions and limits
- **Integrated DataImport Component**: Full import functionality with field mapping
- **Real-time Validation**: Column mapping based on actual table schema

#### State Management
```typescript
const [availableTables, setAvailableTables] = useState<string[]>([]);
const [selectedTable, setSelectedTable] = useState<string>('');
const [tableSchema, setTableSchema] = useState<TableInfo | null>(null);
const [tablePermissions, setTablePermissions] = useState<TablePermissions | null>(null);
```

#### API Integration
```typescript
// Fetch available tables
const fetchAvailableTables = async () => {
  const response = await fetch('/api/v1/data/tables/available');
  const data = await response.json();
  setAvailableTables(data.tables || []);
};

// Fetch table schema when table is selected
const fetchTableSchema = async (tableName: string) => {
  const response = await fetch(`/api/v1/data/tables/${tableName}/schema`);
  const data = await response.json();
  setTableSchema(data);
};

// Fetch table permissions
const fetchTablePermissions = async (tableName: string) => {
  const response = await fetch(`/api/v1/data/tables/${tableName}/permissions`);
  const data = await response.json();
  setTablePermissions(data);
};
```

#### Column Mapping
```typescript
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

const mapSqlTypeToImportType = (sqlType: string): string => {
  const type = sqlType.toLowerCase();
  if (type.includes('int') || type.includes('serial')) return 'number';
  if (type.includes('decimal') || type.includes('numeric') || type.includes('float') || type.includes('double')) return 'number';
  if (type.includes('bool')) return 'boolean';
  if (type.includes('date') || type.includes('time')) return 'date';
  if (type.includes('json')) return 'json';
  return 'string';
};
```

### 📤 Data Export Page (`/settings/data-export`)

#### Key Components
- **Table Selection Dropdown**: Choose from all available database tables
- **Schema Information**: Complete table structure with column details
- **Data Preview**: Live data preview with search and filtering
- **Permission Controls**: Respects user's export permissions and column restrictions
- **Integrated DataExport Component**: Full export functionality

#### Advanced Features
```typescript
// Data filtering and search
const [searchTerm, setSearchTerm] = useState('');
const [rowLimit, setRowLimit] = useState<number>(1000);

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
```

#### Export Column Configuration
```typescript
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
```

## Settings Navigation

### Updated Layout
```typescript
const settingsNav = [
  {
    title: 'General',
    href: '/settings',
    icon: Settings,
    description: 'General settings and preferences'
  },
  {
    title: 'Data Import',
    href: '/settings/data-import',
    icon: Upload,
    description: 'Import data into database tables',
    badge: 'New'
  },
  {
    title: 'Data Export',
    href: '/settings/data-export',
    icon: Download,
    description: 'Export data from database tables',
    badge: 'New'
  }
];
```

### Navigation Features
- **Active State Detection**: Highlights current page
- **Rich Descriptions**: Detailed descriptions for each section
- **Badge System**: "New" badges for recently added features
- **Icon Integration**: Clear visual indicators for each section

## Component Integration

### DataImport Component Usage
```typescript
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
    allowedFormats: tablePermissions.import_permission.allowed_formats
  }}
  embedded={true}
/>
```

### DataExport Component Usage
```typescript
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
```

## Error Handling

### Permission Checks
```typescript
{tablePermissions && !tablePermissions.import_permission.can_import && (
  <Alert>
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>
      You don't have permission to import data into the "{selectedTable}" table. 
      Please contact your administrator to request import permissions.
    </AlertDescription>
  </Alert>
)}
```

### Loading States
```typescript
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
```

### Error Boundaries
```typescript
{error && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>{error}</AlertDescription>
  </Alert>
)}
```

## Best Practices

### 1. Performance Optimization
- Use `useMemo` for expensive calculations (column mapping, data filtering)
- Implement proper loading states for API calls
- Debounce search inputs to reduce API calls

### 2. User Experience
- Provide clear feedback for all user actions
- Show loading states during API calls
- Display helpful error messages with actionable guidance
- Use progressive disclosure (show details only when needed)

### 3. Accessibility
- Proper ARIA labels for form elements
- Keyboard navigation support
- Screen reader friendly descriptions
- High contrast support

### 4. Type Safety
- Define proper TypeScript interfaces for all data structures
- Use strict typing for API responses
- Implement proper error type definitions

## Testing

### Component Testing
```typescript
// Test table selection functionality
describe('DataImportPage', () => {
  it('should fetch and display available tables', async () => {
    render(<DataImportPage />);
    await waitFor(() => {
      expect(screen.getByText('users')).toBeInTheDocument();
    });
  });

  it('should load schema when table is selected', async () => {
    render(<DataImportPage />);
    fireEvent.click(screen.getByText('users'));
    await waitFor(() => {
      expect(screen.getByText('Table Structure')).toBeInTheDocument();
    });
  });
});
```

### API Integration Testing
```typescript
// Mock API responses for testing
const mockTables = ['users', 'products', 'orders'];
const mockSchema = {
  table_name: 'users',
  columns: [
    { name: 'id', type: 'INTEGER', nullable: false, primary_key: true }
  ]
};

// Test API integration
beforeEach(() => {
  fetchMock.get('/api/v1/data/tables/available', { tables: mockTables });
  fetchMock.get('/api/v1/data/tables/users/schema', mockSchema);
});
```

## Deployment Considerations

### Environment Configuration
- Ensure backend API endpoints are accessible
- Configure proper CORS settings for API calls
- Set up authentication tokens for API requests

### Performance Monitoring
- Monitor API response times for table discovery
- Track user interactions with import/export features
- Implement analytics for feature usage

### Security
- Validate all API responses on the frontend
- Implement proper error handling for unauthorized access
- Use secure token management for API authentication