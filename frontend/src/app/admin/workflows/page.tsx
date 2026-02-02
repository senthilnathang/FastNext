"use client";

import { formatDistanceToNow } from "date-fns";
import { Activity, ArrowRight, Circle, GitBranch } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  workflowsApi,
  type Workflow,
  type WorkflowTransition,
} from "@/lib/api/workflows";
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

// Validation schema
const workflowSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Name is required").max(200),
  code: z.string().min(1, "Code is required").max(200),
  model_name: z.string().min(1, "Model name is required"),
  state_field: z.string().default("state"),
  description: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
  states: z.array(z.any()).optional(),
  created_at: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
});

// Form fields
const formFields: FormField<Workflow>[] = [
  {
    name: "name",
    label: "Workflow Name",
    type: "text",
    required: true,
    placeholder: "Enter workflow name",
    description: "Human-readable name for the workflow",
  },
  {
    name: "code",
    label: "Code",
    type: "text",
    required: true,
    placeholder: "e.g. sales_order_workflow",
    description: "Unique identifier code",
  },
  {
    name: "model_name",
    label: "Model Name",
    type: "text",
    required: true,
    placeholder: "e.g. sale.order",
    description: "Model this workflow applies to",
  },
  {
    name: "state_field",
    label: "State Field",
    type: "text",
    defaultValue: "state",
    placeholder: "e.g. state",
    description: "Field on the model that holds the workflow state",
  },
  {
    name: "description",
    label: "Description",
    type: "textarea",
    placeholder: "Describe the workflow purpose",
    description: "Optional description",
  },
  {
    name: "is_active",
    label: "Active",
    type: "checkbox",
    defaultValue: true,
    description: "Whether this workflow is enabled",
  },
];

export default function WorkflowsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [selectedItems, setSelectedItems] = React.useState<any[]>([]);

  const { data: workflows = [], isLoading, error } = useQuery({
    queryKey: ["workflows"],
    queryFn: () => workflowsApi.list(),
  });

  // Fetch transitions for all workflows to get counts
  const { data: transitionCounts = {} } = useQuery({
    queryKey: ["workflow-transition-counts", workflows.map((w) => w.code)],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      await Promise.all(
        workflows.map(async (wf) => {
          try {
            const transitions = await workflowsApi.listTransitions(wf.code);
            counts[wf.code] = transitions.length;
          } catch {
            counts[wf.code] = 0;
          }
        }),
      );
      return counts;
    },
    enabled: workflows.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => workflowsApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workflows"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ code, data }: { code: string; data: any }) =>
      workflowsApi.update(code, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workflows"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (code: string) => workflowsApi.delete(code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workflows"] }),
  });

  const mode = searchParams.get("mode") || "list";
  const itemId = searchParams.get("id") || undefined;

  const handleModeChange = (newMode: string, newItemId?: string | number) => {
    const params = new URLSearchParams();
    if (newMode !== "list") {
      params.set("mode", newMode);
      if (newItemId) params.set("id", String(newItemId));
    }
    router.push(`/admin/workflows?${params.toString()}`);
  };

  const columns: Column[] = React.useMemo(
    () => [
      {
        id: "name",
        key: "name",
        label: "Workflow",
        sortable: true,
        searchable: true,
        render: (value, item) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <GitBranch className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-medium">{value as string}</div>
              <div className="text-sm text-muted-foreground">{item.code}</div>
            </div>
          </div>
        ),
      },
      {
        id: "model_name",
        key: "model_name",
        label: "Model",
        sortable: true,
        render: (value) => <span className="text-sm font-mono">{value as string}</span>,
      },
      {
        id: "states",
        key: "states",
        label: "States",
        render: (value, item) => {
          const states = (item.states || []) as any[];
          if (states.length === 0) {
            return <span className="text-sm text-muted-foreground">No states</span>;
          }
          return (
            <div className="flex flex-wrap gap-1">
              {states.slice(0, 4).map((s: any) => (
                <Badge
                  key={s.code}
                  variant="outline"
                  style={s.color ? { borderColor: s.color, color: s.color } : {}}
                  className="text-xs"
                >
                  <Circle className="h-2 w-2 mr-1 fill-current" />
                  {s.name}
                </Badge>
              ))}
              {states.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{states.length - 4} more
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        id: "transitions",
        key: "code",
        label: "Transitions",
        render: (_value, item) => (
          <div className="flex items-center gap-1">
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {transitionCounts[item.code] ?? 0}
            </span>
          </div>
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
        render: (value) =>
          value ? (
            <span className="text-sm">
              {formatDistanceToNow(new Date(value as string), { addSuffix: true })}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">--</span>
          ),
      },
    ],
    [transitionCounts],
  );

  const stats = React.useMemo(() => {
    const total = workflows.length;
    const active = workflows.filter((w) => w.is_active).length;
    const models = new Set(workflows.map((w) => w.model_name)).size;
    const transitions = Object.values(transitionCounts).reduce((sum, c) => sum + c, 0);
    return { total, active, models, transitions };
  }, [workflows, transitionCounts]);

  const fetchWorkflows = async (): Promise<Workflow[]> => workflows;

  const createWorkflow = async (data: Workflow): Promise<Workflow> => {
    return createMutation.mutateAsync({
      ...data,
      states: data.states || [],
    } as any);
  };

  const updateWorkflow = async (id: string | number, data: Workflow): Promise<Workflow> => {
    const item = workflows.find((w) => w.id === Number(id));
    return updateMutation.mutateAsync({ code: item?.code || String(id), data });
  };

  const deleteWorkflow = async (id: string | number): Promise<void> => {
    const item = workflows.find((w) => w.id === Number(id));
    if (confirm("Are you sure you want to delete this workflow?")) {
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
            Failed to load workflows
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {(error as any)?.message || "An error occurred"}
          </p>
        </div>
      </div>
    );
  }

  const config = createFormViewConfig<Workflow>({
    resourceName: "workflow",
    baseUrl: "/admin/workflows",
    apiEndpoint: "/api/v1/base/workflows",
    title: "Workflows",
    subtitle: "Manage state-machine workflows for your models",
    formFields,
    columns,
    validationSchema: workflowSchema as any,
    onFetch: fetchWorkflows,
    onCreate: createWorkflow,
    onUpdate: updateWorkflow,
    onDelete: deleteWorkflow,
    views: [
      { id: "wf-list", name: "List View", type: "list", columns, filters: {}, sortBy: "name", sortOrder: "asc" },
      { id: "wf-card", name: "Card View", type: "card", columns, filters: {}, sortBy: "name", sortOrder: "asc" },
    ],
    defaultView: "wf-list",
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      {mode === "list" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Workflows</CardTitle>
              <GitBranch className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Workflow definitions</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active}</div>
              <p className="text-xs text-muted-foreground">Currently enabled</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Models Covered</CardTitle>
              <Circle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.models}</div>
              <p className="text-xs text-muted-foreground">Distinct models</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transitions</CardTitle>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.transitions}</div>
              <p className="text-xs text-muted-foreground">Across all workflows</p>
            </CardContent>
          </Card>
        </div>
      )}

      <CommonFormViewManager
        config={config}
        mode={mode as any}
        itemId={itemId}
        onModeChange={handleModeChange}
        data={workflows}
        loading={isLoading}
        error={error ? (error as any)?.message || String(error) : null}
        selectable={true}
        selectedItems={selectedItems}
        onSelectionChange={setSelectedItems}
        bulkActions={[
          {
            label: "Delete Selected",
            action: (items: any[]) => {
              if (confirm(`Delete ${items.length} workflows?`)) {
                items.forEach((w) => deleteMutation.mutate(w.code));
              }
            },
          },
          {
            label: "Activate Selected",
            action: (items: any[]) => {
              items.forEach((w) => {
                if (!w.is_active) {
                  updateMutation.mutate({ code: w.code, data: { is_active: true } });
                }
              });
            },
          },
        ]}
      />
    </div>
  );
}
