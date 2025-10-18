"use client";

import { AlertCircle, RefreshCw, Server, Shield } from "lucide-react";
import dynamic from "next/dynamic";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/modules/auth";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { cn } from "@/shared/utils";
import SwaggerErrorBoundary from "./SwaggerErrorBoundary";

// Import alternative SwaggerUI implementation
const SwaggerUINoStrict = dynamic(() => import("./SwaggerUINoStrict"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Loading API Documentation...
        </p>
      </div>
    </div>
  ),
});

// Fallback: Dynamically import SwaggerUI React with warning suppression
const SwaggerUIBundle = dynamic(
  () => {
    // Temporarily suppress React lifecycle warnings for SwaggerUI
    const originalError = console.error;
    console.error = (...args) => {
      if (
        typeof args[0] === "string" &&
        (args[0].includes("UNSAFE_componentWillReceiveProps") ||
          args[0].includes("componentWillReceiveProps") ||
          args[0].includes("OperationContainer") ||
          args[0].includes("Warning: Using UNSAFE_componentWillReceiveProps"))
      ) {
        return; // Suppress these specific warnings
      }
      originalError.apply(console, args);
    };

    return import("swagger-ui-react").then((mod) => {
      // Restore original console.error after import
      setTimeout(() => {
        console.error = originalError;
      }, 1000);
      return mod;
    });
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Loading API Documentation...
          </p>
        </div>
      </div>
    ),
  },
);

interface SwaggerUIProps {
  className?: string;
  apiUrl?: string;
  showToolbar?: boolean;
  useStrictMode?: boolean; // If false, uses vanilla SwaggerUI to avoid React warnings
}

export function SwaggerUI({
  className,
  apiUrl,
  showToolbar = true,
  useStrictMode = false,
}: SwaggerUIProps) {
  // Get API URL from environment variables with fallback
  const baseApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const defaultApiUrl = `${baseApiUrl}/api/v1/openapi.json`;
  const finalApiUrl = apiUrl || defaultApiUrl;
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoized token getter to prevent unnecessary function recreations
  const getToken = useCallback(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("access_token");
    }
    return null;
  }, []);

  // Memoized connection checker
  const checkAPIConnection = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const healthUrl = `${baseApiUrl}/health`;
      const response = await fetch(healthUrl);

      if (response.ok) {
        const data = await response.json();
        if (data.status === "healthy") {
          setIsConnected(true);
        } else {
          setIsConnected(false);
          setError("API server is not healthy");
        }
      } else {
        setIsConnected(false);
        setError(`API server responded with status ${response.status}`);
      }
    } catch (error) {
      setIsConnected(false);
      setError(
        `Cannot connect to API server at ${baseApiUrl}. Please ensure the backend is running.`,
      );
      console.error("API connection error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [baseApiUrl]);

  useEffect(() => {
    checkAPIConnection();
  }, [checkAPIConnection]);

  // Memoized SwaggerUI configuration to prevent re-renders
  const swaggerConfig = useMemo(
    () => ({
      url: finalApiUrl,
      deepLinking: true,
      showExtensions: true,
      showCommonExtensions: true,
      displayOperationId: false,
      tryItOutEnabled: true,
      filter: true,
      docExpansion: "none" as const,
      operationsSorter: "alpha" as const,
      tagsSorter: "alpha" as const,
      validatorUrl: null, // Disable schema validation to avoid external calls
      // Suppress React warnings in Swagger UI
      supportedSubmitMethods: [
        "get",
        "post",
        "put",
        "delete",
        "patch",
        "head",
        "options",
      ],
      requestInterceptor: (request: any) => {
        // Add authorization header if user is logged in
        const token = getToken();
        if (token) {
          request.headers = request.headers || {};
          request.headers.Authorization = `Bearer ${token}`;
        }

        // Ensure content-type for POST/PUT requests
        if (["POST", "PUT", "PATCH"].includes(request.method) && request.body) {
          request.headers["Content-Type"] =
            request.headers["Content-Type"] || "application/json";
        }

        return request;
      },
      responseInterceptor: (response: any) => {
        // Handle authentication errors
        if (response.status === 401) {
          console.warn("Authentication required for this endpoint");
        }

        return response;
      },
      onComplete: () => {},
      onFailure: (error: any) => {
        console.error("SwaggerUI failed to load:", error);
        setError(
          "Failed to load API documentation. Please check the API server.",
        );
      },
    }),
    [finalApiUrl, getToken],
  );

  return (
    <div className={cn("w-full", className)}>
      {showToolbar && (
        <Card className="mb-4 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Server
                  className={cn(
                    "w-4 h-4",
                    isConnected ? "text-green-500" : "text-red-500",
                  )}
                />
                <span className="text-sm font-medium">
                  API Status:
                  <span
                    className={cn(
                      "ml-1",
                      isConnected ? "text-green-600" : "text-red-600",
                    )}
                  >
                    {isLoading
                      ? "Checking..."
                      : isConnected
                        ? "Connected"
                        : "Disconnected"}
                  </span>
                </span>
              </div>

              {user && (
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-muted-foreground">
                    Authenticated as: {user.username}
                  </span>
                </div>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={checkAPIConnection}
              disabled={isLoading}
            >
              <RefreshCw
                className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")}
              />
              Refresh
            </Button>
          </div>

          {error && (
            <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <span className="text-sm text-destructive">{error}</span>
              </div>
            </div>
          )}
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="bg-background">
          {!error && isConnected ? (
            <SwaggerErrorBoundary>
              {useStrictMode ? (
                <SwaggerUIBundle {...swaggerConfig} />
              ) : (
                <SwaggerUINoStrict config={swaggerConfig} />
              )}
            </SwaggerErrorBoundary>
          ) : (
            <div className="p-8 text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                API Documentation Unavailable
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {error ||
                  "Cannot load API documentation. Please check your connection."}
              </p>
              <Button onClick={checkAPIConnection} disabled={isLoading}>
                <RefreshCw
                  className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")}
                />
                Retry Connection
              </Button>
            </div>
          )}
        </div>
      </Card>

      <style jsx global>{`
        .swagger-ui .info {
          margin: 0 !important;
        }
        .swagger-ui .scheme-container {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
        .swagger-ui .topbar {
          display: none !important;
        }
        .swagger-ui .wrapper {
          padding: 1rem !important;
        }
        .swagger-ui .info .title {
          color: hsl(var(--foreground)) !important;
        }
        .swagger-ui .info .description {
          color: hsl(var(--muted-foreground)) !important;
        }
        .swagger-ui .opblock-summary {
          border-color: hsl(var(--border)) !important;
        }
        .swagger-ui .opblock.opblock-get .opblock-summary-method {
          background: hsl(var(--primary)) !important;
        }
        .swagger-ui .opblock.opblock-post .opblock-summary-method {
          background: hsl(var(--success)) !important;
        }
        .swagger-ui .opblock.opblock-put .opblock-summary-method {
          background: hsl(var(--warning)) !important;
        }
        .swagger-ui .opblock.opblock-delete .opblock-summary-method {
          background: hsl(var(--destructive)) !important;
        }
      `}</style>
    </div>
  );
}

export default SwaggerUI;
