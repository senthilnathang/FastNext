"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/shared/components";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useCreateWorkflowTemplate, useWorkflowTypes } from "@/modules/workflow/hooks/useWorkflow";
import { ArrowLeft, Play } from "lucide-react";

export default function CreateWorkflowTemplatePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    workflow_type_id: "",
  });

  const { data: typesData } = useWorkflowTypes();
  const createMutation = useCreateWorkflowTemplate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newTemplate = await createMutation.mutateAsync({
        ...formData,
        workflow_type_id: parseInt(formData.workflow_type_id),
      });
      // Go directly to builder with the new template
      router.push(`/workflows/templates/${newTemplate.id}/builder`);
    } catch (error) {
      console.error("Failed to create workflow template:", error);
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
        <h1 className="text-2xl font-bold">Create Workflow Template</h1>
        <p className="text-gray-600 mt-2">
          Set up your workflow details and start building immediately.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            placeholder="e.g., Standard Sales Process"
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
            placeholder="Describe this workflow template"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="workflow_type">Workflow Type *</Label>
          <Select
            value={formData.workflow_type_id}
            onValueChange={(value) =>
              setFormData({ ...formData, workflow_type_id: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a workflow type" />
            </SelectTrigger>
            <SelectContent>
              {typesData?.items?.map((type) => (
                <SelectItem key={type.id} value={type.id.toString()}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            disabled={createMutation.isPending || !formData.name || !formData.workflow_type_id}
          >
            <Play className="h-4 w-4 mr-2" />
            {createMutation.isPending ? "Creating..." : "Create & Start Building"}
          </Button>
        </div>
      </form>
    </div>
  );
}