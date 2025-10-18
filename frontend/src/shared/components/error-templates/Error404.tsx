"use client";

import React from "react";
import { ErrorPage } from "./ErrorPage";
import { FileQuestion } from "lucide-react";

interface Error404Props {
  message?: string;
  resource?: string;
  onSearch?: () => void;
  showSearch?: boolean;
}

export function Error404({
  message,
  resource = "page",
  onSearch,
  showSearch = true,
}: Error404Props) {
  const defaultMessage = `The ${resource} you're looking for doesn't exist or has been moved.`;

  const icon = (
    <FileQuestion className="h-8 w-8 text-blue-500" />
  );

  const action = showSearch && onSearch ? {
    label: "Search",
    onClick: onSearch,
    variant: "outline" as const,
  } : undefined;

  return (
    <ErrorPage
      statusCode={404}
      title="Page Not Found"
      description={message || defaultMessage}
      icon={icon}
      action={action}
      showHomeButton={true}
      showBackButton={true}
    />
  );
}