"use client";

import React from "react";
import { ErrorPage } from "./ErrorPage";
import { Lock } from "lucide-react";

interface Error401Props {
  message?: string;
  onLogin?: () => void;
  showLogin?: boolean;
}

export function Error401({
  message = "You need to be logged in to access this resource. Please sign in to continue.",
  onLogin,
  showLogin = true,
}: Error401Props) {
  const icon = (
    <Lock className="h-8 w-8 text-yellow-500" />
  );

  const action = showLogin && onLogin ? {
    label: "Sign In",
    onClick: onLogin,
    variant: "default" as const,
  } : undefined;

  return (
    <ErrorPage
      statusCode={401}
      title="Unauthorized"
      description={message}
      icon={icon}
      action={action}
      showHomeButton={true}
      showBackButton={true}
    />
  );
}