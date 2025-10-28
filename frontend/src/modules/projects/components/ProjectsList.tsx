"use client";

import {
  Edit,
  Eye,
  Filter,
  Folder,
  Grid,
  List,
  Plus,
  Search,
  Shield,
  SortAsc,
  SortDesc,
  Trash2,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import {
  usePaginationState,
  useSearchState,
  useSortState,
  useStringLiteralState,
  useViewModeState,
} from "@/shared/hooks";
import { useUserRole } from "@/modules/admin/hooks/useUserRole";

interface Project {
  id: number;
  name: string;
  description: string;
  status: "active" | "inactive" | "archived";
  created_at: string;
  updated_at: string;
  pages_count?: number;
  components_count?: number;
}

const statusColors = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-yellow-100 text-yellow-800",
  archived: "bg-gray-100 text-gray-800",
};

// Mock data for demonstration
const mockProjects: Project[] = [
  {
    id: 1,
    name: "E-commerce Platform",
    description: "Modern e-commerce solution with advanced features",
    status: "active",
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-20T15:30:00Z",
    pages_count: 12,
    components_count: 45,
  },
  {
    id: 2,
    name: "Marketing Website",
    description: "Company marketing website with blog functionality",
    status: "active",
    created_at: "2024-01-10T08:00:00Z",
    updated_at: "2024-01-18T12:00:00Z",
    pages_count: 8,
    components_count: 23,
  },
  {
    id: 3,
    name: "Portfolio Site",
    description: "Personal portfolio showcase",
    status: "inactive",
    created_at: "2024-01-05T14:00:00Z",
    updated_at: "2024-01-15T09:00:00Z",
    pages_count: 5,
    components_count: 15,
  },
  {
    id: 4,
    name: "Legacy Project",
    description: "Old project that needs migration",
    status: "archived",
    created_at: "2023-12-01T10:00:00Z",
    updated_at: "2023-12-20T16:00:00Z",
    pages_count: 20,
    components_count: 78,
  },
];

export default function ProjectsList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAdmin } = useUserRole();

  // URL State Management with nuqs
  const [search, setSearch] = useSearchState();
  const { page, setPage, limit, offset } = usePaginationState(1, 12);
  const [viewMode, setViewMode] = useViewModeState(
    ["grid", "list"] as const,
    "grid",
  );
  const { sortBy, setSortBy, sortOrder, setSortOrder } = useSortState(
    "updated_at",
    "desc",
  );
  const [statusFilter, setStatusFilter] = useStringLiteralState(
    "status",
    ["", "active", "inactive", "archived"] as const,
    "",
  );

  useEffect(() => {
    // Simulate API call with filtering, sorting, and pagination
    const fetchProjects = async () => {
      setLoading(true);
      try {
        // Simulate delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        let filteredProjects = [...mockProjects];

        // Apply search filter
        if (search) {
          filteredProjects = filteredProjects.filter(
            (project) =>
              project.name.toLowerCase().includes(search.toLowerCase()) ||
              project.description.toLowerCase().includes(search.toLowerCase()),
          );
        }

        // Apply status filter
        if (statusFilter) {
          filteredProjects = filteredProjects.filter(
            (project) => project.status === statusFilter,
          );
        }

        // Apply sorting
        filteredProjects.sort((a, b) => {
          const aValue = a[sortBy as keyof Project] || "";
          const bValue = b[sortBy as keyof Project] || "";

          if (sortOrder === "asc") {
            return aValue > bValue ? 1 : -1;
          } else {
            return aValue < bValue ? 1 : -1;
          }
        });

        // Apply pagination
        const startIndex = offset;
        const endIndex = startIndex + limit;
        const paginatedProjects = filteredProjects.slice(startIndex, endIndex);

        setProjects(paginatedProjects);
      } catch {
        setError("Failed to load projects");
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [search, statusFilter, sortBy, sortOrder, page, limit, offset]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const clearFilters = () => {
    setSearch(null);
    setStatusFilter("");
    setSortBy("updated_at");
    setSortOrder("desc");
    setPage(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading projects...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-2">
          <Folder className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Projects
          </h1>
        </div>

        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Filters and Controls */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search projects..."
                value={search || ""}
                onChange={(e) => setSearch(e.target.value || null)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md bg-white"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>

            {/* Sort */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSort("name")}
                className="flex items-center space-x-1"
              >
                <span>Name</span>
                {sortBy === "name" &&
                  (sortOrder === "asc" ? (
                    <SortAsc className="h-3 w-3" />
                  ) : (
                    <SortDesc className="h-3 w-3" />
                  ))}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSort("updated_at")}
                className="flex items-center space-x-1"
              >
                <span>Updated</span>
                {sortBy === "updated_at" &&
                  (sortOrder === "asc" ? (
                    <SortAsc className="h-3 w-3" />
                  ) : (
                    <SortDesc className="h-3 w-3" />
                  ))}
              </Button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Clear Filters */}
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <Filter className="h-4 w-4 mr-2" />
              Clear
            </Button>

            {/* View Mode Toggle */}
            <div className="flex border border-gray-200 rounded-md overflow-hidden">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="rounded-none"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="rounded-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Projects Display */}
      {projects.length === 0 ? (
        <div className="text-center py-12">
          <Folder className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No projects found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {search || statusFilter
              ? "Try adjusting your filters"
              : "Get started by creating a new project"}
          </p>
        </div>
      ) : (
        <>
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Card
                  key={project.id}
                  className="p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {project.name}
                    </h3>
                    <Badge className={statusColors[project.status]}>
                      {project.status}
                    </Badge>
                  </div>

                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">
                    {project.description}
                  </p>

                  <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                    <span>{project.pages_count} pages</span>
                    <span>{project.components_count} components</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      Updated{" "}
                      {new Date(project.updated_at).toLocaleDateString()}
                    </span>

                    <div className="flex space-x-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {isAdmin() && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`/admin/projects?projectId=${project.id}`, '_blank')}
                          title="Manage ACL Permissions"
                        >
                          <Shield className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map((project) => (
                <Card key={project.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {project.name}
                        </h3>
                        <Badge className={statusColors[project.status]}>
                          {project.status}
                        </Badge>
                      </div>

                      <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                        {project.description}
                      </p>

                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                        <span>{project.pages_count} pages</span>
                        <span>{project.components_count} components</span>
                        <span>
                          Updated{" "}
                          {new Date(project.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {isAdmin() && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`/admin/projects?projectId=${project.id}`, '_blank')}
                          title="Manage ACL Permissions"
                        >
                          <Shield className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {offset + 1} to{" "}
              {Math.min(offset + limit, projects.length)} of {projects.length}{" "}
              projects
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={projects.length < limit}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
