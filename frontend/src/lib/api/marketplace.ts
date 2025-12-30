/**
 * Marketplace Module API Client
 * Handles module browsing, cart, licenses, reviews, and publisher operations
 */

import { apiClient } from "./client";

// ============================================================================
// Common Types
// ============================================================================

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

// ============================================================================
// Module Types
// ============================================================================

export interface Publisher {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  website: string | null;
  email: string | null;
  logo_url: string | null;
  verified: boolean;
  modules_count: number;
  total_downloads: number;
  average_rating: number;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  modules_count: number;
  parent_id: number | null;
}

export interface Screenshot {
  id: number;
  url: string;
  caption: string | null;
  order: number;
}

export interface ModuleVersion {
  id: number;
  version: string;
  release_notes: string | null;
  min_platform_version: string | null;
  is_latest: boolean;
  download_url: string | null;
  released_at: string;
}

export interface ModuleDependency {
  module_slug: string;
  module_name: string;
  version_constraint: string;
}

export interface MarketplaceModule {
  id: number;
  slug: string;
  name: string;
  summary: string;
  description: string | null;
  icon_url: string | null;
  banner_url: string | null;
  price: number;
  currency: string;
  is_free: boolean;
  rating: number;
  ratings_count: number;
  download_count: number;
  publisher: Publisher;
  category: Category;
  screenshots: Screenshot[];
  versions: ModuleVersion[];
  latest_version: string;
  dependencies: ModuleDependency[];
  tags: string[];
  is_featured: boolean;
  is_trending: boolean;
  is_new: boolean;
  published_at: string;
  updated_at: string;
}

export interface ModuleListItem {
  id: number;
  slug: string;
  name: string;
  summary: string;
  icon_url: string | null;
  price: number;
  currency: string;
  is_free: boolean;
  rating: number;
  ratings_count: number;
  download_count: number;
  publisher_name: string;
  publisher_verified: boolean;
  category_name: string;
  is_featured: boolean;
  is_trending: boolean;
  is_new: boolean;
  latest_version: string;
}

export interface ModuleSearchParams {
  skip?: number;
  limit?: number;
  search?: string;
  category_id?: number;
  category_slug?: string;
  publisher_id?: number;
  is_free?: boolean;
  min_price?: number;
  max_price?: number;
  min_rating?: number;
  sort_by?: "relevance" | "rating" | "downloads" | "price_asc" | "price_desc" | "newest";
  tags?: string[];
}

// ============================================================================
// Cart Types
// ============================================================================

export interface CartItem {
  id: number;
  module: ModuleListItem;
  quantity: number;
  price: number;
  currency: string;
  added_at: string;
}

export interface Cart {
  id: number;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  item_count: number;
}

export interface AddToCartData {
  module_id: number;
  version_id?: number;
}

// ============================================================================
// Order Types
// ============================================================================

export type OrderStatus = "pending" | "processing" | "completed" | "cancelled" | "refunded";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface OrderItem {
  id: number;
  module_id: number;
  module_name: string;
  module_slug: string;
  version: string;
  price: number;
  currency: string;
  license_key: string | null;
}

export interface Order {
  id: number;
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  payment_method: string | null;
  payment_reference: string | null;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface OrderListParams {
  skip?: number;
  limit?: number;
  status?: OrderStatus;
}

export interface CheckoutData {
  payment_method: string;
  billing_address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    country: string;
    postal_code: string;
  };
  coupon_code?: string;
}

export interface CheckoutResult {
  order: Order;
  payment_url?: string;
  requires_redirect: boolean;
}

// ============================================================================
// License Types
// ============================================================================

export type LicenseStatus = "active" | "expired" | "suspended" | "cancelled";

export interface License {
  id: number;
  license_key: string;
  module_id: number;
  module_name: string;
  module_slug: string;
  version: string;
  status: LicenseStatus;
  activated_at: string | null;
  expires_at: string | null;
  activations_count: number;
  max_activations: number;
  features: Record<string, boolean>;
  order_id: number;
  created_at: string;
}

export interface LicenseListParams {
  skip?: number;
  limit?: number;
  status?: LicenseStatus;
  module_id?: number;
}

export interface ActivateLicenseData {
  domain?: string;
  instance_id?: string;
}

export interface ActivationResult {
  success: boolean;
  activation_id: string;
  expires_at: string | null;
}

// ============================================================================
// Review Types
// ============================================================================

export interface Review {
  id: number;
  module_id: number;
  user_id: number;
  user_name: string;
  user_avatar: string | null;
  rating: number;
  title: string;
  content: string | null;
  is_verified_purchase: boolean;
  helpful_count: number;
  not_helpful_count: number;
  response: string | null;
  response_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewCreate {
  module_id: number;
  rating: number;
  title: string;
  content?: string | null;
}

export interface ReviewUpdate {
  rating?: number;
  title?: string;
  content?: string | null;
}

export interface ReviewListParams {
  skip?: number;
  limit?: number;
  rating?: number;
  sort_by?: "newest" | "oldest" | "highest" | "lowest" | "helpful";
}

export interface ReviewVote {
  helpful: boolean;
}

// ============================================================================
// Publisher Dashboard Types
// ============================================================================

export interface PublisherProfile {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  website: string | null;
  email: string;
  logo_url: string | null;
  verified: boolean;
  payout_method: string | null;
  payout_details: Record<string, string> | null;
  commission_rate: number;
  balance: number;
  total_earned: number;
  created_at: string;
}

export interface PublisherStats {
  total_modules: number;
  total_downloads: number;
  total_revenue: number;
  total_reviews: number;
  average_rating: number;
  downloads_this_month: number;
  revenue_this_month: number;
  top_modules: {
    module_id: number;
    module_name: string;
    downloads: number;
    revenue: number;
  }[];
}

export interface PublisherModule {
  id: number;
  slug: string;
  name: string;
  summary: string;
  icon_url: string | null;
  price: number;
  is_free: boolean;
  status: "draft" | "pending" | "published" | "rejected" | "archived";
  rating: number;
  download_count: number;
  revenue: number;
  latest_version: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublisherModuleCreate {
  name: string;
  slug: string;
  summary: string;
  description?: string | null;
  category_id: number;
  price?: number;
  is_free?: boolean;
  tags?: string[];
}

export interface PublisherModuleUpdate {
  name?: string;
  summary?: string;
  description?: string | null;
  category_id?: number;
  price?: number;
  is_free?: boolean;
  tags?: string[];
  status?: "draft" | "archived";
}

export interface Payout {
  id: number;
  amount: number;
  currency: string;
  status: "pending" | "processing" | "completed" | "failed";
  method: string;
  reference: string | null;
  notes: string | null;
  requested_at: string;
  completed_at: string | null;
}

export interface PayoutListParams {
  skip?: number;
  limit?: number;
  status?: string;
}

export interface RequestPayoutData {
  amount: number;
  method: string;
}

// ============================================================================
// API Functions
// ============================================================================

export const marketplaceApi = {
  // Module Browsing
  modules: {
    search: (params?: ModuleSearchParams): Promise<PaginatedResponse<ModuleListItem>> =>
      apiClient.get("/api/v1/marketplace/modules", params),

    getFeatured: (limit?: number): Promise<ModuleListItem[]> =>
      apiClient.get("/api/v1/marketplace/modules/featured", { limit }),

    getTrending: (limit?: number): Promise<ModuleListItem[]> =>
      apiClient.get("/api/v1/marketplace/modules/trending", { limit }),

    getNew: (limit?: number): Promise<ModuleListItem[]> =>
      apiClient.get("/api/v1/marketplace/modules/new", { limit }),

    getBySlug: (slug: string): Promise<MarketplaceModule> =>
      apiClient.get(`/api/v1/marketplace/modules/${slug}`),

    getById: (id: number): Promise<MarketplaceModule> =>
      apiClient.get(`/api/v1/marketplace/modules/by-id/${id}`),

    getVersions: (slug: string): Promise<ModuleVersion[]> =>
      apiClient.get(`/api/v1/marketplace/modules/${slug}/versions`),

    getRelated: (slug: string, limit?: number): Promise<ModuleListItem[]> =>
      apiClient.get(`/api/v1/marketplace/modules/${slug}/related`, { limit }),
  },

  // Categories
  categories: {
    list: (): Promise<Category[]> =>
      apiClient.get("/api/v1/marketplace/categories"),

    get: (slug: string): Promise<Category> =>
      apiClient.get(`/api/v1/marketplace/categories/${slug}`),
  },

  // Cart
  cart: {
    get: (): Promise<Cart> =>
      apiClient.get("/api/v1/marketplace/cart"),

    add: (data: AddToCartData): Promise<Cart> =>
      apiClient.post("/api/v1/marketplace/cart/items", data),

    remove: (itemId: number): Promise<Cart> =>
      apiClient.delete(`/api/v1/marketplace/cart/items/${itemId}`),

    clear: (): Promise<void> =>
      apiClient.delete("/api/v1/marketplace/cart"),

    applyCoupon: (code: string): Promise<Cart> =>
      apiClient.post("/api/v1/marketplace/cart/coupon", { code }),

    removeCoupon: (): Promise<Cart> =>
      apiClient.delete("/api/v1/marketplace/cart/coupon"),

    checkout: (data: CheckoutData): Promise<CheckoutResult> =>
      apiClient.post("/api/v1/marketplace/cart/checkout", data),
  },

  // Orders
  orders: {
    list: (params?: OrderListParams): Promise<PaginatedResponse<Order>> =>
      apiClient.get("/api/v1/marketplace/orders", params),

    get: (id: number): Promise<Order> =>
      apiClient.get(`/api/v1/marketplace/orders/${id}`),

    getByNumber: (orderNumber: string): Promise<Order> =>
      apiClient.get(`/api/v1/marketplace/orders/by-number/${orderNumber}`),

    cancel: (id: number): Promise<Order> =>
      apiClient.post(`/api/v1/marketplace/orders/${id}/cancel`),

    requestRefund: (id: number, reason?: string): Promise<Order> =>
      apiClient.post(`/api/v1/marketplace/orders/${id}/refund`, { reason }),
  },

  // Licenses
  licenses: {
    list: (params?: LicenseListParams): Promise<PaginatedResponse<License>> =>
      apiClient.get("/api/v1/marketplace/licenses", params),

    get: (id: number): Promise<License> =>
      apiClient.get(`/api/v1/marketplace/licenses/${id}`),

    getByKey: (key: string): Promise<License> =>
      apiClient.get(`/api/v1/marketplace/licenses/by-key/${key}`),

    activate: (id: number, data?: ActivateLicenseData): Promise<ActivationResult> =>
      apiClient.post(`/api/v1/marketplace/licenses/${id}/activate`, data),

    deactivate: (id: number, activationId: string): Promise<void> =>
      apiClient.post(`/api/v1/marketplace/licenses/${id}/deactivate`, { activation_id: activationId }),

    download: (id: number): Promise<{ download_url: string }> =>
      apiClient.get(`/api/v1/marketplace/licenses/${id}/download`),
  },

  // Reviews
  reviews: {
    list: (moduleSlug: string, params?: ReviewListParams): Promise<PaginatedResponse<Review>> =>
      apiClient.get(`/api/v1/marketplace/modules/${moduleSlug}/reviews`, params),

    create: (data: ReviewCreate): Promise<Review> =>
      apiClient.post("/api/v1/marketplace/reviews", data),

    update: (id: number, data: ReviewUpdate): Promise<Review> =>
      apiClient.patch(`/api/v1/marketplace/reviews/${id}`, data),

    delete: (id: number): Promise<void> =>
      apiClient.delete(`/api/v1/marketplace/reviews/${id}`),

    vote: (id: number, data: ReviewVote): Promise<Review> =>
      apiClient.post(`/api/v1/marketplace/reviews/${id}/vote`, data),

    getMine: (): Promise<Review[]> =>
      apiClient.get("/api/v1/marketplace/reviews/mine"),
  },

  // Publisher Dashboard
  publisher: {
    getProfile: (): Promise<PublisherProfile> =>
      apiClient.get("/api/v1/marketplace/publisher/profile"),

    updateProfile: (data: Partial<PublisherProfile>): Promise<PublisherProfile> =>
      apiClient.patch("/api/v1/marketplace/publisher/profile", data),

    getStats: (): Promise<PublisherStats> =>
      apiClient.get("/api/v1/marketplace/publisher/stats"),

    // Publisher modules
    listModules: (): Promise<PublisherModule[]> =>
      apiClient.get("/api/v1/marketplace/publisher/modules"),

    getModule: (id: number): Promise<PublisherModule> =>
      apiClient.get(`/api/v1/marketplace/publisher/modules/${id}`),

    createModule: (data: PublisherModuleCreate): Promise<PublisherModule> =>
      apiClient.post("/api/v1/marketplace/publisher/modules", data),

    updateModule: (id: number, data: PublisherModuleUpdate): Promise<PublisherModule> =>
      apiClient.patch(`/api/v1/marketplace/publisher/modules/${id}`, data),

    deleteModule: (id: number): Promise<void> =>
      apiClient.delete(`/api/v1/marketplace/publisher/modules/${id}`),

    submitForReview: (id: number): Promise<PublisherModule> =>
      apiClient.post(`/api/v1/marketplace/publisher/modules/${id}/submit`),

    uploadVersion: (moduleId: number, data: FormData): Promise<ModuleVersion> =>
      apiClient.post(`/api/v1/marketplace/publisher/modules/${moduleId}/versions`, data),

    uploadScreenshot: (moduleId: number, data: FormData): Promise<Screenshot> =>
      apiClient.post(`/api/v1/marketplace/publisher/modules/${moduleId}/screenshots`, data),

    deleteScreenshot: (moduleId: number, screenshotId: number): Promise<void> =>
      apiClient.delete(`/api/v1/marketplace/publisher/modules/${moduleId}/screenshots/${screenshotId}`),

    // Payouts
    listPayouts: (params?: PayoutListParams): Promise<PaginatedResponse<Payout>> =>
      apiClient.get("/api/v1/marketplace/publisher/payouts", params),

    requestPayout: (data: RequestPayoutData): Promise<Payout> =>
      apiClient.post("/api/v1/marketplace/publisher/payouts", data),
  },
};

export default marketplaceApi;
