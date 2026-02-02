"use client";

/**
 * Employee Dashboard Page
 *
 * Shows overview statistics and recent activity.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Users, UserCheck, UserPlus, TrendingUp } from "lucide-react";
import { useEmployees } from "../hooks/useEmployees";

export default function EmployeeDashboardPage() {
  const { data: allEmployees } = useEmployees({ limit: 1 });
  const { data: activeEmployees } = useEmployees({ limit: 1, search: undefined });

  const total = allEmployees?.total ?? 0;
  const active = activeEmployees?.total ?? 0;

  const stats = [
    {
      title: "Total Employees",
      value: total,
      icon: Users,
      description: "All records",
    },
    {
      title: "Active",
      value: active,
      icon: UserCheck,
      description: "Currently active",
    },
    {
      title: "This Month",
      value: 0,
      icon: UserPlus,
      description: "New this month",
    },
    {
      title: "Growth",
      value: "—",
      icon: TrendingUp,
      description: "Month over month",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Employee Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your workforce
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No recent activity to display.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
