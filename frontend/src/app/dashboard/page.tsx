"use client";

import {
  Activity,
  ArrowRight,
  BarChart3,
  Building2,
  Edit3,
  Eye,
  Key,
  Plus,
  Shield,
  Sparkles,
  Table,
  Users,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/modules/auth";
import type { KpiData } from "@/shared/components";
import {
  ActivityFeed,
  AnalyticsDashboard,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  QuickActionsWidget,
  RecentStatsWidget,
  SystemStatusWidget,
} from "@/shared/components";
import { API_CONFIG, getApiUrl } from "@/shared/services/api/config";

interface Project {
  id: number;
  name: string;
  description?: string;
  user_id: number;
  is_public: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
  status?: "active" | "paused" | "completed";
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
    monthlyGrowth: 0,
  });
  const [loading, setLoading] = useState(true);

  // Sample data for charts
  const projectActivityData = [
    { date: "Jan", projects: 12, pages: 45, components: 120 },
    { date: "Feb", projects: 15, pages: 52, components: 135 },
    { date: "Mar", projects: 18, pages: 63, components: 158 },
    { date: "Apr", projects: 22, pages: 71, components: 182 },
    { date: "May", projects: 25, pages: 84, components: 205 },
    { date: "Jun", projects: 28, pages: 92, components: 228 },
  ];

  // KPI data for analytics dashboard
  const kpiData: KpiData[] = [
    {
      title: "Total Projects",
      value: stats.totalProjects,
      change: stats.monthlyGrowth / 100,
      changeType: "increase",
      format: "number",
      icon: <Building2 className="h-4 w-4" />,
      description: "All projects created",
    },
    {
      title: "Active Projects",
      value: stats.activeProjects,
      change: 0.08,
      changeType: "increase",
      format: "number",
      icon: <Activity className="h-4 w-4" />,
      description: "Currently active projects",
    },
    {
      title: "Total Pages",
      value: stats.totalPages,
      change: 0.15,
      changeType: "increase",
      format: "number",
      icon: <BarChart3 className="h-4 w-4" />,
      description: "Pages across all projects",
    },
    {
      title: "Total Components",
      value: stats.totalComponents,
      change: 0.22,
      changeType: "increase",
      format: "number",
      icon: <Users className="h-4 w-4" />,
      description: "Reusable components created",
    },
  ];

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");

      // Fetch projects
      const projectsResponse = await fetch(
        getApiUrl(API_CONFIG.ENDPOINTS.PROJECTS),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json();
        // Handle both array response and object with items property
        const projects = Array.isArray(projectsData)
          ? projectsData
          : projectsData.items || [];
        setProjects(projects.slice(0, 6)); // Show only recent 6 projects

        // Calculate stats
        setStats({
          totalProjects: projects.length,
          activeProjects: projects.filter((p: Project) => p.is_public).length,
          totalPages: projects.reduce(
            (acc: number, p: Project) => acc + (p.pages_count || 3),
            0,
          ),
          totalComponents: projects.reduce(
            (acc: number, p: Project) => acc + (p.components_count || 8),
            0,
          ),
          totalUsers: 1250, // Mock data
          monthlyGrowth: 12.5, // Mock data
        });
      } else {
        // Mock data if API fails
        const mockProjects = [
          {
            id: 1,
            name: "E-commerce Platform",
            description: "Modern e-commerce solution with advanced features",
            user_id: user?.id || 1,
            is_public: true,
            settings: {},
            created_at: "2024-01-15T10:00:00Z",
            status: "active" as const,
            pages_count: 12,
            components_count: 45,
          },
          {
            id: 2,
            name: "Portfolio Website",
            description: "Professional portfolio showcase",
            user_id: user?.id || 1,
            is_public: true,
            settings: {},
            created_at: "2024-01-20T14:30:00Z",
            status: "active" as const,
            pages_count: 8,
            components_count: 25,
          },
          {
            id: 3,
            name: "Blog Platform",
            description: "Content management and blogging platform",
            user_id: user?.id || 1,
            is_public: false,
            settings: {},
            created_at: "2024-02-01T09:15:00Z",
            status: "paused" as const,
            pages_count: 15,
            components_count: 38,
          },
        ];

        setProjects(mockProjects);
        setStats({
          totalProjects: 28,
          activeProjects: 25,
          totalPages: 92,
          totalComponents: 228,
          totalUsers: 1250,
          monthlyGrowth: 12.5,
        });
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "paused":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="space-y-6">
        {/* Enhanced Analytics Dashboard */}
        <div className="bg-gradient-to-br from-white via-gray-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-950 rounded-xl border shadow-sm p-6">
          <AnalyticsDashboard
            kpis={kpiData}
            chartData={projectActivityData}
            chartType="bar"
            xAxisKey="date"
            yAxisKeys={["projects", "pages", "components"]}
            chartHeight={350}
            loading={loading}
            showTrends={true}
          />
        </div>

        {/* Enhanced Features Highlight */}
        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Sparkles className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  ✨ New Enhanced Features
                </CardTitle>
                <CardDescription className="text-sm mt-1">
                  Advanced data management tools now available with powerful
                  table features
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="group flex items-center space-x-3 p-4 rounded-xl bg-white/70 dark:bg-gray-900/70 border border-gray-200/50 dark:border-gray-700/50 hover:bg-white dark:hover:bg-gray-800 hover:shadow-md transition-all duration-200">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-xl group-hover:scale-110 transition-transform duration-200">
                  <Table className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Advanced Data Tables
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Sorting, filtering, export
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  asChild
                >
                  <a href="/data-tables">
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
              </div>

              <div className="group flex items-center space-x-3 p-4 rounded-xl bg-white/70 dark:bg-gray-900/70 border border-gray-200/50 dark:border-gray-700/50 hover:bg-white dark:hover:bg-gray-800 hover:shadow-md transition-all duration-200">
                <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-xl group-hover:scale-110 transition-transform duration-200">
                  <Shield className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Enhanced Roles
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Analytics & bulk operations
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  asChild
                >
                  <a href="/admin/roles-enhanced">
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
              </div>

              <div className="group flex items-center space-x-3 p-4 rounded-xl bg-white/70 dark:bg-gray-900/70 border border-gray-200/50 dark:border-gray-700/50 hover:bg-white dark:hover:bg-gray-800 hover:shadow-md transition-all duration-200">
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-xl group-hover:scale-110 transition-transform duration-200">
                  <Key className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Enhanced Permissions
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Category management & insights
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  asChild
                >
                  <a href="/admin/permissions-enhanced">
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dashboard Widgets Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="transform hover:scale-[1.02] transition-transform duration-200">
            <QuickActionsWidget className="lg:col-span-1 shadow-md hover:shadow-lg transition-shadow duration-200" />
          </div>
          <div className="transform hover:scale-[1.02] transition-transform duration-200">
            <SystemStatusWidget
              className="lg:col-span-1 shadow-md hover:shadow-lg transition-shadow duration-200"
              loading={loading}
            />
          </div>
          <div className="transform hover:scale-[1.02] transition-transform duration-200">
            <RecentStatsWidget
              className="lg:col-span-1 shadow-md hover:shadow-lg transition-shadow duration-200"
              loading={loading}
            />
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 rounded-xl border shadow-md p-6">
          <ActivityFeed
            loading={loading}
            maxItems={8}
            className="lg:col-span-2"
          />
        </div>

        {/* Recent Projects Grid */}
        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 rounded-xl border shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                <Building2 className="h-6 w-6 mr-3 text-blue-600" />
                Recent Projects
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Your latest projects and their status
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="hover:bg-blue-50 hover:border-blue-300 transition-colors duration-200"
            >
              <Eye className="h-4 w-4 mr-2" />
              View All
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Card
                  key={i}
                  className="animate-pulse shadow-sm border-0 bg-white/60 dark:bg-gray-800/60"
                  variant="flat"
                >
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {projects.map((project) => (
                <Card
                  key={project.id}
                  className="group hover:shadow-xl hover:scale-[1.02] transition-all duration-300 bg-white/80 dark:bg-gray-800/80 border-0 shadow-md"
                  variant="default"
                >
                  <CardHeader compact className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle size="sm" className="truncate">
                          {project.name}
                        </CardTitle>
                        <CardDescription className="mt-1 line-clamp-2 text-xs">
                          {project.description || "No description provided"}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent compact>
                    <div className="space-y-2">
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <Building2 className="h-3 w-3 mr-1" />
                        <span className="truncate">
                          {project.pages_count || 3} pages •{" "}
                          {project.components_count || 8} components
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status || (project.is_public ? "active" : "draft"))}`}
                          >
                            {project.status ||
                              (project.is_public ? "active" : "draft")}
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
                className="group border-dashed border-2 border-gray-300 dark:border-gray-600 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all duration-300 cursor-pointer hover:shadow-lg"
                variant="outlined"
              >
                <CardContent
                  compact
                  className="flex flex-col items-center justify-center py-8"
                >
                  <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full group-hover:bg-blue-100 dark:group-hover:bg-blue-900 transition-colors duration-200 mb-4">
                    <Plus className="h-6 w-6 text-gray-400 group-hover:text-blue-600 transition-colors duration-200" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 transition-colors duration-200">
                    Create New Project
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    Start building something amazing
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <Building2 className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No projects yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                Get started by creating your first project and begin building
                something amazing
              </p>
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg">
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
