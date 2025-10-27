"use client";

import {
  Edit,
  Eye,
  GitBranch,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type React from "react";
import { useState } from "react";
import {
  useDeleteWorkflowTemplate,
  useWorkflowTemplates,
} from "@/modules/workflow/hooks/useWorkflow";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components";
import { formatDistanceToNow } from "date-fns";

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

export default function WorkflowTemplatesPage() {
  const router = useRouter();
  const [deleteTemplateDialogOpen, setDeleteTemplateDialogOpen] =
    useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<any>(null);
  const [useAdvancedBuilder, setUseAdvancedBuilder] = useState(true);

  const { data: templatesData, isLoading: templatesLoading } =
    useWorkflowTemplates();
  const deleteTemplateMutation = useDeleteWorkflowTemplate();

  const workflowTemplates = templatesData?.items || [];

  const handleDeleteTemplate = (template: any) => {
    setTemplateToDelete(template);
    setDeleteTemplateDialogOpen(true);
  };

  const confirmDeleteTemplate = async () => {
    if (!templateToDelete) return;
    try {
      await deleteTemplateMutation.mutateAsync(templateToDelete.id);
      setDeleteTemplateDialogOpen(false);
      setTemplateToDelete(null);
    } catch (error) {
      console.error("Failed to delete workflow template:", error);
    }
  };

  const openBuilder = (templateId?: number) => {
    if (templateId) {
      router.push(`/workflows/templates/${templateId}/builder`);
    } else {
      router.push("/workflows/templates/create");
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Workflow Templates</h1>
        <p className="text-gray-600 mt-2">
          Create and manage workflow templates for your business processes.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Workflow Templates</h2>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => openBuilder()}>
              <GitBranch className="h-4 w-4 mr-2" />
              {useAdvancedBuilder ? "Advanced Builder" : "New Template"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setUseAdvancedBuilder(!useAdvancedBuilder)}
              className="text-xs"
            >
              {useAdvancedBuilder ? "Basic" : "Advanced"}
            </Button>
          </div>
        </div>

        {templatesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse" variant="flat">
                <CardHeader compact>
                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {workflowTemplates.map((template) => (
              <Card
                key={template.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardHeader compact>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle size="sm" className="truncate">
                        {template.name}
                      </CardTitle>
                      <CardDescription className="truncate">
                        {template.description}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="shrink-0"
                        >
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => openBuilder(template.id)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteTemplate(template)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent compact>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Type:</span>
                      <span className="truncate ml-2">
                        {template.workflow_type?.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">States:</span>
                      <span>{template.nodes?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Created:</span>
                      <span className="truncate ml-2">
                        {formatDistanceToNow(
                          new Date(template.created_at),
                          { addSuffix: true },
                        )}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Workflow Template Dialog */}
      <AlertDialog
        open={deleteTemplateDialogOpen}
        onOpenChange={setDeleteTemplateDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{templateToDelete?.name}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteTemplate}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}