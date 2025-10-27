"use client";

import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/shared/components";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { useWorkflowTypes, useUpdateWorkflowType } from "@/modules/workflow/hooks/useWorkflow";
import { ArrowLeft } from "lucide-react";

export default function EditWorkflowTypePage() {
  const router = useRouter();
  const params = useParams();
  const typeId = parseInt(params.id as string);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "",
    color: "",
    is_active: true,
  });

  const { data: typesData } = useWorkflowTypes();
  const updateMutation = useUpdateWorkflowType();

  useEffect(() => {
    if (typesData?.items) {
      const type = typesData.items.find(t => t.id === typeId);
      if (type) {
        setFormData({
          name: type.name,
          description: type.description || "",
          icon: type.icon || "",
          color: type.color || "",
          is_active: type.is_active,
        });
      }
    }
  }, [typesData, typeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync({ id: typeId, data: formData });
      router.push("/workflows");
    } catch (error) {
      console.error("Failed to update workflow type:", error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Workflows
        </Button>
        <h1 className="text-2xl font-bold">Edit Workflow Type</h1>
        <p className="text-gray-600 mt-2">
          Update the workflow type details.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            placeholder="e.g., Sales, Purchase, Invoice"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Describe this workflow type"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="icon">Icon</Label>
            <Input
              id="icon"
              placeholder="e.g., shopping-cart, file-text"
              value={formData.icon}
              onChange={(e) =>
                setFormData({ ...formData, icon: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <Input
              id="color"
              type="color"
              value={formData.color}
              onChange={(e) =>
                setFormData({ ...formData, color: e.target.value })
              }
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="is_active"
            checked={formData.is_active}
            onChange={(e) =>
              setFormData({ ...formData, is_active: e.target.checked })
            }
            className="rounded"
          />
          <Label htmlFor="is_active">Active</Label>
        </div>

        <div className="flex justify-end space-x-4 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? "Updating..." : "Update Type"}
          </Button>
        </div>
      </form>
    </div>
  );
}