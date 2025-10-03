'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/shared/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/shared/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Switch } from '@/shared/components/ui/switch';
import { DataTable } from '@/shared/components/ui/data-table';
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  UserCheck, 
  UserX,
  Shield, 
  Key, 
  Clock,
  Activity,
  Eye,
  Settings,
  MoreHorizontal,
  Search,
  Filter,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Lock,
  Unlock,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Edit,
  Trash2,
  RefreshCw,
  History,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Zap
} from 'lucide-react';
import { useUsers, useUpdateUser, useDeleteUser, useToggleUserStatus, useResetUserPassword } from '@/modules/admin/hooks/useUsers';
import { useRoles } from '@/modules/admin/hooks/useRoles';
import { format, subDays, subMonths } from 'date-fns';

interface UserActivity {
  id: string;
  userId: number;
  action: string;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  location?: string;
  riskLevel: 'low' | 'medium' | 'high';
}

interface UserSession {
  id: string;
  userId: number;
  startTime: string;
  lastActivity: string;
  ipAddress: string;
  device: string;
  location?: string;
  isActive: boolean;
}

interface UserAnalytics {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  suspendedUsers: number;
  userGrowth: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  topRoles: Array<{ role: string; count: number }>;
  loginTrends: Array<{ date: string; count: number }>;
  securityAlerts: number;
}

export default function AdvancedUserManagementPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [bulkSelectedUsers, setBulkSelectedUsers] = useState<number[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // API hooks
  const { data: users = [], isLoading: usersLoading, error: usersError } = useUsers();
  const { data: roles = [] } = useRoles();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();
  const toggleStatusMutation = useToggleUserStatus();
  const resetPasswordMutation = useResetUserPassword();

  // Mock data for demo - in real app, these would come from API
  const mockUserActivities: UserActivity[] = [
    {
      id: '1',
      userId: 1,
      action: 'login_success',
      timestamp: new Date().toISOString(),
      ipAddress: '192.168.1.100',
      userAgent: 'Chrome/120.0',
      location: 'New York, US',
      riskLevel: 'low'
    },
    {
      id: '2',
      userId: 2,
      action: 'password_change',
      timestamp: subDays(new Date(), 1).toISOString(),
      ipAddress: '10.0.0.50',
      userAgent: 'Firefox/119.0',
      location: 'London, UK',
      riskLevel: 'medium'
    }
  ];

  const mockUserSessions: UserSession[] = [
    {
      id: '1',
      userId: 1,
      startTime: subDays(new Date(), 1).toISOString(),
      lastActivity: new Date().toISOString(),
      ipAddress: '192.168.1.100',
      device: 'Chrome on Windows',
      location: 'New York, US',
      isActive: true
    }
  ];

  const mockAnalytics: UserAnalytics = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.isActive).length,
    newUsersToday: 5,
    suspendedUsers: users.filter(u => !u.isActive).length,
    userGrowth: {
      daily: 2.5,
      weekly: 8.3,
      monthly: 15.7
    },
    topRoles: [
      { role: 'User', count: 150 },
      { role: 'Admin', count: 25 },
      { role: 'Manager', count: 45 }
    ],
    loginTrends: Array.from({ length: 7 }, (_, i) => ({
      date: subDays(new Date(), 6 - i).toISOString().split('T')[0],
      count: Math.floor(Math.random() * 100) + 50
    })),
    securityAlerts: 3
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = !searchTerm || 
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = roleFilter === 'all' || 
        user.roles?.some(role => role.toLowerCase() === roleFilter.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && user.isActive) ||
        (statusFilter === 'inactive' && !user.isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  // Action handlers
  const handleBulkAction = useCallback((action: string) => {
    console.log(`Performing bulk action: ${action} on users:`, bulkSelectedUsers);
    // Implement bulk actions here
  }, [bulkSelectedUsers]);

  const handleUserAction = useCallback(async (userId: number, action: string) => {
    switch (action) {
      case 'toggle_status':
        await toggleStatusMutation.mutateAsync(userId);
        break;
      case 'reset_password':
        await resetPasswordMutation.mutateAsync(userId);
        break;
      case 'delete':
        await deleteUserMutation.mutateAsync(userId);
        break;
      default:
        console.log(`Action ${action} not implemented`);
    }
  }, [toggleStatusMutation, resetPasswordMutation, deleteUserMutation]);

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const columns = [
    {
      id: 'select',
      header: ({ table }: any) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={(e) => table.toggleAllPageRowsSelected(!!e.target.checked)}
          className="h-4 w-4"
        />
      ),
      cell: ({ row }: any) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={(e) => row.toggleSelected(!!e.target.checked)}
          className="h-4 w-4"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: 'User',
      cell: ({ row }: any) => {
        const user = row.original;
        return (
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <div className="font-medium">{user.name}</div>
              <div className="text-sm text-gray-500">{user.email}</div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'roles',
      header: 'Roles',
      cell: ({ row }: any) => {
        const roles = row.original.roles || [];
        return (
          <div className="flex flex-wrap gap-1">
            {roles.map((role: string, index: number) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {role}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }: any) => {
        const isActive = row.original.isActive;
        return (
          <Badge variant={isActive ? 'default' : 'secondary'}>
            {isActive ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Active
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3 mr-1" />
                Inactive
              </>
            )}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'lastLogin',
      header: 'Last Login',
      cell: ({ row }: any) => {
        const lastLogin = row.original.lastLogin;
        return lastLogin ? format(new Date(lastLogin), 'MMM dd, yyyy HH:mm') : 'Never';
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Joined',
      cell: ({ row }: any) => {
        const createdAt = row.original.createdAt;
        return createdAt ? format(new Date(createdAt), 'MMM dd, yyyy') : '-';
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }: any) => {
        const user = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setSelectedUser(user)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => console.log('Edit user', user.id)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit User
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleUserAction(user.id, 'toggle_status')}>
                {user.isActive ? (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <Unlock className="mr-2 h-4 w-4" />
                    Activate
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleUserAction(user.id, 'reset_password')}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset Password
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleUserAction(user.id, 'delete')}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      enableSorting: false,
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Advanced User Management</h1>
          <p className="text-gray-600">Comprehensive user administration and analytics</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockAnalytics.totalUsers}</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="inline h-3 w-3 mr-1" />
                  +{mockAnalytics.userGrowth.monthly}% from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockAnalytics.activeUsers}</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="inline h-3 w-3 mr-1" />
                  +{mockAnalytics.userGrowth.weekly}% from last week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New Today</CardTitle>
                <UserPlus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockAnalytics.newUsersToday}</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="inline h-3 w-3 mr-1" />
                  +{mockAnalytics.userGrowth.daily}% from yesterday
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Security Alerts</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{mockAnalytics.securityAlerts}</div>
                <p className="text-xs text-muted-foreground">
                  Requires attention
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="flex flex-col h-20">
                <UserPlus className="h-6 w-6 mb-2" />
                <span className="text-xs">Add User</span>
              </Button>
              <Button variant="outline" className="flex flex-col h-20">
                <Download className="h-6 w-6 mb-2" />
                <span className="text-xs">Export Users</span>
              </Button>
              <Button variant="outline" className="flex flex-col h-20">
                <Shield className="h-6 w-6 mb-2" />
                <span className="text-xs">Manage Roles</span>
              </Button>
              <Button variant="outline" className="flex flex-col h-20">
                <BarChart3 className="h-6 w-6 mb-2" />
                <span className="text-xs">View Reports</span>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          {/* Filters and Search */}
          <Card>
            <CardHeader>
              <CardTitle>User Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {roles.map((role: any) => (
                      <SelectItem key={role.id} value={role.name}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}>
                  <Filter className="h-4 w-4 mr-2" />
                  Advanced
                </Button>
              </div>

              {showAdvancedFilters && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                  <div>
                    <Label>Date Range</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select date range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">Last 7 days</SelectItem>
                        <SelectItem value="month">Last 30 days</SelectItem>
                        <SelectItem value="year">Last year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Login Activity</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by activity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="recent">Recently Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="never">Never Logged In</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Permission Level</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Permission level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Levels</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bulk Actions */}
          {bulkSelectedUsers.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {bulkSelectedUsers.length} users selected
                  </span>
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="outline" onClick={() => handleBulkAction('activate')}>
                      <UserCheck className="h-4 w-4 mr-2" />
                      Activate
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleBulkAction('deactivate')}>
                      <UserX className="h-4 w-4 mr-2" />
                      Deactivate
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleBulkAction('export')}>
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Users</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {bulkSelectedUsers.length} users? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleBulkAction('delete')}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>Users ({filteredUsers.length})</CardTitle>
              <CardDescription>Manage user accounts and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={columns}
                data={filteredUsers}
                onRowSelectionChange={(selectedRows) => {
                  setBulkSelectedUsers(selectedRows.map((row: any) => row.original.id));
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Growth Chart */}
            <Card>
              <CardHeader>
                <CardTitle>User Growth Trends</CardTitle>
                <CardDescription>User registration and activity over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  Chart placeholder - implement with chart library
                </div>
              </CardContent>
            </Card>

            {/* Role Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Role Distribution</CardTitle>
                <CardDescription>Users by role and permission level</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockAnalytics.topRoles.map((role, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Shield className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{role.role}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">{role.count}</span>
                        <div className="w-20 h-2 bg-gray-200 rounded">
                          <div 
                            className="h-full bg-blue-500 rounded" 
                            style={{ width: `${(role.count / mockAnalytics.totalUsers) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle>Recent User Activities</CardTitle>
              <CardDescription>Monitor user actions and security events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockUserActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Activity className="h-5 w-5 text-gray-400" />
                      <div>
                        <div className="font-medium">{activity.action.replace('_', ' ')}</div>
                        <div className="text-sm text-gray-600">
                          User ID: {activity.userId} • {activity.ipAddress}
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(activity.timestamp), 'MMM dd, yyyy HH:mm')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getRiskLevelColor(activity.riskLevel)}>
                        {activity.riskLevel}
                      </Badge>
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{activity.location}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Active Sessions */}
          <Card>
            <CardHeader>
              <CardTitle>Active User Sessions</CardTitle>
              <CardDescription>Monitor and manage active user sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockUserSessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Zap className="h-5 w-5 text-green-500" />
                      <div>
                        <div className="font-medium">User ID: {session.userId}</div>
                        <div className="text-sm text-gray-600">
                          {session.device} • {session.ipAddress}
                        </div>
                        <div className="text-xs text-gray-500">
                          Started: {format(new Date(session.startTime), 'MMM dd, HH:mm')} • 
                          Last: {format(new Date(session.lastActivity), 'HH:mm')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={session.isActive ? 'default' : 'secondary'}>
                        {session.isActive ? 'Active' : 'Idle'}
                      </Badge>
                      <Button size="sm" variant="outline">
                        <XCircle className="h-4 w-4 mr-2" />
                        Terminate
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Detail Dialog */}
      {selectedUser && (
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>User Details - {selectedUser.name}</DialogTitle>
              <DialogDescription>
                Comprehensive user information and activity
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label>Basic Information</Label>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span>{selectedUser.email}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>Joined {format(new Date(selectedUser.createdAt), 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>
                        Last login: {selectedUser.lastLogin 
                          ? format(new Date(selectedUser.lastLogin), 'MMM dd, yyyy HH:mm')
                          : 'Never'
                        }
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label>Roles & Permissions</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedUser.roles?.map((role: string, index: number) => (
                      <Badge key={index} variant="secondary">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label>Account Status</Label>
                  <div className="mt-2">
                    <Badge variant={selectedUser.isActive ? 'default' : 'secondary'}>
                      {selectedUser.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <Label>Recent Activity</Label>
                  <div className="text-sm text-gray-600 mt-2">
                    No recent activities found
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}