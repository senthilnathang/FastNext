"use client";

import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { cn } from "@/shared/utils";

interface BreadcrumbItem {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface BreadcrumbProps {
  className?: string;
  customItems?: BreadcrumbItem[];
}

export default function Breadcrumb({
  className,
  customItems,
}: BreadcrumbProps) {
  const pathname = usePathname();

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    if (customItems) return customItems;

    const pathSegments = pathname.split("/").filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      {
        label: "Home",
        href: "/dashboard",
        icon: Home,
      },
    ];

    let currentPath = "";
    pathSegments.forEach((segment) => {
      currentPath += `/${segment}`;

      const label = segment
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      breadcrumbs.push({
        label,
        href: currentPath,
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <nav
      className={cn(
        "flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400",
        className,
      )}
    >
      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1;

        return (
          <React.Fragment key={`${item.href}-${index}`}>
            {index > 0 && <ChevronRight className="w-3 h-3 mx-0.5" />}

            {isLast ? (
              <span className="flex items-center text-gray-900 dark:text-white font-medium">
                {item.icon && <item.icon className="w-3 h-3 mr-1" />}
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="flex items-center hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                {item.icon && <item.icon className="w-3 h-3 mr-1" />}
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
