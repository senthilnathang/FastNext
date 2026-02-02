import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { schemaApi } from "@/lib/api/schema";

export const schemaKeys = {
  all: ["schema"] as const,
  status: (moduleName: string) => [...schemaKeys.all, "status", moduleName] as const,
  migrations: (moduleName: string) => [...schemaKeys.all, "migrations", moduleName] as const,
  allMigrations: () => [...schemaKeys.all, "allMigrations"] as const,
  tables: (moduleName: string) => [...schemaKeys.all, "tables", moduleName] as const,
  comparison: (moduleName: string) => [...schemaKeys.all, "comparison", moduleName] as const,
  checkAll: () => [...schemaKeys.all, "checkAll"] as const,
};

export function useSchemaStatus(moduleName: string) {
  return useQuery({ queryKey: schemaKeys.status(moduleName), queryFn: () => schemaApi.getStatus(moduleName), enabled: !!moduleName });
}

export function useModuleMigrations(moduleName: string) {
  return useQuery({ queryKey: schemaKeys.migrations(moduleName), queryFn: () => schemaApi.getMigrations(moduleName), enabled: !!moduleName });
}

export function useAllMigrations() {
  return useQuery({ queryKey: schemaKeys.allMigrations(), queryFn: () => schemaApi.getAllMigrations() });
}

export function useModuleTables(moduleName: string) {
  return useQuery({ queryKey: schemaKeys.tables(moduleName), queryFn: () => schemaApi.getTables(moduleName), enabled: !!moduleName });
}

export function useSchemaComparison(moduleName: string) {
  return useQuery({ queryKey: schemaKeys.comparison(moduleName), queryFn: () => schemaApi.compare(moduleName), enabled: !!moduleName });
}

export function useCheckAllSchemas() {
  return useQuery({ queryKey: schemaKeys.checkAll(), queryFn: () => schemaApi.checkAll() });
}

export function useSyncSchema() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (moduleName: string) => schemaApi.sync(moduleName),
    onSuccess: (_data, moduleName) => {
      qc.invalidateQueries({ queryKey: schemaKeys.status(moduleName) });
      qc.invalidateQueries({ queryKey: schemaKeys.migrations(moduleName) });
      qc.invalidateQueries({ queryKey: schemaKeys.comparison(moduleName) });
      qc.invalidateQueries({ queryKey: schemaKeys.checkAll() });
    },
  });
}

export function useSyncAllSchemas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => schemaApi.syncAll(),
    onSuccess: () => qc.invalidateQueries({ queryKey: schemaKeys.all }),
  });
}

export function useRollbackMigration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ moduleName, migrationId }: { moduleName: string; migrationId: string }) => schemaApi.rollback(moduleName, migrationId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: schemaKeys.status(variables.moduleName) });
      qc.invalidateQueries({ queryKey: schemaKeys.migrations(variables.moduleName) });
      qc.invalidateQueries({ queryKey: schemaKeys.allMigrations() });
    },
  });
}

export function useBackupModuleData() {
  return useMutation({ mutationFn: (moduleName: string) => schemaApi.backup(moduleName) });
}
