"use client";

import {
  Edit,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  useDeleteWorkflowType,
  useWorkflowTypes,
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
  CardDescription,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components";

export default function WorkflowsPage() {
  const router = useRouter();
  const [deleteTypeDialogOpen, setDeleteTypeDialogOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<any>(null);

  const { data: typesData, isLoading: typesLoading } = useWorkflowTypes();
  const deleteTypeMutation = useDeleteWorkflowType();

  const workflowTypes = typesData?.items || [];

  const handleEditType = (type: any) => {
    router.push(`/workflows/types/${type.id}/edit`);
  };

  const handleDeleteType = (type: any) => {
    setTypeToDelete(type);
    setDeleteTypeDialogOpen(true);
  };

  const confirmDeleteType = async () => {
    if (!typeToDelete) return;
    try {
      await deleteTypeMutation.mutateAsync(typeToDelete.id);
      setDeleteTypeDialogOpen(false);
      setTypeToDelete(null);
    } catch (error) {
      console.error("Failed to delete workflow type:", error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Workflow Types</h1>
        <p className="text-gray-600 mt-2">
          Define and manage workflow types for your business processes.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Workflow Types</h2>
          <Button onClick={() => router.push("/workflows/types/create")}>
            <Plus className="h-4 w-4 mr-2" />
            Create Type
          </Button>
        </div>

        {typesLoading ? (
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
            {workflowTypes.map((type) => (
              <Card
                key={type.id}
                className="hover:shadow-md transition-shadow"
                variant="default"
              >
                <CardHeader compact className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: type.color }}
                      />
                      <CardTitle size="sm" className="truncate">
                        {type.name}
                      </CardTitle>
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
                          onClick={() => handleEditType(type)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteType(type)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardDescription className="mt-1 line-clamp-2 text-xs">
                    {type.description || "No description provided"}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Workflow Type Dialog */}
      <AlertDialog
        open={deleteTypeDialogOpen}
        onOpenChange={setDeleteTypeDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the workflow type &quot;
              {typeToDelete?.name}&quot;? This action cannot be undone and may
              affect existing templates.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteType}
              disabled={deleteTypeMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteTypeMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}