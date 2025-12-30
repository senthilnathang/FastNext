/**
 * Marketplace Module
 * Exports all marketplace module functionality
 */

// Components
export { ModuleCard, ModuleGrid } from "./components";

// Hooks
export {
  // Marketplace browsing
  marketplaceKeys,
  useMarketplaceSearch,
  useFeaturedModules,
  useTrendingModules,
  useNewModules,
  useMarketplaceModule,
  useRelatedModules,
  useCategories,
  useCategory,
  // Cart
  cartKeys,
  useCart,
  useAddToCart,
  useRemoveFromCart,
  useClearCart,
  useApplyCoupon,
  useRemoveCoupon,
  useCheckout,
} from "./hooks";

// Types
export type {
  // Common
  PaginatedResponse,
  // Module
  Publisher,
  Category,
  Screenshot,
  ModuleVersion,
  ModuleDependency,
  MarketplaceModule,
  ModuleListItem,
  ModuleSearchParams,
  // Cart
  CartItem,
  Cart,
  AddToCartData,
  // Order
  OrderStatus,
  PaymentStatus,
  OrderItem,
  Order,
  OrderListParams,
  CheckoutData,
  CheckoutResult,
  // License
  LicenseStatus,
  License,
  LicenseListParams,
  ActivateLicenseData,
  ActivationResult,
  // Review
  Review,
  ReviewCreate,
  ReviewUpdate,
  ReviewListParams,
  ReviewVote,
  // Publisher
  PublisherProfile,
  PublisherStats,
  PublisherModule,
  PublisherModuleCreate,
  PublisherModuleUpdate,
  Payout,
  PayoutListParams,
  RequestPayoutData,
  // UI
  MarketplaceViewMode,
  SortOption,
  MarketplaceFilters,
  CartState,
  CheckoutFormData,
  ReviewFormData,
  PublisherModuleFormData,
  PayoutRequestFormData,
  CartItemWithDetails,
  PriceDisplay,
  InstallStatus,
  ModuleInstallState,
  RatingBreakdown,
  EarningsPeriod,
  ModuleCardProps,
} from "./types";
