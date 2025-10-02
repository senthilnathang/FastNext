"use client"

import * as React from "react"
import { ViewManager, ViewConfig, Column, KanbanColumn } from '@/shared/components/views'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Button
} from '@/shared/components'
import { User as UserIcon, Shield, UserCheck, Mail, Calendar, Clock } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import type { SortOption, GroupOption } from '@/shared/components/ui'
import { formatDistanceToNow } from 'date-fns'

// Import React Query hooks
import { useUsers, useDeleteUser, useToggleUserStatus, useCreateUser, useUpdateUser } from "@/modules/admin/hooks/useUsers"
import { apiUtils } from "@/shared/services/api/client"
import type { User } from "@/shared/services/api/users"


type UsersPageProps = Record<string, never>

const UsersPage: React.FC<UsersPageProps> = () => {
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null)
  const [activeView, setActiveView] = React.useState('users-list')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [filters, setFilters] = React.useState<Record<string, any>>({})
  const [sortBy, setSortBy] = React.useState<string>('created_at')
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc')
  const [groupBy, setGroupBy] = React.useState<string>('')
  const [selectedItems, setSelectedItems] = React.useState<User[]>([])
  
  const { data: usersData, isLoading, error } = useUsers()
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()
  const toggleUserStatus = useToggleUserStatus()

  const [formData, setFormData] = React.useState({
    email: '',
    username: '',
    full_name: '',
    password: ''
  })

  // Define columns for the ViewManager
  const columns: Column<User>[] = React.useMemo(() => [
    {
      id: 'username',
      key: 'username',
      label: 'User',
      sortable: true,
      searchable: true,
      render: (value, user) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <span className="text-sm font-medium text-primary">
              {user.username.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="font-medium">{value as string}</div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
          </div>
        </div>
      )
    },
    {
      id: 'full_name',
      key: 'full_name',
      label: 'Full Name',
      sortable: true,
      searchable: true,
      render: (value) => (value as string) || '-'
    },
    {
      id: 'roles',
      key: 'roles',
      label: 'Roles',
      render: (value) => {
        const roles = (value as string[]) || []
        return (
          <div className="flex gap-1 flex-wrap">
            {roles.length > 0 ? (
              roles.slice(0, 2).map((role) => (
                <Badge key={role} variant="secondary" className="text-xs">
                  {role}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">No role</span>
            )}
            {roles.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{roles.length - 2}
              </Badge>
            )}
          </div>
        )
      }
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
      render: (value, user) => (
        <div className="flex gap-2">
          <Badge variant={user.is_active ? "default" : "destructive"}>
            {user.is_active ? "Active" : "Inactive"}
          </Badge>
          {user.is_superuser && (
            <Badge variant="outline" className="text-xs">
              <Shield className="w-3 h-3 mr-1" />
              Admin
            </Badge>
          )}
          {user.is_verified && (
            <Badge variant="outline" className="text-xs">
              <UserCheck className="w-3 h-3 mr-1" />
              Verified
            </Badge>
          )}
        </div>
      )
    },
    {
      id: 'last_login_at',
      key: 'last_login_at',
      label: 'Last Login',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-muted-foreground">
          {value ? formatDistanceToNow(new Date(value as string), { addSuffix: true }) : "Never"}
        </span>
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
      key: 'username',
      label: 'Username',
      defaultOrder: 'asc'
    },
    {
      key: 'email',
      label: 'Email',
      defaultOrder: 'asc'
    },
    {
      key: 'full_name',
      label: 'Full Name',
      defaultOrder: 'asc'
    },
    {
      key: 'created_at',
      label: 'Created Date',
      defaultOrder: 'desc'
    },
    {
      key: 'last_login_at',
      label: 'Last Login',
      defaultOrder: 'desc'
    }
  ], [])

  // Define group options
  const groupOptions: GroupOption[] = React.useMemo(() => [
    {
      key: 'is_active',
      label: 'Status',
      icon: <UserIcon className="h-4 w-4" />
    },
    {
      key: 'is_verified',
      label: 'Verification',
      icon: <UserCheck className="h-4 w-4" />
    },
    {
      key: 'is_superuser',
      label: 'Admin Status',
      icon: <Shield className="h-4 w-4" />
    }
  ], [])

  // Define available views
  const views: ViewConfig[] = React.useMemo(() => [
    {
      id: 'users-card',
      name: 'Card View',
      type: 'card',
      columns,
      filters: {},
      sortBy: 'created_at',
      sortOrder: 'desc'
    },
    {
      id: 'users-list',
      name: 'List View',
      type: 'list',
      columns,
      filters: {},
      sortBy: 'created_at',
      sortOrder: 'desc'
    },
    {
      id: 'users-kanban',
      name: 'Kanban Board',
      type: 'kanban',
      columns,
      filters: {},
      groupBy: 'is_active'
    }
  ], [columns])

  const users = React.useMemo(() => usersData?.items || [], [usersData])

  // Define kanban columns for user status
  const kanbanColumns: KanbanColumn[] = React.useMemo(() => [
    { 
      id: 'true', 
      title: 'Active Users', 
      color: '#10b981',
      count: users.filter(user => user.is_active).length
    },
    { 
      id: 'false', 
      title: 'Inactive Users', 
      color: '#ef4444',
      count: users.filter(user => !user.is_active).length
    }
  ], [users])

  // Define kanban card fields
  const kanbanCardFields = React.useMemo(() => [
    {
      key: 'email',
      label: 'Email',
      type: 'text' as const
    },
    {
      key: 'is_superuser',
      label: 'Admin',
      type: 'badge' as const,
      render: (value: unknown) => value ? 'Admin' : null
    },
    {
      key: 'is_verified',
      label: 'Verified',
      type: 'badge' as const,
      render: (value: unknown) => value ? 'Verified' : 'Unverified'
    },
    {
      key: 'last_login_at',
      label: 'Last Login',
      type: 'date' as const,
      render: (value: unknown) => value ? formatDistanceToNow(new Date(value as string), { addSuffix: true }) : 'Never'
    }
  ], [])

  // Handle actions
  const handleCreateUser = () => {
    if (!formData.email || !formData.username || !formData.password) {
      alert('Please fill in all required fields')
      return
    }

    createUser.mutate({
      email: formData.email,
      username: formData.username,
      full_name: formData.full_name || undefined,
      password: formData.password,
    }, {
      onSuccess: () => {
        setFormData({ email: '', username: '', full_name: '', password: '' })
        setCreateDialogOpen(false)
      },
      onError: (error) => {
        alert(`Failed to create user: ${apiUtils.getErrorMessage(error)}`)
      },
    })
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setEditDialogOpen(true)
  }

  const handleDeleteUser = (user: User) => {
    if (confirm(`Are you sure you want to delete user "${user.username}"?`)) {
      deleteUser.mutate(user.id)
    }
  }

  const handleViewUser = (user: User) => {
    console.log('View user:', user)
    // TODO: Navigate to user details page
  }

  const handleExport = (format: string) => {
    console.log('Export users as', format)
    // TODO: Implement export
  }

  const handleImport = () => {
    console.log('Import users')
    // TODO: Implement import
  }

  const handleMoveCard = (cardId: string | number, sourceColumnId: string, targetColumnId: string) => {
    const userId = Number(cardId)
    const shouldBeActive = targetColumnId === 'true'
    
    // Find the user to toggle
    const user = users.find(u => u.id === userId)
    if (user && user.is_active !== shouldBeActive) {
      toggleUserStatus.mutate(userId)
    }
  }

  const handleQuickAdd = (columnId: string, title: string) => {
    // Extract email from title for quick user creation
    const email = title.includes('@') ? title : `${title}@example.com`
    const username = title.replace('@', '_').replace(/[^a-zA-Z0-9_]/g, '_')
    
    createUser.mutate({
      email,
      username,
      full_name: title,
      password: 'TempPassword123!', // Should prompt for password in real app
      is_active: columnId === 'true'
    })
  }

  const bulkActions = [
    {
      label: 'Delete Selected',
      action: (items: User[]) => {
        if (confirm(`Delete ${items.length} users?`)) {
          items.forEach(user => deleteUser.mutate(user.id))
        }
      },
      variant: 'destructive' as const
    },
    {
      label: 'Activate Selected',
      action: (items: User[]) => {
        items.forEach(user => {
          if (!user.is_active) {
            toggleUserStatus.mutate(user.id)
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
            Failed to load users
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {error.message || 'An error occurred while loading users'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <ViewManager
        title="Users"
        subtitle="Manage user accounts and permissions"
        data={users}
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
        onEditClick={handleEditUser}
        onDeleteClick={handleDeleteUser}
        onViewClick={handleViewUser}
        selectable={true}
        selectedItems={selectedItems}
        onSelectionChange={setSelectedItems}
        bulkActions={bulkActions}
        showToolbar={true}
        showSearch={true}
        showFilters={true}
        showExport={true}
        showImport={true}
        
        // Kanban-specific props
        kanbanColumns={kanbanColumns}
        onMoveCard={handleMoveCard}
        enableQuickAdd={true}
        onQuickAdd={handleQuickAdd}
        kanbanGroupByField="is_active"
        kanbanCardTitleField="full_name"
        kanbanCardDescriptionField="email"
        kanbanCardFields={kanbanCardFields}
      />

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new user to the system. They will receive an email with login instructions.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                placeholder="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                placeholder="John Doe"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={createUser.isPending || !formData.email || !formData.username || !formData.password}
            >
              {createUser.isPending ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default UsersPage