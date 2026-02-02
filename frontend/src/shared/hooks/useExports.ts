import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { exportsApi } from "@/lib/api/exports";

export const exportsKeys = {
  all: ["exports"] as const,
  history: () => [...exportsKeys.all, "history"] as const,
  importHistory: () => [...exportsKeys.all, "importHistory"] as const,
  importDetail: (importId: string) => [...exportsKeys.all, "importDetail", importId] as const,
  templates: () => [...exportsKeys.all, "templates"] as const,
  template: (code: string) => [...exportsKeys.all, "template", code] as const,
};

export function useExportHistory() {
  return useQuery({ queryKey: exportsKeys.history(), queryFn: () => exportsApi.getHistory() });
}

export function useImportHistory() {
  return useQuery({ queryKey: exportsKeys.importHistory(), queryFn: () => exportsApi.imports.list() });
}

export function useImportDetails(importId: string) {
  return useQuery({ queryKey: exportsKeys.importDetail(importId), queryFn: () => exportsApi.imports.get(importId), enabled: !!importId });
}

export function useExportTemplates() {
  return useQuery({ queryKey: exportsKeys.templates(), queryFn: () => exportsApi.templates.list() });
}

export function useExportTemplate(code: string) {
  return useQuery({ queryKey: exportsKeys.template(code), queryFn: () => exportsApi.templates.get(code), enabled: !!code });
}

export function useExportModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (moduleName: string) => exportsApi.exportModule(moduleName),
    onSuccess: () => qc.invalidateQueries({ queryKey: exportsKeys.history() }),
  });
}

export function useExportModuleData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (moduleName: string) => exportsApi.exportData(moduleName),
    onSuccess: () => qc.invalidateQueries({ queryKey: exportsKeys.history() }),
  });
}

export function useImportModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: FormData) => exportsApi.imports.upload(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: exportsKeys.importHistory() }),
  });
}

export function useExecuteImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (importId: string) => exportsApi.imports.execute(importId),
    onSuccess: (_data, importId) => {
      qc.invalidateQueries({ queryKey: exportsKeys.importHistory() });
      qc.invalidateQueries({ queryKey: exportsKeys.importDetail(importId) });
    },
  });
}

export function useRollbackImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (importId: string) => exportsApi.imports.rollback(importId),
    onSuccess: (_data, importId) => {
      qc.invalidateQueries({ queryKey: exportsKeys.importHistory() });
      qc.invalidateQueries({ queryKey: exportsKeys.importDetail(importId) });
    },
  });
}

export function useImportData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => exportsApi.imports.importData(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: exportsKeys.importHistory() }),
  });
}

export function useCreateExportTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: exportsApi.templates.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: exportsKeys.templates() }),
  });
}

export function useExecuteExportTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => exportsApi.templates.execute(code),
    onSuccess: () => qc.invalidateQueries({ queryKey: exportsKeys.history() }),
  });
}

export function useDeleteExportTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => exportsApi.templates.delete(code),
    onSuccess: () => qc.invalidateQueries({ queryKey: exportsKeys.templates() }),
  });
}
