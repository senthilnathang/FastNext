'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/modules/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/card';
import { Button } from '@/shared/components/button';
import {
  Building2,
  Users,
  Activity,
  Plus,
  Eye,
  Edit3,
  BarChart3
} from 'lucide-react';
import { API_CONFIG, getApiUrl } from '@/shared/services/api/config';
import { AnalyticsDashboard, type KpiData } from '@/shared/components/analytics-dashboard';
import { EnhancedDataTable, EnhancedDataTableColumnHeader } from '@/shared/components/enhanced-data-table';
import { EnhancedEmptyState } from '@/shared/components/enhanced-empty-state';
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
} from '@tanstack/react-table';

interface Project {
  id: number;
  name: string;
  description?: string;
  user_id: number;
  is_public: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
  status?: 'active' | 'paused' | 'completed';
  pages_count?: number;
  components_count?: number;
}

interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  totalPages: number;
  totalComponents: number;
  totalUsers: number;
  monthlyGrowth: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    activeProjects: 0,
    totalPages: 0,
    totalComponents: 0,
    totalUsers: 0,
    monthlyGrowth: 0
  });
  const [loading, setLoading] = useState(true);

  // Sample data for charts
  const projectActivityData = [
    { date: 'Jan', projects: 12, pages: 45, components: 120 },
    { date: 'Feb', projects: 15, pages: 52, components: 135 },
    { date: 'Mar', projects: 18, pages: 63, components: 158 },
    { date: 'Apr', projects: 22, pages: 71, components: 182 },
    { date: 'May', projects: 25, pages: 84, components: 205 },
    { date: 'Jun', projects: 28, pages: 92, components: 228 }
  ];

  // KPI data for analytics dashboard
  const kpiData: KpiData[] = [
    {
      title: 'Total Projects',
      value: stats.totalProjects,
      change: stats.monthlyGrowth / 100,
      changeType: 'increase',
      format: 'number',
      icon: <Building2 className="h-4 w-4" />,
      description: 'All projects created'
    },
    {
      title: 'Active Projects',
      value: stats.activeProjects,
      change: 0.08,
      changeType: 'increase',
      format: 'number',
      icon: <Activity className="h-4 w-4" />,
      description: 'Currently active projects'
    },
    {
      title: 'Total Pages',
      value: stats.totalPages,
      change: 0.15,
      changeType: 'increase',
      format: 'number',
      icon: <BarChart3 className="h-4 w-4" />,
      description: 'Pages across all projects'
    },
    {
      title: 'Total Components',
      value: stats.totalComponents,
      change: 0.22,
      changeType: 'increase',
      format: 'number',
      icon: <Users className="h-4 w-4" />,
      description: 'Reusable components created'
    }
  ];

  // Table setup for projects
  const columnHelper = createColumnHelper<Project>();
  
  const columns = [
    columnHelper.accessor('name', {
      header: ({ column }) => (
        <EnhancedDataTableColumnHeader column={column} title="Project Name" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Building2 className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <div className="font-medium">{row.getValue('name')}</div>
            <div className="text-sm text-muted-foreground">
              {row.original.description || 'No description'}
            </div>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('status', {
      header: ({ column }) => (
        <EnhancedDataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const status = String(row.getValue('status') || (row.original.is_public ? 'active' : 'draft'));
        return (
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}>
            {status}
          </span>
        );
      },
    }),
    columnHelper.accessor('pages_count', {
      header: ({ column }) => (
        <EnhancedDataTableColumnHeader column={column} title="Pages" />
      ),
      cell: ({ row }) => row.getValue('pages_count') || 3,
    }),
    columnHelper.accessor('components_count', {
      header: ({ column }) => (
        <EnhancedDataTableColumnHeader column={column} title="Components" />
      ),
      cell: ({ row }) => row.getValue('components_count') || 8,
    }),
    columnHelper.accessor('created_at', {
      header: ({ column }) => (
        <EnhancedDataTableColumnHeader column={column} title="Created" />
      ),
      cell: ({ row }) => formatDate(row.getValue('created_at')),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: () => (
        <Button variant="ghost" size="sm">
          <Edit3 className="h-4 w-4" />
        </Button>
      ),
    }),
  ];

  const table = useReactTable({
    data: projects,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 5,
      },
    },
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      // Fetch projects
      const projectsResponse = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.PROJECTS), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json();
        setProjects(projectsData.slice(0, 6)); // Show only recent 6 projects
        
        // Calculate stats
        setStats({
          totalProjects: projectsData.length,
          activeProjects: projectsData.filter((p: Project) => p.is_public).length,
          totalPages: projectsData.reduce((acc: number, p: Project) => acc + (p.pages_count || 3), 0),
          totalComponents: projectsData.reduce((acc: number, p: Project) => acc + (p.components_count || 8), 0),
          totalUsers: 1250, // Mock data
          monthlyGrowth: 12.5 // Mock data
        });
      } else {
        // Mock data if API fails
        const mockProjects = [
          {
            id: 1,
            name: 'E-commerce Platform',
            description: 'Modern e-commerce solution with advanced features',
            user_id: user?.id || 1,
            is_public: true,
            settings: {},
            created_at: '2024-01-15T10:00:00Z',
            status: 'active' as const,
            pages_count: 12,
            components_count: 45
          },
          {
            id: 2,
            name: 'Portfolio Website',
            description: 'Professional portfolio showcase',
            user_id: user?.id || 1,
            is_public: true,
            settings: {},
            created_at: '2024-01-20T14:30:00Z',
            status: 'active' as const,
            pages_count: 8,
            components_count: 25
          },
          {
            id: 3,
            name: 'Blog Platform',
            description: 'Content management and blogging platform',
            user_id: user?.id || 1,
            is_public: false,
            settings: {},
            created_at: '2024-02-01T09:15:00Z',
            status: 'paused' as const,
            pages_count: 15,
            components_count: 38
          }
        ];
        
        setProjects(mockProjects);
        setStats({
          totalProjects: 28,
          activeProjects: 25,
          totalPages: 92,
          totalComponents: 228,
          totalUsers: 1250,
          monthlyGrowth: 12.5
        });
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.full_name || user?.username}! Here&apos;s what&apos;s happening with your projects.
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Enhanced Analytics Dashboard */}
      <AnalyticsDashboard
        kpis={kpiData}
        chartData={projectActivityData}
        chartType="bar"
        xAxisKey="date"
        yAxisKeys={['projects', 'pages', 'components']}
        chartHeight={350}
        loading={loading}
        showTrends={true}
      />

      {/* Recent Projects Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Projects</CardTitle>
            <CardDescription>Your latest projects and their status</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            View All
          </Button>
        </CardHeader>
        <CardContent className="px-0">
          {projects.length > 0 ? (
            <EnhancedDataTable
              table={table}
              showRowSelectionCount={true}
            />
          ) : (
            <div className="px-6">
              <EnhancedEmptyState
                variant="no-data"
                title="No projects yet"
                description="Get started by creating your first project"
                actions={[
                  {
                    label: 'Create Project',
                    onClick: () => console.log('Create project'),
                    icon: <Plus className="h-4 w-4" />,
                  }
                ]}
                size="sm"
                showBackground
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}