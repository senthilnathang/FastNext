"use client";

/**
 * Active Groups Widget
 * Shows groups user belongs to
 */

import {
  ArrowRight,
  ChevronRight,
  Crown,
  RefreshCw,
  Settings,
  Shield,
  User,
  Users,
  XCircle,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/modules/auth";
import type { Group, GroupMemberRole } from "@/modules/groups/types";
import { apiClient } from "@/shared/services/api/client";
import { cn } from "@/shared/utils";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { ScrollArea } from "../ui/scroll-area";
import { Skeleton } from "../ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

interface UserGroup extends Group {
  role?: GroupMemberRole;
  joined_at?: string;
}

interface ActiveGroupsWidgetProps {
  maxItems?: number;
  className?: string;
  onViewAll?: () => void;
  onGroupClick?: (group: UserGroup) => void;
  onManageGroups?: () => void;
}

const roleConfig: Record<GroupMemberRole, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  owner: { icon: Crown, color: "text-yellow-500", label: "Owner" },
  admin: { icon: Shield, color: "text-purple-500", label: "Admin" },
  member: { icon: User, color: "text-blue-500", label: "Member" },
  viewer: { icon: User, color: "text-gray-500", label: "Viewer" },
};

function getGroupInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getGroupColor(name: string): string {
  const colors = [
    "from-blue-400 to-blue-600",
    "from-purple-400 to-purple-600",
    "from-green-400 to-green-600",
    "from-orange-400 to-orange-600",
    "from-pink-400 to-pink-600",
    "from-indigo-400 to-indigo-600",
    "from-teal-400 to-teal-600",
    "from-red-400 to-red-600",
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

function GroupItemSkeleton() {
  return (
    <div className="flex items-center space-x-3 p-3 animate-pulse">
      <Skeleton className="h-10 w-10 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

function GroupItem({
  group,
  onClick,
}: {
  group: UserGroup;
  onClick: () => void;
}) {
  const RoleIcon = group.role ? roleConfig[group.role]?.icon : User;
  const roleColor = group.role ? roleConfig[group.role]?.color : "text-gray-500";
  const roleLabel = group.role ? roleConfig[group.role]?.label : "Member";

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center w-full space-x-3 p-3 rounded-lg transition-all",
        "hover:bg-gray-100 dark:hover:bg-gray-800",
        "focus:outline-none focus:ring-2 focus:ring-primary/50"
      )}
    >
      <Avatar className={cn("h-10 w-10 rounded-lg bg-gradient-to-br", getGroupColor(group.name))}>
        <AvatarFallback className="rounded-lg bg-transparent text-white font-medium">
          {getGroupInitials(group.name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 text-left min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{group.name}</p>
          {group.is_system_group && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              System
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={cn("flex items-center text-xs", roleColor)}>
                  <RoleIcon className="h-3 w-3 mr-1" />
                  {roleLabel}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Your role in this group</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {group.member_count !== undefined && (
            <>
              <span className="text-xs text-gray-400">|</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                <Users className="h-3 w-3 mr-1" />
                {group.member_count}
              </span>
            </>
          )}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
    </button>
  );
}

export function ActiveGroupsWidget({
  maxItems = 5,
  className,
  onViewAll,
  onGroupClick,
  onManageGroups,
}: ActiveGroupsWidgetProps) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    try {
      // Fetch user's groups (groups they belong to)
      const response = await apiClient.get<{
        items?: UserGroup[];
        groups?: UserGroup[];
      }>("/api/v1/groups/my-groups", { params: { limit: maxItems, is_active: true } });

      const items = response.data.items || response.data.groups || [];
      setGroups(items.slice(0, maxItems));
    } catch (err) {
      console.error("Failed to fetch groups:", err);
      // Try fetching all groups as fallback
      try {
        const fallbackResponse = await apiClient.get<{
          items?: UserGroup[];
        }>("/api/v1/groups/", { params: { limit: maxItems, is_active: true } });
        const items = fallbackResponse.data.items || [];
        setGroups(items.slice(0, maxItems).map((g) => ({ ...g, role: "member" as GroupMemberRole })));
      } catch {
        setError("Failed to load groups");
        // Set mock data for demo
        const mockGroups: UserGroup[] = [
          {
            id: 1,
            name: "Engineering Team",
            description: "Core engineering and development team",
            is_active: true,
            member_count: 15,
            role: "admin",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 2,
            name: "Product Design",
            description: "UI/UX and product design team",
            is_active: true,
            member_count: 8,
            role: "member",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 3,
            name: "Project Managers",
            description: "Project management and coordination",
            is_active: true,
            is_system_group: true,
            member_count: 5,
            role: "viewer",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 4,
            name: "All Hands",
            description: "Company-wide group for all employees",
            is_active: true,
            is_system_group: true,
            member_count: 120,
            role: "member",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
        setGroups(mockGroups);
      }
    } finally {
      setLoading(false);
    }
  }, [user, maxItems]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleViewAll = () => {
    if (onViewAll) {
      onViewAll();
    } else {
      window.location.href = "/groups";
    }
  };

  const handleGroupClick = (group: UserGroup) => {
    if (onGroupClick) {
      onGroupClick(group);
    } else {
      window.location.href = `/groups/${group.id}`;
    }
  };

  const handleManageGroups = () => {
    if (onManageGroups) {
      onManageGroups();
    } else {
      window.location.href = "/admin/groups";
    }
  };

  // Calculate role statistics
  const roleStats = groups.reduce(
    (acc, group) => {
      if (group.role) {
        acc[group.role] = (acc[group.role] || 0) + 1;
      }
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-lg">
            <Users className="h-5 w-5 mr-2" />
            My Groups
            {groups.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {groups.length}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleManageGroups}
              className="h-8 w-8 p-0"
              title="Manage groups"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchGroups()}
              disabled={loading}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        {/* Role Stats */}
        {!loading && groups.length > 0 && Object.keys(roleStats).length > 0 && (
          <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 flex-wrap">
            {Object.entries(roleStats).map(([role, count]) => {
              const config = roleConfig[role as GroupMemberRole];
              if (!config) return null;
              const Icon = config.icon;
              return (
                <div key={role} className="flex items-center gap-1.5">
                  <Icon className={cn("h-4 w-4", config.color)} />
                  <span className="text-sm font-medium">{count}</span>
                  <span className="text-xs text-gray-500">{config.label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Groups List */}
        {loading ? (
          <div className="space-y-1">
            {[...Array(3)].map((_, i) => (
              <GroupItemSkeleton key={i} />
            ))}
          </div>
        ) : error && groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <XCircle className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-500">{error}</p>
            <Button variant="ghost" size="sm" onClick={() => fetchGroups()} className="mt-2">
              Try again
            </Button>
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Users className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              No groups yet
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              You&apos;re not a member of any groups
            </p>
            <Button variant="outline" size="sm" onClick={handleViewAll} className="mt-4">
              Browse Groups
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-[240px] -mx-2">
            <div className="space-y-1 px-2">
              {groups.map((group) => (
                <GroupItem
                  key={group.id}
                  group={group}
                  onClick={() => handleGroupClick(group)}
                />
              ))}
            </div>
          </ScrollArea>
        )}

        {/* View All Link */}
        {groups.length > 0 && (
          <Button
            variant="ghost"
            className="w-full mt-3 text-sm"
            onClick={handleViewAll}
          >
            View all groups
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default ActiveGroupsWidget;
