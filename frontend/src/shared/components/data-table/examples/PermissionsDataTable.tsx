'use client'

import * as React from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, ArrowUpDown, Pencil, Trash2, Eye, Key, Tag, Zap, Lock } from 'lucide-react'
import { DataTable } from '../DataTable'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Badge } from '@/shared/components/ui/badge'
import { useDataTableExport } from '../hooks/useDataTableExport'
import { useConfirmationDialog } from '@/shared/components/feedback/ConfirmationDialog'
import type { ExportOptions } from '../types'

// Define the Permission type
export interface Permission {
  id: number
  name: string
  description?: string
  category: string
  action: string
  resource?: string
  is_system_permission: boolean
  created_at: string
  updated_at?: string
}

// Sample data for demonstration
const samplePermissions: Permission[] = [
  {
    id: 1,
    name: 'Manage Users',
    description: 'Full access to user management including create, edit, delete, and view users',
    category: 'user',
    action: 'manage',
    resource: 'users',
    is_system_permission: true,
    created_at: '2023-01-15T10:00:00Z',
    updated_at: '2023-06-20T14:30:00Z'
  },
  {
    id: 2,
    name: 'Create Content',
    description: 'Ability to create new content items',
    category: 'content',
    action: 'create',
    resource: 'content',
    is_system_permission: false,
    created_at: '2023-02-10T09:15:00Z'
  },
  {
    id: 3,
    name: 'Edit Content',
    description: 'Ability to modify existing content',
    category: 'content',
    action: 'update',
    resource: 'content',
    is_system_permission: false,
    created_at: '2023-02-10T09:20:00Z'
  },
  {
    id: 4,
    name: 'Delete Content',
    description: 'Ability to permanently delete content',
    category: 'content',
    action: 'delete',
    resource: 'content',
    is_system_permission: false,
    created_at: '2023-02-10T09:25:00Z'
  },
  {
    id: 5,
    name: 'View Reports',
    description: 'Access to view system reports and analytics',
    category: 'reports',
    action: 'read',
    resource: 'reports',
    is_system_permission: false,
    created_at: '2023-03-05T14:10:00Z'
  },
  {
    id: 6,
    name: 'System Configuration',
    description: 'Access to system configuration and settings',
    category: 'system',
    action: 'manage',
    resource: 'settings',
    is_system_permission: true,
    created_at: '2023-01-20T11:30:00Z'
  },
  {
    id: 7,
    name: 'Moderate Comments',
    description: 'Ability to moderate and manage user comments',
    category: 'content',
    action: 'moderate',
    resource: 'comments',
    is_system_permission: false,
    created_at: '2023-04-12T16:45:00Z'
  },
  {
    id: 8,
    name: 'Deploy Projects',
    description: 'Permission to deploy projects to production',
    category: 'project',
    action: 'deploy',
    resource: 'projects',
    is_system_permission: false,
    created_at: '2023-05-01T09:00:00Z'
  },
  {
    id: 9,
    name: 'View User Profiles',
    description: 'Access to view user profile information',
    category: 'user',
    action: 'read',
    resource: 'profiles',
    is_system_permission: false,
    created_at: '2023-03-15T13:20:00Z'
  },
  {
    id: 10,
    name: 'Manage Permissions',
    description: 'Ability to create, edit, and delete permissions',
    category: 'system',
    action: 'manage',
    resource: 'permissions',
    is_system_permission: true,
    created_at: '2023-01-15T10:05:00Z'
  }
]

// Category and action icon mappings
const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case 'user':
      return <Key className="h-4 w-4 text-blue-500" />
    case 'content':
      return <Tag className="h-4 w-4 text-green-500" />
    case 'system':
      return <Lock className="h-4 w-4 text-red-500" />
    case 'project':
      return <Zap className="h-4 w-4 text-purple-500" />
    case 'reports':
      return <Eye className="h-4 w-4 text-orange-500" />
    default:
      return <Key className="h-4 w-4 text-gray-500" />
  }
}

const getCategoryColor = (category: string) => {
  switch (category.toLowerCase()) {
    case 'user':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
    case 'content':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    case 'system':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    case 'project':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
    case 'reports':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
  }
}

const getActionColor = (action: string) => {
  switch (action.toLowerCase()) {
    case 'create':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300'
    case 'read':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
    case 'update':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
    case 'delete':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    case 'manage':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300'
    case 'moderate':
      return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300'
    case 'deploy':
      return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
  }
}

interface PermissionsDataTableProps {
  permissions?: Permission[]
  onEditPermission?: (permission: Permission) => void
  onDeletePermission?: (permission: Permission) => void
  onViewPermission?: (permission: Permission) => void
  onAddPermission?: () => void
  isLoading?: boolean
}

export function PermissionsDataTable({
  permissions = samplePermissions,
  onEditPermission,
  onDeletePermission,
  onViewPermission,
  onAddPermission,
  isLoading = false,
}: PermissionsDataTableProps) {
  const [selectedPermissions, setSelectedPermissions] = React.useState<Permission[]>([])
  const { confirmBulkDelete, confirmBulkAction, ConfirmationDialog } = useConfirmationDialog()

  // Define columns
  const columns: ColumnDef<Permission>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Permission Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const permission = row.original
        return (
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              {getCategoryIcon(permission.category)}
              <div>
                <div className="font-medium flex items-center space-x-2">
                  <span>{permission.name}</span>
                  {permission.is_system_permission && (
                    <Badge variant="outline" className="text-xs">
                      System
                    </Badge>
                  )}
                </div>
                {permission.description && (
                  <div className="text-sm text-muted-foreground max-w-xs truncate">
                    {permission.description}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'category',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Category
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const category = row.getValue('category') as string
        return (
          <Badge className={`text-xs ${getCategoryColor(category)}`} variant="secondary">
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'action',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Action
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const action = row.getValue('action') as string
        return (
          <Badge className={`text-xs font-mono ${getActionColor(action)}`} variant="secondary">
            {action.toUpperCase()}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'resource',
      header: 'Resource',
      cell: ({ row }) => {
        const resource = row.getValue('resource') as string | undefined
        return (
          <div className="font-mono text-sm">
            {resource || <span className="text-muted-foreground">—</span>}
          </div>
        )
      },
    },
    {
      id: 'permission_key',
      header: 'Permission Key',
      cell: ({ row }) => {
        const permission = row.original
        const key = permission.resource 
          ? `${permission.resource}.${permission.action}`
          : `${permission.category}.${permission.action}`
        return (
          <div className="font-mono text-sm bg-muted px-2 py-1 rounded max-w-xs truncate">
            {key}
          </div>
        )
      },
    },
    {
      accessorKey: 'created_at',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Created
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = new Date(row.getValue('created_at'))
        return (
          <div className="text-sm">
            <div>{date.toLocaleDateString()}</div>
            <div className="text-muted-foreground">{date.toLocaleTimeString()}</div>
          </div>
        )
      },
    },
    {
      accessorKey: 'updated_at',
      header: 'Last Modified',
      cell: ({ row }) => {
        const date = row.original.updated_at ? new Date(row.original.updated_at) : null
        return (
          <div className="text-sm">
            {date ? (
              <>
                <div>{date.toLocaleDateString()}</div>
                <div className="text-muted-foreground">{date.toLocaleTimeString()}</div>
              </>
            ) : (
              <span className="text-muted-foreground">Never</span>
            )}
          </div>
        )
      },
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const permission = row.original
        const isSystemPermission = permission.is_system_permission

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(permission.name)}
              >
                Copy permission name
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const key = permission.resource 
                    ? `${permission.resource}.${permission.action}`
                    : `${permission.category}.${permission.action}`
                  navigator.clipboard.writeText(key)
                }}
              >
                Copy permission key
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {onViewPermission && (
                <DropdownMenuItem onClick={() => onViewPermission(permission)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View details
                </DropdownMenuItem>
              )}
              {onEditPermission && !isSystemPermission && (
                <DropdownMenuItem onClick={() => onEditPermission(permission)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit permission
                </DropdownMenuItem>
              )}
              {onDeletePermission && !isSystemPermission && (
                <DropdownMenuItem
                  onClick={() => onDeletePermission(permission)}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete permission
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  // Column definitions for column selector
  const columnDefinitions = [
    { id: 'name', label: 'Permission Name' },
    { id: 'category', label: 'Category' },
    { id: 'action', label: 'Action' },
    { id: 'resource', label: 'Resource' },
    { id: 'permission_key', label: 'Permission Key' },
    { id: 'created_at', label: 'Created' },
    { id: 'updated_at', label: 'Last Modified' },
    { id: 'actions', label: 'Actions', canHide: false },
  ]

  // Export functionality
  const exportColumns = [
    { id: 'name', label: 'Permission Name', accessor: 'name' },
    { id: 'description', label: 'Description', accessor: 'description' },
    { id: 'category', label: 'Category', accessor: 'category' },
    { id: 'action', label: 'Action', accessor: 'action' },
    { id: 'resource', label: 'Resource', accessor: 'resource' },
    { id: 'is_system_permission', label: 'System Permission', accessor: 'is_system_permission' },
    { id: 'created_at', label: 'Created Date', accessor: 'created_at' },
    { id: 'updated_at', label: 'Last Modified', accessor: 'updated_at' },
  ]

  const { exportData } = useDataTableExport({
    data: permissions,
    columns: exportColumns,
    selectedRows: selectedPermissions,
  })

  const handleDeleteSelected = async (selectedPermissions: Permission[]) => {
    if (!onDeletePermission) return
    
    const nonSystemPermissions = selectedPermissions.filter(permission => 
      !permission.is_system_permission
    )
    
    if (nonSystemPermissions.length === 0) {
      // Show message that no permissions can be deleted
      confirmBulkAction(
        'Cannot Delete',
        'permission',
        selectedPermissions.length,
        `Selected permissions cannot be deleted. System permissions are protected and cannot be removed.`,
        () => {},
        'warning'
      )
      return
    }

    const systemPermissionCount = selectedPermissions.filter(permission => permission.is_system_permission).length
    
    let description = `Are you sure you want to delete ${nonSystemPermissions.length} permission${nonSystemPermissions.length > 1 ? 's' : ''}?`
    if (systemPermissionCount > 0) {
      description += ` Note: ${systemPermissionCount} system permission${systemPermissionCount !== 1 ? 's' : ''} will be skipped as they are protected.`
    }
    description += ' This action cannot be undone.'

    confirmBulkDelete('permission', nonSystemPermissions.length, async () => {
      for (const permission of nonSystemPermissions) {
        await onDeletePermission(permission)
      }
    })
  }

  const handleExport = () => {
    const options: ExportOptions = {
      format: 'csv',
      filename: `permissions-${new Date().toISOString().split('T')[0]}.csv`,
      selectedOnly: selectedPermissions.length > 0,
    }
    exportData(options)
  }

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={permissions}
        searchableColumns={['name', 'description', 'category', 'action', 'resource']}
        enableRowSelection={true}
        enableSorting={true}
        enableFiltering={true}
        enableColumnVisibility={true}
        onRowSelectionChange={setSelectedPermissions}
        onDeleteSelected={onDeletePermission ? handleDeleteSelected : undefined}
        onExport={handleExport}
        onAdd={onAddPermission}
        pageSize={10}
        isLoading={isLoading}
        emptyMessage="No permissions found."
        columnDefinitions={columnDefinitions}
      />
      <ConfirmationDialog />
    </div>
  )
}

// Example of how to use the PermissionsDataTable
export function PermissionsDataTableExample() {
  const handleEditPermission = (permission: Permission) => {
    console.log('Edit permission:', permission)
    // Open edit dialog/form
  }

  const handleDeletePermission = (permission: Permission) => {
    console.log('Delete permission:', permission)
    // Show confirmation and delete
  }

  const handleViewPermission = (permission: Permission) => {
    console.log('View permission:', permission)
    // Navigate to permission details page or show details modal
  }

  const handleAddPermission = () => {
    console.log('Add new permission')
    // Open add permission dialog/form
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Permissions Management</h2>
          <p className="text-muted-foreground">
            Manage system permissions and access controls.
          </p>
        </div>
      </div>
      
      <PermissionsDataTable
        onEditPermission={handleEditPermission}
        onDeletePermission={handleDeletePermission}
        onViewPermission={handleViewPermission}
        onAddPermission={handleAddPermission}
      />
    </div>
  )
}