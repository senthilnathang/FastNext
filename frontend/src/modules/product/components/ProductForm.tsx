"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Package } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  useCreateProduct,
  useUpdateProduct,
} from "@/modules/product/hooks/useProducts";

import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from "@/shared/components";
import type { Product } from "@/shared/services/api/product";
import { cn } from "@/shared/utils";

// Zod schema for form validation
const productSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters"),
  description: z.string().optional(),
  price: z.number().min(0),
  category: z.enum([
    "Electronics",
    "Clothing",
    "Books",
    "Sports",
    "Home & Garden",
  ]),
  sku: z.string().optional(),
  stock_quantity: z.number().min(0).optional(),
  is_featured: z.boolean().optional(),
  launch_date: z.string().optional(),
  specifications: z.record(z.string(), z.any()).optional(),
  website_url: z.string().optional(),
  support_email: z.string().optional(),
  category_id: z.number().optional().nullable(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  product?: Product;
  onSuccess?: (product: Product) => void;
  onCancel?: () => void;
  className?: string;
}

export function ProductForm({
  product,
  onSuccess,
  onCancel,
  className,
}: ProductFormProps) {
  const isEditing = Boolean(product);
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      category: "Electronics",
      sku: undefined,
      stock_quantity: 0,
      is_featured: false,
      launch_date: undefined,
      specifications: undefined,
      website_url: undefined,
      support_email: undefined,
      category_id: null,
    },
  });

  React.useEffect(() => {
    if (product) {
      form.reset({
        name: product.name || "",
        description: product.description || undefined,
        price: product.price || 0,
        category: product.category || "Electronics",
        sku: product.sku || undefined,
        stock_quantity: product.stock_quantity || 0,
        is_featured: product.is_featured || false,
        launch_date: product.launch_date || undefined,
        specifications: product.specifications || undefined,
        website_url: product.website_url || undefined,
        support_email: product.support_email || undefined,
        category_id: product.category_id || null,
      });
    }
  }, [product, form]);

  const onSubmit = async (data: ProductFormData) => {
    try {
      // Clean up the data before sending
      const cleanedData = {
        ...data,
        // Convert empty strings to undefined for optional fields
        description: data.description?.trim() || undefined,
        sku: data.sku?.trim() || undefined,
        launch_date: data.launch_date?.trim() || undefined,
        specifications: data.specifications && Object.keys(data.specifications).length > 0 ? data.specifications : undefined,
        website_url: data.website_url?.trim() || undefined,
        support_email: data.support_email?.trim() || undefined,
        category_id: data.category_id || undefined,
      };

      let result: Product;

      if (isEditing && product) {
        result = await updateMutation.mutateAsync({
          id: product.id,
          data: cleanedData as any,
        });
      } else {
        result = await createMutation.mutateAsync(cleanedData as any);
      }

      onSuccess?.(result);

      if (!isEditing) {
        form.reset();
      }
    } catch (error) {
      console.error(
        `Failed to ${isEditing ? "update" : "create"} product:`,
        error,
      );
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Package className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">
            {isEditing
              ? `Edit ${product?.id ? `Product #${product.id}` : "Product"}`
              : "Create New Product"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isEditing
              ? "Update the product information below"
              : "Manage products in your inventory system"}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Name *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Enter product name..."
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>
                  Product name must be at least 2 characters
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Enter product description..."
                    disabled={isSubmitting}
                    rows={3}
                  />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price ($) *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    placeholder="Enter price ($)..."
                    disabled={isSubmitting}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? Number(e.target.value) : 0,
                      )
                    }
                  />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isSubmitting}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Electronics">Electronics</SelectItem>
                    <SelectItem value="Clothing">Clothing</SelectItem>
                    <SelectItem value="Books">Books</SelectItem>
                    <SelectItem value="Sports">Sports</SelectItem>
                    <SelectItem value="Home & Garden">Home & Garden</SelectItem>
                  </SelectContent>
                </Select>

                <FormMessage />
              </FormItem>
            )}
           />

            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter product SKU..."
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>
                    Unique Stock Keeping Unit identifier (optional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

           <FormField
             control={form.control}
             name="stock_quantity"
             render={({ field }) => (
               <FormItem>
                 <FormLabel>Stock Quantity</FormLabel>
                 <FormControl>
                   <Input
                     {...field}
                     type="number"
                     placeholder="Enter stock quantity..."
                     disabled={isSubmitting}
                     onChange={(e) =>
                       field.onChange(
                         e.target.value ? Number(e.target.value) : 0,
                       )
                     }
                   />
                 </FormControl>
                 <FormMessage />
               </FormItem>
             )}
           />



          <FormField
            control={form.control}
            name="is_featured"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Featured Product</FormLabel>
                <FormControl>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
                    />
                    <span className="text-sm">
                      {field.value ? "Yes" : "No"}
                    </span>
                  </div>
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="website_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Website</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="url"
                    placeholder="Enter product website..."
                    disabled={isSubmitting}
                  />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />

           <FormField
             control={form.control}
             name="launch_date"
             render={({ field }) => (
               <FormItem>
                 <FormLabel>Launch Date</FormLabel>
                 <FormControl>
                   <Input {...field} type="date" disabled={isSubmitting} />
                 </FormControl>

                 <FormMessage />
               </FormItem>
             )}
           />

           <FormField
             control={form.control}
             name="support_email"
             render={({ field }) => (
               <FormItem>
                 <FormLabel>Support Email</FormLabel>
                 <FormControl>
                   <Input
                     {...field}
                     type="email"
                     placeholder="support@example.com"
                     disabled={isSubmitting}
                   />
                 </FormControl>
                 <FormMessage />
               </FormItem>
             )}
           />

          <div className="flex items-center justify-end space-x-2 pt-4 border-t">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isSubmitting
                ? isEditing
                  ? "Updating..."
                  : "Creating..."
                : isEditing
                  ? "Update Product"
                  : "Create Product"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

interface ProductCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (product: Product) => void;
}

export function ProductCreateDialog({
  open,
  onOpenChange,
  onSuccess,
}: ProductCreateDialogProps) {
  const handleSuccess = (product: Product) => {
    onOpenChange(false);
    onSuccess?.(product);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Product</DialogTitle>
          <DialogDescription>
            Manage products in your inventory system
          </DialogDescription>
        </DialogHeader>

        <ProductForm
          onSuccess={handleSuccess}
          onCancel={() => onOpenChange(false)}
          className="border-0"
        />
      </DialogContent>
    </Dialog>
  );
}

interface ProductEditDialogProps {
  product?: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (product: Product) => void;
}

export function ProductEditDialog({
  product,
  open,
  onOpenChange,
  onSuccess,
}: ProductEditDialogProps) {
  const handleSuccess = (updatedProduct: Product) => {
    onOpenChange(false);
    onSuccess?.(updatedProduct);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            Update the product information below.
          </DialogDescription>
        </DialogHeader>

        <ProductForm
          product={product}
          onSuccess={handleSuccess}
          onCancel={() => onOpenChange(false)}
          className="border-0"
        />
      </DialogContent>
    </Dialog>
  );
}
