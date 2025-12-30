"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { Group } from "@/modules/groups/types";
import {
  useCreateGroup,
  useGroupHierarchy,
  useUpdateGroup,
} from "@/modules/groups/hooks/useGroups";
import { usePermissions } from "@/modules/admin/hooks/usePermissions";
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from "@/shared/components";
import type { Permission } from "@/shared/services/api/permissions";

// Validation schema
const groupFormSchema = z.object({
  name: z
    .string()
    .min(2, "Group name must be at least 2 characters")
    .max(100, "Group name cannot exceed 100 characters"),
  description: z
    .string()
    .max(500, "Description cannot exceed 500 characters")
    .optional(),
  parent_id: z.number().nullable().optional(),
  is_active: z.boolean(),
  permissions: z.array(z.number()),
});

type GroupFormData = z.infer<typeof groupFormSchema>;

interface GroupFormProps {
  group?: Group | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (group: Group) => void;
}

export function GroupForm({
  group,
  open,
  onOpenChange,
  onSuccess,
}: GroupFormProps) {
  const isEditMode = !!group?.id;

  // Mutations
  const createGroupMutation = useCreateGroup();
  const updateGroupMutation = useUpdateGroup();

  // Queries
  const { data: hierarchyData } = useGroupHierarchy();
  const { data: permissionsData, isLoading: permissionsLoading } =
    usePermissions();

  const form = useForm<GroupFormData>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      name: "",
      description: "",
      parent_id: null,
      is_active: true,
      permissions: [],
    },
  });

  // Reset form when group changes or dialog opens
  useEffect(() => {
    if (open) {
      if (group) {
        form.reset({
          name: group.name || "",
          description: group.description || "",
          parent_id: group.parent_id ?? null,
          is_active: group.is_active ?? true,
          permissions: group.permissions?.map((p) => p.id) || [],
        });
      } else {
        form.reset({
          name: "",
          description: "",
          parent_id: null,
          is_active: true,
          permissions: [],
        });
      }
    }
  }, [group, open, form]);

  const onSubmit = async (data: GroupFormData) => {
    try {
      const payload = {
        name: data.name,
        description: data.description || undefined,
        parent_id: data.parent_id ?? undefined,
        is_active: data.is_active,
        permission_ids: data.permissions,
      };

      let result: Group;
      if (isEditMode && group?.id) {
        result = await updateGroupMutation.mutateAsync({
          id: group.id,
          data: payload,
        });
      } else {
        result = await createGroupMutation.mutateAsync(payload);
      }

      onSuccess?.(result);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save group:", error);
    }
  };

  const permissions = permissionsData?.items || [];
  const isSubmitting =
    createGroupMutation.isPending || updateGroupMutation.isPending;

  // Group permissions by category
  const groupedPermissions = permissions.reduce(
    (acc, permission) => {
      const category = permission.category || "uncategorized";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(permission);
      return acc;
    },
    {} as Record<string, Permission[]>
  );

  const handlePermissionChange = (permissionId: number, checked: boolean) => {
    const currentPermissions = form.getValues("permissions");
    if (checked) {
      form.setValue("permissions", [...currentPermissions, permissionId]);
    } else {
      form.setValue(
        "permissions",
        currentPermissions.filter((id) => id !== permissionId)
      );
    }
  };

  // Filter out the current group from parent options to prevent circular references
  const availableParents = (hierarchyData || []).filter(
    (g) => g.id !== group?.id
  );

  // Flatten hierarchy for select options
  const flattenHierarchy = (
    groups: Group[],
    level = 0
  ): Array<{ id: number; name: string; level: number }> => {
    return groups.flatMap((g) => [
      { id: g.id, name: g.name, level },
      ...(g.children ? flattenHierarchy(g.children, level + 1) : []),
    ]);
  };

  const parentOptions = flattenHierarchy(availableParents);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Group" : "Create Group"}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update group information and permissions. Changes will be applied immediately."
              : "Create a new group to organize users and manage permissions."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Name and Status */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group Name *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., Marketing Team"
                        disabled={isSubmitting || group?.is_system_group}
                      />
                    </FormControl>
                    {group?.is_system_group && (
                      <FormDescription>
                        System groups cannot be renamed
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active Status</FormLabel>
                      <FormDescription>
                        Inactive groups cannot be used
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSubmitting || group?.is_system_group}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Brief description of the group's purpose..."
                      disabled={isSubmitting}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Parent Group */}
            <FormField
              control={form.control}
              name="parent_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent Group</FormLabel>
                  <Select
                    disabled={isSubmitting}
                    onValueChange={(value) =>
                      field.onChange(value === "none" ? null : parseInt(value))
                    }
                    value={field.value?.toString() || "none"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select parent group (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No Parent (Top Level)</SelectItem>
                      {parentOptions.map((option) => (
                        <SelectItem
                          key={option.id}
                          value={option.id.toString()}
                        >
                          {"  ".repeat(option.level)}
                          {option.level > 0 ? "└ " : ""}
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Groups can be organized in a hierarchy
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Permissions */}
            <FormField
              control={form.control}
              name="permissions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Permissions</FormLabel>
                  <FormDescription>
                    Select the permissions members of this group should have
                  </FormDescription>
                  {permissionsLoading ? (
                    <div className="flex items-center gap-2 py-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">
                        Loading permissions...
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-60 overflow-y-auto border rounded-md p-3">
                      {Object.entries(groupedPermissions).map(
                        ([category, categoryPermissions]) => (
                          <div key={category} className="space-y-2">
                            <h4 className="font-medium text-sm text-foreground capitalize">
                              {category}
                            </h4>
                            <div className="space-y-2 pl-4">
                              {categoryPermissions
                                .filter((p) => p.id !== undefined)
                                .map((permission) => (
                                  <div
                                    key={permission.id}
                                    className="flex items-start space-x-2"
                                  >
                                    <Checkbox
                                      id={`permission-${permission.id}`}
                                      checked={field.value.includes(
                                        permission.id
                                      )}
                                      onCheckedChange={(checked) =>
                                        handlePermissionChange(
                                          permission.id,
                                          checked as boolean
                                        )
                                      }
                                      disabled={
                                        isSubmitting || group?.is_system_group
                                      }
                                    />
                                    <div className="grid gap-1.5 leading-none">
                                      <label
                                        htmlFor={`permission-${permission.id}`}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                      >
                                        {permission.name}
                                      </label>
                                      {permission.description && (
                                        <p className="text-xs text-muted-foreground">
                                          {permission.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )
                      )}
                      {permissions.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No permissions available
                        </p>
                      )}
                    </div>
                  )}
                  {group?.is_system_group && (
                    <FormDescription>
                      System group permissions cannot be modified
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || group?.is_system_group}
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isSubmitting
                  ? isEditMode
                    ? "Updating..."
                    : "Creating..."
                  : isEditMode
                    ? "Update Group"
                    : "Create Group"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default GroupForm;
