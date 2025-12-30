"use client";

import {
  AlertTriangle,
  Grid,
  List,
  Loader2,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { useToast } from "@/shared/hooks/useToast";
import {
  useDemoItems,
  useCreateDemoItem,
  useUpdateDemoItem,
  useDeleteDemoItem,
  useToggleDemoItemActive,
} from "../hooks/useDemoItems";
import type { DemoItem, DemoItemCreate, DemoItemUpdate, DemoItemListParams } from "@/lib/api/demo";
import type { DemoViewMode } from "../types";
import { DemoItemCard } from "./DemoItemCard";
import { DemoItemForm } from "./DemoItemForm";
import { cn } from "@/shared/utils";

interface DemoItemListProps {
  className?: string;
}

export function DemoItemList({ className }: DemoItemListProps) {
  const { toast } = useToast();

  // UI State
  const [viewMode, setViewMode] = useState<DemoViewMode>("list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DemoItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<DemoItem | null>(null);

  // Build query params
  const params: DemoItemListParams = {
    skip: 0,
    limit: 50,
    ...(search && { search }),
    ...(statusFilter !== "all" && { is_active: statusFilter === "active" }),
  };

  // Data fetching
  const { data, isLoading, error, refetch } = useDemoItems(params);
  const createMutation = useCreateDemoItem();
  const updateMutation = useUpdateDemoItem();
  const deleteMutation = useDeleteDemoItem();
  const toggleActiveMutation = useToggleDemoItemActive();

  const items = data?.items || [];

  // Handlers
  const handleCreate = useCallback(() => {
    setEditingItem(null);
    setIsFormOpen(true);
  }, []);

  const handleEdit = useCallback((item: DemoItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  }, []);

  const handleFormSubmit = useCallback(
    async (formData: DemoItemCreate | DemoItemUpdate) => {
      try {
        if (editingItem) {
          await updateMutation.mutateAsync({ id: editingItem.id, data: formData });
          toast({ title: "Item updated successfully" });
        } else {
          await createMutation.mutateAsync(formData as DemoItemCreate);
          toast({ title: "Item created successfully" });
        }
        setIsFormOpen(false);
        setEditingItem(null);
      } catch (err) {
        toast({
          title: editingItem ? "Failed to update item" : "Failed to create item",
          variant: "destructive",
        });
      }
    },
    [editingItem, createMutation, updateMutation, toast]
  );

  const handleDelete = useCallback((item: DemoItem) => {
    setDeletingItem(item);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deletingItem) return;
    try {
      await deleteMutation.mutateAsync(deletingItem.id);
      toast({ title: "Item deleted successfully" });
    } catch (err) {
      toast({ title: "Failed to delete item", variant: "destructive" });
    } finally {
      setDeletingItem(null);
    }
  }, [deletingItem, deleteMutation, toast]);

  const handleToggleActive = useCallback(
    async (item: DemoItem) => {
      try {
        await toggleActiveMutation.mutateAsync({
          id: item.id,
          is_active: !item.is_active,
        });
        toast({
          title: item.is_active ? "Item deactivated" : "Item activated",
        });
      } catch (err) {
        toast({ title: "Failed to update item status", variant: "destructive" });
      }
    },
    [toggleActiveMutation, toast]
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Failed to load items
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          {(error as Error).message || "An error occurred"}
        </p>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-3 items-center w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 items-center">
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="rounded-none"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="rounded-none"
              onClick={() => setViewMode("grid")}
            >
              <Grid className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Content */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-gray-50 dark:bg-gray-800/50">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {search || statusFilter !== "all"
              ? "No items match your filters"
              : "No demo items yet"}
          </p>
          {!search && statusFilter === "all" && (
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Create your first item
            </Button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <DemoItemCard
              key={item.id}
              item={item}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="max-w-xs truncate text-gray-500 dark:text-gray-400">
                    {item.description || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.is_active ? "default" : "secondary"}>
                      {item.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-500 dark:text-gray-400">
                    {formatDate(item.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(item)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(item)}
                      >
                        {item.is_active ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                        onClick={() => handleDelete(item)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Total count */}
      {data && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          Showing {items.length} of {data.total} items
        </p>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Demo Item" : "Create Demo Item"}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Update the details of this demo item."
                : "Fill in the details to create a new demo item."}
            </DialogDescription>
          </DialogHeader>
          <DemoItemForm
            item={editingItem || undefined}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setIsFormOpen(false);
              setEditingItem(null);
            }}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingItem}
        onOpenChange={() => setDeletingItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Demo Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingItem?.name}&quot;? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default DemoItemList;
