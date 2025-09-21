"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Plus, Loader2 } from "lucide-react"

import { Button } from "@/shared/components/button"
import { DataTable, ActionColumn } from "@/shared/components/data-table"
import { Badge } from "@/shared/components/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/dialog"
import { Input } from "@/shared/components/input"
import { Label } from "@/shared/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/select"

// Import React Query hooks
import { useUsers, useCreateUser, useDeleteUser, useToggleUserStatus } from "@/modules/admin/hooks/useUsers"
import { useRoles } from "@/modules/admin/hooks/useRoles"
import { apiUtils } from "@/shared/services/api/client"
import type { User } from "@/shared/services/api/users"


type UsersPageProps = Record<string, never>

const UsersPage: React.FC<UsersPageProps> = () => {
  // State
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [newUser, setNewUser] = React.useState({
    email: "",
    username: "",
    full_name: "",
    password: "",
    roles: [] as string[],
  })

  // Queries
  const { data: usersData, isLoading: usersLoading, error: usersError } = useUsers()
  const { data: rolesData, isLoading: rolesLoading } = useRoles({ active_only: true })

  // Mutations
  const createUserMutation = useCreateUser()
  const deleteUserMutation = useDeleteUser()
  const toggleStatusMutation = useToggleUserStatus()

  // Action handler
  const handleRowAction = React.useCallback((user: User, action: string) => {
    switch (action) {
      case "edit":
        // TODO: Open edit dialog
        console.log("Edit user:", user)
        break
      case "delete":
        if (window.confirm(`Are you sure you want to delete user "${user.username}"?`)) {
          deleteUserMutation.mutate(user.id)
        }
        break
      case "toggle-status":
        toggleStatusMutation.mutate(user.id)
        break
      case "reset-password":
        // TODO: Implement password reset
        console.log("Reset password for user:", user)
        break
    }
  }, [deleteUserMutation, toggleStatusMutation])

  // Table columns
  const columns: ColumnDef<User>[] = React.useMemo(() => [
    {
      accessorKey: "username",
      header: "Username",
    },
    {
      accessorKey: "email", 
      header: "Email",
    },
    {
      accessorKey: "full_name",
      header: "Full Name",
      cell: ({ row }) => row.getValue("full_name") || "-",
    },
    {
      accessorKey: "roles",
      header: "Roles",
      cell: ({ row }) => {
        const roles = row.getValue("roles") as string[] || []
        return (
          <div className="flex gap-1 flex-wrap">
            {roles.map((role) => (
              <Badge key={role} variant="secondary" className="text-xs">
                {role}
              </Badge>
            ))}
          </div>
        )
      },
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.getValue("is_active") as boolean
        return (
          <Badge variant={isActive ? "default" : "destructive"}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
        )
      },
    },
    {
      accessorKey: "last_login_at",
      header: "Last Login",
      cell: ({ row }) => {
        const lastLogin = row.getValue("last_login_at") as string | null
        return (
          <span className="text-sm text-gray-500">
            {lastLogin ? new Date(lastLogin).toLocaleDateString() : "Never"}
          </span>
        )
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <ActionColumn 
          row={row.original} 
          onAction={handleRowAction}
          actions={["edit", "delete", "toggle-status", "reset-password"]}
        />
      ),
    },
  ], [handleRowAction])

  // Handle create user
  const handleCreateUser = React.useCallback(() => {
    if (!newUser.email || !newUser.username || !newUser.password) {
      alert("Please fill in all required fields")
      return
    }

    createUserMutation.mutate({
      email: newUser.email,
      username: newUser.username,
      full_name: newUser.full_name || undefined,
      password: newUser.password,
      roles: newUser.roles,
    }, {
      onSuccess: () => {
        setNewUser({ email: "", username: "", full_name: "", password: "", roles: [] })
        setIsCreateDialogOpen(false)
      },
      onError: (error) => {
        alert(`Failed to create user: ${apiUtils.getErrorMessage(error)}`)
      }
    })
  }, [newUser, createUserMutation])

  // Loading states
  const isLoading = usersLoading || rolesLoading
  const isCreating = createUserMutation.isPending

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
  const roles = rolesData?.items || []

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Users</h1>
            <p className="text-sm text-muted-foreground">
              Manage user accounts and their permissions
            </p>
          </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={isLoading}>
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
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
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  disabled={isCreating}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  placeholder="username"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  disabled={isCreating}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  placeholder="John Doe"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  disabled={isCreating}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  disabled={isCreating}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="roles">Roles</Label>
                <Select 
                  disabled={isCreating || rolesLoading}
                  onValueChange={(value) => {
                    setNewUser({ ...newUser, roles: value ? [value] : [] })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.name}>
                        {role.name} - {role.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="submit" 
                onClick={handleCreateUser}
                disabled={isCreating}
              >
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isCreating ? 'Creating...' : 'Create User'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
    </div>
  )
}

export default UsersPage