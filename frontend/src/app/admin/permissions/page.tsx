"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Plus, Key, Shield } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DataTable, ActionColumn } from "@/components/ui/data-table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Permission {
  id: string
  name: string
  description: string
  category: string
  resource: string
  action: string
  rolesCount: number
  createdAt: string
}

const categories = [
  "Users",
  "Roles", 
  "Projects",
  "Components",
  "Settings",
  "Analytics"
]

const actions = [
  "create",
  "read", 
  "update",
  "delete",
  "manage"
]

const resources = [
  "users",
  "roles",
  "permissions", 
  "projects",
  "components",
  "settings",
  "analytics"
]

const columns: ColumnDef<Permission>[] = [
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
    accessorKey: "resource",
    header: "Resource",
    cell: ({ row }) => {
      const resource = row.getValue("resource") as string
      const action = row.original.action
      return (
        <div className="font-mono text-sm">
          {resource}.{action}
        </div>
      )
    },
  },
  {
    accessorKey: "rolesCount",
    header: "Assigned Roles",
    cell: ({ row }) => {
      const rolesCount = row.getValue("rolesCount") as number
      return (
        <div className="flex items-center gap-1">
          <Shield className="w-4 h-4 text-gray-500" />
          <span>{rolesCount}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => {
      const createdAt = row.getValue("createdAt") as string
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
        actions={["edit", "delete"]}
      />
    ),
  },
]

function handleRowAction(permission: Permission, action: string) {
  switch (action) {
    case "edit":
      console.log("Edit permission:", permission)
      break
    case "delete":
      console.log("Delete permission:", permission)
      break
  }
}

export default function PermissionsPage() {
  const [permissions, setPermissions] = React.useState<Permission[]>([
    {
      id: "1",
      name: "View Users",
      description: "Can view user list and profiles",
      category: "Users",
      resource: "users",
      action: "read",
      rolesCount: 3,
      createdAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "2", 
      name: "Create Users",
      description: "Can create new users",
      category: "Users",
      resource: "users",
      action: "create",
      rolesCount: 1,
      createdAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "3",
      name: "Update Users",
      description: "Can edit user information",
      category: "Users", 
      resource: "users",
      action: "update",
      rolesCount: 2,
      createdAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "4",
      name: "Delete Users",
      description: "Can delete users",
      category: "Users",
      resource: "users", 
      action: "delete",
      rolesCount: 1,
      createdAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "5",
      name: "View Roles",
      description: "Can view roles and permissions",
      category: "Roles",
      resource: "roles",
      action: "read", 
      rolesCount: 3,
      createdAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "6",
      name: "Manage Projects",
      description: "Full access to project management",
      category: "Projects",
      resource: "projects",
      action: "manage",
      rolesCount: 2,
      createdAt: "2024-01-01T00:00:00Z",
    },
  ])

  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [newPermission, setNewPermission] = React.useState({
    name: "",
    description: "",
    category: "",
    resource: "",
    action: "",
  })

  const handleCreatePermission = () => {
    const permission: Permission = {
      id: Math.random().toString(36).substr(2, 9),
      name: newPermission.name,
      description: newPermission.description,
      category: newPermission.category,
      resource: newPermission.resource,
      action: newPermission.action,
      rolesCount: 0,
      createdAt: new Date().toISOString(),
    }
    
    setPermissions([...permissions, permission])
    setNewPermission({ name: "", description: "", category: "", resource: "", action: "" })
    setIsCreateDialogOpen(false)
  }

  const generatePermissionId = () => {
    if (newPermission.resource && newPermission.action) {
      return `${newPermission.resource}.${newPermission.action}`
    }
    return ""
  }

  React.useEffect(() => {
    if (newPermission.resource && newPermission.action) {
      const generatedName = `${newPermission.action.charAt(0).toUpperCase() + newPermission.action.slice(1)} ${newPermission.resource.charAt(0).toUpperCase() + newPermission.resource.slice(1)}`
      if (newPermission.name !== generatedName) {
        setNewPermission(prev => ({ ...prev, name: generatedName }))
      }
    }
  }, [newPermission.resource, newPermission.action, newPermission.name])

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
            <Button>
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
                <Select value={newPermission.category} onValueChange={(value) => setNewPermission({ ...newPermission, category: value })}>
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
                  <Label htmlFor="resource">Resource</Label>
                  <Select value={newPermission.resource} onValueChange={(value) => setNewPermission({ ...newPermission, resource: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Resource" />
                    </SelectTrigger>
                    <SelectContent>
                      {resources.map((resource) => (
                        <SelectItem key={resource} value={resource}>
                          {resource}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="action">Action</Label>
                  <Select value={newPermission.action} onValueChange={(value) => setNewPermission({ ...newPermission, action: value })}>
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
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Brief description of what this permission allows"
                  value={newPermission.description}
                  onChange={(e) => setNewPermission({ ...newPermission, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleCreatePermission}>
                Create Permission
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable 
        columns={columns} 
        data={permissions} 
        searchKey="name"
      />
    </div>
  )
}