"use client";

import {
  ArrowLeft,
  Calendar,
  Edit,
  FolderTree,
  Shield,
  Trash2,
  Users,
} from "lucide-react";
import * as React from "react";
import { useState } from "react";
import type { Group } from "@/modules/groups/types";
import { useGroup, useGroupWithDetails } from "@/modules/groups/hooks/useGroup";
import { useDeleteGroup, useToggleGroupStatus } from "@/modules/groups/hooks/useGroups";
import { useGenericPermissions } from "@/modules/admin/hooks/useGenericPermissions";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmationDialog,
  Separator,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components";
import { GroupForm } from "./GroupForm";
import { GroupMemberList } from "./GroupMemberList";

interface GroupDetailsProps {
  groupId: number;
  onBack?: () => void;
  onDeleted?: () => void;
}

export function GroupDetails({ groupId, onBack, onDeleted }: GroupDetailsProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Permissions
  const permissions = useGenericPermissions("groups");
  const canEdit = permissions.checkUpdate("groups");
  const canDelete = permissions.checkDelete("groups");

  // Queries
  const { group, permissions: groupPermissions, isLoading, isError, error, refetch } =
    useGroupWithDetails(groupId);

  // Mutations
  const deleteGroupMutation = useDeleteGroup();
  const toggleStatusMutation = useToggleGroupStatus();

  const handleDelete = async () => {
    try {
      await deleteGroupMutation.mutateAsync(groupId);
      setDeleteDialogOpen(false);
      onDeleted?.();
    } catch (error) {
      console.error("Failed to delete group:", error);
    }
  };

  const handleToggleStatus = async () => {
    try {
      await toggleStatusMutation.mutateAsync(groupId);
    } catch (error) {
      console.error("Failed to toggle group status:", error);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (isError || !group) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-64">
          <p className="text-destructive mb-2">Error loading group</p>
          <p className="text-sm text-muted-foreground mb-4">
            {error instanceof Error ? error.message : "Group not found"}
          </p>
          <div className="flex gap-2">
            {onBack && (
              <Button onClick={onBack} variant="outline">
                Go Back
              </Button>
            )}
            <Button onClick={() => refetch()} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{group.name}</h1>
              <Badge variant={group.is_active ? "default" : "secondary"}>
                {group.is_active ? "Active" : "Inactive"}
              </Badge>
              {group.is_system_group && (
                <Badge variant="outline">System</Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {group.description || "No description provided"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && !group.is_system_group && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleStatus}
                disabled={toggleStatusMutation.isPending}
              >
                {group.is_active ? "Deactivate" : "Activate"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditDialogOpen(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </>
          )}
          {canDelete && !group.is_system_group && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">
            Members ({group.member_count ?? 0})
          </TabsTrigger>
          <TabsTrigger value="permissions">
            Permissions ({groupPermissions?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Group Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Group Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Members</p>
                    <p className="font-medium">{group.member_count ?? 0}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Permissions</p>
                    <p className="font-medium">
                      {groupPermissions?.length ?? 0}
                    </p>
                  </div>
                </div>
                {group.parent && (
                  <>
                    <Separator />
                    <div className="flex items-center gap-3">
                      <FolderTree className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Parent Group
                        </p>
                        <p className="font-medium">{group.parent.name}</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Timestamps Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="font-medium">{formatDate(group.created_at)}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Last Updated</p>
                    <p className="font-medium">{formatDate(group.updated_at)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Child Groups */}
          {group.children && group.children.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Child Groups</CardTitle>
                <CardDescription>
                  Groups that are organized under this group
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.children.map((child) => (
                    <Card key={child.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{child.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {child.member_count ?? 0} members
                          </p>
                        </div>
                        <Badge
                          variant={child.is_active ? "default" : "secondary"}
                        >
                          {child.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members">
          <GroupMemberList groupId={groupId} />
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Assigned Permissions</CardTitle>
              <CardDescription>
                Permissions that members of this group inherit
              </CardDescription>
            </CardHeader>
            <CardContent>
              {groupPermissions && groupPermissions.length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(
                    groupPermissions.reduce(
                      (acc, permission) => {
                        const category = permission.category || "uncategorized";
                        if (!acc[category]) {
                          acc[category] = [];
                        }
                        acc[category].push(permission);
                        return acc;
                      },
                      {} as Record<string, typeof groupPermissions>
                    )
                  ).map(([category, perms]) => (
                    <div key={category}>
                      <h4 className="font-medium text-sm text-foreground capitalize mb-2">
                        {category}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {perms.map((permission) => (
                          <Badge key={permission.id} variant="outline">
                            {permission.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No permissions assigned to this group
                  </p>
                  {canEdit && !group.is_system_group && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => setEditDialogOpen(true)}
                    >
                      Assign Permissions
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <GroupForm
        group={group}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={() => refetch()}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Group"
        description={`Are you sure you want to delete "${group.name}"? This action cannot be undone and will remove all member associations.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleteGroupMutation.isPending}
      />
    </div>
  );
}

export default GroupDetails;
