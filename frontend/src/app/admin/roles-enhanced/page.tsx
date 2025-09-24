'use client'

import * as React from 'react'
import { RolesDataTable, type Role } from '@/shared/components/data-table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Badge } from '@/shared/components/ui/badge'
import { Shield, Users, Crown, AlertCircle } from 'lucide-react'

// Mock data for demonstration - in real app, this would come from API
const mockRoles: Role[] = [
  {
    id: 1,
    name: 'Super Administrator',
    description: 'Full system access with all permissions. Can manage system settings and other administrators.',
    is_system_role: true,
    is_active: true,
    created_at: '2023-01-15T10:00:00Z',
    updated_at: '2024-01-20T14:30:00Z',
    user_count: 2,
    permissions: [
      { id: 1, name: 'Manage Users', category: 'user', action: 'manage', is_system_permission: true },
      { id: 2, name: 'Manage Roles', category: 'role', action: 'manage', is_system_permission: true },
      { id: 3, name: 'System Settings', category: 'system', action: 'manage', is_system_permission: true },
      { id: 4, name: 'View Reports', category: 'reports', action: 'read', is_system_permission: true },
    ]
  },
  {
    id: 2,
    name: 'Administrator',
    description: 'Administrative access to most system functions. Cannot manage system settings.',
    is_system_role: true,
    is_active: true,
    created_at: '2023-01-15T10:05:00Z',
    updated_at: '2024-01-15T16:20:00Z',
    user_count: 3,
    permissions: [
      { id: 1, name: 'Manage Users', category: 'user', action: 'manage', is_system_permission: true },
      { id: 5, name: 'Manage Content', category: 'content', action: 'manage', is_system_permission: false },
      { id: 4, name: 'View Reports', category: 'reports', action: 'read', is_system_permission: true },
    ]
  },
  {
    id: 3,
    name: 'Content Manager',
    description: 'Can create, edit, and publish content. Has access to content management tools.',
    is_system_role: false,
    is_active: true,
    created_at: '2023-02-10T09:15:00Z',
    updated_at: '2024-01-10T11:45:00Z',
    user_count: 8,
    permissions: [
      { id: 6, name: 'Create Content', category: 'content', action: 'create', is_system_permission: false },
      { id: 7, name: 'Edit Content', category: 'content', action: 'update', is_system_permission: false },
      { id: 8, name: 'Publish Content', category: 'content', action: 'publish', is_system_permission: false },
      { id: 9, name: 'Moderate Comments', category: 'content', action: 'moderate', is_system_permission: false },
    ]
  },
  {
    id: 4,
    name: 'Editor',
    description: 'Can create and edit content but cannot publish. Requires approval for publishing.',
    is_system_role: false,
    is_active: true,
    created_at: '2023-02-15T14:20:00Z',
    updated_at: '2023-12-20T09:30:00Z',
    user_count: 12,
    permissions: [
      { id: 6, name: 'Create Content', category: 'content', action: 'create', is_system_permission: false },
      { id: 7, name: 'Edit Content', category: 'content', action: 'update', is_system_permission: false },
      { id: 10, name: 'View Content', category: 'content', action: 'read', is_system_permission: false },
    ]
  },
  {
    id: 5,
    name: 'Reviewer',
    description: 'Can review and approve content for publishing. Cannot create or edit content.',
    is_system_role: false,
    is_active: true,
    created_at: '2023-03-01T11:30:00Z',
    user_count: 5,
    permissions: [
      { id: 10, name: 'View Content', category: 'content', action: 'read', is_system_permission: false },
      { id: 11, name: 'Review Content', category: 'content', action: 'review', is_system_permission: false },
      { id: 8, name: 'Publish Content', category: 'content', action: 'publish', is_system_permission: false },
    ]
  },
  {
    id: 6,
    name: 'Viewer',
    description: 'Read-only access to content and basic system information.',
    is_system_role: false,
    is_active: true,
    created_at: '2023-03-20T16:20:00Z',
    user_count: 25,
    permissions: [
      { id: 10, name: 'View Content', category: 'content', action: 'read', is_system_permission: false },
      { id: 12, name: 'View User Profiles', category: 'user', action: 'read', is_system_permission: false },
    ]
  },
  {
    id: 7,
    name: 'Guest',
    description: 'Limited access for temporary or trial users. Very restricted permissions.',
    is_system_role: false,
    is_active: false,
    created_at: '2023-05-12T08:30:00Z',
    user_count: 0,
    permissions: [
      { id: 13, name: 'Basic Access', category: 'system', action: 'read', is_system_permission: false },
    ]
  },
  {
    id: 8,
    name: 'API User',
    description: 'Programmatic access for API integrations and automated systems.',
    is_system_role: false,
    is_active: true,
    created_at: '2023-04-05T12:10:00Z',
    updated_at: '2024-01-05T10:15:00Z',
    user_count: 3,
    permissions: [
      { id: 14, name: 'API Access', category: 'api', action: 'read', is_system_permission: false },
      { id: 15, name: 'API Write', category: 'api', action: 'write', is_system_permission: false },
    ]
  }
]

export default function EnhancedRolesPage() {
  const [isLoading] = React.useState(false)

  // Calculate statistics
  const stats = React.useMemo(() => {
    const totalRoles = mockRoles.length
    const systemRoles = mockRoles.filter(role => role.is_system_role).length
    const activeRoles = mockRoles.filter(role => role.is_active).length
    const totalUsers = mockRoles.reduce((sum, role) => sum + (role.user_count || 0), 0)
    const avgPermissions = mockRoles.reduce((sum, role) => sum + (role.permissions?.length || 0), 0) / totalRoles

    return {
      totalRoles,
      systemRoles,
      customRoles: totalRoles - systemRoles,
      activeRoles,
      inactiveRoles: totalRoles - activeRoles,
      totalUsers,
      avgPermissions: Math.round(avgPermissions * 10) / 10
    }
  }, [])

  const handleEditRole = (role: Role) => {
    console.log('Edit role:', role)
    // TODO: Implement role editing dialog
  }

  const handleDeleteRole = (role: Role) => {
    console.log('Delete role:', role)
    // TODO: Implement role deletion with confirmation
  }

  const handleViewRole = (role: Role) => {
    console.log('View role:', role)
    // TODO: Navigate to role details page or show details modal
  }

  const handleAddRole = () => {
    console.log('Add new role')
    // TODO: Open add role dialog/form
  }

  const handleToggleStatus = (role: Role) => {
    console.log('Toggle role status:', role)
    // TODO: Toggle role active/inactive status
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Enhanced Roles Management</h1>
        <p className="text-muted-foreground">
          Advanced role management with comprehensive features including pagination, filtering, sorting, bulk operations, and export capabilities.
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRoles}</div>
            <p className="text-xs text-muted-foreground">
              {stats.systemRoles} system, {stats.customRoles} custom
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Roles</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeRoles}</div>
            <p className="text-xs text-muted-foreground">
              {stats.inactiveRoles} inactive
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Across all roles
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Permissions</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgPermissions}</div>
            <p className="text-xs text-muted-foreground">
              Per role
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Roles</TabsTrigger>
          <TabsTrigger value="system">System Roles</TabsTrigger>
          <TabsTrigger value="custom">Custom Roles</TabsTrigger>
          <TabsTrigger value="inactive">Inactive</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Roles</CardTitle>
              <CardDescription>
                Complete list of all system and custom roles with advanced table features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RolesDataTable
                roles={mockRoles}
                onEditRole={handleEditRole}
                onDeleteRole={handleDeleteRole}
                onViewRole={handleViewRole}
                onAddRole={handleAddRole}
                onToggleStatus={handleToggleStatus}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Roles</CardTitle>
              <CardDescription>
                System roles are protected and have limited editing capabilities to maintain system security.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RolesDataTable
                roles={mockRoles.filter(role => role.is_system_role)}
                onEditRole={handleEditRole}
                onDeleteRole={handleDeleteRole}
                onViewRole={handleViewRole}
                onAddRole={handleAddRole}
                onToggleStatus={handleToggleStatus}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="custom" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Custom Roles</CardTitle>
              <CardDescription>
                User-created roles that can be fully customized
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RolesDataTable
                roles={mockRoles.filter(role => !role.is_system_role)}
                onEditRole={handleEditRole}
                onDeleteRole={handleDeleteRole}
                onViewRole={handleViewRole}
                onAddRole={handleAddRole}
                onToggleStatus={handleToggleStatus}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="inactive" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inactive Roles</CardTitle>
              <CardDescription>
                Inactive roles cannot be assigned to users but are retained for historical purposes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RolesDataTable
                roles={mockRoles.filter(role => !role.is_active)}
                onEditRole={handleEditRole}
                onDeleteRole={handleDeleteRole}
                onViewRole={handleViewRole}
                onAddRole={handleAddRole}
                onToggleStatus={handleToggleStatus}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Enhanced Features</CardTitle>
          <CardDescription>
            Available features in the enhanced roles table
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">✓</Badge>
              <span className="text-sm">Multi-column sorting</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">✓</Badge>
              <span className="text-sm">Global search filtering</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">✓</Badge>
              <span className="text-sm">Column show/hide controls</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">✓</Badge>
              <span className="text-sm">Row selection & bulk actions</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">✓</Badge>
              <span className="text-sm">Export to CSV/Excel/JSON</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">✓</Badge>
              <span className="text-sm">Responsive pagination</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">✓</Badge>
              <span className="text-sm">Individual row actions</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">✓</Badge>
              <span className="text-sm">Loading states & skeletons</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">✓</Badge>
              <span className="text-sm">Status indicators & badges</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}