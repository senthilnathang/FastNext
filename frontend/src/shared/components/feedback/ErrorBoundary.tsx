"use client";

import React from "react";
import { apiUtils } from "@/shared/services/api/client";
import { Error400 } from "@/shared/components/error-templates/Error400";
import { Error401 } from "@/shared/components/error-templates/Error401";
import { Error403 } from "@/shared/components/error-templates/Error403";
import { Error404 } from "@/shared/components/error-templates/Error404";
import { Error500 } from "@/shared/components/error-templates/Error500";
import { Error501 } from "@/shared/components/error-templates/Error501";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: (error: Error, resetError: () => void) => React.ReactNode;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // You could send this to an error reporting service
    // e.g., Sentry.captureException(error, { contexts: { react: errorInfo } })
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      return (
        <DefaultErrorFallback
          error={this.state.error}
          resetError={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

function DefaultErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const errorMessage = apiUtils.isApiError(error)
    ? apiUtils.getErrorMessage(error)
    : error.message || "An unexpected error occurred";

  // Determine which error template to use based on status code
  if (apiUtils.isApiError(error) && error.status) {
    switch (error.status) {
      case 400:
        return <Error400 message={errorMessage} />;
      case 401:
        return <Error401 />;
      case 403:
        return <Error403 />;
      case 404:
        return <Error404 />;
      case 500:
        return <Error500 message={errorMessage} onRetry={resetError} />;
      case 501:
        return <Error501 />;
      default:
        // For other 4xx or 5xx errors, use 500 template
        if (error.status >= 400) {
          return <Error500 message={errorMessage} onRetry={resetError} />;
        }
    }
  }

  // For non-API errors or unknown status codes, use 500 template
  return <Error500 message={errorMessage} onRetry={resetError} />;
}

// Hook version for functional components
export function useErrorHandler() {
  return (error: Error) => {
    console.error("Handled error:", error);

    // You could integrate with error tracking here
    // e.g., Sentry.captureException(error)

    // Show user-friendly error message
    if (apiUtils.isApiError(error)) {
      // You could show a toast notification here
      console.error("API Error:", apiUtils.getErrorMessage(error));
    }
  };
}
