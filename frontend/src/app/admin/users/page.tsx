"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Plus, Loader2, Shield, UserCheck } from "lucide-react"

import { Button } from "@/shared/components/button"
import { DataTable, ActionColumn } from "@/shared/components/data-table"
import { Badge } from "@/shared/components/badge"
import { useConfirmationDialog } from "@/shared/components/ConfirmationDialog"

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

  const users = usersData?.items || []

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

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading users...</span>
          </div>
        ) : (
          <DataTable 
            columns={columns} 
            data={users} 
            searchKey="username"
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