"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Plus, Shield, Users, Loader2 } from "lucide-react"

import { Button } from "@/shared/components/button"
import { DataTable, ActionColumn } from "@/shared/components/data-table"
import { Badge } from "@/shared/components/badge"
import { useConfirmationDialog } from "@/shared/components/ConfirmationDialog"

// Import React Query hooks
import { useRoles, useDeleteRole } from "@/modules/admin/hooks/useRoles"
import { apiUtils } from "@/shared/services/api/client"
import type { Role, Permission } from "@/shared/services/api/roles"

// Import new dialog components
import { RoleCreateDialog } from "@/modules/admin/components/RoleCreateDialog"
import { RoleEditDialog } from "@/modules/admin/components/RoleEditDialog"

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
  const [editingRole, setEditingRole] = React.useState<Role | null>(null)

  // Queries
  const { data: rolesData, isLoading: rolesLoading, error: rolesError } = useRoles()

  // Mutations
  const deleteRoleMutation = useDeleteRole()

  // Confirmation dialog
  const { confirmRoleDelete, ConfirmationDialog } = useConfirmationDialog()

  // Action handler
  const handleRowAction = React.useCallback((role: Role, action: string) => {
    switch (action) {
      case "edit":
        setEditingRole(role)
        break
      case "delete":
        confirmRoleDelete(role.name, role.user_count || 0, () => {
          deleteRoleMutation.mutate(role.id)
        })
        break
      case "view":
        setEditingRole(role)
        break
    }
  }, [deleteRoleMutation, confirmRoleDelete])

  const columns = React.useMemo(() => createColumns(handleRowAction), [handleRowAction])

  // Loading states
  const isLoading = rolesLoading

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

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Roles</h1>
            <p className="text-sm text-muted-foreground">
              Manage user roles and their permissions. {roles.length} total roles.
            </p>
          </div>

          <Button onClick={() => setIsCreateDialogOpen(true)} disabled={isLoading}>
            <Plus className="mr-2 h-4 w-4" />
            Add Role
          </Button>
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

      {/* Dialog Components */}
      <RoleCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
      
      <RoleEditDialog
        role={editingRole}
        open={!!editingRole}
        onOpenChange={(open) => !open && setEditingRole(null)}
      />

      <ConfirmationDialog />
    </div>
  )
}