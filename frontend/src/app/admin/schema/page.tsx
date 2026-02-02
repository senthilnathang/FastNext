"use client";

import { AlertCircle, CheckCircle, Database, RefreshCw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { schemaApi } from "@/lib/api/schema";
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

// Schema status type
interface SchemaStatus {
  id?: number;
  module_name: string;
  is_synced: boolean;
  pending_changes: number;
  last_sync?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

// Migration history type
interface MigrationEntry {
  id?: number;
  module_name: string;
  description: string;
  applied_at: string;
  checksum: string;
}

// Schema validation schema (minimal, since this page is read-heavy)
const schemaStatusSchema = z.object({
  id: z.number().optional(),
  module_name: z.string().min(1, "Module name is required"),
  is_synced: z.boolean().default(false),
  pending_changes: z.number().default(0),
  last_sync: z.string().optional().nullable(),
  created_at: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
});

// Form fields configuration (minimal for this read-heavy page)
const formFields: FormField<SchemaStatus>[] = [
  {
    name: "module_name",
    label: "Module Name",
    type: "text",
    required: true,
    placeholder: "e.g. base, crm, sales",
    description: "The module to manage schema for",
  },
];

export default function SchemaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [selectedItems, setSelectedItems] = React.useState<any[]>([]);
  const [activeTab, setActiveTab] = React.useState<"status" | "migrations">("status");

  const { data: schemaData, isLoading, error } = useQuery({
    queryKey: ["schema-status"],
    queryFn: () => schemaApi.checkAll(),
  });

  const { data: migrationsData, isLoading: migrationsLoading } = useQuery({
    queryKey: ["schema-migrations"],
    queryFn: () => schemaApi.getAllMigrations(),
  });

  const syncModule = useMutation({
    mutationFn: (moduleName: string) => schemaApi.sync(moduleName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schema-status"] }),
  });

  const syncAll = useMutation({
    mutationFn: () => schemaApi.syncAll(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schema-status"] }),
  });

  const checkAll = useMutation({
    mutationFn: () => schemaApi.checkAll(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schema-status"] }),
  });

  const backupSchema = useMutation({
    mutationFn: (moduleName: string) => schemaApi.backup(moduleName),
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
    router.push(`/admin/schema?${params.toString()}`);
  };

  const handleSyncModule = (moduleName: string) => {
    syncModule.mutate(moduleName, {
      onSuccess: () => {
        alert(`Schema synced successfully for module: ${moduleName}`);
      },
      onError: (err) => {
        alert(`Sync failed: ${String(err)}`);
      },
    });
  };

  // Schema status columns
  const columns: Column[] = React.useMemo(
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
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div className="font-medium">{value as string}</div>
          </div>
        ),
      },
      {
        id: "is_synced",
        key: "is_synced",
        label: "Sync Status",
        sortable: true,
        filterable: true,
        type: "select",
        filterOptions: [
          { label: "Synced", value: true },
          { label: "Not Synced", value: false },
        ],
        render: (value) => (
          <Badge variant={value ? "default" : "destructive"} className={value ? "bg-green-600" : ""}>
            {value ? "Synced" : "Not Synced"}
          </Badge>
        ),
      },
      {
        id: "pending_changes",
        key: "pending_changes",
        label: "Pending Changes",
        sortable: true,
        render: (value) => (
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${Number(value) > 0 ? "text-orange-600" : "text-muted-foreground"}`}>
              {value !== undefined ? String(value) : "0"}
            </span>
            {Number(value) > 0 && (
              <AlertCircle className="h-4 w-4 text-orange-500" />
            )}
          </div>
        ),
      },
      {
        id: "last_sync",
        key: "last_sync",
        label: "Last Sync",
        sortable: true,
        render: (value) => (
          <span className="text-sm text-muted-foreground">
            {value ? new Date(value as string).toLocaleString() : "Never"}
          </span>
        ),
      },
      {
        id: "actions",
        key: "module_name",
        label: "Actions",
        render: (value) => (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleSyncModule(value as string);
            }}
            disabled={syncModule.isPending}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${syncModule.isPending ? "animate-spin" : ""}`} />
            Sync
          </Button>
        ),
      },
    ],
    [syncModule.isPending],
  );

  // Migration history columns
  const migrationColumns: Column[] = React.useMemo(
    () => [
      {
        id: "module_name",
        key: "module_name",
        label: "Module",
        sortable: true,
        searchable: true,
        render: (value) => (
          <Badge variant="secondary">{value as string}</Badge>
        ),
      },
      {
        id: "description",
        key: "description",
        label: "Description",
        searchable: true,
        render: (value) => (
          <span className="text-sm">{value as string}</span>
        ),
      },
      {
        id: "applied_at",
        key: "applied_at",
        label: "Applied At",
        sortable: true,
        render: (value) => (
          <span className="text-sm text-muted-foreground">
            {value ? new Date(value as string).toLocaleString() : "\u2014"}
          </span>
        ),
      },
      {
        id: "checksum",
        key: "checksum",
        label: "Checksum",
        render: (value) => (
          <code className="px-2 py-1 rounded bg-muted text-xs">
            {value ? String(value).substring(0, 16) + "..." : "\u2014"}
          </code>
        ),
      },
    ],
    [],
  );

  const schemas = React.useMemo(() => {
    if (Array.isArray(schemaData)) return schemaData;
    return (schemaData as any)?.items || [];
  }, [schemaData]);

  const migrations = React.useMemo(() => {
    if (Array.isArray(migrationsData)) return migrationsData;
    return (migrationsData as any)?.items || [];
  }, [migrationsData]);

  // Calculate statistics
  const stats = React.useMemo(() => {
    const total = schemas.length;
    const synced = schemas.filter((s: SchemaStatus) => s.is_synced).length;
    const pending = schemas.reduce((sum: number, s: SchemaStatus) => sum + (s.pending_changes || 0), 0);
    const totalMigrations = migrations.length;

    return { total, synced, pending, totalMigrations };
  }, [schemas, migrations]);

  // API functions for CommonFormViewManager
  const fetchSchemas = async (): Promise<SchemaStatus[]> => {
    return schemas;
  };

  const handleExport = (format: string) => {
    console.log(`Exporting schema status in ${format} format`);
  };

  const handleImport = () => {
    console.log("Importing schema");
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Failed to load schema status
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {(error as any)?.message || "An error occurred while loading schema status"}
          </p>
        </div>
      </div>
    );
  }

  // Create form view configuration for schema status
  const statusConfig = createFormViewConfig<SchemaStatus>({
    resourceName: "schema",
    baseUrl: "/admin/schema",
    apiEndpoint: "/api/v1/base/schema",
    title: "Schema Management",
    subtitle: "Monitor and synchronize database schemas across modules",
    formFields,
    columns,
    validationSchema: schemaStatusSchema as any,
    onFetch: fetchSchemas,
    views: [
      {
        id: "schema-list",
        name: "List View",
        type: "list",
        columns,
        filters: {},
        sortBy: "module_name",
        sortOrder: "asc",
      },
    ],
    defaultView: "schema-list",
  });

  // Config for migration history tab
  const migrationConfig = createFormViewConfig<MigrationEntry>({
    resourceName: "migration",
    baseUrl: "/admin/schema",
    apiEndpoint: "/api/v1/base/schema/migrations",
    title: "Migration History",
    subtitle: "Database migration records for all modules",
    formFields: [],
    columns: migrationColumns,
    validationSchema: z.object({}) as any,
    onFetch: async () => migrations,
    views: [
      {
        id: "migrations-list",
        name: "List View",
        type: "list",
        columns: migrationColumns,
        filters: {},
        sortBy: "applied_at",
        sortOrder: "desc",
      },
    ],
    defaultView: "migrations-list",
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Statistics Cards - Only show in list mode */}
      {mode === "list" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Modules</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Registered modules</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Synced</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.synced}</div>
                <p className="text-xs text-muted-foreground">Up to date</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Changes</CardTitle>
                <AlertCircle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-500">{stats.pending}</div>
                <p className="text-xs text-muted-foreground">Awaiting sync</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Migrations</CardTitle>
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalMigrations}</div>
                <p className="text-xs text-muted-foreground">Applied migrations</p>
              </CardContent>
            </Card>
          </div>

          {/* Action buttons toolbar */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => checkAll.mutate()}
              disabled={checkAll.isPending}
            >
              <CheckCircle className={`h-4 w-4 mr-2 ${checkAll.isPending ? "animate-spin" : ""}`} />
              Check All
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                if (confirm("Sync all module schemas? This may take a moment.")) {
                  syncAll.mutate();
                }
              }}
              disabled={syncAll.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncAll.isPending ? "animate-spin" : ""}`} />
              Sync All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const moduleName = prompt("Enter module name to backup:");
                if (moduleName) backupSchema.mutate(moduleName);
              }}
              disabled={backupSchema.isPending}
            >
              <Database className="h-4 w-4 mr-2" />
              Backup Schema
            </Button>
          </div>

          {/* Tab switcher */}
          <div className="flex border-b">
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "status"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("status")}
            >
              Schema Status
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "migrations"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("migrations")}
            >
              Migration History ({stats.totalMigrations})
            </button>
          </div>
        </>
      )}

      {activeTab === "status" && (
        <CommonFormViewManager
          config={statusConfig}
          mode={mode as any}
          itemId={itemId}
          onModeChange={handleModeChange}
          data={schemas}
          loading={isLoading}
          error={error ? (error as any)?.message || String(error) : null}
          selectable={true}
          selectedItems={selectedItems}
          onSelectionChange={setSelectedItems}
          onExport={handleExport}
          onImport={handleImport}
        />
      )}

      {activeTab === "migrations" && (
        <CommonFormViewManager
          config={migrationConfig}
          mode="list"
          onModeChange={() => {}}
          data={migrations}
          loading={migrationsLoading}
          error={null}
          selectable={false}
          selectedItems={[]}
          onSelectionChange={() => {}}
        />
      )}
    </div>
  );
}
