"use client"

import * as React from "react"
import { Plus } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
// import { RolesDataTable, type Role as DataTableRole } from "@/shared/components/data-table"

// Import React Query hooks
import { useRoles, useDeleteRole } from "@/modules/admin/hooks/useRoles"
import { apiUtils } from "@/shared/services/api/client"
import type { Role } from "@/shared/services/api/roles"

// Import new dialog components
import { RoleCreateDialog } from "@/modules/admin/components/RoleCreateDialog"
import { RoleEditDialog } from "@/modules/admin/components/RoleEditDialog"

// Adapter function to convert API Role to DataTable Role
const adaptRoleForDataTable = (role: Role): DataTableRole => ({
  id: role.id,
  name: role.name,
  description: role.description,
  is_system_role: role.is_system_role,
  is_active: role.is_active,
  created_at: role.created_at,
  updated_at: role.updated_at,
  user_count: role.user_count,
  permissions: role.permissions?.map(permission => ({
    id: permission.id,
    name: permission.name,
    description: permission.description,
    category: permission.category,
    action: permission.action,
    resource: permission.resource,
    is_system_permission: permission.is_system_permission
  }))
})

// We no longer need the columns definition as it's handled by RolesDataTable

export default function RolesPage() {
  // State
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [editingRole, setEditingRole] = React.useState<Role | null>(null)

  // Queries
  const { data: rolesData, isLoading: rolesLoading, error: rolesError } = useRoles()

  // Mutations
  const deleteRoleMutation = useDeleteRole()

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
  const adaptedRoles = roles.map(adaptRoleForDataTable)

  // Action handlers for the enhanced data table
  const handleEditRole = (role: DataTableRole) => {
    const originalRole = roles.find(r => r.id === role.id)
    if (originalRole) {
      setEditingRole(originalRole)
    }
  }

  const handleDeleteRole = (role: DataTableRole) => {
    if (window.confirm(`Are you sure you want to delete the role "${role.name}"?${role.user_count ? ` This role is assigned to ${role.user_count} user(s).` : ''}`)) {
      deleteRoleMutation.mutate(role.id)
    }
  }

  const handleViewRole = (role: DataTableRole) => {
    const originalRole = roles.find(r => r.id === role.id)
    if (originalRole) {
      setEditingRole(originalRole)
    }
  }

  const handleAddRole = () => {
    setIsCreateDialogOpen(true)
  }

  const handleToggleStatus = (role: DataTableRole) => {
    // TODO: Implement role status toggle
    console.log('Toggle role status:', role)
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Roles Management</h1>
            <p className="text-sm text-muted-foreground">
              Manage user roles and their permissions with advanced table features. {roles.length} total roles.
            </p>
          </div>

          <Button onClick={handleAddRole} disabled={rolesLoading}>
            <Plus className="mr-2 h-4 w-4" />
            Add Role
          </Button>
        </div>

        <RolesDataTable
          roles={adaptedRoles}
          onEditRole={handleEditRole}
          onDeleteRole={handleDeleteRole}
          onViewRole={handleViewRole}
          onAddRole={handleAddRole}
          onToggleStatus={handleToggleStatus}
          isLoading={rolesLoading}
        />
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
    </div>
  )
}