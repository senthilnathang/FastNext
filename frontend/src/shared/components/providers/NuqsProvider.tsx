"use client";

import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Suspense } from "react";

interface NuqsProviderProps {
  children: React.ReactNode;
}

/**
 * Provider for nuqs URL state management
 * Wraps the application with NuqsAdapter for URL-based state management
 */
export function NuqsProvider({ children }: NuqsProviderProps) {
  return (
    <NuqsAdapter>
      <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
    </NuqsAdapter>
  );
}
