'use client'

import * as React from 'react'
import { ViewManager, ViewConfig, Column } from '@/shared/components/views'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button
} from '@/shared/components'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Badge } from '@/shared/components/ui/badge'
import { Key, Tag, Lock, Zap, Calendar, Shield } from 'lucide-react'
import type { SortOption, GroupOption } from '@/shared/components/ui'
import { formatDistanceToNow } from 'date-fns'
import type { Permission } from '@/shared/services/api/permissions'

// Categories and actions for permission management
const categories = [
  'project',
  'page', 
  'component',
  'user',
  'system',
  'content',
  'reports',
  'api'
]

const permissionActions = [
  'create',
  'read', 
  'update',
  'delete',
  'manage',
  'publish',
  'deploy',
  'archive',
  'export',
  'moderate',
  'write'
]

// Mock data for demonstration - in real app, this would come from API
const mockPermissions = [
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
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)
  const [selectedPermission, setSelectedPermission] = React.useState<Permission | null>(null)
  const [activeView, setActiveView] = React.useState('permissions-list')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [filters, setFilters] = React.useState<Record<string, any>>({})
  const [sortBy, setSortBy] = React.useState<string>('created_at')
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc')
  const [groupBy, setGroupBy] = React.useState<string>('')
  const [selectedItems, setSelectedItems] = React.useState<any[]>([])
  const [isLoading] = React.useState(false)
  
  const [formData, setFormData] = React.useState({
    name: '',
    description: '',
    category: '',
    action: '',
    resource: '',
  })

  // Calculate statistics
  const stats = React.useMemo(() => {
    const totalPermissions = mockPermissions.length
    const systemPermissions = mockPermissions.filter((p: any) => p.is_system_permission).length
    const customPermissions = totalPermissions - systemPermissions
    
    // Group by category
    const categoryStats = mockPermissions.reduce((acc: any, permission: any) => {
      acc[permission.category] = (acc[permission.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    // Group by action
    const actionStats = mockPermissions.reduce((acc: any, permission: any) => {
      acc[permission.action] = (acc[permission.action] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const topCategory = Object.entries(categoryStats).sort(([,a], [,b]) => (b as number) - (a as number))[0]
    const topAction = Object.entries(actionStats).sort(([,a], [,b]) => (b as number) - (a as number))[0]

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

  // Define columns for the ViewManager
  const columns: Column[] = React.useMemo(() => [
    {
      id: 'name',
      key: 'name',
      label: 'Permission Name',
      sortable: true,
      searchable: true,
      render: (value, permission) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
            <Key className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <div className="font-medium">{value as string}</div>
            <div className="text-sm text-muted-foreground">
              {permission.description || 'No description'}
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'category',
      key: 'category',
      label: 'Category',
      sortable: true,
      filterable: true,
      type: 'select',
      filterOptions: categories.map(cat => ({ label: cat.charAt(0).toUpperCase() + cat.slice(1), value: cat })),
      render: (value) => (
        <Badge variant="outline" className="capitalize">
          {value as string}
        </Badge>
      )
    },
    {
      id: 'action',
      key: 'action',
      label: 'Action',
      sortable: true,
      filterable: true,
      type: 'select',
      filterOptions: permissionActions.map(action => ({ label: action.charAt(0).toUpperCase() + action.slice(1), value: action })),
      render: (value) => (
        <div className="flex items-center space-x-2">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-sm">{value as string}</span>
        </div>
      )
    },
    {
      id: 'resource',
      key: 'resource',
      label: 'Resource',
      sortable: true,
      searchable: true,
      render: (value) => (
        <span className="font-mono text-sm text-muted-foreground">
          {(value as string) || '-'}
        </span>
      )
    },
    {
      id: 'is_system_permission',
      key: 'is_system_permission',
      label: 'Type',
      sortable: true,
      filterable: true,
      type: 'select',
      filterOptions: [
        { label: 'System Permission', value: true },
        { label: 'Custom Permission', value: false }
      ],
      render: (value) => (
        <Badge variant={value ? "secondary" : "default"}>
          {value ? "System" : "Custom"}
        </Badge>
      )
    },
    {
      id: 'created_at',
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (value) => (
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {formatDistanceToNow(new Date(value as string), { addSuffix: true })}
          </span>
        </div>
      )
    }
  ], [])

  // Define sort options
  const sortOptions: SortOption[] = React.useMemo(() => [
    {
      key: 'name',
      label: 'Permission Name',
      defaultOrder: 'asc'
    },
    {
      key: 'category',
      label: 'Category',
      defaultOrder: 'asc'
    },
    {
      key: 'action',
      label: 'Action',
      defaultOrder: 'asc'
    },
    {
      key: 'created_at',
      label: 'Created Date',
      defaultOrder: 'desc'
    }
  ], [])

  // Define group options
  const groupOptions: GroupOption[] = React.useMemo(() => [
    {
      key: 'category',
      label: 'Category',
      icon: <Tag className="h-4 w-4" />
    },
    {
      key: 'action',
      label: 'Action',
      icon: <Key className="h-4 w-4" />
    },
    {
      key: 'is_system_permission',
      label: 'Permission Type',
      icon: <Shield className="h-4 w-4" />
    }
  ], [])

  // Define available views
  const views: ViewConfig[] = React.useMemo(() => [
    {
      id: 'permissions-card',
      name: 'Card View',
      type: 'card',
      columns,
      filters: {},
      sortBy: 'created_at',
      sortOrder: 'desc'
    },
    {
      id: 'permissions-list',
      name: 'List View',
      type: 'list',
      columns,
      filters: {},
      sortBy: 'created_at',
      sortOrder: 'desc'
    },
    {
      id: 'permissions-kanban',
      name: 'Kanban Board',
      type: 'kanban',
      columns,
      filters: {},
      groupBy: 'category'
    }
  ], [columns])

  // Auto-generate permission name
  React.useEffect(() => {
    if (formData.action && formData.category) {
      const generatedName = `${formData.action.charAt(0).toUpperCase() + formData.action.slice(1)} ${formData.category.charAt(0).toUpperCase() + formData.category.slice(1)}`
      if (formData.name !== generatedName) {
        setFormData(prev => ({ ...prev, name: generatedName }))
      }
    }
  }, [formData.action, formData.category, formData.name])

  const handleCreatePermission = () => {
    if (!formData.name || !formData.category || !formData.action) {
      alert('Please fill in all required fields')
      return
    }
    console.log('Create permission:', formData)
    // TODO: Implement API call
    setFormData({ name: '', description: '', category: '', action: '', resource: '' })
    setCreateDialogOpen(false)
  }

  const handleEditPermission = (permission: any) => {
    setSelectedPermission(permission)
    setEditDialogOpen(true)
  }

  const handleDeletePermission = (permission: any) => {
    if (confirm(`Are you sure you want to delete permission "${permission.name}"?`)) {
      console.log('Delete permission:', permission)
      // TODO: Implement API call
    }
  }

  const handleViewPermission = (permission: any) => {
    console.log('View permission:', permission)
    // TODO: Navigate to permission details page or show details modal
  }

  const handleExport = (format: string) => {
    console.log('Export permissions as', format)
    // TODO: Implement export
  }

  const handleImport = () => {
    console.log('Import permissions')
    // TODO: Implement import
  }

  const bulkActions = [
    {
      label: 'Delete Selected',
      action: (items: any[]) => {
        const customPermissions = items.filter(p => !p.is_system_permission)
        if (customPermissions.length > 0 && confirm(`Delete ${customPermissions.length} permissions?`)) {
          customPermissions.forEach(permission => console.log('Delete permission:', permission.id))
        }
      },
      variant: 'destructive' as const
    }
  ]

  return (
    <div className="container mx-auto py-6 space-y-6">

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
              Top: {stats.topCategory ? String(stats.topCategory) : 'N/A'} ({String(stats.topCategoryCount)})
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
              Top: {String(stats.topAction)} ({String(stats.topActionCount)})
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

      {/* Enhanced Permissions Management with ViewManager */}
      <ViewManager
        title="Enhanced Permissions Management"
        subtitle="Advanced permission management with comprehensive features including analytics, filtering, sorting, bulk operations, and export capabilities"
        data={mockPermissions as Permission[]}
        columns={columns}
        views={views}
        activeView={activeView}
        onViewChange={setActiveView}
        loading={isLoading}
        error={null}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filters}
        onFiltersChange={setFilters}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={(field, order) => {
          setSortBy(field)
          setSortOrder(order)
        }}
        sortOptions={sortOptions}
        groupBy={groupBy}
        onGroupChange={setGroupBy}
        groupOptions={groupOptions}
        onExport={handleExport}
        onImport={handleImport}
        onCreateClick={() => setCreateDialogOpen(true)}
        onEditClick={handleEditPermission}
        onDeleteClick={handleDeletePermission}
        onViewClick={handleViewPermission}
        selectable={true}
        selectedItems={selectedItems}
        onSelectionChange={setSelectedItems}
        bulkActions={bulkActions}
        showToolbar={true}
        showSearch={true}
        showFilters={true}
        showExport={true}
        showImport={true}
      />

      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="insights">Distribution Insights</TabsTrigger>
        </TabsList>
        
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
                      <div className="text-lg font-bold">{String(count)}</div>
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
                      <div className="text-lg font-bold">{String(count)}</div>
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
        
        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Category Breakdown</CardTitle>
                <CardDescription>Most common permission categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(stats.categoryStats)
                    .sort(([,a], [,b]) => (b as number) - (a as number))
                    .map(([category, count]) => (
                      <div key={category} className="flex justify-between items-center">
                        <span className="capitalize text-sm">{category}</span>
                        <Badge variant="outline">{String(count)}</Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Action Distribution</CardTitle>
                <CardDescription>Most common permission actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(stats.actionStats)
                    .sort(([,a], [,b]) => (b as number) - (a as number))
                    .map(([action, count]) => (
                      <div key={action} className="flex justify-between items-center">
                        <span className="capitalize text-sm">{action}</span>
                        <Badge variant="outline">{String(count)}</Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
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

      {/* Create Permission Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Permission</DialogTitle>
            <DialogDescription>
              Define a new permission by specifying the resource and action it controls.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="category">Category *</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      <span className="capitalize">{category}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="action">Action *</Label>
                <Select 
                  value={formData.action} 
                  onValueChange={(value) => setFormData({ ...formData, action: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Action" />
                  </SelectTrigger>
                  <SelectContent>
                    {permissionActions.map((action) => (
                      <SelectItem key={action} value={action}>
                        <span className="capitalize">{action}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="resource">Resource</Label>
                <Input
                  id="resource"
                  placeholder="users"
                  value={formData.resource}
                  onChange={(e) => setFormData({ ...formData, resource: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">Permission Name *</Label>
              <Input
                id="name"
                placeholder="Manage Users"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Allows managing user accounts and settings"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreatePermission}
              disabled={!formData.name || !formData.category || !formData.action}
            >
              Create Permission
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}