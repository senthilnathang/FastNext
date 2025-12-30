"use client";

import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Key,
  Shield,
  Sparkles,
  Table,
  Users,
} from "lucide-react";
import React, { useEffect, useState } from "react";
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

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalRoles: number;
  totalPermissions: number;
  monthlyGrowth: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalRoles: 0,
    totalPermissions: 0,
    monthlyGrowth: 0,
  });
  const [loading, setLoading] = useState(true);

  // Sample data for charts
  const activityData = [
    { date: "Jan", users: 120, roles: 6, permissions: 24 },
    { date: "Feb", users: 145, roles: 6, permissions: 28 },
    { date: "Mar", users: 180, roles: 8, permissions: 32 },
    { date: "Apr", users: 220, roles: 8, permissions: 36 },
    { date: "May", users: 265, roles: 10, permissions: 40 },
    { date: "Jun", users: 310, roles: 12, permissions: 45 },
  ];

  // KPI data for analytics dashboard
  const kpiData: KpiData[] = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      change: stats.monthlyGrowth / 100,
      changeType: "increase",
      format: "number",
      icon: <Users className="h-4 w-4" />,
      description: "All registered users",
    },
    {
      title: "Active Users",
      value: stats.activeUsers,
      change: 0.08,
      changeType: "increase",
      format: "number",
      icon: <Activity className="h-4 w-4" />,
      description: "Currently active users",
    },
    {
      title: "Total Roles",
      value: stats.totalRoles,
      change: 0.15,
      changeType: "increase",
      format: "number",
      icon: <Shield className="h-4 w-4" />,
      description: "System roles configured",
    },
    {
      title: "Permissions",
      value: stats.totalPermissions,
      change: 0.22,
      changeType: "increase",
      format: "number",
      icon: <Key className="h-4 w-4" />,
      description: "Permission definitions",
    },
  ];

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Mock stats - in production, fetch from API
        setStats({
          totalUsers: 5,
          activeUsers: 5,
          totalRoles: 6,
          totalPermissions: 24,
          monthlyGrowth: 12.5,
        });
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
          <h1 className="text-2xl font-bold mb-2">
            Welcome back, {user?.full_name || user?.username || "User"}
          </h1>
          <p className="text-blue-100">
            Here&apos;s what&apos;s happening with your platform today.
          </p>
        </div>

        {/* Enhanced Analytics Dashboard */}
        <div className="bg-gradient-to-br from-white via-gray-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-950 rounded-xl border shadow-sm p-6">
          <AnalyticsDashboard
            kpis={kpiData}
            chartData={activityData}
            chartType="bar"
            xAxisKey="date"
            yAxisKeys={["users", "roles", "permissions"]}
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
                  Platform Features
                </CardTitle>
                <CardDescription className="text-sm mt-1">
                  Explore the powerful features available to you
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
                  <a href="/admin/users">
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
                    Role Management
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Configure roles & permissions
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  asChild
                >
                  <a href="/admin/roles">
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
              </div>

              <div className="group flex items-center space-x-3 p-4 rounded-xl bg-white/70 dark:bg-gray-900/70 border border-gray-200/50 dark:border-gray-700/50 hover:bg-white dark:hover:bg-gray-800 hover:shadow-md transition-all duration-200">
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-xl group-hover:scale-110 transition-transform duration-200">
                  <Bell className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Notifications
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Stay updated in real-time
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  asChild
                >
                  <a href="/notifications">
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
      </div>
    </div>
  );
}
