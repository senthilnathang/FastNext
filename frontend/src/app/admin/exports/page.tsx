"use client";

import { Download, FileArchive, History, Upload } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { exportsApi } from "@/lib/api/exports";
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

// Types
interface ExportEntry {
  id?: string;
  module_name: string;
  type: string;
  file_path: string;
  status: string;
  created_at?: string | null;
}

interface ImportEntry {
  id?: string;
  module_name: string;
  file_name: string;
  status: string;
  created_at?: string | null;
}

interface ExportTemplate {
  id?: string;
  code: string;
  name: string;
  model_name: string;
  fields?: string[] | string | null;
  filters?: Record<string, unknown> | string | null;
  format: string;
  created_at?: string | null;
  updated_at?: string | null;
}

// Export template validation schema
const exportTemplateSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1, "Template code is required").max(100),
  name: z.string().min(1, "Template name is required").max(200),
  model_name: z.string().min(1, "Model name is required").max(200),
  fields: z.string().optional().nullable(),
  filters: z.string().optional().nullable(),
  format: z.string().min(1, "Format is required").default("csv"),
  created_at: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
});

// Export template form fields
const templateFormFields: FormField<ExportTemplate>[] = [
  {
    name: "code",
    label: "Template Code",
    type: "text",
    required: true,
    placeholder: "e.g. export_partners_csv",
    description: "Unique code identifier for this template",
  },
  {
    name: "name",
    label: "Template Name",
    type: "text",
    required: true,
    placeholder: "e.g. Partner Export (CSV)",
    description: "Display name for this export template",
  },
  {
    name: "model_name",
    label: "Model Name",
    type: "text",
    required: true,
    placeholder: "e.g. res.partner, sale.order",
    description: "The model to export data from",
  },
  {
    name: "fields",
    label: "Fields",
    type: "textarea",
    placeholder: "name, email, phone, company_name",
    description: "Comma-separated field names to include in the export",
  },
  {
    name: "filters",
    label: "Filters",
    type: "textarea",
    placeholder: '[["is_active", "=", true]]',
    description: "JSON filter expression to limit exported records",
  },
  {
    name: "format",
    label: "Format",
    type: "select",
    required: true,
    options: [
      { label: "CSV", value: "csv" },
      { label: "JSON", value: "json" },
      { label: "XLSX", value: "xlsx" },
    ],
    defaultValue: "csv",
    description: "Output format for the export",
  },
];

export default function ExportsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [selectedItems, setSelectedItems] = React.useState<any[]>([]);
  const [activeTab, setActiveTab] = React.useState<"exports" | "imports" | "templates">("exports");

  // Queries
  const { data: exportsData, isLoading: exportsLoading, error: exportsError } = useQuery({
    queryKey: ["export-history"],
    queryFn: () => exportsApi.getHistory(),
  });

  const { data: importsData, isLoading: importsLoading } = useQuery({
    queryKey: ["import-history"],
    queryFn: () => exportsApi.imports.list(),
  });

  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: ["export-templates"],
    queryFn: () => exportsApi.templates.list(),
  });

  // Mutations
  const exportModule = useMutation({
    mutationFn: (moduleName: string) => exportsApi.exportModule(moduleName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["export-history"] }),
  });

  const executeImport = useMutation({
    mutationFn: (id: number) => exportsApi.imports.execute(String(id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["import-history"] }),
  });

  const rollbackImport = useMutation({
    mutationFn: (id: number) => exportsApi.imports.rollback(String(id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["import-history"] }),
  });

  const createTemplate = useMutation({
    mutationFn: (data: any) => exportsApi.templates.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["export-templates"] }),
  });

  const updateTemplate = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => exportsApi.templates.create({ ...data, code: data.code || String(id) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["export-templates"] }),
  });

  const deleteTemplate = useMutation({
    mutationFn: (id: number) => exportsApi.templates.delete(String(id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["export-templates"] }),
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
    router.push(`/admin/exports?${params.toString()}`);
  };

  // Export history columns
  const exportColumns: Column[] = React.useMemo(
    () => [
      {
        id: "module_name",
        key: "module_name",
        label: "Module",
        sortable: true,
        searchable: true,
        render: (value) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <div className="font-medium">{value as string}</div>
          </div>
        ),
      },
      {
        id: "type",
        key: "type",
        label: "Type",
        sortable: true,
        render: (value) => (
          <Badge variant="outline">{value as string}</Badge>
        ),
      },
      {
        id: "file_path",
        key: "file_path",
        label: "File",
        render: (value) => (
          <span className="text-sm font-mono truncate max-w-[200px] block" title={value as string}>
            {value ? String(value).split("/").pop() : "\u2014"}
          </span>
        ),
      },
      {
        id: "status",
        key: "status",
        label: "Status",
        sortable: true,
        filterable: true,
        render: (value) => {
          const variant = value === "completed" ? "default" : value === "failed" ? "destructive" : "secondary";
          return <Badge variant={variant}>{value as string}</Badge>;
        },
      },
      {
        id: "created_at",
        key: "created_at",
        label: "Created",
        sortable: true,
        render: (value) => (
          <span className="text-sm text-muted-foreground">
            {value ? new Date(value as string).toLocaleString() : "\u2014"}
          </span>
        ),
      },
    ],
    [],
  );

  // Import history columns
  const importColumns: Column[] = React.useMemo(
    () => [
      {
        id: "module_name",
        key: "module_name",
        label: "Module",
        sortable: true,
        searchable: true,
        render: (value) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
              <Upload className="h-5 w-5 text-blue-600" />
            </div>
            <div className="font-medium">{value as string}</div>
          </div>
        ),
      },
      {
        id: "file_name",
        key: "file_name",
        label: "File",
        searchable: true,
        render: (value) => (
          <span className="text-sm font-mono">{value as string}</span>
        ),
      },
      {
        id: "status",
        key: "status",
        label: "Status",
        sortable: true,
        filterable: true,
        render: (value) => {
          const variant = value === "completed" ? "default" : value === "failed" ? "destructive" : value === "pending" ? "secondary" : "outline";
          return <Badge variant={variant}>{value as string}</Badge>;
        },
      },
      {
        id: "created_at",
        key: "created_at",
        label: "Created",
        sortable: true,
        render: (value) => (
          <span className="text-sm text-muted-foreground">
            {value ? new Date(value as string).toLocaleString() : "\u2014"}
          </span>
        ),
      },
      {
        id: "actions",
        key: "id",
        label: "Actions",
        render: (value, item) => (
          <div className="flex items-center gap-2">
            {item.status === "pending" && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  executeImport.mutate(value as number);
                }}
                disabled={executeImport.isPending}
              >
                Execute
              </Button>
            )}
            {(item.status === "completed" || item.status === "pending") && (
              <Button
                variant="destructive"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Are you sure you want to rollback this import?")) {
                    rollbackImport.mutate(value as number);
                  }
                }}
                disabled={rollbackImport.isPending}
              >
                Rollback
              </Button>
            )}
          </div>
        ),
      },
    ],
    [executeImport.isPending, rollbackImport.isPending],
  );

  // Export template columns
  const templateColumns: Column[] = React.useMemo(
    () => [
      {
        id: "code",
        key: "code",
        label: "Code",
        sortable: true,
        searchable: true,
        render: (value) => (
          <code className="px-2 py-1 rounded bg-muted text-sm">{value as string}</code>
        ),
      },
      {
        id: "name",
        key: "name",
        label: "Name",
        sortable: true,
        searchable: true,
        render: (value) => (
          <div className="flex items-center gap-3">
            <FileArchive className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{value as string}</span>
          </div>
        ),
      },
      {
        id: "model_name",
        key: "model_name",
        label: "Model",
        sortable: true,
        render: (value) => (
          <Badge variant="secondary">{value as string}</Badge>
        ),
      },
      {
        id: "format",
        key: "format",
        label: "Format",
        sortable: true,
        render: (value) => (
          <Badge variant="outline" className="uppercase text-xs">{value as string}</Badge>
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

  // Data extraction
  const exports = React.useMemo(() => {
    if (Array.isArray(exportsData)) return exportsData;
    return (exportsData as any)?.items || [];
  }, [exportsData]);

  const imports = React.useMemo(() => {
    if (Array.isArray(importsData)) return importsData;
    return (importsData as any)?.items || [];
  }, [importsData]);

  const templates = React.useMemo(() => {
    if (Array.isArray(templatesData)) return templatesData;
    return (templatesData as any)?.items || [];
  }, [templatesData]);

  // Calculate statistics
  const stats = React.useMemo(() => {
    const totalExports = exports.length;
    const totalImports = imports.length;
    const totalTemplates = templates.length;
    const pendingImports = imports.filter((i: ImportEntry) => i.status === "pending").length;

    return { totalExports, totalImports, totalTemplates, pendingImports };
  }, [exports, imports, templates]);

  // Template API functions for CommonFormViewManager
  const fetchTemplates = async (): Promise<ExportTemplate[]> => {
    return templates;
  };

  const createTemplateApi = async (data: ExportTemplate): Promise<ExportTemplate> => {
    return new Promise((resolve, reject) => {
      createTemplate.mutate(
        {
          code: data.code,
          name: data.name,
          model_name: data.model_name,
          fields: data.fields || undefined,
          filters: data.filters || undefined,
          format: data.format || "csv",
        },
        {
          onSuccess: (result) => resolve(result as unknown as ExportTemplate),
          onError: (error) => reject(new Error(String(error))),
        },
      );
    });
  };

  const updateTemplateApi = async (id: string | number, data: ExportTemplate): Promise<ExportTemplate> => {
    return new Promise((resolve, reject) => {
      updateTemplate.mutate(
        {
          id: Number(id),
          data: {
            code: data.code,
            name: data.name,
            model_name: data.model_name,
            fields: data.fields || undefined,
            filters: data.filters || undefined,
            format: data.format,
          },
        },
        {
          onSuccess: (result) => resolve(result as unknown as ExportTemplate),
          onError: (error) => reject(new Error(String(error))),
        },
      );
    });
  };

  const deleteTemplateApi = async (id: string | number): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (confirm("Are you sure you want to delete this export template?")) {
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
    console.log(`Exporting data in ${format} format`);
  };

  const handleImport = () => {
    console.log("Importing data");
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
  ];

  if (exportsError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Failed to load export data
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {(exportsError as any)?.message || "An error occurred while loading exports"}
          </p>
        </div>
      </div>
    );
  }

  // Configs for each tab
  const exportConfig = createFormViewConfig<ExportEntry>({
    resourceName: "export",
    baseUrl: "/admin/exports",
    apiEndpoint: "/api/v1/base/exports",
    title: "Export History",
    subtitle: "View and manage module export records",
    formFields: [],
    columns: exportColumns,
    validationSchema: z.object({}) as any,
    onFetch: async () => exports,
    views: [
      {
        id: "exports-list",
        name: "List View",
        type: "list",
        columns: exportColumns,
        filters: {},
        sortBy: "created_at",
        sortOrder: "desc",
      },
    ],
    defaultView: "exports-list",
  });

  const importConfig = createFormViewConfig<ImportEntry>({
    resourceName: "import",
    baseUrl: "/admin/exports",
    apiEndpoint: "/api/v1/base/imports",
    title: "Import History",
    subtitle: "View and manage module import records",
    formFields: [],
    columns: importColumns,
    validationSchema: z.object({}) as any,
    onFetch: async () => imports,
    views: [
      {
        id: "imports-list",
        name: "List View",
        type: "list",
        columns: importColumns,
        filters: {},
        sortBy: "created_at",
        sortOrder: "desc",
      },
    ],
    defaultView: "imports-list",
  });

  const templateConfig = createFormViewConfig<ExportTemplate>({
    resourceName: "export-template",
    baseUrl: "/admin/exports",
    apiEndpoint: "/api/v1/base/export-templates",
    title: "Export Templates",
    subtitle: "Create and manage reusable export configurations",
    formFields: templateFormFields,
    columns: templateColumns,
    validationSchema: exportTemplateSchema as any,
    onFetch: fetchTemplates,
    onCreate: createTemplateApi,
    onUpdate: updateTemplateApi,
    onDelete: deleteTemplateApi,
    views: [
      {
        id: "templates-card",
        name: "Card View",
        type: "card",
        columns: templateColumns,
        filters: {},
        sortBy: "created_at",
        sortOrder: "desc",
      },
      {
        id: "templates-list",
        name: "List View",
        type: "list",
        columns: templateColumns,
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
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Exports</CardTitle>
                <Download className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalExports}</div>
                <p className="text-xs text-muted-foreground">Export records</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Imports</CardTitle>
                <Upload className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalImports}</div>
                <p className="text-xs text-muted-foreground">Import records</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Export Templates</CardTitle>
                <FileArchive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalTemplates}</div>
                <p className="text-xs text-muted-foreground">Reusable templates</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Imports</CardTitle>
                <History className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-500">{stats.pendingImports}</div>
                <p className="text-xs text-muted-foreground">Awaiting execution</p>
              </CardContent>
            </Card>
          </div>

          {/* Action buttons toolbar */}
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                const moduleName = prompt("Enter module name to export:");
                if (moduleName) exportModule.mutate(moduleName);
              }}
              disabled={exportModule.isPending}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Module
            </Button>
          </div>

          {/* Tab switcher */}
          <div className="flex border-b">
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "exports"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("exports")}
            >
              Export History ({stats.totalExports})
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "imports"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("imports")}
            >
              Import History ({stats.totalImports})
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "templates"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("templates")}
            >
              Export Templates ({stats.totalTemplates})
            </button>
          </div>
        </>
      )}

      {activeTab === "exports" && (
        <CommonFormViewManager
          config={exportConfig}
          mode={mode as any}
          itemId={itemId}
          onModeChange={handleModeChange}
          data={exports}
          loading={exportsLoading}
          error={exportsError ? (exportsError as any)?.message || String(exportsError) : null}
          selectable={false}
          selectedItems={[]}
          onSelectionChange={() => {}}
        />
      )}

      {activeTab === "imports" && (
        <CommonFormViewManager
          config={importConfig}
          mode="list"
          onModeChange={() => {}}
          data={imports}
          loading={importsLoading}
          error={null}
          selectable={false}
          selectedItems={[]}
          onSelectionChange={() => {}}
        />
      )}

      {activeTab === "templates" && (
        <CommonFormViewManager
          config={templateConfig}
          mode={mode as any}
          itemId={itemId}
          onModeChange={handleModeChange}
          data={templates}
          loading={templatesLoading}
          error={null}
          selectable={true}
          selectedItems={selectedItems}
          onSelectionChange={setSelectedItems}
          bulkActions={bulkActions}
          onExport={handleExport}
          onImport={handleImport}
        />
      )}
    </div>
  );
}
