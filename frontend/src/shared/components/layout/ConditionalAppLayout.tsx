'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import AppLayout from './AppLayout';

interface ConditionalAppLayoutProps {
  children: React.ReactNode;
}

// Routes that should not have the sidebar (exact matches)
const NO_SIDEBAR_ROUTES = [
  '/', // Landing page
  '/login',
  '/register',
  '/api-docs', // API docs has its own layout
];

// Route patterns that should not have the sidebar (prefix matches)
const NO_SIDEBAR_PATTERNS = [
  '/api/', // API routes
];

/**
 * Determines if the current route should display the sidebar
 * @param pathname - Current pathname from Next.js router
 * @returns boolean - true if sidebar should be shown
 */
const shouldShowSidebar = (pathname: string): boolean => {
  // Check exact matches first
  if (NO_SIDEBAR_ROUTES.includes(pathname)) {
    return false;
  }
  
  // Check pattern matches
  if (NO_SIDEBAR_PATTERNS.some(pattern => pathname.startsWith(pattern))) {
    return false;
  }
  
  // Default to showing sidebar for all other routes
  return true;
};

/**
 * ConditionalAppLayout - A smart layout wrapper that conditionally applies the sidebar
 * 
 * This component automatically wraps pages with AppLayout (including sidebar) based on the current route.
 * Routes like login, register, and landing page are excluded from having the sidebar.
 * This allows for a global sidebar implementation while respecting pages that shouldn't have navigation.
 * 
 * Used at the root layout level to provide consistent navigation across the application.
 */
export default function ConditionalAppLayout({ children }: ConditionalAppLayoutProps) {
  const pathname = usePathname();
  
  if (shouldShowSidebar(pathname)) {
    return <AppLayout>{children}</AppLayout>;
  }
  
  return <>{children}</>;
}