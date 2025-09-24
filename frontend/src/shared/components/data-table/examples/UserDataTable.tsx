'use client'

import * as React from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, ArrowUpDown, Pencil, Trash2, Eye, Mail } from 'lucide-react'
import { DataTable } from '../DataTable'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Badge } from '@/shared/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar'
import { useDataTableExport } from '../hooks/useDataTableExport'
import type { ExportOptions } from '../types'

// Define the User type
export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'editor' | 'viewer'
  status: 'active' | 'inactive' | 'pending'
  avatar?: string
  createdAt: Date
  lastLogin?: Date
  department: string
  location: string
}

// Sample data for demonstration
const sampleUsers: User[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'admin',
    status: 'active',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john',
    createdAt: new Date('2023-01-15'),
    lastLogin: new Date('2024-01-20'),
    department: 'Engineering',
    location: 'New York',
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    role: 'editor',
    status: 'active',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jane',
    createdAt: new Date('2023-02-10'),
    lastLogin: new Date('2024-01-19'),
    department: 'Design',
    location: 'San Francisco',
  },
  {
    id: '3',
    name: 'Bob Johnson',
    email: 'bob@example.com',
    role: 'viewer',
    status: 'inactive',
    createdAt: new Date('2023-03-20'),
    department: 'Marketing',
    location: 'Austin',
  },
  // Add more sample users...
]

interface UserDataTableProps {
  users?: User[]
  onEditUser?: (user: User) => void
  onDeleteUser?: (user: User) => void
  onViewUser?: (user: User) => void
  onAddUser?: () => void
  isLoading?: boolean
}

export function UserDataTable({
  users = sampleUsers,
  onEditUser,
  onDeleteUser,
  onViewUser,
  onAddUser,
  isLoading = false,
}: UserDataTableProps) {
  const [selectedUsers, setSelectedUsers] = React.useState<User[]>([])

  // Define columns
  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const user = row.original
        return (
          <div className="flex items-center space-x-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback>
                {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{user.name}</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => {
        const role = row.getValue('role') as string
        const roleVariants = {
          admin: 'destructive',
          editor: 'default',
          viewer: 'secondary',
        } as const
        
        return (
          <Badge variant={roleVariants[role as keyof typeof roleVariants]}>
            {role.charAt(0).toUpperCase() + role.slice(1)}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string
        const statusVariants = {
          active: 'default',
          inactive: 'secondary',
          pending: 'outline',
        } as const
        
        return (
          <Badge variant={statusVariants[status as keyof typeof statusVariants]}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'department',
      header: 'Department',
      cell: ({ row }) => (
        <div className="text-sm">{row.getValue('department')}</div>
      ),
    },
    {
      accessorKey: 'location',
      header: 'Location',
      cell: ({ row }) => (
        <div className="text-sm">{row.getValue('location')}</div>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Created
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = row.getValue('createdAt') as Date
        return <div className="text-sm">{date.toLocaleDateString()}</div>
      },
    },
    {
      accessorKey: 'lastLogin',
      header: 'Last Login',
      cell: ({ row }) => {
        const date = row.getValue('lastLogin') as Date | undefined
        return (
          <div className="text-sm">
            {date ? date.toLocaleDateString() : 'Never'}
          </div>
        )
      },
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const user = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(user.email)}
              >
                <Mail className="mr-2 h-4 w-4" />
                Copy email
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {onViewUser && (
                <DropdownMenuItem onClick={() => onViewUser(user)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View details
                </DropdownMenuItem>
              )}
              {onEditUser && (
                <DropdownMenuItem onClick={() => onEditUser(user)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit user
                </DropdownMenuItem>
              )}
              {onDeleteUser && (
                <DropdownMenuItem
                  onClick={() => onDeleteUser(user)}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete user
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  // Column definitions for column selector
  const columnDefinitions = [
    { id: 'name', label: 'Name' },
    { id: 'role', label: 'Role' },
    { id: 'status', label: 'Status' },
    { id: 'department', label: 'Department' },
    { id: 'location', label: 'Location' },
    { id: 'createdAt', label: 'Created' },
    { id: 'lastLogin', label: 'Last Login' },
    { id: 'actions', label: 'Actions', canHide: false },
  ]

  // Export functionality
  const exportColumns = [
    { id: 'name', label: 'Name', accessor: 'name' },
    { id: 'email', label: 'Email', accessor: 'email' },
    { id: 'role', label: 'Role', accessor: 'role' },
    { id: 'status', label: 'Status', accessor: 'status' },
    { id: 'department', label: 'Department', accessor: 'department' },
    { id: 'location', label: 'Location', accessor: 'location' },
    { id: 'createdAt', label: 'Created Date', accessor: 'createdAt' },
    { id: 'lastLogin', label: 'Last Login', accessor: 'lastLogin' },
  ]

  const { exportData } = useDataTableExport({
    data: users,
    columns: exportColumns,
    selectedRows: selectedUsers,
  })

  const handleDeleteSelected = async (selectedUsers: User[]) => {
    if (onDeleteUser) {
      // In a real app, you might want to batch delete or confirm
      for (const user of selectedUsers) {
        await onDeleteUser(user)
      }
    }
  }

  const handleExport = () => {
    const options: ExportOptions = {
      format: 'csv',
      filename: `users-${new Date().toISOString().split('T')[0]}.csv`,
      selectedOnly: selectedUsers.length > 0,
    }
    exportData(options)
  }

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={users}
        searchableColumns={['name', 'email']}
        enableRowSelection={true}
        enableSorting={true}
        enableFiltering={true}
        enableColumnVisibility={true}
        onRowSelectionChange={setSelectedUsers}
        onDeleteSelected={onDeleteUser ? handleDeleteSelected : undefined}
        onExport={handleExport}
        onAdd={onAddUser}
        pageSize={10}
        isLoading={isLoading}
        emptyMessage="No users found."
        columnDefinitions={columnDefinitions}
      />
    </div>
  )
}

// Example of how to use the UserDataTable
export function UserDataTableExample() {
  const handleEditUser = (user: User) => {
    console.log('Edit user:', user)
    // Open edit dialog/form
  }

  const handleDeleteUser = (user: User) => {
    console.log('Delete user:', user)
    // Show confirmation and delete
  }

  const handleViewUser = (user: User) => {
    console.log('View user:', user)
    // Navigate to user details page
  }

  const handleAddUser = () => {
    console.log('Add new user')
    // Open add user dialog/form
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Users</h2>
          <p className="text-muted-foreground">
            Manage your team members and their roles.
          </p>
        </div>
      </div>
      
      <UserDataTable
        onEditUser={handleEditUser}
        onDeleteUser={handleDeleteUser}
        onViewUser={handleViewUser}
        onAddUser={handleAddUser}
      />
    </div>
  )
}