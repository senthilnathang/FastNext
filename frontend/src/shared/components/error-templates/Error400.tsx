"use client";

import React from "react";
import { ErrorPage } from "./ErrorPage";
import { AlertCircle } from "lucide-react";

interface Error400Props {
  message?: string;
  onRetry?: () => void;
  showRetry?: boolean;
}

export function Error400({
  message = "The request you made is invalid. Please check your input and try again.",
  onRetry,
  showRetry = true,
}: Error400Props) {
  const icon = (
    <AlertCircle className="h-8 w-8 text-orange-500" />
  );

  const action = showRetry && onRetry ? {
    label: "Try Again",
    onClick: onRetry,
    variant: "default" as const,
  } : undefined;

  return (
    <ErrorPage
      statusCode={400}
      title="Bad Request"
      description={message}
      icon={icon}
      action={action}
      showHomeButton={true}
      showBackButton={true}
    />
  );
}