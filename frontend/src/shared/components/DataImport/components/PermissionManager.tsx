'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import { Checkbox } from '@/shared/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Separator } from '@/shared/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  Shield,
  User,
  Edit,
  Trash2,
  Plus,
  Search,
  Crown,
  Eye,
  Upload,
  FileCheck
} from 'lucide-react';

import type { UserImportPermissions, ImportPermission, ImportFormat } from '../types';

interface PermissionManagerProps {
  users: UserImportPermissions[];
  currentUser?: UserImportPermissions;
  onUpdatePermissions: (userId: string, permissions: ImportPermission) => Promise<void>;
  onAddUser?: () => void;
  onRemoveUser?: (userId: string) => void;
  availableFormats?: ImportFormat[];
  availableTables?: string[];
  className?: string;
}

const rolePermissionDefaults: Record<string, Partial<ImportPermission>> = {
  admin: {
    canImport: true,
    canValidate: true,
    canPreview: true,
    maxFileSize: 100 * 1024 * 1024, // 100MB
    maxRows: 100000,
    requireApproval: false
  },
  manager: {
    canImport: true,
    canValidate: true,
    canPreview: true,
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxRows: 50000,
    requireApproval: false
  },
  user: {
    canImport: true,
    canValidate: true,
    canPreview: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxRows: 10000,
    requireApproval: true
  },
  viewer: {
    canImport: false,
    canValidate: false,
    canPreview: true,
    maxFileSize: 0,
    maxRows: 0,
    requireApproval: false
  }
};

export function PermissionManager({
  users,
  currentUser,
  onUpdatePermissions,
  onAddUser,
  onRemoveUser,
  availableFormats = ['csv', 'json', 'excel', 'xml'],
  availableTables = [],
  className
}: PermissionManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [editingUser, setEditingUser] = useState<UserImportPermissions | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const filteredUsers = useMemo(() => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedRole) {
      filtered = filtered.filter(user => user.role === selectedRole);
    }

    return filtered;
  }, [users, searchTerm, selectedRole]);

  const permissionStats = useMemo(() => {
    const canImport = users.filter(u => u.permissions.canImport).length;
    const requireApproval = users.filter(u => u.permissions.requireApproval).length;
    const totalUsers = users.length;

    return {
      canImport,
      requireApproval,
      totalUsers,
      cannotImport: totalUsers - canImport
    };
  }, [users]);

  const handleEditUser = (user: UserImportPermissions) => {
    setEditingUser(user);
    setIsEditDialogOpen(true);
  };

  const handleSavePermissions = async (permissions: ImportPermission) => {
    if (!editingUser) return;

    try {
      await onUpdatePermissions(editingUser.userId, permissions);
      setIsEditDialogOpen(false);
      setEditingUser(null);
    } catch (error) {
      console.error('Failed to update permissions:', error);
    }
  };

  const handleApplyRoleDefaults = (role: string) => {
    if (!editingUser) return;

    const defaults = rolePermissionDefaults[role.toLowerCase()];
    if (defaults) {
      setEditingUser({
        ...editingUser,
        permissions: {
          ...editingUser.permissions,
          ...defaults
        }
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return <Crown className="h-4 w-4 text-yellow-600" />;
      case 'manager':
        return <Shield className="h-4 w-4 text-blue-600" />;
      case 'user':
        return <User className="h-4 w-4 text-green-600" />;
      default:
        return <Eye className="h-4 w-4 text-gray-600" />;
    }
  };

  const renderPermissionBadges = (permissions: ImportPermission) => {
    const badges = [];

    if (permissions.canImport) {
      badges.push(
        <Badge key="import" variant="default" className="text-xs">
          <Upload className="h-3 w-3 mr-1" />
          Import
        </Badge>
      );
    }

    if (permissions.canValidate) {
      badges.push(
        <Badge key="validate" variant="secondary" className="text-xs">
          <FileCheck className="h-3 w-3 mr-1" />
          Validate
        </Badge>
      );
    }

    if (permissions.canPreview) {
      badges.push(
        <Badge key="preview" variant="outline" className="text-xs">
          <Eye className="h-3 w-3 mr-1" />
          Preview
        </Badge>
      );
    }

    if (permissions.requireApproval) {
      badges.push(
        <Badge key="approval" variant="destructive" className="text-xs">
          Requires Approval
        </Badge>
      );
    }

    return badges;
  };

  const renderUserRow = (user: UserImportPermissions) => {
    const isCurrentUser = currentUser?.userId === user.userId;

    return (
      <TableRow key={user.userId} className={isCurrentUser ? 'bg-blue-50 dark:bg-blue-900/20' : ''}>
        <TableCell>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              {getRoleIcon(user.role)}
              <div>
                <div className="font-medium">{user.username}</div>
                <div className="text-sm text-gray-500">{user.email}</div>
              </div>
            </div>
            {isCurrentUser && (
              <Badge variant="outline" className="text-xs">
                You
              </Badge>
            )}
          </div>
        </TableCell>

        <TableCell>
          <Badge variant="secondary" className="capitalize">
            {user.role}
          </Badge>
        </TableCell>

        <TableCell>
          <div className="flex flex-wrap gap-1">
            {renderPermissionBadges(user.permissions)}
          </div>
        </TableCell>

        <TableCell>
          <div className="text-sm text-gray-600">
            {user.permissions.maxFileSize ? formatFileSize(user.permissions.maxFileSize) : 'No limit'}
          </div>
        </TableCell>

        <TableCell>
          <div className="text-sm text-gray-600">
            {user.permissions.maxRows ? user.permissions.maxRows.toLocaleString() : 'No limit'}
          </div>
        </TableCell>

        <TableCell>
          <div className="text-sm text-gray-600">
            {user.lastImport ? new Date(user.lastImport).toLocaleDateString() : 'Never'}
          </div>
        </TableCell>

        <TableCell>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditUser(user)}
              className="h-8"
            >
              <Edit className="h-4 w-4" />
            </Button>

            {onRemoveUser && !isCurrentUser && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoveUser(user.userId)}
                className="h-8 text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Import Permissions</CardTitle>
            <CardDescription>
              Manage user permissions for data import functionality
            </CardDescription>
          </div>

          {onAddUser && (
            <Button onClick={onAddUser} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          )}
        </div>

        {/* Permission Statistics */}
        <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{permissionStats.canImport}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Can Import</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{permissionStats.cannotImport}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Cannot Import</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{permissionStats.requireApproval}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Need Approval</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{permissionStats.totalUsers}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Users</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Max File Size</TableHead>
                <TableHead>Max Rows</TableHead>
                <TableHead>Last Import</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No users found matching your criteria
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map(renderUserRow)
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Edit Permissions Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Import Permissions</DialogTitle>
            <DialogDescription>
              Configure import permissions for {editingUser?.username}
            </DialogDescription>
          </DialogHeader>

          {editingUser && (
            <PermissionEditor
              user={editingUser}
              onSave={handleSavePermissions}
              onCancel={() => setIsEditDialogOpen(false)}
              onApplyRoleDefaults={handleApplyRoleDefaults}
              availableFormats={availableFormats}
              availableTables={availableTables}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Sub-component for editing permissions
interface PermissionEditorProps {
  user: UserImportPermissions;
  onSave: (permissions: ImportPermission) => void;
  onCancel: () => void;
  onApplyRoleDefaults: (role: string) => void;
  availableFormats: ImportFormat[];
  availableTables: string[];
}

function PermissionEditor({
  user,
  onSave,
  onCancel,
  onApplyRoleDefaults,
  availableFormats,
  availableTables
}: PermissionEditorProps) {
  const [permissions, setPermissions] = useState<ImportPermission>(user.permissions);

  const handleSave = () => {
    onSave(permissions);
  };

  const updatePermission = <K extends keyof ImportPermission>(
    key: K,
    value: ImportPermission[K]
  ) => {
    setPermissions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="space-y-6">
      {/* Role-based Templates */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Apply Role Template</Label>
        <div className="flex space-x-2">
          {Object.keys(rolePermissionDefaults).map(role => (
            <Button
              key={role}
              variant="outline"
              size="sm"
              onClick={() => onApplyRoleDefaults(role)}
              className="capitalize"
            >
              {role}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Basic Permissions */}
      <div className="space-y-4">
        <h4 className="font-medium">Basic Permissions</h4>

        <div className="flex items-center space-x-2">
          <Switch
            id="canImport"
            checked={permissions.canImport}
            onCheckedChange={(checked) => updatePermission('canImport', checked)}
          />
          <Label htmlFor="canImport">Can import data</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="canValidate"
            checked={permissions.canValidate}
            onCheckedChange={(checked) => updatePermission('canValidate', checked)}
          />
          <Label htmlFor="canValidate">Can validate data before import</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="canPreview"
            checked={permissions.canPreview}
            onCheckedChange={(checked) => updatePermission('canPreview', checked)}
          />
          <Label htmlFor="canPreview">Can preview import data</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="requireApproval"
            checked={permissions.requireApproval}
            onCheckedChange={(checked) => updatePermission('requireApproval', checked)}
          />
          <Label htmlFor="requireApproval">Require approval before import</Label>
        </div>
      </div>

      <Separator />

      {/* Limits */}
      <div className="space-y-4">
        <h4 className="font-medium">Limits</h4>

        <div className="space-y-2">
          <Label htmlFor="maxFileSize">Maximum file size (MB)</Label>
          <Input
            id="maxFileSize"
            type="number"
            value={permissions.maxFileSize ? Math.round(permissions.maxFileSize / 1024 / 1024) : ''}
            onChange={(e) => {
              const mb = parseInt(e.target.value);
              updatePermission('maxFileSize', mb > 0 ? mb * 1024 * 1024 : undefined);
            }}
            placeholder="No limit"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxRows">Maximum rows per import</Label>
          <Input
            id="maxRows"
            type="number"
            value={permissions.maxRows || ''}
            onChange={(e) => {
              const rows = parseInt(e.target.value);
              updatePermission('maxRows', rows > 0 ? rows : undefined);
            }}
            placeholder="No limit"
          />
        </div>
      </div>

      <Separator />

      {/* Allowed Formats */}
      <div className="space-y-4">
        <h4 className="font-medium">Allowed File Formats</h4>
        <div className="grid grid-cols-2 gap-3">
          {availableFormats.map(format => (
            <div key={format} className="flex items-center space-x-2">
              <Checkbox
                id={`format-${format}`}
                checked={!permissions.allowedFormats || permissions.allowedFormats.includes(format)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    const current = permissions.allowedFormats || availableFormats;
                    if (!current.includes(format)) {
                      updatePermission('allowedFormats', [...current, format]);
                    }
                  } else {
                    const current = permissions.allowedFormats || availableFormats;
                    updatePermission('allowedFormats', current.filter(f => f !== format));
                  }
                }}
              />
              <Label htmlFor={`format-${format}`} className="capitalize">
                {format}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Allowed Tables */}
      {availableTables.length > 0 && (
        <>
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium">Allowed Tables</h4>
            <div className="grid grid-cols-2 gap-3 max-h-32 overflow-y-auto">
              {availableTables.map(table => (
                <div key={table} className="flex items-center space-x-2">
                  <Checkbox
                    id={`table-${table}`}
                    checked={!permissions.allowedTables || permissions.allowedTables.includes(table)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        const current = permissions.allowedTables || availableTables;
                        if (!current.includes(table)) {
                          updatePermission('allowedTables', [...current, table]);
                        }
                      } else {
                        const current = permissions.allowedTables || availableTables;
                        updatePermission('allowedTables', current.filter(t => t !== table));
                      }
                    }}
                  />
                  <Label htmlFor={`table-${table}`} className="capitalize">
                    {table}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end space-x-3 pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          Save Permissions
        </Button>
      </div>
    </div>
  );
}
