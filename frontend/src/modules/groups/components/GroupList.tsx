"use client";

import {
  ChevronDown,
  ChevronRight,
  Edit,
  Eye,
  FolderTree,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import * as React from "react";
import { useState } from "react";
import type { Group, GroupFilterOptions, GroupListParams } from "@/modules/groups/types";
import { useDeleteGroup, useGroups, useToggleGroupStatus } from "@/modules/groups/hooks/useGroups";
import { useGenericPermissions } from "@/modules/admin/hooks/useGenericPermissions";
import {
  Badge,
  Button,
  Card,
  CardContent,
  ConfirmationDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components";

interface GroupListProps {
  onCreateClick?: () => void;
  onEditClick?: (group: Group) => void;
  onViewClick?: (group: Group) => void;
  onMembersClick?: (group: Group) => void;
  title?: string;
  subtitle?: string;
  showHierarchy?: boolean;
}

export function GroupList({
  onCreateClick,
  onEditClick,
  onViewClick,
  onMembersClick,
  title = "Groups",
  subtitle = "Manage user groups and their permissions",
  showHierarchy = false,
}: GroupListProps) {
  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<GroupFilterOptions>({
    status: "all",
    parentGroup: null,
    hasMembers: null,
  });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());

  // Permissions
  const permissions = useGenericPermissions("groups");
  const canCreate = permissions.checkCreate("groups");
  const canEdit = permissions.checkUpdate("groups");
  const canDelete = permissions.checkDelete("groups");
  const canView = permissions.checkRead("groups");

  // Build query params
  const queryParams: GroupListParams = {
    skip: (page - 1) * pageSize,
    limit: pageSize,
    search: searchQuery || undefined,
    is_active: filters.status === "all" ? undefined : filters.status === "active",
    parent_id: filters.parentGroup ?? undefined,
    include_children: showHierarchy,
  };

  // Queries and mutations
  const { data, isLoading, error, refetch } = useGroups(queryParams);
  const deleteGroupMutation = useDeleteGroup();
  const toggleStatusMutation = useToggleGroupStatus();

  const groups = data?.items || [];
  const totalItems = data?.total || 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  // Handlers
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      status: value as GroupFilterOptions["status"],
    }));
    setPage(1);
  };

  const handleDeleteClick = (group: Group) => {
    setGroupToDelete(group);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (groupToDelete) {
      try {
        await deleteGroupMutation.mutateAsync(groupToDelete.id);
        setDeleteDialogOpen(false);
        setGroupToDelete(null);
      } catch (error) {
        console.error("Failed to delete group:", error);
      }
    }
  };

  const handleToggleStatus = async (group: Group) => {
    try {
      await toggleStatusMutation.mutateAsync(group.id);
    } catch (error) {
      console.error("Failed to toggle group status:", error);
    }
  };

  const toggleExpanded = (groupId: number) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  // Render loading skeleton
  const renderSkeleton = () => (
    <>
      {[...Array(5)].map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <Skeleton className="h-4 w-32" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-48" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-16" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-8 w-8" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );

  // Render group row with optional hierarchy indentation
  const renderGroupRow = (group: Group, level = 0) => {
    const hasChildren = group.children && group.children.length > 0;
    const isExpanded = expandedGroups.has(group.id);

    return (
      <React.Fragment key={group.id}>
        <TableRow className="hover:bg-muted/50">
          <TableCell>
            <div
              className="flex items-center gap-2"
              style={{ paddingLeft: `${level * 24}px` }}
            >
              {showHierarchy && hasChildren && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => toggleExpanded(group.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              )}
              {showHierarchy && !hasChildren && (
                <span className="w-6" />
              )}
              <span className="font-medium">{group.name}</span>
              {group.is_system_group && (
                <Badge variant="outline" className="ml-2 text-xs">
                  System
                </Badge>
              )}
            </div>
          </TableCell>
          <TableCell className="text-muted-foreground max-w-xs truncate">
            {group.description || "-"}
          </TableCell>
          <TableCell>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{group.member_count ?? 0}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {group.member_count ?? 0} members in this group
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </TableCell>
          <TableCell>
            <Badge variant={group.is_active ? "default" : "secondary"}>
              {group.is_active ? "Active" : "Inactive"}
            </Badge>
          </TableCell>
          <TableCell>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canView && onViewClick && (
                  <DropdownMenuItem onClick={() => onViewClick(group)}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                )}
                {onMembersClick && (
                  <DropdownMenuItem onClick={() => onMembersClick(group)}>
                    <Users className="h-4 w-4 mr-2" />
                    Manage Members
                  </DropdownMenuItem>
                )}
                {canEdit && onEditClick && (
                  <DropdownMenuItem
                    onClick={() => onEditClick(group)}
                    disabled={group.is_system_group}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {canEdit && (
                  <DropdownMenuItem
                    onClick={() => handleToggleStatus(group)}
                    disabled={group.is_system_group}
                  >
                    {group.is_active ? "Deactivate" : "Activate"}
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <DropdownMenuItem
                    onClick={() => handleDeleteClick(group)}
                    className="text-destructive"
                    disabled={group.is_system_group}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
        {/* Render children if expanded */}
        {showHierarchy &&
          isExpanded &&
          hasChildren &&
          group.children?.map((child) => renderGroupRow(child, level + 1))}
      </React.Fragment>
    );
  };

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-64">
          <p className="text-destructive mb-2">Error loading groups</p>
          <p className="text-sm text-muted-foreground mb-4">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
          <Button onClick={() => refetch()} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => refetch()} variant="outline" size="sm">
            Refresh
          </Button>
          {canCreate && onCreateClick && (
            <Button onClick={onCreateClick}>
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search groups..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-9"
          />
        </div>
        <Select value={filters.status} onValueChange={handleStatusFilterChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        {showHierarchy && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setExpandedGroups((prev) =>
                prev.size > 0 ? new Set() : new Set(groups.map((g) => g.id))
              )
            }
          >
            <FolderTree className="h-4 w-4 mr-2" />
            {expandedGroups.size > 0 ? "Collapse All" : "Expand All"}
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[100px]">Members</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                renderSkeleton()
              ) : groups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Users className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold">No groups found</h3>
                      <p className="text-muted-foreground mb-4">
                        {searchQuery
                          ? "Try adjusting your search or filters"
                          : "Get started by creating your first group"}
                      </p>
                      {canCreate && onCreateClick && !searchQuery && (
                        <Button onClick={onCreateClick}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Group
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                groups.map((group) => renderGroupRow(group))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1} to{" "}
            {Math.min(page * pageSize, totalItems)} of {totalItems} groups
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Group"
        description={`Are you sure you want to delete "${groupToDelete?.name}"? This action cannot be undone and will remove all member associations.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleConfirmDelete}
        isLoading={deleteGroupMutation.isPending}
      />
    </div>
  );
}

export default GroupList;
