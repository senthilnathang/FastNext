"use client";

import { Error500 } from "@/shared/components/error-templates/Error500";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <Error500 />;
}