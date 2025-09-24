'use client'

import * as React from 'react'
import { UserDataTableExample } from '@/shared/components/data-table/examples/UserDataTable'
import { RolesDataTableExample } from '@/shared/components/data-table/examples/RolesDataTable'
import { PermissionsDataTableExample } from '@/shared/components/data-table/examples/PermissionsDataTable'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'

export default function DataTablesPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Data Tables</h1>
        <p className="text-muted-foreground">
          Advanced data tables with pagination, filtering, sorting, column selection, and export functionality.
        </p>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="products">Products (Coming Soon)</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Users Management</CardTitle>
              <CardDescription>
                Complete user management with advanced table features including:
              </CardDescription>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>• Multi-column sorting and filtering</li>
                <li>• Row selection with bulk actions</li>
                <li>• Column visibility controls</li>
                <li>• Export to CSV, Excel, or JSON</li>
                <li>• Responsive pagination</li>
                <li>• Global search across all columns</li>
                <li>• Individual row actions (view, edit, delete)</li>
              </ul>
            </CardHeader>
            <CardContent>
              <UserDataTableExample />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Roles Management</CardTitle>
              <CardDescription>
                Role management table with advanced features including:
              </CardDescription>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>• System vs custom role differentiation</li>
                <li>• Permission summary with badges</li>
                <li>• User count tracking</li>
                <li>• Status management (active/inactive)</li>
                <li>• Protected system role handling</li>
                <li>• Bulk operations with safety checks</li>
              </ul>
            </CardHeader>
            <CardContent>
              <RolesDataTableExample />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Permissions Management</CardTitle>
              <CardDescription>
                Permission management table with comprehensive features including:
              </CardDescription>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>• Category-based organization and filtering</li>
                <li>• Action type indicators with color coding</li>
                <li>• Automatic permission key generation</li>
                <li>• System permission protection</li>
                <li>• Resource-based grouping</li>
                <li>• Advanced search across all fields</li>
              </ul>
            </CardHeader>
            <CardContent>
              <PermissionsDataTableExample />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Products Table</CardTitle>
              <CardDescription>
                Product management table will be implemented here using the same DataTable component.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                Coming Soon - Products DataTable
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Implementation Guide</CardTitle>
          <CardDescription>
            How to use the DataTable component with your models
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm space-y-4">
            <div>
              <h4 className="font-semibold mb-2">1. Define your data structure</h4>
              <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">
{`interface Product {
  id: string
  name: string
  price: number
  category: string
  stock: number
  status: 'active' | 'inactive'
  createdAt: Date
}`}
              </pre>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">2. Configure columns</h4>
              <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">
{`const columns: ColumnDef<Product>[] = [
  {
    accessorKey: 'name',
    header: 'Product Name',
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue('name')}</div>
    ),
  },
  {
    accessorKey: 'price',
    header: 'Price',
    cell: ({ row }) => {
      const price = parseFloat(row.getValue('price'))
      return <div>$\{price.toFixed(2)}</div>
    },
  },
  // ... more columns
]`}
              </pre>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">3. Use the DataTable component</h4>
              <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">
{`<DataTable
  columns={columns}
  data={products}
  enableRowSelection={true}
  enableSorting={true}
  enableFiltering={true}
  enableColumnVisibility={true}
  onAdd={handleAddProduct}
  onDeleteSelected={handleDeleteSelected}
  onExport={handleExport}
  pageSize={10}
/>`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}