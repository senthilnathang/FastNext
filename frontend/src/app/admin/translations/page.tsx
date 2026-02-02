"use client";

import { Download, FileText, Globe, Languages, Upload } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { translationsApi } from "@/lib/api/translations";
import type { Translation } from "@/lib/api/translations";
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

// Translation validation schema
const translationSchema = z.object({
  id: z.number().optional(),
  lang: z.string().min(1, "Language is required"),
  type: z.string().optional().default("model"),
  name: z.string().optional().default(""),
  res_id: z.number().optional().nullable(),
  source: z.string().min(1, "Source text is required"),
  value: z.string().optional().nullable(),
  module_name: z.string().optional().nullable(),
  state: z.string().optional().default("to_translate"),
  comments: z.string().optional().nullable(),
  is_translated: z.boolean().optional().default(false),
  created_at: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
});

// Form fields configuration
const formFields: FormField<Translation>[] = [
  {
    name: "lang",
    label: "Language",
    type: "text",
    required: true,
    placeholder: "e.g. en_US, fr_FR, es_ES",
    description: "Language code for this translation",
  },
  {
    name: "module_name",
    label: "Module",
    type: "text",
    placeholder: "e.g. base, crm, sales",
    description: "Module this translation belongs to",
  },
  {
    name: "name",
    label: "Key",
    type: "text",
    required: true,
    placeholder: "e.g. field_label, button_text",
    description: "Translation key identifier",
  },
  {
    name: "source",
    label: "Source Text",
    type: "text",
    required: true,
    placeholder: "Original text to translate",
    description: "The source text in the default language",
  },
  {
    name: "value",
    label: "Translation",
    type: "textarea",
    placeholder: "Translated text...",
    description: "The translated value",
  },
];

export default function TranslationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [selectedItems, setSelectedItems] = React.useState<any[]>([]);

  const { data: translationsData, isLoading, error } = useQuery({
    queryKey: ["translations"],
    queryFn: () => translationsApi.list(),
  });

  const createTranslation = useMutation({
    mutationFn: (data: any) => translationsApi.set(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["translations"] }),
  });

  const updateTranslation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => translationsApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["translations"] }),
  });

  const deleteTranslation = useMutation({
    mutationFn: (id: number) => translationsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["translations"] }),
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
    router.push(`/admin/translations?${params.toString()}`);
  };

  // Define columns for the ViewManager
  const columns: Column[] = React.useMemo(
    () => [
      {
        id: "lang",
        key: "lang",
        label: "Language",
        sortable: true,
        filterable: true,
        render: (value) => (
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <Badge variant="outline">{value as string}</Badge>
          </div>
        ),
      },
      {
        id: "module_name",
        key: "module_name",
        label: "Module",
        sortable: true,
        filterable: true,
        render: (value) =>
          value ? (
            <Badge variant="secondary">{value as string}</Badge>
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
          ),
      },
      {
        id: "name",
        key: "name",
        label: "Key",
        sortable: true,
        searchable: true,
        render: (value) => (
          <code className="px-2 py-1 rounded bg-muted text-sm">{value as string}</code>
        ),
      },
      {
        id: "source",
        key: "source",
        label: "Source",
        searchable: true,
        render: (value) => (
          <span className="text-sm truncate max-w-[200px] block">
            {value ? String(value).substring(0, 60) + (String(value).length > 60 ? "..." : "") : "—"}
          </span>
        ),
      },
      {
        id: "value",
        key: "value",
        label: "Translation",
        searchable: true,
        render: (value) => (
          <span className="text-sm truncate max-w-[200px] block">
            {value ? String(value).substring(0, 60) + (String(value).length > 60 ? "..." : "") : (
              <span className="text-orange-500 italic">Untranslated</span>
            )}
          </span>
        ),
      },
      {
        id: "state",
        key: "state",
        label: "State",
        sortable: true,
        filterable: true,
        render: (value) => {
          const variant = value === "translated" ? "default" : value === "validated" ? "secondary" : "destructive";
          return <Badge variant={variant}>{value as string}</Badge>;
        },
      },
      {
        id: "updated_at",
        key: "updated_at",
        label: "Updated",
        sortable: true,
        render: (value) => (
          <span className="text-sm text-muted-foreground">
            {value ? new Date(value as string).toLocaleDateString() : "—"}
          </span>
        ),
      },
    ],
    [],
  );

  const translations = React.useMemo(() => {
    if (Array.isArray(translationsData)) return translationsData;
    return (translationsData as any)?.items || [];
  }, [translationsData]);

  // Calculate statistics
  const stats = React.useMemo(() => {
    const total = translations.length;
    const languages = new Set(translations.map((t: Translation) => t.lang)).size;
    const modules = new Set(translations.map((t: Translation) => t.module_name).filter(Boolean)).size;
    const missing = translations.filter((t: Translation) => !t.is_translated).length;

    return { total, languages, modules, missing };
  }, [translations]);

  // API functions
  const fetchTranslations = async (): Promise<Translation[]> => {
    return translations;
  };

  const createTranslationApi = async (data: Translation): Promise<Translation> => {
    return new Promise((resolve, reject) => {
      createTranslation.mutate(
        { lang: data.lang, source: data.source, value: data.value, name: data.name, module_name: data.module_name || undefined },
        {
          onSuccess: (result) => resolve(result),
          onError: (error) => reject(new Error(String(error))),
        },
      );
    });
  };

  const updateTranslationApi = async (id: string | number, data: Translation): Promise<Translation> => {
    return new Promise((resolve, reject) => {
      updateTranslation.mutate(
        { id: Number(id), data: { value: data.value, comments: data.comments || undefined, state: data.state } },
        {
          onSuccess: (result) => resolve(result),
          onError: (error) => reject(new Error(String(error))),
        },
      );
    });
  };

  const deleteTranslationApi = async (id: string | number): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (confirm("Are you sure you want to delete this translation?")) {
        deleteTranslation.mutate(Number(id), {
          onSuccess: () => resolve(),
          onError: (error) => reject(new Error(String(error))),
        });
      } else {
        reject(new Error("Deletion cancelled"));
      }
    });
  };

  const handleExport = (format: string) => {
    console.log(`Exporting translations in ${format} format`);
  };

  const handleImport = () => {
    console.log("Importing translations");
  };

  const bulkActions = [
    {
      label: "Delete Selected",
      action: (items: any[]) => {
        if (confirm(`Delete ${items.length} translations?`)) {
          items.forEach((t) => deleteTranslation.mutate(t.id));
        }
      },
    },
  ];

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Failed to load translations
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {(error as any)?.message || "An error occurred while loading translations"}
          </p>
        </div>
      </div>
    );
  }

  // Create form view configuration
  const config = createFormViewConfig<Translation>({
    resourceName: "translation",
    baseUrl: "/admin/translations",
    apiEndpoint: "/api/v1/base/translations",
    title: "Translations Management",
    subtitle: "Manage application translations across languages and modules",
    formFields,
    columns,
    validationSchema: translationSchema as any,
    onFetch: fetchTranslations,
    onCreate: createTranslationApi,
    onUpdate: updateTranslationApi,
    onDelete: deleteTranslationApi,
    views: [
      {
        id: "translations-card",
        name: "Card View",
        type: "card",
        columns,
        filters: {},
        sortBy: "updated_at",
        sortOrder: "desc",
      },
      {
        id: "translations-list",
        name: "List View",
        type: "list",
        columns,
        filters: {},
        sortBy: "updated_at",
        sortOrder: "desc",
      },
    ],
    defaultView: "translations-list",
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Statistics Cards - Only show in list mode */}
      {mode === "list" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Translations</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.total - stats.missing} translated
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Languages</CardTitle>
                <Languages className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.languages}</div>
                <p className="text-xs text-muted-foreground">Active languages</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Modules</CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.modules}</div>
                <p className="text-xs text-muted-foreground">With translations</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Missing</CardTitle>
                <FileText className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-500">{stats.missing}</div>
                <p className="text-xs text-muted-foreground">Untranslated entries</p>
              </CardContent>
            </Card>
          </div>

          {/* Import/Export toolbar */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleImport}>
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport("json")}>
              <Download className="h-4 w-4 mr-2" />
              Export JSON
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport("po")}>
              <Download className="h-4 w-4 mr-2" />
              Export PO
            </Button>
          </div>
        </>
      )}

      <CommonFormViewManager
        config={config}
        mode={mode as any}
        itemId={itemId}
        onModeChange={handleModeChange}
        data={translations}
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
