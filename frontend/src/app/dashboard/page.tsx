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
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BarChart3 className="h-7 w-7 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Welcome back, {user?.full_name || user?.username}! Track your project metrics and progress.
              </p>
            </div>
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

        {/* Recent Projects Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Projects</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your latest projects and their status
              </p>
            </div>
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              View All
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="animate-pulse" variant="flat">
                  <CardHeader compact>
                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-full"></div>
                  </CardHeader>
                  <CardContent compact>
                    <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {projects.map((project) => (
                <Card key={project.id} className="hover:shadow-md transition-shadow" variant="default">
                  <CardHeader compact className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle size="sm" className="truncate">{project.name}</CardTitle>
                        <CardDescription className="mt-1 line-clamp-2 text-xs">
                          {project.description || 'No description provided'}
                        </CardDescription>
                      </div>
                      <Button variant="ghost" size="icon-sm" className="shrink-0">
                        <Edit3 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent compact>
                    <div className="space-y-2">
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <Building2 className="h-3 w-3 mr-1" />
                        <span className="truncate">
                          {project.pages_count || 3} pages • {project.components_count || 8} components
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status || (project.is_public ? 'active' : 'draft'))}`}>
                            {project.status || (project.is_public ? 'active' : 'draft')}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(project.created_at)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {/* Create new project card */}
              <Card 
                className="border-dashed border-2 hover:border-blue-500 transition-colors cursor-pointer"
                variant="outlined"
              >
                <CardContent compact className="flex flex-col items-center justify-center py-8">
                  <Plus className="h-8 w-8 text-gray-400 mb-3" />
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    Create New Project
                  </h3>
                  <p className="text-xs text-gray-500 text-center">
                    Start building something amazing
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No projects yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Get started by creating your first project
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}