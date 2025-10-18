"use client";

import React from "react";
import { ErrorPage } from "./ErrorPage";
import { ShieldX } from "lucide-react";

interface Error403Props {
  message?: string;
  onContactSupport?: () => void;
  showContactSupport?: boolean;
}

export function Error403({
  message = "You don't have permission to access this resource. Please contact your administrator if you believe this is an error.",
  onContactSupport,
  showContactSupport = true,
}: Error403Props) {
  const icon = (
    <ShieldX className="h-8 w-8 text-red-500" />
  );

  const action = showContactSupport && onContactSupport ? {
    label: "Contact Support",
    onClick: onContactSupport,
    variant: "outline" as const,
  } : undefined;

  return (
    <ErrorPage
      statusCode={403}
      title="Forbidden"
      description={message}
      icon={icon}
      action={action}
      showHomeButton={true}
      showBackButton={true}
    />
  );
}