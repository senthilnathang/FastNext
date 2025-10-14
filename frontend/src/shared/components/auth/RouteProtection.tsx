"use client";

import { usePathname } from "next/navigation";
import type React from "react";
import AuthGuard from "./AuthGuard";

interface RouteProtectionProps {
  children: React.ReactNode;
}

/**
 * Global route protection wrapper
 *
 * This component automatically applies authentication guards to all routes
 * except those explicitly marked as public. It should be used at the root
 * layout level to provide consistent authentication across the application.
 *
 * Features:
 * - Automatic route protection
 * - Public route exemptions
 * - Role and permission-based access
 * - Seamless integration with AuthGuard
 */
export default function RouteProtection({ children }: RouteProtectionProps) {
  const pathname = usePathname();

  // Public routes that don't require authentication
  const publicRoutes = [
    "/", // Landing page
    "/login", // Login page
    "/register", // Registration page
    "/api-docs", // API documentation
  ];

  // Check if current route is public
  const isPublicRoute =
    publicRoutes.includes(pathname) || pathname.startsWith("/api/");

  // For public routes, render children directly without auth guard
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // For all other routes, apply authentication guard
  return <AuthGuard requireAuth={true}>{children}</AuthGuard>;
}
