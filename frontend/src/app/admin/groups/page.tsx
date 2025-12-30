"use client";

import { formatDistanceToNow } from "date-fns";
import {
  Calendar,
  FolderTree,
  Lock,
  Plus,
  Shield,
  Users,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { Badge } from "@/shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";

// Group type definition
interface Group {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  type: "department" | "team" | "project" | "custom";
  parent_id?: number;
  parent_name?: string;
  is_active: boolean;
  is_system: boolean;
  member_count: number;
  permissions_count: number;
  created_at: string;
  updated_at: string;
}

// Mock data for demonstration - replace with actual API calls
const mockGroups: Group[] = [
  {
    id: 1,
    name: "administrators",
    display_name: "Administrators",
    description: "System administrators with full access",
    type: "team",
    is_active: true,
    is_system: true,
    member_count: 5,
    permissions_count: 25,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-12-01T15:30:00Z",
  },
  {
    id: 2,
    name: "engineering",
    display_name: "Engineering",
    description: "Engineering department",
    type: "department",
    is_active: true,
    is_system: false,
    member_count: 45,
    permissions_count: 15,
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-11-25T09:15:00Z",
  },
  {
    id: 3,
    name: "frontend-team",
    display_name: "Frontend Team",
    description: "Frontend development team",
    type: "team",
    parent_id: 2,
    parent_name: "Engineering",
    is_active: true,
    is_system: false,
    member_count: 12,
    permissions_count: 10,
    created_at: "2024-02-20T14:00:00Z",
    updated_at: "2024-10-15T11:00:00Z",
  },
  {
    id: 4,
    name: "backend-team",
    display_name: "Backend Team",
    description: "Backend development team",
    type: "team",
    parent_id: 2,
    parent_name: "Engineering",
    is_active: true,
    is_system: false,
    member_count: 15,
    permissions_count: 12,
    created_at: "2024-02-20T14:00:00Z",
    updated_at: "2024-10-15T11:00:00Z",
  },
  {
    id: 5,
    name: "product-launch",
    display_name: "Product Launch Q1",
    description: "Q1 2025 product launch project team",
    type: "project",
    is_active: true,
    is_system: false,
    member_count: 20,
    permissions_count: 8,
    created_at: "2024-10-01T08:00:00Z",
    updated_at: "2024-12-15T11:00:00Z",
  },
  {
    id: 6,
    name: "legacy-support",
    display_name: "Legacy Support",
    description: "Deprecated support group",
    type: "custom",
    is_active: false,
    is_system: false,
    member_count: 3,
    permissions_count: 5,
    created_at: "2024-03-10T08:00:00Z",
    updated_at: "2024-08-15T11:00:00Z",
  },
];

const groupTypeColors: Record<string, string> = {
  department: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  team: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  project: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  custom: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

export default function GroupsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [groups, setGroups] = React.useState<Group[]>(mockGroups);
  const [loading, setLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");

  // Filter groups based on search and filters
  const filteredGroups = React.useMemo(() => {
    return groups.filter((group) => {
      const matchesSearch =
        searchQuery === "" ||
        group.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (group.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && group.is_active) ||
        (statusFilter === "inactive" && !group.is_active);

      const matchesType = typeFilter === "all" || group.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [groups, searchQuery, statusFilter, typeFilter]);

  // Calculate statistics
  const stats = React.useMemo(() => {
    const totalGroups = groups.length;
    const activeGroups = groups.filter((g) => g.is_active).length;
    const totalMembers = groups.reduce((sum, g) => sum + g.member_count, 0);
    const systemGroups = groups.filter((g) => g.is_system).length;

    return {
      totalGroups,
      activeGroups,
      inactiveGroups: totalGroups - activeGroups,
      totalMembers,
      systemGroups,
    };
  }, [groups]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Groups</h1>
          <p className="text-muted-foreground">
            Manage user groups, teams, and departments
          </p>
        </div>
        <Link href="/admin/groups/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Group
          </Button>
        </Link>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Groups</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalGroups}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeGroups} active, {stats.inactiveGroups} inactive
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
            <p className="text-xs text-muted-foreground">Across all groups</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Groups</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.systemGroups}</div>
            <p className="text-xs text-muted-foreground">Built-in groups</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custom Groups</CardTitle>
            <FolderTree className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalGroups - stats.systemGroups}
            </div>
            <p className="text-xs text-muted-foreground">User-created groups</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Groups Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Group</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredGroups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="text-muted-foreground">
                      No groups found matching your criteria
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredGroups.map((group) => (
                  <TableRow
                    key={group.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/admin/groups/${group.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {group.display_name}
                            {group.is_system && (
                              <Lock className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {group.name}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={groupTypeColors[group.type]}
                      >
                        {group.type.charAt(0).toUpperCase() + group.type.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {group.parent_name ? (
                        <span className="text-sm">{group.parent_name}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {group.member_count}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        {group.permissions_count}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={group.is_active ? "default" : "destructive"}>
                        {group.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {formatDistanceToNow(new Date(group.created_at), {
                          addSuffix: true,
                        })}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
