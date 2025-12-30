"use client";

import { Check, Loader2, Search, UserPlus, X } from "lucide-react";
import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import type { GroupMemberRole, GroupMemberUser } from "@/modules/groups/types";
import { useAddGroupMembers } from "@/modules/groups/hooks/useGroupMembers";
import { useUsers } from "@/modules/admin/hooks/useUsers";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components";

interface AddMemberDialogProps {
  groupId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  existingMemberIds?: number[];
}

interface SelectedUser {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
}

export function AddMemberDialog({
  groupId,
  open,
  onOpenChange,
  onSuccess,
  existingMemberIds = [],
}: AddMemberDialogProps) {
  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([]);
  const [role, setRole] = useState<GroupMemberRole>("member");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Query users
  const { data: usersData, isLoading: usersLoading } = useUsers({
    search: debouncedSearch || undefined,
    is_active: true,
    limit: 20,
  });

  // Mutation
  const addMembersMutation = useAddGroupMembers();

  // Filter out already selected and existing members
  const availableUsers =
    usersData?.items?.filter(
      (user) =>
        user.id &&
        !existingMemberIds.includes(user.id) &&
        !selectedUsers.some((s) => s.id === user.id)
    ) || [];

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSelectedUsers([]);
      setRole("member");
    }
  }, [open]);

  // Handlers
  const handleSelectUser = useCallback((user: SelectedUser) => {
    setSelectedUsers((prev) => [...prev, user]);
    setSearchQuery("");
  }, []);

  const handleRemoveUser = useCallback((userId: number) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  }, []);

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) return;

    try {
      await addMembersMutation.mutateAsync({
        groupId,
        data: {
          user_ids: selectedUsers.map((u) => u.id),
          role,
        },
      });
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to add members:", error);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Members to Group</DialogTitle>
          <DialogDescription>
            Search for users to add to this group. You can select multiple users
            at once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Role Selection */}
          <div className="space-y-2">
            <Label>Member Role</Label>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as GroupMemberRole)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">Owner - Full control</SelectItem>
                <SelectItem value="admin">Admin - Can manage members</SelectItem>
                <SelectItem value="member">Member - Standard access</SelectItem>
                <SelectItem value="viewer">Viewer - Read-only access</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* User Search */}
          <div className="space-y-2">
            <Label>Search Users</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Search Results */}
            {searchQuery && (
              <div className="border rounded-md">
                <ScrollArea className="h-[200px]">
                  {usersLoading ? (
                    <div className="flex items-center justify-center h-full py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : availableUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        {debouncedSearch
                          ? "No users found matching your search"
                          : "Start typing to search for users"}
                      </p>
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {availableUsers.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() =>
                            handleSelectUser({
                              id: user.id!,
                              email: user.email,
                              username: user.username,
                              full_name: user.full_name,
                              avatar_url: user.avatar_url,
                            })
                          }
                          className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted text-left transition-colors"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={user.avatar_url}
                              alt={user.full_name || user.username}
                            />
                            <AvatarFallback className="text-xs">
                              {getInitials(user.full_name, user.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {user.full_name || user.username}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {user.email}
                            </p>
                          </div>
                          <UserPlus className="h-4 w-4 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}
          </div>

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Users ({selectedUsers.length})</Label>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <Badge
                    key={user.id}
                    variant="secondary"
                    className="pl-2 pr-1 py-1"
                  >
                    <Avatar className="h-5 w-5 mr-2">
                      <AvatarImage
                        src={user.avatar_url}
                        alt={user.full_name || user.username}
                      />
                      <AvatarFallback className="text-[10px]">
                        {getInitials(user.full_name, user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">
                      {user.full_name || user.username}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveUser(user.id)}
                      className="ml-1 p-1 rounded-full hover:bg-background/50 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={addMembersMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddMembers}
            disabled={selectedUsers.length === 0 || addMembersMutation.isPending}
          >
            {addMembersMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Add {selectedUsers.length} Member
                {selectedUsers.length !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AddMemberDialog;
