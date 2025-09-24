'use client'

import * as React from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, ArrowUpDown, Pencil, Trash2, Eye, Package } from 'lucide-react'
import { DataTable } from '../DataTable'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Badge } from '@/shared/components/ui/badge'
import { useDataTableExport } from '../hooks/useDataTableExport'
import { useConfirmationDialog } from '@/shared/components/feedback/ConfirmationDialog'
import type { ExportOptions } from '../types'

// Define the Product type for DataTable
export interface Product {
  id: number
  name: string
  description?: string
  price: number
  category: 'Electronics' | 'Clothing' | 'Books' | 'Sports' | 'Home & Garden'
  tags?: string[]
  is_featured?: boolean
  website_url?: string
  release_date?: string
  created_at: string
  updated_at?: string
  is_active?: boolean
}

interface ProductsDataTableProps {
  products?: Product[]
  onEditProduct?: (product: Product) => void
  onDeleteProduct?: (product: Product) => void
  onViewProduct?: (product: Product) => void
  onAddProduct?: () => void
  onToggleStatus?: (product: Product) => void
  isLoading?: boolean
}

export function ProductsDataTable({
  products = [],
  onEditProduct,
  onDeleteProduct,
  onViewProduct,
  onAddProduct,
  onToggleStatus,
  isLoading = false,
}: ProductsDataTableProps) {
  const [selectedProducts, setSelectedProducts] = React.useState<Product[]>([])
  const { confirmBulkDelete, ConfirmationDialog } = useConfirmationDialog()

  // Define columns
  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Product Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-medium">
          {row.getValue('name')}
        </div>
      ),
    },
    {
      accessorKey: 'price',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Price ($)
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-medium">
          {row.getValue('price')}
        </div>
      ),
    },
    {
      accessorKey: 'category',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Category
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.getValue('category')}
        </Badge>
      ),
    },
    {
      accessorKey: 'tags',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Tags
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const tags = row.getValue('tags') as string[] | undefined
        return (
          <div className="flex flex-wrap gap-1">
            {tags ? tags.map((item, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {item}
              </Badge>
            )) : <span className="text-sm text-muted-foreground">No tags</span>}
          </div>
        )
      },
    },
    {
      accessorKey: 'is_featured',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Featured Product
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const isFeatured = row.getValue('is_featured') as boolean | undefined
        return (
          <Badge variant={isFeatured ? 'default' : 'secondary'}>
            {isFeatured ? 'Yes' : 'No'}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'release_date',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Release Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const releaseDate = row.getValue('release_date') as string | undefined
        return (
          <div className="text-sm">
            {releaseDate ? new Date(releaseDate).toLocaleDateString() : 'Not set'}
          </div>
        )
      },
    },
    {
      accessorKey: 'created_at',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Created
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = new Date(row.getValue('created_at'))
        return (
          <div className="text-sm">
            <div>{date.toLocaleDateString()}</div>
            <div className="text-muted-foreground">{date.toLocaleTimeString()}</div>
          </div>
        )
      },
    },
    {
      accessorKey: 'updated_at',
      header: 'Last Modified',
      cell: ({ row }) => {
        const date = row.original.updated_at ? new Date(row.original.updated_at) : null
        return (
          <div className="text-sm">
            {date ? (
              <>
                <div>{date.toLocaleDateString()}</div>
                <div className="text-muted-foreground">{date.toLocaleTimeString()}</div>
              </>
            ) : (
              <span className="text-muted-foreground">Never</span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => {
        const isActive = row.getValue('is_active') as boolean | undefined
        return (
          <Badge variant={isActive ? 'default' : 'secondary'}>
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        )
      },
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const product = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(product.id.toString())}
              >
                Copy ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {onViewProduct && (
                <DropdownMenuItem onClick={() => onViewProduct(product)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View details
                </DropdownMenuItem>
              )}
              {onEditProduct && (
                <DropdownMenuItem onClick={() => onEditProduct(product)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit product
                </DropdownMenuItem>
              )}
              {onToggleStatus && (
                <DropdownMenuItem onClick={() => onToggleStatus(product)}>
                  <Package className="mr-2 h-4 w-4" />
                  {product.is_active ? 'Deactivate' : 'Activate'}
                </DropdownMenuItem>
              )}
              {onDeleteProduct && (
                <DropdownMenuItem
                  onClick={() => onDeleteProduct(product)}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete product
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  // Column definitions for column selector
  const columnDefinitions = [
    { id: 'id', label: 'ID' },
    { id: 'name', label: 'Product Name' },
    { id: 'price', label: 'Price ($)' },
    { id: 'category', label: 'Category' },
    { id: 'tags', label: 'Tags' },
    { id: 'is_featured', label: 'Featured Product' },
    { id: 'release_date', label: 'Release Date' },
    { id: 'created_at', label: 'Created' },
    { id: 'updated_at', label: 'Last Modified' },
    { id: 'is_active', label: 'Status' },
    { id: 'actions', label: 'Actions', canHide: false },
  ]

  // Export functionality
  const exportColumns = [
    { id: 'id', label: 'ID', accessor: 'id' },
    { id: 'name', label: 'Product Name', accessor: 'name' },
    { id: 'description', label: 'Description', accessor: 'description' },
    { id: 'price', label: 'Price ($)', accessor: 'price' },
    { id: 'category', label: 'Category', accessor: 'category' },
    { id: 'tags', label: 'Tags', accessor: 'tags' },
    { id: 'is_featured', label: 'Featured Product', accessor: 'is_featured' },
    { id: 'website_url', label: 'Product Website', accessor: 'website_url' },
    { id: 'release_date', label: 'Release Date', accessor: 'release_date' },
    { id: 'created_at', label: 'Created Date', accessor: 'created_at' },
    { id: 'updated_at', label: 'Last Modified', accessor: 'updated_at' },
    { id: 'is_active', label: 'Active', accessor: 'is_active' },
  ]

  const { exportData } = useDataTableExport({
    data: products,
    columns: exportColumns,
    selectedRows: selectedProducts,
  })

  const handleDeleteSelected = async (selectedProducts: Product[]) => {
    if (!onDeleteProduct) return

    confirmBulkDelete('product', selectedProducts.length, async () => {
      for (const product of selectedProducts) {
        await onDeleteProduct(product)
      }
    })
  }

  const handleExport = () => {
    const options: ExportOptions = {
      format: 'csv',
      filename: `products-${new Date().toISOString().split('T')[0]}.csv`,
      selectedOnly: selectedProducts.length > 0,
    }
    exportData(options)
  }

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={products}
        searchableColumns={['name', 'description']}
        enableRowSelection={true}
        enableSorting={true}
        enableFiltering={true}
        enableColumnVisibility={true}
        onRowSelectionChange={setSelectedProducts}
        onDeleteSelected={onDeleteProduct ? handleDeleteSelected : undefined}
        onExport={handleExport}
        onAdd={onAddProduct}
        pageSize={10}
        isLoading={isLoading}
        emptyMessage="No products found."
        columnDefinitions={columnDefinitions}
      />
      <ConfirmationDialog />
    </div>
  )
}

// Example usage component
export function ProductsDataTableExample() {
  const handleEditProduct = (product: Product) => {
    console.log('Edit product:', product)
    // TODO: Implement edit functionality
  }

  const handleDeleteProduct = (product: Product) => {
    console.log('Delete product:', product)
    // TODO: Implement delete functionality
  }

  const handleViewProduct = (product: Product) => {
    console.log('View product:', product)
    // TODO: Implement view functionality
  }

  const handleAddProduct = () => {
    console.log('Add new product')
    // TODO: Implement add functionality
  }

  const handleToggleStatus = (product: Product) => {
    console.log('Toggle product status:', product)
    // TODO: Implement status toggle
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Products Management</h2>
          <p className="text-muted-foreground">
            Manage products in your inventory system
          </p>
        </div>
      </div>
      
      <ProductsDataTable
        onEditProduct={handleEditProduct}
        onDeleteProduct={handleDeleteProduct}
        onViewProduct={handleViewProduct}
        onAddProduct={handleAddProduct}
        onToggleStatus={handleToggleStatus}
      />
    </div>
  )
}
