'use client'

import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Package, Loader2 } from 'lucide-react'

import { Button } from '@/shared/components'
import { ProductForm } from '@/modules/product/components/ProductForm'
import { useProduct } from '@/modules/product/hooks/useProducts'
// Product type imported but not used in component

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = Number(params.id)

  const { data: product, isLoading, error } = useProduct(productId)

  const handleSuccess = () => {
    router.push('/products')
  }

  const handleCancel = () => {
    router.back()
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading product...</span>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-red-600 mb-2">
            {error ? 'Failed to load product' : 'Product not found'}
          </h2>
          <p className="text-gray-600 mb-4">
            {error ? 'Please try again later.' : 'The requested product could not be found.'}
          </p>
          <Button onClick={() => router.push('/products')}>
            Back to Products
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>

          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Edit Product #{product.id}
              </h1>
              <p className="text-sm text-muted-foreground">
                Update the product information below
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <ProductForm
            product={product}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </div>
  )
}
