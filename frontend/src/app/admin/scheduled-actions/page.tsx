"use client";

import { formatDistanceToNow } from "date-fns";
import { Activity, AlertCircle, Clock, Play, Timer } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  scheduledActionsApi,
  type ScheduledAction,
} from "@/lib/api/scheduled-actions";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
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

// Validation schema
const scheduledActionSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Name is required").max(200),
  code: z.string().min(1, "Code is required").max(200),
  model_name: z.string().optional().nullable(),
  method_name: z.string().min(1, "Method name is required"),
  interval_number: z.number().min(1).default(1),
  interval_type: z.string().default("hours"),
  cron_expression: z.string().optional().nullable(),
  priority: z.number().default(10),
  is_active: z.boolean().default(true),
  next_run: z.string().optional().nullable(),
  last_run: z.string().optional().nullable(),
  last_run_status: z.string().optional().nullable(),
});

// Form fields
const formFields: FormField<ScheduledAction>[] = [
  {
    name: "name",
    label: "Action Name",
    type: "text",
    required: true,
    placeholder: "Enter action name",
    description: "Human-readable name for the scheduled action",
  },
  {
    name: "code",
    label: "Code",
    type: "text",
    required: true,
    placeholder: "e.g. cleanup_expired_sessions",
    description: "Unique identifier code",
  },
  {
    name: "model_name",
    label: "Model Name",
    type: "text",
    placeholder: "e.g. res.partner",
    description: "Target model (optional)",
  },
  {
    name: "method_name",
    label: "Method Name",
    type: "text",
    required: true,
    placeholder: "e.g. _cron_cleanup",
    description: "Method to execute on the model or module",
  },
  {
    name: "interval_number",
    label: "Interval Number",
    type: "number",
    defaultValue: 1,
    description: "How often to run (number part)",
  },
  {
    name: "interval_type",
    label: "Interval Type",
    type: "select",
    defaultValue: "hours",
    options: [
      { label: "Minutes", value: "minutes" },
      { label: "Hours", value: "hours" },
      { label: "Days", value: "days" },
      { label: "Weeks", value: "weeks" },
      { label: "Months", value: "months" },
    ],
    description: "Unit of the interval",
  },
  {
    name: "cron_expression",
    label: "Cron Expression",
    type: "text",
    placeholder: "e.g. 0 */6 * * *",
    description: "Optional cron expression (overrides interval if set)",
  },
  {
    name: "priority",
    label: "Priority",
    type: "number",
    defaultValue: 10,
    description: "Execution priority (lower = higher priority)",
  },
  {
    name: "is_active",
    label: "Active",
    type: "checkbox",
    defaultValue: true,
    description: "Whether this action is enabled",
  },
];

export default function ScheduledActionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [selectedItems, setSelectedItems] = React.useState<any[]>([]);

  const { data: actions = [], isLoading, error } = useQuery({
    queryKey: ["scheduled-actions"],
    queryFn: () => scheduledActionsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => scheduledActionsApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scheduled-actions"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ code, data }: { code: string; data: any }) =>
      scheduledActionsApi.update(code, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scheduled-actions"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (code: string) => scheduledActionsApi.delete(code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scheduled-actions"] }),
  });

  const runMutation = useMutation({
    mutationFn: (code: string) => scheduledActionsApi.run(code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scheduled-actions"] }),
  });

  const mode = searchParams.get("mode") || "list";
  const itemId = searchParams.get("id") || undefined;

  const handleModeChange = (newMode: string, newItemId?: string | number) => {
    const params = new URLSearchParams();
    if (newMode !== "list") {
      params.set("mode", newMode);
      if (newItemId) params.set("id", String(newItemId));
    }
    router.push(`/admin/scheduled-actions?${params.toString()}`);
  };

  const columns: Column[] = React.useMemo(
    () => [
      {
        id: "name",
        key: "name",
        label: "Action Name",
        sortable: true,
        searchable: true,
        render: (value, item) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-medium">{value as string}</div>
              <div className="text-sm text-muted-foreground">{item.code}</div>
            </div>
          </div>
        ),
      },
      {
        id: "interval",
        key: "interval_number",
        label: "Interval",
        sortable: true,
        render: (value, item) => (
          <span className="text-sm">
            {item.cron_expression
              ? `Cron: ${item.cron_expression}`
              : `Every ${value} ${item.interval_type}`}
          </span>
        ),
      },
      {
        id: "last_run",
        key: "last_run",
        label: "Last Run",
        sortable: true,
        render: (value) =>
          value ? (
            <span className="text-sm">
              {formatDistanceToNow(new Date(value as string), { addSuffix: true })}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">Never</span>
          ),
      },
      {
        id: "last_run_status",
        key: "last_run_status",
        label: "Status",
        sortable: true,
        render: (value) => {
          if (!value) return <Badge variant="outline">Pending</Badge>;
          return (
            <Badge variant={value === "error" ? "destructive" : "default"}>
              {value as string}
            </Badge>
          );
        },
      },
      {
        id: "next_run",
        key: "next_run",
        label: "Next Run",
        sortable: true,
        render: (value) =>
          value ? (
            <span className="text-sm">
              {formatDistanceToNow(new Date(value as string), { addSuffix: true })}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">--</span>
          ),
      },
      {
        id: "is_active",
        key: "is_active",
        label: "Active",
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
        id: "actions",
        key: "id",
        label: "",
        render: (_value, item) => (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              runMutation.mutate(item.code);
            }}
            disabled={runMutation.isPending}
          >
            <Play className="h-3 w-3 mr-1" />
            Run Now
          </Button>
        ),
      },
    ],
    [runMutation],
  );

  const stats = React.useMemo(() => {
    const total = actions.length;
    const active = actions.filter((a) => a.is_active).length;
    const inactive = total - active;
    const failed = actions.filter((a) => a.last_run_status === "error").length;
    return { total, active, inactive, failed };
  }, [actions]);

  const fetchActions = async (): Promise<ScheduledAction[]> => actions;

  const createAction = async (data: ScheduledAction): Promise<ScheduledAction> => {
    return createMutation.mutateAsync(data as any);
  };

  const updateAction = async (id: string | number, data: ScheduledAction): Promise<ScheduledAction> => {
    const item = actions.find((a) => a.id === Number(id));
    return updateMutation.mutateAsync({ code: item?.code || String(id), data });
  };

  const deleteAction = async (id: string | number): Promise<void> => {
    const item = actions.find((a) => a.id === Number(id));
    if (confirm("Are you sure you want to delete this scheduled action?")) {
      await deleteMutation.mutateAsync(item?.code || String(id));
    } else {
      throw new Error("Deletion cancelled");
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Failed to load scheduled actions
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {(error as any)?.message || "An error occurred"}
          </p>
        </div>
      </div>
    );
  }

  const config = createFormViewConfig<ScheduledAction>({
    resourceName: "scheduled-action",
    baseUrl: "/admin/scheduled-actions",
    apiEndpoint: "/api/v1/base/scheduled-actions",
    title: "Scheduled Actions",
    subtitle: "Manage automated scheduled tasks and cron jobs",
    formFields,
    columns,
    validationSchema: scheduledActionSchema as any,
    onFetch: fetchActions,
    onCreate: createAction,
    onUpdate: updateAction,
    onDelete: deleteAction,
    views: [
      { id: "sa-list", name: "List View", type: "list", columns, filters: {}, sortBy: "name", sortOrder: "asc" },
      { id: "sa-card", name: "Card View", type: "card", columns, filters: {}, sortBy: "name", sortOrder: "asc" },
    ],
    defaultView: "sa-list",
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      {mode === "list" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Scheduled actions configured</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <Timer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active}</div>
              <p className="text-xs text-muted-foreground">Currently enabled</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactive</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inactive}</div>
              <p className="text-xs text-muted-foreground">Disabled actions</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.failed}</div>
              <p className="text-xs text-muted-foreground">Last run errored</p>
            </CardContent>
          </Card>
        </div>
      )}

      <CommonFormViewManager
        config={config}
        mode={mode as any}
        itemId={itemId}
        onModeChange={handleModeChange}
        data={actions}
        loading={isLoading}
        error={error ? (error as any)?.message || String(error) : null}
        selectable={true}
        selectedItems={selectedItems}
        onSelectionChange={setSelectedItems}
        bulkActions={[
          {
            label: "Delete Selected",
            action: (items: any[]) => {
              if (confirm(`Delete ${items.length} actions?`)) {
                items.forEach((a) => deleteMutation.mutate(a.code));
              }
            },
          },
        ]}
      />
    </div>
  );
}
