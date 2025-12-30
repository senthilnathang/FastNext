// Centralized hooks exports

// API & Data
export * from "./useApiQuery";
export * from "./useCrudNotifications";
export * from "./useCrudOperations";
export * from "./useNotifications";
export * from "./useLabels";

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
export * from "./useTypingIndicator";

// File Upload
export * from "./useFileUpload";

// Rich Text Editor
export * from "./useEditor";

// UI State
export * from "./useModal";
export * from "./useConfirm";
export * from "./useClipboard";

// Permissions
export * from "./usePermission";

// Browser APIs
export * from "./useOnlineStatus";
export * from "./useKeyboardShortcuts";
export * from "./useIdleDetection";

// Offline & PWA
export * from "./useOfflineSync";
export * from "./useServiceWorker";
export * from "./usePushNotifications";

// Cross-component communication
export * from "./useEventBus";

// Modules
export * from "./useModules";

// i18n / Translation Hooks
export {
  useTranslation,
  useCommonTranslations,
  useValidationTranslations,
  usePaginationTranslations,
  useAuthTranslations,
  useNavigationTranslations,
  useErrorTranslations,
  useTableTranslations,
  useTimeTranslations,
} from "./useTranslation";

// Note: Other hooks have been moved to their respective modules:
// - useAuth -> @/modules/auth
// - useUsers -> @/modules/users
// - useRoles -> @/modules/roles
// - usePermissions -> @/modules/permissions
// - useComponents -> @/modules/components
