'use client'

import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Package, Pencil, Trash2, Loader2 } from 'lucide-react'

import { Button, Badge, Card, CardContent, CardHeader, CardTitle } from '@/shared/components'
import { useProduct, useDeleteProduct } from '@/modules/product/hooks/useProducts'
import { useConfirmationDialog } from '@/shared/components/feedback/ConfirmationDialog'

export default function ViewProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = Number(params.id)

  const { data: product, isLoading, error } = useProduct(productId)
  const deleteProductMutation = useDeleteProduct()
  const { confirmDelete, ConfirmationDialog } = useConfirmationDialog()

  const handleEdit = () => {
    router.push(`/products/${productId}/edit`)
  }

  const handleDelete = () => {
    if (!product) return
    
    confirmDelete('product', product.id.toString(), async () => {
      try {
        await deleteProductMutation.mutateAsync(product.id)
        router.push('/products')
      } catch (error) {
        console.error('Failed to delete product:', error)
      }
    })
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading product...</span>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
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
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
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
                  Product #{product.id}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Manage products in your inventory system
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button onClick={handleEdit} className="flex items-center space-x-2">
              <Pencil className="h-4 w-4" />
              <span>Edit</span>
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              className="flex items-center space-x-2"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete</span>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Product Name</label>
                <div className="mt-1">
                  {product.name}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <div className="mt-1">
                  {product.description}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Price ($)</label>
                <div className="mt-1">
                  {product.price}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Category</label>
                <div className="mt-1">
                  
                  <Badge variant="outline">
                    {product.category}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Tags</label>
                <div className="mt-1">
                  
                  <div className="flex flex-wrap gap-1">
                    {product.tags.map((item, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Featured Product</label>
                <div className="mt-1">
                  
                  <Badge variant={product.is_featured ? 'default' : 'secondary'}>
                    {product.is_featured ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Product Website</label>
                <div className="mt-1">
                  
                  <a 
                    href={product.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {product.website_url}
                  </a>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Release Date</label>
                <div className="mt-1">
                  {new Date(product.release_date).toLocaleDateString()}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created At</label>
                <p className="text-sm">
                  {new Date(product.created_at).toLocaleString()}
                </p>
              </div>
              
              {product.updated_at && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                  <p className="text-sm">
                    {new Date(product.updated_at).toLocaleString()}
                  </p>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="mt-1">
                  <Badge variant={product.is_active ? 'default' : 'secondary'}>
                    {product.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">ID</label>
                <p className="text-sm font-mono">{product.id}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmationDialog />
    </div>
  )
}
