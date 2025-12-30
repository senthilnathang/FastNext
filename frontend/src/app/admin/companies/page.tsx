"use client";

import { formatDistanceToNow } from "date-fns";
import { Building2, Calendar, Globe, Mail, MapPin, Phone, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { z } from "zod";
import { Badge } from "@/shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
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

// Company type definition
interface Company {
  id: number;
  name: string;
  display_name: string;
  email: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  country?: string;
  industry?: string;
  size?: string;
  is_active: boolean;
  user_count: number;
  created_at: string;
  updated_at: string;
}

// Mock data for demonstration - replace with actual API calls
const mockCompanies: Company[] = [
  {
    id: 1,
    name: "acme-corp",
    display_name: "Acme Corporation",
    email: "contact@acme.com",
    phone: "+1-555-0100",
    website: "https://acme.com",
    address: "123 Main St",
    city: "New York",
    country: "USA",
    industry: "Technology",
    size: "100-500",
    is_active: true,
    user_count: 150,
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-12-01T15:30:00Z",
  },
  {
    id: 2,
    name: "globex-inc",
    display_name: "Globex Inc",
    email: "info@globex.com",
    phone: "+1-555-0200",
    website: "https://globex.com",
    city: "San Francisco",
    country: "USA",
    industry: "Finance",
    size: "500-1000",
    is_active: true,
    user_count: 320,
    created_at: "2024-02-20T14:00:00Z",
    updated_at: "2024-11-25T09:15:00Z",
  },
  {
    id: 3,
    name: "initech",
    display_name: "Initech",
    email: "support@initech.com",
    industry: "Consulting",
    size: "50-100",
    is_active: false,
    user_count: 45,
    created_at: "2024-03-10T08:00:00Z",
    updated_at: "2024-10-15T11:00:00Z",
  },
];

export default function CompaniesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [companies, setCompanies] = React.useState<Company[]>(mockCompanies);
  const [loading, setLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [industryFilter, setIndustryFilter] = React.useState<string>("all");

  // Filter companies based on search and filters
  const filteredCompanies = React.useMemo(() => {
    return companies.filter((company) => {
      const matchesSearch =
        searchQuery === "" ||
        company.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && company.is_active) ||
        (statusFilter === "inactive" && !company.is_active);

      const matchesIndustry =
        industryFilter === "all" || company.industry === industryFilter;

      return matchesSearch && matchesStatus && matchesIndustry;
    });
  }, [companies, searchQuery, statusFilter, industryFilter]);

  // Get unique industries for filter
  const industries = React.useMemo(() => {
    const uniqueIndustries = new Set(companies.map((c) => c.industry).filter(Boolean));
    return Array.from(uniqueIndustries);
  }, [companies]);

  // Calculate statistics
  const stats = React.useMemo(() => {
    const totalCompanies = companies.length;
    const activeCompanies = companies.filter((c) => c.is_active).length;
    const totalUsers = companies.reduce((sum, c) => sum + c.user_count, 0);

    return {
      totalCompanies,
      activeCompanies,
      inactiveCompanies: totalCompanies - activeCompanies,
      totalUsers,
    };
  }, [companies]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Companies</h1>
          <p className="text-muted-foreground">
            Manage companies and their configurations
          </p>
        </div>
        <Link href="/admin/companies/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Company
          </Button>
        </Link>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCompanies}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeCompanies} active, {stats.inactiveCompanies} inactive
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Companies</CardTitle>
            <Building2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCompanies}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Across all companies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Industries</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{industries.length}</div>
            <p className="text-xs text-muted-foreground">Different sectors</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Select value={industryFilter} onValueChange={setIndustryFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Industries</SelectItem>
                  {industries.map((industry) => (
                    <SelectItem key={industry} value={industry!}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Companies Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredCompanies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="text-muted-foreground">
                      No companies found matching your criteria
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCompanies.map((company) => (
                  <TableRow
                    key={company.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/admin/companies/${company.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{company.display_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {company.name}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3" />
                          {company.email}
                        </div>
                        {company.phone && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {company.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {company.industry ? (
                        <Badge variant="outline">{company.industry}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {company.user_count}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={company.is_active ? "default" : "destructive"}>
                        {company.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {formatDistanceToNow(new Date(company.created_at), {
                          addSuffix: true,
                        })}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
