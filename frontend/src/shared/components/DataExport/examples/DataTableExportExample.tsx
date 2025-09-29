'use client';

import React from 'react';
import {
  DataExport,
  DataTableExport,
  SimpleExportButton,
  DataTableIntegration,
  useDataTableExport
} from '../index';
import type { ExportColumn } from '../types';

// Example usage with basic data
const ExampleData = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', active: true, createdAt: new Date('2024-01-15') },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User', active: true, createdAt: new Date('2024-02-10') },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'User', active: false, createdAt: new Date('2024-03-05') },
];

const ExampleColumns: ExportColumn[] = [
  { key: 'id', label: 'ID', type: 'number' },
  { key: 'name', label: 'Full Name', type: 'string' },
  { key: 'email', label: 'Email Address', type: 'string' },
  { key: 'role', label: 'Role', type: 'string' },
  { key: 'active', label: 'Active', type: 'boolean' },
  { key: 'createdAt', label: 'Created Date', type: 'date' },
];

// Example 1: Basic DataExport Component
export function BasicExportExample() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Basic Export</h3>
      <p className="text-gray-600 dark:text-gray-400">
        Full-featured export dialog with field selection and format options.
      </p>
      
      <DataExport
        tableName="Users"
        columns={ExampleColumns}
        data={ExampleData}
        totalRows={ExampleData.length}
        allowedFormats={['csv', 'json', 'excel', 'xml', 'yaml']}
        showPreview={false} // No server-side preview in this example
      />
    </div>
  );
}

// Example 2: DataTable Integration
export function DataTableExportExample() {
  const tableColumns = [
    { id: 'name', label: 'Name', accessor: 'name', type: 'string' },
    { id: 'email', label: 'Email', accessor: 'email', type: 'string' },
    { id: 'role', label: 'Role', accessor: 'role', type: 'string' },
    { id: 'active', label: 'Status', accessor: 'active', type: 'boolean' },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">DataTable Export</h3>
      <p className="text-gray-600 dark:text-gray-400">
        Export component designed for data tables with quick export options.
      </p>
      
      <DataTableExport
        data={ExampleData}
        columns={tableColumns}
        tableName="Users"
        allowedFormats={['csv', 'json', 'excel']}
        showAdvanced={true}
      />
    </div>
  );
}

// Example 3: Simple Export Buttons
export function SimpleExportExample() {
  const tableColumns = [
    { id: 'name', label: 'Name', accessor: 'name', type: 'string' },
    { id: 'email', label: 'Email', accessor: 'email', type: 'string' },
    { id: 'role', label: 'Role', accessor: 'role', type: 'string' },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Simple Export Buttons</h3>
      <p className="text-gray-600 dark:text-gray-400">
        Individual export buttons for each format.
      </p>
      
      <div className="flex space-x-2">
        <SimpleExportButton
          data={ExampleData}
          columns={tableColumns}
          tableName="Users"
          format="csv"
        />
        
        <SimpleExportButton
          data={ExampleData}
          columns={tableColumns}
          tableName="Users"
          format="json"
        />
        
        <SimpleExportButton
          data={ExampleData}
          columns={tableColumns}
          tableName="Users"
          format="excel"
        />
      </div>
    </div>
  );
}

// Example 4: React Table Integration (pseudo-code)
export function ReactTableIntegrationExample() {
  // This is a conceptual example - would need actual React Table instance
  const mockTable = {
    getAllColumns: () => [
      { id: 'name', columnDef: { header: 'Name', accessorKey: 'name', meta: { type: 'string' } } },
      { id: 'email', columnDef: { header: 'Email', accessorKey: 'email', meta: { type: 'string' } } },
    ],
    getVisibleLeafColumns: () => [
      { id: 'name' },
      { id: 'email' }
    ],
    getSelectedRowModel: () => ({ rows: [] })
  };

  const { ExportComponent, exportData } = useDataTableExport(
    mockTable,
    ExampleData,
    'Users'
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">React Table Integration</h3>
      <p className="text-gray-600 dark:text-gray-400">
        Seamless integration with React Table for automatic column and selection handling.
      </p>
      
      <div className="space-y-2">
        <ExportComponent allowedFormats={['csv', 'json', 'excel']} />
        
        <button
          onClick={() => {
            const { data, columns, selectedColumns } = exportData('csv');
            console.log('Export data:', { data, columns, selectedColumns });
          }}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Log export data structure
        </button>
      </div>
    </div>
  );
}

// Example 5: Embedded in DataTable Toolbar
export function EmbeddedExportExample() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Embedded Export</h3>
      <p className="text-gray-600 dark:text-gray-400">
        Export functionality embedded in a data table toolbar.
      </p>
      
      {/* Simulated data table toolbar */}
      <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Users Table</span>
          <span className="text-sm text-gray-500">({ExampleData.length} items)</span>
        </div>
        
        <DataExport
          tableName="Users"
          columns={ExampleColumns}
          data={ExampleData}
          allowedFormats={['csv', 'json', 'excel']}
          embedded={true}
          className="flex-shrink-0"
        />
      </div>
    </div>
  );
}

// Main example component showcasing all variations
export function DataExportShowcase() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">Data Export Components</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Comprehensive data export functionality with field selection, multiple formats, and seamless table integration.
        </p>
      </div>

      <BasicExportExample />
      <DataTableExportExample />
      <SimpleExportExample />
      <ReactTableIntegrationExample />
      <EmbeddedExportExample />

      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
          Supported Export Formats
        </h4>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>• <strong>CSV</strong> - Comma-separated values with customizable delimiters</li>
          <li>• <strong>JSON</strong> - JavaScript Object Notation with pretty printing options</li>
          <li>• <strong>Excel</strong> - Microsoft Excel (.xlsx) with formatting and auto-fit columns</li>
          <li>• <strong>XML</strong> - Extensible Markup Language for structured data</li>
          <li>• <strong>YAML</strong> - Human-readable data serialization</li>
        </ul>
      </div>
    </div>
  );
}