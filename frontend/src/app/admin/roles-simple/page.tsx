'use client';

import React, { useState } from 'react';
import { Plus, Shield, Users, Calendar, Edit } from 'lucide-react';
import { Button } from '@/shared/components/button';
import { Badge } from '@/shared/components/badge';
import { EnhancedListView, ListViewColumn, ListViewAction } from '@/shared/components/EnhancedListView';
import { useRoles, useCreateRole, useDeleteRole } from '@/modules/admin/hooks/useRoles';
import { usePermissions } from '@/modules/admin/hooks/usePermissions';
import { apiUtils } from '@/shared/services/api/client';
import type { Role, Permission } from '@/shared/services/api/roles';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/dialog';
import { Input } from '@/shared/components/input';
import { Label } from '@/shared/components/label';
import { Checkbox } from '@/shared/components/checkbox';

export default function RolesSimplePage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState({
    name: '',
    description: '',
    permissions: [] as number[],
  });

  // Queries
  const { data: rolesData, isLoading: rolesLoading, error: rolesError } = useRoles();
  const { data: permissionsData } = usePermissions();

  // Mutations
  const createRoleMutation = useCreateRole();
  const deleteRoleMutation = useDeleteRole();

  const roles = rolesData?.items || [];
  const permissions = permissionsData?.items || [];

  // Group permissions by category
  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  // Define columns
  const columns: ListViewColumn<Role>[] = [
    {
      key: 'name',
      title: 'Role Name',
      sortable: true,
      render: (value, role) => (
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
            <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <div className="font-medium">{value}</div>
            {role.is_system_role && (
              <Badge variant="outline" className="text-xs mt-1">
                System Role
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
          {value || 'No description provided'}
        </span>
      ),
    },
    {
      key: 'permissions',
      title: 'Permissions',
      render: (value) => {
        const rolePermissions = Array.isArray(value) ? value : [];
        return (
          <div className="flex gap-1 flex-wrap max-w-xs">
            {rolePermissions.slice(0, 3).map((permission: Permission) => (
              <Badge key={permission.id} variant="secondary" className="text-xs">
                {permission.name}
              </Badge>
            ))}
            {rolePermissions.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{rolePermissions.length - 3} more
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      key: 'user_count',
      title: 'Users',
      sortable: true,
      align: 'center',
      render: (value) => (
        <div className="flex items-center justify-center space-x-1">
          <Users className="h-4 w-4 text-gray-400" />
          <span className="font-medium">{value || 0}</span>
        </div>
      ),
    },
    {
      key: 'created_at',
      title: 'Created',
      sortable: true,
      render: (value) => (
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Calendar className="h-4 w-4" />
          <span>{new Date(value).toLocaleDateString()}</span>
        </div>
      ),
    },
  ];

  // Define actions
  const actions: ListViewAction<Role>[] = [
    {
      key: 'edit',
      label: 'Edit',
      icon: Edit,
      onClick: (role) => console.log('Edit role:', role),
      show: (role) => !role.is_system_role,
    },
    {
      key: 'delete',
      label: 'Delete',
      variant: 'destructive',
      onClick: (role) => {
        if (window.confirm(`Are you sure you want to delete role "${role.name}"?`)) {
          deleteRoleMutation.mutate(role.id);
        }
      },
      show: (role) => !role.is_system_role,
    },
  ];

  const handlePermissionChange = (permissionId: number, checked: boolean) => {
    if (checked) {
      setNewRole({
        ...newRole,
        permissions: [...newRole.permissions, permissionId],
      });
    } else {
      setNewRole({
        ...newRole,
        permissions: newRole.permissions.filter((p) => p !== permissionId),
      });
    }
  };

  // Handle create role
  const handleCreateRole = () => {
    if (!newRole.name || !newRole.description) {
      alert('Please fill in all required fields');
      return;
    }

    createRoleMutation.mutate({
      name: newRole.name,
      description: newRole.description,
      permissions: newRole.permissions,
    }, {
      onSuccess: () => {
        setNewRole({ name: '', description: '', permissions: [] });
        setIsCreateDialogOpen(false);
      },
      onError: (error) => {
        alert(`Failed to create role: ${apiUtils.getErrorMessage(error)}`);
      },
    });
  };

  if (rolesError) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Failed to load roles</h2>
          <p className="text-gray-600">{apiUtils.getErrorMessage(rolesError)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Roles Management</h1>
          <p className="text-muted-foreground">
            Manage user roles and their permissions ({roles.length} total)
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={rolesLoading}>
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
                  disabled={createRoleMutation.isPending}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Brief description of the role"
                  value={newRole.description}
                  onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                  disabled={createRoleMutation.isPending}
                />
              </div>
              <div className="grid gap-4">
                <Label>Permissions</Label>
                <div className="space-y-4 max-h-60 overflow-y-auto">
                  {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => (
                    <div key={category} className="space-y-2">
                      <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 capitalize">
                        {category}
                      </h4>
                      <div className="space-y-2 pl-4">
                        {categoryPermissions.map((permission) => (
                          <div key={permission.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={permission.id.toString()}
                              checked={newRole.permissions.includes(permission.id)}
                              onCheckedChange={(checked) => 
                                handlePermissionChange(permission.id, checked as boolean)
                              }
                              disabled={createRoleMutation.isPending}
                            />
                            <div className="grid gap-1.5 leading-none">
                              <label
                                htmlFor={permission.id.toString()}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {permission.name}
                              </label>
                              {permission.description && (
                                <p className="text-xs text-muted-foreground">
                                  {permission.description}
                                </p>
                              )}
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
              <Button 
                type="submit" 
                onClick={handleCreateRole}
                disabled={createRoleMutation.isPending}
              >
                {createRoleMutation.isPending ? 'Creating...' : 'Create Role'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Roles List */}
      <EnhancedListView
        data={roles}
        columns={columns}
        actions={actions}
        loading={rolesLoading}
        searchKey="name"
        emptyMessage="No roles found. Create your first role to get started."
        pageSize={15}
      />
    </div>
  );
}