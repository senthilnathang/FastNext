'use client';

import React, { useState } from 'react';
import { ViewManager, ViewConfig, Column } from '@/shared/components/views';
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
} from '@/shared/components';
import { Key, Tag, Calendar, Shield } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import type { SortOption, GroupOption } from '@/shared/components/ui';
import { formatDistanceToNow } from 'date-fns';
import { usePermissions, useCreatePermission, useDeletePermission, useUpdatePermission } from '@/modules/admin/hooks/usePermissions';
import { apiUtils } from '@/shared/services/api/client';
import type { Permission } from '@/shared/services/api/permissions';

const categories = [
  'project',
  'page', 
  'component',
  'user',
  'system'
];

const permissionActions = [
  'create',
  'read', 
  'update',
  'delete',
  'manage',
  'publish',
  'deploy'
];

export default function PermissionsSimplePage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);
  const [activeView, setActiveView] = useState('permissions-list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [groupBy, setGroupBy] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    action: '',
    resource: '',
  });

  const { data: permissionsData, isLoading, error } = usePermissions();
  const createPermission = useCreatePermission();
  const updatePermission = useUpdatePermission();
  const deletePermission = useDeletePermission();

  const permissions = React.useMemo(() => permissionsData?.items || [], [permissionsData]);

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
  ], []);

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
  ], []);

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
  ], []);

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
  ], [columns]);

  // Auto-generate permission name
  React.useEffect(() => {
    if (formData.action && formData.category) {
      const generatedName = `${formData.action.charAt(0).toUpperCase() + formData.action.slice(1)} ${formData.category.charAt(0).toUpperCase() + formData.category.slice(1)}`;
      if (formData.name !== generatedName) {
        setFormData(prev => ({ ...prev, name: generatedName }));
      }
    }
  }, [formData.action, formData.category, formData.name]);

  // Handle actions
  const handleCreatePermission = () => {
    if (!formData.name || !formData.category || !formData.action) {
      alert('Please fill in all required fields');
      return;
    }

    createPermission.mutate({
      name: formData.name,
      description: formData.description,
      category: formData.category,
      action: formData.action,
      resource: formData.resource,
    }, {
      onSuccess: () => {
        setFormData({ name: '', description: '', category: '', action: '', resource: '' });
        setCreateDialogOpen(false);
      },
      onError: (error) => {
        alert(`Failed to create permission: ${apiUtils.getErrorMessage(error)}`);
      },
    });
  };

  const handleEditPermission = (permission: any) => {
    setSelectedPermission(permission);
    setEditDialogOpen(true);
  };

  const handleDeletePermission = (permission: any) => {
    if (confirm(`Are you sure you want to delete permission "${permission.name}"?`)) {
      deletePermission.mutate(permission.id);
    }
  };

  const handleViewPermission = (permission: any) => {
    console.log('View permission:', permission);
    // TODO: Navigate to permission details page
  };

  const handleExport = (format: string) => {
    console.log('Export permissions as', format);
    // TODO: Implement export
  };

  const handleImport = () => {
    console.log('Import permissions');
    // TODO: Implement import
  };

  const bulkActions = [
    {
      label: 'Delete Selected',
      action: (items: any[]) => {
        const customPermissions = items.filter(p => !p.is_system_permission);
        if (customPermissions.length > 0 && confirm(`Delete ${customPermissions.length} permissions?`)) {
          customPermissions.forEach(permission => deletePermission.mutate(permission.id));
        }
      },
      variant: 'destructive' as const
    }
  ];

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Failed to load permissions
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {error.message || 'An error occurred while loading permissions'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <ViewManager
        title="Permissions"
        subtitle="Manage system permissions and access controls"
        data={permissions}
        columns={columns}
        views={views}
        activeView={activeView}
        onViewChange={setActiveView}
        loading={isLoading}
        error={error ? (error as any)?.message || String(error) : null}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filters}
        onFiltersChange={setFilters}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={(field, order) => {
          setSortBy(field);
          setSortOrder(order);
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
              disabled={createPermission.isPending || !formData.name || !formData.category || !formData.action}
            >
              {createPermission.isPending ? 'Creating...' : 'Create Permission'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}