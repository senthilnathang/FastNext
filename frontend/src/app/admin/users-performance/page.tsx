"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Plus, Shield, UserCheck, Edit3, MoreHorizontal } from "lucide-react"

import { Button } from "@/shared/components/button"
import { VirtualizedTable } from "@/shared/components/VirtualizedTable"
import { Badge } from "@/shared/components/badge"
import { AdvancedSearch, type SearchState } from "@/shared/components/AdvancedSearch"
import { useAdvancedSearch } from "@/shared/hooks/useAdvancedSearch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/dropdown-menu"

// Mock user type for demonstration
interface User {
  id: number
  username: string
  email: string
  full_name?: string
  is_active: boolean
  is_verified: boolean
  is_superuser: boolean
  created_at: string
  last_login_at?: string
  roles?: string[]
}

// Generate mock data for performance testing
function generateMockUsers(count: number): User[] {
  const users: User[] = []
  const roles = ['Admin', 'Editor', 'Viewer', 'Moderator', 'Contributor']
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'company.com', 'example.org']
  
  for (let i = 1; i <= count; i++) {
    const firstName = `User${i}`
    const lastName = `Last${i}`
    const domain = domains[Math.floor(Math.random() * domains.length)]
    
    users.push({
      id: i,
      username: `user${i}`,
      email: `user${i}@${domain}`,
      full_name: `${firstName} ${lastName}`,
      is_active: Math.random() > 0.1, // 90% active
      is_verified: Math.random() > 0.2, // 80% verified
      is_superuser: Math.random() > 0.9, // 10% superuser
      created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      last_login_at: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() : undefined,
      roles: Math.random() > 0.5 ? [roles[Math.floor(Math.random() * roles.length)]] : []
    })
  }
  
  return users
}

const UsersPerformancePage: React.FC = () => {
  const [allUsers] = React.useState(() => generateMockUsers(10000)) // 10k users for performance testing
  
  // Advanced search setup
  const availableFilters = [
    {
      id: 'status',
      field: 'is_active',
      label: 'Status',
      type: 'select' as const,
      options: [
        { value: 'true', label: 'Active' },
        { value: 'false', label: 'Inactive' }
      ]
    },
    {
      id: 'verified',
      field: 'is_verified',
      label: 'Verified',
      type: 'boolean' as const
    },
    {
      id: 'superuser',
      field: 'is_superuser',
      label: 'Admin User',
      type: 'boolean' as const
    },
    {
      id: 'created_date',
      field: 'created_at',
      label: 'Created Date',
      type: 'daterange' as const
    }
  ]

  const availableSorts = [
    { field: 'username', label: 'Username' },
    { field: 'email', label: 'Email' },
    { field: 'full_name', label: 'Full Name' },
    { field: 'created_at', label: 'Created Date' },
    { field: 'last_login_at', label: 'Last Login' }
  ]

  const {
    searchState,
    updateSearchState
  } = useAdvancedSearch({
    initialPageSize: 50,
    onSearch: (state: SearchState) => {
      console.log('Search state changed:', state)
    }
  })

  // Filter and sort users based on search state
  const processedUsers = React.useMemo(() => {
    let filtered = allUsers

    // Apply search query
    if (searchState.query) {
      const query = searchState.query.toLowerCase()
      filtered = filtered.filter(user =>
        user.username.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.full_name && user.full_name.toLowerCase().includes(query))
      )
    }

    // Apply filters
    for (const filter of searchState.filters) {
      if (filter.value === undefined || filter.value === '') continue
      
      switch (filter.field) {
        case 'is_active':
          filtered = filtered.filter(user => user.is_active === (filter.value === 'true'))
          break
        case 'is_verified':
          filtered = filtered.filter(user => user.is_verified === filter.value)
          break
        case 'is_superuser':
          filtered = filtered.filter(user => user.is_superuser === filter.value)
          break
        case 'created_at':
          if (filter.value?.from) {
            const fromDate = new Date(filter.value.from)
            const toDate = filter.value.to ? new Date(filter.value.to) : new Date()
            filtered = filtered.filter(user => {
              const createdAt = new Date(user.created_at)
              return createdAt >= fromDate && createdAt <= toDate
            })
          }
          break
      }
    }

    // Apply sorting
    if (searchState.sort) {
      filtered = [...filtered].sort((a, b) => {
        const field = searchState.sort!.field
        const direction = searchState.sort!.direction
        
        let aValue: any = (a as any)[field]
        let bValue: any = (b as any)[field]
        
        if (field === 'created_at' || field === 'last_login_at') {
          aValue = aValue ? new Date(aValue).getTime() : 0
          bValue = bValue ? new Date(bValue).getTime() : 0
        }
        
        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase()
          bValue = bValue?.toLowerCase() || ''
        }
        
        if (aValue < bValue) return direction === 'asc' ? -1 : 1
        if (aValue > bValue) return direction === 'asc' ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [allUsers, searchState])

  const handleRowAction = (user: User, action: string) => {
    console.log(`Action ${action} for user:`, user)
    // Implement actions here
  }

  // Table columns optimized for virtual scrolling
  const columns: ColumnDef<User>[] = React.useMemo(() => [
    {
      accessorKey: "username",
      header: "User",
      cell: ({ row }) => {
        const user = row.original
        return (
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0">
              <span className="text-xs font-medium text-primary">
                {user.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{user.username}</div>
              <div className="text-xs text-muted-foreground truncate">{user.email}</div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "full_name",
      header: "Full Name",
      cell: ({ row }) => (
        <span className="truncate">{row.getValue("full_name") || "-"}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const user = row.original
        return (
          <div className="flex gap-1 flex-wrap">
            <Badge variant={user.is_active ? "default" : "destructive"} className="text-xs">
              {user.is_active ? "Active" : "Inactive"}
            </Badge>
            {user.is_superuser && (
              <Badge variant="outline" className="text-xs">
                <Shield className="w-2 h-2 mr-1" />
                Admin
              </Badge>
            )}
            {user.is_verified && (
              <Badge variant="outline" className="text-xs">
                <UserCheck className="w-2 h-2 mr-1" />
                Verified
              </Badge>
            )}
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
          <span className="text-xs text-muted-foreground">
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
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-6 w-6 p-0">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => handleRowAction(user, 'edit')}>
                <Edit3 className="h-3 w-3 mr-2" />
                Edit User
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleRowAction(user, 'view')}>
                View Details
              </DropdownMenuItem>
              {!user.is_superuser && (
                <DropdownMenuItem 
                  onClick={() => handleRowAction(user, 'delete')}
                  className="text-red-600"
                >
                  Delete User
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ], [])

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Users (Performance Demo)</h1>
            <p className="text-sm text-muted-foreground">
              Virtual scrolling with {allUsers.length.toLocaleString()} users. 
              Showing {processedUsers.length.toLocaleString()} filtered results.
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>

        {/* Advanced Search */}
        <AdvancedSearch
          searchState={searchState}
          onSearchChange={updateSearchState}
          availableFilters={availableFilters}
          availableSorts={availableSorts}
          placeholder="Search users by username, email, or name..."
          resultCount={processedUsers.length}
          loading={false}
        />

        {/* Performance Stats */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-blue-900 dark:text-blue-100">Performance Optimization Active</h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Virtual scrolling enabled - Only rendering visible rows for optimal performance
              </p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                {Math.ceil(600 / 50)} rows rendered
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-300">
                of {processedUsers.length.toLocaleString()} total
              </div>
            </div>
          </div>
        </div>

        {/* Virtualized Table */}
        <VirtualizedTable
          columns={columns}
          data={processedUsers}
          height={600}
          itemHeight={50}
          searchKey="username"
          enableSearch={false} // Using advanced search instead
          className="border rounded-lg"
        />
      </div>
    </div>
  )
}

export default UsersPerformancePage