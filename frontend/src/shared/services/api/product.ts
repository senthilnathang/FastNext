import { apiClient } from './client'
import { API_CONFIG } from './config'

// Product types
export interface Product {
  id: number
  created_at: string
  updated_at?: string
  is_active?: boolean
  name: string
  description?: string
  price: number
  category: 'Electronics' | 'Clothing' | 'Books' | 'Sports' | 'Home & Garden'
  tags?: string[]
  is_featured?: boolean
  website_url?: string
  release_date?: string
}

export interface CreateProductRequest {
  name: string
  price: number
  category: 'Electronics' | 'Clothing' | 'Books' | 'Sports' | 'Home & Garden'
  description?: string
  tags?: string[]
  is_featured?: boolean
  website_url?: string
  release_date?: string
  is_active?: boolean
}

export interface UpdateProductRequest {
  name?: string
  description?: string
  price?: number
  category?: 'Electronics' | 'Clothing' | 'Books' | 'Sports' | 'Home & Garden'
  tags?: string[]
  is_featured?: boolean
  website_url?: string
  release_date?: string
  is_active?: boolean
}

export interface ProductListParams {
  skip?: number
  limit?: number
  search?: string
  is_active?: boolean
  price?: string
  category?: string
  is_featured?: boolean
  release_date?: string
}

export interface ProductListResponse {
  items: Product[]
  total: number
  skip: number
  limit: number
}

// API functions
export const productsApi = {
  // Get paginated list
  getProducts: async (params?: ProductListParams): Promise<ProductListResponse> => {
    const searchParams = new URLSearchParams()
    
    if (params?.skip !== undefined) searchParams.set('skip', params.skip.toString())
    if (params?.limit !== undefined) searchParams.set('limit', params.limit.toString())
    if (params?.search) searchParams.set('search', params.search)
    if (params?.is_active !== undefined) searchParams.set('is_active', params.is_active.toString())
    if (params?.price) searchParams.set('price', params.price.toString())
    if (params?.category) searchParams.set('category', params.category.toString())
    if (params?.is_featured) searchParams.set('is_featured', params.is_featured.toString())
    if (params?.release_date) searchParams.set('release_date', params.release_date.toString())
    
    const url = `${API_CONFIG.API_BASE_URL}/products${searchParams.toString() ? '?' + searchParams.toString() : ''}`
    const response = await apiClient.get<ProductListResponse>(url)
    return response.data
  },

  // Get single item
  getProduct: async (id: number): Promise<Product> => {
    const response = await apiClient.get<Product>(`${API_CONFIG.API_BASE_URL}/products/${id}`)
    return response.data
  },

  // Create new item
  createProduct: async (data: CreateProductRequest): Promise<Product> => {
    const response = await apiClient.post<Product>(`${API_CONFIG.API_BASE_URL}/products`, data)
    return response.data
  },

  // Update existing item
  updateProduct: async (id: number, data: UpdateProductRequest): Promise<Product> => {
    const response = await apiClient.patch<Product>(`${API_CONFIG.API_BASE_URL}/products/${id}`, data)
    return response.data
  },

  // Delete item
  deleteProduct: async (id: number): Promise<void> => {
    await apiClient.delete(`${API_CONFIG.API_BASE_URL}/products/${id}`)
  },

  // Toggle active status
  toggleProductStatus: async (id: number): Promise<Product> => {
    const response = await apiClient.patch<Product>(`${API_CONFIG.API_BASE_URL}/products/${id}/toggle-status`)
    return response.data
  },
}
