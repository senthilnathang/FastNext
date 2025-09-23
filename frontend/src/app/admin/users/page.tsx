"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Plus, Loader2, Shield, UserCheck } from "lucide-react"

import { 
  Button,
  DataTable,
  ActionColumn,
  Badge,
  useConfirmationDialog,
  AdvancedSearch,
  type SearchState,
  type SearchFilter
} from "@/shared/components"
import { useAdvancedSearch } from "@/shared/hooks/useAdvancedSearch"

// Import React Query hooks
import { useUsers, useDeleteUser, useToggleUserStatus } from "@/modules/admin/hooks/useUsers"
import { apiUtils } from "@/shared/services/api/client"
import type { User } from "@/shared/services/api/users"

// Import new dialog components
import { UserCreateDialog } from "@/modules/admin/components/UserCreateDialog"
import { UserEditDialog } from "@/modules/admin/components/UserEditDialog"


type UsersPageProps = Record<string, never>

const UsersPage: React.FC<UsersPageProps> = () => {
  // State
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [editingUser, setEditingUser] = React.useState<User | null>(null)

  // Queries
  const { data: usersData, isLoading: usersLoading, error: usersError } = useUsers()

  // Advanced search setup
  const availableFilters: Omit<SearchFilter, 'value'>[] = [
    {
      id: 'status',
      field: 'is_active',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'true', label: 'Active' },
        { value: 'false', label: 'Inactive' }
      ]
    },
    {
      id: 'verified',
      field: 'is_verified',
      label: 'Verified',
      type: 'boolean'
    },
    {
      id: 'superuser',
      field: 'is_superuser',
      label: 'Admin User',
      type: 'boolean'
    },
    {
      id: 'created_date',
      field: 'created_at',
      label: 'Created Date',
      type: 'daterange'
    },
    {
      id: 'last_login',
      field: 'last_login_at',
      label: 'Last Login',
      type: 'daterange'
    }
  ]

  const availableSorts = [
    { field: 'username', label: 'Username' },
    { field: 'email', label: 'Email' },
    { field: 'full_name', label: 'Full Name' },
    { field: 'created_at', label: 'Created Date' },
    { field: 'last_login_at', label: 'Last Login' }
  ]

  const {
    searchState,
    updateSearchState,
    hasActiveSearch
  } = useAdvancedSearch({
    initialPageSize: 20,
    onSearch: (state: SearchState) => {
      console.log('Search state changed:', state)
      // TODO: Implement API call with search parameters
    }
  })

  // Mutations
  const deleteUserMutation = useDeleteUser()
  const toggleStatusMutation = useToggleUserStatus()

  // Confirmation dialog
  const { confirmUserDelete, confirmStatusToggle, ConfirmationDialog } = useConfirmationDialog()

  // Action handler
  const handleRowAction = React.useCallback((user: User, action: string) => {
    switch (action) {
      case "edit":
        setEditingUser(user)
        break
      case "delete":
        confirmUserDelete(user.username, () => {
          deleteUserMutation.mutate(user.id)
        })
        break
      case "toggle-status":
        confirmStatusToggle(user.username, user.is_active, () => {
          toggleStatusMutation.mutate(user.id)
        })
        break
      case "reset-password":
        // TODO: Implement password reset
        console.log("Reset password for user:", user)
        break
      case "send-invitation":
        // TODO: Implement send invitation
        console.log("Send invitation to user:", user)
        break
    }
  }, [deleteUserMutation, toggleStatusMutation, confirmUserDelete, confirmStatusToggle])

  // Table columns
  const columns: ColumnDef<User>[] = React.useMemo(() => [
    {
      accessorKey: "username",
      header: "User",
      cell: ({ row }) => {
        const user = row.original
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <span className="text-sm font-medium text-primary">
                {user.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="font-medium">{user.username}</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "full_name",
      header: "Full Name",
      cell: ({ row }) => row.getValue("full_name") || "-",
    },
    {
      accessorKey: "roles",
      header: "Role",
      cell: ({ row }) => {
        const roles = row.getValue("roles") as string[] || []
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
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const user = row.original
        return (
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
    },
    {
      accessorKey: "last_login_at",
      header: "Last Login",
      cell: ({ row }) => {
        const lastLogin = row.getValue("last_login_at") as string | null
        return (
          <span className="text-sm text-muted-foreground">
            {lastLogin ? new Date(lastLogin).toLocaleDateString() : "Never"}
          </span>
        )
      },
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => {
        const createdAt = row.getValue("created_at") as string
        return (
          <span className="text-sm text-muted-foreground">
            {new Date(createdAt).toLocaleDateString()}
          </span>
        )
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const user = row.original
        const actions = ["edit", "toggle-status"]
        
        // Add conditional actions
        if (!user.is_superuser) {
          actions.push("delete")
        }
        if (!user.is_verified) {
          actions.push("send-invitation")
        }
        actions.push("reset-password")
        
        return (
          <ActionColumn 
            row={user} 
            onAction={handleRowAction}
            actions={actions}
          />
        )
      },
    },
  ], [handleRowAction])

  // Loading states
  const isLoading = usersLoading

  // Prepare data with hooks (must be called before any early returns)
  const users = React.useMemo(() => usersData?.items || [], [usersData])
  
  // Filter users based on search state
  const filteredUsers = React.useMemo(() => {
    if (!hasActiveSearch()) return users
    
    return users.filter(user => {
      // Apply search query
      if (searchState.query) {
        const query = searchState.query.toLowerCase()
        if (!(
          user.username.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          (user.full_name && user.full_name.toLowerCase().includes(query))
        )) {
          return false
        }
      }
      
      // Apply filters
      for (const filter of searchState.filters) {
        if (filter.value === undefined || filter.value === '') continue
        
        switch (filter.field) {
          case 'is_active':
            if (user.is_active !== (filter.value === 'true')) return false
            break
          case 'is_verified':
            if (user.is_verified !== filter.value) return false
            break
          case 'is_superuser':
            if (user.is_superuser !== filter.value) return false
            break
          case 'created_at':
            if (filter.value?.from) {
              const createdAt = new Date(user.created_at)
              const fromDate = new Date(filter.value.from)
              const toDate = filter.value.to ? new Date(filter.value.to) : new Date()
              if (createdAt < fromDate || createdAt > toDate) return false
            }
            break
          case 'last_login_at':
            if (filter.value?.from && user.last_login_at) {
              const lastLogin = new Date(user.last_login_at)
              const fromDate = new Date(filter.value.from)
              const toDate = filter.value.to ? new Date(filter.value.to) : new Date()
              if (lastLogin < fromDate || lastLogin > toDate) return false
            }
            break
        }
      }
      
      return true
    })
  }, [users, searchState, hasActiveSearch])
  
  // Sort filtered users
  const sortedUsers = React.useMemo(() => {
    if (!searchState.sort) return filteredUsers
    
    return [...filteredUsers].sort((a, b) => {
      const field = searchState.sort!.field
      const direction = searchState.sort!.direction
      
      let aValue: any
      let bValue: any
      
      switch (field) {
        case 'username':
          aValue = a.username
          bValue = b.username
          break
        case 'email':
          aValue = a.email
          bValue = b.email
          break
        case 'full_name':
          aValue = a.full_name || ''
          bValue = b.full_name || ''
          break
        case 'created_at':
          aValue = new Date(a.created_at)
          bValue = new Date(b.created_at)
          break
        case 'last_login_at':
          aValue = a.last_login_at ? new Date(a.last_login_at) : new Date(0)
          bValue = b.last_login_at ? new Date(b.last_login_at) : new Date(0)
          break
        default:
          return 0
      }
      
      if (aValue < bValue) return direction === 'asc' ? -1 : 1
      if (aValue > bValue) return direction === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredUsers, searchState.sort])

  // Handle errors
  if (usersError) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Failed to load users</h2>
          <p className="text-gray-600">{apiUtils.getErrorMessage(usersError)}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Users</h1>
            <p className="text-sm text-muted-foreground">
              Manage user accounts and their permissions. {users.length} total users.
            </p>
          </div>

          <Button onClick={() => setIsCreateDialogOpen(true)} disabled={isLoading}>
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>

        {/* Advanced Search */}
        <AdvancedSearch
          searchState={searchState}
          onSearchChange={updateSearchState}
          availableFilters={availableFilters}
          availableSorts={availableSorts}
          placeholder="Search users by username, email, or name..."
          resultCount={sortedUsers.length}
          loading={isLoading}
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading users...</span>
          </div>
        ) : (
          <DataTable 
            columns={columns} 
            data={sortedUsers} 
            searchKey="username"
            enableSearch={false}
          />
        )}
      </div>

      {/* Dialog Components */}
      <UserCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
      
      <UserEditDialog
        user={editingUser}
        open={!!editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
      />

      <ConfirmationDialog />
    </div>
  )
}

export default UsersPage