"use client";

import {
  AlertTriangle,
  Loader2,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useToast } from "@/shared/hooks/useToast";
import {
  useMarketplaceSearch,
  useCategories,
  useAddToCart,
} from "../hooks";
import type { ModuleListItem, ModuleSearchParams } from "@/lib/api/marketplace";
import type { SortOption } from "../types";
import { ModuleCard } from "./ModuleCard";
import { cn } from "@/shared/utils";

interface ModuleGridProps {
  className?: string;
  initialParams?: ModuleSearchParams;
  showFilters?: boolean;
  title?: string;
}

export function ModuleGrid({
  className,
  initialParams,
  showFilters = true,
  title,
}: ModuleGridProps) {
  const { toast } = useToast();

  // State
  const [search, setSearch] = useState(initialParams?.search || "");
  const [categoryId, setCategoryId] = useState<string>(
    initialParams?.category_id ? String(initialParams.category_id) : "all"
  );
  const [sortBy, setSortBy] = useState<SortOption>(initialParams?.sort_by || "relevance");
  const [isFreeOnly, setIsFreeOnly] = useState(initialParams?.is_free || false);

  // Build query params
  const params: ModuleSearchParams = {
    skip: 0,
    limit: 24,
    ...(search && { search }),
    ...(categoryId !== "all" && { category_id: Number(categoryId) }),
    sort_by: sortBy,
    ...(isFreeOnly && { is_free: true }),
  };

  // Data fetching
  const { data, isLoading, error, refetch } = useMarketplaceSearch(params);
  const { data: categories } = useCategories();
  const addToCartMutation = useAddToCart();

  const modules = data?.items || [];

  const handleAddToCart = useCallback(
    async (module: ModuleListItem) => {
      try {
        await addToCartMutation.mutateAsync({ module_id: module.id });
        toast({
          title: module.is_free
            ? "Module added to installation queue"
            : "Added to cart",
        });
      } catch (err) {
        toast({ title: "Failed to add to cart", variant: "destructive" });
      }
    },
    [addToCartMutation, toast]
  );

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Failed to load modules
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          {(error as Error).message || "An error occurred"}
        </p>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      {title && (
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {title}
        </h2>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-1 gap-3 items-center w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search modules..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={String(cat.id)}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 items-center">
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-36">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="rating">Top Rated</SelectItem>
                <SelectItem value="downloads">Most Downloads</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price_asc">Price: Low to High</SelectItem>
                <SelectItem value="price_desc">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={isFreeOnly ? "secondary" : "outline"}
              size="sm"
              onClick={() => setIsFreeOnly(!isFreeOnly)}
            >
              Free Only
            </Button>
          </div>
        </div>
      )}

      {/* Grid */}
      {modules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-gray-50 dark:bg-gray-800/50">
          <Search className="h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            {search || categoryId !== "all"
              ? "No modules match your filters"
              : "No modules available"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {modules.map((module) => (
            <ModuleCard
              key={module.id}
              module={module}
              onAddToCart={handleAddToCart}
            />
          ))}
        </div>
      )}

      {/* Total count */}
      {data && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          Showing {modules.length} of {data.total} modules
        </p>
      )}
    </div>
  );
}

export default ModuleGrid;
