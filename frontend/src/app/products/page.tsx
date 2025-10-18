"use client";

import {
  Calendar,
  DollarSign,
  ExternalLink,
  Globe,
  Package,
  Star,
} from "lucide-react";
import type * as React from "react";
import { useCallback, useMemo, useState } from "react";
import {
  ProductCreateDialog,
  ProductEditDialog,
} from "@/modules/product/components/ProductForm";
import {
  useDeleteProduct,
  useProducts,
  useToggleProductStatus,
} from "@/modules/product/hooks/useProducts";
import { Badge } from "@/shared/components/ui/badge";
import type { Column, ViewConfig } from "@/shared/components/views";
import { ViewManager } from "@/shared/components/views";
import { apiUtils } from "@/shared/services/api/client";
import type { Product } from "@/shared/services/api/product";

type ProductsPageProps = Record<string, never>;

const ProductsPage: React.FC<ProductsPageProps> = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(
    undefined,
  );
  const [selectedItems, setSelectedItems] = useState<Product[]>([]);
  const [activeView, setActiveView] = useState("products-list");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [groupBy, setGroupBy] = useState("");

  const {
    data: productsData,
    isLoading: productsLoading,
    error: productsError,
  } = useProducts();

  const deleteProductMutation = useDeleteProduct();
  const toggleStatusMutation = useToggleProductStatus();

  // Define columns for ViewManager
  const columns: Column<Product>[] = useMemo(
    () => [
      {
        id: "name",
        key: "name",
        label: "Product Name",
        sortable: true,
        searchable: true,
        render: (value, product) => (
          <div className="flex items-center space-x-3">
            <Package className="h-4 w-4 text-blue-600" />
            <div>
              <div className="font-medium">{String(value)}</div>
              <div className="text-sm text-muted-foreground">
                {product.description || "No description"}
              </div>
            </div>
          </div>
        ),
      },
      {
        id: "price",
        key: "price",
        label: "Price",
        sortable: true,
        filterable: true,
        type: "number",
        render: (value) => (
          <div className="flex items-center space-x-1">
            <DollarSign className="h-3 w-3 text-green-600" />
            <span className="font-medium">${String(value)}</span>
          </div>
        ),
      },
      {
        id: "category",
        key: "category",
        label: "Category",
        sortable: true,
        filterable: true,
        type: "select",
        filterOptions: [
          { label: "Electronics", value: "Electronics" },
          { label: "Clothing", value: "Clothing" },
          { label: "Books", value: "Books" },
          { label: "Sports", value: "Sports" },
          { label: "Home & Garden", value: "Home & Garden" },
        ],
        render: (value) => <Badge variant="outline">{String(value)}</Badge>,
      },
      {
        id: "is_featured",
        key: "is_featured",
        label: "Featured",
        sortable: true,
        filterable: true,
        type: "boolean",
        filterOptions: [
          { label: "Featured", value: true },
          { label: "Regular", value: false },
        ],
        render: (value) => (
          <div className="flex items-center space-x-1">
            {value ? (
              <Star className="h-4 w-4 text-yellow-500 fill-current" />
            ) : (
              <Star className="h-4 w-4 text-gray-300" />
            )}
          </div>
        ),
      },
      {
        id: "is_active",
        key: "is_active",
        label: "Status",
        sortable: true,
        filterable: true,
        type: "select",
        filterOptions: [
          { label: "Active", value: true },
          { label: "Inactive", value: false },
        ],
        render: (value) => (
          <Badge variant={value ? "default" : "secondary"}>
            {value ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        id: "website_url",
        key: "website_url",
        label: "Website",
        render: (value) =>
          value ? (
            <a
              href={String(value)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
            >
              <ExternalLink className="h-3 w-3" />
              <span>Visit</span>
            </a>
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
      },
      {
        id: "created_at",
        key: "created_at",
        label: "Created",
        sortable: true,
        type: "date",
        render: (value) => (
          <div className="flex items-center space-x-1">
            <Calendar className="h-3 w-3 text-gray-500" />
            <span className="text-sm">
              {new Date(String(value)).toLocaleDateString()}
            </span>
          </div>
        ),
      },
    ],
    [],
  );

  // Define views
  const views: ViewConfig[] = useMemo(
    () => [
      {
        id: "products-list",
        name: "List View",
        type: "list",
        columns,
        filters: {},
        sortBy: "created_at",
        sortOrder: "desc",
      },
      {
        id: "products-cards",
        name: "Card View",
        type: "card",
        columns,
        filters: {},
      },
    ],
    [columns],
  );

  // Define sort options
  const sortOptions = [
    { key: "name", label: "Product Name", defaultOrder: "asc" as const },
    { key: "price", label: "Price", defaultOrder: "desc" as const },
    { key: "category", label: "Category", defaultOrder: "asc" as const },
    { key: "created_at", label: "Created Date", defaultOrder: "desc" as const },
    {
      key: "updated_at",
      label: "Last Modified",
      defaultOrder: "desc" as const,
    },
  ];

  // Define group options
  const groupOptions = [
    {
      key: "category",
      label: "Category",
      icon: <Package className="h-4 w-4" />,
    },
    {
      key: "is_featured",
      label: "Featured Status",
      icon: <Star className="h-4 w-4" />,
    },
    { key: "is_active", label: "Status", icon: <Globe className="h-4 w-4" /> },
  ];

  // Define bulk actions
  const bulkActions = [
    {
      label: "Delete Selected",
      icon: <Package className="h-4 w-4" />,
      action: async (items: Product[]) => {
        for (const item of items) {
          await deleteProductMutation.mutateAsync(item.id);
        }
        setSelectedItems([]);
      },
    },
    {
      label: "Toggle Status",
      icon: <Globe className="h-4 w-4" />,
      action: async (items: Product[]) => {
        for (const item of items) {
          await toggleStatusMutation.mutateAsync(item.id);
        }
        setSelectedItems([]);
      },
    },
  ];

  const handleProductEdit = useCallback((product: Product) => {
    setEditingProduct(product);
  }, []);

  const handleProductDelete = useCallback(
    async (product: Product) => {
      try {
        await deleteProductMutation.mutateAsync(product.id);
      } catch (error) {
        console.error("Failed to delete product:", error);
      }
    },
    [deleteProductMutation],
  );

  const handleProductView = useCallback((_product: Product) => {}, []);

  const handleCreateProduct = useCallback(() => {
    setIsCreateDialogOpen(true);
  }, []);

  const handleExport = useCallback(
    (_format: "csv" | "json" | "excel") => {},
    [],
  );

  const handleImport = useCallback((_file: File) => {}, []);

  const products = useMemo(() => productsData?.items || [], [productsData]);

  if (productsError) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-red-600 mb-2">
            Failed to load products
          </h2>
          <p className="text-gray-600">
            {apiUtils.getErrorMessage(productsError)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <ViewManager
        title="Products"
        subtitle="Manage your product inventory and catalog"
        data={products}
        columns={columns as any}
        views={views}
        activeView={activeView}
        onViewChange={setActiveView}
        // Search & Filtering
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filters}
        onFiltersChange={setFilters}
        // Sorting & Grouping
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={(field, order) => {
          setSortBy(field);
          setSortOrder(order);
        }}
        sortOptions={sortOptions}
        groupBy={groupBy}
        onGroupChange={setGroupBy}
        groupOptions={groupOptions}
        // Selection & Actions
        selectedItems={selectedItems}
        onSelectionChange={setSelectedItems as any}
        selectable={true}
        bulkActions={bulkActions as any}
        // CRUD Operations
        onCreateClick={handleCreateProduct}
        onEditClick={handleProductEdit as any}
        onDeleteClick={handleProductDelete as any}
        onViewClick={handleProductView as any}
        // Export/Import
        onExport={handleExport}
        onImport={handleImport}
        // Loading & Error states
        loading={productsLoading}
        error={productsError ? apiUtils.getErrorMessage(productsError) : null}
        // UI Configuration
        showToolbar={true}
        showSearch={true}
        showFilters={true}
        showExport={true}
        showImport={true}
        showColumnSelector={true}
        showViewSelector={true}
      />

      <ProductCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      <ProductEditDialog
        product={editingProduct}
        open={!!editingProduct}
        onOpenChange={(open) => !open && setEditingProduct(undefined)}
      />
    </div>
  );
};

export default ProductsPage;
