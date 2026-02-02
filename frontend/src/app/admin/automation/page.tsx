"use client";

import { Bot, Code, Settings, Zap } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  automationApi,
  type AutomationRule,
  type ServerAction,
} from "@/lib/api/automation";
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

// Validation schemas
const actionSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Name is required").max(200),
  code: z.string().min(1, "Code is required").max(200),
  model_name: z.string().min(1, "Model name is required"),
  action_type: z.string().default("python_code"),
  method_name: z.string().optional().nullable(),
  python_code: z.string().optional().nullable(),
  sequence: z.number().default(10),
  is_active: z.boolean().default(true),
});

const ruleSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Name is required").max(200),
  code: z.string().min(1, "Code is required").max(200),
  model_name: z.string().min(1, "Model name is required"),
  trigger: z.string().default("on_create"),
  is_active: z.boolean().default(true),
  sequence: z.number().default(10),
  action_code: z.string().optional().nullable(),
});

// Form fields for Server Actions
const actionFormFields: FormField<ServerAction>[] = [
  {
    name: "name",
    label: "Action Name",
    type: "text",
    required: true,
    placeholder: "Enter action name",
    description: "Human-readable name for this action",
  },
  {
    name: "code",
    label: "Code",
    type: "text",
    required: true,
    placeholder: "e.g. action_send_email",
    description: "Unique identifier code",
  },
  {
    name: "model_name",
    label: "Model Name",
    type: "text",
    required: true,
    placeholder: "e.g. res.partner",
    description: "Target model for this action",
  },
  {
    name: "action_type",
    label: "Action Type",
    type: "select",
    defaultValue: "python_code",
    options: [
      { label: "Python Code", value: "python_code" },
      { label: "Method Call", value: "method_call" },
      { label: "Update Record", value: "update_record" },
      { label: "Webhook", value: "webhook" },
    ],
    description: "Type of action to execute",
  },
  {
    name: "method_name" as any,
    label: "Method Name",
    type: "text",
    placeholder: "e.g. action_confirm",
    description: "Method to call (for method_call type)",
  },
  {
    name: "python_code" as any,
    label: "Python Code",
    type: "textarea",
    placeholder: "# Python code to execute...",
    description: "Code to execute (for python_code type)",
  },
  {
    name: "sequence",
    label: "Sequence",
    type: "number",
    defaultValue: 10,
    description: "Execution order (lower = first)",
  },
  {
    name: "is_active",
    label: "Active",
    type: "checkbox",
    defaultValue: true,
    description: "Whether this action is enabled",
  },
];

// Form fields for Automation Rules
const ruleFormFields: FormField<AutomationRule>[] = [
  {
    name: "name",
    label: "Rule Name",
    type: "text",
    required: true,
    placeholder: "Enter rule name",
    description: "Human-readable name for this rule",
  },
  {
    name: "code",
    label: "Code",
    type: "text",
    required: true,
    placeholder: "e.g. rule_auto_assign",
    description: "Unique identifier code",
  },
  {
    name: "model_name",
    label: "Model Name",
    type: "text",
    required: true,
    placeholder: "e.g. res.partner",
    description: "Model this rule applies to",
  },
  {
    name: "trigger",
    label: "Trigger Type",
    type: "select",
    defaultValue: "on_create",
    options: [
      { label: "On Create", value: "on_create" },
      { label: "On Write", value: "on_write" },
      { label: "On Delete", value: "on_delete" },
      { label: "On Time", value: "on_time" },
    ],
    description: "When this rule should trigger",
  },
  {
    name: "action_code",
    label: "Action Code",
    type: "text",
    placeholder: "e.g. action_send_email",
    description: "Server action to execute (optional)",
  },
  {
    name: "sequence",
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
    description: "Whether this rule is enabled",
  },
];

export default function AutomationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [selectedActions, setSelectedActions] = React.useState<any[]>([]);
  const [selectedRules, setSelectedRules] = React.useState<any[]>([]);
  const [activeTab, setActiveTab] = React.useState<"actions" | "rules">("actions");

  const { data: actionsData = [], isLoading: actionsLoading, error: actionsError } = useQuery({
    queryKey: ["automation-actions"],
    queryFn: () => automationApi.actions.list(),
  });

  const { data: rulesData = [], isLoading: rulesLoading, error: rulesError } = useQuery({
    queryKey: ["automation-rules"],
    queryFn: () => automationApi.rules.list(),
  });

  const createActionMut = useMutation({
    mutationFn: (data: any) => automationApi.actions.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automation-actions"] }),
  });
  const updateActionMut = useMutation({
    mutationFn: ({ code, data }: { code: string; data: any }) => automationApi.actions.update(code, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automation-actions"] }),
  });
  const deleteActionMut = useMutation({
    mutationFn: (code: string) => automationApi.actions.delete(code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automation-actions"] }),
  });

  const createRuleMut = useMutation({
    mutationFn: (data: any) => automationApi.rules.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automation-rules"] }),
  });
  const updateRuleMut = useMutation({
    mutationFn: ({ code, data }: { code: string; data: any }) => automationApi.rules.update(code, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automation-rules"] }),
  });
  const deleteRuleMut = useMutation({
    mutationFn: (code: string) => automationApi.rules.delete(code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automation-rules"] }),
  });

  const mode = searchParams.get("mode") || "list";
  const itemId = searchParams.get("id") || undefined;

  const handleModeChange = (newMode: string, newItemId?: string | number) => {
    const params = new URLSearchParams();
    if (newMode !== "list") {
      params.set("mode", newMode);
      if (newItemId) params.set("id", String(newItemId));
    }
    params.set("tab", activeTab);
    router.push(`/admin/automation?${params.toString()}`);
  };

  // Action columns
  const actionColumns: Column[] = React.useMemo(
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
              <Code className="h-5 w-5 text-primary" />
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
        id: "action_type",
        key: "action_type",
        label: "Type",
        sortable: true,
        render: (value) => (
          <Badge variant="outline">{(value as string).replace("_", " ")}</Badge>
        ),
      },
      {
        id: "sequence",
        key: "sequence",
        label: "Sequence",
        sortable: true,
        render: (value) => <span className="text-sm">{value as number}</span>,
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
    ],
    [],
  );

  // Rule columns
  const ruleColumns: Column[] = React.useMemo(
    () => [
      {
        id: "name",
        key: "name",
        label: "Rule Name",
        sortable: true,
        searchable: true,
        render: (value, item) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10">
              <Zap className="h-5 w-5 text-orange-500" />
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
        id: "trigger",
        key: "trigger",
        label: "Trigger",
        sortable: true,
        render: (value) => {
          const colors: Record<string, string> = {
            on_create: "default",
            on_write: "secondary",
            on_delete: "destructive",
            on_time: "outline",
          };
          return (
            <Badge variant={(colors[value as string] as any) || "outline"}>
              {(value as string).replace("_", " ")}
            </Badge>
          );
        },
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
        id: "sequence",
        key: "sequence",
        label: "Priority",
        sortable: true,
        render: (value) => <span className="text-sm">{value as number}</span>,
      },
    ],
    [],
  );

  const stats = React.useMemo(() => {
    const totalRules = rulesData.length;
    const activeRules = rulesData.filter((r) => r.is_active).length;
    const totalActions = actionsData.length;
    const actionTypes = new Set(actionsData.map((a) => a.action_type)).size;
    return { totalRules, activeRules, totalActions, actionTypes };
  }, [actionsData, rulesData]);

  // API wrappers for actions
  const fetchActionsData = async (): Promise<ServerAction[]> => actionsData;
  const createActionApi = async (data: ServerAction): Promise<ServerAction> =>
    createActionMut.mutateAsync(data as any);
  const updateActionApi = async (id: string | number, data: ServerAction): Promise<ServerAction> => {
    const item = actionsData.find((a) => a.id === Number(id));
    return updateActionMut.mutateAsync({ code: item?.code || String(id), data });
  };
  const deleteActionApi = async (id: string | number): Promise<void> => {
    const item = actionsData.find((a) => a.id === Number(id));
    if (confirm("Delete this server action?")) {
      await deleteActionMut.mutateAsync(item?.code || String(id));
    } else {
      throw new Error("Deletion cancelled");
    }
  };

  // API wrappers for rules
  const fetchRulesData = async (): Promise<AutomationRule[]> => rulesData;
  const createRuleApi = async (data: AutomationRule): Promise<AutomationRule> =>
    createRuleMut.mutateAsync(data as any);
  const updateRuleApi = async (id: string | number, data: AutomationRule): Promise<AutomationRule> => {
    const item = rulesData.find((r) => r.id === Number(id));
    return updateRuleMut.mutateAsync({ code: item?.code || String(id), data });
  };
  const deleteRuleApi = async (id: string | number): Promise<void> => {
    const item = rulesData.find((r) => r.id === Number(id));
    if (confirm("Delete this automation rule?")) {
      await deleteRuleMut.mutateAsync(item?.code || String(id));
    } else {
      throw new Error("Deletion cancelled");
    }
  };

  const error = actionsError || rulesError;
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Failed to load automation data
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {(error as any)?.message || "An error occurred"}
          </p>
        </div>
      </div>
    );
  }

  const actionsConfig = createFormViewConfig<ServerAction>({
    resourceName: "server-action",
    baseUrl: "/admin/automation",
    apiEndpoint: "/api/v1/base/automation/actions",
    title: "Server Actions",
    subtitle: "Manage server-side automation actions",
    formFields: actionFormFields,
    columns: actionColumns,
    validationSchema: actionSchema as any,
    onFetch: fetchActionsData,
    onCreate: createActionApi,
    onUpdate: updateActionApi,
    onDelete: deleteActionApi,
    views: [
      { id: "actions-list", name: "List View", type: "list", columns: actionColumns, filters: {}, sortBy: "name", sortOrder: "asc" },
    ],
    defaultView: "actions-list",
  });

  const rulesConfig = createFormViewConfig<AutomationRule>({
    resourceName: "automation-rule",
    baseUrl: "/admin/automation",
    apiEndpoint: "/api/v1/base/automation/rules",
    title: "Automation Rules",
    subtitle: "Manage event-driven automation rules",
    formFields: ruleFormFields,
    columns: ruleColumns,
    validationSchema: ruleSchema as any,
    onFetch: fetchRulesData,
    onCreate: createRuleApi,
    onUpdate: updateRuleApi,
    onDelete: deleteRuleApi,
    views: [
      { id: "rules-list", name: "List View", type: "list", columns: ruleColumns, filters: {}, sortBy: "name", sortOrder: "asc" },
    ],
    defaultView: "rules-list",
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      {mode === "list" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Rules</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRules}</div>
              <p className="text-xs text-muted-foreground">{stats.activeRules} active</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeRules}</div>
              <p className="text-xs text-muted-foreground">Currently enabled</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
              <Code className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalActions}</div>
              <p className="text-xs text-muted-foreground">Server actions defined</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Action Types</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.actionTypes}</div>
              <p className="text-xs text-muted-foreground">Distinct types in use</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab Switcher */}
      {mode === "list" && (
        <div className="flex gap-2 border-b pb-2">
          <button
            className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
              activeTab === "actions"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("actions")}
          >
            <Code className="h-4 w-4 inline-block mr-2" />
            Server Actions
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
              activeTab === "rules"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("rules")}
          >
            <Zap className="h-4 w-4 inline-block mr-2" />
            Automation Rules
          </button>
        </div>
      )}

      {activeTab === "actions" ? (
        <CommonFormViewManager
          config={actionsConfig}
          mode={mode as any}
          itemId={itemId}
          onModeChange={handleModeChange}
          data={actionsData}
          loading={actionsLoading}
          error={actionsError ? (actionsError as any)?.message || String(actionsError) : null}
          selectable={true}
          selectedItems={selectedActions}
          onSelectionChange={setSelectedActions}
          bulkActions={[
            {
              label: "Delete Selected",
              action: (items: any[]) => {
                if (confirm(`Delete ${items.length} actions?`)) {
                  items.forEach((a) => deleteActionMut.mutate(a.code));
                }
              },
            },
          ]}
        />
      ) : (
        <CommonFormViewManager
          config={rulesConfig}
          mode={mode as any}
          itemId={itemId}
          onModeChange={handleModeChange}
          data={rulesData}
          loading={rulesLoading}
          error={rulesError ? (rulesError as any)?.message || String(rulesError) : null}
          selectable={true}
          selectedItems={selectedRules}
          onSelectionChange={setSelectedRules}
          bulkActions={[
            {
              label: "Delete Selected",
              action: (items: any[]) => {
                if (confirm(`Delete ${items.length} rules?`)) {
                  items.forEach((r) => deleteRuleMut.mutate(r.code));
                }
              },
            },
          ]}
        />
      )}
    </div>
  );
}
