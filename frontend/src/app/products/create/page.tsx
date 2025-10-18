"use client";

import { ArrowLeft, Package } from "lucide-react";
import { useRouter } from "next/navigation";
import { ProductForm } from "@/modules/product/components/ProductForm";
import { Button } from "@/shared/components";
// Product type imported but not used in component

export default function CreateProductPage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push("/products");
  };

  const handleCancel = () => {
    router.back();
  };

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
                Create New Product
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage products in your inventory system
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <ProductForm onSuccess={handleSuccess} onCancel={handleCancel} />
        </div>
      </div>
    </div>
  );
}
