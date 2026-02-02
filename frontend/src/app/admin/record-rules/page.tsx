"use client";

import { Database, Lock, Shield, Users } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { recordRulesApi } from "@/lib/api/record-rules";
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

// Record rule type
interface RecordRule {
  id?: number;
  name: string;
  model_name: string;
  domain_filter?: string | null;
  groups?: string | null;
  perm_read: boolean;
  perm_write: boolean;
  perm_create: boolean;
  perm_unlink: boolean;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

// Record rule validation schema
const recordRuleSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Rule name is required").max(200),
  model_name: z.string().min(1, "Model name is required").max(200),
  domain_filter: z.string().optional().nullable(),
  groups: z.string().optional().nullable(),
  perm_read: z.boolean().default(true),
  perm_write: z.boolean().default(false),
  perm_create: z.boolean().default(false),
  perm_unlink: z.boolean().default(false),
  is_active: z.boolean().default(true),
  created_at: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
});

// Form fields configuration
const formFields: FormField<RecordRule>[] = [
  {
    name: "name",
    label: "Rule Name",
    type: "text",
    required: true,
    placeholder: "Enter rule name",
    description: "Display name for this record rule",
  },
  {
    name: "model_name",
    label: "Model Name",
    type: "text",
    required: true,
    placeholder: "e.g. res.partner, sale.order",
    description: "The model this rule applies to",
  },
  {
    name: "domain_filter",
    label: "Domain Filter",
    type: "textarea",
    placeholder: '[["user_id", "=", uid]]',
    description: "JSON domain filter expression for row-level filtering",
  },
  {
    name: "groups",
    label: "Groups",
    type: "text",
    placeholder: "e.g. 1, 2, 5",
    description: "Comma-separated group IDs this rule applies to",
  },
  {
    name: "perm_read",
    label: "Read Permission",
    type: "checkbox",
    defaultValue: true,
    description: "Apply this rule to read operations",
  },
  {
    name: "perm_write",
    label: "Write Permission",
    type: "checkbox",
    defaultValue: false,
    description: "Apply this rule to write operations",
  },
  {
    name: "perm_create",
    label: "Create Permission",
    type: "checkbox",
    defaultValue: false,
    description: "Apply this rule to create operations",
  },
  {
    name: "perm_unlink",
    label: "Delete Permission",
    type: "checkbox",
    defaultValue: false,
    description: "Apply this rule to delete operations",
  },
  {
    name: "is_active",
    label: "Active",
    type: "checkbox",
    defaultValue: true,
    description: "Whether this record rule is currently active",
  },
];

export default function RecordRulesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [selectedItems, setSelectedItems] = React.useState<any[]>([]);

  const { data: rulesData, isLoading, error } = useQuery({
    queryKey: ["record-rules"],
    queryFn: () => recordRulesApi.list(),
  });

  const createRule = useMutation({
    mutationFn: (data: any) => recordRulesApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["record-rules"] }),
  });

  const updateRule = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => recordRulesApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["record-rules"] }),
  });

  const deleteRule = useMutation({
    mutationFn: (id: number) => recordRulesApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["record-rules"] }),
  });

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
    router.push(`/admin/record-rules?${params.toString()}`);
  };

  // Define columns for the ViewManager
  const columns: Column[] = React.useMemo(
    () => [
      {
        id: "name",
        key: "name",
        label: "Name",
        sortable: true,
        searchable: true,
        render: (value, rule) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-medium">{value as string}</div>
              <div className="text-sm text-muted-foreground">{rule.model_name}</div>
            </div>
          </div>
        ),
      },
      {
        id: "model_name",
        key: "model_name",
        label: "Model",
        sortable: true,
        searchable: true,
        render: (value) => (
          <code className="px-2 py-1 rounded bg-muted text-sm">{value as string}</code>
        ),
      },
      {
        id: "groups",
        key: "groups",
        label: "Groups",
        render: (value) => (
          <div className="flex flex-wrap gap-1">
            {value ? (
              String(value).split(",").map((g: string) => g.trim()).filter(Boolean).map((group: string) => (
                <Badge key={group} variant="outline" className="text-xs">
                  {group}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground text-sm">Global</span>
            )}
          </div>
        ),
      },
      {
        id: "perm_read",
        key: "perm_read",
        label: "Read",
        render: (value) => (
          <span className={value ? "text-green-600" : "text-muted-foreground"}>
            {value ? "\u2713" : "\u2717"}
          </span>
        ),
      },
      {
        id: "perm_write",
        key: "perm_write",
        label: "Write",
        render: (value) => (
          <span className={value ? "text-green-600" : "text-muted-foreground"}>
            {value ? "\u2713" : "\u2717"}
          </span>
        ),
      },
      {
        id: "perm_create",
        key: "perm_create",
        label: "Create",
        render: (value) => (
          <span className={value ? "text-green-600" : "text-muted-foreground"}>
            {value ? "\u2713" : "\u2717"}
          </span>
        ),
      },
      {
        id: "perm_unlink",
        key: "perm_unlink",
        label: "Delete",
        render: (value) => (
          <span className={value ? "text-green-600" : "text-muted-foreground"}>
            {value ? "\u2713" : "\u2717"}
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
          <span className="text-sm text-muted-foreground">
            {value ? new Date(value as string).toLocaleDateString() : "\u2014"}
          </span>
        ),
      },
    ],
    [],
  );

  const rules = React.useMemo(() => {
    if (Array.isArray(rulesData)) return rulesData;
    return (rulesData as any)?.items || [];
  }, [rulesData]);

  // Calculate statistics
  const stats = React.useMemo(() => {
    const total = rules.length;
    const active = rules.filter((r: RecordRule) => r.is_active).length;
    const models = new Set(rules.map((r: RecordRule) => r.model_name)).size;
    const groups = new Set(
      rules
        .flatMap((r: RecordRule) =>
          r.groups ? String(r.groups).split(",").map((g: string) => g.trim()) : []
        )
        .filter(Boolean)
    ).size;

    return { total, active, models, groups };
  }, [rules]);

  // API functions
  const fetchRules = async (): Promise<RecordRule[]> => {
    return rules;
  };

  const createRuleApi = async (data: RecordRule): Promise<RecordRule> => {
    return new Promise((resolve, reject) => {
      createRule.mutate(
        {
          name: data.name,
          model_name: data.model_name,
          domain_filter: data.domain_filter || undefined,
          groups: data.groups || undefined,
          perm_read: data.perm_read ?? true,
          perm_write: data.perm_write ?? false,
          perm_create: data.perm_create ?? false,
          perm_unlink: data.perm_unlink ?? false,
          is_active: data.is_active ?? true,
        },
        {
          onSuccess: (result) => resolve(result as unknown as RecordRule),
          onError: (error) => reject(new Error(String(error))),
        },
      );
    });
  };

  const updateRuleApi = async (id: string | number, data: RecordRule): Promise<RecordRule> => {
    return new Promise((resolve, reject) => {
      updateRule.mutate(
        {
          id: Number(id),
          data: {
            name: data.name,
            model_name: data.model_name,
            domain_filter: data.domain_filter || undefined,
            groups: data.groups || undefined,
            perm_read: data.perm_read,
            perm_write: data.perm_write,
            perm_create: data.perm_create,
            perm_unlink: data.perm_unlink,
            is_active: data.is_active,
          },
        },
        {
          onSuccess: (result) => resolve(result as unknown as RecordRule),
          onError: (error) => reject(new Error(String(error))),
        },
      );
    });
  };

  const deleteRuleApi = async (id: string | number): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (confirm("Are you sure you want to delete this record rule?")) {
        deleteRule.mutate(Number(id), {
          onSuccess: () => resolve(),
          onError: (error) => reject(new Error(String(error))),
        });
      } else {
        reject(new Error("Deletion cancelled"));
      }
    });
  };

  const handleExport = (format: string) => {
    console.log(`Exporting record rules in ${format} format`);
  };

  const handleImport = () => {
    console.log("Importing record rules");
  };

  const bulkActions = [
    {
      label: "Delete Selected",
      action: (items: any[]) => {
        if (confirm(`Delete ${items.length} record rules?`)) {
          items.forEach((r) => deleteRule.mutate(r.id));
        }
      },
    },
    {
      label: "Activate Selected",
      action: (items: any[]) => {
        items.forEach((r) => {
          if (!r.is_active) {
            updateRule.mutate({ id: r.id, data: { ...r, is_active: true } });
          }
        });
      },
    },
    {
      label: "Deactivate Selected",
      action: (items: any[]) => {
        items.forEach((r) => {
          if (r.is_active) {
            updateRule.mutate({ id: r.id, data: { ...r, is_active: false } });
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
            Failed to load record rules
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {(error as any)?.message || "An error occurred while loading record rules"}
          </p>
        </div>
      </div>
    );
  }

  // Create form view configuration
  const config = createFormViewConfig<RecordRule>({
    resourceName: "record-rule",
    baseUrl: "/admin/record-rules",
    apiEndpoint: "/api/v1/base/record-rules",
    title: "Record Rules Management",
    subtitle: "Configure row-level security rules to control data access per model and group",
    formFields,
    columns,
    validationSchema: recordRuleSchema as any,
    onFetch: fetchRules,
    onCreate: createRuleApi,
    onUpdate: updateRuleApi,
    onDelete: deleteRuleApi,
    views: [
      {
        id: "record-rules-card",
        name: "Card View",
        type: "card",
        columns,
        filters: {},
        sortBy: "created_at",
        sortOrder: "desc",
      },
      {
        id: "record-rules-list",
        name: "List View",
        type: "list",
        columns,
        filters: {},
        sortBy: "created_at",
        sortOrder: "desc",
      },
    ],
    defaultView: "record-rules-list",
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Statistics Cards - Only show in list mode */}
      {mode === "list" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Rules</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.active} active, {stats.total - stats.active} inactive
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
              <Lock className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <p className="text-xs text-muted-foreground">Currently enforced</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Models Covered</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.models}</div>
              <p className="text-xs text-muted-foreground">Unique models with rules</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Groups Assigned</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.groups}</div>
              <p className="text-xs text-muted-foreground">Distinct groups referenced</p>
            </CardContent>
          </Card>
        </div>
      )}

      <CommonFormViewManager
        config={config}
        mode={mode as any}
        itemId={itemId}
        onModeChange={handleModeChange}
        data={rules}
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
