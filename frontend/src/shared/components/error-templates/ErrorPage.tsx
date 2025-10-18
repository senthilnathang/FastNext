"use client";

import React from "react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";

export interface ErrorPageProps {
  statusCode: number;
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  };
  showHomeButton?: boolean;
  showBackButton?: boolean;
  className?: string;
}

export function ErrorPage({
  statusCode,
  title,
  description,
  icon,
  action,
  secondaryAction,
  showHomeButton = true,
  showBackButton = true,
  className = "",
}: ErrorPageProps) {
  const handleGoHome = () => {
    window.location.href = "/";
  };

  const handleGoBack = () => {
    window.history.back();
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4 ${className}`}>
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardHeader className="text-center pb-4">
          {icon && (
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              {icon}
            </div>
          )}
          <div className="text-sm font-medium text-gray-500 mb-2">
            Error {statusCode}
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
            {title}
          </CardTitle>
          <CardDescription className="text-gray-600">
            {description}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || "default"}
              className="w-full"
            >
              {action.label}
            </Button>
          )}

          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant={secondaryAction.variant || "outline"}
              className="w-full"
            >
              {secondaryAction.label}
            </Button>
          )}

          <div className="flex gap-2">
            {showBackButton && (
              <Button
                onClick={handleGoBack}
                variant="outline"
                className="flex-1"
              >
                Go Back
              </Button>
            )}

            {showHomeButton && (
              <Button
                onClick={handleGoHome}
                variant="outline"
                className="flex-1"
              >
                Go Home
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}