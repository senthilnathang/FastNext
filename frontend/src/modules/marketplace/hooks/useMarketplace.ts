/**
 * Marketplace Hooks
 * React Query hooks for marketplace module operations
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { marketplaceApi } from "@/lib/api/marketplace";
import type {
  MarketplaceModule,
  ModuleListItem,
  ModuleSearchParams,
  Category,
  PaginatedResponse,
} from "@/lib/api/marketplace";

// Query keys
export const marketplaceKeys = {
  all: ["marketplace"] as const,
  modules: () => [...marketplaceKeys.all, "modules"] as const,
  moduleSearch: (params?: ModuleSearchParams) => [...marketplaceKeys.modules(), "search", params] as const,
  moduleFeatured: () => [...marketplaceKeys.modules(), "featured"] as const,
  moduleTrending: () => [...marketplaceKeys.modules(), "trending"] as const,
  moduleNew: () => [...marketplaceKeys.modules(), "new"] as const,
  moduleDetail: (slug: string) => [...marketplaceKeys.modules(), "detail", slug] as const,
  moduleRelated: (slug: string) => [...marketplaceKeys.modules(), "related", slug] as const,
  categories: () => [...marketplaceKeys.all, "categories"] as const,
  category: (slug: string) => [...marketplaceKeys.categories(), slug] as const,
};

/**
 * Hook to search marketplace modules
 */
export function useMarketplaceSearch(params?: ModuleSearchParams) {
  return useQuery<PaginatedResponse<ModuleListItem>>({
    queryKey: marketplaceKeys.moduleSearch(params),
    queryFn: () => marketplaceApi.modules.search(params),
  });
}

/**
 * Hook to fetch featured modules
 */
export function useFeaturedModules(limit?: number) {
  return useQuery<ModuleListItem[]>({
    queryKey: marketplaceKeys.moduleFeatured(),
    queryFn: () => marketplaceApi.modules.getFeatured(limit),
    staleTime: 60000, // Cache for 1 minute
  });
}

/**
 * Hook to fetch trending modules
 */
export function useTrendingModules(limit?: number) {
  return useQuery<ModuleListItem[]>({
    queryKey: marketplaceKeys.moduleTrending(),
    queryFn: () => marketplaceApi.modules.getTrending(limit),
    staleTime: 60000,
  });
}

/**
 * Hook to fetch new modules
 */
export function useNewModules(limit?: number) {
  return useQuery<ModuleListItem[]>({
    queryKey: marketplaceKeys.moduleNew(),
    queryFn: () => marketplaceApi.modules.getNew(limit),
    staleTime: 60000,
  });
}

/**
 * Hook to fetch a single module by slug
 */
export function useMarketplaceModule(slug: string, options?: { enabled?: boolean }) {
  return useQuery<MarketplaceModule>({
    queryKey: marketplaceKeys.moduleDetail(slug),
    queryFn: () => marketplaceApi.modules.getBySlug(slug),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to fetch related modules
 */
export function useRelatedModules(slug: string, limit?: number, options?: { enabled?: boolean }) {
  return useQuery<ModuleListItem[]>({
    queryKey: marketplaceKeys.moduleRelated(slug),
    queryFn: () => marketplaceApi.modules.getRelated(slug, limit),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to fetch all categories
 */
export function useCategories() {
  return useQuery<Category[]>({
    queryKey: marketplaceKeys.categories(),
    queryFn: () => marketplaceApi.categories.list(),
    staleTime: 300000, // Cache for 5 minutes
  });
}

/**
 * Hook to fetch a single category
 */
export function useCategory(slug: string, options?: { enabled?: boolean }) {
  return useQuery<Category>({
    queryKey: marketplaceKeys.category(slug),
    queryFn: () => marketplaceApi.categories.get(slug),
    enabled: options?.enabled ?? true,
  });
}
