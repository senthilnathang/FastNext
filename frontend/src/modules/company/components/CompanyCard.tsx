"use client";

import {
  Building2,
  Globe,
  Mail,
  MoreVertical,
  Phone,
  Users,
} from "lucide-react";
import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import type { Company, CompanyStatus } from "../types";

interface CompanyCardProps {
  company: Company;
  onView?: (company: Company) => void;
  onEdit?: (company: Company) => void;
  onDelete?: (company: Company) => void;
  onToggleStatus?: (company: Company) => void;
}

const statusVariants: Record<
  CompanyStatus,
  "success" | "secondary" | "destructive"
> = {
  active: "success",
  inactive: "secondary",
  suspended: "destructive",
};

export function CompanyCard({
  company,
  onView,
  onEdit,
  onDelete,
  onToggleStatus,
}: CompanyCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="group relative transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={company.logo_url} alt={company.name} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(company.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <CardTitle
                className="text-lg truncate cursor-pointer hover:text-primary"
                onClick={() => onView?.(company)}
              >
                {company.name}
              </CardTitle>
              {company.industry && (
                <CardDescription className="capitalize">
                  {company.industry.replace("_", " ")}
                </CardDescription>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView?.(company)}>
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit?.(company)}>
                Edit Company
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleStatus?.(company)}>
                {company.status === "active" ? "Deactivate" : "Activate"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete?.(company)}
                className="text-destructive focus:text-destructive"
              >
                Delete Company
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {company.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {company.description}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Badge variant={statusVariants[company.status]}>
            {company.status}
          </Badge>
          {company.size && (
            <Badge variant="outline" className="capitalize">
              {company.size}
            </Badge>
          )}
        </div>

        <div className="space-y-2 pt-2 border-t">
          {company.website && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Globe className="h-4 w-4" />
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate hover:text-primary"
              >
                {company.website.replace(/^https?:\/\//, "")}
              </a>
            </div>
          )}

          {company.email && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <a
                href={`mailto:${company.email}`}
                className="truncate hover:text-primary"
              >
                {company.email}
              </a>
            </div>
          )}

          {company.phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              <a
                href={`tel:${company.phone}`}
                className="hover:text-primary"
              >
                {company.phone}
              </a>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{company.member_count ?? 0} members</span>
          </div>

          {company.city && company.country && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span className="truncate">
                {company.city}, {company.country}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
