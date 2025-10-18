"use client";

import React from "react";
import { ErrorPage } from "./ErrorPage";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Error500Props {
  message?: string;
  onRetry?: () => void;
  showRetry?: boolean;
}

export function Error500({
  message = "Something went wrong on our end. Please try again later.",
  onRetry,
  showRetry = true,
}: Error500Props) {
  const icon = (
    <AlertTriangle className="h-8 w-8 text-red-500" />
  );

  const action = showRetry && onRetry ? {
    label: "Try Again",
    onClick: onRetry,
    variant: "default" as const,
  } : undefined;

  return (
    <ErrorPage
      statusCode={500}
      title="Internal Server Error"
      description={message}
      icon={icon}
      action={action}
      showHomeButton={true}
      showBackButton={true}
    />
  );
}