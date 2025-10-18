"use client";

import React from "react";
import { ErrorPage } from "./ErrorPage";
import { ZapOff } from "lucide-react";

interface Error501Props {
  message?: string;
  onContactSupport?: () => void;
  showContactSupport?: boolean;
}

export function Error501({
  message = "This feature is not implemented yet. We're working on it!",
  onContactSupport,
  showContactSupport = true,
}: Error501Props) {
  const icon = (
    <ZapOff className="h-8 w-8 text-purple-500" />
  );

  const action = showContactSupport && onContactSupport ? {
    label: "Contact Support",
    onClick: onContactSupport,
    variant: "outline" as const,
  } : undefined;

  return (
    <ErrorPage
      statusCode={501}
      title="Not Implemented"
      description={message}
      icon={icon}
      action={action}
      showHomeButton={true}
      showBackButton={true}
    />
  );
}