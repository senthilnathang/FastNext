"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Plus } from "lucide-react"

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

interface User {
  id: string
  email: string
  username: string
  firstName: string
  lastName: string
  isActive: boolean
  roles: string[]
  createdAt: string
  lastLogin: string | null
}

const columns: ColumnDef<User>[] = [
  {
    accessorKey: "username",
    header: "Username",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "firstName",
    header: "First Name",
  },
  {
    accessorKey: "lastName",
    header: "Last Name",
  },
  {
    accessorKey: "roles",
    header: "Roles",
    cell: ({ row }) => {
      const roles = row.getValue("roles") as string[]
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
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => {
      const isActive = row.getValue("isActive") as boolean
      return (
        <Badge variant={isActive ? "success" : "destructive"}>
          {isActive ? "Active" : "Inactive"}
        </Badge>
      )
    },
  },
  {
    accessorKey: "lastLogin",
    header: "Last Login",
    cell: ({ row }) => {
      const lastLogin = row.getValue("lastLogin") as string | null
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
        actions={["edit", "delete", "toggle-status"]}
      />
    ),
  },
]

function handleRowAction(user: User, action: string) {
  switch (action) {
    case "edit":
      console.log("Edit user:", user)
      break
    case "delete":
      console.log("Delete user:", user)
      break
    case "toggle-status":
      console.log("Toggle status for user:", user)
      break
  }
}

export default function UsersPage() {
  const [users, setUsers] = React.useState<User[]>([
    {
      id: "1",
      email: "admin@example.com",
      username: "admin",
      firstName: "Admin",
      lastName: "User",
      isActive: true,
      roles: ["admin"],
      createdAt: "2024-01-01T00:00:00Z",
      lastLogin: "2024-01-15T10:30:00Z",
    },
    {
      id: "2",
      email: "editor@example.com",
      username: "editor",
      firstName: "Editor",
      lastName: "User",
      isActive: true,
      roles: ["editor"],
      createdAt: "2024-01-02T00:00:00Z",
      lastLogin: "2024-01-14T14:20:00Z",
    },
    {
      id: "3",
      email: "viewer@example.com",
      username: "viewer",
      firstName: "Viewer",
      lastName: "User",
      isActive: false,
      roles: ["viewer"],
      createdAt: "2024-01-03T00:00:00Z",
      lastLogin: null,
    },
  ])

  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [newUser, setNewUser] = React.useState({
    email: "",
    username: "",
    firstName: "",
    lastName: "",
    role: "",
  })

  const handleCreateUser = () => {
    const user: User = {
      id: Math.random().toString(36).substr(2, 9),
      email: newUser.email,
      username: newUser.username,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      isActive: true,
      roles: [newUser.role],
      createdAt: new Date().toISOString(),
      lastLogin: null,
    }
    
    setUsers([...users, user])
    setNewUser({ email: "", username: "", firstName: "", lastName: "", role: "" })
    setIsCreateDialogOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Manage user accounts and their permissions
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
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
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="username"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={newUser.firstName}
                    onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
                <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleCreateUser}>
                Create User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable 
        columns={columns} 
        data={users} 
        searchKey="username"
      />
    </div>
  )
}