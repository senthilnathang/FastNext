"use client";

import { Suspense } from "react";

interface NuqsProviderProps {
  children: React.ReactNode;
}

/**
 * Temporary provider for URL state management
 * TODO: Replace with nuqs when Next.js 16 support is available
 * Currently just a pass-through provider without nuqs functionality
 */
export function NuqsProvider({ children }: NuqsProviderProps) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      {children}
    </Suspense>
  );
}
