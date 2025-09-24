'use client'

import * as React from 'react'
import { Plus, Loader2, Package } from 'lucide-react'

import { 
  Button,
  Badge,
  AdvancedSearch,
  type SearchState,
  type SearchFilter
} from '@/shared/components'
import { useAdvancedSearch } from '@/shared/hooks/useAdvancedSearch'
import { ProductsDataTable } from '@/shared/components/data-table/examples/ProductsDataTable'

import { 
  useProducts, 
  useDeleteProduct, useToggleProductStatus 
} from '@/modules/product/hooks/useProducts'
import { apiUtils } from '@/shared/services/api/client'
import type { Product } from '@/shared/services/api/product'

import { ProductCreateDialog } from '@/modules/product/components/ProductForm'
import { ProductEditDialog } from '@/modules/product/components/ProductForm'

type ProductsPageProps = Record<string, never>

const ProductsPage: React.FC<ProductsPageProps> = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null)

  const { data: productsData, isLoading: productsLoading, error: productsError } = useProducts()

  // Advanced search setup
  const availableFilters: Omit<SearchFilter, 'value'>[] = [
    {
      id: 'price',
      field: 'price',
      label: 'Price ($)',
      type: 'text'
    },
    {
      id: 'category',
      field: 'category',
      label: 'Category',
      type: 'select',
      options: [
        { value: 'Electronics', label: 'Electronics' },
        { value: 'Clothing', label: 'Clothing' },
        { value: 'Books', label: 'Books' },
        { value: 'Sports', label: 'Sports' },
        { value: 'Home & Garden', label: 'Home & Garden' }
      ]
    },
    {
      id: 'is_featured',
      field: 'is_featured',
      label: 'Featured Product',
      type: 'boolean'
    },
    {
      id: 'release_date',
      field: 'release_date',
      label: 'Release Date',
      type: 'date'
    },
    {
      id: 'status',
      field: 'is_active',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'true', label: 'Active' },
        { value: 'false', label: 'Inactive' }
      ]
    },
    {
      id: 'created_date',
      field: 'created_at',
      label: 'Created Date',
      type: 'daterange'
    },
  ]

  const availableSorts = [
    { field: 'name', label: 'Product Name' },
    { field: 'description', label: 'Description' },
    { field: 'price', label: 'Price ($)' },
    { field: 'category', label: 'Category' },
    { field: 'tags', label: 'Tags' },
    { field: 'is_featured', label: 'Featured Product' },
    { field: 'website_url', label: 'Product Website' },
    { field: 'release_date', label: 'Release Date' },
    { field: 'created_at', label: 'Created Date' },
    { field: 'updated_at', label: 'Last Modified' },
  ]

  const {
    searchState,
    updateSearchState,
    hasActiveSearch
  } = useAdvancedSearch({
    initialPageSize: 20,
    onSearch: (state: SearchState) => {
      console.log('Search state changed:', state)
    }
  })

  const deleteProductMutation = useDeleteProduct()
  const toggleStatusMutation = useToggleProductStatus()

  const handleProductEdit = React.useCallback((product: Product) => {
    setEditingProduct(product)
  }, [])

  const handleProductDelete = React.useCallback(async (product: Product) => {
    try {
      await deleteProductMutation.mutateAsync(product.id)
    } catch (error) {
      console.error('Failed to delete product:', error)
    }
  }, [deleteProductMutation])

  const handleProductView = React.useCallback((product: Product) => {
    console.log('View product:', product)
  }, [])

  const handleAddProduct = React.useCallback(() => {
    setIsCreateDialogOpen(true)
  }, [])

  const handleToggleStatus = React.useCallback(async (product: Product) => {
    try {
      await toggleStatusMutation.mutateAsync(product.id)
    } catch (error) {
      console.error('Failed to toggle product status:', error)
    }
  }, [toggleStatusMutation])

  const products = React.useMemo(() => productsData?.items || [], [productsData])
  
  const filteredProducts = React.useMemo(() => {
    if (!hasActiveSearch()) return products
    
    return products.filter(product => {
      if (searchState.query) {
        const query = searchState.query.toLowerCase()
        const searchableFields = [product.name, product.description]
        if (!searchableFields.some(field => 
          field && field.toString().toLowerCase().includes(query)
        )) {
          return false
        }
      }
      
      for (const filter of searchState.filters) {
        if (filter.value === undefined || filter.value === '') continue
        
        switch (filter.field) {
          case 'price':
            if (!product.price.toString().toLowerCase().includes(filter.value.toLowerCase())) return false
            break
          case 'category':
            if (product.category !== filter.value) return false
            break
          case 'is_featured':
            if (product.is_featured !== filter.value) return false
            break
          case 'release_date':
            if (filter.value?.from) {
              const fieldDate = new Date(product.release_date)
              const fromDate = new Date(filter.value.from)
              const toDate = filter.value.to ? new Date(filter.value.to) : new Date()
              if (fieldDate < fromDate || fieldDate > toDate) return false
            }
            break
          case 'is_active':
            if (product.is_active !== (filter.value === 'true')) return false
            break
        }
      }
      
      return true
    })
  }, [products, searchState, hasActiveSearch])

  const sortedProducts = React.useMemo(() => {
    if (!searchState.sort) return filteredProducts
    
    return [...filteredProducts].sort((a, b) => {
      const field = searchState.sort!.field
      const direction = searchState.sort!.direction
      
      let aValue: any = a[field as keyof Product]
      let bValue: any = b[field as keyof Product]
      
      if (field === 'created_at' || field === 'updated_at') {
        aValue = new Date(aValue)
        bValue = new Date(bValue)
      }
      
      if (aValue < bValue) return direction === 'asc' ? -1 : 1
      if (aValue > bValue) return direction === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredProducts, searchState.sort])

  if (productsError) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Failed to load products</h2>
          <p className="text-gray-600">{apiUtils.getErrorMessage(productsError)}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Products</h1>
              <p className="text-sm text-muted-foreground">
                Manage products in your inventory system. {products.length} total products.
              </p>
            </div>
          </div>

          <Button onClick={() => setIsCreateDialogOpen(true)} disabled={productsLoading}>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>

        <AdvancedSearch
          searchState={searchState}
          onSearchChange={updateSearchState}
          availableFilters={availableFilters}
          availableSorts={availableSorts}
          placeholder="Search products..."
          resultCount={sortedProducts.length}
          loading={productsLoading}
        />

        {productsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading products...</span>
          </div>
        ) : (
          <ProductsDataTable
            products={sortedProducts}
            onEditProduct={handleProductEdit}
            onDeleteProduct={handleProductDelete}
            onViewProduct={handleProductView}
            onAddProduct={handleAddProduct}
            onToggleStatus={handleToggleStatus}
            isLoading={productsLoading}
          />
        )}
      </div>

      <ProductCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
      
      <ProductEditDialog
        product={editingProduct}
        open={!!editingProduct}
        onOpenChange={(open) => !open && setEditingProduct(null)}
      />
    </div>
  )
}

export default ProductsPage
