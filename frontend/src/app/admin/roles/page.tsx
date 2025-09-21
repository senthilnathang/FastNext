"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Plus, Shield, Users, Loader2 } from "lucide-react"

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
import { Checkbox } from "@/shared/components/checkbox"

// Import React Query hooks
import { useRoles, useCreateRole, useDeleteRole } from "@/modules/admin/hooks/useRoles"
import { usePermissions } from "@/modules/admin/hooks/usePermissions"
import { apiUtils } from "@/shared/services/api/client"
import type { Role, Permission } from "@/shared/services/api/roles"

// Define columns
const createColumns = (handleRowAction: (role: Role, action: string) => void): ColumnDef<Role>[] => [
  {
    accessorKey: "name",
    header: "Role Name",
    cell: ({ row }) => {
      const role = row.original
      return (
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-gray-500" />
          <span className="font-medium">{role.name}</span>
          {role.is_system_role && (
            <Badge variant="outline" className="text-xs">
              System
            </Badge>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "description",
    header: "Description",
  },
  {
    accessorKey: "permissions",
    header: "Permissions",
    cell: ({ row }) => {
      const permissions = row.getValue("permissions") as Permission[] || []
      return (
        <div className="flex gap-1 flex-wrap max-w-xs">
          {permissions.slice(0, 3).map((permission) => (
            <Badge key={permission.id} variant="secondary" className="text-xs">
              {permission.name}
            </Badge>
          ))}
          {permissions.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{permissions.length - 3} more
            </Badge>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "user_count",
    header: "Users",
    cell: ({ row }) => {
      const userCount = row.getValue("user_count") as number || 0
      return (
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4 text-gray-500" />
          <span>{userCount}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => {
      const createdAt = row.getValue("created_at") as string
      return (
        <span className="text-sm text-gray-500">
          {new Date(createdAt).toLocaleDateString()}
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
        actions={row.original.is_system_role ? ["view"] : ["edit", "delete"]}
      />
    ),
  },
]

export default function RolesPage() {
  // State
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [newRole, setNewRole] = React.useState({
    name: "",
    description: "",
    permissions: [] as number[],
  })

  // Queries
  const { data: rolesData, isLoading: rolesLoading, error: rolesError } = useRoles()
  const { data: permissionsData, isLoading: permissionsLoading } = usePermissions()

  // Mutations
  const createRoleMutation = useCreateRole()
  const deleteRoleMutation = useDeleteRole()

  // Action handler
  const handleRowAction = React.useCallback((role: Role, action: string) => {
    switch (action) {
      case "edit":
        console.log("Edit role:", role)
        break
      case "delete":
        if (window.confirm(`Are you sure you want to delete role "${role.name}"?`)) {
          deleteRoleMutation.mutate(role.id)
        }
        break
      case "view":
        console.log("View role:", role)
        break
    }
  }, [deleteRoleMutation])

  const columns = React.useMemo(() => createColumns(handleRowAction), [handleRowAction])

  // Handle create role
  const handleCreateRole = React.useCallback(() => {
    if (!newRole.name || !newRole.description) {
      alert("Please fill in all required fields")
      return
    }

    createRoleMutation.mutate({
      name: newRole.name,
      description: newRole.description,
      permissions: newRole.permissions,
    }, {
      onSuccess: () => {
        setNewRole({ name: "", description: "", permissions: [] })
        setIsCreateDialogOpen(false)
      },
      onError: (error) => {
        alert(`Failed to create role: ${apiUtils.getErrorMessage(error)}`)
      }
    })
  }, [newRole, createRoleMutation])

  const handlePermissionChange = (permissionId: number, checked: boolean) => {
    if (checked) {
      setNewRole({
        ...newRole,
        permissions: [...newRole.permissions, permissionId],
      })
    } else {
      setNewRole({
        ...newRole,
        permissions: newRole.permissions.filter((p) => p !== permissionId),
      })
    }
  }

  // Loading states
  const isLoading = rolesLoading || permissionsLoading
  const isCreating = createRoleMutation.isPending

  // Handle errors
  if (rolesError) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Failed to load roles</h2>
          <p className="text-gray-600">{apiUtils.getErrorMessage(rolesError)}</p>
        </div>
      </div>
    )
  }

  const roles = rolesData?.items || []
  const permissions = permissionsData?.items || []

  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = []
    }
    acc[permission.category].push(permission)
    return acc
  }, {} as Record<string, Permission[]>)

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Roles</h1>
            <p className="text-sm text-muted-foreground">
              Manage user roles and their permissions
            </p>
          </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={isLoading}>
              <Plus className="mr-2 h-4 w-4" />
              Add Role
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
              <DialogDescription>
                Create a new role and assign permissions to define what users with this role can do.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Role Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., moderator"
                  value={newRole.name}
                  onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                  disabled={isCreating}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Brief description of the role"
                  value={newRole.description}
                  onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                  disabled={isCreating}
                />
              </div>
              <div className="grid gap-4">
                <Label>Permissions</Label>
                <div className="space-y-4 max-h-60 overflow-y-auto">
                  {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => (
                    <div key={category} className="space-y-2">
                      <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">{category}</h4>
                      <div className="space-y-2 pl-4">
                        {categoryPermissions.map((permission) => (
                          <div key={permission.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={permission.id.toString()}
                              checked={newRole.permissions.includes(permission.id)}
                              onCheckedChange={(checked) => 
                                handlePermissionChange(permission.id, checked as boolean)
                              }
                              disabled={isCreating}
                            />
                            <div className="grid gap-1.5 leading-none">
                              <label
                                htmlFor={permission.id.toString()}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {permission.name}
                              </label>
                              <p className="text-xs text-muted-foreground">
                                {permission.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="submit" 
                onClick={handleCreateRole}
                disabled={isCreating}
              >
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isCreating ? 'Creating...' : 'Create Role'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading roles...</span>
          </div>
        ) : (
          <DataTable 
            columns={columns} 
            data={roles} 
            searchKey="name"
          />
        )}
      </div>
    </div>
  )
}