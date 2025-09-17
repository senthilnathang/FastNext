"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Plus, Shield, Users } from "lucide-react"

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
import { Checkbox } from "@/components/ui/checkbox"

interface Role {
  id: string
  name: string
  description: string
  permissions: string[]
  userCount: number
  isSystem: boolean
  createdAt: string
}

interface Permission {
  id: string
  name: string
  description: string
  category: string
}

const permissions: Permission[] = [
  { id: "users.read", name: "View Users", description: "Can view user list and profiles", category: "Users" },
  { id: "users.create", name: "Create Users", description: "Can create new users", category: "Users" },
  { id: "users.update", name: "Update Users", description: "Can edit user information", category: "Users" },
  { id: "users.delete", name: "Delete Users", description: "Can delete users", category: "Users" },
  { id: "roles.read", name: "View Roles", description: "Can view roles and permissions", category: "Roles" },
  { id: "roles.create", name: "Create Roles", description: "Can create new roles", category: "Roles" },
  { id: "roles.update", name: "Update Roles", description: "Can edit role permissions", category: "Roles" },
  { id: "roles.delete", name: "Delete Roles", description: "Can delete roles", category: "Roles" },
  { id: "projects.read", name: "View Projects", description: "Can view project list", category: "Projects" },
  { id: "projects.create", name: "Create Projects", description: "Can create new projects", category: "Projects" },
  { id: "projects.update", name: "Update Projects", description: "Can edit projects", category: "Projects" },
  { id: "projects.delete", name: "Delete Projects", description: "Can delete projects", category: "Projects" },
]

const columns: ColumnDef<Role>[] = [
  {
    accessorKey: "name",
    header: "Role Name",
    cell: ({ row }) => {
      const role = row.original
      return (
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-gray-500" />
          <span className="font-medium">{role.name}</span>
          {role.isSystem && (
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
      const permissions = row.getValue("permissions") as string[]
      return (
        <div className="flex gap-1 flex-wrap max-w-xs">
          {permissions.slice(0, 3).map((permission) => (
            <Badge key={permission} variant="secondary" className="text-xs">
              {permission.split('.')[1]}
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
    accessorKey: "userCount",
    header: "Users",
    cell: ({ row }) => {
      const userCount = row.getValue("userCount") as number
      return (
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4 text-gray-500" />
          <span>{userCount}</span>
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
        actions={row.original.isSystem ? ["view"] : ["edit", "delete"]}
      />
    ),
  },
]

function handleRowAction(role: Role, action: string) {
  switch (action) {
    case "edit":
      console.log("Edit role:", role)
      break
    case "delete":
      console.log("Delete role:", role)
      break
    case "view":
      console.log("View role:", role)
      break
  }
}

export default function RolesPage() {
  const [roles, setRoles] = React.useState<Role[]>([
    {
      id: "1",
      name: "admin",
      description: "Full system access with all permissions",
      permissions: permissions.map(p => p.id),
      userCount: 1,
      isSystem: true,
      createdAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "2",
      name: "editor",
      description: "Can create and edit content",
      permissions: ["users.read", "projects.read", "projects.create", "projects.update"],
      userCount: 3,
      isSystem: true,
      createdAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "3",
      name: "viewer",
      description: "Read-only access to content",
      permissions: ["users.read", "projects.read"],
      userCount: 5,
      isSystem: true,
      createdAt: "2024-01-01T00:00:00Z",
    },
  ])

  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [newRole, setNewRole] = React.useState({
    name: "",
    description: "",
    permissions: [] as string[],
  })

  const handleCreateRole = () => {
    const role: Role = {
      id: Math.random().toString(36).substr(2, 9),
      name: newRole.name,
      description: newRole.description,
      permissions: newRole.permissions,
      userCount: 0,
      isSystem: false,
      createdAt: new Date().toISOString(),
    }
    
    setRoles([...roles, role])
    setNewRole({ name: "", description: "", permissions: [] })
    setIsCreateDialogOpen(false)
  }

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
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

  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = []
    }
    acc[permission.category].push(permission)
    return acc
  }, {} as Record<string, Permission[]>)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Roles</h1>
          <p className="text-muted-foreground">
            Manage user roles and their permissions
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
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
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Brief description of the role"
                  value={newRole.description}
                  onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
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
                              id={permission.id}
                              checked={newRole.permissions.includes(permission.id)}
                              onCheckedChange={(checked) => 
                                handlePermissionChange(permission.id, checked as boolean)
                              }
                            />
                            <div className="grid gap-1.5 leading-none">
                              <label
                                htmlFor={permission.id}
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
              <Button type="submit" onClick={handleCreateRole}>
                Create Role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable 
        columns={columns} 
        data={roles} 
        searchKey="name"
      />
    </div>
  )
}