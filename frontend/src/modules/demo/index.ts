/**
 * Demo Module
 * Exports all demo module functionality
 */

// Components
export { DemoItemCard, DemoItemForm, DemoItemList } from "./components";

// Hooks
export {
  demoItemKeys,
  useDemoItems,
  useDemoItem,
  useCreateDemoItem,
  useUpdateDemoItem,
  useDeleteDemoItem,
  useToggleDemoItemActive,
} from "./hooks";

// Types
export type {
  DemoItem,
  DemoItemCreate,
  DemoItemUpdate,
  DemoItemListParams,
  PaginatedDemoItems,
  DemoItemFormData,
  DemoItemFilters,
  DemoViewMode,
} from "./types";
