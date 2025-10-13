'use client';

import React, { useState } from 'react';
import { useAuth } from '@/modules/auth';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Switch,
  Badge
} from '@/shared/components';
import {
  Users,
  Key,
  Eye,
  Edit,
  Trash,
  Plus,
  Search
} from 'lucide-react';

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  roles: string[];
}

export default function PermissionsConfigPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const [permissions, setPermissions] = useState<Permission[]>([
    {
      id: '1',
      name: 'admin.users',
      description: 'Manage user accounts and profiles',
      category: 'User Management',
      enabled: true,
      roles: ['Admin', 'Super Admin']
    },
    {
      id: '2',
      name: 'admin.roles',
      description: 'Create and manage user roles',
      category: 'Role Management',
      enabled: true,
      roles: ['Super Admin']
    },
    {
      id: '3',
      name: 'admin.permissions',
      description: 'Configure system permissions',
      category: 'Permission Management',
      enabled: true,
      roles: ['Super Admin']
    },
    {
      id: '4',
      name: 'data.import',
      description: 'Import data into the system',
      category: 'Data Operations',
      enabled: true,
      roles: ['Admin', 'Data Manager']
    },
    {
      id: '5',
      name: 'data.export',
      description: 'Export data from the system',
      category: 'Data Operations',
      enabled: true,
      roles: ['Admin', 'Data Manager', 'Viewer']
    },
    {
      id: '6',
      name: 'api.access',
      description: 'Access API endpoints',
      category: 'API Access',
      enabled: true,
      roles: ['Admin', 'Developer']
    }
  ]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const categories = Array.from(new Set(permissions.map(p => p.category)));
  const filteredPermissions = permissions.filter(permission => {
    const matchesSearch = permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         permission.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || permission.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const togglePermission = (id: string) => {
    setPermissions(prev => prev.map(p => 
      p.id === id ? { ...p, enabled: !p.enabled } : p
    ));
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Categories and Actions */}
        <div className="space-y-6">
          {/* Search */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Search & Filter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search permissions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Category</Label>
                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedCategory === 'all' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    All Categories
                  </button>
                  {categories.map(category => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        selectedCategory === category 
                          ? 'bg-primary text-primary-foreground' 
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Permission
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Users className="h-4 w-4 mr-2" />
                Manage Roles
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Key className="h-4 w-4 mr-2" />
                Bulk Edit
              </Button>
            </CardContent>
          </Card>

          {/* Permission Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Permissions</span>
                <span className="font-medium">{permissions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Active</span>
                <span className="font-medium text-green-600">
                  {permissions.filter(p => p.enabled).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Inactive</span>
                <span className="font-medium text-red-600">
                  {permissions.filter(p => !p.enabled).length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content - Permissions List */}
        <div className="lg:col-span-3 space-y-4">
          {filteredPermissions.map((permission) => (
            <Card key={permission.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="flex items-center space-x-2">
                        <Key className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold text-lg">{permission.name}</h3>
                      </div>
                      <Badge variant={permission.enabled ? 'default' : 'secondary'}>
                        {permission.enabled ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-400 mb-3">
                      {permission.description}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-1">
                        <span className="text-gray-500">Category:</span>
                        <Badge variant="outline">{permission.category}</Badge>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <span className="text-gray-500">Assigned Roles:</span>
                        <div className="flex space-x-1">
                          {permission.roles.map(role => (
                            <Badge key={role} variant="secondary" className="text-xs">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Switch
                      checked={permission.enabled}
                      onCheckedChange={() => togglePermission(permission.id)}
                    />
                    
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {filteredPermissions.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No permissions found
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Try adjusting your search or filter criteria.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <div className="mt-8 flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredPermissions.length} of {permissions.length} permissions
        </div>
        <div className="flex space-x-4">
          <Button variant="outline">Export Permissions</Button>
          <Button>Save Changes</Button>
        </div>
      </div>
    </div>
  );
}