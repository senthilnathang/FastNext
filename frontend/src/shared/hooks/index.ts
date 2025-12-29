// Centralized hooks exports

// API & Data
export * from "./useApiQuery";
export * from "./useCrudNotifications";
export * from "./useCrudOperations";

// URL State Management
export {
  useTabState,
  useSearchState,
  usePaginationState,
  useSortState,
  useViewModeState,
  useBooleanFilterState,
  useStringLiteralState,
} from "./useURLState";

// WebSocket & Real-time
export * from "./useWebSocket";

// File Upload
export * from "./useFileUpload";

// UI State
export * from "./useModal";
export * from "./useConfirm";
export * from "./useClipboard";

// Permissions
export * from "./usePermission";

// Browser APIs
export * from "./useOnlineStatus";
export * from "./useKeyboardShortcuts";

// Note: Other hooks have been moved to their respective modules:
// - useAuth -> @/modules/auth
// - useUsers -> @/modules/users
// - useRoles -> @/modules/roles
// - usePermissions -> @/modules/permissions
// - useComponents -> @/modules/components
