/**
 * CRM Stats Hook
 * React Query hooks for CRM dashboard statistics
 */

import { useQuery } from "@tanstack/react-query";
import { crmApi } from "@/lib/api/crm";
import type { CRMStats, PipelineStats } from "@/lib/api/crm";

// Query keys
export const crmStatsKeys = {
  all: ["crm", "stats"] as const,
  dashboard: () => [...crmStatsKeys.all, "dashboard"] as const,
  pipelines: () => [...crmStatsKeys.all, "pipelines"] as const,
};

/**
 * Hook to fetch CRM dashboard statistics
 */
export function useCRMStats() {
  return useQuery<CRMStats>({
    queryKey: crmStatsKeys.dashboard(),
    queryFn: () => crmApi.stats.getDashboard(),
    staleTime: 30000, // Stats are fresh for 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
}

/**
 * Hook to fetch all pipeline statistics
 */
export function usePipelineStats() {
  return useQuery<PipelineStats[]>({
    queryKey: crmStatsKeys.pipelines(),
    queryFn: () => crmApi.stats.getPipelineStats(),
    staleTime: 30000,
    refetchInterval: 60000,
  });
}
