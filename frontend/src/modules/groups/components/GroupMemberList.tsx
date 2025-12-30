"use client";

import {
  Crown,
  MoreHorizontal,
  Search,
  Shield,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import * as React from "react";
import { useState } from "react";
import type { GroupMember, GroupMemberRole } from "@/modules/groups/types";
import {
  useGroupMembers,
  useRemoveGroupMembers,
  useUpdateGroupMember,
} from "@/modules/groups/hooks/useGroupMembers";
import { useGenericPermissions } from "@/modules/admin/hooks/useGenericPermissions";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
} from "@/shared/components";
import { AddMemberDialog } from "./AddMemberDialog";

interface GroupMemberListProps {
  groupId: number;
  showHeader?: boolean;
}

const roleLabels: Record<GroupMemberRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

const roleBadgeVariants: Record<GroupMemberRole, "default" | "secondary" | "outline"> = {
  owner: "default",
  admin: "secondary",
  member: "outline",
  viewer: "outline",
};

export function GroupMemberList({
  groupId,
  showHeader = true,
}: GroupMemberListProps) {
  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<GroupMember | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);

  // Permissions
  const permissions = useGenericPermissions("groups");
  const canManageMembers = permissions.checkUpdate("groups");

  // Query
  const { data, isLoading, refetch } = useGroupMembers(groupId, {
    skip: (page - 1) * pageSize,
    limit: pageSize,
    search: searchQuery || undefined,
    role: roleFilter !== "all" ? (roleFilter as GroupMemberRole) : undefined,
  });

  // Mutations
  const removeGroupMembersMutation = useRemoveGroupMembers();
  const updateGroupMemberMutation = useUpdateGroupMember();

  const members = data?.items || [];
  const totalItems = data?.total || 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  // Handlers
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleRoleFilterChange = (value: string) => {
    setRoleFilter(value);
    setPage(1);
  };

  const handleRemoveClick = (member: GroupMember) => {
    setMemberToRemove(member);
    setRemoveDialogOpen(true);
  };

  const handleConfirmRemove = async () => {
    if (memberToRemove) {
      try {
        await removeGroupMembersMutation.mutateAsync({
          groupId,
          userIds: [memberToRemove.user_id],
        });
        setRemoveDialogOpen(false);
        setMemberToRemove(null);
      } catch (error) {
        console.error("Failed to remove member:", error);
      }
    }
  };

  const handleRemoveSelected = async () => {
    if (selectedMembers.length > 0) {
      try {
        await removeGroupMembersMutation.mutateAsync({
          groupId,
          userIds: selectedMembers,
        });
        setSelectedMembers([]);
      } catch (error) {
        console.error("Failed to remove members:", error);
      }
    }
  };

  const handleRoleChange = async (member: GroupMember, newRole: GroupMemberRole) => {
    try {
      await updateGroupMemberMutation.mutateAsync({
        groupId,
        userId: member.user_id,
        data: { role: newRole },
      });
    } catch (error) {
      console.error("Failed to update member role:", error);
    }
  };

  const toggleSelectMember = (userId: number) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedMembers.length === members.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(members.map((m) => m.user_id));
    }
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email?.slice(0, 2).toUpperCase() || "??";
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Render loading skeleton
  const renderSkeleton = () => (
    <>
      {[...Array(5)].map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <Skeleton className="h-4 w-4" />
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          </TableCell>
          <TableCell>
            <Skeleton className="h-6 w-16" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-8 w-8" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );

  return (
    <Card>
      {showHeader && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Group Members</CardTitle>
              <CardDescription>
                {totalItems} member{totalItems !== 1 ? "s" : ""} in this group
              </CardDescription>
            </div>
            {canManageMembers && (
              <Button onClick={() => setAddMemberDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Members
              </Button>
            )}
          </div>
        </CardHeader>
      )}
      <CardContent>
        {/* Filters */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={handleRoleFilterChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="owner">Owner</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
          {selectedMembers.length > 0 && canManageMembers && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRemoveSelected}
              disabled={removeGroupMembersMutation.isPending}
            >
              <UserMinus className="h-4 w-4 mr-2" />
              Remove ({selectedMembers.length})
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                {canManageMembers && (
                  <TableHead className="w-[40px]">
                    <input
                      type="checkbox"
                      checked={
                        selectedMembers.length === members.length &&
                        members.length > 0
                      }
                      onChange={toggleSelectAll}
                      className="rounded"
                    />
                  </TableHead>
                )}
                <TableHead>Member</TableHead>
                <TableHead className="w-[120px]">Role</TableHead>
                <TableHead className="w-[150px]">Joined</TableHead>
                {canManageMembers && (
                  <TableHead className="w-[80px]">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                renderSkeleton()
              ) : members.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={canManageMembers ? 5 : 4}
                    className="h-48 text-center"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <Users className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold">No members found</h3>
                      <p className="text-muted-foreground mb-4">
                        {searchQuery
                          ? "Try adjusting your search or filters"
                          : "Add members to this group to get started"}
                      </p>
                      {canManageMembers && !searchQuery && (
                        <Button onClick={() => setAddMemberDialogOpen(true)}>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add Members
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                members.map((member) => (
                  <TableRow key={member.id} className="hover:bg-muted/50">
                    {canManageMembers && (
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(member.user_id)}
                          onChange={() => toggleSelectMember(member.user_id)}
                          className="rounded"
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage
                            src={member.user?.avatar_url}
                            alt={member.user?.full_name || member.user?.username}
                          />
                          <AvatarFallback>
                            {getInitials(
                              member.user?.full_name,
                              member.user?.email
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {member.user?.full_name || member.user?.username}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {member.user?.email}
                          </p>
                        </div>
                        {!member.user?.is_active && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {canManageMembers ? (
                        <Select
                          value={member.role || "member"}
                          onValueChange={(value) =>
                            handleRoleChange(member, value as GroupMemberRole)
                          }
                          disabled={updateGroupMemberMutation.isPending}
                        >
                          <SelectTrigger className="w-[100px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="owner">
                              <div className="flex items-center gap-2">
                                <Crown className="h-3 w-3" />
                                Owner
                              </div>
                            </SelectItem>
                            <SelectItem value="admin">
                              <div className="flex items-center gap-2">
                                <Shield className="h-3 w-3" />
                                Admin
                              </div>
                            </SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={roleBadgeVariants[member.role || "member"]}>
                          {roleLabels[member.role || "member"]}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(member.joined_at)}
                    </TableCell>
                    {canManageMembers && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleRemoveClick(member)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove from Group
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * pageSize + 1} to{" "}
              {Math.min(page * pageSize, totalItems)} of {totalItems} members
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
      </CardContent>

      {/* Add Member Dialog */}
      <AddMemberDialog
        groupId={groupId}
        open={addMemberDialogOpen}
        onOpenChange={setAddMemberDialogOpen}
        onSuccess={() => refetch()}
      />

      {/* Remove Confirmation Dialog */}
      <ConfirmationDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        title="Remove Member"
        description={`Are you sure you want to remove "${memberToRemove?.user?.full_name || memberToRemove?.user?.email}" from this group?`}
        confirmText="Remove"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleConfirmRemove}
        isLoading={removeGroupMembersMutation.isPending}
      />
    </Card>
  );
}

export default GroupMemberList;
