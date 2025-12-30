"use client";

import { type ColumnDef } from "@tanstack/react-table";
import {
  Building2,
  Grid3X3,
  List,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  X,
} from "lucide-react";
import * as React from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  useCompanies,
  useDeleteCompany,
  useToggleCompanyStatus,
} from "../hooks/useCompanies";
import type {
  Company,
  CompanyIndustry,
  CompanyListParams,
  CompanyStatus,
} from "../types";
import {
  COMPANY_INDUSTRIES,
  COMPANY_STATUSES,
} from "../types";
import { CompanyCard } from "./CompanyCard";

interface CompanyListProps {
  onCreateCompany?: () => void;
  onViewCompany?: (company: Company) => void;
  onEditCompany?: (company: Company) => void;
}

const statusVariants: Record<
  CompanyStatus,
  "success" | "secondary" | "destructive"
> = {
  active: "success",
  inactive: "secondary",
  suspended: "destructive",
};

export function CompanyList({
  onCreateCompany,
  onViewCompany,
  onEditCompany,
}: CompanyListProps) {
  const [viewMode, setViewMode] = React.useState<"table" | "grid">("table");
  const [params, setParams] = React.useState<CompanyListParams>({
    skip: 0,
    limit: 10,
  });
  const [searchTerm, setSearchTerm] = React.useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [companyToDelete, setCompanyToDelete] = React.useState<Company | null>(
    null
  );

  const { data, isLoading, isFetching } = useCompanies(params);
  const deleteCompanyMutation = useDeleteCompany();
  const toggleStatusMutation = useToggleCompanyStatus();

  const companies = data?.items ?? [];
  const total = data?.total ?? 0;
  const currentPage = Math.floor((params.skip ?? 0) / (params.limit ?? 10)) + 1;
  const totalPages = Math.ceil(total / (params.limit ?? 10));

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setParams((prev) => ({ ...prev, search: searchTerm, skip: 0 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleStatusFilter = (value: string) => {
    setParams((prev) => ({
      ...prev,
      status: value === "all" ? undefined : (value as CompanyStatus),
      skip: 0,
    }));
  };

  const handleIndustryFilter = (value: string) => {
    setParams((prev) => ({
      ...prev,
      industry: value === "all" ? undefined : (value as CompanyIndustry),
      skip: 0,
    }));
  };

  const handlePageChange = (newPage: number) => {
    setParams((prev) => ({
      ...prev,
      skip: (newPage - 1) * (prev.limit ?? 10),
    }));
  };

  const handleDelete = (company: Company) => {
    setCompanyToDelete(company);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (companyToDelete) {
      await deleteCompanyMutation.mutateAsync(companyToDelete.id);
      setDeleteDialogOpen(false);
      setCompanyToDelete(null);
    }
  };

  const handleToggleStatus = async (company: Company) => {
    await toggleStatusMutation.mutateAsync(company.id);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setParams({ skip: 0, limit: 10 });
  };

  const hasActiveFilters =
    searchTerm || params.status || params.industry;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const columns: ColumnDef<Company>[] = [
    {
      accessorKey: "name",
      header: "Company",
      cell: ({ row }) => {
        const company = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={company.logo_url} alt={company.name} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {getInitials(company.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <button
                onClick={() => onViewCompany?.(company)}
                className="font-medium hover:text-primary text-left"
              >
                {company.name}
              </button>
              {company.industry && (
                <p className="text-sm text-muted-foreground capitalize">
                  {company.industry.replace("_", " ")}
                </p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <Badge variant={statusVariants[status]} className="capitalize">
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "member_count",
      header: "Members",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.member_count ?? 0}
        </span>
      ),
    },
    {
      accessorKey: "location",
      header: "Location",
      cell: ({ row }) => {
        const company = row.original;
        if (!company.city && !company.country) {
          return <span className="text-muted-foreground">-</span>;
        }
        return (
          <span className="text-muted-foreground">
            {[company.city, company.country].filter(Boolean).join(", ")}
          </span>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {new Date(row.original.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const company = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onViewCompany?.(company)}>
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEditCompany?.(company)}>
                Edit Company
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleToggleStatus(company)}>
                {company.status === "active" ? "Deactivate" : "Activate"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleDelete(company)}
                className="text-destructive focus:text-destructive"
              >
                Delete Company
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Companies</h2>
          <p className="text-muted-foreground">
            Manage your companies and organizations
          </p>
        </div>
        <Button onClick={onCreateCompany}>
          <Plus className="mr-2 h-4 w-4" />
          Add Company
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search companies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={params.status ?? "all"}
          onValueChange={handleStatusFilter}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {COMPANY_STATUSES.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={params.industry ?? "all"}
          onValueChange={handleIndustryFilter}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Industry" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Industries</SelectItem>
            {COMPANY_INDUSTRIES.map((industry) => (
              <SelectItem key={industry.value} value={industry.value}>
                {industry.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-2 h-4 w-4" />
            Clear filters
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant={viewMode === "table" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("table")}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("grid")}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        viewMode === "table" ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-8" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-8" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-12 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
            ))}
          </div>
        )
      ) : companies.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
          <Building2 className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No companies found</h3>
          <p className="mt-2 text-sm text-muted-foreground text-center">
            {hasActiveFilters
              ? "Try adjusting your filters to find what you're looking for."
              : "Get started by creating your first company."}
          </p>
          {!hasActiveFilters && (
            <Button onClick={onCreateCompany} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Add Company
            </Button>
          )}
        </div>
      ) : viewMode === "table" ? (
        /* Table View */
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={company.logo_url} alt={company.name} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {getInitials(company.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <button
                          onClick={() => onViewCompany?.(company)}
                          className="font-medium hover:text-primary text-left"
                        >
                          {company.name}
                        </button>
                        {company.industry && (
                          <p className="text-sm text-muted-foreground capitalize">
                            {company.industry.replace("_", " ")}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={statusVariants[company.status]}
                      className="capitalize"
                    >
                      {company.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {company.member_count ?? 0}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {company.city && company.country
                      ? `${company.city}, ${company.country}`
                      : "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(company.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => onViewCompany?.(company)}
                        >
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onEditCompany?.(company)}
                        >
                          Edit Company
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleToggleStatus(company)}
                        >
                          {company.status === "active"
                            ? "Deactivate"
                            : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(company)}
                          className="text-destructive focus:text-destructive"
                        >
                          Delete Company
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        /* Grid View */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <CompanyCard
              key={company.id}
              company={company}
              onView={onViewCompany}
              onEdit={onEditCompany}
              onDelete={handleDelete}
              onToggleStatus={handleToggleStatus}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > (params.limit ?? 10) && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(params.skip ?? 0) + 1} to{" "}
            {Math.min((params.skip ?? 0) + (params.limit ?? 10), total)} of{" "}
            {total} companies
            {isFetching && (
              <Loader2 className="ml-2 inline h-4 w-4 animate-spin" />
            )}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Company</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{companyToDelete?.name}"? This
              action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCompanyMutation.isPending ? (
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
