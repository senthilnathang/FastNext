/**
 * Demo Module Types
 */

// Re-export from API types
export type {
  DemoItem,
  DemoItemCreate,
  DemoItemUpdate,
  DemoItemListParams,
  PaginatedDemoItems,
} from "@/lib/api/demo";

// Module-specific UI types
export interface DemoItemFormData {
  name: string;
  description: string;
  is_active: boolean;
}

export interface DemoItemFilters {
  search: string;
  is_active: boolean | null;
}

export type DemoViewMode = "grid" | "list";
