'use client'

import * as React from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, ArrowUpDown, Pencil, Trash2, Eye, Shield, Users, Crown } from 'lucide-react'
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
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar'
import { useDataTableExport } from '../hooks/useDataTableExport'
import type { ExportOptions } from '../types'

// Define the Role type
export interface Role {
  id: number
  name: string
  description?: string
  is_system_role: boolean
  is_active: boolean
  created_at: string
  updated_at?: string
  permissions?: Permission[]
  user_count?: number
}

export interface Permission {
  id: number
  name: string
  description?: string
  category: string
  action: string
  resource?: string
  is_system_permission: boolean
}

// Sample data for demonstration
const sampleRoles: Role[] = [
  {
    id: 1,
    name: 'Administrator',
    description: 'Full system access with all permissions',
    is_system_role: true,
    is_active: true,
    created_at: '2023-01-15T10:00:00Z',
    updated_at: '2023-06-20T14:30:00Z',
    user_count: 3,
    permissions: [
      { id: 1, name: 'Manage Users', category: 'user', action: 'manage', is_system_permission: true },
      { id: 2, name: 'Manage Roles', category: 'role', action: 'manage', is_system_permission: true },
      { id: 3, name: 'System Settings', category: 'system', action: 'manage', is_system_permission: true }
    ]
  },
  {
    id: 2,
    name: 'Editor',
    description: 'Can create and edit content',
    is_system_role: false,
    is_active: true,
    created_at: '2023-02-10T09:15:00Z',
    updated_at: '2023-08-15T11:45:00Z',
    user_count: 8,
    permissions: [
      { id: 4, name: 'Create Content', category: 'content', action: 'create', is_system_permission: false },
      { id: 5, name: 'Edit Content', category: 'content', action: 'update', is_system_permission: false },
    ]
  },
  {
    id: 3,
    name: 'Viewer',
    description: 'Read-only access to content',
    is_system_role: false,
    is_active: true,
    created_at: '2023-03-20T16:20:00Z',
    user_count: 15,
    permissions: [
      { id: 6, name: 'View Content', category: 'content', action: 'read', is_system_permission: false },
    ]
  },
  {
    id: 4,
    name: 'Moderator',
    description: 'Can moderate user content and manage comments',
    is_system_role: false,
    is_active: true,
    created_at: '2023-04-05T12:10:00Z',
    user_count: 5,
    permissions: [
      { id: 7, name: 'Moderate Content', category: 'content', action: 'moderate', is_system_permission: false },
      { id: 8, name: 'Delete Comments', category: 'comment', action: 'delete', is_system_permission: false },
    ]
  },
  {
    id: 5,
    name: 'Guest',
    description: 'Limited access for temporary users',
    is_system_role: false,
    is_active: false,
    created_at: '2023-05-12T08:30:00Z',
    user_count: 0,
    permissions: [
      { id: 9, name: 'Basic Access', category: 'system', action: 'read', is_system_permission: false },
    ]
  }
]

interface RolesDataTableProps {
  roles?: Role[]
  onEditRole?: (role: Role) => void
  onDeleteRole?: (role: Role) => void
  onViewRole?: (role: Role) => void
  onAddRole?: () => void
  onToggleStatus?: (role: Role) => void
  isLoading?: boolean
}

export function RolesDataTable({
  roles = sampleRoles,
  onEditRole,
  onDeleteRole,
  onViewRole,
  onAddRole,
  onToggleStatus,
  isLoading = false,
}: RolesDataTableProps) {
  const [selectedRoles, setSelectedRoles] = React.useState<Role[]>([])

  // Define columns
  const columns: ColumnDef<Role>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Role Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const role = row.original
        return (
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              {role.is_system_role ? (
                <Crown className="h-4 w-4 text-yellow-500" />
              ) : (
                <Shield className="h-4 w-4 text-blue-500" />
              )}
              <div>
                <div className="font-medium flex items-center space-x-2">
                  <span>{role.name}</span>
                  {role.is_system_role && (
                    <Badge variant="outline" className="text-xs">
                      System
                    </Badge>
                  )}
                  {!role.is_active && (
                    <Badge variant="secondary" className="text-xs">
                      Inactive
                    </Badge>
                  )}
                </div>
                {role.description && (
                  <div className="text-sm text-muted-foreground max-w-xs truncate">
                    {role.description}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'permissions',
      header: 'Permissions',
      cell: ({ row }) => {
        const permissions = row.original.permissions || []
        return (
          <div className="flex gap-1 flex-wrap max-w-xs">
            {permissions.slice(0, 2).map((permission) => (
              <Badge key={permission.id} variant="secondary" className="text-xs">
                {permission.name}
              </Badge>
            ))}
            {permissions.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{permissions.length - 2} more
              </Badge>
            )}
            {permissions.length === 0 && (
              <span className="text-sm text-muted-foreground">No permissions</span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'user_count',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Users
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const userCount = row.getValue('user_count') as number || 0
        return (
          <div className="flex items-center space-x-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{userCount}</span>
            <span className="text-sm text-muted-foreground">
              {userCount === 1 ? 'user' : 'users'}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => {
        const isActive = row.getValue('is_active') as boolean
        return (
          <Badge variant={isActive ? 'default' : 'secondary'}>
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
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
        const role = row.original
        const isSystemRole = role.is_system_role

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
                onClick={() => navigator.clipboard.writeText(role.name)}
              >
                Copy role name
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {onViewRole && (
                <DropdownMenuItem onClick={() => onViewRole(role)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View details
                </DropdownMenuItem>
              )}
              {onEditRole && !isSystemRole && (
                <DropdownMenuItem onClick={() => onEditRole(role)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit role
                </DropdownMenuItem>
              )}
              {onToggleStatus && !isSystemRole && (
                <DropdownMenuItem onClick={() => onToggleStatus(role)}>
                  <Shield className="mr-2 h-4 w-4" />
                  {role.is_active ? 'Deactivate' : 'Activate'}
                </DropdownMenuItem>
              )}
              {onDeleteRole && !isSystemRole && role.user_count === 0 && (
                <DropdownMenuItem
                  onClick={() => onDeleteRole(role)}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete role
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
    { id: 'name', label: 'Role Name' },
    { id: 'permissions', label: 'Permissions' },
    { id: 'user_count', label: 'Users' },
    { id: 'is_active', label: 'Status' },
    { id: 'created_at', label: 'Created' },
    { id: 'updated_at', label: 'Last Modified' },
    { id: 'actions', label: 'Actions', canHide: false },
  ]

  // Export functionality
  const exportColumns = [
    { id: 'name', label: 'Role Name', accessor: 'name' },
    { id: 'description', label: 'Description', accessor: 'description' },
    { id: 'is_system_role', label: 'System Role', accessor: 'is_system_role' },
    { id: 'is_active', label: 'Active', accessor: 'is_active' },
    { id: 'user_count', label: 'User Count', accessor: 'user_count' },
    { id: 'created_at', label: 'Created Date', accessor: 'created_at' },
    { id: 'updated_at', label: 'Last Modified', accessor: 'updated_at' },
  ]

  const { exportData } = useDataTableExport({
    data: roles,
    columns: exportColumns,
    selectedRows: selectedRoles,
  })

  const handleDeleteSelected = async (selectedRoles: Role[]) => {
    if (onDeleteRole) {
      const nonSystemRoles = selectedRoles.filter(role => 
        !role.is_system_role && (role.user_count || 0) === 0
      )
      for (const role of nonSystemRoles) {
        await onDeleteRole(role)
      }
    }
  }

  const handleExport = () => {
    const options: ExportOptions = {
      format: 'csv',
      filename: `roles-${new Date().toISOString().split('T')[0]}.csv`,
      selectedOnly: selectedRoles.length > 0,
    }
    exportData(options)
  }

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={roles}
        searchableColumns={['name', 'description']}
        enableRowSelection={true}
        enableSorting={true}
        enableFiltering={true}
        enableColumnVisibility={true}
        onRowSelectionChange={setSelectedRoles}
        onDeleteSelected={onDeleteRole ? handleDeleteSelected : undefined}
        onExport={handleExport}
        onAdd={onAddRole}
        pageSize={10}
        isLoading={isLoading}
        emptyMessage="No roles found."
        columnDefinitions={columnDefinitions}
      />
    </div>
  )
}

// Example of how to use the RolesDataTable
export function RolesDataTableExample() {
  const handleEditRole = (role: Role) => {
    console.log('Edit role:', role)
    // Open edit dialog/form
  }

  const handleDeleteRole = (role: Role) => {
    console.log('Delete role:', role)
    // Show confirmation and delete
  }

  const handleViewRole = (role: Role) => {
    console.log('View role:', role)
    // Navigate to role details page or show details modal
  }

  const handleAddRole = () => {
    console.log('Add new role')
    // Open add role dialog/form
  }

  const handleToggleStatus = (role: Role) => {
    console.log('Toggle role status:', role)
    // Toggle role active/inactive status
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Roles Management</h2>
          <p className="text-muted-foreground">
            Manage user roles and their permissions.
          </p>
        </div>
      </div>
      
      <RolesDataTable
        onEditRole={handleEditRole}
        onDeleteRole={handleDeleteRole}
        onViewRole={handleViewRole}
        onAddRole={handleAddRole}
        onToggleStatus={handleToggleStatus}
      />
    </div>
  )
}