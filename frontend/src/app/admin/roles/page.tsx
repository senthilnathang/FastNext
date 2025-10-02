"use client"

import * as React from "react"
import { ViewManager, ViewConfig, Column } from '@/shared/components/views'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Textarea,
  Button
} from '@/shared/components'
import { Shield, Users, Key, Calendar, Clock } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import type { SortOption, GroupOption } from '@/shared/components/ui'
import { formatDistanceToNow } from 'date-fns'

// Import React Query hooks
import { useRoles, useDeleteRole, useCreateRole, useUpdateRole } from "@/modules/admin/hooks/useRoles"
import { apiUtils } from "@/shared/services/api/client"
import type { Role } from "@/shared/services/api/roles"

export default function RolesPage() {
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)
  const [selectedRole, setSelectedRole] = React.useState<Role | null>(null)
  const [activeView, setActiveView] = React.useState('roles-list')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [filters, setFilters] = React.useState<Record<string, any>>({})
  const [sortBy, setSortBy] = React.useState<string>('created_at')
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc')
  const [groupBy, setGroupBy] = React.useState<string>('')
  const [selectedItems, setSelectedItems] = React.useState<Role[]>([])
  
  const { data: rolesData, isLoading, error } = useRoles()
  const createRole = useCreateRole()
  const updateRole = useUpdateRole()
  const deleteRole = useDeleteRole()

  const [formData, setFormData] = React.useState({
    name: '',
    description: ''
  })

  // Define columns for the ViewManager
  const columns: Column<Role>[] = React.useMemo(() => [
    {
      id: 'name',
      key: 'name',
      label: 'Role Name',
      sortable: true,
      searchable: true,
      render: (value, role) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
            <Shield className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <div className="font-medium">{value as string}</div>
            <div className="text-sm text-muted-foreground">
              {role.description || 'No description'}
            </div>
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
        <div className="flex items-center space-x-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{value || 0}</span>
        </div>
      )
    },
    {
      id: 'permissions_count',
      key: 'permissions',
      label: 'Permissions',
      render: (value) => {
        const permissions = (value as any[]) || []
        return (
          <div className="flex items-center space-x-2">
            <Key className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{permissions.length}</span>
          </div>
        )
      }
    },
    {
      id: 'is_system_role',
      key: 'is_system_role',
      label: 'Type',
      sortable: true,
      filterable: true,
      type: 'select',
      filterOptions: [
        { label: 'System Role', value: true },
        { label: 'Custom Role', value: false }
      ],
      render: (value, role) => (
        <div className="flex gap-2">
          <Badge variant={role.is_system_role ? "secondary" : "default"}>
            {role.is_system_role ? "System" : "Custom"}
          </Badge>
          {role.is_active && (
            <Badge variant="outline" className="text-xs">
              Active
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

  // Define sort options
  const sortOptions: SortOption[] = React.useMemo(() => [
    {
      key: 'name',
      label: 'Role Name',
      defaultOrder: 'asc'
    },
    {
      key: 'user_count',
      label: 'User Count',
      defaultOrder: 'desc'
    },
    {
      key: 'created_at',
      label: 'Created Date',
      defaultOrder: 'desc'
    }
  ], [])

  // Define group options
  const groupOptions: GroupOption[] = React.useMemo(() => [
    {
      key: 'is_system_role',
      label: 'Role Type',
      icon: <Shield className="h-4 w-4" />
    },
    {
      key: 'is_active',
      label: 'Status',
      icon: <Clock className="h-4 w-4" />
    }
  ], [])

  // Define available views
  const views: ViewConfig[] = React.useMemo(() => [
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
    },
    {
      id: 'roles-kanban',
      name: 'Kanban Board',
      type: 'kanban',
      columns,
      filters: {},
      groupBy: 'is_system_role'
    }
  ], [columns])

  const roles = React.useMemo(() => rolesData?.items || [], [rolesData])

  // Handle actions
  const handleCreateRole = () => {
    if (!formData.name) {
      alert('Please enter a role name')
      return
    }

    createRole.mutate({
      name: formData.name,
      description: formData.description,
    }, {
      onSuccess: () => {
        setFormData({ name: '', description: '' })
        setCreateDialogOpen(false)
      },
      onError: (error) => {
        alert(`Failed to create role: ${apiUtils.getErrorMessage(error)}`)
      },
    })
  }

  const handleEditRole = (role: Role) => {
    setSelectedRole(role)
    setEditDialogOpen(true)
  }

  const handleDeleteRole = (role: Role) => {
    if (confirm(`Are you sure you want to delete role "${role.name}"?${role.user_count ? ` This role is assigned to ${role.user_count} user(s).` : ''}`)) {
      deleteRole.mutate(role.id)
    }
  }

  const handleViewRole = (role: Role) => {
    console.log('View role:', role)
    // TODO: Navigate to role details page
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
      action: (items: Role[]) => {
        if (confirm(`Delete ${items.length} roles?`)) {
          items.forEach(role => deleteRole.mutate(role.id))
        }
      },
      variant: 'destructive' as const
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

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <ViewManager
        title="Roles"
        subtitle="Manage user roles and permissions"
        data={roles}
        columns={columns}
        views={views}
        activeView={activeView}
        onViewChange={setActiveView}
        loading={isLoading}
        error={error ? (error as any)?.message || String(error) : null}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filters}
        onFiltersChange={setFilters}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={(field, order) => {
          setSortBy(field)
          setSortOrder(order)
        }}
        sortOptions={sortOptions}
        groupBy={groupBy}
        onGroupChange={setGroupBy}
        groupOptions={groupOptions}
        onExport={handleExport}
        onImport={handleImport}
        onCreateClick={() => setCreateDialogOpen(true)}
        onEditClick={handleEditRole}
        onDeleteClick={handleDeleteRole}
        onViewClick={handleViewRole}
        selectable={true}
        selectedItems={selectedItems}
        onSelectionChange={setSelectedItems}
        bulkActions={bulkActions}
        showToolbar={true}
        showSearch={true}
        showFilters={true}
        showSort={true}
        showGroup={true}
        showExport={true}
        showImport={true}
      />

      {/* Create Role Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
            <DialogDescription>
              Add a new role to organize user permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Role Name *</Label>
              <Input
                id="name"
                placeholder="Editor"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Can edit and manage content"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateRole}
              disabled={createRole.isPending || !formData.name}
            >
              {createRole.isPending ? 'Creating...' : 'Create Role'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}