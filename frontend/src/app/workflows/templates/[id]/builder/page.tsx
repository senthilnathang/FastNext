"use client";

import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { Button } from "@/shared/components";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { ArrowLeft, ChevronDown, ChevronUp, Save } from "lucide-react";
import { useWorkflowTemplate, useWorkflowTypes, useUpdateWorkflowTemplate } from "@/modules/workflow/hooks/useWorkflow";

// Lazy load heavy workflow components
const WorkflowBuilder = dynamic(
  () =>
    import("@/modules/workflow").then((mod) => ({
      default: mod.WorkflowBuilder,
    })),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8">
        Loading Workflow Builder...
      </div>
    ),
    ssr: false,
  },
);

const AdvancedWorkflowBuilder = dynamic(
  () => import("@/modules/workflow/components/AdvancedWorkflowBuilder"),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8">
        Loading Advanced Workflow Builder...
      </div>
    ),
    ssr: false,
  },
);

export default function WorkflowBuilderPage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.id ? parseInt(params.id as string) : undefined;

  const [showDetails, setShowDetails] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    workflow_type_id: "",
  });

  // For now, use basic builder. In a real app, you might want to detect user preference
  const useAdvancedBuilder = false;

  const { data: templateData, isLoading: templateLoading } = useWorkflowTemplate(templateId || 0);
  const { data: typesData } = useWorkflowTypes();
  const updateMutation = useUpdateWorkflowTemplate();

  // Update form data when template loads
  useEffect(() => {
    if (templateData) {
      setFormData({
        name: templateData.name || "",
        description: templateData.description || "",
        workflow_type_id: templateData.workflow_type?.id?.toString() || "",
      });
    }
  }, [templateData]);

  const handleUpdateTemplate = async () => {
    if (!templateId) return;

    try {
      await updateMutation.mutateAsync({
        id: templateId,
        data: {
          name: formData.name,
          description: formData.description,
        },
      });
    } catch (error) {
      console.error("Failed to update template:", error);
    }
  };

  const handleSave = () => {
    // Navigate back to workflows after save
    router.push("/workflows/templates");
  };

  if (templateLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading workflow template...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-xl font-semibold">
              {templateData?.name || `Workflow Template #${templateId}`}
            </h1>
            <p className="text-sm text-gray-600">
              Design your workflow using the visual builder
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Details
          </Button>
          <Button
            onClick={handleUpdateTemplate}
            disabled={updateMutation.isPending}
            size="sm"
          >
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending ? "Saving..." : "Save Details"}
          </Button>
        </div>
      </div>

      {showDetails && (
        <div className="p-4 border-b bg-gray-50">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Standard Sales Process"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe this workflow template"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="workflow_type">Workflow Type</Label>
              <Select
                value={formData.workflow_type_id}
                onValueChange={(value) => setFormData({ ...formData, workflow_type_id: value })}
                disabled
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
          </div>
        </div>
      )}

      <div className="flex-1">
        {useAdvancedBuilder ? (
          <AdvancedWorkflowBuilder
            templateId={templateId}
            readOnly={false}
            enableAdvancedFeatures={true}
            onSave={handleSave}
          />
        ) : (
          <WorkflowBuilder
            templateId={templateId}
            readOnly={false}
            onSave={handleSave}
          />
        )}
      </div>
    </div>
  );
}