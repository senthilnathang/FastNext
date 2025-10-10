"use client"

import * as React from "react"
import { useRouter, useSearchParams } from 'next/navigation'
import { CommonFormViewManager, createFormViewConfig } from '@/shared/components/views/CommonFormViewManager'
import { FormField } from '@/shared/components/views/GenericFormView'
import { Column } from '@/shared/components/views/ViewManager'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Shield, Users, Key, Calendar, Clock, Crown } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { formatDistanceToNow } from 'date-fns'
import { z } from 'zod'

// Import React Query hooks
import { useRoles, useDeleteRole, useCreateRole, useUpdateRole } from "@/modules/admin/hooks/useRoles"
import { apiUtils } from "@/shared/services/api/client"
import type { Role } from "@/shared/services/api/roles"

// Role validation schema
const roleSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, 'Role name is required').max(100),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
  is_system_role: z.boolean().default(false),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  permissions: z.array(z.any()).optional(),
  user_count: z.number().optional(),
  permission_count: z.number().optional(),
})

// Form fields configuration
const formFields: FormField<Role>[] = [
  {
    name: 'name',
    label: 'Role Name',
    type: 'text',
    required: true,
    placeholder: 'Enter role name',
    description: 'Unique name for this role'
  },
  {
    name: 'description',
    label: 'Description',
    type: 'textarea',
    placeholder: 'Describe the role purpose and responsibilities',
    description: 'Optional description of the role'
  },
  {
    name: 'is_active',
    label: 'Active',
    type: 'checkbox',
    defaultValue: true,
    description: 'Whether this role is currently active'
  },
  {
    name: 'is_system_role',
    label: 'System Role',
    type: 'checkbox',
    defaultValue: false,
    description: 'Mark as system role (typically for built-in roles)'
  }
]

export default function RolesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedItems, setSelectedItems] = React.useState<any[]>([])
  
  const { data: rolesData, isLoading, error } = useRoles()
  const createRole = useCreateRole()
  const updateRole = useUpdateRole()
  const deleteRole = useDeleteRole()

  // Determine current mode from URL
  const mode = searchParams.get('mode') || 'list'
  const itemId = searchParams.get('id') || undefined

  const handleModeChange = (newMode: string, newItemId?: string | number) => {
    const params = new URLSearchParams()
    if (newMode !== 'list') {
      params.set('mode', newMode)
      if (newItemId) {
        params.set('id', String(newItemId))
      }
    }
    router.push(`/admin/roles?${params.toString()}`)
  }

  // Define columns for the ViewManager
  const columns: Column[] = React.useMemo(() => [
    {
      id: 'name',
      key: 'name',
      label: 'Role Name',
      sortable: true,
      searchable: true,
      render: (value, role) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-medium">{value as string}</div>
            {role.description && (
              <div className="text-sm text-muted-foreground">{role.description}</div>
            )}
          </div>
        </div>
      )
    },
    {
      id: 'user_count',
      key: 'user_count',
      label: 'Users',
      sortable: true,
      render: (value) => (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>{value ? String(value) : '0'} users</span>
        </div>
      )
    },
    {
      id: 'permission_count',
      key: 'permission_count',
      label: 'Permissions',
      sortable: true,
      render: (value) => (
        <div className="flex items-center gap-2">
          <Key className="h-4 w-4 text-muted-foreground" />
          <span>{value ? String(value) : '0'} permissions</span>
        </div>
      )
    },
    {
      id: 'status',
      key: 'is_active',
      label: 'Status',
      sortable: true,
      filterable: true,
      type: 'select',
      filterOptions: [
        { label: 'Active', value: true },
        { label: 'Inactive', value: false }
      ],
      render: (value, role) => (
        <div className="flex gap-2">
          <Badge variant={role.is_active ? "default" : "destructive"}>
            {role.is_active ? "Active" : "Inactive"}
          </Badge>
          {role.is_system_role && (
            <Badge variant="outline" className="text-xs">
              <Crown className="w-3 h-3 mr-1" />
              System
            </Badge>
          )}
        </div>
      )
    },
    {
      id: 'created_at',
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (value) => (
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {formatDistanceToNow(new Date(value as string), { addSuffix: true })}
          </span>
        </div>
      )
    }
  ], [])

  const roles = React.useMemo(() => rolesData?.items || [], [rolesData])

  // Calculate statistics
  const stats = React.useMemo(() => {
    const totalRoles = roles.length
    const activeRoles = roles.filter(role => role.is_active).length
    const inactiveRoles = totalRoles - activeRoles
    const systemRoles = roles.filter(role => role.is_system_role).length

    return {
      totalRoles,
      activeRoles,
      inactiveRoles,
      systemRoles
    }
  }, [roles])

  // API functions
  const fetchRoles = async (): Promise<Role[]> => {
    return roles
  }

  const createRoleApi = async (data: Role): Promise<Role> => {
    return new Promise((resolve, reject) => {
      const createData = {
        name: data.name,
        description: data.description,
        permissions: data.permissions?.map(p => typeof p === 'object' ? p.id : p)
      }
      createRole.mutate(createData, {
        onSuccess: (result) => resolve(result),
        onError: (error) => reject(new Error(apiUtils.getErrorMessage(error)))
      })
    })
  }

  const updateRoleApi = async (id: string | number, data: Role): Promise<Role> => {
    return new Promise((resolve, reject) => {
      const updateData = {
        name: data.name,
        description: data.description,
        is_active: data.is_active,
        permissions: data.permissions?.map(p => typeof p === 'object' ? p.id : p)
      }
      updateRole.mutate({ id: Number(id), data: updateData }, {
        onSuccess: (result) => resolve(result),
        onError: (error) => reject(new Error(apiUtils.getErrorMessage(error)))
      })
    })
  }

  const deleteRoleApi = async (id: string | number): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (confirm(`Are you sure you want to delete this role?`)) {
        deleteRole.mutate(Number(id), {
          onSuccess: () => resolve(),
          onError: (error) => reject(new Error(apiUtils.getErrorMessage(error)))
        })
      } else {
        reject(new Error('Deletion cancelled'))
      }
    })
  }

  const handleExport = (format: string) => {
    console.log('Export roles as', format)
    // TODO: Implement export
  }

  const handleImport = () => {
    console.log('Import roles')
    // TODO: Implement import
  }

  const bulkActions = [
    {
      label: 'Delete Selected',
      action: (items: any[]) => {
        if (confirm(`Delete ${items.length} roles?`)) {
          items.forEach(role => deleteRole.mutate(role.id))
        }
      },
      variant: 'destructive' as const
    },
    {
      label: 'Activate Selected',
      action: (items: any[]) => {
        items.forEach(role => {
          if (!role.is_active) {
            updateRole.mutate({ id: role.id, data: { ...role, is_active: true } })
          }
        })
      }
    }
  ]

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Failed to load roles
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {error.message || 'An error occurred while loading roles'}
          </p>
        </div>
      </div>
    )
  }

  // Create form view configuration
  const config = createFormViewConfig<Role>({
    resourceName: 'role',
    baseUrl: '/admin/roles',
    apiEndpoint: '/api/v1/roles',
    title: 'Roles Management',
    subtitle: 'Manage user roles and permissions across the application',
    formFields,
    columns,
    validationSchema: roleSchema,
    onFetch: fetchRoles,
    onCreate: createRoleApi,
    onUpdate: updateRoleApi,
    onDelete: deleteRoleApi,
    views: [
      {
        id: 'roles-card',
        name: 'Card View',
        type: 'card',
        columns,
        filters: {},
        sortBy: 'created_at',
        sortOrder: 'desc'
      },
      {
        id: 'roles-list',
        name: 'List View',
        type: 'list',
        columns,
        filters: {},
        sortBy: 'created_at',
        sortOrder: 'desc'
      }
    ],
    defaultView: 'roles-list'
  })

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Statistics Cards - Only show in list mode */}
      {mode === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRoles}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeRoles} active, {stats.inactiveRoles} inactive
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Roles</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeRoles}</div>
              <p className="text-xs text-muted-foreground">
                Currently in use
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Roles</CardTitle>
              <Crown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.systemRoles}</div>
              <p className="text-xs text-muted-foreground">
                Built-in system roles
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Custom Roles</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRoles - stats.systemRoles}</div>
              <p className="text-xs text-muted-foreground">
                User-defined roles
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <CommonFormViewManager
        config={config}
        mode={mode as any}
        itemId={itemId}
        onModeChange={handleModeChange}
        data={roles}
        loading={isLoading}
        error={error ? (error as any)?.message || String(error) : null}
        selectable={true}
        selectedItems={selectedItems}
        onSelectionChange={setSelectedItems}
        bulkActions={bulkActions}
        onExport={handleExport}
        onImport={handleImport}
      />
    </div>
  )
}