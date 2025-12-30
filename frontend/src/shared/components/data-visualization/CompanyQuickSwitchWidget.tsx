"use client";

/**
 * Company Quick Switch Widget
 * Quick company switch widget for dashboard
 */

import {
  Building2,
  Check,
  ChevronRight,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Users,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/modules/auth";
import type { Company } from "@/modules/company/types";
import { apiClient } from "@/shared/services/api/client";
import { cn } from "@/shared/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";
import { Skeleton } from "../ui/skeleton";

// Storage key for persisting company selection
const COMPANY_STORAGE_KEY = "fastnext_selected_company";

interface CompanyQuickSwitchWidgetProps {
  className?: string;
  onCompanyChange?: (company: Company) => void;
  onAddCompany?: () => void;
  onManageCompanies?: () => void;
  showAddButton?: boolean;
}

function getCompanyInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function CompanyItemSkeleton() {
  return (
    <div className="flex items-center space-x-3 p-3 animate-pulse">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

function CompanyItem({
  company,
  isSelected,
  onClick,
}: {
  company: Company;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center w-full space-x-3 p-3 rounded-lg transition-all",
        "hover:bg-gray-100 dark:hover:bg-gray-800",
        "focus:outline-none focus:ring-2 focus:ring-primary/50",
        isSelected && "bg-primary/10 border border-primary/20"
      )}
    >
      <Avatar className="h-10 w-10 border-2 border-white dark:border-gray-800 shadow-sm">
        {company.logo_url ? (
          <AvatarImage src={company.logo_url} alt={company.name} />
        ) : null}
        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-medium">
          {getCompanyInitials(company.name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 text-left min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{company.name}</p>
          {company.status === "active" && (
            <Badge
              variant="secondary"
              className="text-xs px-1.5 py-0 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            >
              Active
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {company.member_count !== undefined && (
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
              <Users className="h-3 w-3 mr-1" />
              {company.member_count} members
            </span>
          )}
          {company.industry && (
            <span className="text-xs text-gray-400 dark:text-gray-500 capitalize">
              {company.industry.replace("_", " ")}
            </span>
          )}
        </div>
      </div>
      {isSelected ? (
        <Check className="h-5 w-5 text-primary flex-shrink-0" />
      ) : (
        <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
      )}
    </button>
  );
}

export function CompanyQuickSwitchWidget({
  className,
  onCompanyChange,
  onAddCompany,
  onManageCompanies,
  showAddButton = true,
}: CompanyQuickSwitchWidgetProps) {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompanies = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<{ items: Company[] }>("/api/v1/companies/");
      setCompanies(response.data.items || []);

      // Restore selected company from localStorage
      const storedId = localStorage.getItem(COMPANY_STORAGE_KEY);
      if (storedId) {
        const parsedId = parseInt(storedId, 10);
        if (response.data.items?.some((c) => c.id === parsedId)) {
          setSelectedCompanyId(parsedId);
        }
      } else if (response.data.items?.length > 0) {
        // Default to first company
        setSelectedCompanyId(response.data.items[0].id);
        localStorage.setItem(COMPANY_STORAGE_KEY, String(response.data.items[0].id));
      }
    } catch (err) {
      console.error("Failed to fetch companies:", err);
      setError("Failed to load companies");
      // Set mock data for demo
      const mockCompanies: Company[] = [
        {
          id: 1,
          name: "Acme Corporation",
          slug: "acme-corp",
          status: "active",
          owner_id: 1,
          member_count: 25,
          industry: "technology",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 2,
          name: "TechStart Inc",
          slug: "techstart",
          status: "active",
          owner_id: 1,
          member_count: 12,
          industry: "consulting",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 3,
          name: "Global Ventures",
          slug: "global-ventures",
          status: "active",
          owner_id: 2,
          member_count: 48,
          industry: "finance",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
      setCompanies(mockCompanies);
      setSelectedCompanyId(1);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleSelectCompany = (company: Company) => {
    setSelectedCompanyId(company.id);
    localStorage.setItem(COMPANY_STORAGE_KEY, String(company.id));

    // Emit custom event for other components
    if (typeof window !== "undefined") {
      const event = new CustomEvent("companySwitched", {
        detail: { company },
        bubbles: true,
      });
      window.dispatchEvent(event);
    }

    onCompanyChange?.(company);
  };

  const handleAddCompany = () => {
    if (onAddCompany) {
      onAddCompany();
    } else {
      window.location.href = "/companies/new";
    }
  };

  const handleManageCompanies = () => {
    if (onManageCompanies) {
      onManageCompanies();
    } else {
      window.location.href = "/companies";
    }
  };

  const filteredCompanies = companies.filter((company) =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-lg">
            <Building2 className="h-5 w-5 mr-2" />
            Switch Company
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchCompanies()}
            disabled={loading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        {/* Current Company Display */}
        {selectedCompany && !loading && (
          <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/10">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Current Company
            </p>
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                {selectedCompany.logo_url ? (
                  <AvatarImage src={selectedCompany.logo_url} alt={selectedCompany.name} />
                ) : null}
                <AvatarFallback className="bg-primary/20 text-primary text-xs font-medium">
                  {getCompanyInitials(selectedCompany.name)}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-sm">{selectedCompany.name}</span>
            </div>
          </div>
        )}

        {/* Search Input */}
        {companies.length > 3 && (
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        )}

        {/* Company List */}
        {loading ? (
          <div className="space-y-1">
            {[...Array(3)].map((_, i) => (
              <CompanyItemSkeleton key={i} />
            ))}
          </div>
        ) : error && companies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Building2 className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-500">{error}</p>
            <Button variant="ghost" size="sm" onClick={() => fetchCompanies()} className="mt-2">
              Try again
            </Button>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Building2 className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {searchQuery ? "No companies found" : "No companies yet"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {searchQuery ? "Try a different search" : "Create your first company to get started"}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[200px] -mx-2">
            <div className="space-y-1 px-2">
              {filteredCompanies.map((company) => (
                <CompanyItem
                  key={company.id}
                  company={company}
                  isSelected={company.id === selectedCompanyId}
                  onClick={() => handleSelectCompany(company)}
                />
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-3 pt-3 border-t">
          {showAddButton && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleAddCompany}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Company
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="flex-1"
            onClick={handleManageCompanies}
          >
            <Settings className="h-4 w-4 mr-1" />
            Manage
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default CompanyQuickSwitchWidget;
