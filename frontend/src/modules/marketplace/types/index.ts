/**
 * Marketplace Module Types
 */

import type { CartItem, MarketplaceModule, ModuleListItem } from "@/lib/api/marketplace";

// Re-export from API types
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
} from "@/lib/api/marketplace";

// Module-specific UI types

export type MarketplaceViewMode = "grid" | "list";

export type SortOption = "relevance" | "rating" | "downloads" | "price_asc" | "price_desc" | "newest";

export interface MarketplaceFilters {
  search: string;
  category_id: number | null;
  is_free: boolean | null;
  min_price: number | null;
  max_price: number | null;
  min_rating: number | null;
  sort_by: SortOption;
  tags: string[];
}

export interface CartState {
  items: CartItem[];
  isLoading: boolean;
  error: string | null;
  couponCode: string | null;
  couponDiscount: number;
}

export interface CheckoutFormData {
  payment_method: string;
  billing_address: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    country: string;
    postal_code: string;
  };
  coupon_code: string;
  terms_accepted: boolean;
}

export interface ReviewFormData {
  rating: number;
  title: string;
  content: string;
}

export interface PublisherModuleFormData {
  name: string;
  slug: string;
  summary: string;
  description: string;
  category_id: number | null;
  price: number;
  is_free: boolean;
  tags: string[];
}

export interface PayoutRequestFormData {
  amount: number;
  method: string;
}

// Cart item with extended details
export interface CartItemWithDetails extends CartItem {
  module_details?: MarketplaceModule;
}

// Price display helpers
export interface PriceDisplay {
  amount: number;
  currency: string;
  formatted: string;
  is_free: boolean;
}

// Module install state
export type InstallStatus = "not_installed" | "installing" | "installed" | "update_available" | "error";

export interface ModuleInstallState {
  module_id: number;
  status: InstallStatus;
  installed_version: string | null;
  latest_version: string;
  error_message: string | null;
  progress: number;
}

// Rating breakdown for display
export interface RatingBreakdown {
  average: number;
  total: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

// Publisher earnings period
export interface EarningsPeriod {
  period: string;
  revenue: number;
  downloads: number;
  orders: number;
}

// Module card display props
export interface ModuleCardProps {
  module: ModuleListItem;
  showPrice?: boolean;
  showRating?: boolean;
  showPublisher?: boolean;
  onAddToCart?: () => void;
  onViewDetails?: () => void;
}
