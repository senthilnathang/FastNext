"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { Button } from "@/shared/components";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useWorkflowTemplate, useCreateWorkflowTemplate, useUpdateWorkflowTemplate } from "@/modules/workflow/hooks/useWorkflow";

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
  const queryClient = useQueryClient();
  const templateId = params.id && !isNaN(parseInt(params.id as string))
    ? parseInt(params.id as string)
    : undefined;

  // For now, use basic builder. In a real app, you might want to detect user preference
  const useAdvancedBuilder = false;

  const { data: templateData, isLoading: templateLoading } = useWorkflowTemplate(templateId || 0, {
    enabled: !!templateId,
  });

  const createMutation = useCreateWorkflowTemplate();
  const updateMutation = useUpdateWorkflowTemplate();

  const handleSave = async (nodes: any[], edges: any[]) => {
      console.log("handleSave called with:", { templateId, nodesCount: nodes.length, edgesCount: edges.length });
      console.log("Raw nodes sample:", nodes.slice(0, 1));
      console.log("Raw edges sample:", edges.slice(0, 1));

      try {
        if (!templateId) {
          console.error("Cannot save workflow: no templateId provided");
          alert("Cannot save: No template ID provided");
          return;
        }

        // Clean nodes and edges to remove ReactFlow-specific properties
        const cleanNodes = nodes.map(node => {
          // Ensure position has valid numbers
          const position = {
            x: typeof node.position?.x === 'number' ? node.position.x : 0,
            y: typeof node.position?.y === 'number' ? node.position.y : 0,
          };

          // Ensure data is serializable
          let cleanData;
          try {
            cleanData = JSON.parse(JSON.stringify(node.data));
          } catch (error) {
            console.error("Node data serialization failed:", node.id, error);
            cleanData = {};
          }

          return {
            id: node.id,
            type: node.type,
            position,
            data: cleanData,
          };
        });

        const cleanEdges = edges.map(edge => {
          // Ensure data is serializable
          let cleanData;
          try {
            cleanData = JSON.parse(JSON.stringify(edge.data));
          } catch (error) {
            console.error("Edge data serialization failed:", edge.id, error);
            cleanData = {};
          }

          return {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
            type: edge.type,
            animated: edge.animated,
            data: cleanData,
          };
        });

        console.log("Cleaned nodes sample:", cleanNodes.slice(0, 1));
        console.log("Cleaned edges sample:", cleanEdges.slice(0, 1));

        // Validate data before sending
        const nodeIds = new Set(cleanNodes.map(n => n.id));
        if (nodeIds.size !== cleanNodes.length) {
          console.error("Duplicate node IDs detected");
          toast.error("Cannot save: Duplicate node IDs detected");
          return;
        }

        const edgeIds = new Set(cleanEdges.map(e => e.id));
        if (edgeIds.size !== cleanEdges.length) {
          console.error("Duplicate edge IDs detected");
          toast.error("Cannot save: Duplicate edge IDs detected");
          return;
        }

        // Check if all edge sources and targets exist
        const invalidEdges = cleanEdges.filter(e => !nodeIds.has(e.source) || !nodeIds.has(e.target));
        if (invalidEdges.length > 0) {
          console.error("Invalid edges detected:", invalidEdges);
          toast.error("Cannot save: Invalid edges detected");
          return;
        }

        const result = await updateMutation.mutateAsync({
        id: templateId,
        data: {
          nodes: cleanNodes,
          edges: cleanEdges,
        },
      });

      console.log("Save successful:", result);
      toast.success("Workflow template saved successfully!");

      // Force a refetch of the template data to ensure UI is in sync
      queryClient.invalidateQueries({ queryKey: ["workflow-template", templateId] });
    } catch (error) {
      console.error("Failed to save workflow template:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Failed to save workflow template: ${errorMessage}`);
    }
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
      </div>

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
            key={templateId || 'new'}
            templateId={templateId}
            readOnly={false}
            onSave={handleSave}
            isSaving={updateMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}