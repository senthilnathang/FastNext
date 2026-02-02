"use client";

import { FileText, Hash, Layout, Tag } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { templatesApi } from "@/lib/api/templates";
import type { TextTemplate } from "@/lib/api/templates";
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

// Template validation schema
const templateSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Template name is required").max(200),
  shortcut: z.string().min(1, "Shortcut is required").max(50),
  content: z.string().min(1, "Content is required"),
  category: z.string().optional().nullable(),
  is_system: z.boolean().default(false),
  is_active: z.boolean().default(true),
  use_count: z.number().optional(),
  user_id: z.number().optional().nullable(),
  company_id: z.number().optional().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional().nullable(),
});

// Form fields configuration
const formFields: FormField<TextTemplate>[] = [
  {
    name: "name",
    label: "Template Name",
    type: "text",
    required: true,
    placeholder: "Enter template name",
    description: "Display name for this template",
  },
  {
    name: "shortcut",
    label: "Shortcut",
    type: "text",
    required: true,
    placeholder: "e.g. /greeting",
    description: "Quick shortcut to expand this template",
  },
  {
    name: "content",
    label: "Content",
    type: "textarea",
    required: true,
    placeholder: "Enter template content...",
    description: "The template text that will be expanded",
  },
  {
    name: "category",
    label: "Category",
    type: "text",
    placeholder: "e.g. Email, Support, Sales",
    description: "Optional category for organizing templates",
  },
  {
    name: "is_active",
    label: "Active",
    type: "checkbox",
    defaultValue: true,
    description: "Whether this template is currently active",
  },
];

export default function TemplatesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [selectedItems, setSelectedItems] = React.useState<any[]>([]);

  const { data: templatesData, isLoading, error } = useQuery({
    queryKey: ["templates"],
    queryFn: () => templatesApi.list(),
  });

  const createTemplate = useMutation({
    mutationFn: (data: any) => templatesApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["templates"] }),
  });

  const updateTemplate = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => templatesApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["templates"] }),
  });

  const deleteTemplate = useMutation({
    mutationFn: (id: number) => templatesApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["templates"] }),
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
    router.push(`/admin/templates?${params.toString()}`);
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
        render: (value, template) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-medium">{value as string}</div>
              {template.shortcut && (
                <div className="text-sm text-muted-foreground font-mono">
                  {template.shortcut}
                </div>
              )}
            </div>
          </div>
        ),
      },
      {
        id: "shortcut",
        key: "shortcut",
        label: "Shortcut",
        sortable: true,
        searchable: true,
        render: (value) => (
          <code className="px-2 py-1 rounded bg-muted text-sm">{value as string}</code>
        ),
      },
      {
        id: "category",
        key: "category",
        label: "Category",
        sortable: true,
        filterable: true,
        render: (value) =>
          value ? (
            <Badge variant="outline">{value as string}</Badge>
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
          ),
      },
      {
        id: "content",
        key: "content",
        label: "Content",
        render: (value) => (
          <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
            {value ? String(value).substring(0, 80) + (String(value).length > 80 ? "..." : "") : "—"}
          </span>
        ),
      },
      {
        id: "use_count",
        key: "use_count",
        label: "Uses",
        sortable: true,
        render: (value) => (
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <span>{value ? String(value) : "0"}</span>
          </div>
        ),
      },
      {
        id: "is_system",
        key: "is_system",
        label: "Type",
        sortable: true,
        filterable: true,
        type: "select",
        filterOptions: [
          { label: "System", value: true },
          { label: "User", value: false },
        ],
        render: (value) => (
          <Badge variant={value ? "secondary" : "outline"}>
            {value ? "System" : "User"}
          </Badge>
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
    ],
    [],
  );

  const templates = React.useMemo(() => templatesData?.items || [], [templatesData]);

  // Calculate statistics
  const stats = React.useMemo(() => {
    const total = templates.length;
    const system = templates.filter((t) => t.is_system).length;
    const user = total - system;
    const categories = new Set(templates.map((t) => t.category).filter(Boolean)).size;

    return { total, system, user, categories };
  }, [templates]);

  // API functions
  const fetchTemplates = async (): Promise<TextTemplate[]> => {
    return templates;
  };

  const createTemplateApi = async (data: TextTemplate): Promise<TextTemplate> => {
    return new Promise((resolve, reject) => {
      createTemplate.mutate(
        { name: data.name, shortcut: data.shortcut, content: data.content, category: data.category || undefined, is_system: data.is_system },
        {
          onSuccess: (result) => resolve(result),
          onError: (error) => reject(new Error(String(error))),
        },
      );
    });
  };

  const updateTemplateApi = async (id: string | number, data: TextTemplate): Promise<TextTemplate> => {
    return new Promise((resolve, reject) => {
      updateTemplate.mutate(
        { id: Number(id), data: { name: data.name, shortcut: data.shortcut, content: data.content, category: data.category || undefined, is_active: data.is_active } },
        {
          onSuccess: (result) => resolve(result),
          onError: (error) => reject(new Error(String(error))),
        },
      );
    });
  };

  const deleteTemplateApi = async (id: string | number): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (confirm("Are you sure you want to delete this template?")) {
        deleteTemplate.mutate(Number(id), {
          onSuccess: () => resolve(),
          onError: (error) => reject(new Error(String(error))),
        });
      } else {
        reject(new Error("Deletion cancelled"));
      }
    });
  };

  const handleExport = (format: string) => {
    console.log(`Exporting templates in ${format} format`);
  };

  const handleImport = () => {
    console.log("Importing templates");
  };

  const bulkActions = [
    {
      label: "Delete Selected",
      action: (items: any[]) => {
        if (confirm(`Delete ${items.length} templates?`)) {
          items.forEach((t) => deleteTemplate.mutate(t.id));
        }
      },
    },
    {
      label: "Activate Selected",
      action: (items: any[]) => {
        items.forEach((t) => {
          if (!t.is_active) {
            updateTemplate.mutate({ id: t.id, data: { ...t, is_active: true } });
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
            Failed to load templates
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {(error as any)?.message || "An error occurred while loading templates"}
          </p>
        </div>
      </div>
    );
  }

  // Create form view configuration
  const config = createFormViewConfig<TextTemplate>({
    resourceName: "template",
    baseUrl: "/admin/templates",
    apiEndpoint: "/api/v1/templates",
    title: "Templates Management",
    subtitle: "Manage email and text templates for quick content expansion",
    formFields,
    columns,
    validationSchema: templateSchema as any,
    onFetch: fetchTemplates,
    onCreate: createTemplateApi,
    onUpdate: updateTemplateApi,
    onDelete: deleteTemplateApi,
    views: [
      {
        id: "templates-card",
        name: "Card View",
        type: "card",
        columns,
        filters: {},
        sortBy: "created_at",
        sortOrder: "desc",
      },
      {
        id: "templates-list",
        name: "List View",
        type: "list",
        columns,
        filters: {},
        sortBy: "created_at",
        sortOrder: "desc",
      },
    ],
    defaultView: "templates-list",
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Statistics Cards - Only show in list mode */}
      {mode === "list" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.system} system, {stats.user} user
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Templates</CardTitle>
              <Layout className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.system}</div>
              <p className="text-xs text-muted-foreground">Built-in templates</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">User Templates</CardTitle>
              <Hash className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.user}</div>
              <p className="text-xs text-muted-foreground">Custom user templates</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <Tag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.categories}</div>
              <p className="text-xs text-muted-foreground">Unique categories</p>
            </CardContent>
          </Card>
        </div>
      )}

      <CommonFormViewManager
        config={config}
        mode={mode as any}
        itemId={itemId}
        onModeChange={handleModeChange}
        data={templates}
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
