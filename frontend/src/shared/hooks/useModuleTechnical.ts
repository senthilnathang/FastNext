import { useQuery } from "@tanstack/react-query";
import { moduleTechnicalApi } from "@/lib/api/module-technical";

export const moduleTechnicalKeys = {
  all: ["moduleTechnical"] as const,
  info: (moduleName: string) => [...moduleTechnicalKeys.all, "info", moduleName] as const,
  models: (moduleName: string) => [...moduleTechnicalKeys.all, "models", moduleName] as const,
  modelDetail: (moduleName: string, modelName: string) => [...moduleTechnicalKeys.all, "modelDetail", moduleName, modelName] as const,
  views: (moduleName: string) => [...moduleTechnicalKeys.all, "views", moduleName] as const,
  routes: (moduleName: string) => [...moduleTechnicalKeys.all, "routes", moduleName] as const,
  services: (moduleName: string) => [...moduleTechnicalKeys.all, "services", moduleName] as const,
  statistics: (moduleName: string) => [...moduleTechnicalKeys.all, "statistics", moduleName] as const,
  assets: (moduleName: string) => [...moduleTechnicalKeys.all, "assets", moduleName] as const,
};

export function useModuleTechnicalInfo(moduleName: string) {
  return useQuery({ queryKey: moduleTechnicalKeys.info(moduleName), queryFn: () => moduleTechnicalApi.getTechnicalInfo(moduleName), enabled: !!moduleName });
}

export function useModuleModels(moduleName: string) {
  return useQuery({ queryKey: moduleTechnicalKeys.models(moduleName), queryFn: () => moduleTechnicalApi.getModels(moduleName), enabled: !!moduleName });
}

export function useModelDetails(moduleName: string, modelName: string) {
  return useQuery({ queryKey: moduleTechnicalKeys.modelDetail(moduleName, modelName), queryFn: () => moduleTechnicalApi.getModelDetails(moduleName, modelName), enabled: !!moduleName && !!modelName });
}

export function useModuleViews(moduleName: string) {
  return useQuery({ queryKey: moduleTechnicalKeys.views(moduleName), queryFn: () => moduleTechnicalApi.getViews(moduleName), enabled: !!moduleName });
}

export function useModuleTechnicalRoutes(moduleName: string) {
  return useQuery({ queryKey: moduleTechnicalKeys.routes(moduleName), queryFn: () => moduleTechnicalApi.getRoutes(moduleName), enabled: !!moduleName });
}

export function useModuleServices(moduleName: string) {
  return useQuery({ queryKey: moduleTechnicalKeys.services(moduleName), queryFn: () => moduleTechnicalApi.getServices(moduleName), enabled: !!moduleName });
}

export function useModuleStatistics(moduleName: string) {
  return useQuery({ queryKey: moduleTechnicalKeys.statistics(moduleName), queryFn: () => moduleTechnicalApi.getStatistics(moduleName), enabled: !!moduleName });
}

export function useModuleAssets(moduleName: string) {
  return useQuery({ queryKey: moduleTechnicalKeys.assets(moduleName), queryFn: () => moduleTechnicalApi.getAssets(moduleName), enabled: !!moduleName });
}
