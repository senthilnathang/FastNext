"use client";

import {
  AlertTriangle,
  ArrowUpDown,
  Loader2,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { Badge } from "@/shared/components/ui/badge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
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
import { useToast } from "@/shared/hooks/useToast";
import { useLeads, useDeleteLead, useConvertLead } from "../hooks";
import type { Lead, LeadListParams, LeadStatus } from "@/lib/api/crm";
import { cn } from "@/shared/utils";

interface LeadsListProps {
  className?: string;
  onCreateLead?: () => void;
  onEditLead?: (lead: Lead) => void;
}

const statusColors: Record<LeadStatus, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  contacted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  qualified: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  unqualified: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  lost: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const statusLabels: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  unqualified: "Unqualified",
  lost: "Lost",
};

export function LeadsList({ className, onCreateLead, onEditLead }: LeadsListProps) {
  const { toast } = useToast();

  // UI State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deletingLead, setDeletingLead] = useState<Lead | null>(null);
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);

  // Build query params
  const params: LeadListParams = {
    skip: 0,
    limit: 50,
    ...(search && { search }),
    ...(statusFilter !== "all" && { status: statusFilter as LeadStatus }),
  };

  // Data fetching
  const { data, isLoading, error, refetch } = useLeads(params);
  const deleteMutation = useDeleteLead();
  const convertMutation = useConvertLead();

  const leads = data?.items || [];

  const handleDelete = useCallback((lead: Lead) => {
    setDeletingLead(lead);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deletingLead) return;
    try {
      await deleteMutation.mutateAsync(deletingLead.id);
      toast({ title: "Lead deleted successfully" });
    } catch (err) {
      toast({ title: "Failed to delete lead", variant: "destructive" });
    } finally {
      setDeletingLead(null);
    }
  }, [deletingLead, deleteMutation, toast]);

  const handleConvert = useCallback((lead: Lead) => {
    setConvertingLead(lead);
  }, []);

  const confirmConvert = useCallback(async () => {
    if (!convertingLead) return;
    try {
      await convertMutation.mutateAsync({
        id: convertingLead.id,
        data: {
          create_opportunity: true,
          create_contact: true,
          create_account: !!convertingLead.company,
        },
      });
      toast({ title: "Lead converted successfully" });
    } catch (err) {
      toast({ title: "Failed to convert lead", variant: "destructive" });
    } finally {
      setConvertingLead(null);
    }
  }, [convertingLead, convertMutation, toast]);

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
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
          Failed to load leads
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
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="unqualified">Unqualified</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {onCreateLead && (
          <Button onClick={onCreateLead}>
            <Plus className="mr-2 h-4 w-4" />
            Add Lead
          </Button>
        )}
      </div>

      {/* Content */}
      {leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-gray-50 dark:bg-gray-800/50">
          <UserPlus className="h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {search || statusFilter !== "all"
              ? "No leads match your filters"
              : "No leads yet"}
          </p>
          {!search && statusFilter === "all" && onCreateLead && (
            <Button onClick={onCreateLead}>
              <Plus className="mr-2 h-4 w-4" />
              Create your first lead
            </Button>
          )}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <div className="flex items-center gap-1">
                    Name
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Expected Revenue</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <div>
                      <Link
                        href={`/crm/leads/${lead.id}`}
                        className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        {lead.name}
                      </Link>
                      {lead.email && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {lead.email}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-500 dark:text-gray-400">
                    {lead.company || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("font-medium", statusColors[lead.status])}>
                      {statusLabels[lead.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-500 dark:text-gray-400">
                    {lead.source || "-"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(lead.expected_revenue)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEditLead?.(lead)}>
                          Edit
                        </DropdownMenuItem>
                        {lead.status === "qualified" && (
                          <DropdownMenuItem onClick={() => handleConvert(lead)}>
                            Convert to Opportunity
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(lead)}
                          className="text-red-600 dark:text-red-400"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
          Showing {leads.length} of {data.total} leads
        </p>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingLead} onOpenChange={() => setDeletingLead(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingLead?.name}&quot;? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Convert Confirmation */}
      <AlertDialog open={!!convertingLead} onOpenChange={() => setConvertingLead(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convert Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Convert &quot;{convertingLead?.name}&quot; to an opportunity? This will
              also create a contact{convertingLead?.company ? " and account" : ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmConvert}>
              {convertMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Convert
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default LeadsList;
