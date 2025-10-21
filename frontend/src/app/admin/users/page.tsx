"use client";

import { formatDistanceToNow } from "date-fns";
import { Calendar, Clock, Crown, Shield, UserCheck, Users } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { z } from "zod";
// Import React Query hooks
import {
  useCreateUser,
  useDeleteUser,
  useToggleUserStatus,
  useUpdateUser,
  useUsers,
} from "@/modules/admin/hooks/useUsers";
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
import type {
  Column,
  KanbanColumn,
} from "@/shared/components/views/ViewManager";
import { apiUtils } from "@/shared/services/api/client";
import type { User } from "@/shared/services/api/users";

// User validation schema
const userSchema = z.object({
  id: z.number().optional(),
  email: z.string().email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  full_name: z.string().optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .optional(),
  is_active: z.boolean().default(true),
  is_verified: z.boolean().default(false),
  is_superuser: z.boolean().default(false),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  last_login_at: z.string().optional(),
  roles: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
  avatar_url: z.string().optional(),
  bio: z.string().optional(),
  location: z.string().optional(),
  website: z.string().optional(),
});

// Form fields configuration
const formFields: FormField<User>[] = [
  {
    name: "email",
    label: "Email Address",
    type: "email",
    required: true,
    placeholder: "user@example.com",
    description: "User's email address for login and notifications",
  },
  {
    name: "username",
    label: "Username",
    type: "text",
    required: true,
    placeholder: "username",
    description: "Unique username for login",
  },
  {
    name: "full_name",
    label: "Full Name",
    type: "text",
    placeholder: "John Doe",
    description: "User's display name",
  },
  {
    name: "password",
    label: "Password",
    type: "password",
    placeholder: "Enter password",
    description: "Leave empty to keep current password when editing",
    condition: () => {
      // Show password field for create mode or when explicitly editing password
      const urlParams = new URLSearchParams(window.location.search);
      const mode = urlParams.get("mode");
      return mode === "create";
    },
  },
  {
    name: "is_active",
    label: "Active",
    type: "checkbox",
    defaultValue: true,
    description: "Whether the user account is active",
  },
  {
    name: "is_verified",
    label: "Verified",
    type: "checkbox",
    defaultValue: false,
    description: "Whether the user's email has been verified",
  },
  {
    name: "is_superuser",
    label: "Administrator",
    type: "checkbox",
    defaultValue: false,
    description: "Grant administrative privileges to this user",
  },
];

type UsersPageProps = Record<string, never>;

const UsersPage: React.FC<UsersPageProps> = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedItems, setSelectedItems] = React.useState<any[]>([]);

  const { data: usersData, isLoading, error } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const toggleUserStatus = useToggleUserStatus();

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
    router.push(`/admin/users?${params.toString()}`);
  };

  // Define columns for the ViewManager (memoized for performance)
  const columns: Column[] = React.useMemo(
    () => [
      {
        id: "username",
        key: "username",
        label: "User",
        sortable: true,
        searchable: true,
        render: (value, user) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <span className="text-sm font-medium text-primary">
                {user.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="font-medium">{value as string}</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
            </div>
          </div>
        ),
      },
      {
        id: "full_name",
        key: "full_name",
        label: "Full Name",
        sortable: true,
        searchable: true,
        render: (value) => (value as string) || "-",
      },
      {
        id: "roles",
        key: "roles",
        label: "Roles",
        render: (value) => {
          const roles = (value as string[]) || [];
          return (
            <div className="flex gap-1 flex-wrap">
              {roles.length > 0 ? (
                roles.slice(0, 2).map((role) => (
                  <Badge key={role} variant="secondary" className="text-xs">
                    {role}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">No role</span>
              )}
              {roles.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{roles.length - 2}
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        id: "status",
        key: "is_active",
        label: "Status",
        sortable: true,
        filterable: true,
        type: "select",
        filterOptions: [
          { label: "Active", value: true },
          { label: "Inactive", value: false },
        ],
        render: (value, user) => (
          <div className="flex gap-2">
            <Badge variant={user.is_active ? "default" : "destructive"}>
              {user.is_active ? "Active" : "Inactive"}
            </Badge>
            {user.is_superuser && (
              <Badge variant="outline" className="text-xs">
                <Shield className="w-3 h-3 mr-1" />
                Admin
              </Badge>
            )}
            {user.is_verified && (
              <Badge variant="outline" className="text-xs">
                <UserCheck className="w-3 h-3 mr-1" />
                Verified
              </Badge>
            )}
          </div>
        ),
      },
      {
        id: "last_login_at",
        key: "last_login_at",
        label: "Last Login",
        sortable: true,
        render: (value) => (
          <span className="text-sm text-muted-foreground">
            {value
              ? formatDistanceToNow(new Date(value as string), {
                  addSuffix: true,
                })
              : "Never"}
          </span>
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

  const users = React.useMemo(() => usersData?.items || [], [usersData]);

  // Calculate statistics
  const stats = React.useMemo(() => {
    const totalUsers = users.length;
    const activeUsers = users.filter((user) => user.is_active).length;
    const inactiveUsers = totalUsers - activeUsers;
    const verifiedUsers = users.filter((user) => user.is_verified).length;
    const superUsers = users.filter((user) => user.is_superuser).length;
    const recentLogins = users.filter((user) => {
      if (!user.last_login_at) return false;
      const lastLogin = new Date(user.last_login_at);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return lastLogin > thirtyDaysAgo;
    }).length;
    const neverLoggedIn = users.filter((user) => !user.last_login_at).length;

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      verifiedUsers,
      superUsers,
      recentLogins,
      neverLoggedIn,
      verificationRate:
        totalUsers > 0 ? Math.round((verifiedUsers / totalUsers) * 100) : 0,
      activityRate:
        totalUsers > 0 ? Math.round((recentLogins / totalUsers) * 100) : 0,
    };
  }, [users]);

  // Define kanban columns for user status
  const kanbanColumns: KanbanColumn[] = React.useMemo(
    () => [
      {
        id: "true",
        title: "Active Users",
        color: "#10b981",
        count: users.filter((user) => user.is_active).length,
      },
      {
        id: "false",
        title: "Inactive Users",
        color: "#ef4444",
        count: users.filter((user) => !user.is_active).length,
      },
    ],
    [users],
  );

  // Define kanban card fields
  const kanbanCardFields = React.useMemo(
    () => [
      {
        key: "email",
        label: "Email",
        type: "text" as const,
      },
      {
        key: "is_superuser",
        label: "Admin",
        type: "badge" as const,
        render: (value: unknown) => (value ? "Admin" : null),
      },
      {
        key: "is_verified",
        label: "Verified",
        type: "badge" as const,
        render: (value: unknown) => (value ? "Verified" : "Unverified"),
      },
      {
        key: "last_login_at",
        label: "Last Login",
        type: "date" as const,
        render: (value: unknown) =>
          value
            ? formatDistanceToNow(new Date(value as string), {
                addSuffix: true,
              })
            : "Never",
      },
    ],
    [],
  );

  // API functions
  const fetchUsers = async (): Promise<User[]> => {
    const data = await usersData;
    return data?.items || [];
  };

  const createUserApi = async (data: User): Promise<User> => {
    return new Promise((resolve, reject) => {
      const createData = {
        email: data.email,
        username: data.username,
        password: data.password || "TempPassword123!", // Default password if not provided
        full_name: data.full_name,
        is_active: data.is_active,
        is_verified: data.is_verified,
        is_superuser: data.is_superuser,
        bio: data.bio,
        location: data.location,
        website: data.website,
        avatar_url: data.avatar_url,
      };
      createUser.mutate(createData, {
        onSuccess: (result) => resolve(result),
        onError: (error) => reject(new Error(apiUtils.getErrorMessage(error))),
      });
    });
  };

  const updateUserApi = async (
    id: string | number,
    data: User,
  ): Promise<User> => {
    return new Promise((resolve, reject) => {
      const updateData = {
        email: data.email,
        username: data.username,
        full_name: data.full_name,
        is_active: data.is_active,
        is_verified: data.is_verified,
        is_superuser: data.is_superuser,
        bio: data.bio,
        location: data.location,
        website: data.website,
        avatar_url: data.avatar_url,
      };
      updateUser.mutate(
        { id: Number(id), data: updateData },
        {
          onSuccess: (result) => resolve(result),
          onError: (error) =>
            reject(new Error(apiUtils.getErrorMessage(error))),
        },
      );
    });
  };

  const deleteUserApi = async (id: string | number): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (confirm(`Are you sure you want to delete this user?`)) {
        deleteUser.mutate(Number(id), {
          onSuccess: () => resolve(),
          onError: (error) =>
            reject(new Error(apiUtils.getErrorMessage(error))),
        });
      } else {
        reject(new Error("Deletion cancelled"));
      }
    });
  };

  const handleMoveCard = (
    cardId: string | number,
    sourceColumnId: string,
    targetColumnId: string,
  ) => {
    const userId = Number(cardId);
    const shouldBeActive = targetColumnId === "true";

    // Find the user to toggle
    const user = users.find((u) => u.id === userId);
    if (user && user.is_active !== shouldBeActive) {
      toggleUserStatus.mutate(userId);
    }
  };

  const handleQuickAdd = (columnId: string, title: string) => {
    // Extract email from title for quick user creation
    const email = title.includes("@") ? title : `${title}@example.com`;
    const username = title.replace("@", "_").replace(/[^a-zA-Z0-9_]/g, "_");

    createUser.mutate({
      email,
      username,
      full_name: title,
      password: "TempPassword123!", // Should prompt for password in real app
      is_active: columnId === "true",
    });
  };

  const handleExport = (format: string) => {
    console.log(`Exporting users in ${format} format`);
    // TODO: Integrate with backend export API
  };

  const handleImport = () => {
    console.log("Importing users");
    // TODO: Integrate with backend import API
  };

  const bulkActions = [
    {
      label: "Delete Selected",
      action: (items: any[]) => {
        if (confirm(`Delete ${items.length} users?`)) {
          items.forEach((user) => deleteUser.mutate(user.id));
        }
      },
      variant: "destructive" as const,
    },
    {
      label: "Activate Selected",
      action: (items: any[]) => {
        items.forEach((user) => {
          if (!user.is_active) {
            toggleUserStatus.mutate(user.id);
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
            Failed to load users
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {error.message || "An error occurred while loading users"}
          </p>
        </div>
      </div>
    );
  }

  // Create form view configuration
  const config = createFormViewConfig<User>({
    resourceName: "user",
    baseUrl: "/admin/users",
    apiEndpoint: "/api/v1/users",
    title: "Users Management",
    subtitle:
      "Comprehensive user management with analytics, filtering, sorting, bulk operations, and export capabilities",
    formFields,
    columns,
    validationSchema: userSchema,
    onFetch: fetchUsers,
    onCreate: createUserApi,
    onUpdate: updateUserApi,
    onDelete: deleteUserApi,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canView: true,
    views: [
      {
        id: "users-card",
        name: "Card View",
        type: "card",
        columns,
        filters: {},
        sortBy: "created_at",
        sortOrder: "desc",
      },
      {
        id: "users-list",
        name: "List View",
        type: "list",
        columns,
        filters: {},
        sortBy: "created_at",
        sortOrder: "desc",
      },
      {
        id: "users-kanban",
        name: "Kanban Board",
        type: "kanban",
        columns,
        filters: {},
        groupBy: "is_active",
      },
    ],
    defaultView: "users-list",
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Statistics Cards - Only show in list mode */}
      {mode === "list" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeUsers} active, {stats.inactiveUsers} inactive
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Verified Users
              </CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.verifiedUsers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.verificationRate}% verification rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Recent Activity
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentLogins}</div>
              <p className="text-xs text-muted-foreground">
                Logged in last 30 days ({stats.activityRate}%)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Administrators
              </CardTitle>
              <Crown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.superUsers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.neverLoggedIn} never logged in
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
        data={users}
        loading={isLoading}
        error={error ? (error as any)?.message || String(error) : null}
        selectable={true}
        selectedItems={selectedItems}
        onSelectionChange={setSelectedItems}
        bulkActions={bulkActions}
        onExport={handleExport}
        onImport={handleImport}
        // Kanban-specific props
        kanbanColumns={kanbanColumns}
        onMoveCard={handleMoveCard}
        enableQuickAdd={true}
        onQuickAdd={handleQuickAdd}
        kanbanGroupByField="is_active"
        kanbanCardTitleField="full_name"
        kanbanCardDescriptionField="email"
        kanbanCardFields={kanbanCardFields}
      />
    </div>
  );
};

export default UsersPage;
