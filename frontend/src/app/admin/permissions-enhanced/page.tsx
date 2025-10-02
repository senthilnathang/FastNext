'use client'

import * as React from 'react'
// import { PermissionsDataTable, type Permission } from '@/shared/components/data-table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Badge } from '@/shared/components/ui/badge'
import { Key, Tag, Lock, Zap } from 'lucide-react'

// Mock data for demonstration - in real app, this would come from API
const mockPermissions: Permission[] = [
  // User Management Permissions
  {
    id: 1,
    name: 'Manage Users',
    description: 'Full access to user management including create, edit, delete, and view users',
    category: 'user',
    action: 'manage',
    resource: 'users',
    is_system_permission: true,
    created_at: '2023-01-15T10:00:00Z',
    updated_at: '2024-01-20T14:30:00Z'
  },
  {
    id: 2,
    name: 'Create Users',
    description: 'Ability to create new user accounts',
    category: 'user',
    action: 'create',
    resource: 'users',
    is_system_permission: false,
    created_at: '2023-01-15T10:05:00Z'
  },
  {
    id: 3,
    name: 'Edit Users',
    description: 'Ability to modify existing user information',
    category: 'user',
    action: 'update',
    resource: 'users',
    is_system_permission: false,
    created_at: '2023-01-15T10:10:00Z'
  },
  {
    id: 4,
    name: 'Delete Users',
    description: 'Ability to permanently delete user accounts',
    category: 'user',
    action: 'delete',
    resource: 'users',
    is_system_permission: false,
    created_at: '2023-01-15T10:15:00Z'
  },
  {
    id: 5,
    name: 'View User Profiles',
    description: 'Access to view user profile information',
    category: 'user',
    action: 'read',
    resource: 'profiles',
    is_system_permission: false,
    created_at: '2023-01-15T10:20:00Z'
  },

  // Content Management Permissions
  {
    id: 6,
    name: 'Create Content',
    description: 'Ability to create new content items',
    category: 'content',
    action: 'create',
    resource: 'content',
    is_system_permission: false,
    created_at: '2023-02-10T09:15:00Z'
  },
  {
    id: 7,
    name: 'Edit Content',
    description: 'Ability to modify existing content',
    category: 'content',
    action: 'update',
    resource: 'content',
    is_system_permission: false,
    created_at: '2023-02-10T09:20:00Z'
  },
  {
    id: 8,
    name: 'Delete Content',
    description: 'Ability to permanently delete content',
    category: 'content',
    action: 'delete',
    resource: 'content',
    is_system_permission: false,
    created_at: '2023-02-10T09:25:00Z'
  },
  {
    id: 9,
    name: 'Publish Content',
    description: 'Ability to publish content and make it live',
    category: 'content',
    action: 'publish',
    resource: 'content',
    is_system_permission: false,
    created_at: '2023-02-10T09:30:00Z'
  },
  {
    id: 10,
    name: 'Moderate Comments',
    description: 'Ability to moderate and manage user comments',
    category: 'content',
    action: 'moderate',
    resource: 'comments',
    is_system_permission: false,
    created_at: '2023-04-12T16:45:00Z'
  },

  // System Permissions
  {
    id: 11,
    name: 'System Configuration',
    description: 'Access to system configuration and settings',
    category: 'system',
    action: 'manage',
    resource: 'settings',
    is_system_permission: true,
    created_at: '2023-01-20T11:30:00Z'
  },
  {
    id: 12,
    name: 'Manage Permissions',
    description: 'Ability to create, edit, and delete permissions',
    category: 'system',
    action: 'manage',
    resource: 'permissions',
    is_system_permission: true,
    created_at: '2023-01-15T10:05:00Z'
  },
  {
    id: 13,
    name: 'Manage Roles',
    description: 'Ability to create, edit, and delete roles',
    category: 'system',
    action: 'manage',
    resource: 'roles',
    is_system_permission: true,
    created_at: '2023-01-15T10:10:00Z'
  },
  {
    id: 14,
    name: 'View System Logs',
    description: 'Access to view system logs and audit trails',
    category: 'system',
    action: 'read',
    resource: 'logs',
    is_system_permission: false,
    created_at: '2023-03-01T14:20:00Z'
  },

  // Project Permissions
  {
    id: 15,
    name: 'Create Projects',
    description: 'Ability to create new projects',
    category: 'project',
    action: 'create',
    resource: 'projects',
    is_system_permission: false,
    created_at: '2023-03-15T11:10:00Z'
  },
  {
    id: 16,
    name: 'Edit Projects',
    description: 'Ability to modify existing projects',
    category: 'project',
    action: 'update',
    resource: 'projects',
    is_system_permission: false,
    created_at: '2023-03-15T11:15:00Z'
  },
  {
    id: 17,
    name: 'Deploy Projects',
    description: 'Permission to deploy projects to production',
    category: 'project',
    action: 'deploy',
    resource: 'projects',
    is_system_permission: false,
    created_at: '2023-05-01T09:00:00Z'
  },
  {
    id: 18,
    name: 'Archive Projects',
    description: 'Ability to archive completed or cancelled projects',
    category: 'project',
    action: 'archive',
    resource: 'projects',
    is_system_permission: false,
    created_at: '2023-06-10T15:30:00Z'
  },

  // Reports Permissions
  {
    id: 19,
    name: 'View Reports',
    description: 'Access to view system reports and analytics',
    category: 'reports',
    action: 'read',
    resource: 'reports',
    is_system_permission: false,
    created_at: '2023-03-05T14:10:00Z'
  },
  {
    id: 20,
    name: 'Export Reports',
    description: 'Ability to export reports in various formats',
    category: 'reports',
    action: 'export',
    resource: 'reports',
    is_system_permission: false,
    created_at: '2023-03-05T14:15:00Z'
  },
  {
    id: 21,
    name: 'Create Custom Reports',
    description: 'Ability to create and save custom report configurations',
    category: 'reports',
    action: 'create',
    resource: 'custom-reports',
    is_system_permission: false,
    created_at: '2023-07-20T10:45:00Z'
  },

  // API Permissions
  {
    id: 22,
    name: 'API Read Access',
    description: 'Read-only access to API endpoints',
    category: 'api',
    action: 'read',
    resource: 'api',
    is_system_permission: false,
    created_at: '2023-04-05T12:00:00Z'
  },
  {
    id: 23,
    name: 'API Write Access',
    description: 'Write access to API endpoints',
    category: 'api',
    action: 'write',
    resource: 'api',
    is_system_permission: false,
    created_at: '2023-04-05T12:05:00Z'
  },
  {
    id: 24,
    name: 'API Admin Access',
    description: 'Administrative access to API management',
    category: 'api',
    action: 'manage',
    resource: 'api',
    is_system_permission: true,
    created_at: '2023-04-05T12:10:00Z'
  }
]

export default function EnhancedPermissionsPage() {
  const [isLoading] = React.useState(false)

  // Calculate statistics
  const stats = React.useMemo(() => {
    const totalPermissions = mockPermissions.length
    const systemPermissions = mockPermissions.filter(p => p.is_system_permission).length
    const customPermissions = totalPermissions - systemPermissions
    
    // Group by category
    const categoryStats = mockPermissions.reduce((acc, permission) => {
      acc[permission.category] = (acc[permission.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    // Group by action
    const actionStats = mockPermissions.reduce((acc, permission) => {
      acc[permission.action] = (acc[permission.action] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const topCategory = Object.entries(categoryStats).sort(([,a], [,b]) => b - a)[0]
    const topAction = Object.entries(actionStats).sort(([,a], [,b]) => b - a)[0]

    return {
      totalPermissions,
      systemPermissions,
      customPermissions,
      categoriesCount: Object.keys(categoryStats).length,
      actionsCount: Object.keys(actionStats).length,
      topCategory: topCategory ? topCategory[0] : 'none',
      topCategoryCount: topCategory ? topCategory[1] : 0,
      topAction: topAction ? topAction[0] : 'none',
      topActionCount: topAction ? topAction[1] : 0,
      categoryStats,
      actionStats
    }
  }, [])

  const handleEditPermission = (permission: Permission) => {
    console.log('Edit permission:', permission)
    // TODO: Implement permission editing dialog
  }

  const handleDeletePermission = (permission: Permission) => {
    console.log('Delete permission:', permission)
    // TODO: Implement permission deletion with confirmation
  }

  const handleViewPermission = (permission: Permission) => {
    console.log('View permission:', permission)
    // TODO: Navigate to permission details page or show details modal
  }

  const handleAddPermission = () => {
    console.log('Add new permission')
    // TODO: Open add permission dialog/form
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Enhanced Permissions Management</h1>
        <p className="text-muted-foreground">
          Advanced permission management with comprehensive features including categorization, action types, bulk operations, and detailed analytics.
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Permissions</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPermissions}</div>
            <p className="text-xs text-muted-foreground">
              {stats.systemPermissions} system, {stats.customPermissions} custom
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.categoriesCount}</div>
            <p className="text-xs text-muted-foreground">
              Top: {stats.topCategory} ({stats.topCategoryCount})
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Action Types</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.actionsCount}</div>
            <p className="text-xs text-muted-foreground">
              Top: {stats.topAction} ({stats.topActionCount})
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Protected</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.systemPermissions}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((stats.systemPermissions / stats.totalPermissions) * 100)}% of total
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Permissions</TabsTrigger>
          <TabsTrigger value="user">User</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="project">Project</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Permissions</CardTitle>
              <CardDescription>
                Complete list of all system permissions with advanced table features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PermissionsDataTable
                permissions={mockPermissions}
                onEditPermission={handleEditPermission}
                onDeletePermission={handleDeletePermission}
                onViewPermission={handleViewPermission}
                onAddPermission={handleAddPermission}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="user" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management Permissions</CardTitle>
              <CardDescription>
                Permissions related to user account management and profile access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PermissionsDataTable
                permissions={mockPermissions.filter(p => p.category === 'user')}
                onEditPermission={handleEditPermission}
                onDeletePermission={handleDeletePermission}
                onViewPermission={handleViewPermission}
                onAddPermission={handleAddPermission}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Content Management Permissions</CardTitle>
              <CardDescription>
                Permissions for content creation, editing, publishing, and moderation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PermissionsDataTable
                permissions={mockPermissions.filter(p => p.category === 'content')}
                onEditPermission={handleEditPermission}
                onDeletePermission={handleDeletePermission}
                onViewPermission={handleViewPermission}
                onAddPermission={handleAddPermission}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Permissions</CardTitle>
              <CardDescription>
                System permissions are critical for application security and should be managed carefully.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PermissionsDataTable
                permissions={mockPermissions.filter(p => p.category === 'system')}
                onEditPermission={handleEditPermission}
                onDeletePermission={handleDeletePermission}
                onViewPermission={handleViewPermission}
                onAddPermission={handleAddPermission}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="project" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Management Permissions</CardTitle>
              <CardDescription>
                Permissions for project lifecycle management including deployment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PermissionsDataTable
                permissions={mockPermissions.filter(p => p.category === 'project')}
                onEditPermission={handleEditPermission}
                onDeletePermission={handleDeletePermission}
                onViewPermission={handleViewPermission}
                onAddPermission={handleAddPermission}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Permission Analytics</CardTitle>
              <CardDescription>
                Detailed breakdown of permissions by category and action type
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Category Distribution */}
              <div>
                <h4 className="text-sm font-medium mb-3">Permissions by Category</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {Object.entries(stats.categoryStats).map(([category, count]) => (
                    <div key={category} className="text-center p-3 border rounded-lg">
                      <div className="text-lg font-bold">{count}</div>
                      <div className="text-sm text-muted-foreground capitalize">{category}</div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Action Distribution */}
              <div>
                <h4 className="text-sm font-medium mb-3">Permissions by Action Type</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {Object.entries(stats.actionStats).map(([action, count]) => (
                    <div key={action} className="text-center p-3 border rounded-lg">
                      <div className="text-lg font-bold">{count}</div>
                      <div className="text-sm text-muted-foreground capitalize">{action}</div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* System vs Custom Distribution */}
              <div>
                <h4 className="text-sm font-medium mb-3">Permission Types</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-4 border rounded-lg bg-red-50 dark:bg-red-950">
                    <div className="text-2xl font-bold text-red-600">{stats.systemPermissions}</div>
                    <div className="text-sm text-muted-foreground">System Protected</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
                    <div className="text-2xl font-bold text-blue-600">{stats.customPermissions}</div>
                    <div className="text-sm text-muted-foreground">Custom Permissions</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Enhanced Features</CardTitle>
          <CardDescription>
            Available features in the enhanced permissions table
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">✓</Badge>
              <span className="text-sm">Category-based filtering</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">✓</Badge>
              <span className="text-sm">Action type indicators</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">✓</Badge>
              <span className="text-sm">Permission key generation</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">✓</Badge>
              <span className="text-sm">System permission protection</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">✓</Badge>
              <span className="text-sm">Bulk operations with safety checks</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">✓</Badge>
              <span className="text-sm">Advanced search across all fields</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">✓</Badge>
              <span className="text-sm">Color-coded categories & actions</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">✓</Badge>
              <span className="text-sm">Export with permission details</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">✓</Badge>
              <span className="text-sm">Analytics & distribution insights</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}