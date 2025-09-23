'use client';

import React, { useState } from 'react';
import { Plus, Key, Calendar, Code, Settings } from 'lucide-react';
import { 
  Button,
  Badge,
  EnhancedListView,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/shared/components';
import type { ListViewColumn, ListViewAction } from '@/shared/components/data-visualization/EnhancedListView';
import { usePermissions, useCreatePermission, useDeletePermission } from '@/modules/admin/hooks/usePermissions';
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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPermission, setNewPermission] = useState({
    name: '',
    description: '',
    category: '',
    action: '',
    resource: '',
  });

  // Queries
  const { data: permissionsData, isLoading: permissionsLoading, error: permissionsError } = usePermissions();

  // Mutations
  const createPermissionMutation = useCreatePermission();
  const deletePermissionMutation = useDeletePermission();

  const permissions = permissionsData?.items || [];

  // Define columns
  const columns: ListViewColumn<Permission>[] = [
    {
      key: 'name',
      title: 'Permission Name',
      sortable: true,
      render: (value, permission) => (
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
            <Key className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <div className="font-medium">{String(value)}</div>
            {permission.is_system_permission && (
              <Badge variant="outline" className="text-xs mt-1">
                System Permission
              </Badge>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'description',
      title: 'Description',
      render: (value) => (
        <span className="text-gray-600 dark:text-gray-400">
          {String(value) || 'No description provided'}
        </span>
      ),
    },
    {
      key: 'category',
      title: 'Category',
      sortable: true,
      render: (value) => (
        <Badge variant="outline" className="text-xs capitalize">
          {String(value)}
        </Badge>
      ),
    },
    {
      key: 'action',
      title: 'Action',
      sortable: true,
      render: (value) => (
        <div className="flex items-center space-x-2">
          <Code className="h-4 w-4 text-gray-400" />
          <span className="font-mono text-sm">{String(value)}</span>
        </div>
      ),
    },
    {
      key: 'resource',
      title: 'Resource',
      render: (value) => (
        <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
          {String(value) || '-'}
        </span>
      ),
    },
    {
      key: 'created_at',
      title: 'Created',
      sortable: true,
      render: (value) => (
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Calendar className="h-4 w-4" />
          <span>{new Date(String(value)).toLocaleDateString()}</span>
        </div>
      ),
    },
  ];

  // Define actions
  const actions: ListViewAction<Permission>[] = [
    {
      key: 'edit',
      label: 'Edit',
      icon: Settings,
      onClick: (permission) => console.log('Edit permission:', permission),
      show: (permission) => !permission.is_system_permission,
    },
    {
      key: 'delete',
      label: 'Delete',
      variant: 'destructive',
      onClick: (permission) => {
        if (window.confirm(`Are you sure you want to delete permission "${permission.name}"?`)) {
          deletePermissionMutation.mutate(permission.id);
        }
      },
      show: (permission) => !permission.is_system_permission,
    },
  ];

  // Auto-generate permission name
  React.useEffect(() => {
    if (newPermission.action && newPermission.category) {
      const generatedName = `${newPermission.action.charAt(0).toUpperCase() + newPermission.action.slice(1)} ${newPermission.category.charAt(0).toUpperCase() + newPermission.category.slice(1)}`;
      if (newPermission.name !== generatedName) {
        setNewPermission(prev => ({ ...prev, name: generatedName }));
      }
    }
  }, [newPermission.action, newPermission.category, newPermission.name]);

  const generatePermissionId = () => {
    if (newPermission.resource && newPermission.action) {
      return `${newPermission.resource}.${newPermission.action}`;
    }
    return '';
  };

  // Handle create permission
  const handleCreatePermission = () => {
    if (!newPermission.name || !newPermission.category || !newPermission.action) {
      alert('Please fill in all required fields');
      return;
    }

    createPermissionMutation.mutate({
      name: newPermission.name,
      description: newPermission.description,
      category: newPermission.category,
      action: newPermission.action,
      resource: newPermission.resource,
    }, {
      onSuccess: () => {
        setNewPermission({ name: '', description: '', category: '', action: '', resource: '' });
        setIsCreateDialogOpen(false);
      },
      onError: (error) => {
        alert(`Failed to create permission: ${apiUtils.getErrorMessage(error)}`);
      },
    });
  };

  if (permissionsError) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Failed to load permissions</h2>
          <p className="text-gray-600">{apiUtils.getErrorMessage(permissionsError)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Permissions Management</h1>
          <p className="text-muted-foreground">
            Manage system permissions and access controls ({permissions.length} total)
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={permissionsLoading}>
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
                <Select 
                  value={newPermission.category} 
                  onValueChange={(value) => setNewPermission({ ...newPermission, category: value })}
                  disabled={createPermissionMutation.isPending}
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
                  <Label htmlFor="action">Action</Label>
                  <Select 
                    value={newPermission.action} 
                    onValueChange={(value) => setNewPermission({ ...newPermission, action: value })}
                    disabled={createPermissionMutation.isPending}
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
                  <Label htmlFor="resource">Resource (Optional)</Label>
                  <Input
                    id="resource"
                    placeholder="e.g., projects"
                    value={newPermission.resource}
                    onChange={(e) => setNewPermission({ ...newPermission, resource: e.target.value })}
                    disabled={createPermissionMutation.isPending}
                  />
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
                  disabled={createPermissionMutation.isPending}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Brief description of what this permission allows"
                  value={newPermission.description}
                  onChange={(e) => setNewPermission({ ...newPermission, description: e.target.value })}
                  disabled={createPermissionMutation.isPending}
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="submit" 
                onClick={handleCreatePermission}
                disabled={createPermissionMutation.isPending}
              >
                {createPermissionMutation.isPending ? 'Creating...' : 'Create Permission'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Permissions List */}
      <EnhancedListView
        data={permissions}
        columns={columns}
        actions={actions}
        loading={permissionsLoading}
        searchKey="name"
        emptyMessage="No permissions found. Create your first permission to get started."
        pageSize={15}
      />
    </div>
  );
}