"use client";

import { formatDistanceToNow } from "date-fns";
import { Calendar, Key, Lock, Shield, Tag, Zap } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { z } from "zod";
// Import React Query hooks
import {
  useCreatePermission,
  useDeletePermission,
  usePermissions,
  useUpdatePermission,
} from "@/modules/admin/hooks/usePermissions";
import { Badge } from "@/shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  CommonFormViewManager,
  createFormViewConfig,
} from "@/shared/components/views/CommonFormViewManager";
import type { FormField } from "@/shared/components/views/GenericFormView";
import type { Column } from "@/shared/components/views/ViewManager";
import { apiUtils } from "@/shared/services/api/client";
import type { Permission } from "@/shared/services/api/permissions";

// Permission validation schema
const permissionSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Permission name is required").max(100),
  codename: z.string().min(1, "Codename is required").max(100),
  description: z.string().optional(),
  category: z.string().optional(),
  resource_type: z.string().min(1, "Resource type is required"),
  action: z.string().min(1, "Action is required"),
  resource: z.string().optional(),
  is_active: z.boolean().default(true),
  is_system_permission: z.boolean().default(false),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

// Form fields configuration
const formFields: FormField<Permission>[] = [
  {
    name: "name",
    label: "Permission Name",
    type: "text",
    required: true,
    placeholder: "Enter permission name",
    description: "Human-readable name for this permission",
  },
  {
    name: "codename",
    label: "Codename",
    type: "text",
    required: true,
    placeholder: "permission_codename",
    description: "Unique codename used in code (e.g., can_edit_users)",
  },
  {
    name: "description",
    label: "Description",
    type: "textarea",
    placeholder: "Describe what this permission allows",
    description: "Optional description of the permission",
  },
  {
    name: "resource_type",
    label: "Resource Type",
    type: "select",
    required: true,
    options: [
      { value: "user", label: "User" },
      { value: "role", label: "Role" },
      { value: "permission", label: "Permission" },
      { value: "project", label: "Project" },
      { value: "page", label: "Page" },
      { value: "component", label: "Component" },
      { value: "system", label: "System" },
      { value: "admin", label: "Admin" },
      { value: "custom", label: "Custom" },
    ],
    description: "Type of resource this permission applies to",
  },
  {
    name: "action",
    label: "Action",
    type: "select",
    required: true,
    options: [
      { value: "create", label: "Create" },
      { value: "read", label: "Read" },
      { value: "update", label: "Update" },
      { value: "delete", label: "Delete" },
      { value: "list", label: "List" },
      { value: "execute", label: "Execute" },
      { value: "manage", label: "Manage" },
      { value: "admin", label: "Admin" },
      { value: "all", label: "All" },
    ],
    description: "Action that this permission allows",
  },
  {
    name: "is_active",
    label: "Active",
    type: "checkbox",
    defaultValue: true,
    description: "Whether this permission is currently active",
  },
];

export default function PermissionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedItems, setSelectedItems] = React.useState<any[]>([]);

  const { data: permissionsData, isLoading, error } = usePermissions();
  const createPermission = useCreatePermission();
  const updatePermission = useUpdatePermission();
  const deletePermission = useDeletePermission();

  // Determine current mode from URL
  const mode = searchParams.get("mode") || "list";
  const itemId = searchParams.get("id") || undefined;

  const handleModeChange = (newMode: string, newItemId?: string | number) => {
    const params = new URLSearchParams();
    if (newMode !== "list") {
      params.set("mode", newMode);
      if (newItemId) {
        params.set("id", String(newItemId));
      }
    }
    router.push(`/admin/permissions?${params.toString()}`);
  };

  // Define columns for the ViewManager
  const columns: Column[] = React.useMemo(
    () => [
      {
        id: "name",
        key: "name",
        label: "Permission",
        sortable: true,
        searchable: true,
        render: (value, permission) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Key className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-medium">{value as string}</div>
              <div className="text-sm text-muted-foreground font-mono">
                {permission.codename}
              </div>
            </div>
          </div>
        ),
      },
      {
        id: "resource_type",
        key: "resource_type",
        label: "Resource",
        sortable: true,
        filterable: true,
        type: "select",
        filterOptions: [
          { label: "User", value: "user" },
          { label: "Role", value: "role" },
          { label: "Permission", value: "permission" },
          { label: "Project", value: "project" },
          { label: "System", value: "system" },
          { label: "Admin", value: "admin" },
        ],
        render: (value) => (
          <Badge variant="outline" className="text-xs">
            <Tag className="w-3 h-3 mr-1" />
            {String(value).charAt(0).toUpperCase() + String(value).slice(1)}
          </Badge>
        ),
      },
      {
        id: "action",
        key: "action",
        label: "Action",
        sortable: true,
        filterable: true,
        type: "select",
        filterOptions: [
          { label: "Create", value: "create" },
          { label: "Read", value: "read" },
          { label: "Update", value: "update" },
          { label: "Delete", value: "delete" },
          { label: "Manage", value: "manage" },
          { label: "Admin", value: "admin" },
        ],
        render: (value) => (
          <Badge variant="secondary" className="text-xs">
            <Zap className="w-3 h-3 mr-1" />
            {String(value).charAt(0).toUpperCase() + String(value).slice(1)}
          </Badge>
        ),
      },
      {
        id: "description",
        key: "description",
        label: "Description",
        searchable: true,
        render: (value) => (
          <span className="text-sm text-muted-foreground">
            {value
              ? String(value).substring(0, 50) +
                (String(value).length > 50 ? "..." : "")
              : "-"}
          </span>
        ),
      },
      {
        id: "is_active",
        key: "is_active",
        label: "Status",
        sortable: true,
        filterable: true,
        type: "select",
        filterOptions: [
          { label: "Active", value: true },
          { label: "Inactive", value: false },
        ],
        render: (value) => (
          <Badge variant={value ? "default" : "destructive"}>
            {value ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        id: "created_at",
        key: "created_at",
        label: "Created",
        sortable: true,
        render: (value) => (
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {formatDistanceToNow(new Date(value as string), {
                addSuffix: true,
              })}
            </span>
          </div>
        ),
      },
    ],
    [],
  );

  const permissions = React.useMemo(
    () => permissionsData?.items || [],
    [permissionsData],
  );

  // Calculate statistics
  const stats = React.useMemo(() => {
    const totalPermissions = permissions.length;
    const activePermissions = permissions.filter(
      (permission) => permission.is_active,
    ).length;
    const inactivePermissions = totalPermissions - activePermissions;
    const resourceTypes = [...new Set(permissions.map((p) => p.resource_type))]
      .length;

    return {
      totalPermissions,
      activePermissions,
      inactivePermissions,
      resourceTypes,
    };
  }, [permissions]);

  // API functions
  const fetchPermissions = async (): Promise<Permission[]> => {
    return permissions;
  };

  const createPermissionApi = async (data: Permission): Promise<Permission> => {
    return new Promise((resolve, reject) => {
      createPermission.mutate(data, {
        onSuccess: (result) => resolve(result),
        onError: (error) => reject(new Error(apiUtils.getErrorMessage(error))),
      });
    });
  };

  const updatePermissionApi = async (
    id: string | number,
    data: Permission,
  ): Promise<Permission> => {
    return new Promise((resolve, reject) => {
      updatePermission.mutate(
        { id: Number(id), data },
        {
          onSuccess: (result) => resolve(result),
          onError: (error) =>
            reject(new Error(apiUtils.getErrorMessage(error))),
        },
      );
    });
  };

  const deletePermissionApi = async (id: string | number): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (confirm(`Are you sure you want to delete this permission?`)) {
        deletePermission.mutate(Number(id), {
          onSuccess: () => resolve(),
          onError: (error) =>
            reject(new Error(apiUtils.getErrorMessage(error))),
        });
      } else {
        reject(new Error("Deletion cancelled"));
      }
    });
  };

  const handleExport = (format: string) => {
    console.log(`Exporting permissions in ${format} format`);
    // TODO: Integrate with backend export API
  };

  const handleImport = () => {
    console.log("Importing permissions");
    // TODO: Integrate with backend import API
  };

  const bulkActions = [
    {
      label: "Delete Selected",
      action: (items: any[]) => {
        if (confirm(`Delete ${items.length} permissions?`)) {
          items.forEach((permission) => deletePermission.mutate(permission.id));
        }
      },
      variant: "destructive" as const,
    },
    {
      label: "Activate Selected",
      action: (items: any[]) => {
        items.forEach((permission) => {
          if (!permission.is_active) {
            updatePermission.mutate({
              id: permission.id,
              data: { ...permission, is_active: true },
            });
          }
        });
      },
    },
  ];

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Failed to load permissions
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {error.message || "An error occurred while loading permissions"}
          </p>
        </div>
      </div>
    );
  }

  // Create form view configuration
  const config = createFormViewConfig<Permission>({
    resourceName: "permission",
    baseUrl: "/admin/permissions",
    apiEndpoint: "/api/v1/permissions",
    title: "Permissions Management",
    subtitle: "Define and manage system permissions and access controls",
    formFields,
    columns,
    validationSchema: permissionSchema,
    onFetch: fetchPermissions,
    onCreate: createPermissionApi,
    onUpdate: updatePermissionApi,
    onDelete: deletePermissionApi,
    views: [
      {
        id: "permissions-card",
        name: "Card View",
        type: "card",
        columns,
        filters: {},
        sortBy: "created_at",
        sortOrder: "desc",
      },
      {
        id: "permissions-list",
        name: "List View",
        type: "list",
        columns,
        filters: {},
        sortBy: "created_at",
        sortOrder: "desc",
      },
    ],
    defaultView: "permissions-list",
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Statistics Cards - Only show in list mode */}
      {mode === "list" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Permissions
              </CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPermissions}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activePermissions} active, {stats.inactivePermissions}{" "}
                inactive
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Permissions
              </CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.activePermissions}
              </div>
              <p className="text-xs text-muted-foreground">Currently in use</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Resource Types
              </CardTitle>
              <Tag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.resourceTypes}</div>
              <p className="text-xs text-muted-foreground">
                Different resource types
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Security Level
              </CardTitle>
              <Lock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">High</div>
              <p className="text-xs text-muted-foreground">
                Granular permissions
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <CommonFormViewManager
        config={config}
        mode={mode as any}
        itemId={itemId}
        onModeChange={handleModeChange}
        data={permissions}
        loading={isLoading}
        error={error ? (error as any)?.message || String(error) : null}
        selectable={true}
        selectedItems={selectedItems}
        onSelectionChange={setSelectedItems}
        bulkActions={bulkActions}
        onExport={handleExport}
        onImport={handleImport}
      />
    </div>
  );
}
