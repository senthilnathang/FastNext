'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import {
  Building2,
  Users,
  Activity,
  TrendingUp,
  Plus,
  Eye,
  Edit3,
  Calendar,
  BarChart3
} from 'lucide-react';
import { API_CONFIG, getApiUrl } from '@/lib/api/config';

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
    { month: 'Jan', projects: 12, pages: 45, components: 120 },
    { month: 'Feb', projects: 15, pages: 52, components: 135 },
    { month: 'Mar', projects: 18, pages: 63, components: 158 },
    { month: 'Apr', projects: 22, pages: 71, components: 182 },
    { month: 'May', projects: 25, pages: 84, components: 205 },
    { month: 'Jun', projects: 28, pages: 92, components: 228 }
  ];

  const projectStatusData = [
    { name: 'Active', value: 65, color: '#10B981' },
    { name: 'Paused', value: 25, color: '#F59E0B' },
    { name: 'Completed', value: 10, color: '#6B7280' }
  ];

  const recentActivityData = [
    { time: '00:00', activity: 15 },
    { time: '04:00', activity: 8 },
    { time: '08:00', activity: 45 },
    { time: '12:00', activity: 78 },
    { time: '16:00', activity: 65 },
    { time: '20:00', activity: 32 }
  ];

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      // Fetch projects
      const projectsResponse = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.PROJECTS.LIST), {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-300">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Welcome back, {user?.full_name || user?.username}! Here&apos;s what&apos;s happening with your projects.
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Projects</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalProjects}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600">+{stats.monthlyGrowth}%</span>
              <span className="text-gray-500 ml-1">from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Projects</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.activeProjects}</p>
              </div>
              <Activity className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-gray-500">
                {Math.round((stats.activeProjects / stats.totalProjects) * 100)}% active rate
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Pages</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalPages}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-gray-500">
                Avg {Math.round(stats.totalPages / stats.totalProjects)} pages per project
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Components</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalComponents}</p>
              </div>
              <Users className="h-8 w-8 text-orange-600" />
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-gray-500">
                Avg {Math.round(stats.totalComponents / stats.totalProjects)} per project
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Project Activity</CardTitle>
            <CardDescription>Monthly projects, pages, and components created</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectActivityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="projects" fill="#3B82F6" name="Projects" />
                <Bar dataKey="pages" fill="#10B981" name="Pages" />
                <Bar dataKey="components" fill="#F59E0B" name="Components" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Project Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Project Status</CardTitle>
            <CardDescription>Distribution of project statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={projectStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {projectStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>User activity over the last 24 hours</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={recentActivityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="activity" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Projects */}
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
        <CardContent>
          <div className="space-y-4">
            {projects.map((project) => (
              <div key={project.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">{project.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {project.description || 'No description available'}
                    </p>
                    <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                      <span className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(project.created_at)}
                      </span>
                      <span>{project.pages_count || 3} pages</span>
                      <span>{project.components_count || 8} components</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}>
                    {project.status || (project.is_public ? 'Active' : 'Draft')}
                  </span>
                  <Button variant="ghost" size="sm">
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}