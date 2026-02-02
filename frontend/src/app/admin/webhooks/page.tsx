"use client";

import { AlertCircle, CheckCircle, Globe, Send, Webhook } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { webhooksApi } from "@/lib/api/webhooks";
import type { Webhook as WebhookType } from "@/lib/api/webhooks";
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

// Webhook validation schema
const webhookSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Webhook name is required").max(200),
  code: z.string().optional().default(""),
  description: z.string().optional().nullable(),
  module_name: z.string().optional().nullable(),
  url: z.string().url("Must be a valid URL"),
  method: z.string().optional().default("POST"),
  headers: z.record(z.string(), z.string()).optional(),
  content_type: z.string().optional().default("application/json"),
  auth_type: z.string().optional().default("none"),
  auth_username: z.string().optional().nullable(),
  auth_token: z.string().optional().nullable(),
  auth_header_name: z.string().optional().nullable(),
  secret_key: z.string().optional().nullable(),
  signature_header: z.string().optional().nullable(),
  events: z.array(z.string()).default([]),
  model_name: z.string().optional().nullable(),
  filter_domain: z.array(z.any()).optional(),
  payload_template: z.string().optional().nullable(),
  include_record: z.boolean().optional().default(true),
  include_changes: z.boolean().optional().default(false),
  max_retries: z.number().min(0).max(10).default(3),
  retry_delay: z.number().optional().default(60),
  retry_backoff: z.number().optional().default(2),
  timeout: z.number().optional().default(30),
  is_active: z.boolean().default(true),
  company_id: z.number().optional().nullable(),
  created_at: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
});

// Form fields configuration
const formFields: FormField<WebhookType>[] = [
  {
    name: "name",
    label: "Webhook Name",
    type: "text",
    required: true,
    placeholder: "Enter webhook name",
    description: "Display name for this webhook",
  },
  {
    name: "url",
    label: "URL",
    type: "text",
    required: true,
    placeholder: "https://example.com/webhook",
    description: "The endpoint URL to send webhook payloads to",
  },
  {
    name: "events",
    label: "Events",
    type: "textarea",
    required: true,
    placeholder: "create, update, delete",
    description: "Comma-separated list of events to trigger on (e.g. create, update, delete, workflow_change)",
  },
  {
    name: "secret_key",
    label: "Secret Key",
    type: "text",
    placeholder: "Optional secret for payload signing",
    description: "Used to sign webhook payloads for verification",
  },
  {
    name: "is_active",
    label: "Active",
    type: "checkbox",
    defaultValue: true,
    description: "Whether this webhook is currently active",
  },
  {
    name: "max_retries",
    label: "Max Retries",
    type: "number",
    defaultValue: 3,
    placeholder: "3",
    description: "Maximum number of retry attempts on failure (0-10)",
  },
];

export default function WebhooksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [selectedItems, setSelectedItems] = React.useState<any[]>([]);

  const { data: webhooksData, isLoading, error } = useQuery({
    queryKey: ["webhooks"],
    queryFn: () => webhooksApi.list(),
  });

  const createWebhook = useMutation({
    mutationFn: (data: any) => webhooksApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["webhooks"] }),
  });

  const updateWebhook = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => webhooksApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["webhooks"] }),
  });

  const deleteWebhook = useMutation({
    mutationFn: (id: number) => webhooksApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["webhooks"] }),
  });

  const testWebhook = useMutation({
    mutationFn: (id: number) => webhooksApi.test(id),
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
    router.push(`/admin/webhooks?${params.toString()}`);
  };

  const handleTestWebhook = (id: number) => {
    testWebhook.mutate(id, {
      onSuccess: (result) => {
        if (result.success) {
          alert(`Webhook test successful! Status: ${result.status_code}, Duration: ${result.duration_ms}ms`);
        } else {
          alert(`Webhook test failed: ${result.error || "Unknown error"}`);
        }
      },
      onError: (err) => {
        alert(`Webhook test error: ${String(err)}`);
      },
    });
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
        render: (value, webhook) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Webhook className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-medium">{value as string}</div>
              {webhook.description && (
                <div className="text-sm text-muted-foreground">
                  {webhook.description}
                </div>
              )}
            </div>
          </div>
        ),
      },
      {
        id: "url",
        key: "url",
        label: "URL",
        searchable: true,
        render: (value) => (
          <span className="text-sm font-mono truncate max-w-[250px] block" title={value as string}>
            {value ? String(value).substring(0, 50) + (String(value).length > 50 ? "..." : "") : "—"}
          </span>
        ),
      },
      {
        id: "events",
        key: "events",
        label: "Events",
        render: (value) => (
          <div className="flex flex-wrap gap-1">
            {Array.isArray(value) && value.length > 0 ? (
              (value as string[]).map((event) => (
                <Badge key={event} variant="outline" className="text-xs">
                  {event}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground text-sm">—</span>
            )}
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
        id: "last_triggered_at",
        key: "updated_at",
        label: "Last Triggered",
        sortable: true,
        render: (value) => (
          <span className="text-sm text-muted-foreground">
            {value
              ? formatDistanceToNow(new Date(value as string), { addSuffix: true })
              : "Never"}
          </span>
        ),
      },
      {
        id: "max_retries",
        key: "max_retries",
        label: "Max Retries",
        sortable: true,
        render: (value) => (
          <span className="text-sm">{value !== undefined ? String(value) : "3"}</span>
        ),
      },
      {
        id: "actions",
        key: "id",
        label: "Test",
        render: (value) => (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleTestWebhook(value as number);
            }}
            disabled={testWebhook.isPending}
          >
            <Send className="h-3 w-3 mr-1" />
            Test
          </Button>
        ),
      },
    ],
    [testWebhook.isPending],
  );

  const webhooks = React.useMemo(() => {
    if (Array.isArray(webhooksData)) return webhooksData;
    return (webhooksData as any)?.items || [];
  }, [webhooksData]);

  // Calculate statistics
  const stats = React.useMemo(() => {
    const total = webhooks.length;
    const active = webhooks.filter((w: WebhookType) => w.is_active).length;
    const inactive = total - active;
    const failed = 0; // Would need log data to determine last_status

    return { total, active, inactive, failed };
  }, [webhooks]);

  // API functions
  const fetchWebhooks = async (): Promise<WebhookType[]> => {
    return webhooks;
  };

  const createWebhookApi = async (data: WebhookType): Promise<WebhookType> => {
    return new Promise((resolve, reject) => {
      // Parse events from textarea (comma-separated) if it's a string
      const events = typeof data.events === "string"
        ? (data.events as unknown as string).split(",").map((e: string) => e.trim()).filter(Boolean)
        : data.events || [];

      createWebhook.mutate(
        {
          name: data.name,
          code: data.code || data.name.toLowerCase().replace(/\s+/g, "_"),
          url: data.url,
          events,
          secret_key: data.secret_key || undefined,
          is_active: data.is_active,
          max_retries: data.max_retries ?? 3,
        },
        {
          onSuccess: (result) => resolve(result),
          onError: (error) => reject(new Error(String(error))),
        },
      );
    });
  };

  const updateWebhookApi = async (id: string | number, data: WebhookType): Promise<WebhookType> => {
    return new Promise((resolve, reject) => {
      const events = typeof data.events === "string"
        ? (data.events as unknown as string).split(",").map((e: string) => e.trim()).filter(Boolean)
        : data.events || [];

      updateWebhook.mutate(
        {
          id: Number(id),
          data: {
            name: data.name,
            url: data.url,
            events,
            secret_key: data.secret_key || undefined,
            is_active: data.is_active,
            max_retries: data.max_retries,
          },
        },
        {
          onSuccess: (result) => resolve(result),
          onError: (error) => reject(new Error(String(error))),
        },
      );
    });
  };

  const deleteWebhookApi = async (id: string | number): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (confirm("Are you sure you want to delete this webhook?")) {
        deleteWebhook.mutate(Number(id), {
          onSuccess: () => resolve(),
          onError: (error) => reject(new Error(String(error))),
        });
      } else {
        reject(new Error("Deletion cancelled"));
      }
    });
  };

  const handleExport = (format: string) => {
    console.log(`Exporting webhooks in ${format} format`);
  };

  const handleImport = () => {
    console.log("Importing webhooks");
  };

  const bulkActions = [
    {
      label: "Delete Selected",
      action: (items: any[]) => {
        if (confirm(`Delete ${items.length} webhooks?`)) {
          items.forEach((w) => deleteWebhook.mutate(w.id));
        }
      },
    },
    {
      label: "Activate Selected",
      action: (items: any[]) => {
        items.forEach((w) => {
          if (!w.is_active) {
            updateWebhook.mutate({ id: w.id, data: { ...w, is_active: true } });
          }
        });
      },
    },
    {
      label: "Deactivate Selected",
      action: (items: any[]) => {
        items.forEach((w) => {
          if (w.is_active) {
            updateWebhook.mutate({ id: w.id, data: { ...w, is_active: false } });
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
            Failed to load webhooks
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {(error as any)?.message || "An error occurred while loading webhooks"}
          </p>
        </div>
      </div>
    );
  }

  // Create form view configuration
  const config = createFormViewConfig<WebhookType>({
    resourceName: "webhook",
    baseUrl: "/admin/webhooks",
    apiEndpoint: "/api/v1/base/webhooks",
    title: "Webhooks Management",
    subtitle: "Configure and manage webhook integrations for event notifications",
    formFields,
    columns,
    validationSchema: webhookSchema as any,
    onFetch: fetchWebhooks,
    onCreate: createWebhookApi,
    onUpdate: updateWebhookApi,
    onDelete: deleteWebhookApi,
    views: [
      {
        id: "webhooks-card",
        name: "Card View",
        type: "card",
        columns,
        filters: {},
        sortBy: "created_at",
        sortOrder: "desc",
      },
      {
        id: "webhooks-list",
        name: "List View",
        type: "list",
        columns,
        filters: {},
        sortBy: "created_at",
        sortOrder: "desc",
      },
    ],
    defaultView: "webhooks-list",
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Statistics Cards - Only show in list mode */}
      {mode === "list" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Webhooks</CardTitle>
              <Webhook className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.active} active, {stats.inactive} inactive
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <p className="text-xs text-muted-foreground">Currently listening</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactive</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inactive}</div>
              <p className="text-xs text-muted-foreground">Paused webhooks</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats.failed}</div>
              <p className="text-xs text-muted-foreground">Last delivery errors</p>
            </CardContent>
          </Card>
        </div>
      )}

      <CommonFormViewManager
        config={config}
        mode={mode as any}
        itemId={itemId}
        onModeChange={handleModeChange}
        data={webhooks}
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
