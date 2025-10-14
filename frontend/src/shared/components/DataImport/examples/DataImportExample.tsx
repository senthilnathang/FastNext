'use client';

import React, { useState } from 'react';
import {
  DataImport,
  PermissionManager,
  useDataImport
} from '../index';
import type {
  ImportColumn,
  ImportOptions,
  UserImportPermissions,
  ImportPermission
} from '../types';

// Example user data structure

// Example columns for user import
const UserImportColumns: ImportColumn[] = [
  {
    key: 'name',
    label: 'Full Name',
    type: 'string',
    required: true,
    validation: [
      { type: 'required', message: 'Name is required' },
      { type: 'min', value: 2, message: 'Name must be at least 2 characters' }
    ]
  },
  {
    key: 'email',
    label: 'Email Address',
    type: 'email',
    required: true,
    unique: true,
    validation: [
      { type: 'required', message: 'Email is required' },
      { type: 'email', message: 'Invalid email format' }
    ]
  },
  {
    key: 'role',
    label: 'User Role',
    type: 'string',
    required: true,
    defaultValue: 'user',
    validation: [
      {
        type: 'custom',
        message: 'Role must be admin, manager, user, or viewer',
        validator: (value) => ['admin', 'manager', 'user', 'viewer'].includes(value)
      }
    ]
  },
  {
    key: 'department',
    label: 'Department',
    type: 'string'
  },
  {
    key: 'active',
    label: 'Active Status',
    type: 'boolean',
    defaultValue: true
  },
  {
    key: 'createdAt',
    label: 'Creation Date',
    type: 'date',
    defaultValue: () => new Date().toISOString()
  }
];

// Example users with permissions
const ExampleUsers: UserImportPermissions[] = [
  {
    userId: '1',
    username: 'admin',
    email: 'admin@example.com',
    role: 'admin',
    permissions: {
      canImport: true,
      canValidate: true,
      canPreview: true,
      maxFileSize: 100 * 1024 * 1024, // 100MB
      maxRows: 100000,
      allowedFormats: ['csv', 'json', 'excel', 'xml'],
      requireApproval: false
    },
    lastImport: '2024-01-15T10:30:00Z',
    importCount: 25
  },
  {
    userId: '2',
    username: 'manager',
    email: 'manager@example.com',
    role: 'manager',
    permissions: {
      canImport: true,
      canValidate: true,
      canPreview: true,
      maxFileSize: 50 * 1024 * 1024, // 50MB
      maxRows: 50000,
      allowedFormats: ['csv', 'json', 'excel'],
      requireApproval: false
    },
    lastImport: '2024-01-20T14:15:00Z',
    importCount: 12
  },
  {
    userId: '3',
    username: 'john.doe',
    email: 'john.doe@example.com',
    role: 'user',
    permissions: {
      canImport: true,
      canValidate: true,
      canPreview: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxRows: 10000,
      allowedFormats: ['csv', 'json'],
      requireApproval: true
    },
    lastImport: '2024-01-18T09:45:00Z',
    importCount: 5
  },
  {
    userId: '4',
    username: 'viewer',
    email: 'viewer@example.com',
    role: 'viewer',
    permissions: {
      canImport: false,
      canValidate: false,
      canPreview: true,
      maxFileSize: 0,
      maxRows: 0,
      requireApproval: false
    },
    importCount: 0
  }
];

// Example 1: Basic DataImport Component
export function BasicImportExample() {
  const handleImport = async (data: Record<string, any>[], options: ImportOptions) => {
    // Simulate API call

    return new Promise<any>((resolve) => {
      setTimeout(() => {
        resolve({
          status: 'success',
          importedRows: data.length,
          message: `Successfully imported ${data.length} users`
        });
      }, 2000);
    });
  };

  const handleValidate = async (data: Record<string, any>[], mappings: any[]) => {
    // Simulate validation

    return new Promise<any>((resolve) => {
      setTimeout(() => {
        const errors = data.filter(row => !row.email || !row.name).map((row, index) => ({
          row: index + 1,
          message: 'Missing required fields',
          severity: 'error' as const,
          field: 'email'
        }));

        resolve({
          isValid: errors.length === 0,
          totalRows: data.length,
          validRows: data.length - errors.length,
          errorRows: errors.length,
          errors,
          warnings: []
        });
      }, 1000);
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Basic User Import</h3>
      <p className="text-gray-600 dark:text-gray-400">
        Full-featured import dialog with field mapping, validation, and progress tracking.
      </p>

      <DataImport
        tableName="Users"
        columns={UserImportColumns}
        onImport={handleImport}
        onValidate={handleValidate}
        maxFileSize={50 * 1024 * 1024} // 50MB
        maxRows={10000}
        allowedFormats={['csv', 'json', 'excel']}
        showPreview={true}
        requireValidation={true}
      />
    </div>
  );
}

// Example 2: DataTable Integration
export function DataTableImportExample() {

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">DataTable Import</h3>
      <p className="text-gray-600 dark:text-gray-400">
        Import component designed for data tables with quick import options.
      </p>

      {/* <DataTableImport
        tableName="Users"
        columns={tableColumns}
        onImport={handleImport}
        permissions={adminPermissions}
        allowedFormats={['csv', 'json', 'excel']}
        showAdvanced={true}
      /> */}
      <p>DataTableImport component is commented out</p>
    </div>
  );
}

// Example 3: Simple Import Buttons
export function SimpleImportExample() {

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Simple Import Buttons</h3>
      <p className="text-gray-600 dark:text-gray-400">
        Individual import buttons for specific formats.
      </p>

      <div className="flex space-x-2">
        {/* <SimpleImportButton
          tableName="Users"
          columns={tableColumns}
          onImport={handleImport}
          format="csv"
        /> */}

        {/* <SimpleImportButton
          tableName="Users"
          columns={tableColumns}
          onImport={handleImport}
          format="json"
        /> */}

        {/* <SimpleImportButton
          tableName="Users"
          columns={tableColumns}
          onImport={handleImport}
          format="excel"
        /> */}
        <p>SimpleImportButton components are commented out</p>
      </div>
    </div>
  );
}

// Example 4: Permission Management
export function PermissionManagementExample() {
  const [users, setUsers] = useState<UserImportPermissions[]>(ExampleUsers);

  const handleUpdatePermissions = async (userId: string, permissions: ImportPermission) => {

    setUsers(prev =>
      prev.map(user =>
        user.userId === userId
          ? { ...user, permissions }
          : user
      )
    );

    return Promise.resolve();
  };

  const handleAddUser = () => {
    const newUser: UserImportPermissions = {
      userId: Date.now().toString(),
      username: 'new.user',
      email: 'new.user@example.com',
      role: 'user',
      permissions: {
        canImport: true,
        canValidate: true,
        canPreview: true,
        maxFileSize: 10 * 1024 * 1024,
        maxRows: 10000,
        allowedFormats: ['csv', 'json'],
        requireApproval: true
      },
      importCount: 0
    };

    setUsers(prev => [...prev, newUser]);
  };

  const handleRemoveUser = (userId: string) => {
    setUsers(prev => prev.filter(user => user.userId !== userId));
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Permission Management</h3>
      <p className="text-gray-600 dark:text-gray-400">
        Manage user permissions for import functionality.
      </p>

      <PermissionManager
        users={users}
        currentUser={users[0]} // Admin user
        onUpdatePermissions={handleUpdatePermissions}
        onAddUser={handleAddUser}
        onRemoveUser={handleRemoveUser}
        availableFormats={['csv', 'json', 'excel', 'xml']}
        availableTables={['users', 'products', 'orders', 'customers']}
      />
    </div>
  );
}

// Example 5: Using the Import Hook
export function ImportHookExample() {
  const {
    selectedFile,
    setSelectedFile,
    isParsing,
    parsedData,
    parseError,
    fieldMappings,
    validationResults,
    isImporting,
    parseFile,
    validateData,
    startImport,
    clearState
  } = useDataImport({
    columns: UserImportColumns,
    maxFileSize: 10 * 1024 * 1024,
    maxRows: 5000
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      await parseFile(file);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Import Hook Usage</h3>
      <p className="text-gray-600 dark:text-gray-400">
        Direct usage of the useDataImport hook for custom implementations.
      </p>

      <div className="space-y-4 p-4 border rounded-lg">
        <div>
          <input
            type="file"
            onChange={handleFileSelect}
            accept=".csv,.json,.xlsx,.xml"
            className="mb-2"
          />
          {selectedFile && (
            <p className="text-sm text-gray-600">
              Selected: {selectedFile.name}
            </p>
          )}
        </div>

        {isParsing && (
          <p className="text-blue-600">Parsing file...</p>
        )}

        {parseError && (
          <p className="text-red-600">Error: {parseError}</p>
        )}

        {parsedData && (
          <div className="space-y-2">
            <p className="text-green-600">
              File parsed successfully! Found {parsedData.totalRows} rows with columns: {parsedData.headers.join(', ')}
            </p>

            {fieldMappings.length > 0 && (
              <div>
                <button
                  onClick={() => validateData()}
                  className="px-3 py-1 bg-blue-600 text-white rounded mr-2"
                >
                  Validate Data
                </button>

                {validationResults && (
                  <button
                    onClick={() => startImport({
                      format: 'csv',
                      hasHeaders: true,
                      skipEmptyRows: true,
                      onDuplicate: 'skip'
                    })}
                    disabled={!validationResults.isValid || isImporting}
                    className="px-3 py-1 bg-green-600 text-white rounded disabled:opacity-50"
                  >
                    {isImporting ? 'Importing...' : 'Start Import'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {validationResults && (
          <div className="text-sm">
            <p>Validation Results:</p>
            <p>Total: {validationResults.totalRows}</p>
            <p>Valid: {validationResults.validRows}</p>
            <p>Errors: {validationResults.errorRows}</p>
          </div>
        )}

        <button
          onClick={clearState}
          className="px-3 py-1 bg-gray-600 text-white rounded"
        >
          Clear State
        </button>
      </div>
    </div>
  );
}

// Main showcase component
export function DataImportShowcase() {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">Data Import Components</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Comprehensive data import system with file parsing, field mapping, validation, and permission management.
        </p>
      </div>

      <BasicImportExample />
      {/* <DataTableImportExample /> */}
      <SimpleImportExample />
      <PermissionManagementExample />
      <ImportHookExample />

      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
          Supported Import Features
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700 dark:text-blue-300">
          <div>
            <h5 className="font-medium mb-2">File Formats:</h5>
            <ul className="space-y-1">
              <li>• CSV - Comma-separated values with custom delimiters</li>
              <li>• JSON - JavaScript Object Notation with nested objects</li>
              <li>• Excel - Microsoft Excel (.xlsx/.xls) with multiple sheets</li>
              <li>• XML - Extensible Markup Language with attributes</li>
            </ul>
          </div>
          <div>
            <h5 className="font-medium mb-2">Features:</h5>
            <ul className="space-y-1">
              <li>• Drag & drop file upload</li>
              <li>• Automatic field mapping with manual override</li>
              <li>• Data validation with custom rules</li>
              <li>• Permission-based access control</li>
              <li>• Progress tracking and error reporting</li>
              <li>• Batch processing with duplicate handling</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
