"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Plus, Key, Loader2 } from "lucide-react"

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
import { usePermissions, useCreatePermission, useDeletePermission } from "@/modules/admin/hooks/usePermissions"
import { apiUtils } from "@/shared/services/api/client"
import type { Permission } from "@/shared/services/api/permissions"

const categories = [
  "project",
  "page", 
  "component",
  "user",
  "system"
]

const actions = [
  "create",
  "read", 
  "update",
  "delete",
  "manage",
  "publish",
  "deploy"
]

// Define columns
const createColumns = (handleRowAction: (permission: Permission, action: string) => void): ColumnDef<Permission>[] => [
  {
    accessorKey: "name",
    header: "Permission Name",
    cell: ({ row }) => {
      const permission = row.original
      return (
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-gray-500" />
          <span className="font-medium">{permission.name}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "description",
    header: "Description",
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => {
      const category = row.getValue("category") as string
      return (
        <Badge variant="outline" className="text-xs">
          {category}
        </Badge>
      )
    },
  },
  {
    accessorKey: "action",
    header: "Action",
    cell: ({ row }) => {
      const action = row.getValue("action") as string
      return (
        <div className="font-mono text-sm">
          {action}
        </div>
      )
    },
  },
  {
    id: "resource",
    header: "Resource",
    cell: ({ row }) => {
      const resource = row.original.resource
      return (
        <div className="font-mono text-sm">
          {resource || '-'}
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
        actions={row.original.is_system_permission ? ["view"] : ["edit", "delete"]}
      />
    ),
  },
]

export default function PermissionsPage() {
  // State
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [newPermission, setNewPermission] = React.useState({
    name: "",
    description: "",
    category: "",
    action: "",
    resource: "",
  })

  // Queries
  const { data: permissionsData, isLoading: permissionsLoading, error: permissionsError } = usePermissions()

  // Mutations
  const createPermissionMutation = useCreatePermission()
  const deletePermissionMutation = useDeletePermission()

  // Action handler
  const handleRowAction = React.useCallback((permission: Permission, action: string) => {
    switch (action) {
      case "edit":
        console.log("Edit permission:", permission)
        break
      case "delete":
        if (window.confirm(`Are you sure you want to delete permission "${permission.name}"?`)) {
          deletePermissionMutation.mutate(permission.id)
        }
        break
      case "view":
        console.log("View permission:", permission)
        break
    }
  }, [deletePermissionMutation])

  const columns = React.useMemo(() => createColumns(handleRowAction), [handleRowAction])

  // Handle create permission
  const handleCreatePermission = React.useCallback(() => {
    if (!newPermission.name || !newPermission.category || !newPermission.action) {
      alert("Please fill in all required fields")
      return
    }

    createPermissionMutation.mutate({
      name: newPermission.name,
      description: newPermission.description,
      category: newPermission.category,
      action: newPermission.action,
      resource: newPermission.resource,
    }, {
      onSuccess: () => {
        setNewPermission({ name: "", description: "", category: "", action: "", resource: "" })
        setIsCreateDialogOpen(false)
      },
      onError: (error) => {
        alert(`Failed to create permission: ${apiUtils.getErrorMessage(error)}`)
      }
    })
  }, [newPermission, createPermissionMutation])

  const generatePermissionId = () => {
    if (newPermission.resource && newPermission.action) {
      return `${newPermission.resource}.${newPermission.action}`
    }
    return ""
  }

  // Auto-generate permission name
  React.useEffect(() => {
    if (newPermission.action && newPermission.category) {
      const generatedName = `${newPermission.action.charAt(0).toUpperCase() + newPermission.action.slice(1)} ${newPermission.category.charAt(0).toUpperCase() + newPermission.category.slice(1)}`
      if (newPermission.name !== generatedName) {
        setNewPermission(prev => ({ ...prev, name: generatedName }))
      }
    }
  }, [newPermission.action, newPermission.category, newPermission.name])

  // Loading states
  const isLoading = permissionsLoading
  const isCreating = createPermissionMutation.isPending

  // Handle errors
  if (permissionsError) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Failed to load permissions</h2>
          <p className="text-gray-600">{apiUtils.getErrorMessage(permissionsError)}</p>
        </div>
      </div>
    )
  }

  const permissions = permissionsData?.items || []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Permissions</h1>
          <p className="text-muted-foreground">
            Manage system permissions and access controls
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={isLoading}>
              <Plus className="mr-2 h-4 w-4" />
              Add Permission
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Permission</DialogTitle>
              <DialogDescription>
                Define a new permission by specifying the resource and action it controls.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={newPermission.category} 
                  onValueChange={(value) => setNewPermission({ ...newPermission, category: value })}
                  disabled={isCreating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="action">Action</Label>
                  <Select 
                    value={newPermission.action} 
                    onValueChange={(value) => setNewPermission({ ...newPermission, action: value })}
                    disabled={isCreating}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Action" />
                    </SelectTrigger>
                    <SelectContent>
                      {actions.map((action) => (
                        <SelectItem key={action} value={action}>
                          {action}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="resource">Resource (Optional)</Label>
                  <Input
                    id="resource"
                    placeholder="e.g., projects"
                    value={newPermission.resource}
                    onChange={(e) => setNewPermission({ ...newPermission, resource: e.target.value })}
                    disabled={isCreating}
                  />
                </div>
              </div>

              {generatePermissionId() && (
                <div className="grid gap-2">
                  <Label>Permission ID</Label>
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded font-mono text-sm">
                    {generatePermissionId()}
                  </div>
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="name">Permission Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Create Users"
                  value={newPermission.name}
                  onChange={(e) => setNewPermission({ ...newPermission, name: e.target.value })}
                  disabled={isCreating}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Brief description of what this permission allows"
                  value={newPermission.description}
                  onChange={(e) => setNewPermission({ ...newPermission, description: e.target.value })}
                  disabled={isCreating}
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="submit" 
                onClick={handleCreatePermission}
                disabled={isCreating}
              >
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isCreating ? 'Creating...' : 'Create Permission'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading permissions...</span>
        </div>
      ) : (
        <DataTable 
          columns={columns} 
          data={permissions} 
          searchKey="name"
        />
      )}
    </div>
  )
}