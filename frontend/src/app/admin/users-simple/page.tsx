'use client';

import React, { useState } from 'react';
import { Plus, User, Mail, Shield, Calendar, ToggleLeft } from 'lucide-react';
import { Button } from '@/shared/components/button';
import { Badge } from '@/shared/components/badge';
import { EnhancedListView, ListViewColumn, ListViewAction } from '@/shared/components/EnhancedListView';
import { useUsers, useCreateUser, useDeleteUser, useToggleUserStatus } from '@/modules/admin/hooks/useUsers';
// import { useRoles } from '@/modules/admin/hooks/useRoles'; // Currently unused
import { apiUtils } from '@/shared/services/api/client';
import type { User as UserType } from '@/shared/services/api/users';
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

export default function UsersSimplePage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    username: '',
    full_name: '',
    password: '',
    roles: [] as string[],
  });

  // Queries
  const { data: usersData, isLoading: usersLoading, error: usersError } = useUsers();
  // const { data: rolesData } = useRoles({ active_only: true }); // Currently unused

  // Mutations
  const createUserMutation = useCreateUser();
  const deleteUserMutation = useDeleteUser();
  const toggleStatusMutation = useToggleUserStatus();

  const users = usersData?.items || [];
  // const roles = rolesData?.items || []; // Currently unused

  // Define columns
  const columns: ListViewColumn<UserType>[] = [
    {
      key: 'username',
      title: 'Username',
      sortable: true,
      render: (value, user) => (
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="font-medium">{value}</div>
            {user.full_name && (
              <div className="text-sm text-gray-500">{user.full_name}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      title: 'Email',
      sortable: true,
      render: (value) => (
        <div className="flex items-center space-x-2">
          <Mail className="h-4 w-4 text-gray-400" />
          <span>{value}</span>
        </div>
      ),
    },
    {
      key: 'roles',
      title: 'Roles',
      render: (value) => {
        const userRoles = Array.isArray(value) ? value : [];
        return (
          <div className="flex gap-1 flex-wrap">
            {userRoles.slice(0, 2).map((role: string) => (
              <Badge key={role} variant="secondary" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                {role}
              </Badge>
            ))}
            {userRoles.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{userRoles.length - 2} more
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      key: 'is_active',
      title: 'Status',
      sortable: true,
      render: (value) => (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'last_login_at',
      title: 'Last Login',
      sortable: true,
      render: (value) => (
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Calendar className="h-4 w-4" />
          <span>
            {value ? new Date(value).toLocaleDateString() : 'Never'}
          </span>
        </div>
      ),
    },
  ];

  // Define actions
  const actions: ListViewAction<UserType>[] = [
    {
      key: 'toggle-status',
      label: 'Toggle Status',
      icon: ({ className }) => (
        <div className={className}>
          <ToggleLeft className="h-4 w-4" />
        </div>
      ),
      onClick: (user) => toggleStatusMutation.mutate(user.id),
    },
    {
      key: 'delete',
      label: 'Delete',
      variant: 'destructive',
      onClick: (user) => {
        if (window.confirm(`Are you sure you want to delete user "${user.username}"?`)) {
          deleteUserMutation.mutate(user.id);
        }
      },
      show: (user) => !user.is_superuser,
    },
  ];

  // Handle create user
  const handleCreateUser = () => {
    if (!newUser.email || !newUser.username || !newUser.password) {
      alert('Please fill in all required fields');
      return;
    }

    createUserMutation.mutate({
      email: newUser.email,
      username: newUser.username,
      full_name: newUser.full_name || undefined,
      password: newUser.password,
      roles: newUser.roles,
    }, {
      onSuccess: () => {
        setNewUser({ email: '', username: '', full_name: '', password: '', roles: [] });
        setIsCreateDialogOpen(false);
      },
      onError: (error) => {
        alert(`Failed to create user: ${apiUtils.getErrorMessage(error)}`);
      },
    });
  };

  if (usersError) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Failed to load users</h2>
          <p className="text-gray-600">{apiUtils.getErrorMessage(usersError)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users Management</h1>
          <p className="text-muted-foreground">
            Manage user accounts and their permissions ({users.length} total)
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={usersLoading}>
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
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  disabled={createUserMutation.isPending}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  placeholder="username"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  disabled={createUserMutation.isPending}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  placeholder="John Doe"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  disabled={createUserMutation.isPending}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  disabled={createUserMutation.isPending}
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="submit" 
                onClick={handleCreateUser}
                disabled={createUserMutation.isPending}
              >
                {createUserMutation.isPending ? 'Creating...' : 'Create User'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Users List */}
      <EnhancedListView
        data={users}
        columns={columns}
        actions={actions}
        loading={usersLoading}
        searchKey="username"
        emptyMessage="No users found. Create your first user to get started."
        pageSize={15}
      />
    </div>
  );
}