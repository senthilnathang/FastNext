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
import { Key, Tag, Lock, Zap, Calendar, Shield, Plus, Loader2 } from 'lucide-react'
import type { SortOption, GroupOption } from '@/shared/components/ui'
import { formatDistanceToNow } from 'date-fns'

// Import React Query hooks
import { usePermissions, useCreatePermission, useDeletePermission } from "@/modules/admin/hooks/usePermissions"
import { apiUtils } from "@/shared/services/api/client"
import type { Permission } from "@/shared/services/api/permissions"

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

export default function PermissionsPage() {
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
  
  const [formData, setFormData] = React.useState({
    name: '',
    description: '',
    category: '',
    action: '',
    resource: '',
  })

  // Queries
  const { data: permissionsData, isLoading: permissionsLoading, error: permissionsError } = usePermissions()

  // Mutations
  const createPermissionMutation = useCreatePermission()
  const deletePermissionMutation = useDeletePermission()

  const permissions = permissionsData?.items || []

  // Calculate statistics
  const stats = React.useMemo(() => {
    const totalPermissions = permissions.length
    const systemPermissions = permissions.filter((p: any) => p.is_system_permission).length
    const customPermissions = totalPermissions - systemPermissions
    
    // Group by category
    const categoryStats = permissions.reduce((acc: any, permission: any) => {
      acc[permission.category] = (acc[permission.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    // Group by action
    const actionStats = permissions.reduce((acc: any, permission: any) => {
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
  }, [permissions])

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
      render: (value) => value ? (
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {formatDistanceToNow(new Date(value as string), { addSuffix: true })}
          </span>
        </div>
      ) : null
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

  const handleCreatePermission = React.useCallback(() => {
    if (!formData.name || !formData.category || !formData.action) {
      alert('Please fill in all required fields')
      return
    }

    createPermissionMutation.mutate({
      name: formData.name,
      description: formData.description,
      category: formData.category,
      action: formData.action,
      resource: formData.resource,
    }, {
      onSuccess: () => {
        setFormData({ name: '', description: '', category: '', action: '', resource: '' })
        setCreateDialogOpen(false)
      },
      onError: (error) => {
        alert(`Failed to create permission: ${apiUtils.getErrorMessage(error)}`)
      }
    })
  }, [formData, createPermissionMutation])

  const handleEditPermission = (permission: any) => {
    setSelectedPermission(permission)
    setEditDialogOpen(true)
  }

  const handleDeletePermission = (permission: any) => {
    if (permission.is_system_permission) {
      alert('System permissions cannot be deleted')
      return
    }
    
    if (confirm(`Are you sure you want to delete permission "${permission.name}"?`)) {
      deletePermissionMutation.mutate(permission.id)
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
          customPermissions.forEach(permission => deletePermissionMutation.mutate(permission.id))
        }
      },
      variant: 'destructive' as const
    }
  ]

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
              {stats.totalPermissions > 0 ? Math.round((stats.systemPermissions / stats.totalPermissions) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Permissions Management with ViewManager */}
      <ViewManager
        title="Permissions Management"
        subtitle="Comprehensive permission management with analytics, filtering, sorting, bulk operations, and export capabilities"
        data={permissions as Permission[]}
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
                disabled={isCreating}
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
                  disabled={isCreating}
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
                  disabled={isCreating}
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
                disabled={isCreating}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Allows managing user accounts and settings"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={isCreating}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreatePermission}
              disabled={!formData.name || !formData.category || !formData.action || isCreating}
            >
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isCreating ? 'Creating...' : 'Create Permission'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}