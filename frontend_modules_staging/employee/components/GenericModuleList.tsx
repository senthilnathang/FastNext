"use client";

/**
 * Generic Module List Component
 *
 * Reusable CRUD list for employee sub-entities (documents, notes, bonus points, etc.)
 * Follows the same pattern as FastVue's standard list views.
 */

import { useState, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
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
import { Plus, Search, Trash2 } from "lucide-react";
import type { UseQueryResult, UseMutationResult } from "@tanstack/react-query";
import type { PaginatedResponse } from "../types";

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
}

interface GenericModuleListProps<T extends { id: number; name?: string; is_active?: boolean; created_at?: string }> {
  title: string;
  useListQuery: (params?: { skip?: number; limit?: number; search?: string }) => UseQueryResult<PaginatedResponse<T>>;
  useDeleteMutation: () => UseMutationResult<unknown, Error, number>;
  columns?: Column<T>[];
  onCreateClick?: () => void;
  createLabel?: string;
}

export function GenericModuleList<T extends { id: number; name?: string; is_active?: boolean; created_at?: string }>({
  title,
  useListQuery,
  useDeleteMutation,
  columns,
  onCreateClick,
  createLabel = "Create",
}: GenericModuleListProps<T>) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data, isLoading } = useListQuery({
    skip: page * pageSize,
    limit: pageSize,
    search: search || undefined,
  });

  const deleteMutation = useDeleteMutation();

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const defaultColumns: Column<T>[] = columns ?? [
    { key: "id", header: "ID" },
    { key: "name", header: "Name" },
    {
      key: "is_active",
      header: "Status",
      render: (item) => (
        <Badge variant={item.is_active ? "default" : "secondary"}>
          {item.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "created_at",
      header: "Created",
      render: (item) =>
        item.created_at
          ? new Date(item.created_at).toLocaleDateString()
          : "—",
    },
  ];

  const handleDelete = useCallback(async () => {
    if (deleteId) {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    }
  }, [deleteId, deleteMutation]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${title.toLowerCase()}...`}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="pl-8"
            />
          </div>
          {onCreateClick && (
            <Button onClick={onCreateClick}>
              <Plus className="mr-2 h-4 w-4" />
              {createLabel}
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {defaultColumns.map((col) => (
                <TableHead key={col.key}>{col.header}</TableHead>
              ))}
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={defaultColumns.length + 1}
                  className="text-center py-8"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={defaultColumns.length + 1}
                  className="text-center py-8 text-muted-foreground"
                >
                  No {title.toLowerCase()} found
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  {defaultColumns.map((col) => (
                    <TableCell key={col.key}>
                      {col.render
                        ? col.render(item)
                        : String((item as Record<string, unknown>)[col.key] ?? "—")}
                    </TableCell>
                  ))}
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => setDeleteId(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {page * pageSize + 1}–
            {Math.min((page + 1) * pageSize, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
